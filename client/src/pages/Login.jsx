import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, Lock, Server, Cpu, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(`http://${window.location.hostname}:5001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      
      localStorage.setItem('mobaudit_token', data.token);
      localStorage.setItem('mobaudit_user', data.username);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate 20 slow-moving floating particles
  const particles = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    duration: Math.random() * 15 + 15, // 15s to 30s
    delay: Math.random() * -20,
  }));

  return (
    <div className="min-h-screen w-full flex overflow-hidden bg-[#050508] font-sans selection:bg-[#E11D48]/30 selection:text-white">
      {/* Dynamic CSS injecting custom scanline, particles, and card glow keyframes */}
      <style>{`
        @keyframes floatParticle {
          0% { transform: translateY(0) translateX(0); opacity: 0.1; }
          50% { transform: translateY(-60px) translateX(30px); opacity: 0.7; }
          100% { transform: translateY(0) translateX(0); opacity: 0.1; }
        }
        @keyframes scanLineAnimation {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        @keyframes customPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
      `}</style>

      {/* LEFT SIDE (60%) — Cyber-Security Brand Showroom */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="hidden lg:flex lg:w-3/5 relative flex-col justify-between p-16 overflow-hidden border-r border-white/5 bg-[#050508]"
      >
        {/* Subtle Cyber Grid Lines overlay */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none" 
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
            backgroundSize: '45px 45px'
          }}
        />

        {/* Scan line moving downwards in a infinite loop */}
        <div 
          className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-[#E11D48] to-transparent pointer-events-none z-10 opacity-70"
          style={{
            animation: 'scanLineAnimation 8s linear infinite',
            boxShadow: '0 0 10px rgba(225,29,72,0.6), 0 0 20px rgba(225,29,72,0.3)'
          }}
        />

        {/* Glowing floating security nodes/particles */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute bg-[#E11D48] rounded-full filter blur-[1px]"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                left: p.left,
                top: p.top,
                boxShadow: '0 0 8px rgba(225,29,72,0.8)',
                animation: `floatParticle ${p.duration}s ease-in-out infinite`,
                animationDelay: `${p.delay}s`
              }}
            />
          ))}
        </div>

        {/* Brand Top Header */}
        <img src="/logo.png" alt="MobAudit" style={{ width: '150px', marginBottom: '60px' }} />

        {/* Central Glowing Headline */}
        <div className="z-10 my-auto space-y-8 max-w-xl">
          <div className="space-y-4">
            <h1 className="text-white font-extrabold text-5xl tracking-tight leading-none uppercase">
              SECURE YOUR <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[#E11D48] filter drop-shadow-[0_0_30px_rgba(225,29,72,0.3)]">
                MOBILE APPS
              </span>
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed font-light">
              AI-Powered Android Security Analysis Platform
            </p>
          </div>

          {/* Animated Pill-Style Buttons */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '40px' }}>
            {[
              { icon: '🔍', label: 'Static Analysis' },
              { icon: '🦠', label: 'VirusTotal Intel' },
              { icon: '🤖', label: 'AI Fix Engine' },
              { icon: '🛡️', label: 'Privacy Analyzer' },
              { icon: '📊', label: 'Risk Scoring' },
              { icon: '🗺️', label: 'MITRE ATT&CK' },
            ].map((pill, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                whileHover={{ scale: 1.05, borderColor: '#E11D48' }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'rgba(225, 29, 72, 0.08)',
                  border: '1px solid rgba(225, 29, 72, 0.3)',
                  borderRadius: '999px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '600',
                  letterSpacing: '0.5px',
                  cursor: 'default',
                  transition: 'all 0.3s',
                }}
              >
                <span>{pill.icon}</span>
                <span>{pill.label}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom accent system verification */}
        <div className="z-10 flex justify-between items-center text-xs font-mono text-gray-500 uppercase tracking-widest border-t border-white/5 pt-6">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E11D48] animate-ping" />
            SYSTEM CORE ONLINE
          </span>
          <span>v2.1.0-STABLE</span>
        </div>
      </motion.div>

      {/* RIGHT SIDE (40%) — Cyber Glassmorphism Login Panel */}
      <motion.div 
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 80, duration: 0.8 }}
        className="w-full lg:w-2/5 min-h-screen bg-[#0a0a0f] flex flex-col justify-between p-8 md:p-16 relative overflow-hidden"
      >
        {/* Subtle decorative glow in top-right corner */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#E11D48]/5 rounded-full filter blur-[100px] pointer-events-none" />

        {/* Top Spacer or Small System Alert info */}
        <div className="hidden md:flex justify-end">
          <span className="text-[10px] text-gray-600 font-mono tracking-widest uppercase">VERIFY SECURITY SCHEME</span>
        </div>

        {/* Form Container */}
        <div className="my-auto w-full max-w-md mx-auto space-y-10">
          
          {/* Logo Brand Head */}
          <div className="text-left font-sans">
            <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>
              {isLogin ? 'WELCOME BACK' : 'CREATE ACCOUNT'}
            </h1>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '40px' }}>
              {isLogin ? 'Log in to your MobAudit account' : 'Join the MobAudit Security Platform'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Input 1: Username */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#E11D48] focus:ring-1 focus:ring-[#E11D48]/30 transition-all duration-300 shadow-inner"
                placeholder="Enter authorized username"
                required
              />
            </motion.div>

            {/* Input 2: Password */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-2 relative"
            >
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-white placeholder-gray-600 focus:outline-none focus:border-[#E11D48] focus:ring-1 focus:ring-[#E11D48]/30 transition-all duration-300 shadow-inner"
                  placeholder="Enter secure passcode"
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-[14px] text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>
            
            {/* Input 3: Confirm Password (Register mode only) */}
            {!isLogin && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-2"
              >
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#E11D48] focus:ring-1 focus:ring-[#E11D48]/30 transition-all duration-300 shadow-inner"
                  placeholder="Re-enter secure passcode"
                  required
                />
              </motion.div>
            )}

            {/* Error alerts */}
            <AnimatePresence>
              {error && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[#E11D48] text-xs text-center font-bold tracking-wide uppercase bg-[#E11D48]/10 border border-[#E11D48]/20 py-2.5 rounded-xl shadow-inner animate-pulse"
                >
                  ⚠️ {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Action Trigger Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="pt-2"
            >
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#E11D48] to-[#ff6b6b] hover:from-[#ff3b68] hover:to-[#ff8e8e] disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(225,29,72,0.35)] hover:shadow-[0_0_30px_rgba(225,29,72,0.6)] uppercase tracking-widest text-sm transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? 'Processing System Authentication...' : (isLogin ? 'Establish Secure Session' : 'Register Secure Credentials')}
              </button>
            </motion.div>
          </form>

          {/* Toggle register/login */}
          <div className="text-center">
            <button 
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-gray-400 hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors duration-300"
            >
              {isLogin ? "Request Access authorization // Register" : "Return to credentials verification // Login"}
            </button>
          </div>
        </div>

        {/* Footer info lock block */}
        <div className="w-full text-center space-y-4 pt-12">
          {/* Animated red glow line under card */}
          <div 
            className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#E11D48]/40 to-transparent mx-auto"
            style={{
              animation: 'customPulse 3s ease-in-out infinite'
            }}
          />
          <div className="flex items-center justify-center gap-2 text-gray-600 text-[10px] uppercase font-bold tracking-widest">
            <Lock className="w-3.5 h-3.5 text-[#E11D48]" />
            Protected by MobAudit Security System
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
