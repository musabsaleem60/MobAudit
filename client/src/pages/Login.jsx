import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'mobaudit' && password === 'mobaudit') {
      localStorage.setItem('auth', 'true');
      navigate('/');
    } else {
      setError('Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6 bg-gradient-to-b from-brand-dark to-brand-secondary">
      <div className="w-full max-w-md bg-brand-secondary/50 border border-brand-border p-8 rounded-2xl backdrop-blur-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-brand-red rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(255,31,31,0.3)]">
            <ShieldCheck className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400">Log in to your MobAudit account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
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
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-red/50 transition-all"
              placeholder="Enter password"
              required
            />
          </div>

          {error && <p className="text-brand-red text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full bg-brand-red hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-brand-red/20"
          >
            LOGIN
          </button>
        </form>

        <p className="mt-8 text-center text-gray-500 text-sm">
          Protected by MobAudit Security System
        </p>
      </div>
    </div>
  );
};

export default Login;
