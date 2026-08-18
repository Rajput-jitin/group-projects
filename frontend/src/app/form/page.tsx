'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Search,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  Building2,
  Zap,
  Globe,
  ExternalLink,
  ChevronDown,
  RotateCcw,
  User,
  Shield,
  FileCheck
} from 'lucide-react';
import { axiosInstance } from '@/lib/axiosInstance';
import SchemeDetailModal from '@/components/SchemeDetailModal';

interface SchemeResult {
  scheme_id: string;
  scheme_name: string;
  is_eligible: boolean;
  eligibility_score: number;
  confidence_score: number;
  ministry?: string;
  description?: string;
  scheme_type?: string;
  level?: string;
  dbt_eligible?: boolean;
  mode?: string;
  missing_requirements: string[];
  matched_criteria: string[];
  matched_documents?: string[];
  missing_documents?: string[];
}

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
  { label: 'Below ₹1 Lakh', value: 75000 },
  { label: '₹1-3 Lakh', value: 200000 },
  { label: '₹3-5 Lakh', value: 400000 },
  { label: '₹5-10 Lakh', value: 800000 },
  { label: 'Above ₹10 Lakh', value: 1200000 },
];

const AVAILABLE_DOCUMENTS = [
  { id: 'aadhaar', label: 'Aadhaar Card / Voter ID / PAN' },
  { id: 'income_certificate', label: 'Income Certificate / Salary Proof' },
  { id: 'caste_certificate', label: 'Caste / Category Certificate (SC/ST/OBC)' },
  { id: 'domicile_certificate', label: 'Domicile / Residence Certificate' },
  { id: 'bank_passbook', label: 'Bank Account Passbook / Statement' },
  { id: 'education_certificate', label: '10th / 12th / Degree Marksheet' },
  { id: 'land_record', label: 'Farmer Card / Land Record (7/12, Khasra)' },
  { id: 'disability_certificate', label: 'Disability (PwD / UDID) Certificate' },
  { id: 'ration_card', label: 'Ration Card (BPL / AAY)' },
];

export default function FormPage() {
  const router = useRouter();

  // Mode tab: 'saved' | 'manual'
  const [activeTab, setActiveTab] = useState<'manual' | 'saved'>('manual');

  // Form fields - no hardcoded defaults
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [state, setState] = useState('');
  const [category, setCategory] = useState('');
  const [occupation, setOccupation] = useState('');
  const [incomeRange, setIncomeRange] = useState('');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

  // Selected scheme modal
  const [selectedScheme, setSelectedScheme] = useState<any | null>(null);
  const [loadingSchemeDetail, setLoadingSchemeDetail] = useState(false);

  // Results & pagination
  const [submitting, setSubmitting] = useState(false);
  const [allResults, setAllResults] = useState<SchemeResult[] | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [checkedCount, setCheckedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load profile if available in localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const autoDocs: string[] = [];
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      try {
        const user = JSON.parse(rawUser);
        if (user.age) setAge(String(user.age));
        if (user.gender) setGender(user.gender.toLowerCase());
        if (user.state) setState(user.state);
        if (user.category) setCategory(user.category.toLowerCase());
        if (user.occupation) setOccupation(user.occupation.toLowerCase());
        if (user.annual_income) {
          const incNum = Number(user.annual_income);
          const matchedRange = INCOME_RANGES.reduce((prev, curr) =>
            Math.abs(curr.value - incNum) < Math.abs(prev.value - incNum) ? curr : prev
          );
          if (matchedRange) setIncomeRange(matchedRange.label);
        }
      } catch {}
    }

    const rawOcr = localStorage.getItem('ocrData');
    if (rawOcr) {
      try {
        const data = JSON.parse(rawOcr) as Record<string, string>;
        if (data.age) setAge(data.age);
        if (data.gender) setGender(data.gender.toLowerCase());
        if (data.state) setState(data.state);
        if (data.category) setCategory(data.category.toLowerCase());
        if (data.document_id) autoDocs.push('aadhaar');
        if (data.annual_income) autoDocs.push('income_certificate');
      } catch {}
    }

    if (autoDocs.length > 0) {
      setSelectedDocs(Array.from(new Set(autoDocs)));
    }
  }, []);

  const toggleDoc = (docId: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docId) ? prev.filter((d) => d !== docId) : [...prev, docId]
    );
  };

  const handleUseSavedProfile = () => {
    setActiveTab('saved');
    if (typeof window === 'undefined') return;

    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      try {
        const user = JSON.parse(rawUser);
        if (user.age) setAge(String(user.age));
        if (user.gender) setGender(user.gender.toLowerCase());
        if (user.state) setState(user.state);
        if (user.category) setCategory(user.category.toLowerCase());
        if (user.occupation) setOccupation(user.occupation.toLowerCase());
        if (user.annual_income) {
          const incNum = Number(user.annual_income);
          const matchedRange = INCOME_RANGES.reduce((prev, curr) =>
            Math.abs(curr.value - incNum) < Math.abs(prev.value - incNum) ? curr : prev
          );
          if (matchedRange) setIncomeRange(matchedRange.label);
        }
      } catch {}
    }
  };

  const handleReset = () => {
    setActiveTab('manual');
    setAge('');
    setGender('');
    setState('');
    setCategory('');
    setOccupation('');
    setIncomeRange('');
    setSelectedDocs([]);
    setAllResults(null);
    setVisibleCount(6);
    setError(null);
  };

  const handleOpenScheme = async (schemeId: string, schemeName: string) => {
    try {
      setLoadingSchemeDetail(true);
      const res = await axiosInstance.get(`/api/schemes/${schemeId}`);
      if (res.data) {
        setSelectedScheme(res.data);
      } else {
        router.push(`/schemes?q=${encodeURIComponent(schemeName)}`);
      }
    } catch {
      router.push(`/schemes?q=${encodeURIComponent(schemeName)}`);
    } finally {
      setLoadingSchemeDetail(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    setAllResults(null);
    setVisibleCount(6);
    setError(null);

    const incomeVal = INCOME_RANGES.find((r) => r.label === incomeRange)?.value || 200000;

    try {
      const payload: Record<string, unknown> = {
        age: age ? parseInt(age, 10) : 25,
        gender: gender || 'male',
        state: state || 'Uttar Pradesh',
        occupation: occupation || 'farmer',
        annual_income: incomeVal,
        category: category || 'general',
        documents: selectedDocs,
      };

      const res = await axiosInstance.post('/api/eligibility/check', payload);
      const data = res.data;

      const sorted: SchemeResult[] = (data.results || []).sort(
        (a: SchemeResult, b: SchemeResult) =>
          Number(b.is_eligible) - Number(a.is_eligible) || b.eligibility_score - a.eligibility_score
      );

      setAllResults(sorted);
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

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 6);
  };

  const visibleResults = allResults ? allResults.slice(0, visibleCount) : [];

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans pb-20 selection:bg-indigo-500 selection:text-white">
      {/* Scheme Detail Modal */}
      {selectedScheme && (
        <SchemeDetailModal scheme={selectedScheme} onClose={() => setSelectedScheme(null)} />
      )}

      {/* TOP NAVBAR HEADER */}
      <header className="border-b border-slate-800/80 bg-[#090f1d]/90 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition px-2.5 py-1.5 rounded-lg hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div className="h-4 w-[1px] bg-slate-800" />
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black text-white tracking-tight">Scheme Finder</span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-950/80 text-indigo-400 border border-indigo-800/60">
                IN India
              </span>
            </div>
            <span className="hidden md:inline-block text-xs text-slate-500 font-medium">
              National Portal Index • 4,764 Schemes
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Home Search
            </Link>
            <Link
              href="/schemes"
              className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
            >
              Find Schemes
            </Link>
            <Link
              href="/profile"
              className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-teal-500/10 text-teal-400 border border-teal-500/30 hover:bg-teal-500/20 transition"
            >
              Profile
            </Link>
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Smart Offline AI
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">
        {/* TABS SELECTOR */}
        <div className="flex items-center justify-center gap-2 text-xs font-extrabold">
          <button
            type="button"
            onClick={handleUseSavedProfile}
            className={`px-5 py-2.5 rounded-xl transition cursor-pointer ${
              activeTab === 'saved'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Use my saved profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`px-5 py-2.5 rounded-xl transition cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Enter details manually
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        {/* INPUT FORM CARD */}
        <div className="bg-[#090f1d]/90 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Age */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">Age</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  placeholder="Enter age (e.g. 25)"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0c1427] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-slate-100 text-sm font-semibold outline-none transition placeholder-slate-600"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0c1427] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-slate-100 text-sm font-semibold outline-none transition cursor-pointer"
                >
                  <option value="" disabled className="text-slate-600">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="transgender">Transgender</option>
                </select>
              </div>

              {/* State */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">State</label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0c1427] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-slate-100 text-sm font-semibold outline-none transition cursor-pointer"
                >
                  <option value="" disabled className="text-slate-600">Select State</option>
                  {STATES_LIST.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0c1427] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-slate-100 text-sm font-semibold outline-none transition cursor-pointer"
                >
                  <option value="" disabled className="text-slate-600">Select Category</option>
                  <option value="general">General</option>
                  <option value="obc">OBC</option>
                  <option value="sc">SC</option>
                  <option value="st">ST</option>
                  <option value="minority">Minority</option>
                </select>
              </div>

              {/* Occupation */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">Occupation</label>
                <select
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0c1427] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-slate-100 text-sm font-semibold outline-none transition cursor-pointer"
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

              {/* Annual Income */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">Annual Income</label>
                <select
                  value={incomeRange}
                  onChange={(e) => setIncomeRange(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0c1427] border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-slate-100 text-sm font-semibold outline-none transition cursor-pointer"
                >
                  <option value="" disabled className="text-slate-600">Select Annual Income</option>
                  {INCOME_RANGES.map((inc) => (
                    <option key={inc.label} value={inc.label}>
                      {inc.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* DOCUMENTS SELECTION */}
            <div className="pt-4 border-t border-slate-800/80">
              <label className="block text-xs font-bold uppercase text-indigo-400 mb-2 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-indigo-400" /> Documents You Currently Have (For Precise Matching):
              </label>
              <p className="text-xs text-slate-400 mb-3">
                Check all documents in your possession to verify eligibility and document readiness against the scheme database:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {AVAILABLE_DOCUMENTS.map((doc) => {
                  const isChecked = selectedDocs.includes(doc.id);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => toggleDoc(doc.id)}
                      className={`p-3 rounded-xl border cursor-pointer select-none transition-all flex items-center gap-2.5 text-xs font-bold ${
                        isChecked
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-sm shadow-indigo-600/20 ring-1 ring-indigo-500/40'
                          : 'bg-[#0c1427] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleDoc(doc.id);
                        }}
                        className="w-4 h-4 text-indigo-600 rounded accent-indigo-500 cursor-pointer pointer-events-auto shrink-0"
                      />
                      <span>{doc.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold rounded-2xl transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Matching 4,700+ Schemes & Documents...</span>
                </>
              ) : (
                <span>Find Schemes</span>
              )}
            </button>
          </form>
        </div>

        {/* MATCHED SCHEMES RESULTS SECTION */}
        {allResults && (
          <section className="space-y-6 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Matched Schemes</h2>
              <span className="text-xs font-extrabold text-indigo-400 bg-indigo-950/80 border border-indigo-800/60 px-3 py-1.5 rounded-full">
                {eligibleCount} Verified Matches Found
              </span>
            </div>

            {/* 3-COLUMN SCHEME CARDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleResults.map((scheme) => (
                <div
                  key={scheme.scheme_id}
                  onClick={() => handleOpenScheme(scheme.scheme_id, scheme.scheme_name)}
                  className="bg-[#090f1d]/90 rounded-3xl p-6 border border-slate-800/90 hover:border-indigo-500/60 hover:shadow-2xl hover:shadow-indigo-950/40 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {scheme.level && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-purple-950/80 text-purple-300 border border-purple-800/60 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-purple-400" />
                            {scheme.level}
                          </span>
                        )}
                        {scheme.dbt_eligible && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 flex items-center gap-1">
                            <Zap className="w-3 h-3 text-emerald-400" />
                            DBT Eligible
                          </span>
                        )}
                      </div>

                      {/* Mode indicator */}
                      <span className="text-[10px] font-bold text-slate-500">{scheme.mode || 'Online'}</span>
                    </div>

                    {/* Scheme Title */}
                    <h3 className="text-base font-black text-slate-100 group-hover:text-indigo-400 transition leading-snug line-clamp-2">
                      {scheme.scheme_name}
                    </h3>

                    {/* Ministry */}
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                      <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{scheme.ministry || 'Government of India'}</span>
                    </p>

                    {/* Description preview */}
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 font-normal">
                      {scheme.description || 'A welfare initiative providing direct benefits to qualified citizens.'}
                    </p>

                    {/* Document Status Indicators */}
                    {((scheme.matched_documents?.length || 0) > 0 || (scheme.missing_documents?.length || 0) > 0) && (
                      <div className="flex flex-wrap items-center gap-1 text-[10px] pt-2 border-t border-slate-800/80 font-bold">
                        {scheme.matched_documents?.slice(0, 2).map((d) => (
                          <span key={d} className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                            ✓ {d}
                          </span>
                        ))}
                        {scheme.missing_documents?.slice(0, 1).map((d) => (
                          <span key={d} className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/60">
                            ! Needs {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom details link */}
                  <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-indigo-400 group-hover:text-indigo-300">
                    <span>View Scheme Details & Process</span>
                    <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>

            {/* LOAD MORE BUTTON */}
            {visibleCount < allResults.length && (
              <div className="text-center pt-6">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  className="px-8 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white font-extrabold text-xs transition shadow-md cursor-pointer inline-flex items-center gap-2"
                >
                  <span>Load More Schemes</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
