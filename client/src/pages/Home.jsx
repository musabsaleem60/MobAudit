import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, 
  Cpu, 
  ShieldCheck,
  Zap,
  Lock,
  Target,
  Gift
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();
  const [selectedFeature, setSelectedFeature] = useState(null);

  // 20 Floating particles
  const particles = Array.from({ length: 20 });

  return (
    <div className="min-h-screen bg-[#050508] text-white font-sans overflow-x-hidden selection:bg-[#E11D48]/30 selection:text-white relative">
      <style>{`
        @keyframes floatNode {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
        .animate-float-node {
          animation: floatNode 8s ease-in-out infinite;
        }
      `}</style>

      {/* Hero Section */}
      <section className="relative min-h-[95vh] flex items-center px-6 overflow-hidden pt-12 pb-20">
        
        {/* Animated Particle Dots */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          {particles.map((_, i) => {
            const size = Math.random() * 4 + 2;
            const top = Math.random() * 100;
            const left = Math.random() * 100;
            const delay = Math.random() * 5;
            const duration = Math.random() * 10 + 10;
            return (
              <div
                key={i}
                className="absolute rounded-full bg-[#E11D48] opacity-30"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  top: `${top}%`,
                  left: `${left}%`,
                  animation: `floatNode ${duration}s ease-in-out infinite`,
                  animationDelay: `${delay}s`,
                }}
              />
            );
          })}
        </div>

        {/* Cyber Grid Background */}
        <div 
          className="absolute inset-0 pointer-events-none z-0" 
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.01) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        <div className="max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Left Column Hero Headline */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-7 space-y-8"
          >
            <h1 className="text-5xl md:text-7xl font-extrabold leading-none tracking-tight uppercase">
              LAUNCH MOBILE <br />
              APPS WITH <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[#E11D48] filter drop-shadow-[0_0_20px_rgba(225,29,72,0.3)]">
                CONFIDENCE.
              </span>
            </h1>
            
            <p className="text-gray-400 text-lg md:text-xl max-w-xl leading-relaxed font-light">
              MobAudit is the most advanced Android security platform. Upload any APK and get a complete security report in minutes.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link 
                to="/dashboard"
                style={{
                  background: 'linear-gradient(135deg, #E11D48, #ff4d6d)',
                  boxShadow: '0 0 25px rgba(225,29,72,0.35)'
                }}
                className="hover:scale-[1.03] text-white font-bold px-8 py-4 rounded-xl transition-all text-xs tracking-widest uppercase flex items-center justify-center gap-2 group"
              >
                START SCANNING
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link 
                to="/dashboard"
                className="bg-transparent border border-white/20 hover:border-white hover:bg-white/5 text-white font-bold px-8 py-4 rounded-xl transition-all text-xs tracking-widest uppercase flex items-center justify-center"
              >
                VIEW DASHBOARD
              </Link>
            </div>
          </motion.div>

          {/* Right Column: Floating Premium Stats Card */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-5 relative"
          >
            {/* Soft pink glow behind card */}
            <div className="absolute inset-0 bg-[#E11D48]/10 blur-[120px] rounded-full"></div>
            
            {/* The Floating Card */}
            <div className="relative z-10 w-full max-w-[440px] mx-auto bg-[#0d0d14]/90 border border-white/10 p-8 rounded-3xl shadow-2xl backdrop-blur-md animate-float-node">
              {/* Card top bar */}
              <div className="flex justify-between items-center border-b border-white/5 pb-5 mb-6">
                <span className="text-[10px] font-bold tracking-[0.25em] text-[#E11D48] uppercase">CORE SHIELD INTEL</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] animate-ping" />
              </div>
              
              {/* Stats items list */}
              <div className="space-y-5">
                {[
                  "68+ Antivirus Engines Reputation Check",
                  "OWASP Top 10 Mobile Coverage Mapping",
                  "AI-Powered Real-time Remediation suggestions",
                  "Deep APK Static & Dynamic Analysis Vectors"
                ].map((item, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + idx * 0.15 }}
                    className="flex items-center gap-3.5"
                  >
                    <span className="text-green-500 text-sm font-bold bg-green-500/10 border border-green-500/20 w-6 h-6 rounded-full flex items-center justify-center shrink-0">✓</span>
                    <span className="text-gray-300 text-sm font-bold tracking-wide">{item}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* STATS BAR (Full Width Dark Strip) */}
      <section className="bg-[#0a0a0f] border-y border-white/5 py-8 px-6">
        <div className="max-w-[1400px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 lg:divide-x lg:divide-white/5 text-center">
          {[
            { icon: "</>", title: "Static Analysis", desc: "Deep APK Scanning" },
            { icon: "⬡", title: "VirusTotal Intel", desc: "68+ AV Engines Reputation" },
            { icon: "◈", title: "AI Fix Engine", desc: "Smart Vulnerability Remediation" },
            { icon: "◎", title: "Risk Scoring", desc: "OWASP + MITRE ATT&CK Maps" }
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center justify-center space-y-1.5 px-4">
              <span style={{ 
                fontSize: '20px', 
                fontWeight: '900', 
                color: '#E11D48',
                fontFamily: 'monospace'
              }}>{stat.icon}</span>
              <h4 className="text-white font-bold text-sm tracking-wider">{stat.title}</h4>
              <p className="text-gray-500 text-xs uppercase tracking-widest">{stat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES SECTION (3x2 Grid) */}
      <section className="py-28 px-6 bg-transparent">
        <div className="max-w-[1400px] mx-auto">
          
          <div className="text-center mb-20 space-y-3">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight uppercase">
              Everything You Need to <span className="text-[#E11D48]">Secure Your App</span>
            </h2>
            <p className="text-gray-500 text-xs font-bold tracking-widest uppercase">Comprehensive end-to-end vulnerability intelligence</p>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '24px',
            overflow: 'visible',
            paddingBottom: '40px'
          }}>
            {[
              {
                icon: '🔍',
                title: 'Static Analysis',
                desc: 'Decompile and scan APK source code, AndroidManifest files, sensitive resources, certificates, and hardcoded signatures.',
                detail: {
                  what: 'Static Analysis examines your APK without running it. We decompile the app using industry-standard tools and scan every file.',
                  how: 'Our engine extracts AndroidManifest.xml, scans for hardcoded secrets, checks certificate validity, analyzes permissions, and maps findings to OWASP Mobile Top 10.',
                  finds: ['Hardcoded API keys & passwords', 'Insecure permissions', 'Weak cryptography', 'Debuggable builds', 'Certificate issues', 'Insecure data storage'],
                }
              },
              {
                icon: '⚡',
                title: 'Dynamic Analysis',
                desc: 'Monitor runtime environment behaviors, memory allocations, IPC calls, dynamic network payloads, and sandbox processes.',
                detail: {
                  what: 'Dynamic Analysis runs your APK in a real Android emulator and monitors everything that happens at runtime.',
                  how: 'We connect to a GenyMotion Android emulator, install your app, hook into system calls using Frida, and capture network traffic, file operations, and API calls.',
                  finds: ['Network traffic & API calls', 'Runtime permission usage', 'File system access', 'Suspicious background processes', 'Data leakage', 'Insecure network connections'],
                }
              },
              {
                icon: '🦠',
                title: 'Threat Intelligence',
                desc: 'Cross-reference binary checksum hashes against the global VirusTotal engine checking database across 68+ distinct AV suppliers.',
                detail: {
                  what: 'We check your APK against VirusTotal\'s database of 68+ antivirus engines to detect known malware signatures.',
                  how: 'Your APK\'s SHA256 hash is computed and checked against VirusTotal\'s database. If flagged, we show exactly which engines detected it and what threat was found.',
                  finds: ['Known malware families', 'Banking trojans', 'Spyware signatures', 'Adware patterns', 'Ransomware indicators', 'Threat classification labels'],
                }
              },
              {
                icon: '🤖',
                title: 'AI Fix Suggestions',
                desc: 'Generate prompt-driven, robust vulnerability remediation suggestions and code snippet replacements with our built-in GPT assistant.',
                detail: {
                  what: 'Our AI engine powered by Groq (llama-3.1) analyzes each vulnerability and generates specific, actionable fix suggestions with code examples.',
                  how: 'Each finding is sent to our AI engine with full context. The AI returns step-by-step remediation guidance, secure code snippets, and explanation of why the issue is dangerous.',
                  finds: ['Secure code replacements', 'Step-by-step fix guides', 'Vulnerable vs fixed code diff', 'Security best practices', 'Framework-specific fixes', 'OWASP remediation guidance'],
                }
              },
              {
                icon: '🗺️',
                title: 'MITRE ATT&CK Mapping',
                desc: 'Directly contextualize discovered application flaws against standardized mobile threat catalogs and attacker playbooks.',
                detail: {
                  what: 'Every vulnerability found is mapped to MITRE ATT&CK for Mobile framework — the industry standard for categorizing attack techniques.',
                  how: 'Our mapping engine matches vulnerability patterns to MITRE techniques, assigns CVE numbers with CVSS scores, and provides remediation guidance aligned with industry standards.',
                  finds: ['MITRE technique IDs (T1xxx)', 'CVE numbers with CVSS scores', 'Attack tactic categories', 'Real-world exploit examples', 'CWE weakness mappings', 'OWASP Mobile Top 10 mapping'],
                }
              },
              {
                icon: '📄',
                title: 'Professional Reports',
                desc: 'Instantly compile and export publication-ready reports available as pristine PDF downloads, robust JSON files, or CSV models.',
                detail: {
                  what: 'Generate comprehensive, professional security reports ready to share with clients, developers, or management.',
                  how: 'Our report engine compiles all findings, risk scores, VirusTotal results, privacy analysis, and MITRE mappings into a beautifully formatted multi-page PDF.',
                  finds: ['Multi-page PDF with cover page', 'Risk score & severity breakdown', 'VirusTotal results page', 'Privacy & malware analysis', 'JSON export for CI/CD', 'CSV for spreadsheet analysis'],
                }
              },
            ].map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                whileHover={{ y: -5, borderColor: 'rgba(225, 29, 72, 0.5)' }}
                className="bg-[#0d0d14] border-l-4 border-l-[#E11D48] border-y border-r border-white/5 p-8 rounded-2xl transition-all duration-300 shadow-lg flex flex-col justify-between"
                style={{ minHeight: 'auto', cursor: 'pointer' }}
                onClick={() => setSelectedFeature(feat)}
              >
                <div className="space-y-4">
                  <span className="text-3xl block mb-2">{feat.icon}</span>
                  <h3 className="text-lg font-bold text-white tracking-wide">{feat.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed font-light">{feat.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* WHY MOBAUDIT SECTION (Dark Red Gradient Background) */}
      <section className="py-24 px-6 relative overflow-hidden bg-gradient-to-r from-[#0d0d14] via-[#20050b] to-[#0d0d14] border-y border-white/5">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight uppercase">
              Why Choose <br /><span className="text-[#E11D48]">MobAudit?</span>
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed font-light max-w-xl">
              We eliminate technical overhead, long wait times, and exorbitant enterprise pricing. Enjoy top-tier binary audits instantly without the complexity.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {[
              { icon: Zap, label: "Under 3 Minutes", val: "Results in under 3 minutes" },
              { icon: Lock, label: "Secure Server Core", val: "APKs never leave your server environment" },
              { icon: Target, label: "Zero Noise Tuning", val: "Zero false positive tuning heuristics" },
              { icon: Gift, label: "Fair Model", val: "No per-scan pricing limits" }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className="flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-[#E11D48]/10 border border-[#E11D48]/20 flex items-center justify-center shrink-0">
                  <item.icon className="text-[#E11D48] w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-1">{item.label}</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">{item.val}</p>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t border-white/5 bg-[#07070a]">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <Link to="/" className="flex items-center">
            <img src="/logo.png" alt="MobAudit" style={{ width: '130px' }} className="drop-shadow-[0_0_10px_rgba(255,255,255,0.05)]" />
          </Link>
          <p className="text-gray-500 text-xs font-mono font-bold tracking-widest uppercase">
            © 2026 MobAudit. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Feature Details Modal */}
      <AnimatePresence>
        {selectedFeature && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedFeature(null)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.85)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              backdropFilter: 'blur(8px)',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#0d0d14',
                border: '1px solid rgba(225,29,72,0.3)',
                borderRadius: '20px',
                padding: '40px',
                maxWidth: '600px',
                width: '100%',
                maxHeight: '80vh',
                overflowY: 'auto',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '32px' }}>{selectedFeature.icon}</span>
                  <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: '800', margin: 0 }}>{selectedFeature.title}</h2>
                </div>
                <button onClick={() => setSelectedFeature(null)}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px' }}>
                  ✕
                </button>
              </div>

              {/* What is it */}
              <div style={{ marginBottom: '20px' }}>
                <p style={{ color: '#E11D48', fontSize: '11px', fontWeight: '700', letterSpacing: '2px', marginBottom: '8px' }}>WHAT IS IT?</p>
                <p style={{ color: '#cccccc', fontSize: '14px', lineHeight: '1.7', margin: 0 }}>{selectedFeature.detail.what}</p>
              </div>

              {/* How it works */}
              <div style={{ marginBottom: '20px' }}>
                <p style={{ color: '#E11D48', fontSize: '11px', fontWeight: '700', letterSpacing: '2px', marginBottom: '8px' }}>HOW IT WORKS</p>
                <p style={{ color: '#cccccc', fontSize: '14px', lineHeight: '1.7', margin: 0 }}>{selectedFeature.detail.how}</p>
              </div>

              {/* What it finds */}
              <div>
                <p style={{ color: '#E11D48', fontSize: '11px', fontWeight: '700', letterSpacing: '2px', marginBottom: '12px' }}>WHAT IT FINDS</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {selectedFeature.detail.finds.map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      background: 'rgba(225,29,72,0.08)',
                      border: '1px solid rgba(225,29,72,0.15)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                    }}>
                      <span style={{ color: '#E11D48', fontSize: '12px' }}>✓</span>
                      <span style={{ color: '#ccc', fontSize: '12px' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => { setSelectedFeature(null); navigate('/dashboard'); }}
                style={{
                  marginTop: '28px', width: '100%',
                  background: 'linear-gradient(135deg, #E11D48, #ff4d6d)',
                  border: 'none', color: '#fff',
                  padding: '14px', borderRadius: '10px',
                  fontSize: '13px', fontWeight: '700',
                  letterSpacing: '1px', cursor: 'pointer',
                }}
              >
                START SCANNING NOW →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default Home;
