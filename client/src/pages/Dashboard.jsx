import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, ShieldAlert, CheckCircle, ArrowRight, Loader2, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Report from "./Report";

function Dashboard() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const navigate = useNavigate();

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

      const response = await fetch(`http://${window.location.hostname}:5001/api/analyze`, {
        method: "POST",
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
