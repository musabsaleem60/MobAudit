import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  AlertCircle, 
  CheckCircle2, 
  Download, 
  Lock,
  Globe,
  FileCode,
  Smartphone,
  Loader2,
  X,
  Code,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Layout,
  FileText,
  FileJson,
  TableProperties,
  Info,
  Brain,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

function SecretCard({ secret, viewCode }) {
  const [revealed, setRevealed] = useState(false);

  const getRiskIcon = (risk) => {
    switch (risk) {
      case 'Critical': return <AlertCircle className="w-5 h-5 text-brand-red" />;
      case 'High': return <AlertCircle className="w-5 h-5 text-orange-500" />;
      default: return <Info className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getRiskStyle = (risk) => {
     switch (risk) {
       case 'Critical': return 'bg-brand-red/10 text-brand-red border-brand-red/20';
       case 'High': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
       default: return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
     }
  };

  return (
    <div className="bg-brand-secondary border border-brand-border rounded-2xl p-6 group hover:border-brand-red/30 transition-all">
       <div className="flex justify-between items-start">
          <div className="flex items-center space-x-4">
             <div className={`p-3 rounded-xl border ${getRiskStyle(secret.risk_level)}`}>
                {getRiskIcon(secret.risk_level)}
             </div>
             <div>
                <h4 className="text-lg font-bold text-white group-hover:text-brand-red transition-colors">{secret.type}</h4>
                <p className="text-[10px] font-mono text-gray-500 flex items-center mt-0.5">
                   <FileCode className="w-3 h-3 mr-1" /> {secret.file}
                </p>
             </div>
          </div>
          <div className="flex space-x-3">
             <button 
                onClick={() => setRevealed(!revealed)}
                className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all"
             >
                {revealed ? "Mask Secret" : "Reveal Secret"}
             </button>
             {secret.file !== "Extracted Strings" && secret.file !== "Source Code" && (
                <button 
                   onClick={() => viewCode(secret.file)}
                   className="bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white px-4 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all"
                >
                   Go to Code
                </button>
             )}
          </div>
       </div>
       
       <div className="mt-6 bg-[#0d0d0d] p-4 rounded-xl border border-white/5 font-mono text-xs overflow-hidden">
          <div className="flex items-center justify-between mb-2">
             <span className="text-[10px] text-gray-600 uppercase font-sans font-bold tracking-widest">Matched String</span>
             <span className={`text-[10px] px-2 py-0.5 rounded font-sans uppercase font-bold tracking-widest ${getRiskStyle(secret.risk_level)}`}>
                {secret.risk_level} Risk
             </span>
          </div>
          <div className="text-brand-red break-all">
             {revealed ? secret.matched_string : secret.matched_string.replace(/.(?=.{4})/g, '*')}
          </div>
          {secret.context && (
             <div className="mt-4 pt-4 border-t border-white/5">
                <span className="text-[10px] text-gray-600 uppercase font-sans font-bold tracking-widest block mb-2">Context Snippet</span>
                <div className="text-gray-400 italic">... {secret.context} ...</div>
             </div>
          )}
       </div>
    </div>
  );
}

const extractText = (value) => {
  if (!value) return '';
  
  // If it's already a clean string without JSON
  if (typeof value === 'string') {
    // Remove surrounding quotes if present
    let cleaned = value.trim();
    
    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(cleaned);
      if (typeof parsed === 'string') return parsed;
      if (parsed.explanation) return parsed.explanation;
      if (parsed.description) return parsed.description;
      if (parsed.fix) return parsed.fix;
      if (parsed.title) return parsed.title;
      // If it's an object, stringify it nicely
      return Object.values(parsed).join(' ');
    } catch {
      // Not JSON, check if it starts with { which means broken JSON string
      if (cleaned.startsWith('{') || cleaned.startsWith('"explanation"')) {
        // Try to extract explanation using regex
        const expMatch = cleaned.match(/"explanation"\s*:\s*"([^"]+)"/);
        if (expMatch) return expMatch[1];
        const fixMatch = cleaned.match(/"fix"\s*:\s*"([^"]+)"/);
        if (fixMatch) return fixMatch[1];
      }
      return cleaned;
    }
  }
  
  if (typeof value === 'object') {
    if (value.explanation) return value.explanation;
    if (value.description) return value.description;
    if (value.fix) return value.fix;
    return Object.values(value).filter(v => typeof v === 'string').join(' ');
  }
  
  return String(value);
};

function Report({ reportData }) {
  const [report, setReport] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [secretsData, setSecretsData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [code, setCode] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [expandedVulnerability, setExpandedVulnerability] = useState(null);
  const [aiFixes, setAiFixes] = useState({});
  const [loadingFixId, setLoadingFixId] = useState(null);
  const [error, setError] = useState(null);
  const [selectedVuln, setSelectedVuln] = useState(null);
  const [isFixingCode, setIsFixingCode] = useState(false);
  const [fixError, setFixError] = useState(null);
  const [mitreData, setMitreData] = useState(null);
  const [customAnalysis, setCustomAnalysis] = useState(null);
  const [vtData, setVtData] = useState(null);
  const [playstoreData, setPlaystoreData] = useState(null);
  
  // Dynamic Analysis State
  const [dynamicStatus, setDynamicStatus] = useState(report?.dynamic_status || 'not_started'); 
  const [dynamicError, setDynamicError] = useState(null);
  const [dynamicData, setDynamicData] = useState(null);

  const [screenFrame, setScreenFrame] = useState(null);
  const [logLines, setLogLines] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [screenWs, setScreenWs] = useState(null);
  const [logWs, setLogWs] = useState(null);

  const currentDynamicData = dynamicData || report?.dynamic;
  const hasDynamicData = !!(currentDynamicData && (
    (currentDynamicData.domains && Object.keys(currentDynamicData.domains).length > 0) ||
    (currentDynamicData.api_monitor && currentDynamicData.api_monitor.length > 0)
  ));

  const navigate = useNavigate();
  const hash = reportData?.hash || report?.hash || (localStorage.getItem("lastScanResult") ? JSON.parse(localStorage.getItem("lastScanResult")).hash : null);

  useEffect(() => {
    if (report?.dynamic_status) {
      setDynamicStatus(report.dynamic_status);
    }
  }, [report]);

  const startLiveStream = () => {
    const sws = new WebSocket(`ws://${window.location.hostname}:5002?type=screen`);
    sws.onopen = () => setWsConnected(true);
    sws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'screen') setScreenFrame(msg.data);
    };
    sws.onclose = () => setWsConnected(false);
    setScreenWs(sws);
    const lws = new WebSocket(`ws://${window.location.hostname}:5002?type=logs`);
    lws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'log') setLogLines(prev => [msg.data, ...prev].slice(0, 150));
    };
    setLogWs(lws);
  };

  const stopLiveStream = () => {
    if (screenWs) screenWs.close();
    if (logWs) logWs.close();
    setWsConnected(false);
    setScreenFrame(null);
  };

  useEffect(() => {
    const fetchReport = async () => {
      let hash = reportData?.hash;
      if (!hash) {
        const saved = localStorage.getItem("lastScanResult");
        if (saved) {
          const parsed = JSON.parse(saved);
          hash = parsed.hash;
        }
      }

      if (!hash) {
        setError("Report hash not found.");
        return;
      }

      try {
        const token = localStorage.getItem('mobaudit_token');
        const headers = { 'Authorization': `Bearer ${token}` };
        
        const [reportRes, riskRes, secretsRes] = await Promise.all([
          fetch(`http://${window.location.hostname}:5001/api/report/${hash}`, { headers }),
          fetch(`http://${window.location.hostname}:5001/api/risk-score/${hash}`, { headers }),
          fetch(`http://${window.location.hostname}:5001/api/secrets/${hash}`, { headers })
        ]);
        
        if (!reportRes.ok) throw new Error("Failed to fetch report from API");
        
        const data = await reportRes.json();
        setReport(data);
        
        if (riskRes.ok) {
          const riskDataJson = await riskRes.json();
          setRiskData(riskDataJson);
        }

        if (secretsRes.ok) {
          const secretsDataJson = await secretsRes.json();
          setSecretsData(secretsDataJson.secrets);
        }

        const mitreRes = await fetch(`http://${window.location.hostname}:5001/api/mitre-cve/${hash}`, { headers });
        if (mitreRes.ok) {
          const mitreJson = await mitreRes.json();
          setMitreData(mitreJson.mappings);
        }

        const customRes = await fetch(`http://${window.location.hostname}:5001/api/custom-analysis/${hash}`, { headers });
        if (customRes.ok) {
          const customJson = await customRes.json();
          setCustomAnalysis(customJson);
        }

        const vtRes = await fetch(`http://${window.location.hostname}:5001/api/virustotal/${hash}`, { headers });
        if (vtRes.ok) {
          const vtJson = await vtRes.json();
          setVtData(vtJson);
        }

        const psRes = await fetch(`http://${window.location.hostname}:5001/api/playstore-check/${hash}`, { headers });
        if (psRes.ok) {
          const psJson = await psRes.json();
          setPlaystoreData(psJson);
        }
        
        setError(null);
      } catch (err) {
        console.error("Report fetch error:", err);
        setError("Could not load the analysis report. Please try again.");
      }
    };

    fetchReport();
  }, [reportData]);

  useEffect(() => {
    let intervalId;
    
    const checkDynamicStatus = async () => {
      let hash = reportData?.hash;
      if (!hash) {
        const saved = localStorage.getItem("lastScanResult");
        if (saved) hash = JSON.parse(saved).hash;
      }
      if (!hash) return;

      try {
        const token = localStorage.getItem('mobaudit_token');
        const headers = { 'Authorization': `Bearer ${token}` };
        const res = await fetch(`http://${window.location.hostname}:5001/api/analyze/dynamic/${hash}/status`, { headers });
        if (res.ok) {
          const data = await res.json();
          setDynamicStatus(data.status);
          
          if (data.status === "completed" && report && !report.dynamic) {
             const repRes = await fetch(`http://${window.location.hostname}:5001/api/report/${hash}`, { headers });
             if (repRes.ok) {
                const repData = await repRes.json();
                setReport(repData);
                if (repData.dynamic) {
                  setDynamicData(repData.dynamic);
                }
             }
          }
        }
      } catch (err) {
        console.error("Failed to poll dynamic status:", err);
      }
    };

    checkDynamicStatus();

    if (dynamicStatus === "running") {
      intervalId = setInterval(checkDynamicStatus, 5000);
    }

    return () => clearInterval(intervalId);
  }, [reportData, dynamicStatus, report]);

  const startDynamicAnalysis = async () => {
      let hash = reportData?.hash;
      if (!hash) {
        const saved = localStorage.getItem("lastScanResult");
        if (saved) hash = JSON.parse(saved).hash;
      }
      if (!hash) return;
      
      setDynamicError(null);
      setDynamicStatus("running");
      
      try {
         const res = await fetch(`http://${window.location.hostname}:5001/api/analyze/dynamic/${hash}`, {
            method: 'POST'
         });
         
         const data = await res.json();
         if (!res.ok) {
            setDynamicError(data.error);
            setDynamicStatus("error");
         }
      } catch(err) {
         setDynamicError("Network error attempting to start dynamic analysis. Ensure ADB emulator is running.");
         setDynamicStatus("error");
      }
  };

  const connectLiveScreen = () => {
    // Screen WebSocket
    const sws = new WebSocket('ws://localhost:5002?type=screen');
    sws.onopen = () => { setWsConnected(true); console.log('[WS] Screen connected'); };
    sws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'screen') setScreenFrame(msg.data);
    };
    sws.onclose = () => { setWsConnected(false); };
    setScreenWs(sws);

    // Log WebSocket
    const lws = new WebSocket('ws://localhost:5002?type=logs');
    lws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'log') {
        setLogLines(prev => [msg.data, ...prev].slice(0, 100));
      }
    };
    setLogWs(lws);
  };

  const disconnectLiveScreen = () => {
    if (screenWs) screenWs.close();
    if (logWs) logWs.close();
    setWsConnected(false);
    setScreenFrame(null);
    setLogLines([]);
  };

  const viewCode = async (filePath) => {
    if (!filePath || filePath === "N/A") return;
    
    let hash = reportData?.hash;
    if (!hash) {
      const saved = localStorage.getItem("lastScanResult");
      hash = JSON.parse(saved)?.hash;
    }

    setSelectedFile(filePath);
    setActiveTab("code");
    setIsLoadingCode(true);
    setCode("");

    try {
      const response = await fetch(`http://${window.location.hostname}:5001/api/code/${hash}?file=${encodeURIComponent(filePath)}`);
      if (!response.ok) throw new Error("Failed to fetch code");
      const data = await response.json();
      setCode(data.code);
    } catch (err) {
      setCode("// Error: Could not load source code for " + filePath);
    } finally {
      setIsLoadingCode(false);
    }
  };

  const getAIFix = async (vuln, id) => {
    if (aiFixes[id]) return;
    
    setLoadingFixId(id);
    try {
      const response = await fetch(`http://${window.location.hostname}:5001/api/ai/fix-suggestion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: vuln.title,
          description: vuln.description,
          code_snippet: vuln.code || ""
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch AI fix");
      }
      
      const data = await response.json();
      setAiFixes(prev => ({ ...prev, [id]: data }));
    } catch (err) {
      console.error("AI Fix error:", err);
      alert(err.message);
    } finally {
      setLoadingFixId(null);
    }
  };

  const handleAnalyzeVuln = async (vuln, idx) => {
    setSelectedVuln({ ...vuln, idx });
    setIsFixingCode(true);
    setFixError(null);
    setCode("");

    let hash = reportData?.hash;
    if (!hash) {
      const saved = localStorage.getItem("lastScanResult");
      hash = JSON.parse(saved)?.hash;
    }

    let fetchedCode = "";
    try {
      const response = await fetch(`http://${window.location.hostname}:5001/api/code/${hash}?file=${encodeURIComponent(vuln.file)}`);
      if (response.ok) {
        const data = await response.json();
        fetchedCode = data.code;
        setCode(fetchedCode);
      }
    } catch (err) {
      console.log("Code fetch failed, will proceed without code diff");
    }

    try {
      const response = await fetch(`http://${window.location.hostname}:5001/api/ai/fix-suggestion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: vuln.title,
          description: vuln.description,
          code_snippet: fetchedCode || ""
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch AI fix");
      }
      
      const data = await response.json();
      setAiFixes(prev => ({ ...prev, [idx]: data }));
    } catch (err) {
      console.error("AI Fix error:", err);
      setFixError(err.message);
    } finally {
      setIsFixingCode(false);
    }
  };

  const downloadReport = (format) => {
    let hash = reportData?.hash;
    if (!hash) {
      const saved = localStorage.getItem("lastScanResult");
      hash = JSON.parse(saved)?.hash;
    }
    if (!hash) return;
    window.open(`http://${window.location.hostname}:5001/api/report/download/${format}/${hash}`, '_blank');
  };

  const getSeverityStyles = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'bg-brand-red/10 text-brand-red border-brand-red/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (error) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-white p-8">
        <AlertCircle className="w-16 h-16 text-brand-red mb-4" />
        <h2 className="text-2xl font-bold mb-2">Error Loading Report</h2>
        <p className="text-gray-400 mb-6">{error}</p>
        <button onClick={() => navigate("/dashboard")} className="bg-brand-red px-6 py-2 rounded-lg font-bold">RETURN TO DASHBOARD</button>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 animate-spin text-brand-red mb-4" />
        <p className="text-gray-400 font-bold tracking-widest">LOADING ANALYSIS DATA...</p>
      </div>
    );
  }

  const { app, findings } = report;

  return (
    <div className="text-white pb-20 w-full animate-in fade-in duration-500">
      {/* Hide the global navbar and its spacer div locally to avoid duplicate headers and top gaps */}
      <style>{`
        nav, .h-\\[72px\\] { display: none !important; }
      `}</style>
      
      {/* Report Page Navbar */}
      <div style={{
        background: '#0a0a0f',
        borderBottom: '1px solid rgba(225,29,72,0.2)',
        padding: '12px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src="/logo.png" alt="MobAudit" style={{ height: '34px', objectFit: 'contain' }} />
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#aaa',
              padding: '6px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            ← DASHBOARD
          </button>
        </div>
        <span style={{ color: '#444', fontSize: '11px', letterSpacing: '2px' }}>SECURITY REPORT</span>
        <button
          onClick={() => { 
            localStorage.removeItem('mobaudit_token'); 
            localStorage.removeItem('mobaudit_user'); 
            localStorage.removeItem('token'); 
            navigate('/login'); 
          }}
          style={{
            background: '#E11D48',
            border: 'none',
            color: '#fff',
            padding: '7px 18px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '700',
          }}
        >
          LOGOUT
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8">
        
        {/* APP HEADER */}
        <div style={{
          background: 'linear-gradient(135deg, #0d0d14 0%, #1a0a0f 100%)',
          border: '1px solid rgba(225,29,72,0.2)',
          borderRadius: '16px',
          padding: '28px 32px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gradient-to-br from-brand-red to-red-900 rounded-2xl flex items-center justify-center shadow-2xl">
              <Smartphone className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-display font-bold text-white mb-2">
                {app?.name || "Android Application"}
              </h1>
              <div className="flex flex-wrap gap-4 text-xs font-mono text-gray-400">
                <span className="flex items-center"><Globe className="w-3 h-3 mr-1" /> {app?.package || "com.android.app"}</span>
                <span className="flex items-center"><Info className="w-3 h-3 mr-1" /> v{app?.version || "1.0"}</span>
              </div>
            </div>
          </div>
          <div className="mt-6 md:mt-0">
             <div className="text-right">
                <div className="text-3xl font-display font-bold text-brand-red">{findings?.length || 0}</div>
                <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Total Findings</div>
             </div>
          </div>
        </div>

        {/* TABS INDICATOR */}
        <div style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          marginBottom: '24px',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingBottom: '0',
          flexWrap: 'nowrap',
        }}>
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'vulnerabilities', label: 'Vulnerabilities', icon: '🔍' },
            { id: 'ai-fixer', label: 'AI Fixer', icon: '🤖' },
            { id: 'secrets', label: 'Secrets', icon: '🔑' },
            { id: 'dynamic', label: 'Dynamic', icon: '⚡' },
            { id: 'mitre', label: 'MITRE & CVE', icon: '🗺️' },
            { id: 'privacy', label: 'Privacy & Malware', icon: '🛡️' },
            { id: 'playstore', label: 'Play Store Check', icon: '🏪' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 18px',
                background: activeTab === tab.id ? 'rgba(225,29,72,0.15)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #E11D48' : '2px solid transparent',
                color: activeTab === tab.id ? '#ffffff' : '#666666',
                fontSize: '12px',
                fontWeight: activeTab === tab.id ? '700' : '500',
                letterSpacing: '0.5px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                borderRadius: '6px 6px 0 0',
                flexShrink: 0,
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.id === 'secrets' && secretsData?.length > 0 && (
                <span style={{
                  background: '#E11D48',
                  color: '#fff',
                  borderRadius: '999px',
                  fontSize: '10px',
                  padding: '1px 6px',
                  fontWeight: '800',
                }}>{secretsData.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* DOWNLOAD BUTTONS */}
        <div className="flex flex-wrap gap-4 mb-8">
           <button onClick={() => downloadReport('pdf')} className="flex items-center bg-brand-secondary/50 border border-brand-border hover:bg-brand-red/10 px-4 py-2 rounded-xl text-[10px] font-bold tracking-widest transition-all text-white">
              <Download className="w-3 h-3 mr-2 text-brand-red" /> DOWNLOAD PDF
           </button>
           <button onClick={() => downloadReport('json')} className="flex items-center bg-brand-secondary/50 border border-brand-border hover:bg-brand-red/10 px-4 py-2 rounded-xl text-[10px] font-bold tracking-widest transition-all text-white">
              <FileJson className="w-3 h-3 mr-2 text-brand-red" /> EXPORT JSON
           </button>
           <button onClick={() => downloadReport('csv')} className="flex items-center bg-brand-secondary/50 border border-brand-border hover:bg-brand-red/10 px-4 py-2 rounded-xl text-[10px] font-bold tracking-widest transition-all text-white">
              <TableProperties className="w-3 h-3 mr-2 text-brand-red" /> EXPORT CSV
           </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Scorecard */}
                <div className="bg-brand-secondary border border-brand-border p-8 rounded-2xl text-center flex flex-col justify-center">
                   <Shield className="w-12 h-12 text-brand-red mx-auto mb-4" />
                   <h3 className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-2">Audit Status</h3>
                   <div className="text-2xl font-bold text-white">COMPLETED</div>
                </div>

                {/* Severity Counts */}
                <div className="md:col-span-2 bg-brand-secondary border border-brand-border p-8 rounded-2xl grid grid-cols-3 gap-6">
                   <div className="text-center">
                      <div className="text-3xl font-display font-bold text-brand-red">{findings?.filter(f => f.severity.toLowerCase() === 'high').length}</div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">High Risk</div>
                   </div>
                   <div className="text-center border-x border-brand-border">
                      <div className="text-3xl font-display font-bold text-yellow-500">{findings?.filter(f => f.severity.toLowerCase() === 'medium').length}</div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Medium Risk</div>
                   </div>
                   <div className="text-center">
                      <div className="text-3xl font-display font-bold text-blue-500">{findings?.filter(f => f.severity.toLowerCase() === 'low').length}</div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Low Risk</div>
                   </div>
                </div>
              </div>

              {/* Risk Score and OWASP */}
              {riskData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Risk Meter */}
                  <div className="bg-brand-secondary border border-brand-border p-8 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
                      <h3 className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-4">Overall Risk Score</h3>
                      <div className={`text-6xl font-display font-bold mb-2 ${
                         riskData.risk_level === 'High' ? 'text-brand-red' : 
                         riskData.risk_level === 'Medium' ? 'text-yellow-500' : 'text-blue-500'
                      }`}>
                         {riskData.total_score}
                      </div>
                      <div className={`px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase border ${
                         riskData.risk_level === 'High' ? 'bg-brand-red/10 text-brand-red border-brand-red/20' : 
                         riskData.risk_level === 'Medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 
                         'bg-blue-500/10 text-blue-500 border-blue-500/20'
                      }`}>
                         {riskData.risk_level} RISK
                      </div>
                      <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-brand-red/5 rounded-full blur-3xl" />
                  </div>

                  {/* OWASP Categories */}
                  <div className="md:col-span-2 bg-brand-secondary border border-brand-border p-6 rounded-2xl flex flex-col">
                     <h3 className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-4 flex items-center">
                       <Shield className="w-4 h-4 mr-2 text-purple-400" /> OWASP Mobile Top 10 Mapping
                     </h3>
                     <div className="flex-1 overflow-auto max-h-48 custom-scrollbar space-y-3 pr-2 font-display">
                       {riskData.owasp_categories && riskData.owasp_categories.length > 0 ? (
                         riskData.owasp_categories.map((cat, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-brand-dark/50 p-3 rounded-xl border border-white/5 hover:border-brand-red/30 transition-all group">
                              <div className="flex flex-col">
                                 <span className="text-sm font-bold text-white group-hover:text-brand-red transition-colors">{cat.category}</span>
                                 <span className="text-[10px] text-gray-500 font-mono mt-1">Impact Weight: {cat.score}</span>
                              </div>
                              <div className="text-xl font-bold font-display text-brand-red/80 flex-shrink-0">
                                 {cat.count} <span className="text-[10px] text-gray-500 uppercase font-sans tracking-widest">issues</span>
                              </div>
                          </div>
                         ))
                       ) : (
                         <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                           <CheckCircle2 className="w-8 h-8 mb-2 opacity-50 text-green-500" />
                           <span className="text-xs font-bold tracking-widest uppercase">No OWASP issues mapped</span>
                         </div>
                       )}
                     </div>
                  </div>
                </div>
              )}

              {/* Component Counts */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: "Activities", count: app?.counts?.activities, icon: Smartphone },
                  { label: "Services", count: app?.counts?.services, icon: Globe },
                  { label: "Receivers", count: app?.counts?.receivers, icon: Lock },
                  { label: "Providers", count: app?.counts?.providers, icon: Info },
                ].map((item, id) => (
                  <div key={id} className="bg-brand-secondary border border-brand-border p-6 rounded-2xl flex items-center space-x-4">
                    <div className="p-3 bg-brand-dark/50 rounded-xl">
                      <item.icon className="w-5 h-5 text-brand-red" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-white">{item.count || 0}</div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Extras */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-brand-secondary border border-brand-border p-5 rounded-xl flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Main Activity</span>
                    <span className="text-[10px] font-mono text-brand-red truncate max-w-[150px]">{app?.main_activity?.split('.').pop() || "N/A"}</span>
                 </div>
                 <div className="bg-brand-secondary border border-brand-border p-5 rounded-xl flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Min SDK</span>
                    <span className="text-[10px] font-mono text-white">{app?.min_sdk || "N/A"}</span>
                 </div>
                 <div className="bg-brand-secondary border border-brand-border p-5 rounded-xl flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Target SDK</span>
                    <span className="text-[10px] font-mono text-white">{app?.target_sdk || "N/A"}</span>
                 </div>
              </div>
            </motion.div>
          )}

          {activeTab === "vulnerabilities" && (
            <motion.div 
              key="vulnerabilities"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold flex items-center">
                  <Shield className="w-6 h-6 text-brand-red mr-3" />
                  Security Findings
                </h2>
              </div>

              {findings && findings.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {findings.map((vuln, idx) => (
                    <div 
                      className={`group bg-brand-secondary hover:bg-brand-secondary/80 border border-brand-border rounded-2xl transition-all cursor-pointer ${expandedVulnerability === idx ? 'ring-1 ring-purple-500/30' : ''}`}
                      onClick={() => setExpandedVulnerability(expandedVulnerability === idx ? null : idx)}
                    >
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getSeverityStyles(vuln.severity)}`}>
                              {vuln.severity}
                            </span>
                            <h3 className="text-lg font-bold text-white mt-3 group-hover:text-brand-red transition-colors">
                              {vuln.title}
                            </h3>
                          </div>
                          <div className="flex items-center">
                            {vuln.file && vuln.file !== "N/A" && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); viewCode(vuln.file); }}
                                className="bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center"
                              >
                                <Code className="w-3 h-3 mr-2" /> VIEW CODE
                              </button>
                            )}
                            <button 
                              onClick={(e) => { e.stopPropagation(); getAIFix(vuln, idx); if (expandedVulnerability !== idx) setExpandedVulnerability(idx); }}
                              disabled={loadingFixId === idx}
                              className="bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center ml-2 disabled:opacity-50"
                            >
                              {loadingFixId === idx ? <RefreshCw className="w-3 h-3 mr-2 animate-spin" /> : <Brain className="w-3 h-3 mr-2" />} 
                              {aiFixes[idx] ? "VIEW AI FIX" : "GENERATE AI FIX"}
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-400 mb-6 leading-relaxed max-w-4xl">
                          {vuln.description}
                        </p>
                        <div className="flex items-center space-x-6 text-[10px] font-mono text-gray-500 py-3 border-t border-brand-border/50">
                          <span className="flex items-center"><FileCode className="w-3 h-3 mr-1 text-brand-red" /> {vuln.file?.split('/').pop() || "N/A"}</span>
                          <span className="flex items-center"><Lock className="w-3 h-3 mr-1 text-brand-red" /> LINE: {vuln.line || "N/A"}</span>
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedVulnerability === idx && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-brand-border bg-brand-dark/20"
                          >
                            <div className="p-8 space-y-8">
                               {/* AI FIX DISPLAY */}
                               {aiFixes[idx] ? (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="space-y-8"
                                >
                                  <div className="flex items-center space-x-3 text-purple-400">
                                    <Sparkles className="w-5 h-5" />
                                    <h4 className="font-display font-bold tracking-widest text-sm uppercase">AI Security Analysis & Remediation</h4>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                      <div>
                                        <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center">
                                          <Info className="w-3 h-3 mr-2" /> Risk Explanation
                                        </h5>
                                        <p className="text-sm text-gray-300 leading-relaxed bg-brand-dark/50 p-4 rounded-xl border border-white/5">{aiFixes[idx].explanation}</p>
                                      </div>
                                      <div>
                                        <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center">
                                          <Shield className="w-3 h-3 mr-2" /> Step-by-Step Fix
                                        </h5>
                                        <p className="text-sm text-gray-300 leading-relaxed bg-brand-dark/50 p-4 rounded-xl border border-white/5 whitespace-pre-wrap">{aiFixes[idx].fix}</p>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center">
                                        <CheckCircle2 className="w-3 h-3 mr-2 text-green-500" /> Recommended Secure Implementation
                                      </h5>
                                      <div className="rounded-xl overflow-hidden border border-white/5 shadow-2xl">
                                        <SyntaxHighlighter
                                          language="java"
                                          style={atomDark}
                                          customStyle={{
                                            margin: 0,
                                            padding: '1.5rem',
                                            fontSize: '11px',
                                            backgroundColor: '#0d0d0d'
                                          }}
                                        >
                                          {aiFixes[idx].secure_code}
                                        </SyntaxHighlighter>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                               ) : (
                                 <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                    <Brain className="w-8 h-8 mb-4 opacity-20" />
                                    <p className="text-xs font-bold tracking-widest">NO AI SUGGESTION GENERATED YET</p>
                                    <button 
                                      onClick={() => getAIFix(vuln, idx)}
                                      className="mt-4 text-purple-400 hover:underline text-[10px] font-bold uppercase tracking-widest"
                                    >
                                      Click to generate fix suggestion
                                    </button>
                                 </div>
                               )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-brand-secondary border border-brand-border p-20 rounded-3xl text-center">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4 opacity-20" />
                  <h3 className="text-xl font-bold text-gray-500">No vulnerabilities found</h3>
                  <p className="text-gray-600 mt-2">The analysis sweep completed with zero findings.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "ai-fixer" && (
            <motion.div 
              key="code"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-4 gap-8"
            >
              <div className="bg-brand-secondary border border-brand-border rounded-2xl p-6 h-[75vh] overflow-auto custom-scrollbar">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center">
                   <AlertCircle className="w-4 h-4 mr-2" /> Target Vulnerabilities
                </h3>
                <div className="space-y-3">
                   {findings.map((vuln, originalIdx) => {
                     if (!vuln.file || vuln.file === "N/A" || vuln.file === "Extracted Strings") return null;
                     return (
                       <div 
                         key={originalIdx}
                         onClick={() => handleAnalyzeVuln(vuln, originalIdx)}
                         className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer group ${selectedVuln?.idx === originalIdx ? 'bg-brand-red/10 border-brand-red/30' : 'bg-brand-dark/50 border-white/5 hover:border-brand-red/30'}`}
                       >
                          <div className="flex items-center space-x-2 mb-2">
                             <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${getSeverityStyles(vuln.severity)}`}>
                               {vuln.severity}
                             </span>
                          </div>
                          <h4 className={`text-sm font-bold mb-2 ${selectedVuln?.idx === originalIdx ? 'text-brand-red' : 'text-white group-hover:text-brand-red'} transition-colors line-clamp-2`}>
                             {vuln.title}
                          </h4>
                          <div className="flex items-center text-[10px] font-mono text-gray-500 truncate">
                             <FileCode className="w-3 h-3 mr-1" /> {vuln.file.split('/').pop()}
                          </div>
                       </div>
                     );
                   })}
                </div>
              </div>

              <div className="md:col-span-3 h-[75vh] overflow-auto custom-scrollbar flex flex-col space-y-6">
                 {!selectedVuln ? (
                   <div className="flex flex-col items-center justify-center h-full text-gray-600 bg-brand-secondary border border-brand-border rounded-2xl">
                      <Brain className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-xs font-bold tracking-widest uppercase">Select a vulnerability to generate an AI fix</p>
                   </div>
                 ) : isFixingCode ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-brand-secondary border border-brand-border rounded-2xl">
                      <Loader2 className="w-10 h-10 animate-spin mb-4 text-purple-500" />
                      <span className="text-xs font-bold tracking-widest uppercase text-purple-400">Fetching code & generating AI fix...</span>
                    </div>
                 ) : fixError ? (
                    <div className="flex flex-col items-center justify-center h-full text-red-400 bg-brand-secondary border border-brand-border rounded-2xl p-8 text-center">
                      <AlertCircle className="w-12 h-12 mb-4" />
                      <p className="text-sm font-bold tracking-widest uppercase mb-2">AI Fix Generation Failed</p>
                      <p className="text-xs">{fixError}</p>
                    </div>
                 ) : (
                   <>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[45vh]">
                       <div className="bg-red-950/30 border border-red-500/30 rounded-2xl p-4 flex flex-col overflow-hidden">
                         <div className="text-red-500 text-xs font-bold tracking-widest mb-4 flex items-center">
                            ⚠ VULNERABLE CODE
                         </div>
                         <div className="flex-1 overflow-auto custom-scrollbar bg-[#0d0d0d]/50 rounded-xl border border-red-500/20">
                           {code ? (
                             <SyntaxHighlighter
                               language="java"
                               style={atomDark}
                               showLineNumbers={true}
                               customStyle={{ margin: 0, padding: '1rem', fontSize: '11px', backgroundColor: 'transparent' }}
                             >
                               {code}
                             </SyntaxHighlighter>
                           ) : (
                             <div className="text-gray-500 flex items-center justify-center h-full text-xs font-bold tracking-widest p-4 text-center">
                               CODE UNAVAILABLE FOR THIS FINDING
                             </div>
                           )}
                         </div>
                       </div>
                       
                       <div className="bg-green-950/30 border border-green-500/30 rounded-2xl p-4 flex flex-col overflow-hidden">
                         <div className="text-green-500 text-xs font-bold tracking-widest mb-4 flex items-center">
                            ✅ AI FIXED VERSION
                         </div>
                         <div className="flex-1 overflow-auto custom-scrollbar bg-[#0d0d0d]/50 rounded-xl border border-green-500/20">
                           {(() => {
                             const aiData = aiFixes[selectedVuln.idx];
                             if (!aiData) return null;
                             
                             const hasProperCode = aiData.secure_code && !aiData.secure_code.includes('Refer') && !aiData.secure_code.includes('Review');
                             
                             if (hasProperCode) {
                               const formattedCode = (aiData.secure_code || '')
                                 .replace(/\\\\n/g, '\n')
                                 .replace(/\\n/g, '\n')
                                 .replace(/\\\\t/g, '\t')
                                 .replace(/\\t/g, '\t')
                                 .split(';').join(';\n')
                                 .split('{').join('{\n')
                                 .split('}').join('\n}')
                                 .replace(/\n\s*\n\s*\n/g, '\n\n')
                                 .trim();
                                 
                               return (
                                 <div className="p-4 text-gray-300 text-sm leading-relaxed">
                                   <div className="mb-2 text-green-400 font-bold text-xs uppercase tracking-widest">Secure Code Example</div>
                                   <SyntaxHighlighter language="java" style={atomDark} customStyle={{fontSize: '11px'}}>
                                     {formattedCode}
                                   </SyntaxHighlighter>
                                 </div>
                               );
                             } else {
                               return (
                                 <div className="p-4 text-green-400 text-sm font-bold tracking-widest text-center mt-10">
                                   See Step-by-Step Fix below ↓
                                 </div>
                               );
                             }
                           })()}
                         </div>
                       </div>
                     </div>

                     <div className="bg-brand-secondary border border-brand-border rounded-2xl p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div>
                              <h4 className="text-purple-400 text-xs font-bold tracking-widest uppercase mb-3 flex items-center">
                                 <Brain className="w-4 h-4 mr-2" /> Risk Explanation
                              </h4>
                              <p className="text-sm text-gray-300 leading-relaxed bg-brand-dark/50 p-5 rounded-xl border border-white/5 shadow-inner">
                                {extractText(aiFixes[selectedVuln.idx]?.explanation)}
                              </p>
                           </div>
                           <div>
                              <h4 className="text-green-400 text-xs font-bold tracking-widest uppercase mb-3 flex items-center">
                                 <CheckCircle2 className="w-4 h-4 mr-2" /> Step-by-Step Fix
                              </h4>
                              <p className="text-sm text-gray-300 leading-relaxed bg-brand-dark/50 p-5 rounded-xl border border-white/5 shadow-inner whitespace-pre-wrap">
                                {extractText(aiFixes[selectedVuln.idx]?.fix)}
                              </p>
                           </div>
                        </div>
                     </div>
                   </>
                 )}
              </div>
            </motion.div>
          )}

          {activeTab === "secrets" && (
            <motion.div 
              key="secrets"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                <div>
                   <h2 className="text-2xl font-bold flex items-center">
                     <Lock className="w-6 h-6 text-brand-red mr-3" />
                     Sensitive Data Leakage
                   </h2>
                   <p className="text-gray-500 text-xs mt-1 font-mono">Found {secretsData?.length || 0} potential security credentials in decompiled assets</p>
                </div>
                <div className="flex space-x-2">
                   <div className="bg-brand-red/10 text-brand-red px-3 py-1 rounded-lg text-[10px] font-bold border border-brand-red/20 uppercase tracking-widest">
                      CRITICAL: {secretsData?.filter(s => s.risk_level === 'Critical').length || 0}
                   </div>
                   <div className="bg-orange-500/10 text-orange-500 px-3 py-1 rounded-lg text-[10px] font-bold border border-orange-500/20 uppercase tracking-widest">
                      HIGH: {secretsData?.filter(s => s.risk_level === 'High').length || 0}
                   </div>
                </div>
              </div>

              {secretsData && secretsData.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {secretsData.map((secret, idx) => (
                    <SecretCard key={idx} secret={secret} viewCode={viewCode} />
                  ))}
                </div>
              ) : (
                <div className="bg-brand-secondary border border-brand-border p-20 rounded-3xl text-center">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4 opacity-20" />
                  <h3 className="text-xl font-bold text-gray-500">No Secrets Identified</h3>
                  <p className="text-gray-600 mt-2">Analysis did not detect hardcoded API keys or credentials.</p>
                </div>
              )}
            </motion.div>
          )}
               {activeTab === 'dynamic' && (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

    {/* ===== NOT STARTED STATE ===== */}
    {dynamicStatus === 'not_started' && (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '72px', marginBottom: '24px' }}>📱</div>
        <h3 style={{ color: '#fff', fontSize: '22px', fontWeight: '800', marginBottom: '12px' }}>
          Start Dynamic Analysis
        </h3>
        <p style={{ color: '#555', fontSize: '14px', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
          Runtime behavior monitoring using Android emulator. Make sure GenyMotion is running before starting.
        </p>
        <button
          onClick={async () => {
            setDynamicStatus('running');
            startLiveStream();
            try {
              const token = localStorage.getItem('mobaudit_token');
              await fetch(`http://${window.location.hostname}:5001/api/analyze/dynamic/${hash}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              // Start polling every 5 seconds
              let pollCount = 0;
              const poll = setInterval(async () => {
                pollCount++;
                console.log('[POLL] Checking status... attempt', pollCount);
                try {
                  const token = localStorage.getItem('mobaudit_token');
                  const r = await fetch(
                    `http://${window.location.hostname}:5001/api/analyze/dynamic/${hash}/status`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                  );
                  const data = await r.json();
                  console.log('[POLL] Status:', data.status);

                  if (data.status === 'completed' || data.status === 'error') {
                    clearInterval(poll);
                    stopLiveStream();

                    // Fetch updated report
                    const reportRes = await fetch(
                      `http://${window.location.hostname}:5001/api/report/${hash}`,
                      { headers: { 'Authorization': `Bearer ${token}` } }
                    );
                    const reportData = await reportRes.json();
                    setReport(reportData);
                    setDynamicStatus('completed');
                  }

                  // Stop polling after 3 minutes max
                  if (pollCount > 36) {
                    clearInterval(poll);
                    setDynamicStatus('completed');
                    stopLiveStream();
                  }
                } catch(err) {
                  console.error('[POLL] Error:', err);
                  // If connection reset, wait and retry - server may be restarting
                  await new Promise(resolve => setTimeout(resolve, 3000));
                }
              }, 5000);
            } catch(err) {
              console.error(err);
              setDynamicStatus('not_started');
              stopLiveStream();
            }
          }}
          style={{
            background: 'linear-gradient(135deg, #E11D48, #ff4d6d)',
            border: 'none', color: '#fff',
            padding: '16px 48px', borderRadius: '12px',
            cursor: 'pointer', fontSize: '15px', fontWeight: '800',
            letterSpacing: '1px',
            boxShadow: '0 8px 30px rgba(225,29,72,0.4)',
          }}
        >
          ▶ START DYNAMIC ANALYSIS
        </button>
        <p style={{ color: '#333', fontSize: '12px', marginTop: '16px' }}>
          Analysis takes approximately 40-60 seconds
        </p>
      </div>
    )}

    {/* ===== RUNNING STATE - Live Screen + Steps ===== */}
    {dynamicStatus === 'running' && (
      <div>
        {/* Running header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          marginBottom: '24px', padding: '14px 20px',
          background: 'rgba(225,29,72,0.08)',
          border: '1px solid rgba(225,29,72,0.25)',
          borderRadius: '12px',
        }}>
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: '#E11D48',
            boxShadow: '0 0 10px #E11D48',
          }} />
          <span style={{ color: '#E11D48', fontWeight: '700', fontSize: '14px' }}>
            DYNAMIC ANALYSIS IN PROGRESS
          </span>
          <span style={{ color: '#555', fontSize: '12px', marginLeft: 'auto' }}>
            ~40 seconds remaining
          </span>
        </div>

        {/* Live screen + steps grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px' }}>

          {/* Phone mockup */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p style={{ color: '#E11D48', fontSize: '10px', letterSpacing: '2px', marginBottom: '14px', fontWeight: '700' }}>
              ● LIVE DEVICE
            </p>
            <div style={{
              background: '#111', border: '3px solid #2a2a2a',
              borderRadius: '32px', padding: '14px 10px',
              boxShadow: '0 0 40px rgba(225,29,72,0.2)',
              width: '220px',
            }}>
              <div style={{ width: '50px', height: '5px', background: '#2a2a2a', borderRadius: '3px', margin: '0 auto 10px' }} />
              <div style={{
                background: '#000', borderRadius: '14px',
                overflow: 'hidden', aspectRatio: '9/16',
                border: '1px solid #1a1a1a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {screenFrame ? (
                  <img src={`data:image/png;base64,${screenFrame}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Live" />
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <div style={{ fontSize: '28px' }}>📱</div>
                    <p style={{ color: '#333', fontSize: '10px', marginTop: '8px' }}>Connecting...</p>
                  </div>
                )}
              </div>
              <div style={{ width: '36px', height: '36px', border: '2px solid #2a2a2a', borderRadius: '50%', margin: '10px auto 0' }} />
            </div>
            {wsConnected && (
              <p style={{ color: '#10B981', fontSize: '10px', marginTop: '10px' }}>● LIVE • ~1.2 fps</p>
            )}
          </div>

          {/* Steps + Logs */}
          <div>
            <p style={{ color: '#666', fontSize: '10px', letterSpacing: '2px', marginBottom: '12px' }}>
              ANALYSIS PIPELINE
            </p>
            {[
              { label: 'APK Installed on Device', done: true },
              { label: 'Runtime Environment Ready', done: true },
              { label: 'Network Monitoring Active', done: wsConnected },
              { label: 'SQLite & Storage Scanning', done: wsConnected },
              { label: 'Collecting Runtime Data (40s)', done: false, active: true },
              { label: 'Generating Final Report', done: false },
            ].map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', marginBottom: '6px',
                background: s.active ? 'rgba(225,29,72,0.08)' : s.done ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${s.active ? 'rgba(225,29,72,0.2)' : s.done ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)'}`,
                borderRadius: '8px',
              }}>
                <span style={{ fontSize: '14px' }}>
                  {s.done ? '✅' : s.active ? '⚙️' : '⏳'}
                </span>
                <span style={{
                  color: s.done ? '#10B981' : s.active ? '#E11D48' : '#444',
                  fontSize: '12px', fontWeight: s.active ? '700' : '400'
                }}>
                  {s.label}
                </span>
              </div>
            ))}

            {/* Live logs */}
            <div style={{
              marginTop: '14px', background: '#050508',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '10px', padding: '12px',
              height: '170px', overflowY: 'auto',
              fontFamily: 'monospace', fontSize: '10px',
            }}>
              <p style={{ color: '#333', fontSize: '10px', marginBottom: '6px', letterSpacing: '1px' }}>
                DEVICE LOGS
              </p>
              {logLines.length === 0 ? (
                <p style={{ color: '#2a2a2a' }}>Waiting for device logs...</p>
              ) : logLines.map((line, i) => (
                <div key={i} style={{
                  color: line.includes('E/') ? '#E11D48' : line.includes('W/') ? '#F59E0B' : '#2a2a3a',
                  padding: '1px 0', lineHeight: '1.5',
                }}>{line}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ===== COMPLETED STATE - Results ===== */}
    {dynamicStatus === 'completed' && (
      <div>
        {/* Completed badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          marginBottom: '24px', padding: '12px 20px',
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: '12px',
        }}>
          <span style={{ fontSize: '18px' }}>✅</span>
          <span style={{ color: '#10B981', fontWeight: '700', fontSize: '14px' }}>
            Dynamic Analysis Complete
          </span>
          <button
            onClick={async () => {
              try {
                const token = localStorage.getItem('mobaudit_token');
                // Reset in MongoDB
                await fetch(`http://${window.location.hostname}:5001/api/analyze/dynamic/${hash}/reset`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${token}` }
                });
              } catch(e) {}
              setDynamicStatus('not_started');
              setReport(prev => ({ ...prev, dynamic: null }));
            }}
            style={{
              marginLeft: 'auto', background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#666', padding: '4px 14px',
              borderRadius: '6px', cursor: 'pointer', fontSize: '11px',
            }}
          >
            🔄 Re-run Analysis
          </button>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { icon: '🌐', label: 'Domains', value: report?.dynamic?.domains?.length || 0, color: '#3B82F6' },
            { icon: '🗄️', label: 'SQLite DBs', value: report?.dynamic?.sqlite_databases?.length || 0, color: '#F59E0B' },
            { icon: '📡', label: 'URLs Found', value: report?.dynamic?.urls?.length || 0, color: '#10B981' },
            { icon: '🔍', label: 'Trackers', value: typeof report?.dynamic?.trackers === 'object' ? (report?.dynamic?.trackers?.detected_trackers || 0) : (report?.dynamic?.trackers || 0), color: '#E11D48' },
          ].map((stat, i) => (
            <div key={i} style={{
              background: '#0d0d14', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px', padding: '20px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>{stat.icon}</div>
              <div style={{ color: stat.color, fontSize: '28px', fontWeight: '800' }}>{stat.value}</div>
              <div style={{ color: '#444', fontSize: '11px', marginTop: '6px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Network Domains */}
        {report?.dynamic?.domains?.length > 0 && (
          <div style={{ marginBottom: '16px', background: '#0d0d14', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: '700', marginBottom: '14px' }}>
              🌐 NETWORK DOMAINS CONTACTED
            </h3>
            {report.dynamic.domains.map((domain, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', marginBottom: '5px',
                background: 'rgba(255,255,255,0.02)', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.04)',
              }}>
                <span style={{ color: '#ccc', fontSize: '13px', fontFamily: 'monospace' }}>{domain}</span>
                <span style={{ color: '#10B981', fontSize: '10px', background: 'rgba(16,185,129,0.1)', padding: '3px 10px', borderRadius: '999px' }}>
                  CONTACTED
                </span>
              </div>
            ))}
          </div>
        )}

        {/* SQLite */}
        {report?.dynamic?.sqlite_databases?.length > 0 && (
          <div style={{ marginBottom: '16px', background: '#0d0d14', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: '700', marginBottom: '14px' }}>
              🗄️ SQLITE DATABASES ACCESSED
            </h3>
            {report.dynamic.sqlite_databases.map((db, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', marginBottom: '5px',
                background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)',
                borderRadius: '8px',
              }}>
                <div>
                  <div style={{ color: '#ccc', fontSize: '13px', fontFamily: 'monospace', fontWeight: '600' }}>
                    {typeof db === 'string' ? db : db.file ? db.file.split('/').pop() : JSON.stringify(db)}
                  </div>
                  {typeof db !== 'string' && db.file && (
                    <div style={{ color: '#555', fontSize: '10px', marginTop: '2px', fontFamily: 'monospace' }}>{db.file}</div>
                  )}
                </div>
                <span style={{ color: '#F59E0B', fontSize: '10px', background: 'rgba(245,158,11,0.1)', padding: '3px 10px', borderRadius: '999px' }}>
                  ACCESSED
                </span>
              </div>
            ))}
          </div>
        )}

        {/* URLs */}
        {report?.dynamic?.urls?.length > 0 && (
          <div style={{ marginBottom: '16px', background: '#0d0d14', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: '700', marginBottom: '14px' }}>
              📡 URLS INTERCEPTED
            </h3>
            {report.dynamic.urls.slice(0, 20).map((url, i) => (
              <div key={i} style={{
                padding: '8px 14px', marginBottom: '5px',
                background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)',
                borderRadius: '8px', fontFamily: 'monospace', fontSize: '11px',
                color: '#10B981', wordBreak: 'break-all',
              }}>
                {typeof url === 'string' ? url : url.url || JSON.stringify(url)}
              </div>
            ))}
          </div>
        )}

        {/* Trackers */}
        <div style={{ background: '#0d0d14', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>
            🔍 TRACKER DETECTION
          </h3>
          {(() => {
            const t = report?.dynamic?.trackers;
            const count = typeof t === 'object' ? (t?.detected_trackers || 0) : (t || 0);
            return count === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', background: 'rgba(16,185,129,0.06)', borderRadius: '8px' }}>
                <span style={{ fontSize: '18px' }}>✅</span>
                <span style={{ color: '#10B981', fontSize: '13px' }}>No trackers detected during runtime analysis</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', background: 'rgba(225,29,72,0.06)', borderRadius: '8px' }}>
                <span style={{ fontSize: '18px' }}>🚨</span>
                <span style={{ color: '#E11D48', fontSize: '13px' }}>{count} tracker(s) detected</span>
              </div>
            );
          })()}
        </div>

        {/* Empty state */}
        {!report?.dynamic?.domains?.length && !report?.dynamic?.sqlite_databases?.length && !report?.dynamic?.urls?.length && (
          <div style={{ textAlign: 'center', padding: '30px', color: '#333', marginTop: '16px' }}>
            <p style={{ fontSize: '13px' }}>Limited runtime data captured. Try interacting with the app in GenyMotion during analysis.</p>
          </div>
        )}
      </div>
    )}

  </motion.div>
)}

          {activeTab === "mitre" && (
            <motion.div 
              key="mitre"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center bg-brand-secondary/50 p-6 rounded-2xl border border-brand-border">
                <h2 className="text-xl font-display font-bold text-white flex items-center">
                  <Shield className="w-6 h-6 mr-3 text-brand-red" />
                  MITRE ATT&CK & CVE Mappings
                </h2>
                <div className="text-sm font-bold tracking-widest uppercase text-gray-500">
                  <span className="text-white bg-brand-red/20 px-3 py-1 rounded-full mr-2">{mitreData?.length || 0}</span>
                  Mappings Found
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                {mitreData && mitreData.length > 0 ? (
                  mitreData.map((mapping, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={idx} 
                      className="bg-brand-secondary border border-brand-border rounded-2xl p-6 flex flex-col hover:border-white/20 transition-all"
                    >
                      <div className="flex justify-between items-start mb-6 border-b border-brand-border pb-4">
                        <h3 className="text-lg font-bold text-white max-w-[70%] leading-tight">{mapping.vulnerability}</h3>
                        <span className={`px-3 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase ${getSeverityStyles(mapping.severity)}`}>
                          {mapping.severity}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-blue-950/30 border border-blue-500/30 p-5 rounded-xl flex flex-col justify-between relative overflow-hidden">
                          <h4 className="text-blue-400 text-[10px] font-bold tracking-widest uppercase mb-3 z-10">MITRE ATT&CK</h4>
                          <div className="text-4xl font-display font-bold text-blue-500/80 mb-2 z-10">{mapping.mitre_id}</div>
                          <div className="text-white font-bold mb-2 z-10">{mapping.mitre_name}</div>
                          <div className="inline-block self-start bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-1 rounded tracking-widest uppercase z-10">
                            {mapping.mitre_tactic}
                          </div>
                          <Shield className="absolute -bottom-6 -right-6 w-32 h-32 text-blue-500/10 z-0" />
                        </div>
                        
                        <div className="bg-orange-950/30 border border-orange-500/30 p-5 rounded-xl flex flex-col justify-between relative overflow-hidden">
                          <h4 className="text-orange-400 text-[10px] font-bold tracking-widest uppercase mb-3 z-10">CVE REFERENCE</h4>
                          <div className="text-3xl font-display font-bold text-orange-500/80 mb-2 z-10">{mapping.cve_id}</div>
                          <p className="text-sm text-gray-300 leading-relaxed z-10">{mapping.cve_description}</p>
                          <AlertCircle className="absolute -bottom-6 -right-6 w-32 h-32 text-orange-500/10 z-0" />
                        </div>
                      </div>
                      
                      <div className="bg-brand-dark/50 rounded-xl p-4 border border-white/5 flex items-center">
                        <div className="mr-4">
                          <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500 block mb-1">CVSS SCORE</span>
                          <span className={`text-2xl font-bold font-display ${mapping.cvss_score >= 7 ? 'text-red-500' : mapping.cvss_score >= 4 ? 'text-yellow-500' : 'text-green-500'}`}>
                            {mapping.cvss_score}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="h-3 w-full bg-black/50 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${mapping.cvss_score >= 7 ? 'bg-red-500' : mapping.cvss_score >= 4 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                              style={{ width: `${(mapping.cvss_score / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="ml-4 w-20 text-right">
                          <span className={`text-[10px] font-bold tracking-widest uppercase ${mapping.cvss_score >= 7 ? 'text-red-500' : mapping.cvss_score >= 4 ? 'text-yellow-500' : 'text-green-500'}`}>
                            {mapping.cvss_score >= 9 ? 'CRITICAL' : mapping.cvss_score >= 7 ? 'HIGH' : mapping.cvss_score >= 4 ? 'MEDIUM' : 'LOW'}
                          </span>
                        </div>
                      </div>
                      {mapping.remediation && (
                        <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                          <div className="text-xs font-bold tracking-widest uppercase text-green-400 mb-2 flex items-center gap-2">
                            <span>✅</span> REMEDIATION
                          </div>
                          <p className="text-gray-300 text-sm leading-relaxed">{mapping.remediation}</p>
                        </div>
                      )}
                    </motion.div>
                  ))
                ) : (
                  <div className="bg-brand-secondary border border-brand-border p-12 rounded-2xl flex flex-col items-center justify-center text-gray-500">
                    <Shield className="w-16 h-16 mb-4 opacity-20" />
                    <h3 className="text-lg font-bold text-white mb-2">No Mappings Found</h3>
                    <p className="text-sm">We couldn't map any of the findings to specific MITRE ATT&CK tactics or CVEs.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "privacy" && (
            <motion.div 
              key="privacy"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 animate-in fade-in duration-300"
            >
              {/* VIRUSTOTAL SECTION */}
              <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="bg-brand-secondary rounded-xl p-6 border border-white/10 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🦠</span>
                  <div>
                    <h3 className="text-white font-bold text-lg">VIRUSTOTAL THREAT INTELLIGENCE</h3>
                    <p className="text-gray-400 text-sm">Real-time antivirus engine reputation check</p>
                  </div>
                </div>

                {!vtData ? (
                  <p className="text-gray-400">Loading VirusTotal data...</p>
                ) : vtData.error ? (
                  <p className="text-yellow-400">⚠️ {vtData.error}</p>
                ) : vtData.message ? (
                  <p className="text-blue-400">⏳ {vtData.message}</p>
                ) : (
                  <>
                    {/* Score Banner */}
                    <div className={`rounded-lg p-4 mb-4 flex items-center justify-between ${
                      vtData.malicious > 0 ? 'bg-red-900/40 border border-red-500/50' : 'bg-green-900/40 border border-green-500/50'
                    }`}>
                      <div>
                        <p className={`text-3xl font-bold ${vtData.malicious > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {vtData.malicious}/{vtData.total}
                        </p>
                        <p className="text-gray-300 text-sm">engines flagged this file</p>
                      </div>
                      <div className={`text-4xl`}>
                        {vtData.malicious === 0 ? '✅' : vtData.malicious < 5 ? '⚠️' : '🚨'}
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-red-900/20 rounded-lg p-3 text-center">
                        <p className="text-red-400 text-xl font-bold">{vtData.malicious}</p>
                        <p className="text-gray-400 text-xs">Malicious</p>
                      </div>
                      <div className="bg-yellow-900/20 rounded-lg p-3 text-center">
                        <p className="text-yellow-400 text-xl font-bold">{vtData.suspicious}</p>
                        <p className="text-gray-400 text-xs">Suspicious</p>
                      </div>
                      <div className="bg-green-900/20 rounded-lg p-3 text-center">
                        <p className="text-green-400 text-xl font-bold">{vtData.undetected}</p>
                        <p className="text-gray-400 text-xs">Clean</p>
                      </div>
                    </div>

                    {/* SHA256 */}
                    <div className="bg-black/30 rounded p-3 mb-4">
                      <p className="text-gray-400 text-xs mb-1">SHA256 Hash</p>
                      <p className="text-gray-300 text-xs font-mono break-all">{vtData.sha256}</p>
                    </div>

                    {/* Threat Label */}
                    {vtData.threat_label && (
                      <div className="bg-red-900/30 border border-red-500/30 rounded p-3 mb-4">
                        <p className="text-red-400 text-sm font-bold">⚠️ Threat: {vtData.threat_label}</p>
                      </div>
                    )}

                    {/* Flagged Engines */}
                    {vtData.flagged_engines && vtData.flagged_engines.length > 0 && (
                      <div>
                        <p className="text-white font-bold text-sm mb-2">Flagged By:</p>
                        {vtData.flagged_engines.map((e, i) => (
                          <div key={i} className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-gray-300 text-sm">{e.engine}</span>
                            <span className="text-red-400 text-xs bg-red-900/30 px-2 py-1 rounded">{e.result}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {vtData.malicious === 0 && (
                      <p className="text-green-400 text-sm mt-2">✅ No antivirus engines flagged this file as malicious</p>
                    )}
                  </>
                )}
              </motion.div>

              {/* SECTION 1 — Privacy Risks */}
              <div className="bg-brand-secondary border border-brand-border p-8 rounded-2xl">
                <div className="flex items-center space-x-3 mb-2 text-orange-500">
                  <AlertCircle className="w-6 h-6" />
                  <h3 className="text-xl font-bold tracking-widest uppercase">PRIVACY RISK ANALYSIS</h3>
                </div>
                <p className="text-gray-400 text-xs mb-6">Permissions that may compromise user privacy</p>
                
                {customAnalysis?.privacy_risks && customAnalysis.privacy_risks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customAnalysis.privacy_risks.map((risk, idx) => (
                      <div key={idx} className="bg-brand-dark/50 border border-orange-500/20 hover:border-orange-500/40 p-5 rounded-xl flex items-center space-x-4 transition-all">
                        <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500">
                          <AlertCircle className="w-6 h-6" />
                        </div>
                        <span className="text-base font-bold text-gray-200">{risk}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 bg-green-500/10 border border-green-500/20 p-5 rounded-xl text-green-400">
                    <CheckCircle2 className="w-6 h-6 animate-pulse" />
                    <span className="text-sm font-bold tracking-widest uppercase">No privacy risks detected</span>
                  </div>
                )}
              </div>

              {/* SECTION 2 — Dangerous Permissions */}
              <div className="bg-brand-secondary border border-brand-border p-8 rounded-2xl">
                <div className="flex items-center space-x-3 mb-2 text-brand-red">
                  <Shield className="w-6 h-6" />
                  <h3 className="text-xl font-bold tracking-widest uppercase">DANGEROUS PERMISSIONS</h3>
                </div>
                <div className="mb-6 flex justify-between items-center">
                  <p className="text-gray-400 text-xs">Sensitive platform permissions requested by the application</p>
                  {customAnalysis?.dangerous_permissions && customAnalysis.dangerous_permissions.length > 0 && (
                    <span className="bg-brand-red/20 text-brand-red border border-brand-red/30 px-3 py-1 rounded-full text-xs font-bold font-mono">
                      {customAnalysis.dangerous_permissions.length} dangerous permissions found
                    </span>
                  )}
                </div>

                {customAnalysis?.dangerous_permissions && customAnalysis.dangerous_permissions.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {customAnalysis.dangerous_permissions.map((perm, idx) => (
                      <span key={idx} className="bg-brand-red/10 hover:bg-brand-red/20 text-brand-red border border-brand-red/20 hover:border-brand-red/30 px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wide transition-all">
                        {perm}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 bg-green-500/10 border border-green-500/20 p-5 rounded-xl text-green-400">
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="text-sm font-bold tracking-widest uppercase">No dangerous permissions</span>
                  </div>
                )}
              </div>

              {/* SECTION 3 — Malware Indicators */}
              <div className="bg-brand-secondary border border-brand-border p-8 rounded-2xl">
                <div className="flex items-center space-x-3 mb-2 text-red-700">
                  <AlertCircle className="w-6 h-6" />
                  <h3 className="text-xl font-bold tracking-widest uppercase text-white">MALWARE INDICATORS</h3>
                </div>
                <p className="text-gray-400 text-xs mb-6">Heuristic markers associated with potential malware or framework hooking behavior</p>

                {customAnalysis?.malware_indicators && customAnalysis.malware_indicators.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {customAnalysis.malware_indicators.map((indicator, idx) => {
                      const sev = indicator.severity?.toLowerCase();
                      const sevBadge = sev === 'critical' 
                        ? 'bg-brand-red/10 text-brand-red border-brand-red/20' 
                        : sev === 'high' 
                          ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' 
                          : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
                      return (
                        <div key={idx} className="bg-brand-dark/50 border border-white/5 hover:border-brand-red/20 p-5 rounded-xl flex justify-between items-center transition-all group">
                          <span className="text-base font-bold text-gray-200 group-hover:text-brand-red transition-colors">{indicator.indicator}</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-widest border uppercase ${sevBadge}`}>
                            {indicator.severity}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 bg-green-500/10 border border-green-500/20 p-5 rounded-xl text-green-400">
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="text-sm font-bold tracking-widest uppercase">No malware indicators detected</span>
                  </div>
                )}
              </div>

              {/* SECTION 4 — Manifest Security Issues */}
              <div className="bg-brand-secondary border border-brand-border p-8 rounded-2xl">
                <div className="flex items-center space-x-3 mb-2 text-yellow-500">
                  <FileCode className="w-6 h-6" />
                  <h3 className="text-xl font-bold tracking-widest uppercase text-white">MANIFEST SECURITY ISSUES</h3>
                </div>
                <p className="text-gray-400 text-xs mb-6">Security weaknesses and misconfigurations found in the decoded Android manifest</p>

                {customAnalysis?.manifest_issues && customAnalysis.manifest_issues.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customAnalysis.manifest_issues.map((issue, idx) => {
                      const sev = issue.severity?.toLowerCase();
                      const sevBadge = sev === 'high' 
                        ? 'bg-brand-red/10 text-brand-red border-brand-red/20' 
                        : sev === 'medium' 
                          ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' 
                          : 'bg-blue-500/10 text-blue-500 border-blue-500/20';
                      return (
                        <div key={idx} className="bg-brand-dark/50 border border-white/5 hover:border-brand-border p-6 rounded-xl flex flex-col justify-between transition-all">
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-lg font-bold text-white">{issue.issue}</span>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest border uppercase ${sevBadge}`}>
                              {issue.severity}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400">{issue.detail}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 bg-green-500/10 border border-green-500/20 p-5 rounded-xl text-green-400">
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="text-sm font-bold tracking-widest uppercase">No manifest security issues</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'playstore' && (
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}}>
              
              {!playstoreData ? (
                <div style={{textAlign: 'center', padding: '60px'}}>
                  <div style={{fontSize: '48px', marginBottom: '16px'}}>🏪</div>
                  <p style={{color: '#666'}}>Loading Play Store compliance check...</p>
                </div>
              ) : (
                <>
                  {playstoreData?.metadata && (
                    <div style={{
                      background: 'rgba(59,130,246,0.05)',
                      border: '1px solid rgba(59,130,246,0.15)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span style={{fontSize: '16px'}}>📋</span>
                      <div style={{flex: 1}}>
                        <p style={{color: '#ccc', fontSize: '11px', margin: 0, lineHeight: '1.5'}}>
                          <strong style={{color: '#3B82F6'}}>{playstoreData.metadata.policy_version}</strong>
                          {' • '}
                          {playstoreData.metadata.checks_performed} automated checks performed
                        </p>
                        <p style={{color: '#666', fontSize: '10px', margin: 0, marginTop: '2px'}}>
                          {playstoreData.metadata.disclaimer}
                        </p>
                      </div>
                      <a 
                        href={playstoreData.metadata.documentation_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#3B82F6',
                          fontSize: '10px',
                          textDecoration: 'none',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Policy Reference ↗
                      </a>
                    </div>
                  )}

                  {/* Verdict Banner */}
                  <div style={{
                    background: playstoreData.verdict === 'READY' ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))' :
                                playstoreData.verdict === 'NEEDS_REVIEW' ? 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))' :
                                'linear-gradient(135deg, rgba(225,29,72,0.15), rgba(225,29,72,0.05))',
                    border: `1px solid ${
                      playstoreData.verdict === 'READY' ? '#10B981' :
                      playstoreData.verdict === 'NEEDS_REVIEW' ? '#F59E0B' : '#E11D48'
                    }`,
                    borderRadius: '16px',
                    padding: '32px',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '24px'
                  }}>
                    <div style={{fontSize: '64px'}}>
                      {playstoreData.verdict === 'READY' ? '✅' :
                       playstoreData.verdict === 'NEEDS_REVIEW' ? '⚠️' :
                       playstoreData.verdict === 'NOT_READY' ? '🚧' : '🚫'}
                    </div>
                    <div style={{flex: 1}}>
                      <h2 style={{
                        color: playstoreData.verdict === 'READY' ? '#10B981' :
                               playstoreData.verdict === 'NEEDS_REVIEW' ? '#F59E0B' : '#E11D48',
                        fontSize: '28px',
                        fontWeight: '800',
                        margin: 0,
                        marginBottom: '8px'
                      }}>
                        {playstoreData.verdict === 'READY' ? 'READY TO PUBLISH' :
                         playstoreData.verdict === 'NEEDS_REVIEW' ? 'NEEDS REVIEW' :
                         playstoreData.verdict === 'NOT_READY' ? 'NOT READY' : 'WILL BE REJECTED'}
                      </h2>
                      <p style={{color: '#ccc', fontSize: '14px', margin: 0}}>
                        {playstoreData.verdict_message}
                      </p>
                    </div>
                    <div style={{textAlign: 'center'}}>
                      <div style={{
                        color: playstoreData.compliance_percentage >= 80 ? '#10B981' :
                               playstoreData.compliance_percentage >= 60 ? '#F59E0B' : '#E11D48',
                        fontSize: '48px',
                        fontWeight: '900',
                        lineHeight: 1
                      }}>
                        {playstoreData.compliance_percentage}%
                      </div>
                      <p style={{color: '#666', fontSize: '11px', letterSpacing: '2px', marginTop: '6px', margin: 0}}>COMPLIANCE</p>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '24px'}}>
                    {[
                      {label: 'Passed Checks', value: playstoreData.passed?.length || 0, color: '#10B981', icon: '✅'},
                      {label: 'Critical Issues', value: playstoreData.critical?.length || 0, color: '#E11D48', icon: '🚨'},
                      {label: 'Warnings', value: playstoreData.warnings?.length || 0, color: '#F59E0B', icon: '⚠️'},
                    ].map((s, i) => (
                      <div key={i} style={{
                        background: '#0d0d14',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '12px',
                        padding: '20px',
                        textAlign: 'center'
                      }}>
                        <div style={{fontSize: '24px', marginBottom: '8px'}}>{s.icon}</div>
                        <div style={{color: s.color, fontSize: '32px', fontWeight: '800'}}>{s.value}</div>
                        <div style={{color: '#666', fontSize: '11px', marginTop: '4px', letterSpacing: '1px'}}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Critical Issues */}
                  {playstoreData.critical?.length > 0 && (
                    <div style={{marginBottom: '24px'}}>
                      <h3 style={{
                        color: '#E11D48', 
                        fontSize: '14px', 
                        fontWeight: '800', 
                        letterSpacing: '2px', 
                        marginBottom: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span>🚨</span> CRITICAL ISSUES (MUST FIX BEFORE PUBLISH)
                      </h3>
                      {playstoreData.critical.map((c, i) => (
                        <motion.div 
                          key={i}
                          initial={{opacity:0, x:-10}}
                          animate={{opacity:1, x:0}}
                          transition={{delay: i * 0.05}}
                          style={{
                            background: 'rgba(225,29,72,0.06)',
                            border: '1px solid rgba(225,29,72,0.25)',
                            borderRadius: '12px',
                            padding: '20px',
                            marginBottom: '10px'
                          }}
                        >
                          <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
                            <span style={{fontSize: '18px'}}>❌</span>
                            <h4 style={{color: '#fff', fontSize: '15px', fontWeight: '700', margin: 0}}>{c.title}</h4>
                          </div>
                          <p style={{color: '#ccc', fontSize: '13px', marginBottom: '12px', lineHeight: '1.6'}}>
                            {c.message}
                          </p>
                          {c.fix && (
                            <div style={{
                              background: 'rgba(16,185,129,0.08)',
                              border: '1px solid rgba(16,185,129,0.2)',
                              borderRadius: '8px',
                              padding: '12px'
                            }}>
                              <p style={{
                                color: '#10B981', 
                                fontSize: '10px', 
                                fontWeight: '700', 
                                letterSpacing: '2px', 
                                marginBottom: '6px',
                                margin: '0 0 6px 0'
                              }}>
                                ✅ HOW TO FIX
                              </p>
                              <p style={{color: '#ccc', fontSize: '13px', margin: 0, lineHeight: '1.5'}}>{c.fix}</p>
                            </div>
                          )}
                          {(c.link || c.source) && (
                            <a 
                              href={c.link || c.source} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{
                                color: '#3B82F6',
                                fontSize: '11px',
                                textDecoration: 'none',
                                marginTop: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              📖 Read official documentation →
                            </a>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Warnings */}
                  {playstoreData.warnings?.length > 0 && (
                    <div style={{marginBottom: '24px'}}>
                      <h3 style={{
                        color: '#F59E0B', 
                        fontSize: '14px', 
                        fontWeight: '800', 
                        letterSpacing: '2px', 
                        marginBottom: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span>⚠️</span> WARNINGS (RECOMMENDED FIXES)
                      </h3>
                      {playstoreData.warnings.map((w, i) => (
                        <div key={i} style={{
                          background: 'rgba(245,158,11,0.05)',
                          border: '1px solid rgba(245,158,11,0.2)',
                          borderRadius: '12px',
                          padding: '16px',
                          marginBottom: '8px'
                        }}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px'}}>
                            <span>⚠️</span>
                            <h4 style={{color: '#fff', fontSize: '14px', fontWeight: '700', margin: 0}}>{w.title}</h4>
                          </div>
                          <p style={{color: '#aaa', fontSize: '12px', marginBottom: '8px', lineHeight: '1.6'}}>{w.message}</p>
                          {w.fix && (
                            <p style={{color: '#F59E0B', fontSize: '11px', margin: 0, lineHeight: '1.5'}}>
                              💡 {w.fix}
                            </p>
                          )}
                          {(w.link || w.source) && (
                            <a 
                              href={w.link || w.source} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{
                                color: '#3B82F6',
                                fontSize: '11px',
                                textDecoration: 'none',
                                marginTop: '10px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              📖 Read official documentation →
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Passed Checks */}
                  {playstoreData.passed?.length > 0 && (
                    <div>
                      <h3 style={{
                        color: '#10B981', 
                        fontSize: '14px', 
                        fontWeight: '800', 
                        letterSpacing: '2px', 
                        marginBottom: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span>✅</span> PASSED CHECKS ({playstoreData.passed.length})
                      </h3>
                      <div style={{display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px'}}>
                        {playstoreData.passed.map((p, i) => (
                          <div key={i} style={{
                            background: 'rgba(16,185,129,0.04)',
                            border: '1px solid rgba(16,185,129,0.15)',
                            borderRadius: '8px',
                            padding: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                          }}>
                            <span style={{color: '#10B981', fontSize: '14px'}}>✓</span>
                            <span style={{color: '#ccc', fontSize: '12px'}}>{p.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Disclaimer Footer */}
                  <div style={{
                    marginTop: '32px',
                    padding: '16px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '10px',
                    textAlign: 'center'
                  }}>
                    <p style={{color: '#555', fontSize: '11px', margin: 0, lineHeight: '1.6'}}>
                      🏪 Play Store compliance check is based on Google Play Developer Policy guidelines. 
                      <br/>
                      Final review is performed by Google during app submission.
                    </p>
                  </div>

                </>
              )}

            </motion.div>
          )}

        </AnimatePresence>

        {/* CODE MODAL */}
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowModal(false)}
                className="absolute inset-0 bg-brand-dark/90 backdrop-blur-md" 
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-5xl h-[80vh] bg-brand-secondary border border-brand-border rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              >
                <div className="bg-brand-dark/50 p-6 border-b border-brand-border flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-brand-red/10 rounded-lg">
                      <Code className="w-5 h-5 text-brand-red" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-widest">{selectedFile?.split('/').pop()}</h3>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">{selectedFile}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-auto bg-[#0d0d0d] p-0 custom-scrollbar">
                  {isLoadingCode ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <Loader2 className="w-10 h-10 animate-spin mb-4 text-brand-red" />
                      <span className="text-xs font-bold tracking-widest uppercase">Fetching source code...</span>
                    </div>
                  ) : (
                    <SyntaxHighlighter
                      language="java"
                      style={atomDark}
                      showLineNumbers={true}
                      customStyle={{
                        margin: 0,
                        padding: '2rem',
                        fontSize: '12px',
                        backgroundColor: 'transparent'
                      }}
                    >
                      {code}
                    </SyntaxHighlighter>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-brand-border flex flex-col md:flex-row justify-between items-center text-gray-500 text-[10px] gap-4 uppercase font-bold tracking-widest">
           <div>Analysis Verified by MobAudit Engine</div>
           <div>© 2026 MOBAUDIT SECURITY PLATFORM</div>
        </div>
      </div>
    </div>
  );
}

export default Report;
