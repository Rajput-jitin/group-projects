'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Shield, FileText, CheckCircle, AlertCircle, Save, LogOut } from 'lucide-react';
import { axiosInstance } from '@/lib/axiosInstance';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState('male');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [occupation, setOccupation] = useState('farmer');
  const [annualIncome, setAnnualIncome] = useState<number | ''>('');
  const [category, setCategory] = useState('general');
  const [education, setEducation] = useState('graduate');
  const [disabilityStatus, setDisabilityStatus] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/api/users/me');
      const data = res.data;
      setProfile(data);

      setFullName(data.full_name || '');
      setAge(data.age || 25);
      setGender(data.gender || 'male');
      setState(data.state || '');
      setDistrict(data.district || '');
      setOccupation(data.occupation || 'farmer');
      setAnnualIncome(data.annual_income || 150000);
      setCategory(data.category || 'general');
      setEducation(data.education || 'graduate');
      setDisabilityStatus(data.disability_status || false);
    } catch (err: any) {
      setError('Please login to view your profile.');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const res = await axiosInstance.put('/api/users/me', {
        full_name: fullName,
        age: age ? Number(age) : undefined,
        gender,
        state,
        district,
        occupation,
        annual_income: annualIncome ? Number(annualIncome) : undefined,
        category,
        education,
        disability_status: disabilityStatus,
      });

      setProfile(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      setMessage('Profile updated successfully!');
    } catch (err: any) {
      setError('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-slate-500 font-medium animate-pulse">Loading Profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center text-xl font-bold">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{profile?.full_name || 'User Profile'}</h1>
              <p className="text-sm text-slate-500">{profile?.email} • Verified Beneficiary</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-medium text-sm transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {message && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Profile Edit Form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" />
            Personal & Eligibility Details
          </h2>

          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Occupation</label>
                <select
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="farmer">Farmer</option>
                  <option value="student">Student</option>
                  <option value="unemployed">Unemployed / Youth</option>
                  <option value="salaried">Salaried</option>
                  <option value="self_employed">Self Employed</option>
                  <option value="startup_founder">Startup Founder</option>
                  <option value="senior_citizen">Senior Citizen</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Annual Income (₹)</label>
                <input
                  type="number"
                  value={annualIncome}
                  onChange={(e) => setAnnualIncome(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="general">General</option>
                  <option value="obc">OBC</option>
                  <option value="sc">SC</option>
                  <option value="st">ST</option>
                  <option value="minority">Minority</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Education Level</label>
                <select
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="below_10th">Below 10th</option>
                  <option value="10th_pass">10th Pass</option>
                  <option value="12th_pass">12th Pass</option>
                  <option value="diploma">Diploma</option>
                  <option value="graduate">Graduate</option>
                  <option value="post_graduate">Post Graduate</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="disability"
                checked={disabilityStatus}
                onChange={(e) => setDisabilityStatus(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <label htmlFor="disability" className="text-sm text-slate-700 font-medium">
                Person with Disability (Divyangjan)
              </label>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
