'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, LogIn, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { axiosInstance } from '@/lib/axiosInstance';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [age, setAge] = useState('25');
  const [gender, setGender] = useState('male');
  const [state, setState] = useState('Maharashtra');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await axiosInstance.post('/api/auth/login', {
        email,
        password,
      });

      const { access_token, refresh_token } = res.data;
      localStorage.setItem('token', access_token);
      if (refresh_token) localStorage.setItem('refresh_token', refresh_token);

      // Fetch profile after login
      const profileRes = await axiosInstance.get('/api/users/me');
      localStorage.setItem('user', JSON.stringify(profileRes.data));

      setSuccess('Login successful! Redirecting...');
      setTimeout(() => {
        router.push('/profile');
      }, 1000);
    } catch (err: any) {
      if (err.response && err.response.status === 429) {
        setError('Rate limit exceeded (5 attempts/min). Please wait a moment before retrying.');
      } else if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await axiosInstance.post('/api/auth/register', {
        full_name: fullName,
        email,
        password,
        mobile: mobile || undefined,
        age: parseInt(age, 10) || 25,
        gender,
        state,
      });

      setSuccess('Account created successfully! Auto-logging in...');
      
      // Auto login after registration
      const loginRes = await axiosInstance.post('/api/auth/login', { email, password });
      localStorage.setItem('token', loginRes.data.access_token);
      
      const profileRes = await axiosInstance.get('/api/users/me');
      localStorage.setItem('user', JSON.stringify(profileRes.data));

      setTimeout(() => {
        router.push('/profile');
      }, 1000);
    } catch (err: any) {
      if (err.response && err.response.status === 429) {
        setError('Rate limit exceeded (5 attempts/min). Please wait a moment.');
      } else if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Registration failed. Please check your details.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isLogin
              ? 'Access your SchemeSeva profile & document vault'
              : 'Sign up to discover matching government schemes'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(null); setSuccess(null); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-4 h-4 inline mr-1.5" />
            Login
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(null); setSuccess(null); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              !isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4 inline mr-1.5" />
            Register
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login to Account'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Rahul Sharma"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Mobile</label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="transgender">Transgender</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Maharashtra"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 mt-2"
            >
              {loading ? 'Creating Account...' : 'Register Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
