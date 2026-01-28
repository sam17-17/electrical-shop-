
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, ArrowRight, Loader2, AlertCircle, Mail, UserPlus, Eye, EyeOff, Shield, Cloud } from 'lucide-react';
import { ZILL_TECH_LOGO_BASE64 } from '../assets/logo';

export const Login: React.FC = () => {
  const { login, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    if (isSignUp) {
      const result = await signUp(username, password, fullName);
      if (result.success) {
        setMessage('Cloud account created! You can now sign in.');
        setIsSignUp(false);
      } else {
        setError(result.error || 'Signup failed');
      }
    } else {
      const result = await login(username, password);
      if (!result.success) {
        setError(result.error || 'Invalid credentials');
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up border border-slate-200">
        {/* Header */}
        <div className="bg-indigo-600 p-8 text-center relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <Shield className="w-32 h-32 text-white" />
           </div>
           <div className="relative z-10">
             <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30 shadow-lg overflow-hidden">
                <img src={ZILL_TECH_LOGO_BASE64} alt="Zill Tech Logo" className="w-full h-full object-cover" />
             </div>
             <h1 className="text-2xl font-bold text-white tracking-tight">
               {isSignUp ? 'New Cloud Account' : 'Zill Tech Engineering'}
             </h1>
             <p className="text-indigo-100 mt-2 text-sm font-medium">
               {isSignUp ? 'Setup multi-device cloud sync' : 'Sign in to access your dashboard'}
             </p>
           </div>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex items-start animate-fade-in border border-red-100">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            
            {message && (
              <div className="bg-emerald-50 text-emerald-600 px-4 py-3 rounded-xl text-sm flex items-start animate-fade-in border border-emerald-100">
                <Cloud className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                <span>{message}</span>
              </div>
            )}

            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {isSignUp ? 'Email Address' : 'Email or Username'}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type={isSignUp ? "email" : "text"}
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm transition-all"
                  placeholder={isSignUp ? "email@example.com" : "Enter your credentials"}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password / PIN</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 py-2.5 border border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm transition-all"
                  placeholder="••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-200 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Authenticating...
                </>
              ) : (
                <>
                  {isSignUp ? 'Activate Cloud Access' : 'Secure Sign In'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <button 
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setMessage('');
                  setUsername('');
                  setPassword('');
                  setFullName('');
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have cloud sync? Create a new admin account"}
              </button>
            </div>
            
            {!isSignUp && (
              <div className="mt-8 space-y-3 pt-4 border-t border-slate-100">
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-white rounded-lg mr-3 shadow-sm">
                        <Shield className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest leading-none mb-1">Super Admin Access</p>
                        <code className="text-xs text-indigo-800 font-bold font-mono">superadmin / admin2025</code>
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-indigo-200 text-indigo-700 text-[9px] font-black rounded-md">CLOUD</div>
                </div>
                
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Demo Access</p>
                  <code className="text-xs text-slate-600 font-mono">admin / 1234</code>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
