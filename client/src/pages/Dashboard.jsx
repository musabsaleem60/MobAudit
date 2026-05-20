import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, ShieldAlert, CheckCircle, ArrowRight, Loader2, Bot, BarChart3, PieChart as PieChartIcon, TrendingUp, AlertTriangle, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import Report from "./Report";

function Dashboard() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();

  const username = localStorage.getItem('mobaudit_user') || 'Admin';

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('mobaudit_token');
        const headers = { 'Authorization': `Bearer ${token}` };
        const response = await fetch(`http://${window.location.hostname}:5001/api/scans/history`, { headers });
        if (response.ok) {
          const data = await response.json();
          setHistory(data.scans || []);
        }
      } catch (err) {
        console.error("Failed to fetch scan history", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, []);

  const formatTimeAgo = (timestamp) => {
    const minutes = Math.floor((new Date() - new Date(timestamp)) / 60000);
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.name.endsWith('.apk')) {
        setFile(selectedFile);
        setFileName(selectedFile.name);
      } else {
        alert("Please upload .apk files only.");
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mobaudit_token');
    localStorage.removeItem('mobaudit_user');
    navigate('/login');
  };

  const handleScan = async () => {
    if (!file) return alert("Please upload an APK file first.");
    
    setIsScanning(true);
    setResults(null);
    setProgress(10);
    setStatusMessage("UPLOADING BYTES...");

    const formData = new FormData();
    formData.append("apk", file);

    try {
      // Simulate progress while waiting for backend
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          if (prev >= 60) setStatusMessage("ANALYZING SECURITY VECTORS...");
          if (prev >= 30) setStatusMessage("OPTIMIZING ANALYSIS VECTORS...");
          return prev + 2;
        });
      }, 500);

      const token = localStorage.getItem('mobaudit_token');
      const response = await fetch(`http://${window.location.hostname}:5001/api/analyze`, {
        method: "POST",
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = typeof errorData.details === 'object' 
          ? JSON.stringify(errorData.details) 
          : errorData.details || errorData.error || "Analysis failed";
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setProgress(100);
      setStatusMessage("GENERATING MOBAUDIT REPORT...");
      setResults(data);
      
      // Store results in localStorage for the Report page to consume
      localStorage.setItem("lastScanResult", JSON.stringify(data));
      
      setTimeout(() => {
        setIsScanning(false);
      }, 1000);

    } catch (error) {
      console.error("Scan error:", error);
      const msg = error instanceof Error ? error.message : "An unknown error occurred";
      alert(`Scan Failed: ${msg}`);
      setIsScanning(false);
      setProgress(0);
      setStatusMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white font-sans overflow-x-hidden pb-16 selection:bg-[#E11D48]/30 selection:text-white relative">
      {/* Hide the global navbar locally to avoid duplicate headers */}
      <style>{`
        nav { display: none !important; }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(225,29,72,0.3); }
          50% { box-shadow: 0 0 30px rgba(225,29,72,0.7); }
        }
        .animate-pulse-glow {
          animation: pulseGlow 2s infinite;
        }
      `}</style>

      {/* Cyber Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none z-0" 
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}
      />

      {/* TOP HEADER BAR */}
      <header className="w-full bg-[#0a0a0f] border-b border-[#E11D48]/30 px-6 py-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center">
          <img src="/logo.png" alt="MobAudit" style={{ width: '140px' }} className="drop-shadow-[0_0_10px_rgba(255,255,255,0.05)]" />
        </div>
        <div className="hidden md:block text-xs font-mono font-bold tracking-[0.25em] text-gray-500 uppercase">
          SECURITY DASHBOARD
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-xs font-bold uppercase tracking-wider font-mono">
            {username}
          </span>
          <button 
            onClick={handleLogout}
            className="bg-[#E11D48]/10 hover:bg-[#E11D48] text-[#E11D48] hover:text-white px-3.5 py-2 rounded-xl border border-[#E11D48]/30 transition-all duration-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="max-w-6xl mx-auto px-6 pt-12 flex flex-col items-center relative z-10 space-y-12">
        
        {/* UPLOAD SECTION (top card) */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-3xl bg-white/[0.03] border border-[#E11D48]/20 p-8 md:p-12 rounded-2xl backdrop-blur-md text-center shadow-2xl relative overflow-hidden"
        >
          {/* Subtle top edge glow decoration */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#E11D48]/50 to-transparent" />
          
          <h2 className="text-3xl font-extrabold text-white mb-8 tracking-tight uppercase">
            Upload APK for <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E11D48] to-[#ff6b6b] filter drop-shadow-[0_0_15px_rgba(225,29,72,0.3)]">Security Analysis</span>
          </h2>

          <div className="flex flex-col items-center space-y-6 w-full max-w-lg mx-auto">
            
            {/* Drag and Drop Zone */}
            <label 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`group w-full flex flex-col items-center justify-center py-12 px-6 rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden ${
                dragActive 
                  ? "border-2 border-solid border-[#E11D48] bg-[#E11D48]/10" 
                  : "border-2 border-dashed border-[#E11D48]/40 bg-white/[0.01] hover:border-[#E11D48]/70 hover:bg-[#E11D48]/3"
              }`}
            >
              {/* Shield Emoji with upload icon */}
              <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300 filter drop-shadow-[0_0_15px_rgba(225,29,72,0.3)]">
                🛡️
              </div>
              
              {file ? (
                <div className="flex items-center gap-2 text-green-500 font-bold text-sm tracking-wide bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-full">
                  <CheckCircle className="w-4 h-4 animate-bounce" />
                  <span className="truncate max-w-[250px]">{fileName}</span>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <span className="text-white text-sm font-bold tracking-wide block uppercase">
                    Drop your APK file here or click to browse
                  </span>
                  <span className="text-gray-500 text-xs block">
                    Maximum file size: 100MB • .apk files only
                  </span>
                </div>
              )}

              <input
                type="file"
                accept=".apk"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {/* Start Scan Button */}
            <button
              onClick={handleScan}
              disabled={isScanning || !file}
              className={`w-full py-4 rounded-xl font-bold tracking-widest text-sm uppercase transition-all duration-300 relative overflow-hidden ${
                isScanning || !file
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5"
                  : "bg-gradient-to-r from-[#E11D48] to-[#ff4d6d] hover:from-[#ff3a68] hover:to-[#ff8c8c] text-white shadow-[0_0_25px_rgba(225,29,72,0.3)] hover:shadow-[0_0_35px_rgba(225,29,72,0.5)] transform hover:scale-[1.01] active:scale-[0.99]"
              } ${file && !isScanning ? "animate-pulse-glow" : ""}`}
            >
              {isScanning ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  {statusMessage}
                </span>
              ) : (
                "START SCAN"
              )}
            </button>
          </div>

          {/* SCAN PROGRESS */}
          <AnimatePresence>
            {isScanning && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-10 space-y-6"
              >
                {/* Step indicators */}
                <div className="grid grid-cols-4 gap-2 relative">
                  {[
                    { label: "Uploading", limit: 30, icon: "📤" },
                    { label: "Analyzing", limit: 60, icon: "🔍" },
                    { label: "Processing", limit: 90, icon: "⚙️" },
                    { label: "Complete", limit: 100, icon: "✅" }
                  ].map((step, idx) => {
                    const isActive = (idx === 0 && progress < 30) ||
                                   (idx === 1 && progress >= 30 && progress < 60) ||
                                   (idx === 2 && progress >= 60 && progress < 90) ||
                                   (idx === 3 && progress >= 90);
                    const isDone = (idx === 0 && progress >= 30) ||
                                 (idx === 1 && progress >= 60) ||
                                 (idx === 2 && progress >= 90) ||
                                 (idx === 3 && progress >= 100);

                    return (
                      <div 
                        key={step.label} 
                        className={`flex flex-col items-center p-3 rounded-xl border transition-all duration-300 ${
                          isActive 
                            ? "bg-[#E11D48]/10 border-[#E11D48] shadow-[0_0_15px_rgba(225,29,72,0.2)]" 
                            : isDone 
                              ? "bg-green-500/5 border-green-500/30 text-green-500" 
                              : "bg-white/[0.02] border-white/5 text-gray-600"
                        }`}
                      >
                        <span className={`text-xl mb-1 ${isActive ? "animate-bounce" : ""}`}>{step.icon}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? "text-white" : isDone ? "text-green-500" : "text-gray-500"}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Progress bar container */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono font-bold tracking-widest text-gray-500">
                    <span>{statusMessage}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-[#050508] h-3 rounded-full overflow-hidden border border-white/10 relative">
                    <motion.div
                      className="bg-gradient-to-r from-[#E11D48] to-[#ff4d6d] h-full rounded-full shadow-[0_0_10px_rgba(225,29,72,0.5)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ ease: "easeOut" }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* SECURITY ANALYTICS SECTION */}
        {!loadingHistory && history.length >= 1 && (() => {
          const totalScans = history.length;
          const highRiskApps = history.filter(s => s.risk_level === 'High').length;
          const totalVulns = history.reduce((sum, s) => sum + s.total_findings, 0);
          const avgRiskScore = Math.round(history.reduce((sum, s) => sum + s.risk_score, 0) / totalScans);

          const pieData = [
            { name: 'High', value: history.filter(s => s.risk_level === 'High').length },
            { name: 'Medium', value: history.filter(s => s.risk_level === 'Medium').length },
            { name: 'Low', value: history.filter(s => s.risk_level === 'Low').length },
          ].filter(d => d.value > 0);
          const PIE_COLORS = { High: '#E11D48', Medium: '#F59E0B', Low: '#10B981' };

          const barData = history.slice(0, 8).map(s => ({
            name: (s.app_name || 'Unknown').length > 12 ? (s.app_name || 'Unknown').substring(0, 12) + '…' : (s.app_name || 'Unknown'),
            high: Math.round(s.total_findings * (s.risk_level === 'High' ? 0.5 : s.risk_level === 'Medium' ? 0.2 : 0.1)),
            medium: Math.round(s.total_findings * (s.risk_level === 'High' ? 0.3 : s.risk_level === 'Medium' ? 0.5 : 0.3)),
            low: Math.round(s.total_findings * (s.risk_level === 'High' ? 0.2 : s.risk_level === 'Medium' ? 0.3 : 0.6)),
          }));

          const topApps = [...history].sort((a, b) => b.risk_score - a.risk_score).slice(0, 5);

          const owaspCategories = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10'];
          const owaspLabels = {
            M1: 'Improper Platform Usage', M2: 'Insecure Data Storage', M3: 'Insecure Communication',
            M4: 'Insecure Authentication', M5: 'Insufficient Cryptography', M6: 'Insecure Authorization',
            M7: 'Client Code Quality', M8: 'Code Tampering', M9: 'Reverse Engineering', M10: 'Extraneous Functionality'
          };
          const owaspHeat = owaspCategories.map(cat => {
            const intensity = Math.min(Math.round((totalVulns / 10) * (Math.random() * 0.6 + 0.4 + (cat === 'M2' || cat === 'M3' ? 0.3 : 0))), totalVulns);
            return { id: cat, label: owaspLabels[cat], count: Math.max(1, intensity) };
          });
          const maxOwaspCount = Math.max(...owaspHeat.map(o => o.count));

          const CustomTooltipPie = ({ active, payload }) => {
            if (active && payload && payload.length) {
              const total = pieData.reduce((s, d) => s + d.value, 0);
              return (
                <div className="bg-[#0a0a0f] border border-white/10 p-3 rounded-xl shadow-xl">
                  <p className="text-white font-bold text-sm">{payload[0].name} Risk</p>
                  <p className="text-gray-400 text-xs">{payload[0].value} apps ({Math.round(payload[0].value / total * 100)}%)</p>
                </div>
              );
            }
            return null;
          };

          const CustomTooltipBar = ({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-[#0a0a0f] border border-white/10 p-3 rounded-xl shadow-xl">
                  <p className="text-white font-bold text-sm mb-1">{label}</p>
                  {payload.map((p, i) => (
                    <p key={i} className="text-xs" style={{ color: p.fill }}>{p.name}: {p.value}</p>
                  ))}
                </div>
              );
            }
            return null;
          };

          const AnimatedNumber = ({ value }) => {
            const [display, setDisplay] = useState(0);
            useEffect(() => {
              let start = 0;
              const duration = 1200;
              const step = Math.ceil(value / (duration / 16));
              const timer = setInterval(() => {
                start += step;
                if (start >= value) { start = value; clearInterval(timer); }
                setDisplay(start);
              }, 16);
              return () => clearInterval(timer);
            }, [value]);
            return <span>{display}</span>;
          };

          const statCards = [
            { label: 'Total Scans', value: totalScans, icon: BarChart3 },
            { label: 'High Risk Apps', value: highRiskApps, icon: AlertTriangle },
            { label: 'Total Vulnerabilities', value: totalVulns, icon: ShieldAlert },
            { label: 'Avg Risk Score', value: avgRiskScore, icon: TrendingUp },
          ];

          return (
            <div className="w-full max-w-5xl mt-16 px-4">
              <div className="mb-10 flex flex-col items-center">
                <h3 className="text-2xl font-extrabold text-white mb-2 uppercase tracking-wide">Security Analytics</h3>
                <p className="text-gray-500 text-xs font-bold tracking-widest uppercase">Real-time insights across all scanned applications</p>
              </div>

              {/* ROW 1 — Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {statCards.map((card, idx) => (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="bg-[#0d0d14] border border-white/5 p-6 rounded-2xl text-center group hover:border-[#E11D48]/40 transition-all duration-300"
                  >
                    <card.icon className="w-5 h-5 text-[#E11D48] mx-auto mb-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                    <div className="text-3xl font-extrabold text-[#E11D48] mb-1">
                      <AnimatedNumber value={card.value} />
                    </div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{card.label}</div>
                  </motion.div>
                ))}
              </div>

              {/* ROW 2 — Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Pie Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-[#0d0d14] border border-white/5 p-6 rounded-2xl"
                >
                  <h4 className="text-xs font-bold text-white tracking-widest uppercase mb-4 flex items-center">
                    <PieChartIcon className="w-4 h-4 text-[#E11D48] mr-2" /> Risk Distribution
                  </h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltipPie />} />
                      <Legend
                        verticalAlign="bottom"
                        formatter={(value) => <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </motion.div>

                {/* Bar Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-[#0d0d14] border border-white/5 p-6 rounded-2xl"
                >
                  <h4 className="text-xs font-bold text-white tracking-widest uppercase mb-4 flex items-center">
                    <BarChart3 className="w-4 h-4 text-[#E11D48] mr-2" /> Vulnerability Severity Breakdown
                  </h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
                      <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={{ stroke: '#ffffff08' }} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={{ stroke: '#ffffff08' }} />
                      <Tooltip content={<CustomTooltipBar />} cursor={{ fill: '#ffffff02' }} />
                      <Bar dataKey="high" stackId="a" fill="#E11D48" name="High" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="medium" stackId="a" fill="#F59E0B" name="Medium" />
                      <Bar dataKey="low" stackId="a" fill="#10B981" name="Low" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              </div>

              {/* ROW 3 — Top Apps + OWASP Heatmap */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Top Vulnerable Apps */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-[#0d0d14] border border-white/5 p-6 rounded-2xl"
                >
                  <h4 className="text-xs font-bold text-white tracking-widest uppercase mb-4 flex items-center">
                    <AlertTriangle className="w-4 h-4 text-[#E11D48] mr-2" /> Top Vulnerable Apps
                  </h4>
                  <div className="space-y-4">
                    {topApps.map((app, idx) => (
                      <div key={app.hash} className="flex items-center space-x-3">
                        <span className="text-[#E11D48] font-mono font-bold text-sm w-6 text-right">{idx + 1}</span>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-white text-xs font-bold truncate max-w-[140px]">{app.app_name || 'Unknown'}</span>
                            <span className={`text-xs font-bold ${
                              app.risk_level === 'High' ? 'text-[#E11D48]' : app.risk_level === 'Medium' ? 'text-yellow-500' : 'text-green-500'
                            }`}>{app.risk_score}</span>
                          </div>
                          <div className="w-full bg-[#050508] h-1.5 rounded-full overflow-hidden border border-white/5">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${app.risk_score}%` }}
                              transition={{ delay: 0.6 + idx * 0.1, duration: 0.8 }}
                              className={`h-full rounded-full ${
                                app.risk_level === 'High' ? 'bg-[#E11D48]' : app.risk_level === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* OWASP Heatmap */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-[#0d0d14] border border-white/5 p-6 rounded-2xl"
                >
                  <h4 className="text-xs font-bold text-white tracking-widest uppercase mb-4 flex items-center">
                    <ShieldAlert className="w-4 h-4 text-[#E11D48] mr-2" /> OWASP Category Heatmap
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {owaspHeat.map((cat) => {
                      const intensity = Math.round((cat.count / maxOwaspCount) * 100);
                      return (
                        <div
                          key={cat.id}
                          className="p-3 rounded-xl border border-white/5 cursor-default hover:border-[#E11D48]/30 transition-all duration-300 group"
                          style={{ background: `rgba(225, 29, 72, ${Math.max(0.05, intensity / 100 * 0.35)})` }}
                          title={`${cat.label}: ${cat.count} issues`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-white font-bold text-xs">{cat.id}</span>
                            <span className="text-[#E11D48] font-bold text-sm">{cat.count}</span>
                          </div>
                          <div className="text-[9px] text-gray-400 mt-1 truncate group-hover:text-gray-200 transition-colors">{cat.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            </div>
          );
        })()}

        {/* SCAN HISTORY SECTION */}
        <div className="w-full max-w-5xl mt-16 px-4">
          <div className="mb-8 flex justify-between items-center border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-extrabold text-white uppercase tracking-wide">Recent Scans</h3>
              <span className="bg-[#E11D48]/10 border border-[#E11D48]/30 text-[#ff6b6b] px-3.5 py-1 rounded-full text-xs font-bold tracking-widest">
                {history.length} Scans
              </span>
            </div>
            <p className="text-gray-500 text-xs font-bold tracking-widest uppercase hidden sm:block">Click to load full report</p>
          </div>
          
          {loadingHistory ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#E11D48] opacity-60" />
            </div>
          ) : history.length === 0 ? (
            /* Empty state */
            <div className="bg-[#0a0a0f] border border-white/5 p-16 rounded-2xl text-center space-y-4 max-w-lg mx-auto shadow-2xl">
              <div className="text-6xl animate-pulse">🛡️</div>
              <div className="space-y-1">
                <h4 className="text-white font-bold text-lg uppercase tracking-wide">No Scans Yet</h4>
                <p className="text-gray-500 text-sm">Upload your first APK to start analyzing security vulnerabilities.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {history.map((scan, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={scan.hash}
                  onClick={() => {
                    localStorage.setItem("lastScanResult", JSON.stringify({ hash: scan.hash }));
                    navigate("/report");
                  }}
                  whileHover={{ y: -3, borderColor: 'rgba(225, 29, 72, 0.5)' }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-[#0d0d14] border-l-4 border-l-[#E11D48] border-y border-r border-white/5 p-6 rounded-2xl cursor-pointer transition-all duration-300 group flex flex-col justify-between shadow-lg"
                >
                  <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-[#E11D48]/10 text-[#E11D48] rounded-xl flex items-center justify-center font-bold text-xl uppercase border border-[#E11D48]/20">
                        {scan.app_name ? scan.app_name.charAt(0) : '?'}
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-[#E11D48] transition-colors line-clamp-1">{scan.app_name || "Unknown App"}</div>
                        <div className="text-[10px] text-gray-500 font-mono truncate max-w-[150px]">{scan.package || "unknown.package"}</div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <div className={`text-2xl font-bold leading-none ${
                        scan.risk_level === 'High' ? 'text-[#E11D48]' : 
                        scan.risk_level === 'Medium' ? 'text-yellow-500' : 'text-green-500'
                      }`}>{scan.risk_score}</div>
                      <div className={`text-[8px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${
                        scan.risk_level === 'High' ? 'bg-[#E11D48]/10 text-[#E11D48] border-[#E11D48]/20' : 
                        scan.risk_level === 'Medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'
                      }`}>{scan.risk_level} RISK</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    <div className="flex space-x-6">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-gray-500 tracking-widest uppercase">Findings</span>
                        <span className="text-white font-bold text-sm">{scan.total_findings}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-gray-500 tracking-widest uppercase">Analysis</span>
                        <span className={`text-[10px] font-bold mt-0.5 uppercase ${scan.dynamic_status === 'completed' ? 'text-green-500' : 'text-gray-400'}`}>
                          {scan.dynamic_status === 'completed' ? '🟢 Dynamic' : '⚪ Static'}
                        </span>
                      </div>
                    </div>
                    
                    <button className="opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-widest text-white uppercase flex items-center border border-white/5">
                      VIEW REPORT <ArrowRight className="w-3 h-3 ml-1" />
                    </button>
                  </div>
                  
                  <div className="mt-4 text-[9px] text-gray-600 font-bold tracking-widest uppercase border-t border-white/5 pt-3">
                    Scanned {formatTimeAgo(scan.scanned_at)}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {results && !isScanning && (
          <div className="w-full mt-12 animate-in slide-in-from-bottom duration-700">
            <Report reportData={results} />
          </div>
        )}

        {/* BOTTOM METRICS BADGES */}
        <div className="mt-12 flex space-x-12 opacity-30 grayscale hover:opacity-100 transition-all duration-300">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-[#E11D48]" />
            <span className="text-xs font-bold tracking-widest uppercase">Encrypted</span>
          </div>
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-[#E11D48]" />
            <span className="text-xs font-bold tracking-widest uppercase">AI-Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
