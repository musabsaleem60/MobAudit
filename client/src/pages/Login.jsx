import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6 bg-gradient-to-b from-brand-dark to-brand-secondary">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-brand-secondary/50 border border-brand-border p-8 rounded-2xl backdrop-blur-sm"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-brand-red rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(255,31,31,0.3)]">
            <ShieldCheck className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-gray-400">
            {isLogin ? 'Log in to your MobAudit account' : 'Join the MobAudit Security Platform'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-red/50 transition-all"
              placeholder="Enter username"
              required
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-brand-red/50 transition-all"
              placeholder="Enter password"
              required
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] text-gray-500 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-brand-red/50 transition-all"
                placeholder="Confirm password"
                required
              />
            </div>
          )}

          <AnimatePresence>
            {error && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-brand-red text-sm text-center"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-red hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-brand-red/20 uppercase tracking-widest"
          >
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
          </button>
        </div>

        <p className="mt-8 text-center text-gray-600 text-[10px] uppercase font-bold tracking-widest border-t border-brand-border pt-4">
          Protected by MobAudit Security System
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
