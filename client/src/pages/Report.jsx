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
  
  // Dynamic Analysis State
  const [dynamicStatus, setDynamicStatus] = useState("not_started"); 
  const [dynamicError, setDynamicError] = useState(null);
  const [dynamicData, setDynamicData] = useState(null);

  const navigate = useNavigate();

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
        const [reportRes, riskRes, secretsRes] = await Promise.all([
          fetch(`http://${window.location.hostname}:5001/api/report/${hash}`),
          fetch(`http://${window.location.hostname}:5001/api/risk-score/${hash}`),
          fetch(`http://${window.location.hostname}:5001/api/secrets/${hash}`)
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
        const res = await fetch(`http://${window.location.hostname}:5001/api/analyze/dynamic/${hash}/status`);
        if (res.ok) {
          const data = await res.json();
          setDynamicStatus(data.status);
          
          if (data.status === "completed" && report && !report.dynamic) {
             const repRes = await fetch(`http://${window.location.hostname}:5001/api/report/${hash}`);
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
      <div className="max-w-6xl mx-auto px-4">
        
        {/* APP HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 bg-brand-secondary/30 p-8 rounded-3xl border border-brand-border backdrop-blur-sm">
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
        <div className="flex space-x-8 border-b border-brand-border mb-12">
          <button 
             onClick={() => setActiveTab("overview")}
             className={`pb-4 px-2 text-sm font-bold tracking-widest transition-all relative ${activeTab === "overview" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
          >
            OVERVIEW
            {activeTab === "overview" && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red" />}
          </button>
          <button 
             onClick={() => setActiveTab("vulnerabilities")}
             className={`pb-4 px-2 text-sm font-bold tracking-widest transition-all relative ${activeTab === "vulnerabilities" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
          >
            VULNERABILITIES
            {activeTab === "vulnerabilities" && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red" />}
          </button>
          <button 
             onClick={() => setActiveTab("code")}
             className={`pb-4 px-2 text-sm font-bold tracking-widest transition-all relative ${activeTab === "code" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
          >
            CODE VIEW
            {activeTab === "code" && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red" />}
          </button>
          <button 
             onClick={() => setActiveTab("secrets")}
             className={`pb-4 px-2 text-sm font-bold tracking-widest transition-all relative ${activeTab === "secrets" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
          >
            SECRETS {secretsData?.length > 0 && <span className="ml-2 bg-brand-red text-[10px] px-1.5 py-0.5 rounded-full text-white">{secretsData.length}</span>}
            {activeTab === "secrets" && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red" />}
          </button>
          <button 
             onClick={() => setActiveTab("dynamic")}
             className={`pb-4 px-2 text-sm font-bold tracking-widest transition-all relative ${activeTab === "dynamic" ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
          >
            DYNAMIC ANALYSIS
            {activeTab === "dynamic" && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red" />}
          </button>
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
                    <span className="text-[10px] font-mono text-white">{app?.sdk?.min || "N/A"}</span>
                 </div>
                 <div className="bg-brand-secondary border border-brand-border p-5 rounded-xl flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Target SDK</span>
                    <span className="text-[10px] font-mono text-white">{app?.sdk?.target || "N/A"}</span>
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

          {activeTab === "code" && (
            <motion.div 
              key="code"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-4 gap-8"
            >
              <div className="bg-brand-secondary border border-brand-border rounded-2xl p-6 h-[70vh] overflow-auto custom-scrollbar">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center">
                   <Layout className="w-4 h-4 mr-2" /> Asset Browser
                </h3>
                <div className="space-y-1">
                   {[...new Set(findings.map(f => f.file).filter(f => f && f !== "N/A"))].map((file, i) => (
                     <button 
                       key={i}
                       onClick={() => viewCode(file)}
                       className={`w-full text-left p-3 rounded-lg text-xs font-mono truncate transition-all ${selectedFile === file ? 'bg-brand-red/10 text-brand-red' : 'text-gray-400 hover:bg-white/5'}`}
                     >
                        {file.split('/').pop()}
                     </button>
                   ))}
                </div>
              </div>

              <div className="md:col-span-3 bg-[#0d0d0d] border border-brand-border rounded-2xl h-[70vh] relative overflow-hidden shadow-2xl">
                 {!selectedFile ? (
                   <div className="flex flex-col items-center justify-center h-full text-gray-600">
                      <FileCode className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-xs font-bold tracking-widest uppercase">Select a file to inspect source</p>
                   </div>
                 ) : isLoadingCode ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <Loader2 className="w-10 h-10 animate-spin mb-4 text-brand-red" />
                      <span className="text-xs font-bold tracking-widest">DECRYPTING ASSET...</span>
                    </div>
                 ) : (
                   <div className="h-full overflow-auto custom-scrollbar">
                      <div className="sticky top-0 z-10 bg-[#0d0d0d]/80 backdrop-blur-sm border-b border-white/5 p-4 flex justify-between items-center">
                         <div className="text-[10px] font-mono text-gray-500 truncate">{selectedFile}</div>
                         <div className="flex space-x-2">
                            <div className="w-2 h-2 rounded-full bg-red-500/30" />
                            <div className="w-2 h-2 rounded-full bg-yellow-500/30" />
                            <div className="w-2 h-2 rounded-full bg-green-500/30" />
                         </div>
                      </div>
                      <SyntaxHighlighter
                        language="java"
                        style={atomDark}
                        showLineNumbers={true}
                        customStyle={{
                          margin: 0,
                          padding: '2rem',
                          fontSize: '13px',
                          backgroundColor: 'transparent'
                        }}
                      >
                        {code}
                      </SyntaxHighlighter>
                   </div>
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

          {activeTab === "dynamic" && (
            <motion.div 
              key="dynamic"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="bg-brand-secondary border border-brand-border p-8 rounded-2xl flex flex-col pt-12 items-center text-center">
                 {dynamicStatus === "not_started" && (
                    <>
                       <Smartphone className="w-16 h-16 text-gray-500 mb-6" />
                       <h3 className="text-2xl font-bold text-white mb-4">Run Dynamic Analysis</h3>
                       <p className="text-sm text-gray-400 max-w-lg mb-8 leading-relaxed">
                         Automated dynamic analysis requires an active emulator connected via ADB. This will install the APK, attach FRIDA instrumentation, and actively execute the app to capture real-time behavior, API calls, and HTTP logs over 40 seconds.
                       </p>
                       <button 
                          onClick={startDynamicAnalysis}
                          className="bg-brand-red text-white py-3 px-8 rounded-xl font-bold tracking-wider hover:bg-brand-red/90 transition-colors uppercase"
                       >
                          Initiate Execution Trace
                       </button>
                    </>
                 )}

                 {dynamicStatus === "running" && (
                    <div className="flex flex-col items-center">
                       <Loader2 className="w-16 h-16 animate-spin text-brand-red mb-6" />
                       <h3 className="text-2xl font-bold text-white mb-2 blink">Executing Application</h3>
                       <p className="text-xs text-brand-red tracking-widest font-mono uppercase mb-8">
                         [ADB] Injecting Instrumentation Hook...
                       </p>
                       <div className="w-full max-w-sm h-1 bg-brand-dark rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 40, ease: "linear" }}
                            className="h-full bg-brand-red"
                          />
                       </div>
                    </div>
                 )}

                 {dynamicStatus === "error" && (
                    <>
                       <AlertCircle className="w-16 h-16 text-brand-red mb-6" />
                       <h3 className="text-2xl font-bold text-white mb-4">Execution Failed</h3>
                       <p className="text-sm text-brand-red max-w-lg mb-8">{dynamicError || "The emulator disconnected or an unknown trace failure occurred."}</p>
                       <button onClick={startDynamicAnalysis} className="border border-brand-red text-brand-red py-2 px-6 rounded-xl font-bold hover:bg-brand-red/10 transition-colors">RETRY</button>
                    </>
                 )}
              </div>

              {dynamicStatus === "completed" && dynamicData && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-brand-secondary border border-brand-border p-6 rounded-2xl relative overflow-hidden group">
                       <h3 className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-6 flex items-center">
                          <Globe className="w-4 h-4 mr-2 text-brand-red" />
                          Network Traffic Log
                       </h3>
                       <div className="space-y-4 max-h-96 overflow-auto custom-scrollbar pr-2">
                          {dynamicData.domains && Object.keys(dynamicData.domains).length > 0 ? (
                             Object.keys(dynamicData.domains).map((domain, i) => (
                                <div key={i} className="bg-brand-dark border border-white/5 p-4 rounded-xl font-mono text-xs text-gray-300 flex justify-between items-center group-hover:border-brand-red/30 transition-colors">
                                   <span className="truncate">{domain}</span>
                                   <span className="bg-brand-red/20 text-brand-red px-2 py-1 rounded text-[10px] font-bold">CONTACTED</span>
                                </div>
                             ))
                          ) : (
                             <p className="text-sm text-gray-500 text-center py-10">No external network domains contacted during trace.</p>
                          )}
                       </div>
                    </div>

                    <div className="bg-brand-secondary border border-brand-border p-6 rounded-2xl relative overflow-hidden group">
                       <h3 className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-6 flex items-center">
                          <FileCode className="w-4 h-4 mr-2 text-yellow-500" />
                          Intercepted API/Java Hooks
                       </h3>
                       <div className="space-y-4 max-h-96 overflow-auto custom-scrollbar pr-2">
                          {dynamicData.api_monitor && dynamicData.api_monitor.length > 0 ? (
                             dynamicData.api_monitor.slice(0, 50).map((api, i) => (
                                <div key={i} className="bg-brand-dark border border-white/5 p-4 rounded-xl text-xs text-gray-400 group-hover:border-yellow-500/30 transition-colors flex flex-col">
                                   <strong className="text-white mb-1">{api.class}</strong>
                                   <span className="font-mono text-[10px] text-yellow-500">{api.method}()</span>
                                </div>
                             ))
                          ) : (
                             <p className="text-sm text-gray-500 text-center py-10">No suspicious API calls routed via Frida instrumentation.</p>
                          )}
                       </div>
                    </div>
                 </div>
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
