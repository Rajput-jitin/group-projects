'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, Sparkles, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { axiosInstance } from '@/lib/axiosInstance';

interface SchemeResult {
  scheme_id: string;
  scheme_name: string;
  is_eligible: boolean;
  eligibility_score: number;
  confidence_score: number;
  missing_requirements: string[];
  matched_criteria: string[];
}

const STATES = ['Andhra Pradesh','Bihar','Delhi','Gujarat','Haryana','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','West Bengal'];

export default function FormPage() {
  const [ocrSource, setOcrSource] = useState<Record<string, string>>({});

  // Form fields
  const [age, setAge] = useState('25');
  const [gender, setGender] = useState('male');
  const [state, setState] = useState('Maharashtra');
  const [occupation, setOccupation] = useState('farmer');
  const [income, setIncome] = useState('150000');
  const [category, setCategory] = useState('general');
  const [education, setEducation] = useState('graduate');
  const [isRural, setIsRural] = useState(false);
  const [disability, setDisability] = useState(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<SchemeResult[] | null>(null);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [checkedCount, setCheckedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill from localStorage on mount — OCR data takes priority over profile
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const filled: Record<string, string> = {};

    // 1. Try to fill from saved user profile first
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      try {
        const user = JSON.parse(rawUser);
        if (user.age && !isNaN(Number(user.age))) { setAge(String(user.age)); filled['age'] = 'profile'; }
        if (user.gender) { setGender(user.gender.toLowerCase()); filled['gender'] = 'profile'; }
        if (user.state) { setState(user.state); filled['state'] = 'profile'; }
        if (user.annual_income) { setIncome(String(user.annual_income)); filled['income'] = 'profile'; }
        if (user.category) { setCategory(user.category.toLowerCase()); filled['category'] = 'profile'; }
        if (user.occupation) { setOccupation(user.occupation.toLowerCase()); filled['occupation'] = 'profile'; }
        if (user.education) { setEducation(user.education.toLowerCase()); filled['education'] = 'profile'; }
        if (user.disability_status !== undefined) { setDisability(Boolean(user.disability_status)); }
      } catch { /* ignore */ }
    }

    // 2. OCR data overrides profile (highest priority)
    const rawOcr = localStorage.getItem('ocrData');
    if (rawOcr) {
      try {
        const data = JSON.parse(rawOcr) as Record<string, string>;
        if (data.age && !isNaN(Number(data.age))) { setAge(data.age); filled['age'] = 'ocr'; }
        if (data.gender) { setGender(data.gender.toLowerCase()); filled['gender'] = 'ocr'; }
        if (data.state) { setState(data.state); filled['state'] = 'ocr'; }
        if (data.annual_income) { setIncome(data.annual_income); filled['income'] = 'ocr'; }
        if (data.category) { setCategory(data.category.toLowerCase()); filled['category'] = 'ocr'; }
      } catch { /* ignore */ }
    }

    setOcrSource(filled);
  }, []);

  const getSource = (key: string) => ocrSource[key]; // 'ocr' | 'profile' | undefined

  const SourceBadge = ({ fieldKey }: { fieldKey: string }) => {
    const src = getSource(fieldKey);
    if (!src) return null;
    return src === 'ocr' ? (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded text-[10px] font-semibold">
        <Sparkles className="w-2.5 h-2.5" /> OCR
      </span>
    ) : (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] font-semibold">
        👤 Profile
      </span>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResults(null);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        age: parseInt(age, 10),
        gender,
        state,
        occupation,
        annual_income: parseFloat(income),
        category,
        education,
        is_rural: isRural,
        disability_status: disability,
      };

      const res = await axiosInstance.post('/api/eligibility/check', payload);
      const data = res.data;

      const sorted: SchemeResult[] = (data.results || []).sort(
        (a: SchemeResult, b: SchemeResult) =>
          Number(b.is_eligible) - Number(a.is_eligible) || b.eligibility_score - a.eligibility_score
      );

      setResults(sorted);
      setEligibleCount(data.eligible_count ?? sorted.filter((r) => r.is_eligible).length);
      setCheckedCount(data.checked_schemes_count ?? sorted.length);
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to check eligibility. Please ensure the backend is running.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const ocrCount = Object.values(ocrSource).filter(v => v === 'ocr').length;
  const profileCount = Object.values(ocrSource).filter(v => v === 'profile').length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Scheme Eligibility Form</h1>
              <p className="text-sm text-slate-500">Fill in your details to discover all matching government schemes.</p>
            </div>
          </div>
          {Object.keys(ocrSource).length > 0 && (
            <div className="mt-4 p-3 bg-violet-50 border border-violet-200 rounded-xl flex items-center gap-2 text-sm text-violet-700">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>
                Form auto-filled from <strong>{ocrCount > 0 ? `${ocrCount} OCR document fields` : ''}</strong>
                {ocrCount > 0 && profileCount > 0 ? ' and ' : ''}
                <strong>{profileCount > 0 ? `${profileCount} saved profile details` : ''}</strong>.
                You can edit any field before submitting.
              </span>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Age */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center gap-1.5">
                  Age <SourceBadge fieldKey="age" />
                </label>
                <input
                  type="number"
                  min={1} max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    getSource('age') === 'ocr' ? 'bg-violet-50 border-violet-200' : getSource('age') === 'profile' ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center gap-1.5">
                  Gender <SourceBadge fieldKey="gender" />
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    getSource('gender') === 'ocr' ? 'bg-violet-50 border-violet-200' : getSource('gender') === 'profile' ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="transgender">Transgender</option>
                </select>
              </div>

              {/* State */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center gap-1.5">
                  State <SourceBadge fieldKey="state" />
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    getSource('state') === 'ocr' ? 'bg-violet-50 border-violet-200' : getSource('state') === 'profile' ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Occupation */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center gap-1.5">
                  Occupation <SourceBadge fieldKey="occupation" />
                </label>
                <select
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    getSource('occupation') === 'profile' ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <option value="farmer">Farmer / Agricultural Laborer</option>
                  <option value="student">Student</option>
                  <option value="unemployed">Unemployed / Youth</option>
                  <option value="salaried">Salaried Employee</option>
                  <option value="self_employed">Self Employed / Trader</option>
                  <option value="startup_founder">Startup Founder / Entrepreneur</option>
                  <option value="senior_citizen">Senior Citizen</option>
                </select>
              </div>

              {/* Annual Income */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center gap-1.5">
                  Annual Income (₹) <SourceBadge fieldKey="income" />
                </label>
                <input
                  type="number"
                  min={0}
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    getSource('income') === 'ocr' ? 'bg-violet-50 border-violet-200' : getSource('income') === 'profile' ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center gap-1.5">
                  Social Category <SourceBadge fieldKey="category" />
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    getSource('category') === 'ocr' ? 'bg-violet-50 border-violet-200' : getSource('category') === 'profile' ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <option value="general">General</option>
                  <option value="obc">OBC</option>
                  <option value="sc">SC – Scheduled Caste</option>
                  <option value="st">ST – Scheduled Tribe</option>
                  <option value="minority">Minority</option>
                </select>
              </div>

              {/* Education */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center gap-1.5">
                  Education Level <SourceBadge fieldKey="education" />
                </label>
                <select
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    getSource('education') === 'profile' ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <option value="below_10th">Below 10th</option>
                  <option value="10th_pass">10th Pass</option>
                  <option value="12th_pass">12th Pass</option>
                  <option value="diploma">Diploma / ITI</option>
                  <option value="graduate">Graduate</option>
                  <option value="post_graduate">Post Graduate / PhD</option>
                </select>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-wrap gap-5 pt-1">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={isRural} onChange={(e) => setIsRural(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                Rural Area Resident
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={disability} onChange={(e) => setDisability(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                Person with Disability (Divyangjan)
              </label>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing {checkedCount || 4700} Schemes...</>
              ) : (
                <><CheckCircle className="w-5 h-5" /> Check My Eligibility</>
              )}
            </button>
          </form>
        </div>

        {/* Results */}
        {results && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Your Matching Schemes</h2>
                <p className="text-sm text-slate-500">
                  You are eligible for{' '}
                  <strong className="text-emerald-600">{eligibleCount}</strong>{' '}
                  out of <strong>{checkedCount}</strong> schemes
                </p>
              </div>
              <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-xl">
                {eligibleCount}
              </div>
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {results.map((r) => (
                <div
                  key={r.scheme_id}
                  className={`rounded-xl border p-4 transition-all ${
                    r.is_eligible
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-slate-50 border-slate-200 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${r.is_eligible ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <h3 className="font-semibold text-slate-800 text-sm">{r.scheme_name}</h3>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.is_eligible && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-semibold">Eligible ✓</span>
                      )}
                      <span className="text-xs text-slate-500 font-medium">{r.eligibility_score}%</span>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2">
                    <div
                      className={`h-1.5 rounded-full ${r.is_eligible ? 'bg-emerald-500' : 'bg-slate-400'}`}
                      style={{ width: `${r.eligibility_score}%` }}
                    />
                  </div>

                  {r.matched_criteria && r.matched_criteria.length > 0 && (
                    <div className="text-xs text-emerald-700 flex flex-wrap gap-1 mb-1">
                      {r.matched_criteria.slice(0, 3).map((c) => (
                        <span key={c} className="px-2 py-0.5 bg-emerald-100 rounded-full">{c}</span>
                      ))}
                    </div>
                  )}
                  {r.missing_requirements && r.missing_requirements.length > 0 && (
                    <div className="text-xs text-slate-500 flex flex-wrap gap-1">
                      {r.missing_requirements.slice(0, 2).map((m) => (
                        <span key={m} className="px-2 py-0.5 bg-slate-100 rounded-full">Missing: {m}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
