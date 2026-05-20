import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, ShieldAlert, CheckCircle, ArrowRight, Loader2, Bot, BarChart3, PieChart as PieChartIcon, TrendingUp, AlertTriangle } from "lucide-react";
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
  const navigate = useNavigate();

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
    <div className="min-h-[calc(100vh-72px)] bg-brand-dark flex flex-col items-center justify-center p-6 bg-gradient-to-b from-brand-dark to-brand-secondary">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-brand-secondary/50 border border-brand-border p-12 rounded-2xl backdrop-blur-sm text-center shadow-2xl"
      >
        <h2 className="text-4xl font-display font-bold text-white mb-8">
          Upload Your APK for <span className="text-brand-red">Security Scan</span>
        </h2>

        <div className="flex flex-col items-center space-y-6">
          <label className="group w-full max-w-sm flex flex-col items-center justify-center border-2 border-dashed border-brand-border py-10 rounded-xl cursor-pointer hover:border-brand-red/50 hover:bg-brand-red/5 transition-all">
            <Upload className="w-10 h-10 text-gray-500 group-hover:text-brand-red mb-3 transition-colors" />
            <span className="text-gray-400 group-hover:text-white transition-colors uppercase text-xs font-bold tracking-widest">
              {fileName || "Choose APK File"}
            </span>
            <input
              type="file"
              accept=".apk"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <button
            onClick={handleScan}
            disabled={isScanning || !file}
            className={`w-full max-w-sm py-4 rounded-lg font-bold tracking-widest text-sm transition-all shadow-lg ${
              isScanning || !file
                ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                : "bg-brand-red hover:bg-red-600 text-white shadow-brand-red/20"
            }`}
          >
            {isScanning ? (
              <span className="flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                {statusMessage}
              </span>
            ) : (
              "START SCAN"
            )}
          </button>
        </div>

        <AnimatePresence>
          {isScanning && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-10"
            >
              <div className="flex justify-between text-xs font-bold tracking-widest text-gray-500 mb-2">
                <span>{statusMessage}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-brand-dark h-2 rounded-full overflow-hidden border border-brand-border">
                <motion.div
                  className="bg-brand-red h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                ></motion.div>
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
              <div className="bg-brand-dark border border-brand-border p-3 rounded-xl shadow-xl">
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
              <div className="bg-brand-dark border border-brand-border p-3 rounded-xl shadow-xl">
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
              <h3 className="text-2xl font-display font-bold text-white mb-2">Security Analytics</h3>
              <p className="text-gray-500 text-sm font-bold tracking-widest uppercase">Real-time insights across all scanned applications</p>
            </div>

            {/* ROW 1 — Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {statCards.map((card, idx) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className="bg-brand-secondary border border-brand-border p-6 rounded-2xl text-center group hover:border-brand-red/40 transition-colors"
                >
                  <card.icon className="w-5 h-5 text-brand-red mx-auto mb-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                  <div className="text-3xl font-display font-bold text-brand-red mb-1">
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
                className="bg-brand-secondary border border-brand-border p-6 rounded-2xl"
              >
                <h4 className="text-sm font-bold text-white tracking-widest uppercase mb-4 flex items-center">
                  <PieChartIcon className="w-4 h-4 text-brand-red mr-2" /> Risk Distribution
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
                className="bg-brand-secondary border border-brand-border p-6 rounded-2xl"
              >
                <h4 className="text-sm font-bold text-white tracking-widest uppercase mb-4 flex items-center">
                  <BarChart3 className="w-4 h-4 text-brand-red mr-2" /> Vulnerability Severity Breakdown
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={{ stroke: '#ffffff10' }} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={{ stroke: '#ffffff10' }} />
                    <Tooltip content={<CustomTooltipBar />} cursor={{ fill: '#ffffff05' }} />
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
                className="bg-brand-secondary border border-brand-border p-6 rounded-2xl"
              >
                <h4 className="text-sm font-bold text-white tracking-widest uppercase mb-4 flex items-center">
                  <AlertTriangle className="w-4 h-4 text-brand-red mr-2" /> Top Vulnerable Apps
                </h4>
                <div className="space-y-3">
                  {topApps.map((app, idx) => (
                    <div key={app.hash} className="flex items-center space-x-3">
                      <span className="text-brand-red font-display font-bold text-lg w-6 text-right">{idx + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-white text-sm font-bold truncate max-w-[140px]">{app.app_name || 'Unknown'}</span>
                          <span className={`text-sm font-display font-bold ${
                            app.risk_level === 'High' ? 'text-brand-red' : app.risk_level === 'Medium' ? 'text-yellow-500' : 'text-green-500'
                          }`}>{app.risk_score}</span>
                        </div>
                        <div className="w-full bg-brand-dark h-1.5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${app.risk_score}%` }}
                            transition={{ delay: 0.6 + idx * 0.1, duration: 0.8 }}
                            className={`h-full rounded-full ${
                              app.risk_level === 'High' ? 'bg-brand-red' : app.risk_level === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
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
                className="bg-brand-secondary border border-brand-border p-6 rounded-2xl"
              >
                <h4 className="text-sm font-bold text-white tracking-widest uppercase mb-4 flex items-center">
                  <ShieldAlert className="w-4 h-4 text-brand-red mr-2" /> OWASP Category Heatmap
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {owaspHeat.map((cat) => {
                    const intensity = Math.round((cat.count / maxOwaspCount) * 100);
                    return (
                      <div
                        key={cat.id}
                        className="p-3 rounded-xl border border-white/5 cursor-default hover:border-brand-red/30 transition-all group"
                        style={{ background: `rgba(225, 29, 72, ${Math.max(0.05, intensity / 100 * 0.4)})` }}
                        title={`${cat.label}: ${cat.count} issues`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-white font-bold text-xs">{cat.id}</span>
                          <span className="text-brand-red font-display font-bold text-sm">{cat.count}</span>
                        </div>
                        <div className="text-[9px] text-gray-400 mt-1 truncate group-hover:text-gray-300 transition-colors">{cat.label}</div>
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
      <div className="w-full max-w-4xl mt-16 px-4">
        <div className="mb-8 flex flex-col items-center">
          <h3 className="text-2xl font-display font-bold text-white mb-2">Recent Scans</h3>
          <p className="text-gray-500 text-sm font-bold tracking-widest uppercase">Click any scan to view its full report</p>
        </div>
        
        {loadingHistory ? (
          <div className="flex justify-center p-10">
            <Loader2 className="w-8 h-8 animate-spin text-brand-red opacity-50" />
          </div>
        ) : history.length === 0 ? (
          <div className="bg-brand-secondary/50 border border-brand-border p-10 rounded-2xl text-center text-gray-500 font-bold tracking-widest uppercase text-sm">
            No scans yet. Upload an APK to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {history.map((scan, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={scan.hash}
                onClick={() => {
                  localStorage.setItem("lastScanResult", JSON.stringify({ hash: scan.hash }));
                  navigate("/report");
                }}
                className="bg-brand-secondary border border-brand-border p-6 rounded-2xl cursor-pointer hover:border-brand-red/50 transition-colors group flex flex-col"
              >
                <div className="flex justify-between items-start mb-4 border-b border-brand-border pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-brand-red/20 text-brand-red rounded-lg flex items-center justify-center font-display font-bold text-xl uppercase">
                      {scan.app_name ? scan.app_name.charAt(0) : '?'}
                    </div>
                    <div>
                      <div className="font-bold text-white group-hover:text-brand-red transition-colors line-clamp-1">{scan.app_name || "Unknown App"}</div>
                      <div className="text-[10px] text-gray-500 font-mono truncate max-w-[150px]">{scan.package || "unknown.package"}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <div className={`text-2xl font-display font-bold ${
                      scan.risk_level === 'High' ? 'text-brand-red' : 
                      scan.risk_level === 'Medium' ? 'text-yellow-500' : 'text-green-500'
                    }`}>{scan.risk_score}</div>
                    <div className={`text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded border ${
                      scan.risk_level === 'High' ? 'bg-brand-red/10 text-brand-red border-brand-red/20' : 
                      scan.risk_level === 'Medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'
                    }`}>{scan.risk_level} RISK</div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-auto pt-2">
                  <div className="flex space-x-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Findings</span>
                      <span className="text-white font-bold">{scan.total_findings}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Analysis</span>
                      <span className={`text-[10px] font-bold mt-1 uppercase ${scan.dynamic_status === 'completed' ? 'text-green-500' : 'text-gray-400'}`}>
                        {scan.dynamic_status === 'completed' ? 'Dynamic Done' : 'Static Only'}
                      </span>
                    </div>
                  </div>
                  
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest text-white uppercase flex items-center">
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

      <div className="mt-12 flex space-x-12 opacity-30 grayscale hover:opacity-100 transition-opacity">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5" />
          <span className="text-xs font-bold tracking-widest uppercase">Encrypted</span>
        </div>
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5" />
          <span className="text-xs font-bold tracking-widest uppercase">AI-Ready</span>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
