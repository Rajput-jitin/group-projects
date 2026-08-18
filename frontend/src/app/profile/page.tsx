'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, MapPin, Briefcase, CheckCircle, AlertCircle, Save, Mail, ChevronLeft } from 'lucide-react';

const STATES_LIST = [
  'Uttar Pradesh',
  'Maharashtra',
  'Delhi',
  'Karnataka',
  'Tamil Nadu',
  'Gujarat',
  'Rajasthan',
  'Bihar',
  'Madhya Pradesh',
  'West Bengal',
  'Haryana',
  'Punjab',
  'Andhra Pradesh',
  'Telangana',
  'Kerala',
  'Odisha',
  'Jharkhand',
  'Assam',
  'Chhattisgarh',
  'Uttarakhand',
  'Himachal Pradesh',
  'Goa',
  'Tripura',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Sikkim',
  'Arunachal Pradesh',
  'Jammu and Kashmir',
  'Ladakh',
];

const INCOME_RANGES = [
  { label: 'Below ₹1 Lakh', value: '75000' },
  { label: '₹1-3 Lakh', value: '200000' },
  { label: '₹3-5 Lakh', value: '400000' },
  { label: '₹5-10 Lakh', value: '800000' },
  { label: 'Above ₹10 Lakh', value: '1200000' },
];

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Editable fields - no hardcoded defaults
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [state, setState] = useState('');
  const [category, setCategory] = useState('');
  const [occupation, setOccupation] = useState('');
  const [annualIncome, setAnnualIncome] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.full_name) setFullName(user.full_name);
        if (user.email) setEmail(user.email);
        if (user.age) setAge(String(user.age));
        if (user.gender) setGender(user.gender.toLowerCase());
        if (user.state) setState(user.state);
        if (user.category) setCategory(user.category.toLowerCase());
        if (user.occupation) setOccupation(user.occupation.toLowerCase());
        if (user.annual_income) {
          const income = Number(user.annual_income);
          const closest = INCOME_RANGES.reduce((prev, curr) =>
            Math.abs(Number(curr.value) - income) < Math.abs(Number(prev.value) - income) ? curr : prev
          );
          if (closest) setAnnualIncome(closest.value);
        }
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
    setLoading(false);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const userData = {
      full_name: fullName,
      email,
      age: age ? parseInt(age, 10) : undefined,
      gender,
      state,
      category,
      occupation,
      annual_income: annualIncome ? Number(annualIncome) : undefined,
    };

    localStorage.setItem('user', JSON.stringify(userData));
    setMessage('Profile saved successfully!');
    setTimeout(() => setMessage(null), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4">
        <div className="text-slate-500 font-medium animate-pulse">Loading Profile...</div>
      </div>
    );
  }

  const inputClass = 'w-full px-4 py-3 bg-[#0c1427] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-slate-100 text-sm font-semibold outline-none transition placeholder-slate-600';
  const selectClass = 'w-full px-4 py-3 bg-[#0c1427] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-slate-100 text-sm font-semibold outline-none transition cursor-pointer';
  const labelClass = 'block text-sm font-semibold text-slate-300 mb-2';

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans pb-20">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-[#090f1d]/90 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition px-2.5 py-1.5 rounded-lg hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div className="h-4 w-[1px] bg-slate-800" />
            <span className="text-base sm:text-lg font-black text-white tracking-tight">My Profile</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {message && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm flex items-center gap-2 font-semibold">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="bg-[#090f1d]/90 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-8">
            {/* Title */}
            <h1 className="text-2xl font-black text-white tracking-tight">My Information</h1>

            {/* ── Personal Details ── */}
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-400" />
                Personal Details
              </h2>

              <div>
                <label className={labelClass}>Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  <Mail className="w-4 h-4 inline mr-1.5 text-slate-400" />
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Age</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 20"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className={selectClass}
                >
                  <option value="" disabled className="text-slate-600">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="transgender">Transgender</option>
                </select>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-800/60" />

            {/* ── Location & Category ── */}
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-400" />
                Location & Category
              </h2>

              <div>
                <label className={labelClass}>State *</label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                  className={selectClass}
                >
                  <option value="" disabled className="text-slate-600">Select State</option>
                  {STATES_LIST.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={selectClass}
                >
                  <option value="" disabled className="text-slate-600">Select Category</option>
                  <option value="general">General</option>
                  <option value="obc">OBC</option>
                  <option value="sc">SC</option>
                  <option value="st">ST</option>
                  <option value="ews">EWS / Minority</option>
                </select>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-800/60" />

            {/* ── Work & Income ── */}
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-400" />
                Work & Income
              </h2>

              <div>
                <label className={labelClass}>Occupation</label>
                <select
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className={selectClass}
                >
                  <option value="" disabled className="text-slate-600">Select Occupation</option>
                  <option value="farmer">Farmer</option>
                  <option value="student">Student</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="salaried">Salaried</option>
                  <option value="self_employed">Self Employed</option>
                  <option value="startup_founder">Entrepreneur / Startup</option>
                  <option value="senior_citizen">Senior Citizen</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Annual Income</label>
                <select
                  value={annualIncome}
                  onChange={(e) => setAnnualIncome(e.target.value)}
                  className={selectClass}
                >
                  <option value="" disabled className="text-slate-600">Select Annual Income</option>
                  {INCOME_RANGES.map((inc) => (
                    <option key={inc.value} value={inc.value}>
                      {inc.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl transition shadow-lg shadow-indigo-600/25 flex items-center gap-2 cursor-pointer text-sm"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
