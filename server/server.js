require("dotenv").config();
const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const cors = require("cors");
const mongoose = require("mongoose");
const { execSync, exec, spawn } = require('child_process');
const WebSocket = require('ws');
const AdmZip = require('adm-zip');
const xml2js = require('xml2js');
const crypto = require("crypto");
const PDFDocument = require("pdfkit");
const path = require("path");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'mobaudit_jwt_secret_2024';

const app = express();
app.use(cors());
app.use(express.json());

const wss = new WebSocket.Server({ port: 5002 });
console.log('📱 Screen streaming WebSocket on port 5002');

const ADB_PATH = 'C:\\Program Files\\Genymobile\\Genymotion\\tools\\adb.exe';
const DEVICE = '192.168.174.101:5555';

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const streamType = url.searchParams.get('type') || 'screen';
  
  console.log(`[WS] Client connected - type: ${streamType}`);

  if (streamType === 'screen') {
    // Screen streaming loop
    let streaming = true;
    
    const streamScreen = async () => {
      while (streaming && ws.readyState === WebSocket.OPEN) {
        try {
          execSync(`"${ADB_PATH}" -s ${DEVICE} shell screencap -p /sdcard/ws_screen.png`, { timeout: 5000, stdio: 'pipe' });
          execSync(`"${ADB_PATH}" -s ${DEVICE} pull /sdcard/ws_screen.png C:\\temp\\ws_screen.png`, { timeout: 5000, stdio: 'pipe' });
          
          const fs = require('fs');
          if (fs.existsSync('C:\\temp\\ws_screen.png')) {
            const imageData = fs.readFileSync('C:\\temp\\ws_screen.png');
            const base64 = imageData.toString('base64');
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'screen', data: base64, timestamp: Date.now() }));
            }
          }
        } catch(err) {
          // Silently ignore screen capture errors - don't crash server
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Wait 800ms between frames
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    };
    
    streamScreen();
    
    ws.on('close', () => {
      streaming = false;
      console.log('[WS] Screen stream client disconnected');
    });

  } else if (streamType === 'logs') {
    // Logcat streaming
    let logProcess;
    try {
      logProcess = spawn(`"${ADB_PATH}"`, ['-s', DEVICE, 'logcat', '-v', 'time', '*:W'], {
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      logProcess.stdout.on('data', (data) => {
        if (ws.readyState === WebSocket.OPEN) {
          const lines = data.toString().split('\n').filter(l => l.trim());
          lines.forEach(line => {
            ws.send(JSON.stringify({ type: 'log', data: line, timestamp: Date.now() }));
          });
        }
      });

      logProcess.stderr.on('data', (data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'log', data: data.toString(), timestamp: Date.now() }));
        }
      });
    } catch(err) {
      console.log('[WS] Logcat error:', err.message);
    }

    ws.on('close', () => {
      if (logProcess) logProcess.kill();
      console.log('[WS] Log stream client disconnected');
    });
  }
});

const MOBSF_API_KEY = (process.env.MOBSF_API_KEY || "").replace(/\x1b\[[0-9;]*m/g, "").trim();
const MOBSF_URL = process.env.MOBSF_BASE_URL;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const CI_CD_TOKEN = process.env.CI_CD_TOKEN || "mobaudit_secret_67890";

// ================== 🔒 AUTH MIDDLEWARE ==================
const authenticateCiToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== CI_CD_TOKEN) {
    return res.status(401).json({ error: "Unauthorized: Invalid CI/CD Token" });
  }
  next();
};

// ================== 🔥 MobAudit Parsing Logic ==================

// Safe getter
const get = (obj, path, defaultValue = undefined) => {
  return path.split(".").reduce((o, key) => (o ? o[key] : undefined), obj) ?? defaultValue;
};

function mapOwaspCategory(title, description) {
  const text = (title + " " + description).toLowerCase();
  
  if (text.includes("permission")) return "M1: Improper Platform Usage";
  if (text.includes("storage") || text.includes("file") || text.includes("database") || text.includes("sqlite") || text.includes("log") || text.includes("logcat")) return "M2: Insecure Data Storage";
  if (text.includes("http") || text.includes("ssl") || text.includes("tls") || text.includes("certificate") || text.includes("network") || text.includes("cleartext")) return "M3: Insecure Communication";
  if (text.includes("auth") || text.includes("password") || text.includes("login") || text.includes("credential")) return "M4: Insecure Authentication";
  if (text.includes("crypto") || text.includes("aes") || text.includes("md5") || text.includes("sha1") || text.includes("des") || text.includes("cipher") || text.includes("encrypt") || text.includes("random")) return "M5: Insufficient Cryptography";
  if (text.includes("activity") || text.includes("intent") || text.includes("broadcast") || text.includes("receiver") || text.includes("provider") || text.includes("exported") || text.includes("component")) return "M6: Insecure Authorization";
  if (text.includes("webview") || text.includes("javascript") || text.includes("xss")) return "M7: Client Code Quality";
  if (text.includes("tamper") || text.includes("root") || text.includes("debug") || text.includes("emulator") || text.includes("obfuscat")) return "M8: Code Tampering";
  if (text.includes("reverse") || text.includes("decompil") || text.includes("binary") || text.includes("native")) return "M9: Reverse Engineering";
  if (text.includes("function") || text.includes("api") || text.includes("superfluous") || text.includes("sdk")) return "M10: Extraneous Functionality";
  
  return "Uncategorized";
}

// Normalize vulnerability
function normalizeFinding(item, severityLabel) {
  const title = item.title || item.name || item.issue || "Unknown Issue";
  const description = item.description || item.detail || item.message || item.info || "No description available";
  let owasp = item["owasp-mobile"] || item.owasp;
  
  if (!owasp || owasp.trim() === "" || owasp === "Uncategorized") {
    owasp = mapOwaspCategory(title, description);
  }

  return {
    title: title,
    description: description,
    severity: severityLabel,
    file: item.file || item.file_path || item.source || "N/A",
    line: item.line || item.line_number || "N/A",
    owasp: owasp,
    cvss: item.cvss || 0,
    cwe: item.cwe || item["cwe-id"] || item.cwe_id || 
     mapCweFromTitle(item.title || '', item.description || '') ||
     'N/A'
  };
}

// Remove duplicates
function deduplicate(findings) {
  const seen = new Set();
  return findings.filter((item) => {
    const key = `${item.title}-${item.file}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mapCweFromTitle(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes('janus')) return 'CWE-347';
  if (text.includes('debug') || text.includes('debuggable')) return 'CWE-489';
  if (text.includes('certificate') || text.includes('ssl') || text.includes('tls')) return 'CWE-295';
  if (text.includes('log') || text.includes('logcat')) return 'CWE-532';
  if (text.includes('sqlite') || text.includes('database')) return 'CWE-312';
  if (text.includes('storage') || text.includes('external storage')) return 'CWE-922';
  if (text.includes('sql injection')) return 'CWE-89';
  if (text.includes('crypto') || text.includes('md5') || text.includes('sha1') || text.includes('weak')) return 'CWE-327';
  if (text.includes('random') || text.includes('prng')) return 'CWE-330';
  if (text.includes('permission') || text.includes('exported')) return 'CWE-732';
  if (text.includes('webview') || text.includes('javascript')) return 'CWE-79';
  if (text.includes('intent') || text.includes('broadcast')) return 'CWE-925';
  if (text.includes('hardcod')) return 'CWE-798';
  if (text.includes('root') || text.includes('privilege')) return 'CWE-269';
  if (text.includes('http') || text.includes('cleartext')) return 'CWE-319';
  if (text.includes('backup') || text.includes('allowbackup')) return 'CWE-530';
  if (text.includes('clipboard')) return 'CWE-200';
  if (text.includes('injection')) return 'CWE-94';
  if (text.includes('overflow')) return 'CWE-120';
  return null;
}

async function checkVirusTotal(filePath) {
  try {
    const fs = require('fs');
    const crypto = require('crypto');
    const fileBuffer = fs.readFileSync(filePath);
    const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    const vtApiKey = process.env.VIRUSTOTAL_API_KEY;
    if (!vtApiKey) return { error: 'No API key', sha256 };

    // First check if file already analyzed
    const checkRes = await fetch(`https://www.virustotal.com/api/v3/files/${sha256}`, {
      headers: { 'x-apikey': vtApiKey }
    });

    if (checkRes.ok) {
      const data = await checkRes.json();
      const stats = data?.data?.attributes?.last_analysis_stats || {};
      const results = data?.data?.attributes?.last_analysis_results || {};
      
      const flaggedEngines = Object.entries(results)
        .filter(([_, v]) => v.category === 'malicious')
        .map(([engine, v]) => ({ engine, result: v.result }));

      return {
        sha256,
        found: true,
        malicious: stats.malicious || 0,
        suspicious: stats.suspicious || 0,
        undetected: stats.undetected || 0,
        total: (stats.malicious || 0) + (stats.suspicious || 0) + (stats.undetected || 0) + (stats.harmless || 0),
        flagged_engines: flaggedEngines.slice(0, 10),
        threat_label: data?.data?.attributes?.popular_threat_classification?.suggested_threat_label || null,
        scan_date: data?.data?.attributes?.last_analysis_date || null
      };
    }

    // File not found — upload it
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const uploadRes = await fetch('https://www.virustotal.com/api/v3/files', {
      method: 'POST',
      headers: { 'x-apikey': vtApiKey, ...form.getHeaders() },
      body: form
    });

    if (uploadRes.ok) {
      const uploadData = await uploadRes.json();
      return {
        sha256,
        found: false,
        uploaded: true,
        analysis_id: uploadData?.data?.id,
        message: 'File uploaded to VirusTotal. Results will be available in a few minutes.'
      };
    }

    return { sha256, error: 'Upload failed' };

  } catch(err) {
    console.log('[VIRUSTOTAL] Error:', err.message);
    return { error: err.message };
  }
}

async function customApkParser(apkFilePath) {
  const results = {
    permissions: [],
    dangerous_permissions: [],
    privacy_risks: [],
    malware_indicators: [],
    hardcoded_secrets: [],
    manifest_issues: [],
    app_info: {}
  };

  try {
    // Extract APK as ZIP
    const zip = new AdmZip(apkFilePath);
    
    // Parse AndroidManifest.xml
    const manifestEntry = zip.getEntry('AndroidManifest.xml');
    if (manifestEntry) {
      // Use apktool to decode properly
      const outputDir = apkFilePath + '_decoded';
      try {
        execSync(`java -jar C:\\apktool\\apktool.jar d "${apkFilePath}" -o "${outputDir}" -f --no-src`, 
          { timeout: 60000, stdio: 'ignore' });
        
        const fs = require('fs');
        const manifestPath = outputDir + '\\AndroidManifest.xml';
        
        if (fs.existsSync(manifestPath)) {
          const manifestContent = fs.readFileSync(manifestPath, 'utf8');
          const parser = new xml2js.Parser();
          const manifest = await parser.parseStringPromise(manifestContent);
          
          // Extract permissions
          const perms = manifest?.manifest?.['uses-permission'] || [];
          perms.forEach(p => {
            const permName = p?.$?.['android:name'] || '';
            results.permissions.push(permName);
            
            // Dangerous permissions check
            const dangerousPerms = [
              'READ_CONTACTS', 'WRITE_CONTACTS', 'ACCESS_FINE_LOCATION',
              'ACCESS_COARSE_LOCATION', 'READ_CALL_LOG', 'WRITE_CALL_LOG',
              'CAMERA', 'READ_SMS', 'SEND_SMS', 'RECEIVE_SMS', 'RECORD_AUDIO',
              'WRITE_EXTERNAL_STORAGE', 'READ_EXTERNAL_STORAGE', 'GET_ACCOUNTS',
              'PROCESS_OUTGOING_CALLS', 'READ_PHONE_STATE'
            ];
            if (dangerousPerms.some(d => permName.includes(d))) {
              results.dangerous_permissions.push(permName);
            }
          });

          // Privacy risks in plain English
          if (results.permissions.some(p => p.includes('ACCESS_FINE_LOCATION') || p.includes('ACCESS_COARSE_LOCATION'))) {
            results.privacy_risks.push('📍 This app can track your exact GPS location');
          }
          if (results.permissions.some(p => p.includes('READ_CONTACTS'))) {
            results.privacy_risks.push('👥 This app can read all your contacts');
          }
          if (results.permissions.some(p => p.includes('READ_SMS') || p.includes('RECEIVE_SMS'))) {
            results.privacy_risks.push('💬 This app can read your SMS messages');
          }
          if (results.permissions.some(p => p.includes('RECORD_AUDIO'))) {
            results.privacy_risks.push('🎤 This app can record audio through your microphone');
          }
          if (results.permissions.some(p => p.includes('CAMERA'))) {
            results.privacy_risks.push('📷 This app can access your camera');
          }
          if (results.permissions.some(p => p.includes('READ_CALL_LOG'))) {
            results.privacy_risks.push('📞 This app can read your call history');
          }
          if (results.permissions.some(p => p.includes('SEND_SMS'))) {
            results.privacy_risks.push('⚠️ This app can send SMS messages (potential premium SMS fraud)');
          }

          // Manifest security issues
          const application = manifest?.manifest?.application?.[0];
          if (application) {
            if (application?.$?.['android:debuggable'] === 'true') {
              results.manifest_issues.push({ issue: 'Debug mode enabled', severity: 'High', detail: 'android:debuggable=true allows attackers to hook debugger' });
            }
            if (application?.$?.['android:allowBackup'] === 'true') {
              results.manifest_issues.push({ issue: 'Backup allowed', severity: 'Medium', detail: 'android:allowBackup=true allows data extraction via ADB' });
            }
            if (application?.$?.['android:networkSecurityConfig'] === undefined) {
              results.manifest_issues.push({ issue: 'No Network Security Config', severity: 'Medium', detail: 'Missing network_security_config.xml may allow cleartext traffic' });
            }
          }

          // App info
          results.app_info = {
            package: manifest?.manifest?.$?.package || 'Unknown',
            version_code: manifest?.manifest?.$?.['android:versionCode'] || 'N/A',
            version_name: manifest?.manifest?.$?.['android:versionName'] || 'N/A',
            min_sdk: manifest?.manifest?.['uses-sdk']?.[0]?.$?.['android:minSdkVersion'] || 'N/A',
            target_sdk: manifest?.manifest?.['uses-sdk']?.[0]?.$?.['android:targetSdkVersion'] || 'N/A',
          };
        }

        // Scan strings for secrets
        const stringsPath = outputDir + '\\res\\values\\strings.xml';
        if (fs.existsSync(stringsPath)) {
          const stringsContent = fs.readFileSync(stringsPath, 'utf8');
          const secretPatterns = [
            { name: 'API Key', regex: /api[_-]?key["\s:=]+([a-zA-Z0-9_\-]{20,})/gi },
            { name: 'AWS Key', regex: /AKIA[0-9A-Z]{16}/g },
            { name: 'Firebase URL', regex: /https:\/\/[a-z0-9-]+\.firebaseio\.com/gi },
            { name: 'Google API Key', regex: /AIza[0-9A-Za-z_\-]{35}/g },
            { name: 'Password', regex: /password["\s:=]+["']([^"']{6,})/gi },
          ];
          secretPatterns.forEach(pattern => {
            const matches = stringsContent.match(pattern.regex);
            if (matches) {
              matches.forEach(m => results.hardcoded_secrets.push({ type: pattern.name, value: m.substring(0, 50) }));
            }
          });
        }

        // Cleanup
        try { execSync(`rmdir /s /q "${outputDir}"`, { stdio: 'ignore' }); } catch(e) {}
        
      } catch(apktoolErr) {
        console.log('[CUSTOM PARSER] apktool decode failed:', apktoolErr.message);
      }
    }

    // Malware indicators - check file list
    const entries = zip.getEntries();
    const fileNames = entries.map(e => e.entryName.toLowerCase());
    
    if (fileNames.some(f => f.includes('su') || f.includes('superuser'))) {
      results.malware_indicators.push({ indicator: 'Root exploit files detected', severity: 'Critical' });
    }
    if (fileNames.some(f => f.includes('xposed') || f.includes('substrate'))) {
      results.malware_indicators.push({ indicator: 'Hook framework files detected (Xposed/Substrate)', severity: 'High' });
    }
    if (fileNames.filter(f => f.endsWith('.so')).length > 10) {
      results.malware_indicators.push({ indicator: 'Excessive native libraries detected', severity: 'Medium' });
    }
    if (fileNames.some(f => f.includes('encrypt') && f.endsWith('.so'))) {
      results.malware_indicators.push({ indicator: 'Encryption native library detected', severity: 'Medium' });
    }

  } catch(err) {
    console.log('[CUSTOM PARSER] Error:', err.message);
  }

  return results;
}

function checkPlayStoreCompliance(customAnalysis, findings, appInfo) {
  const checks = {
    critical: [],
    warnings: [],
    passed: [],
    score: 0,
    max_score: 0,
    ready_to_publish: false
  };

  // Helper to add a check
  const addCheck = (level, id, title, status, message, fix, link) => {
    const item = { id, title, status, message, fix, link };
    if (status === 'pass') {
      checks.passed.push(item);
      checks.score += level === 'critical' ? 10 : level === 'warning' ? 5 : 3;
    } else if (level === 'critical') {
      checks.critical.push(item);
    } else {
      checks.warnings.push(item);
    }
    checks.max_score += level === 'critical' ? 10 : level === 'warning' ? 5 : 3;
  };

  // ===== CRITICAL CHECKS =====
  
  // 1. Target SDK Check (Play Store requires API 34+ for 2024)
  const targetSdk = parseInt(appInfo.target_sdk) || 0;
  if (targetSdk >= 34) {
    addCheck('critical', 'target_sdk', 'Target SDK Compliance', 'pass', 
      `Target SDK ${targetSdk} meets Play Store 2024 requirements`, null);
  } else if (targetSdk >= 33) {
    addCheck('warning', 'target_sdk', 'Target SDK Compliance', 'warn',
      `Target SDK ${targetSdk} works currently but Play Store requires API 34 for new apps in 2024`,
      'Update targetSdkVersion to 34 in build.gradle');
  } else {
    addCheck('critical', 'target_sdk', 'Target SDK Compliance', 'fail',
      `Target SDK ${targetSdk} is too old. Play Store will reject this APK.`,
      `Update targetSdkVersion to 34 in your build.gradle file`);
  }

  // 2. Debuggable flag
  const debugIssue = (customAnalysis.manifest_issues || []).find(i => 
    i.issue && i.issue.toLowerCase().includes('debug'));
  if (debugIssue) {
    addCheck('critical', 'debuggable', 'Debug Mode Disabled', 'fail',
      'android:debuggable="true" detected. Play Store will reject this APK.',
      'Set android:debuggable="false" in AndroidManifest.xml for release builds');
  } else {
    addCheck('critical', 'debuggable', 'Debug Mode Disabled', 'pass',
      'Debug mode is properly disabled', null);
  }

  // 3. Cleartext traffic / Network Security
  const httpIssue = findings.find(f => 
    (f.title + ' ' + f.description).toLowerCase().match(/cleartext|http:\/\/|insecure network/));
  if (httpIssue) {
    addCheck('critical', 'cleartext', 'Network Security Config', 'fail',
      'Cleartext HTTP traffic allowed. Play Store strongly discourages this.',
      'Add network_security_config.xml with cleartextTrafficPermitted="false"');
  } else {
    addCheck('critical', 'cleartext', 'Network Security Config', 'pass',
      'Network communication is secured (HTTPS enforced)', null);
  }

  // 4. Hardcoded Secrets
  const secretCount = (customAnalysis.hardcoded_secrets || []).length;
  if (secretCount > 0) {
    addCheck('critical', 'secrets', 'No Hardcoded Secrets', 'fail',
      `${secretCount} hardcoded secret(s) detected (API keys/passwords). Major security risk.`,
      'Move secrets to BuildConfig fields or Android Keystore. Never commit keys to APK.');
  } else {
    addCheck('critical', 'secrets', 'No Hardcoded Secrets', 'pass',
      'No hardcoded API keys or passwords detected', null);
  }

  // 5. Dangerous Permissions Justification
  const dangerousPerms = (customAnalysis.dangerous_permissions || []).length;
  if (dangerousPerms > 5) {
    addCheck('warning', 'permissions', 'Dangerous Permissions', 'warn',
      `App requests ${dangerousPerms} dangerous permissions. Play Store may require justification.`,
      'Review each dangerous permission and remove unnecessary ones. Document remaining ones in Play Console.');
  } else if (dangerousPerms > 0) {
    addCheck('warning', 'permissions', 'Dangerous Permissions', 'pass',
      `App uses ${dangerousPerms} dangerous permission(s) - within acceptable range`, null);
  } else {
    addCheck('warning', 'permissions', 'Dangerous Permissions', 'pass',
      'No dangerous permissions requested', null);
  }

  // 6. SMS/Call Log Permissions (Play Store strict policy)
  const smsCallPerms = (customAnalysis.permissions || []).filter(p => 
    p.includes('SEND_SMS') || p.includes('READ_SMS') || 
    p.includes('READ_CALL_LOG') || p.includes('WRITE_CALL_LOG'));
  if (smsCallPerms.length > 0) {
    addCheck('critical', 'sms_call_policy', 'SMS/Call Log Policy', 'fail',
      `App uses restricted permissions: ${smsCallPerms.map(p => p.replace('android.permission.', '')).join(', ')}. Requires Play Console declaration form.`,
      'Submit SMS/Call Log Permissions declaration in Play Console, or remove these permissions');
  } else {
    addCheck('critical', 'sms_call_policy', 'SMS/Call Log Policy', 'pass',
      'No restricted SMS/Call Log permissions used', null);
  }

  // 7. Min SDK Check
  const minSdk = parseInt(appInfo.min_sdk) || 0;
  if (minSdk >= 21) {
    addCheck('warning', 'min_sdk', 'Minimum SDK Version', 'pass',
      `Min SDK ${minSdk} supports modern Android (5.0+)`, null);
  } else if (minSdk > 0) {
    addCheck('warning', 'min_sdk', 'Minimum SDK Version', 'warn',
      `Min SDK ${minSdk} is very old. Consider bumping to API 21+ for better security features.`,
      'Update minSdkVersion to 21 in build.gradle to drop legacy device support');
  }

  // 8. Backup Configuration
  const backupIssue = (customAnalysis.manifest_issues || []).find(i =>
    i.issue && i.issue.toLowerCase().includes('backup'));
  if (backupIssue) {
    addCheck('warning', 'backup', 'Backup Configuration', 'warn',
      'android:allowBackup="true" detected. Sensitive data may leak via ADB backup.',
      'Set android:allowBackup="false" or define android:fullBackupContent rules');
  } else {
    addCheck('warning', 'backup', 'Backup Configuration', 'pass',
      'Backup configuration is properly set', null);
  }

  // 9. VirusTotal Clean
  // This check is informational - reads from existing virustotal data
  
  // 10. High severity vulnerabilities
  const highSevCount = findings.filter(f => 
    (f.severity || '').toLowerCase() === 'high' || 
    (f.severity || '').toLowerCase() === 'critical').length;
  if (highSevCount === 0) {
    addCheck('critical', 'high_vulns', 'High Severity Issues', 'pass',
      'No high or critical severity vulnerabilities detected', null);
  } else {
    addCheck('critical', 'high_vulns', 'High Severity Issues', 'fail',
      `${highSevCount} high/critical severity vulnerabilities found. Fix before publishing.`,
      'Review the Vulnerabilities tab and resolve all High severity findings');
  }

  // 11. 64-bit ABI Support Check
  const has64bit = customAnalysis.app_info?.abis?.includes?.('arm64-v8a') || 
                    customAnalysis.libraries?.some?.(l => l.includes('arm64')) || false;
  addCheck('critical', 'abi_64bit', '64-bit Architecture Support', 
    has64bit ? 'pass' : 'warn',
    has64bit ? '64-bit (arm64-v8a) support detected' : 'Could not verify 64-bit support. Play Store requires arm64-v8a since August 2019.',
    has64bit ? null : 'Build with arm64-v8a ABI included. Check build.gradle for ndk.abiFilters.',
    'https://developer.android.com/distribute/best-practices/develop/64-bit');

  // 12. App Bundle vs APK
  addCheck('warning', 'app_bundle', 'App Bundle Format', 'warn',
    'Detected APK format. Google Play requires Android App Bundle (.aab) for new app submissions since August 2021.',
    'Build using ./gradlew bundleRelease to generate .aab file instead of .apk',
    'https://developer.android.com/guide/app-bundle');

  // 13. WebView JavaScript Check
  const webviewIssue = findings.find(f => 
    (f.title + ' ' + f.description).toLowerCase().match(/webview.*javascript|setjavascriptenabled.*true/));
  if (webviewIssue) {
    addCheck('warning', 'webview_js', 'WebView JavaScript Security', 'warn',
      'WebView with JavaScript enabled detected. Ensure secure WebView implementation.',
      'Disable JavaScript in WebView if not needed. Validate all URLs. Use addJavascriptInterface carefully.',
      'https://developer.android.com/privacy-and-security/risks/webview-unsafe-usage');
  } else {
    addCheck('warning', 'webview_js', 'WebView JavaScript Security', 'pass',
      'No insecure WebView configuration detected', null,
      'https://developer.android.com/privacy-and-security/risks/webview-unsafe-usage');
  }

  // 14. Exported Components without Permission
  const exportedIssue = findings.find(f =>
    (f.title + ' ' + f.description).toLowerCase().match(/exported.*activity|exported.*service|exported.*receiver/));
  if (exportedIssue) {
    addCheck('warning', 'exported_components', 'Exported Components Security', 'warn',
      'Components marked as exported without permission protection. Could allow unauthorized access.',
      'Set android:exported="false" for components that should not be accessed by other apps. Add permission attribute if external access needed.',
      'https://developer.android.com/guide/topics/manifest/activity-element#exported');
  } else {
    addCheck('warning', 'exported_components', 'Exported Components Security', 'pass',
      'No unprotected exported components detected', null,
      'https://developer.android.com/guide/topics/manifest/activity-element#exported');
  }

  // 15. Cryptography Check
  const cryptoIssue = findings.find(f =>
    (f.title + ' ' + f.description).toLowerCase().match(/md5|sha1|des|weak cipher|insecure crypto/));
  if (cryptoIssue) {
    addCheck('warning', 'weak_crypto', 'Cryptographic Strength', 'warn',
      'Weak cryptographic algorithms detected (MD5/SHA1/DES). Modern apps should use AES-256-GCM or stronger.',
      'Replace MD5/SHA1 with SHA-256. Replace DES with AES-256-GCM. Use Android Keystore for key management.',
      'https://developer.android.com/privacy-and-security/cryptography');
  } else {
    addCheck('warning', 'weak_crypto', 'Cryptographic Strength', 'pass',
      'No weak cryptographic patterns detected', null,
      'https://developer.android.com/privacy-and-security/cryptography');
  }

  // 16. Root Detection / Tampering
  const rootIssue = findings.find(f =>
    (f.title + ' ' + f.description).toLowerCase().match(/root detection|tamper/));
  addCheck('warning', 'root_detection', 'Root Detection Implementation',
    rootIssue ? 'pass' : 'warn',
    rootIssue ? 'Root detection implementation found' : 'No root detection found. Recommended for financial/sensitive apps.',
    rootIssue ? null : 'Implement RootBeer library or SafetyNet Attestation API for sensitive apps',
    'https://developer.android.com/privacy-and-security/safetynet');

  // ===== Calculate Readiness =====
  const percentage = checks.max_score > 0 ? Math.round((checks.score / checks.max_score) * 100) : 0;
  checks.compliance_percentage = percentage;
  checks.ready_to_publish = checks.critical.length === 0 && percentage >= 80;
  
  // Verdict
  if (checks.critical.length === 0 && percentage >= 90) {
    checks.verdict = 'READY';
    checks.verdict_message = 'Your app meets Google Play Store requirements and is ready to publish.';
  } else if (checks.critical.length === 0 && percentage >= 70) {
    checks.verdict = 'NEEDS_REVIEW';
    checks.verdict_message = 'Your app can be published but should address warnings for best results.';
  } else if (checks.critical.length <= 2) {
    checks.verdict = 'NOT_READY';
    checks.verdict_message = 'Critical issues must be fixed before submitting to Google Play Store.';
  } else {
    checks.verdict = 'REJECTED';
    checks.verdict_message = 'Multiple critical issues detected. App will be rejected by Google Play Store.';
  }

  checks.metadata = {
    policy_version: 'Play Store Compliance Policy (2024 Version)',
    checks_performed: checks.critical.length + checks.warnings.length + checks.passed.length,
    disclaimer: 'Disclaimer: This compliance check is an automated heuristic scan. Final approval depends entirely on Google Play review.',
    documentation_url: 'https://developer.android.com/distribute/play-policies'
  };

  return checks;
}

// Main parser
function parseMobAuditReport(report) {
  const findings = [];
  const asArray = (val) => (Array.isArray(val) ? val : typeof val === 'object' && val !== null ? Object.values(val) : []);

  // 1. AppSec / Static Analysis Findings (Handles both MASE v4 appsec and v3 static_analysis)
  const appsec = report.appsec || {};
  const staticAnalysis = report.static_analysis?.findings || {};

  const high = [...asArray(appsec.high), ...asArray(staticAnalysis.high)];
  const warning = [...asArray(appsec.warning), ...asArray(staticAnalysis.warning)];
  const info = [...asArray(appsec.info), ...asArray(staticAnalysis.info)];
  const hotspot = [...asArray(appsec.hotspot)];

  findings.push(
    ...high.map((i) => normalizeFinding(i, "High")),
    ...warning.map((i) => normalizeFinding(i, "Medium")),
    ...info.map((i) => normalizeFinding(i, "Low")),
    ...hotspot.map((i) => normalizeFinding(i, "Low"))
  );

  // 2. Manifest Analysis (Handles MASE v4 manifest_findings and v3 manifest_analysis)
  const manifestObj = report.manifest_analysis || {};
  const manifestList = [
    ...(Array.isArray(manifestObj) ? manifestObj : []),
    ...(Array.isArray(manifestObj.manifest_findings) ? manifestObj.manifest_findings : [])
  ];

  manifestList.forEach(item => {
    const sev = (item.severity || item.stat || "info").toLowerCase();
    if (sev === "high" || sev === "warning" || sev === "info" || sev === "medium") {
      const displaySev = sev === "warning" || sev === "medium" ? "Medium" : sev === "high" ? "High" : "Low";
      findings.push(normalizeFinding(item, displaySev));
    }
  });

  // 2b. Certificate Analysis (Handles MASE v4 certificate_findings)
  const certObj = report.certificate_analysis || {};
  const certFindings = Array.isArray(certObj.certificate_findings) ? certObj.certificate_findings : [];
  certFindings.forEach(item => {
    if (Array.isArray(item)) {
      findings.push({
        title: item[2] || item[1] || "Certificate Finding",
        description: item[1] || "No description available",
        severity: (item[0] || "Low").charAt(0).toUpperCase() + (item[0] || "Low").slice(1),
        file: "Certificate",
        line: "N/A",
        owasp: "Uncategorized",
        cvss: 0,
        cwe: ""
      });
    } else {
      findings.push(normalizeFinding(item, (item.severity || "Low").charAt(0).toUpperCase() + (item.severity || "Low").slice(1)));
    }
  });

  // 3. Code Analysis (Complex: ID -> { metadata, files })
  const codeAnalysis = get(report, "code_analysis.findings", {});
  Object.entries(codeAnalysis).forEach(([id, data]) => {
    const metadata = data.metadata || {};
    const files = data.files || {};
    
    // If there are files, create a finding for each file/line
    if (Object.keys(files).length > 0) {
      Object.entries(files).forEach(([file, line]) => {
        findings.push({
          title: metadata.title || metadata.issue || id,
          description: metadata.description || metadata.info || "No description",
          severity: (metadata.severity || "Medium").charAt(0).toUpperCase() + (metadata.severity || "Medium").slice(1),
          file: file,
          line: line,
          owasp: metadata["owasp-mobile"] || metadata.owasp || "Uncategorized",
          cvss: metadata.cvss || 0,
          cwe: metadata.cwe || ""
        });
      });
    } else {
      // No files, just one finding
      findings.push(normalizeFinding(metadata, metadata.severity || "Medium"));
    }
  });

  // 4. Binary Analysis
  const binaryAnalysis = get(report, "binary_analysis", []);
  asArray(binaryAnalysis).forEach(item => {
    if (item.stat !== "ok") {
      findings.push(normalizeFinding(item, (item.stat || "info").charAt(0).toUpperCase() + (item.stat || "info").slice(1)));
    }
  });

  // 5. Network Security & Domain Analysis
  const networkObj = report.network_security || {};
  const networkFindings = [
    ...(Array.isArray(networkObj) ? networkObj : []),
    ...(Array.isArray(networkObj.network_findings) ? networkObj.network_findings : [])
  ];
  networkFindings.forEach(item => {
    if (item.stat && item.stat !== "ok") {
      findings.push(normalizeFinding(item, (item.stat || "info").charAt(0).toUpperCase() + (item.stat || "info").slice(1)));
    }
  });

  const domains = get(report, "domain_check", []);
  asArray(domains).forEach(item => {
    if (item.stat && item.stat !== "ok") {
      findings.push(normalizeFinding(item, (item.stat || "info").charAt(0).toUpperCase() + (item.stat || "info").slice(1)));
    }
  });

  return {
    app: {
      name: report.app_name || report.file_name || "Unknown App",
      package: report.package_name || report.packagename || "com.unknown.app",
      version: report.version_name || report.version || "1.0",
      main_activity: report.main_activity || "N/A",
      min_sdk: report.min_sdk || report.minsdk || report.minSdkVersion || report.android_min_sdk || "N/A",
      target_sdk: report.target_sdk || report.targetsdk || report.targetSdkVersion || report.android_target_sdk || "N/A",
      sdk: report.sdk || {},
      counts: {
        activities: asArray(report.activities).length,
        services: asArray(report.services).length,
        receivers: asArray(report.receivers).length,
        providers: asArray(report.providers).length,
      }
    },
    findings: deduplicate(findings),
    hash: report.hash || report.md5 || "",
    app_info: {
      permissions: asArray(report.permissions || {}),
      activities: asArray(report.activities || []),
      services: asArray(report.services || []),
      receivers: asArray(report.receivers || []),
      providers: asArray(report.providers || []),
      certificate: report.certificate_analysis || {}
    },
    raw: report
  };
}

// ================== 🔑 SECRET DETECTION ==================
const SECRET_PATTERNS = [
  { type: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/g, risk: "High" },
  { type: "Google/Firebase API Key", regex: /AIza[0-9A-Za-z\-_]{35}/g, risk: "High" },
  { type: "JSON Web Token (JWT)", regex: /ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, risk: "Medium" },
  { type: "Private Key", regex: /-----BEGIN (RSA|EC|DSA|GPG|OPENSSH) PRIVATE KEY-----/g, risk: "Critical" },
  { type: "Generic Password/Secret", regex: /(?:password|secret|token|api_key|access_token|credential)["']?\s*[:=]\s*["']?([0-9a-zA-Z\-_@#%]{8,})["']?/gi, risk: "Medium" }
];

function scanForSecrets(report) {
  const secrets = [];
  const found = new Set(); // To avoid duplicates

  // 1. Scan strings extracted by MASE Engine
  const stringsObj = report.strings || {};
  const stringsList = [
    ...(Array.isArray(stringsObj.strings_apk_res) ? stringsObj.strings_apk_res : []),
    ...(Array.isArray(stringsObj.strings_so) ? stringsObj.strings_so : []),
    ...(Array.isArray(stringsObj.strings_code) ? stringsObj.strings_code : [])
  ];
  
  stringsList.forEach(str => {
    if (typeof str !== 'string') return;
    SECRET_PATTERNS.forEach(pattern => {
      const matches = str.matchAll(pattern.regex);
      for (const match of matches) {
        const secretVal = match[0];
        const displayVal = match[1] || secretVal; // Use capture group if exists
        const key = `${pattern.type}-${displayVal}`;
        
        if (!found.has(key)) {
          secrets.push({
            type: pattern.type,
            matched_string: displayVal,
            risk_level: pattern.risk,
            context: str.length > 100 ? str.substring(0, 100) + "..." : str,
            file: "Extracted Strings"
          });
          found.add(key);
        }
      }
    });
  });

  // 2. Scan code_analysis findings (some already have code snippets)
  const codeFindings = report.code_analysis?.findings || {};
  Object.entries(codeFindings).forEach(([id, data]) => {
    const metadata = data.metadata || {};
    const files = data.files || {};
    
    // Check if finding description/title implies a secret
    const textToCheck = `${metadata.title} ${metadata.description} ${metadata.issue}`;
    SECRET_PATTERNS.forEach(pattern => {
       const matches = textToCheck.matchAll(pattern.regex);
       for (const match of matches) {
         const secretVal = match[0];
         const key = `${pattern.type}-${secretVal}`;
         if (!found.has(key)) {
           secrets.push({
             type: pattern.type,
             matched_string: secretVal,
             risk_level: pattern.risk,
             context: metadata.description,
             file: Object.keys(files)[0] || "Source Code"
           });
           found.add(key);
         }
       }
     });
  });

  return secrets;
}
// ========================================================

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    createDefaultAdmin();
  })
  .catch(err => console.error("MongoDB connection error:", err));

// Auth Schema & Logic
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  created_at: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

async function createDefaultAdmin() {
  try {
    const existing = await User.findOne({ username: 'mobaudit' });
    if (!existing) {
      const hashed = await bcrypt.hash('mobaudit123', 10);
      await User.create({ username: 'mobaudit', password: hashed, role: 'admin' });
      console.log('[AUTH] Default admin user created');
    }
  } catch (err) {
    console.error('[AUTH] Error creating admin:', err.message);
  }
}

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, username: user.username, role: user.role });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username already exists' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashed });
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, username: user.username, role: user.role });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.get('/api/auth/verify', authenticateJWT, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Auto-start MASE Engine
const isWin = process.platform === "win32";
const checkCmd = isWin 
  ? 'docker ps --filter "ancestor=opensecurity/mobile-security-framework-mobsf:latest" --format "{{.Names}}"'
  : 'docker ps | grep mobile-security-framework-mobsf';

exec(checkCmd, (err, stdout) => {
  if (!stdout || !stdout.trim()) {
    console.log("MASE Engine not running. Starting opensecurity/mobile-security-framework-mobsf container...");
    const runCmd = isWin
      ? 'docker run -d --name mobsf -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest'
      : 'docker run -d --network host -v mobsf_data:/home/mobsf/.MobSF -e MOBSF_ANALYZER_IDENTIFIER=127.0.0.1:5556 opensecurity/mobile-security-framework-mobsf:latest';
    exec(runCmd, (runErr) => {
      if (runErr) console.log("Failed to auto-start MASE Engine container. Please start it manually.");
    });
  }
});

// Schema
const scanReportSchema = new mongoose.Schema({
  hash: { type: String, required: true, unique: true },
  report_data: Object,
  dynamic_report_data: Object,
  dynamic_status: { type: String, default: "not_started" },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  custom_analysis: { type: Object, default: {} },
  virustotal: { type: Object, default: {} }
});
const ScanReport = mongoose.model("ScanReport", scanReportSchema);

// AI Fix Cache Schema
const aiFixCacheSchema = new mongoose.Schema({
  vuln_hash: { type: String, required: true, unique: true },
  explanation: String,
  fix: String,
  secure_code: String,
  created_at: { type: Date, default: Date.now }
});
const AIFixCache = mongoose.model("AIFixCache", aiFixCacheSchema);

// File upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync("uploads/")) fs.mkdirSync("uploads/");
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

// ================== 🔍 ANALYZE ==================
app.post("/api/analyze", authenticateJWT, upload.single("apk"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    // Wait for MASE Engine
    let ready = false;
    let retries = 0;
    while (!ready && retries < 10) {
      try {
        await axios.get(`${MOBSF_URL}/api_docs`);
        ready = true;
      } catch {
        retries++;
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    console.log(`[1/3] Uploading file: ${req.file.originalname}`);
    const form = new FormData();
    form.append("file", fs.createReadStream(req.file.path), req.file.originalname);

    const uploadRes = await axios.post(`${MOBSF_URL}/api/v1/upload`, form, {
      headers: {
        ...form.getHeaders(),
        "Authorization": MOBSF_API_KEY,
        "X-Mobsf-Api-Key": MOBSF_API_KEY
      }
    });

    const hash = uploadRes.data.hash;
    console.log(`[2/3] Uploaded. Hash: ${hash}. Triggering scan...`);

    // Scan
    await axios.post(`${MOBSF_URL}/api/v1/scan`, `hash=${hash}`, {
      headers: {
        "Authorization": MOBSF_API_KEY,
        "X-Mobsf-Api-Key": MOBSF_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    console.log(`[3/3] Scan triggered. Waiting for analysis to complete...`);
    await new Promise(r => setTimeout(r, 5000)); // Wait for scan

    // Report
    const reportRes = await axios.post(`${MOBSF_URL}/api/v1/report_json`, `hash=${hash}`, {
      headers: {
        "Authorization": MOBSF_API_KEY,
        "X-Mobsf-Api-Key": MOBSF_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    const rawReport = reportRes.data;

    // 🔥 PARSE HERE
    const parsedReport = parseMobAuditReport(rawReport);
    parsedReport.hash = hash;

    const uploadedFilePath = req.file.path;
    console.log('[CUSTOM PARSER] Starting custom APK analysis...');
    const customAnalysis = await customApkParser(uploadedFilePath);
    console.log('[CUSTOM PARSER] Complete. Privacy risks:', customAnalysis.privacy_risks.length, 'Malware indicators:', customAnalysis.malware_indicators.length);

    console.log('[VIRUSTOTAL] Checking file reputation...');
    const vtResult = await checkVirusTotal(uploadedFilePath);
    console.log('[VIRUSTOTAL] Complete. Malicious:', vtResult.malicious || 0, '/', vtResult.total || 0);

    // Save
    const userId = req.user?.id || null;
    await ScanReport.findOneAndUpdate(
      { hash },
      { hash, report_data: rawReport, user_id: userId, custom_analysis: customAnalysis, virustotal: vtResult },
      { upsert: true }
    );

    res.json(parsedReport);
    console.log(`[SUCCESS] Analysis complete for hash: ${hash}`);

  } catch (err) {
    console.error(`[ERROR] Analysis failed: ${err.message}`);
    if (err.response) {
      console.error(`MASE Engine Response Data:`, err.response.data);
      console.error(`MASE Engine Response Status: ${err.response.status}`);
    }
    res.status(500).json({ 
      error: "Analysis failed", 
      details: err.response?.data || err.message 
    });
  } finally {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  }
});

// ================== ❤️ HEALTH CHECK ==================
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    port: 5001,
    mase: process.env.MOBSF_BASE_URL,
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});


// ================== 🛡️ RISK SCORE ==================
app.get("/api/risk-score/:hash", authenticateJWT, async (req, res) => {
  console.log(`[FLOW] 1. Initializing risk calculation for hash: ${req.params.hash}`);
  try {
    // 1. Fetch
    const reportFromDb = await ScanReport.findOne({ hash: req.params.hash, user_id: req.user?.id });
    if (!reportFromDb) {
      console.log(`[FLOW] [ERROR] Report not found in database for hash: ${req.params.hash}`);
      return res.status(404).json({ error: "Report not found" });
    }
    console.log(`[FLOW] 2. Report JSON successfully fetched from database.`);

    // 2. Parse
    const parsedData = parseMobAuditReport(reportFromDb.report_data);
    const findings = parsedData.findings || [];
    console.log(`[FLOW] 3. Parser extracted ${findings.length} deduplicated security findings.`);

    // 3. Apply Weights & Calculate
    let totalImpactPoints = 0;
    const owaspImpactMap = {};
    let highCount = 0, medCount = 0, lowCount = 0;

    findings.forEach(vuln => {
      let weight = 0;
      const sev = (vuln.severity || "info").toLowerCase();

      if (sev === 'high' || sev === 'critical') {
        weight = 3;
        highCount++;
      } else if (sev === 'medium' || sev === 'warning') {
        weight = 2;
        medCount++;
      } else if (sev === 'low' || sev === 'info') {
        weight = 1;
        lowCount++;
      }

      // Track OWASP stats dynamically
      const cat = vuln.owasp || "Uncategorized";
      if (!owaspImpactMap[cat]) {
        owaspImpactMap[cat] = { count: 0, score: 0 };
      }
      owaspImpactMap[cat].count += 1;
      owaspImpactMap[cat].score += weight;

      totalImpactPoints += weight;
    });

    console.log(`[FLOW] 4. Weight stats: High(${highCount}), Medium(${medCount}), Low(${lowCount}). Total Points: ${totalImpactPoints}`);

    // Compute raw score based on data density
    // We use a base-100 linear scale derived from cumulative impact points.
    // If totalImpactPoints is 0, score is 0. If it's high, it scales up.
    // Note: No arbitrary overrides or forced levels are applied here.
    const computedScore = Math.min(totalImpactPoints, 100); 

    // Risk Classification based on standard thresholds
    let level = "Low";
    if (computedScore > 70) level = "High";
    else if (computedScore > 30) level = "Medium";

    console.log(`[FLOW] 5. Final Calculation: Score=${computedScore}, Level=${level}`);

    const categories = Object.entries(owaspImpactMap)
      .map(([cat, info]) => ({ category: cat, ...info }))
      .sort((a, b) => b.score - a.score);

    // 4. Send Result
    const result = {
      hash: req.params.hash,
      total_score: computedScore,
      risk_level: level,
      owasp_categories: categories,
      meta: {
        total_findings: findings.length,
        severity_distribution: { high: highCount, medium: medCount, low: lowCount }
      }
    };

    console.log(`[FLOW] 6. Sending verified results to frontend.`);
    res.json(result);

  } catch (err) {
    console.error(`[FLOW] [ERROR] Risk computation failed: ${err.message}`);
    res.status(500).json({ error: "Risk analysis flow interrupted" });
  }
});

app.get("/api/custom-analysis/:hash", authenticateJWT, async (req, res) => {
  try {
    const report = await ScanReport.findOne({ hash: req.params.hash, user_id: req.user?.id });
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json(report.custom_analysis || { 
      permissions: [], dangerous_permissions: [], privacy_risks: [], 
      malware_indicators: [], hardcoded_secrets: [], manifest_issues: [], app_info: {} 
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/virustotal/:hash", authenticateJWT, async (req, res) => {
  try {
    const report = await ScanReport.findOne({ hash: req.params.hash, user_id: req.user?.id });
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json(report.virustotal || { error: 'No VirusTotal data' });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ================== 🔑 SECRETS ==================
app.get("/api/secrets/:hash", authenticateJWT, async (req, res) => {
  try {
    const report = await ScanReport.findOne({ hash: req.params.hash, user_id: req.user?.id });
    if (!report) return res.status(404).json({ error: "Report not found" });

    const secrets = scanForSecrets(report.report_data);
    res.json({
      hash: req.params.hash,
      count: secrets.length,
      secrets: secrets
    });
  } catch (err) {
    console.error(`[ERROR] Secret scan failed: ${err.message}`);
    res.status(500).json({ error: "Secret analysis failed" });
  }
});

app.get("/api/playstore-check/:hash", authenticateJWT, async (req, res) => {
  try {
    const report = await ScanReport.findOne({ hash: req.params.hash });
    if (!report) return res.status(404).json({ error: "Report not found" });
    
    const parsed = parseMobAuditReport(report.report_data);
    const customAnalysis = report.custom_analysis || {};
    const complianceCheck = checkPlayStoreCompliance(customAnalysis, parsed.findings || [], parsed.app || {});
    
    res.json(complianceCheck);
  } catch(err) {
    console.error('[PLAYSTORE-CHECK] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================== 📊 GET REPORT ==================
app.get("/api/report/:hash", authenticateJWT, async (req, res) => {
  console.log(`[API] Fetching report for hash: ${req.params.hash}`);
  try {
    const report = await ScanReport.findOne({ hash: req.params.hash, user_id: req.user?.id });
    if (!report) return res.status(404).json({ error: "Report not found" });

    const parsedReport = parseMobAuditReport(report.report_data);
    parsedReport.hash = report.hash;
    
    // Attach dynamic data if available
    if (report.dynamic_report_data) {
      const dynRaw = report.dynamic_report_data;
      parsedReport.dynamic = {
        // Network data
        urls: dynRaw.urls || [],
        emails: dynRaw.emails || [],
        domains: Object.keys(dynRaw.domains || {}),
        // Storage
        sqlite_databases: dynRaw.sqlite || [],
        // Trackers
        trackers: dynRaw.trackers || 0,
        tracker_details: dynRaw.tracker_details || [],
        // Screenshots
        screenshots: dynRaw.screenshots || [],
        // Frida/API hooks
        api_calls: dynRaw.apimon || {},
        frida_logs: dynRaw.frida_logs || false,
        // Raw for fallback
        raw: dynRaw
      };
    }

    res.json(parsedReport);
  } catch (err) {
    console.error(`[ERROR] Report fetch failed: ${err.message}`);
    res.status(500).json({ error: "Fetch failed" });
  }
});

// ================== 📥 DOWNLOAD JSON ==================
app.get("/api/report/download/json/:hash", async (req, res) => {
  try {
    const report = await ScanReport.findOne({ hash: req.params.hash });
    if (!report) return res.status(404).send("Report not found");
    
    res.setHeader('Content-disposition', `attachment; filename=mobaudit_${req.params.hash}.json`);
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify(report.report_data, null, 2));
  } catch (err) {
    res.status(500).send("Extraction error");
  }
});

// ================== 📥 DOWNLOAD CSV ==================
app.get("/api/report/download/csv/:hash", async (req, res) => {
  try {
    const report = await ScanReport.findOne({ hash: req.params.hash });
    if (!report) return res.status(404).send("Report not found");
    
    const parsed = parseMobAuditReport(report.report_data);
    const findings = parsed.findings;
    
    let csv = "Title,Severity,File,Line,Description\n";
    findings.forEach(f => {
      const row = [
        `"${f.title.replace(/"/g, '""')}"`,
        `"${f.severity}"`,
        `"${f.file}"`,
        `"${f.line}"`,
        `"${f.description.replace(/"/g, '""')}"`
      ];
      csv += row.join(",") + "\n";
    });

    res.setHeader('Content-disposition', `attachment; filename=mobaudit_${req.params.hash}.csv`);
    res.setHeader('Content-type', 'text/csv');
    res.send(csv);
  } catch (err) {
    res.status(500).send("CSV generation failed");
  }
});

// ================== 📥 DOWNLOAD PDF ==================
app.get("/api/report/download/pdf/:hash", async (req, res) => {
  try {
    const reportData = await ScanReport.findOne({ hash: req.params.hash });
    if (!reportData) return res.status(404).send("Report not found");
    
    const parsed = parseMobAuditReport(reportData.report_data);
    const findings = parsed.findings || [];
    const raw = reportData.report_data;
    
    // Calculate scores
    let totalScore = 0, highCount = 0, medCount = 0, lowCount = 0;
    findings.forEach(f => {
      const sev = (f.severity || '').toLowerCase();
      if (sev === 'high' || sev === 'critical') { totalScore += 3; highCount++; }
      else if (sev === 'medium' || sev === 'warning') { totalScore += 2; medCount++; }
      else { totalScore += 1; lowCount++; }
    });
    const finalScore = Math.min(totalScore, 100);
    const riskLevel = finalScore > 70 ? 'HIGH' : finalScore > 30 ? 'MEDIUM' : 'LOW';
    const riskColor = riskLevel === 'HIGH' ? '#E11D48' : riskLevel === 'MEDIUM' ? '#F59E0B' : '#10B981';
    
    const mitreMappings = mapToMitreAndCve(findings);
    const permissions = parsed.app_info?.permissions || [];
    
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    res.setHeader('Content-disposition', `attachment; filename=MobAudit_${parsed.app.name}_Report.pdf`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);
    
    // Helper functions
    const addPageHeader = (title) => {
      doc.rect(0, 0, 612, 40).fill('#0a0a0a');
      doc.fontSize(8).fillColor('#888888').font('Helvetica')
         .text('MOBAUDIT SECURITY PLATFORM', 50, 14)
         .text(parsed.app.name, 0, 14, { width: 562, align: 'right' });
      doc.rect(0, 40, 612, 3).fill('#E11D48');
      doc.moveDown(2);
    };
    
    const addPageFooter = (pageNum) => {
      doc.rect(0, 775, 612, 25).fill('#0a0a0a');
      doc.fontSize(7).fillColor('#888888').font('Helvetica')
         .text('CONFIDENTIAL — MobAudit Security Platform | Powered by MASE Engine', 50, 782)
         .text(`Page ${pageNum}`, 0, 782, { width: 562, align: 'right' });
    };
    
    const sectionHeader = (title, y) => {
      doc.rect(50, y, 4, 24).fill('#E11D48');
      doc.fontSize(16).fillColor('#0a0a0a').font('Helvetica-Bold')
         .text(title, 62, y + 4);
      doc.rect(50, y + 28, 512, 1).fill('#dddddd');
      return y + 40;
    };
    
    // ===================== PAGE 1: COVER =====================
    // Full dark cover
    doc.rect(0, 0, 612, 842).fill('#0a0a0a');

    // Logo - bigger and centered
    const logoPath = path.join(__dirname, '../client/public/logo.png');
    try {
      doc.image(logoPath, 156, 180, { width: 300, height: 90, fit: [300, 90] });
    } catch(e) {
      doc.fontSize(42).fillColor('#E11D48').font('Helvetica-Bold')
         .text('MOBAUDIT', 50, 200, { align: 'center' });
    }

    // Subtitle
    doc.fontSize(16).fillColor('#cccccc').font('Helvetica')
       .text('Mobile Application Security Analysis Report', 50, 300, { align: 'center', width: 512 });

    // Divider line
    doc.rect(150, 335, 312, 1).fill('#E11D48');

    // Date and ID
    doc.fontSize(10).fillColor('#888888').font('Helvetica')
       .text(`Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 50, 355, { align: 'center', width: 512 });
    doc.fontSize(9).fillColor('#555555')
       .text(`Analysis ID: ${req.params.hash}`, 50, 375, { align: 'center', width: 512 });

    // Risk badge - bigger
    doc.rect(206, 410, 200, 55).fill(riskColor);
    doc.fontSize(22).fillColor('#ffffff').font('Helvetica-Bold')
       .text(`${riskLevel} RISK`, 206, 425, { width: 200, align: 'center' });

    // Bottom attribution
    doc.fontSize(8).fillColor('#666666').font('Helvetica')
       .text('Powered by MASE — MobAudit Security Engine', 50, 482, { align: 'center', width: 512 });

    // Bottom accent line
    doc.rect(0, 500, 612, 3).fill(riskColor);
    
    let y = 520;
    doc.fontSize(14).fillColor('#E11D48').font('Helvetica-Bold')
       .text('APPLICATION INFORMATION', 50, y);
    y += 25;
    doc.rect(50, y, 512, 1).fill('#dddddd');
    y += 15;
    
    const appInfo = [
      ['Application Name', parsed.app.name],
      ['Package Name', parsed.app.package],
      ['Version', parsed.app.version],
      ['Main Activity', parsed.app.main_activity],
      ['Minimum SDK', parsed.app.min_sdk || 'N/A'],
      ['Target SDK', parsed.app.target_sdk || 'N/A'],
      ['Activities', String(parsed.app.counts?.activities || 0)],
      ['Services', String(parsed.app.counts?.services || 0)],
      ['Receivers', String(parsed.app.counts?.receivers || 0)],
      ['Providers', String(parsed.app.counts?.providers || 0)],
    ];
    
    appInfo.forEach(([label, value], i) => {
      if (i % 2 === 0) doc.rect(50, y, 512, 22).fill('#f9f9f9');
      doc.fontSize(9).fillColor('#888888').font('Helvetica-Bold')
         .text(label, 60, y + 6);
      doc.fontSize(9).fillColor('#000000').font('Helvetica')
         .text(String(value || 'N/A'), 220, y + 6);
      y += 22;
    });
    
    addPageFooter(1);
    
    // ===================== PAGE 2: EXECUTIVE SUMMARY =====================
    doc.addPage();
    addPageHeader('Executive Summary');
    
    y = 65;
    y = sectionHeader('EXECUTIVE SUMMARY', y);
    
    // 4 stat boxes
    const statBoxes = [
      { label: 'RISK SCORE', value: finalScore, color: riskColor, bg: riskLevel === 'HIGH' ? '#ffebee' : riskLevel === 'MEDIUM' ? '#fff8e1' : '#e8f5e9' },
      { label: 'HIGH FINDINGS', value: highCount, color: '#E11D48', bg: '#ffebee' },
      { label: 'MEDIUM FINDINGS', value: medCount, color: '#F59E0B', bg: '#fff8e1' },
      { label: 'LOW FINDINGS', value: lowCount, color: '#10B981', bg: '#e8f5e9' },
    ];
    
    statBoxes.forEach((box, i) => {
      const x = 50 + (i * 130);
      doc.rect(x, y, 120, 80).fill(box.bg);
      doc.rect(x, y, 120, 4).fill(box.color);
      doc.fontSize(32).fillColor(box.color).font('Helvetica-Bold')
         .text(String(box.value), x, y + 18, { width: 120, align: 'center' });
      doc.fontSize(8).fillColor('#666666').font('Helvetica-Bold')
         .text(box.label, x, y + 58, { width: 120, align: 'center' });
    });
    
    y += 100;
    
    // Risk interpretation
    doc.fontSize(9).fillColor('#444444').font('Helvetica')
       .text(`Risk Assessment: This application has been assigned a risk score of ${finalScore}/100 (${riskLevel} RISK). ${
         riskLevel === 'HIGH' ? 'Immediate remediation is required. Critical vulnerabilities pose significant security risks.' :
         riskLevel === 'MEDIUM' ? 'Remediation is recommended. Several vulnerabilities require attention before production deployment.' :
         'Application shows acceptable security posture. Minor improvements recommended.'
       }`, 50, y, { width: 512 });
    y += 40;
    
    // Severity bar chart
    y = sectionHeader('SEVERITY DISTRIBUTION', y);
    const total = highCount + medCount + lowCount;
    
    [
      { label: 'CRITICAL/HIGH', count: highCount, color: '#E11D48' },
      { label: 'MEDIUM',        count: medCount,  color: '#F59E0B' },
      { label: 'LOW/INFO',      count: lowCount,  color: '#10B981' },
    ].forEach(bar => {
      const pct = total > 0 ? Math.round((bar.count / total) * 100) : 0;
      const barWidth = total > 0 ? (bar.count / total) * 300 : 0;
      
      // Label on left
      doc.fontSize(9).fillColor('#444444').font('Helvetica-Bold')
         .text(bar.label, 50, y, { width: 120, lineBreak: false });
      
      // Gray background bar
      doc.rect(180, y + 2, 300, 14).fill('#eeeeee');
      
      // Colored fill bar
      if (barWidth > 0) doc.rect(180, y + 2, barWidth, 14).fill(bar.color);
      
      // Count and percentage AFTER the bar, fixed position
      doc.fontSize(9).fillColor('#000000').font('Helvetica')
         .text(`${bar.count}  (${pct}%)`, 490, y, { width: 80, lineBreak: false });
      
      y += 24;
    });
    
    y += 10;
    
    // OWASP Summary Table
    y = sectionHeader('OWASP MOBILE TOP 10 SUMMARY', y);
    
    const owaspCats = {};
    findings.forEach(f => {
      const cat = f.owasp || 'Uncategorized';
      owaspCats[cat] = (owaspCats[cat] || 0) + 1;
    });
    
    doc.rect(50, y, 512, 20).fill('#0a0a0a');
    doc.fontSize(8).fillColor('#ffffff').font('Helvetica-Bold')
       .text('OWASP CATEGORY', 55, y + 6)
       .text('FINDINGS', 430, y + 6)
       .text('RISK', 510, y + 6);
    y += 20;
    
    Object.entries(owaspCats).sort((a, b) => b[1] - a[1]).forEach(([cat, count], i) => {
      if (y > 720) { doc.addPage(); addPageHeader('OWASP Summary'); y = 65; }
      if (i % 2 === 0) doc.rect(50, y, 512, 20).fill('#f9f9f9');
      doc.rect(50, y, 512, 20).strokeColor('#dddddd').lineWidth(0.5).stroke();
      doc.fontSize(8).fillColor('#000000').font('Helvetica')
         .text(cat, 55, y + 6, { width: 360 });
      doc.fontSize(8).fillColor('#E11D48').font('Helvetica-Bold')
         .text(String(count), 430, y + 6);
      const catRisk = count > 5 ? 'HIGH' : count > 2 ? 'MEDIUM' : 'LOW';
      const catColor = catRisk === 'HIGH' ? '#E11D48' : catRisk === 'MEDIUM' ? '#F59E0B' : '#10B981';
      doc.rect(505, y + 4, 45, 14).fill(catColor);
      doc.fontSize(7).fillColor('#ffffff').font('Helvetica-Bold')
         .text(catRisk, 505, y + 8, { width: 45, align: 'center' });
      y += 20;
    });
    
    addPageFooter(2);
    
    // ===================== PAGE 3+: DETAILED FINDINGS =====================
    doc.addPage();
    addPageHeader('Security Findings');
    y = 65;
    let pageNum = 3;
    y = sectionHeader(`DETAILED SECURITY FINDINGS (${findings.length} Total)`, y);
    
    findings.forEach((f, i) => {
      const cardHeight = 110;
      if (y + cardHeight > 750) {
        addPageFooter(pageNum);
        doc.addPage();
        addPageHeader('Security Findings');
        pageNum++;
        y = 65;
      }
      
      const sevColor = f.severity === 'High' || f.severity === 'Critical' ? '#E11D48' :
                       f.severity === 'Medium' || f.severity === 'Warning' ? '#F59E0B' : '#10B981';
      const sevBg = f.severity === 'High' || f.severity === 'Critical' ? '#fff5f5' :
                    f.severity === 'Medium' || f.severity === 'Warning' ? '#fffbf0' : '#f0fff4';
      
      doc.rect(50, y, 512, cardHeight).fill(sevBg);
      doc.rect(50, y, 512, cardHeight).strokeColor('#dddddd').lineWidth(0.5).stroke();
      doc.rect(50, y, 5, cardHeight).fill(sevColor);
      
      doc.rect(58, y + 8, 24, 16).fill(sevColor);
      doc.fontSize(8).fillColor('#ffffff').font('Helvetica-Bold')
         .text(String(i + 1), 58, y + 12, { width: 24, align: 'center' });
      
      doc.rect(462, y + 8, 92, 16).fill(sevColor);
      doc.fontSize(8).fillColor('#ffffff').font('Helvetica-Bold')
         .text(f.severity.toUpperCase(), 462, y + 12, { width: 92, align: 'center' });
      
      doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold')
         .text(f.title, 88, y + 8, { width: 365 });
      
      doc.fontSize(8).fillColor('#444444').font('Helvetica')
         .text(f.description, 58, y + 30, { width: 496, height: 45, ellipsis: true });
      
      doc.rect(50, y + cardHeight - 22, 512, 22).fill('#00000011');
      doc.fontSize(7).fillColor('#666666').font('Helvetica')
         .text(`File: ${f.file || 'N/A'}`, 58, y + cardHeight - 15, { width: 200 })
         .text(`OWASP: ${f.owasp || 'Uncategorized'}`, 270, y + cardHeight - 15, { width: 180 })
         .text(`CWE: ${f.cwe || 'N/A'}`, 460, y + cardHeight - 15, { width: 95 });
      
      y += cardHeight + 8;
    });
    
    addPageFooter(pageNum);
    pageNum++;
    
    // ===================== PERMISSIONS PAGE =====================
    if (permissions.length > 0) {
      doc.addPage();
      addPageHeader('Permissions Analysis');
      y = 65;
      y = sectionHeader(`PERMISSIONS ANALYSIS (${permissions.length} Total)`, y);
      
      const dangerousPerms = ['READ_CONTACTS', 'WRITE_CONTACTS', 'ACCESS_FINE_LOCATION', 
        'ACCESS_COARSE_LOCATION', 'READ_CALL_LOG', 'WRITE_CALL_LOG', 'CAMERA',
        'READ_SMS', 'SEND_SMS', 'RECEIVE_SMS', 'RECORD_AUDIO', 'WRITE_EXTERNAL_STORAGE',
        'READ_EXTERNAL_STORAGE', 'GET_ACCOUNTS', 'USE_CREDENTIALS'];
      
      doc.rect(50, y, 512, 20).fill('#0a0a0a');
      doc.fontSize(8).fillColor('#ffffff').font('Helvetica-Bold')
         .text('PERMISSION', 55, y + 6)
         .text('TYPE', 480, y + 6);
      y += 20;
      
      permissions.slice(0, 30).forEach((perm, i) => {
        if (y > 720) { addPageFooter(pageNum); doc.addPage(); addPageHeader('Permissions'); pageNum++; y = 65; }
        const permName = typeof perm === 'string' ? perm : (perm.name || perm.permission || JSON.stringify(perm));
        const isDangerous = dangerousPerms.some(d => permName.toUpperCase().includes(d));
        if (i % 2 === 0) doc.rect(50, y, 512, 20).fill('#f9f9f9');
        doc.fontSize(8).fillColor('#000000').font('Helvetica')
           .text(permName, 55, y + 6, { width: 410 });
        const permColor = isDangerous ? '#E11D48' : '#10B981';
        const permLabel = isDangerous ? 'DANGEROUS' : 'NORMAL';
        doc.rect(468, y + 3, 80, 14).fill(permColor);
        doc.fontSize(7).fillColor('#ffffff').font('Helvetica-Bold')
           .text(permLabel, 468, y + 7, { width: 80, align: 'center' });
        y += 20;
      });
      
      addPageFooter(pageNum);
      pageNum++;
    }
    
    // ===================== MITRE PAGE =====================
    doc.addPage();
    addPageHeader('MITRE ATT&CK & CVE');
    y = 65;
    y = sectionHeader(`MITRE ATT&CK & CVE MAPPINGS (${mitreMappings.length} Mappings)`, y);
    
    doc.rect(50, y, 512, 22).fill('#0a0a0a');
    doc.fontSize(7).fillColor('#ffffff').font('Helvetica-Bold')
       .text('VULNERABILITY', 55, y + 7)
       .text('MITRE ID', 230, y + 7)
       .text('TACTIC', 290, y + 7)
       .text('CVE', 370, y + 7)
       .text('CVSS', 490, y + 7);
    y += 22;
    
    mitreMappings.forEach((m, i) => {
      if (y > 720) { addPageFooter(pageNum); doc.addPage(); addPageHeader('MITRE ATT&CK'); pageNum++; y = 65; }
      if (i % 2 === 0) doc.rect(50, y, 512, 35).fill('#f9f9f9');
      doc.rect(50, y, 512, 35).strokeColor('#dddddd').lineWidth(0.3).stroke();
      
      doc.fontSize(7).fillColor('#000000').font('Helvetica-Bold')
         .text(m.vulnerability.substring(0, 28), 55, y + 5, { width: 170 });
      doc.fontSize(7).fillColor('#444444').font('Helvetica')
         .text(m.remediation ? m.remediation.substring(0, 25) + '...' : '', 55, y + 18, { width: 170 });
      
      doc.rect(228, y + 5, 55, 16).fill('#1e3a5f');
      doc.fontSize(8).fillColor('#ffffff').font('Helvetica-Bold')
         .text(m.mitre_id, 228, y + 10, { width: 55, align: 'center' });
      
      doc.fontSize(7).fillColor('#444444').font('Helvetica')
         .text(m.mitre_tactic, 290, y + 12, { width: 75 });
      
      doc.fontSize(7).fillColor('#E11D48').font('Helvetica-Bold')
         .text(m.cve_id, 370, y + 5, { width: 115 });
      doc.fontSize(6).fillColor('#666666').font('Helvetica')
         .text(m.cve_description.substring(0, 35) + '...', 370, y + 17, { width: 115 });
      
      const cvssColor = m.cvss_score >= 9 ? '#E11D48' : m.cvss_score >= 7 ? '#F59E0B' : '#10B981';
      doc.rect(488, y + 5, 66, 22).fill(cvssColor);
      doc.fontSize(12).fillColor('#ffffff').font('Helvetica-Bold')
         .text(String(m.cvss_score), 488, y + 10, { width: 66, align: 'center' });
      
      y += 38;
    });
    
    addPageFooter(pageNum);
    pageNum++;
    
    // VirusTotal Page
    doc.addPage();
    y = 50;

    // Header bar
    doc.rect(0, 0, 612, 45).fill('#0a0a0a');
    doc.fontSize(11).fillColor('#E11D48').font('Helvetica-Bold')
       .text('VIRUSTOTAL THREAT INTELLIGENCE', 50, 15, { width: 400 });
    doc.fontSize(8).fillColor('#666666').font('Helvetica')
       .text(`MobAudit Security Platform`, 400, 17, { width: 162, align: 'right' });

    y = 65;

    const vt = reportData.virustotal || {};

    // Score Banner
    const vtColor = (vt.malicious || 0) === 0 ? '#10B981' : (vt.malicious || 0) < 5 ? '#F59E0B' : '#E11D48';
    doc.rect(50, y, 512, 70).fill(vtColor);
    doc.fontSize(32).fillColor('#ffffff').font('Helvetica-Bold')
       .text(`${vt.malicious || 0}/${vt.total || 0}`, 70, y + 12, { width: 200 });
    doc.fontSize(12).fillColor('#ffffff').font('Helvetica')
       .text('engines flagged this file as malicious', 70, y + 50, { width: 400 });
    const vtStatus = (vt.malicious || 0) === 0 ? 'CLEAN' : (vt.malicious || 0) < 5 ? 'SUSPICIOUS' : 'MALICIOUS';
    doc.fontSize(14).fillColor('#ffffff').font('Helvetica-Bold')
       .text(vtStatus, 400, y + 25, { width: 142, align: 'right' });

    y += 90;

    // Stats boxes
    const vtStats = [
      { label: 'Malicious', value: vt.malicious || 0, color: '#E11D48' },
      { label: 'Suspicious', value: vt.suspicious || 0, color: '#F59E0B' },
      { label: 'Undetected', value: vt.undetected || 0, color: '#10B981' },
    ];
    vtStats.forEach((stat, i) => {
      const bx = 50 + (i * 174);
      doc.rect(bx, y, 162, 60).fill('#1a1a2e');
      doc.fontSize(24).fillColor(stat.color).font('Helvetica-Bold')
         .text(stat.value, bx, y + 8, { width: 162, align: 'center' });
      doc.fontSize(9).fillColor('#888888').font('Helvetica')
         .text(stat.label, bx, y + 38, { width: 162, align: 'center' });
    });

    y += 80;

    // SHA256
    doc.rect(50, y, 512, 35).fill('#111111');
    doc.fontSize(8).fillColor('#666666').font('Helvetica')
       .text('SHA256:', 60, y + 8);
    doc.fontSize(7).fillColor('#aaaaaa').font('Helvetica')
       .text(vt.sha256 || 'N/A', 60, y + 20, { width: 492 });

    y += 50;

    // Threat label
    if (vt.threat_label) {
      doc.rect(50, y, 512, 35).fill('#2d0a0a');
      doc.rect(50, y, 4, 35).fill('#E11D48');
      doc.fontSize(10).fillColor('#E11D48').font('Helvetica-Bold')
         .text(`THREAT CLASSIFICATION: ${vt.threat_label.toUpperCase()}`, 64, y + 12, { width: 488 });
      y += 50;
    }

    // Flagged engines table
    if (vt.flagged_engines && vt.flagged_engines.length > 0) {
      doc.fontSize(11).fillColor('#ffffff').font('Helvetica-Bold')
         .text('FLAGGED BY ANTIVIRUS ENGINES', 50, y);
      y += 20;
      
      doc.rect(50, y, 512, 24).fill('#E11D48');
      doc.fontSize(9).fillColor('#ffffff').font('Helvetica-Bold')
         .text('Engine', 60, y + 7)
         .text('Detection', 350, y + 7);
      y += 24;

      vt.flagged_engines.forEach((engine, i) => {
        doc.rect(50, y, 512, 22).fill(i % 2 === 0 ? '#1a1a2e' : '#141424');
        doc.fontSize(8).fillColor('#cccccc').font('Helvetica')
           .text(engine.engine, 60, y + 7, { width: 250 });
        doc.fontSize(8).fillColor('#E11D48').font('Helvetica')
           .text(engine.result, 350, y + 7, { width: 202 });
        y += 22;
      });
    } else {
      doc.rect(50, y, 512, 50).fill('#0a2d1a');
      doc.rect(50, y, 4, 50).fill('#10B981');
      doc.fontSize(12).fillColor('#10B981').font('Helvetica-Bold')
         .text('✓ No antivirus engines flagged this file as malicious', 64, y + 18, { width: 488 });
      y += 65;
    }

    addPageFooter(pageNum);
    pageNum++;

    // Privacy & Malware Page
    doc.addPage();
    y = 50;

    doc.rect(0, 0, 612, 45).fill('#0a0a0a');
    doc.fontSize(11).fillColor('#E11D48').font('Helvetica-Bold')
       .text('PRIVACY & MALWARE ANALYSIS', 50, 15, { width: 400 });
    doc.fontSize(8).fillColor('#666666').font('Helvetica')
       .text('MobAudit Custom Engine', 400, 17, { width: 162, align: 'right' });

    y = 65;

    const ca = reportData.custom_analysis || {};

    // Privacy Risks
    doc.fontSize(11).fillColor('#ffffff').font('Helvetica-Bold')
       .text('PRIVACY RISK ANALYSIS', 50, y);
    y += 20;

    const privacyRisks = ca.privacy_risks || [];
    if (privacyRisks.length === 0) {
      doc.rect(50, y, 512, 35).fill('#0a2d1a');
      doc.fontSize(9).fillColor('#10B981').font('Helvetica')
         .text('No privacy risks detected', 60, y + 12);
      y += 50;
    } else {
      privacyRisks.forEach(risk => {
        doc.rect(50, y, 512, 30).fill('#1a0a0a');
        doc.rect(50, y, 4, 30).fill('#E11D48');
        doc.fontSize(9).fillColor('#cccccc').font('Helvetica')
           .text(risk, 64, y + 10, { width: 488 });
        y += 35;
      });
      y += 10;
    }

    // Dangerous Permissions
    doc.fontSize(11).fillColor('#ffffff').font('Helvetica-Bold')
       .text('DANGEROUS PERMISSIONS', 50, y);
    y += 20;

    const dangerPerms = ca.dangerous_permissions || [];
    if (dangerPerms.length === 0) {
      doc.rect(50, y, 512, 35).fill('#0a2d1a');
      doc.fontSize(9).fillColor('#10B981').font('Helvetica')
         .text('No dangerous permissions found', 60, y + 12);
      y += 50;
    } else {
      doc.fontSize(8).fillColor('#888888').font('Helvetica')
         .text(`${dangerPerms.length} dangerous permissions detected`, 50, y);
      y += 15;
      dangerPerms.forEach((perm, i) => {
        if (i % 2 === 0 && i > 0) y += 0;
        doc.rect(50, y, 512, 22).fill(i % 2 === 0 ? '#1a0a0a' : '#140808');
        doc.fontSize(8).fillColor('#F59E0B').font('Helvetica')
           .text(perm.replace('android.permission.', ''), 60, y + 7, { width: 492 });
        y += 22;
      });
      y += 15;
    }

    // Malware Indicators
    doc.fontSize(11).fillColor('#ffffff').font('Helvetica-Bold')
       .text('MALWARE INDICATORS', 50, y);
    y += 20;

    const malwareInds = ca.malware_indicators || [];
    if (malwareInds.length === 0) {
      doc.rect(50, y, 512, 35).fill('#0a2d1a');
      doc.fontSize(9).fillColor('#10B981').font('Helvetica')
         .text('No malware indicators detected', 60, y + 12);
      y += 50;
    } else {
      malwareInds.forEach(ind => {
        const indColor = ind.severity === 'Critical' ? '#E11D48' : ind.severity === 'High' ? '#F59E0B' : '#888888';
        doc.rect(50, y, 512, 35).fill('#1a0a0a');
        doc.rect(50, y, 4, 35).fill(indColor);
        doc.fontSize(9).fillColor('#cccccc').font('Helvetica-Bold')
           .text(ind.indicator, 64, y + 5, { width: 380 });
        doc.fontSize(8).fillColor(indColor).font('Helvetica')
           .text(ind.severity, 450, y + 10, { width: 100, align: 'right' });
        y += 40;
      });
      y += 10;
    }

    // Manifest Issues
    doc.fontSize(11).fillColor('#ffffff').font('Helvetica-Bold')
       .text('MANIFEST SECURITY ISSUES', 50, y);
    y += 20;

    const manifestIssues = ca.manifest_issues || [];
    if (manifestIssues.length === 0) {
      doc.rect(50, y, 512, 35).fill('#0a2d1a');
      doc.fontSize(9).fillColor('#10B981').font('Helvetica')
         .text('No manifest security issues found', 60, y + 12);
      y += 50;
    } else {
      manifestIssues.forEach(issue => {
        const issColor = issue.severity === 'High' ? '#E11D48' : '#F59E0B';
        doc.rect(50, y, 512, 45).fill('#1a1a2e');
        doc.rect(50, y, 4, 45).fill(issColor);
        doc.fontSize(9).fillColor('#ffffff').font('Helvetica-Bold')
           .text(issue.issue, 64, y + 7, { width: 380 });
        doc.fontSize(7).fillColor('#888888').font('Helvetica')
           .text(issue.detail, 64, y + 22, { width: 430 });
        doc.fontSize(8).fillColor(issColor)
           .text(issue.severity, 450, y + 10, { width: 100, align: 'right' });
        y += 50;
      });
    }

    addPageFooter(pageNum);
    pageNum++;
    
    // ===================== RECOMMENDATIONS PAGE =====================
    doc.addPage();
    addPageHeader('Recommendations');
    y = 65;
    y = sectionHeader('SECURITY RECOMMENDATIONS', y);
    
    const criticalFindings = findings.filter(f => 
      f.severity === 'High' || f.severity === 'Critical'
    ).slice(0, 5);
    
    doc.fontSize(10).fillColor('#E11D48').font('Helvetica-Bold')
       .text('IMMEDIATE ACTION REQUIRED', 50, y);
    y += 20;
    
    criticalFindings.forEach((f, i) => {
      if (y > 680) { addPageFooter(pageNum); doc.addPage(); addPageHeader('Recommendations'); pageNum++; y = 65; }
      doc.rect(50, y, 512, 70).fill('#fff5f5');
      doc.rect(50, y, 5, 70).fill('#E11D48');
      doc.fontSize(9).fillColor('#E11D48').font('Helvetica-Bold')
         .text(`${i + 1}. ${f.title}`, 62, y + 8, { width: 490 });
      doc.fontSize(8).fillColor('#444444').font('Helvetica')
         .text(f.description.substring(0, 200), 62, y + 24, { width: 490, height: 30, ellipsis: true });
      doc.fontSize(7).fillColor('#888888')
         .text(`OWASP: ${f.owasp || 'N/A'} | CWE: ${f.cwe || 'N/A'}`, 62, y + 56);
      y += 78;
    });
    
    y += 10;
    y = sectionHeader('GENERAL SECURITY RECOMMENDATIONS', y);
    
    const recommendations = [
      '1. Implement Certificate Pinning to prevent man-in-the-middle attacks on all network communications.',
      '2. Enable ProGuard/R8 code obfuscation for release builds to prevent reverse engineering.',
      '3. Remove all debug logs and debugging configurations before releasing to production.',
      '4. Implement proper input validation and sanitization for all user inputs.',
      '5. Use Android Keystore for storing sensitive cryptographic keys.',
      '6. Apply principle of least privilege — request only necessary permissions.',
      '7. Encrypt all sensitive data stored locally using AES-256 encryption.',
      '8. Implement root detection and emulator detection mechanisms.',
      '9. Use HTTPS for all network communications with proper TLS configuration.',
      '10. Conduct regular security audits and penetration testing before major releases.',
    ];
    
    recommendations.forEach((rec, i) => {
      if (y > 720) { addPageFooter(pageNum); doc.addPage(); addPageHeader('Recommendations'); pageNum++; y = 65; }
      doc.rect(50, y, 512, 28).fill(i % 2 === 0 ? '#f9f9f9' : '#ffffff');
      doc.fontSize(9).fillColor('#000000').font('Helvetica')
         .text(rec, 58, y + 8, { width: 496 });
      y += 28;
    });
    
    // Final footer
    y += 20;
    doc.rect(50, y, 512, 90).fill('#0a0a0a');

    // Logo centered in footer box - no text overlap
    const logoPath2 = path.join(__dirname, '../client/public/logo.png');
    try {
      doc.image(logoPath2, 181, y + 8, { width: 250, height: 45, fit: [250, 45] });
    } catch(e) {
      doc.fontSize(14).fillColor('#E11D48').font('Helvetica-Bold')
         .text('MOBAUDIT', 50, y + 20, { width: 512, align: 'center' });
    }

    // Text BELOW logo, not overlapping
    doc.fontSize(8).fillColor('#888888').font('Helvetica')
       .text('This report is confidential and intended solely for the use of the addressed recipient.', 50, y + 58, { width: 512, align: 'center' })
       .text(`© ${new Date().getFullYear()} MobAudit Security Platform. All rights reserved.`, 50, y + 72, { width: 512, align: 'center' });
    
    addPageFooter(pageNum);
    doc.end();
    
  } catch (err) {
    console.error('[PDF ERROR]', err);
    res.status(500).send("PDF generation failed: " + err.message);
  }
});

app.get("/api/code/:hash", async (req, res) => {
  const { file } = req.query;
  const hash = req.params.hash;

  if (!file) return res.status(400).json({ error: "File required" });

  console.log(`[CODE VIEW] 📂 Fetching: ${file}`);
  console.log(`[CODE VIEW] 🔑 Hash: ${hash}`);

  try {
    const response = await axios.post(
      `${MOBSF_URL}/api/v1/view_source`,
      `hash=${hash}&file=${file}&type=apk`,
      {
        headers: {
          "Authorization": MOBSF_API_KEY,
          "X-Mobsf-Api-Key": MOBSF_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    if (response.data && response.data.data) {
      console.log(`[CODE VIEW] ✅ Success! (${response.data.data.length} chars)`);
      res.json({ code: response.data.data });
    } else {
       console.error(`[CODE VIEW] ⚠️ Empty response from MASE Engine:`, response.data);
       res.status(500).json({ error: "Empty response from source provider" });
    }

  } catch (err) {
    console.error(`[CODE VIEW] ❌ Request failed: ${err.message}`);
    if (err.response) {
       console.error(`[CODE VIEW] Status: ${err.response.status}`);
       console.error(`[CODE VIEW] Data:`, err.response.data);
    }
    res.status(500).json({ error: "Code fetch failed" });
  }
});

// ================== 🤖 AI FIX SUGGESTIONS ==================
app.post("/api/ai/fix-suggestion", async (req, res) => {
  const { title, description, code_snippet } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: "Vulnerability title and description are required" });
  }

  // Create a unique hash for caching
  const vulnHash = crypto.createHash('md5')
    .update(`${title}|${description}|${code_snippet || ''}`)
    .digest('hex');

  try {
    // Check cache first
    const cachedFix = await AIFixCache.findOne({ vuln_hash: vulnHash });
    if (cachedFix) {
      console.log(`[AI] Cache hit for: ${title}`);
      return res.json(cachedFix);
    }

    // IF NO GROQ KEY, RETURN MOCK DATA FOR UI DEMO
    if (!process.env.GROQ_API_KEY) {
      console.log(`[AI] Mocking fix for: ${title} (No API Key)`);
      const mockResult = {
        vuln_hash: vulnHash,
        explanation: `[MOCK] The vulnerability "${title}" occurs when user-controlled data is handled unsafely. In this case, "${description}" indicates a potential security risk in the mobile environment.`,
        fix: `1. Identify the location of the report: ${title}.\n2. Sanitize and validate all inputs.\n3. Use platform-recommended secure APIs instead of raw or insecure alternatives.\n4. Apply principle of least privilege to the affected component.`,
        secure_code: `// MOCK SECURE IMPLEMENTATION\npublic void secureMethod() {\n    // Implementation for: ${title}\n    String safeData = sanitize(userInput);\n    processSecurely(safeData);\n}`
      };
      // We don't save mock data to cache to avoid polluting it
      return res.json(mockResult);
    }

    console.log(`[AI] Generating real fix for: ${title}...`);

    const prompt = `You are an Android security expert. Return ONLY a JSON object with no extra text.

Vulnerability: ${title}
Description: ${description}

Return this exact JSON:
{"explanation":"Why this is dangerous in 2 sentences","fix":"1. First fix step\\n2. Second fix step\\n3. Third fix step","secure_code":"// Secure implementation example\\npublic void secureMethod() {\\n    // Replace vulnerable code here\\n}"}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 0.1
      })
    });
    const groqData = await response.json();
    console.log('[GROQ] Raw response:', JSON.stringify(groqData).substring(0, 200));
    if (!groqData.choices || !groqData.choices[0]) {
      console.error('[GROQ] Unexpected response:', groqData);
      throw new Error('Groq returned unexpected response format');
    }
    let aiResult;
    try {
      const content = groqData.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      aiResult = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch(parseErr) {
      aiResult = {
        explanation: groqData.choices[0].message.content,
        fix: "Review the explanation above for fix steps",
        secure_code: "// See risk explanation for remediation guidance"
      };
    }

    // Store in cache
    const newFix = await AIFixCache.create({
      vuln_hash: vulnHash,
      explanation: aiResult.explanation,
      fix: aiResult.fix,
      secure_code: aiResult.secure_code
    });

    res.json(newFix);

  } catch (error) {
    console.error("[AI Error]:", error.message);
    res.status(500).json({ error: "AI service failed to generate a suggestion" });
  }
});

// ================== MITRE & CVE ==================
function mapToMitreAndCve(findings) {
  const mitreMap = {
    'janus': { id: 'T1582', name: 'Exploit Application', tactic: 'Execution', score: 8.1, cve: 'CVE-2017-13156', cve_desc: 'Android Janus vulnerability allows attackers to prepend arbitrary code to APK files.', remediation: 'Sign your APK with both v1 and v2/v3 signature schemes. Use apksigner tool with --v2-signing-enabled true flag when building release APKs.' },
    'debug': { id: 'T1418', name: 'Application Discovery', tactic: 'Discovery', score: 5.3, cve: 'CVE-2024-0045', cve_desc: 'Debug configurations expose sensitive application internals to attackers.', remediation: 'Set android:debuggable="false" in AndroidManifest.xml for release builds. Use BuildConfig.DEBUG flag to conditionally enable debug features.' },
    'certificate': { id: 'T1587.003', name: 'Develop Capabilities: Code Signing Certificates', tactic: 'Resource Development', score: 6.5, cve: 'CVE-2023-21492', cve_desc: 'Improper certificate validation allows man-in-the-middle attacks.', remediation: 'Use a proper release keystore with strong credentials. Never ship apps signed with debug certificates. Implement certificate pinning for network requests.' },
    'log': { id: 'T1409', name: 'Access Sensitive Data in Device Logs', tactic: 'Collection', score: 6.2, cve: 'CVE-2021-0395', cve_desc: 'Sensitive information exposed through Android logcat logs.', remediation: 'Remove all Log.d(), Log.v(), Log.i() calls containing sensitive data. Use ProGuard rules to strip logging in release builds: -assumenosideeffects class android.util.Log.' },
    'storage': { id: 'T1533', name: 'Data from Local System', tactic: 'Collection', score: 7.1, cve: 'CVE-2021-0316', cve_desc: 'Insecure data storage allows unauthorized access to sensitive files.', remediation: 'Use Android Keystore for sensitive data. Prefer Internal Storage over External. Use EncryptedSharedPreferences for storing sensitive key-value pairs.' },
    'sqlite': { id: 'T1005', name: 'Data from Local System', tactic: 'Collection', score: 7.5, cve: 'CVE-2021-0339', cve_desc: 'Unencrypted SQLite databases expose sensitive user data.', remediation: 'Use SQLCipher to encrypt SQLite databases. Never store plaintext passwords or tokens in the database. Apply proper file permissions to database files.' },
    'sql': { id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'Initial Access', score: 9.1, cve: 'CVE-2022-20007', cve_desc: 'SQL injection vulnerability allows unauthorized database access.', remediation: 'Always use parameterized queries or prepared statements. Never concatenate user input directly into SQL strings. Use Room database with proper query annotations.' },
    'crypto': { id: 'T1600', name: 'Weaken Encryption', tactic: 'Defense Evasion', score: 7.4, cve: 'CVE-2020-0095', cve_desc: 'Weak cryptographic implementations allow decryption of sensitive data.', remediation: 'Use AES-256-GCM for encryption. Avoid MD5 and SHA1 for security purposes. Use Android Keystore for key management. Never hardcode encryption keys.' },
    'permission': { id: 'T1404', name: 'Exploit for Privilege Escalation', tactic: 'Privilege Escalation', score: 7.8, cve: 'CVE-2021-0963', cve_desc: 'Excessive permissions grant unauthorized access to system resources.', remediation: 'Request only permissions that are absolutely necessary. Use runtime permissions for dangerous permissions. Implement permission rationale dialogs to explain usage.' },
    'exported': { id: 'T1414', name: 'Capture SMS Messages', tactic: 'Collection', score: 6.8, cve: 'CVE-2021-0441', cve_desc: 'Exported components allow unauthorized access from other applications.', remediation: 'Set android:exported="false" for components that do not need to be accessed by other apps. Add proper permission checks for exported components.' },
    'network': { id: 'T1040', name: 'Network Sniffing', tactic: 'Credential Access', score: 7.3, cve: 'CVE-2020-0073', cve_desc: 'Insecure network communication exposes data to interception.', remediation: 'Enforce HTTPS for all network communications. Implement certificate pinning. Use Network Security Configuration to restrict cleartext traffic.' },
    'http': { id: 'T1557', name: 'Adversary-in-the-Middle', tactic: 'Collection', score: 8.2, cve: 'CVE-2021-0600', cve_desc: 'Cleartext HTTP traffic vulnerable to man-in-the-middle interception.', remediation: 'Replace all HTTP URLs with HTTPS. Add cleartextTrafficPermitted="false" in network_security_config.xml. Implement SSL certificate pinning for critical endpoints.' },
    'webview': { id: 'T1456', name: 'Drive-by Compromise', tactic: 'Initial Access', score: 8.8, cve: 'CVE-2020-6506', cve_desc: 'WebView vulnerabilities allow execution of malicious scripts.', remediation: 'Disable JavaScript in WebView if not needed. Never use setJavaScriptEnabled(true) with untrusted content. Validate all URLs before loading in WebView.' },
    'intent': { id: 'T1624', name: 'Event Triggered Execution', tactic: 'Persistence', score: 6.5, cve: 'CVE-2021-0394', cve_desc: 'Intent hijacking allows malicious apps to intercept sensitive data.', remediation: 'Use explicit intents instead of implicit intents for sensitive operations. Add proper permission checks. Use LocalBroadcastManager for internal app communication.' },
    'random': { id: 'T1600.001', name: 'Reduce Key Space', tactic: 'Defense Evasion', score: 7.0, cve: 'CVE-2013-7372', cve_desc: 'Weak random number generation leads to predictable cryptographic keys.', remediation: 'Use SecureRandom instead of Random for security-sensitive operations. Never seed SecureRandom with predictable values like timestamps.' },
    'root': { id: 'T1401', name: 'Device Administrator Permissions', tactic: 'Privilege Escalation', score: 8.5, cve: 'CVE-2022-20452', cve_desc: 'Insufficient root detection allows privilege escalation attacks.', remediation: 'Implement root detection using RootBeer library. Check for su binary, test-keys, and dangerous apps. Consider using SafetyNet Attestation API.' },
    'temp': { id: 'T1533', name: 'Data from Local System', tactic: 'Collection', score: 5.5, cve: 'CVE-2021-0308', cve_desc: 'Temporary files may expose sensitive data to other applications.', remediation: 'Delete temporary files immediately after use. Use getCacheDir() instead of external storage. Encrypt sensitive temporary files and set proper file permissions.' },
  };

  const results = [];
  const seen = new Set();

  findings.forEach(finding => {
    const text = `${finding.title} ${finding.description}`.toLowerCase();
    Object.entries(mitreMap).forEach(([keyword, mapping]) => {
      const key = `${mapping.id}-${finding.title}`;
      if (text.includes(keyword) && !seen.has(key)) {
        seen.add(key);
        results.push({
          vulnerability: finding.title,
          severity: finding.severity,
          mitre_id: mapping.id,
          mitre_name: mapping.name,
          mitre_tactic: mapping.tactic,
          cvss_score: mapping.score,
          cve_id: mapping.cve,
          cve_description: mapping.cve_desc,
          remediation: mapping.remediation
        });
      }
    });
  });

  return results.sort((a, b) => b.cvss_score - a.cvss_score);
}

app.get("/api/mitre-cve/:hash", authenticateJWT, async (req, res) => {
  console.log('[MITRE] Fetching for hash:', req.params.hash);
  try {
    const reportFromDb = await ScanReport.findOne({ hash: req.params.hash, user_id: req.user?.id });
    if (!reportFromDb) {
      return res.status(404).json({ error: "Report not found" });
    }
    
    const parsedData = parseMobAuditReport(reportFromDb.report_data);
    const findings = parsedData.findings || [];
    console.log('[MITRE] Total findings to map:', findings.length);
    
    const mappings = mapToMitreAndCve(findings);
    console.log('[MITRE] Total mappings found:', mappings.length);
    
    res.json({ 
      hash: req.params.hash, 
      total: mappings.length, 
      mappings 
    });
  } catch (err) {
    console.error('[MITRE ERROR]', err.message);
    res.status(500).json({ error: "Failed to generate MITRE mappings" });
  }
});

// ================== SCAN HISTORY ==================
app.get("/api/scans/history", authenticateJWT, async (req, res) => {
  try {
    const reports = await ScanReport.find({ 
      $or: [
        { user_id: req.user?.id },
        { user_id: null }
      ]
    }).sort({ _id: -1 }).limit(20);

    // After fetching, update null user_id records to current user
    if (req.user?.id) {
      await ScanReport.updateMany(
        { user_id: null },
        { $set: { user_id: req.user?.id } }
      );
    }
    res.json({
      scans: reports.map(report => {
        const parsed = parseMobAuditReport(report.report_data);
        const findings = parsed.findings || [];
        let score = 0;
        findings.forEach(f => {
          const sev = (f.severity || '').toLowerCase();
          if (sev === 'high' || sev === 'critical') score += 3;
          else if (sev === 'medium') score += 2;
          else score += 1;
        });
        const finalScore = Math.min(score, 100);
        return {
          hash: report.hash,
          app_name: parsed.app.name,
          package: parsed.app.package,
          version: parsed.app.version,
          total_findings: findings.length,
          risk_score: finalScore,
          risk_level: finalScore > 70 ? 'High' : finalScore > 30 ? 'Medium' : 'Low',
          dynamic_status: report.dynamic_status || 'not_started',
          scanned_at: report._id.getTimestamp()
        };
      })
    });
  } catch (error) {
    console.error("[HISTORY ERROR]", error);
    res.status(500).json({ error: "Failed to fetch scan history" });
  }
});

// ================== 🚀 CI/CD SCAN START ==================
app.post("/api/scan/start", authenticateCiToken, upload.single("apk"), async (req, res) => {
  let tempFilePath = req.file ? req.file.path : null;
  const { repo_url } = req.body;

  try {
    // If repo_url provided, attempt to download zip
    if (!tempFilePath && repo_url) {
      console.log(`[CI/CD] Processing repo scan: ${repo_url}`);
      let downloadUrl = repo_url;
      if (repo_url.includes("github.com")) {
        downloadUrl = repo_url.replace(/\/$/, "") + "/archive/refs/heads/main.zip";
      }

      const response = await axios.get(downloadUrl, { responseType: 'stream' });
      tempFilePath = `uploads/repo-${Date.now()}.zip`;
      const writer = fs.createWriteStream(tempFilePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    }

    if (!tempFilePath) {
      return res.status(400).json({ error: "No APK file or valid repo_url provided" });
    }

    console.log(`[CI/CD] Uploading asset to MASE Engine...`);
    const form = new FormData();
    const fileName = req.file ? req.file.originalname : "repository.zip";
    form.append("file", fs.createReadStream(tempFilePath), fileName);

    const uploadRes = await axios.post(`${MOBSF_URL}/api/v1/upload`, form, {
      headers: {
        ...form.getHeaders(),
        "Authorization": MOBSF_API_KEY,
        "X-Mobsf-Api-Key": MOBSF_API_KEY
      }
    });

    const hash = uploadRes.data.hash;
    console.log(`[CI/CD] Asset uploaded. Hash: ${hash}. Triggering scan...`);

    // Trigger scan (Non-blocking)
    axios.post(`${MOBSF_URL}/api/v1/scan`, `hash=${hash}`, {
      headers: {
        "Authorization": MOBSF_API_KEY,
        "X-Mobsf-Api-Key": MOBSF_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }).catch(err => console.error(`[CI/CD] Background scan trigger error: ${err.message}`));

    res.status(202).json({
      status: "scan_initiated",
      hash: hash,
      results_url: `http://${req.hostname}:3000/report/${hash}`,
      message: "Analysis is running in background. Results will be available shortly."
    });

  } catch (err) {
    console.error(`[CI/CD ERROR] ${err.message}`);
    res.status(500).json({ error: "Failed to initiate CI/CD scan", details: err.message });
  } finally {
    // Cleanup will happen after some time or usually handled by MASE Engine, 
    // but we can't unlink yet if MASE Engine is still reading. 
    // For this demo, we'll keep it simple.
  }
});

// ================== 📱 DYNAMIC ANALYSIS ==================

// Helper to check for ADB devices
const checkAdbDevices = () => {
  return new Promise((resolve) => {
    const isWin = process.platform === "win32";
    const adbPath = isWin ? '"C:\\Program Files\\Genymobile\\Genymotion\\tools\\adb.exe"' : 'adb';
    
    exec(`${adbPath} connect 192.168.174.101:5555`, () => {
      exec(`${adbPath} devices`, (err, stdout) => {
        if (err) return resolve(false);
        const lines = stdout.split('\n').filter(line => line.trim().length > 0);
        if (lines.length > 1) {
          const hasDevice = lines.slice(1).some(line => line.includes('device') && !line.includes('offline') && !line.includes('unauthorized'));
          resolve(hasDevice);
        } else {
          resolve(false);
        }
      });
    });
  });
};

app.get("/api/analyze/dynamic/:hash/status", async (req, res) => {
  try {
    const report = await ScanReport.findOne({ hash: req.params.hash });
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json({
      status: report.dynamic_status || "not_started",
      hash: req.params.hash
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch status" });
  }
});

app.post("/api/analyze/dynamic/:hash/reset", authenticateJWT, async (req, res) => {
  try {
    const report = await ScanReport.findOne({ hash: req.params.hash });
    if (!report) return res.status(404).json({ error: "Report not found" });
    report.dynamic_status = "not_started";
    report.dynamic_report_data = null;
    await report.save();
    res.json({ status: "reset" });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/analyze/dynamic/:hash", async (req, res) => {
  const hash = req.params.hash;

  try {
    const report = await ScanReport.findOne({ hash });
    if (!report) return res.status(404).json({ error: "Report not found" });

    if (report.dynamic_status === "running") {
      return res.status(400).json({ error: "Dynamic analysis is already running" });
    }

    const hasEmulator = await checkAdbDevices();
    if (!hasEmulator) {
      return res.status(503).json({ error: "No Android Emulator or ADB device detected. Please start an emulator or connect a device via ADB first." });
    }

    // Acknowledge request immediately
    res.json({ status: "started", message: "Dynamic analysis sequence initiated." });

    // Update DB status
    report.dynamic_status = "running";
    await report.save();

    // Background orchestrator function
    (async () => {
      try {
        console.log(`[DYNAMIC] 🧬 Starting session for hash: ${hash}`);
        
        // 1. Start Analysis
        await axios.post(`${MOBSF_URL}/api/v1/dynamic/start_analysis`, `hash=${hash}&device_id=192.168.174.101:5555`, {
          headers: {
            "Authorization": MOBSF_API_KEY,
            "X-Mobsf-Api-Key": MOBSF_API_KEY,
            "Content-Type": "application/x-www-form-urlencoded"
          }
        });
        
        console.log(`[DYNAMIC] ⏳ Session active. Waiting 40 seconds to collect runtime data...`);
        // 2. Wait to collect data
        await new Promise(r => setTimeout(r, 40000));
        
        console.log(`[DYNAMIC] 🛑 Stopping session...`);
        // 3. Stop Analysis
        await axios.post(`${MOBSF_URL}/api/v1/dynamic/stop_analysis`, `hash=${hash}`, {
           headers: { "Authorization": MOBSF_API_KEY, "X-Mobsf-Api-Key": MOBSF_API_KEY, "Content-Type": "application/x-www-form-urlencoded" }
        });

        // Small delay for MASE to finalize log parsing internally
        await new Promise(r => setTimeout(r, 5000));

        console.log(`[DYNAMIC] 📥 Fetching dynamic report JSON...`);
        // 4. Fetch Report
        const reportRes = await axios.post(`${MOBSF_URL}/api/v1/dynamic/report_json`, `hash=${hash}`, {
           headers: { "Authorization": MOBSF_API_KEY, "X-Mobsf-Api-Key": MOBSF_API_KEY, "Content-Type": "application/x-www-form-urlencoded" }
        });

        // 5. Update DB
        report.dynamic_report_data = reportRes.data;
        report.dynamic_status = "completed";
        await report.save();
        console.log(`[DYNAMIC] ✅ Dynamic analysis fully completed for hash: ${hash}`);

      } catch (innerErr) {
        console.error(`[DYNAMIC ERROR] Failed during background analysis: ${innerErr.message}`);
        if(innerErr.response) console.error("MASE Error details:", innerErr.response.data);
        report.dynamic_status = "error";
        await report.save().catch(e => console.error("DB Save Error:", e));
      }
    })();

  } catch (err) {
    console.error(`[DYNAMIC ERROR] Route failed: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to initiate dynamic analysis" });
    }
  }
});

// ================== START ==================
const PORT = process.env.PORT || 5001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on ${PORT}`);
});