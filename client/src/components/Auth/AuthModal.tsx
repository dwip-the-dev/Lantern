import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, User, Mail, Eye, EyeOff, Sparkles, X, ShieldAlert, ShieldCheck } from 'lucide-react';
import { LanternLogo } from '../Common/LanternLogo';

export const AuthModal: React.FC = () => {
  const { showAuthModal, closeAuthModal, isConfigured, setupAdmin, login, register, loginAsGuest } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'setup'>(!isConfigured ? 'setup' : 'login');
  
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isConfigured) {
      setMode('setup');
    }
  }, [isConfigured]);

  if (!showAuthModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === 'setup') {
        await setupAdmin({ username, name: name || username, password, email });
      } else if (mode === 'login') {
        await login(username, password);
      } else {
        await register({ username, name: name || username, password, email });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuest = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await loginAsGuest();
    } catch (err: any) {
      setError(err.message || 'Guest login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-obsidian-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative text-slate-800 dark:text-slate-100 transition-colors">
        
        {/* Only allow closing if system is configured */}
        {isConfigured && (
          <button
            onClick={closeAuthModal}
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-lantern-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500 shadow-inner-dark">
            <LanternLogo size={28} glow />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            {mode === 'setup'
              ? 'First-Time Admin Setup'
              : mode === 'login'
              ? 'Welcome to Lantern'
              : 'Create Homelab Account'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {mode === 'setup'
              ? 'Create the master administrator account for this home server.'
              : mode === 'login'
              ? 'Enter your credentials to access your home server.'
              : 'Set up an account to manage media, apps, and services.'}
          </p>
        </div>

        {/* Tab switch (only if already configured) */}
        {isConfigured && (
          <div className="flex rounded-xl bg-slate-100 dark:bg-obsidian-950 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-white dark:bg-obsidian-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-white dark:bg-obsidian-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Register
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {(mode === 'register' || mode === 'setup') && (
            <div>
              <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">
                {mode === 'setup' ? 'Administrator Full Name' : 'Your Full Name'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Dwip"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-amber-500 dark:focus:border-lantern-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="dwip"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-amber-500 dark:focus:border-lantern-500"
              />
            </div>
          </div>

          {(mode === 'register' || mode === 'setup') && (
            <div>
              <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">Email (Optional)</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="dwip@lantern.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-amber-500 dark:focus:border-lantern-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-obsidian-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-10 py-2.5 focus:outline-none focus:border-amber-500 dark:focus:border-lantern-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lantern transition-all duration-150 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <span>Processing...</span>
            ) : mode === 'setup' ? (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Initialize Server Admin</span>
              </>
            ) : mode === 'login' ? (
              <span>Sign In to Server</span>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        {isConfigured && (
          <>
            <div className="relative text-center my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
              </div>
              <span className="relative bg-white dark:bg-obsidian-900 px-3 text-[11px] text-slate-400 uppercase tracking-wider">
                or
              </span>
            </div>

            {/* Guest access button */}
            <button
              type="button"
              onClick={handleGuest}
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-obsidian-800 hover:bg-slate-200 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-all flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Continue as Guest (Read Only)</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
