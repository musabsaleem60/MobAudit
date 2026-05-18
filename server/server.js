require("dotenv").config();
const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const cors = require("cors");
const mongoose = require("mongoose");
const { exec } = require("child_process");
const crypto = require("crypto");
const { OpenAI } = require("openai");
const PDFDocument = require("pdfkit");

const app = express();
app.use(cors());
app.use(express.json());

const MOBSF_API_KEY = (process.env.MOBSF_API_KEY || "").replace(/\x1b\[[0-9;]*m/g, "").trim();
const MOBSF_URL = process.env.MOBSF_BASE_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
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

// Normalize vulnerability
function normalizeFinding(item, severityLabel) {
  return {
    title: item.title || item.name || item.issue || "Unknown Issue",
    description:
      item.description ||
      item.detail ||
      item.message ||
      item.info ||
      "No description available",
    severity: severityLabel,
    file: item.file || item.file_path || item.source || "N/A",
    line: item.line || item.line_number || "N/A",
    owasp: item["owasp-mobile"] || item.owasp || "Uncategorized",
    cvss: item.cvss || 0,
    cwe: item.cwe || ""
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

// Main parser
function parseMobAuditReport(report) {
  const findings = [];
  const asArray = (val) => (Array.isArray(val) ? val : typeof val === 'object' && val !== null ? Object.values(val) : []);

  // 1. AppSec / Static Analysis Findings (Handles both MobSF v4 appsec and v3 static_analysis)
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

  // 2. Manifest Analysis (Handles MobSF v4 manifest_findings and v3 manifest_analysis)
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

  // 2b. Certificate Analysis (Handles MobSF v4 certificate_findings)
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

  // 1. Scan strings extracted by MobSF
  const stringsObj = report.strings || {};
  const stringsList = [
    ...(Array.isArray(stringsObj.strings_apk_res) ? stringsObj.strings_apk_res : []),
    ...(Array.isArray(stringsObj.strings_so) ? stringsObj.strings_so : []),
    ...(Array.isArray(stringsObj.strings_code) ? stringsObj.strings_code : [])
  ];
  
  stringsList.forEach(str => {
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
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

// Auto-start MobSF
const isWin = process.platform === "win32";
const checkCmd = isWin 
  ? 'docker ps --filter "ancestor=opensecurity/mobile-security-framework-mobsf:latest" --format "{{.Names}}"'
  : 'docker ps | grep mobile-security-framework-mobsf';

exec(checkCmd, (err, stdout) => {
  if (!stdout || !stdout.trim()) {
    console.log("MobSF not running. Starting opensecurity/mobile-security-framework-mobsf container...");
    const runCmd = isWin
      ? 'docker run -d --name mobsf -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest'
      : 'docker run -d --network host -v mobsf_data:/home/mobsf/.MobSF -e MOBSF_ANALYZER_IDENTIFIER=127.0.0.1:5556 opensecurity/mobile-security-framework-mobsf:latest';
    exec(runCmd, (runErr) => {
      if (runErr) console.log("Failed to auto-start MobSF container. Please start it manually.");
    });
  }
});

// Schema
const scanReportSchema = new mongoose.Schema({
  hash: { type: String, required: true, unique: true },
  report_data: Object,
  dynamic_report_data: Object,
  dynamic_status: { type: String, default: "not_started" }
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
app.post("/api/analyze", upload.single("apk"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    // Wait for MobSF
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

    // Save
    await ScanReport.findOneAndUpdate(
      { hash },
      { hash, report_data: rawReport },
      { upsert: true }
    );

    res.json(parsedReport);
    console.log(`[SUCCESS] Analysis complete for hash: ${hash}`);

  } catch (err) {
    console.error(`[ERROR] Analysis failed: ${err.message}`);
    if (err.response) {
      console.error(`MobSF Response Data:`, err.response.data);
      console.error(`MobSF Response Status: ${err.response.status}`);
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
    mobsf: process.env.MOBSF_BASE_URL,
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});


// ================== 🛡️ RISK SCORE ==================
app.get("/api/risk-score/:hash", async (req, res) => {
  console.log(`[FLOW] 1. Initializing risk calculation for hash: ${req.params.hash}`);
  try {
    // 1. Fetch
    const reportFromDb = await ScanReport.findOne({ hash: req.params.hash });
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

// ================== 🔑 SECRETS ==================
app.get("/api/secrets/:hash", async (req, res) => {
  try {
    const report = await ScanReport.findOne({ hash: req.params.hash });
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

// ================== 📊 GET REPORT ==================
app.get("/api/report/:hash", async (req, res) => {
  console.log(`[API] Fetching report for hash: ${req.params.hash}`);
  try {
    const report = await ScanReport.findOne({ hash: req.params.hash });
    if (!report) return res.status(404).json({ error: "Report not found" });

    const parsedReport = parseMobAuditReport(report.report_data);
    parsedReport.hash = report.hash;
    
    // Attach dynamic data if available
    if (report.dynamic_report_data) {
      parsedReport.dynamic = report.dynamic_report_data;
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
    const doc = new PDFDocument();
    
    res.setHeader('Content-disposition', `attachment; filename=mobaudit_${req.params.hash}.pdf`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    // Title
    doc.fontSize(25).fillColor('#E11D48').text('MobAudit Analysis Report', { align: 'center' });
    doc.moveDown();
    
    // App Info
    doc.fillColor('black').fontSize(14).text(`App Name: ${parsed.app.name}`);
    doc.text(`Package: ${parsed.app.package}`);
    doc.text(`Version: ${parsed.app.version}`);
    doc.text(`Analysis Hash: ${req.params.hash}`);
    doc.moveDown();
    
    // Summary
    doc.fontSize(18).text('Security Summary');
    doc.fontSize(12).text(`Total Findings: ${parsed.findings.length}`);
    doc.text(`High: ${parsed.findings.filter(f => f.severity === "High").length}`);
    doc.text(`Medium: ${parsed.findings.filter(f => f.severity === "Medium").length}`);
    doc.text(`Low: ${parsed.findings.filter(f => f.severity === "Low").length}`);
    doc.moveDown();

    // Findings
    doc.fontSize(18).text('Findings Details');
    doc.moveDown();
    
    parsed.findings.forEach((f, i) => {
      doc.fontSize(14).fillColor(f.severity === 'High' ? '#E11D48' : 'black').text(`${i+1}. ${f.title} (${f.severity})`);
      doc.fontSize(10).fillColor('gray').text(`File: ${f.file} : Line ${f.line}`);
      doc.fillColor('black').text(f.description);
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("PDF generation failed");
  }
});

app.get("/api/code/:hash", async (req, res) => {
  const { file } = req.query;
  const hash = req.params.hash;

  if (!file) return res.status(400).json({ error: "File required" });

  console.log(`[CODE VIEW] 📂 Fetching: ${file}`);
  console.log(`[CODE VIEW] 🔑 Hash: ${hash}`);

  try {
    const params = new URLSearchParams();
    params.append('hash', hash);
    params.append('file', file);

    const response = await axios.post(
      `${MOBSF_URL}/api/v1/view_source`,
      params.toString(),
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
       console.error(`[CODE VIEW] ⚠️ Empty response from MobSF:`, response.data);
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

    // IF NO OPENAI KEY, RETURN MOCK DATA FOR UI DEMO
    if (!openai) {
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

    const prompt = `
      As a MobAudit mobile security expert, analyze the following vulnerability found during a MobAudit scan:
      Title: ${title}
      Description: ${description}
      ${code_snippet ? `Affected Code:\n${code_snippet}` : ''}

      Please provide:
      1. A simple explanation of why this is a security risk.
      2. A clear, step-by-step secure fix suggestion.
      3. A corrected, secure code snippet (Java or XML as appropriate).

      Format your response as a JSON object with these fields:
      {
        "explanation": "...",
        "fix": "...",
        "secure_code": "..."
      }
      Provide ONLY the JSON object.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const aiResult = JSON.parse(response.choices[0].message.content);

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

    console.log(`[CI/CD] Uploading asset to MobSF...`);
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
    // Cleanup will happen after some time or usually handled by MobSF, 
    // but we can't unlink yet if MobSF is still reading. 
    // For this demo, we'll keep it simple.
  }
});

// ================== 📱 DYNAMIC ANALYSIS ==================

// Helper to check for ADB devices
const checkAdbDevices = () => {
  return new Promise((resolve) => {
    exec("adb devices", (err, stdout) => {
      if (err) return resolve(false);
      // 'adb devices' returns "List of devices attached" on line 1, then devices
      const lines = stdout.split('\n').filter(line => line.trim().length > 0);
      if (lines.length > 1) {
        // Find if any device is listed as 'device' (not offline/unauthorized)
        const hasDevice = lines.slice(1).some(line => line.includes('device') && !line.includes('offline') && !line.includes('unauthorized'));
        resolve(hasDevice);
      } else {
        resolve(false);
      }
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
        await axios.post(`${MOBSF_URL}/api/v1/dynamic/start_analysis`, `hash=${hash}`, {
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

        // Small delay for MobSF to finalize log parsing internally
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
        if(innerErr.response) console.error("MobSF Error details:", innerErr.response.data);
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