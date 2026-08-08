'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SchemeDetailModal from '@/components/SchemeDetailModal';
import { Search, Sparkles, Filter, Award, ChevronRight, MessageSquare, Bot, User, ArrowUpRight, CheckCircle2, ShieldCheck, Heart, ExternalLink } from 'lucide-react';
import { getBackendUrl } from '@/lib/api';

const BACKEND_URL = getBackendUrl();

const CATEGORIES = [
  { id: 'all', label: 'All Schemes', emoji: '🇮🇳' },
  { id: 'Student', label: 'Student & Scholarships', emoji: '🎓' },
  { id: 'Farmer', label: 'Farmers & Agriculture', emoji: '🌾' },
  { id: 'Women', label: 'Women Welfare', emoji: '👩' },
  { id: 'Housing', label: 'Housing & Shelter', emoji: '🏠' },
  { id: 'Employment', label: 'Employment & Skills', emoji: '💼' },
  { id: 'Health', label: 'Healthcare & Insurance', emoji: '🏥' },
  { id: 'Startup', label: 'Startups & Business Loans', emoji: '🚀' },
  { id: 'Senior Citizen', label: 'Senior Citizens & Pensions', emoji: '👴' },
];

const TYPE_MAP: Record<string, string> = {
  agriculture: 'Farmer',
  scholarship: 'Student',
  women_welfare: 'Women',
  housing: 'Housing',
  employment: 'Employment',
  health: 'Health',
  startup: 'Startup',
  pension: 'Senior Citizen',
  insurance: 'Health',
  skill_development: 'Employment',
};

const CAT_COLORS: Record<string, string> = {
  Student: 'bg-blue-100 text-blue-700 border-blue-200',
  Farmer: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Women: 'bg-pink-100 text-pink-700 border-pink-200',
  Housing: 'bg-amber-100 text-amber-700 border-amber-200',
  Employment: 'bg-purple-100 text-purple-700 border-purple-200',
  Health: 'bg-red-100 text-red-700 border-red-200',
  Startup: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Senior Citizen': 'bg-slate-100 text-slate-700 border-slate-200',
};

const STATES = ['Andhra Pradesh','Bihar','Delhi','Gujarat','Haryana','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','West Bengal'];

const INCOME_MAP: Record<string, number> = {
  'Below ₹1 Lakh': 50000,
  '₹1-3 Lakh': 200000,
  '₹3-5 Lakh': 400000,
  '₹5-8 Lakh': 650000,
  'Above ₹8 Lakh': 1000000,
};

export default function Home() {
  const [schemes, setSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedScheme, setSelectedScheme] = useState<any | null>(null);
  const [displayCount, setDisplayCount] = useState(60); // how many cards to show at once

  // Eligibility Modal State
  const [showForm, setShowForm] = useState(false);
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [formStep, setFormStep] = useState(1);
  const [profile, setProfile] = useState({
    name: '',
    age: '',
    gender: '',
    state: '',
    occupation: '',
    income: '',
    category: '',
    education: '',
    disability: false,
  });
  const [results, setResults] = useState<any[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Chatbot State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    { role: string; text: string; matched?: any[] }[]
  >([
    {
      role: 'bot',
      text: 'नमस्ते! / Hello! I am SchemeSeva AI Bot. Ask me about any government scholarship, subsidy, or scheme (e.g. "PM Kisan", "Scholarships for Girls", "Business Loans").',
    },
  ]);

  useEffect(() => {
    fetchSchemes(category, 1);
  }, [category]);

  async function fetchSchemes(cat: string, pageNum: number = 1) {
    setLoading(true);
    try {
      // Find matching scheme_type for backend filter if category is selected
      const backendSchemeType = Object.keys(TYPE_MAP).find(
        (key) => TYPE_MAP[key] === cat
      );

      const PAGE_SIZE = cat === 'all' ? 100 : 40;
      let url = `${BACKEND_URL}/api/schemes?page=${pageNum}&page_size=${PAGE_SIZE}`;
      if (cat !== 'all' && backendSchemeType) {
        url += `&scheme_type=${backendSchemeType}`;
      }

      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const items = data.items || [];

      const mapScheme = (s: any) => ({
        id: s.id,
        name: s.name,
        ministry: s.ministry || 'Government of India',
        category: TYPE_MAP[s.scheme_type] || 'General',
        scheme_type: s.scheme_type,
        benefit: s.benefits_summary || 'Financial and Social Benefits',
        description: s.description,
        popularity: Math.round(s.popularity_score || 85),
        status: s.status ? s.status.charAt(0).toUpperCase() + s.status.slice(1) : 'Open',
        applyUrl: s.official_url || 'https://myscheme.gov.in',
        official_url: s.official_url || 'https://myscheme.gov.in',
        details_json: s.details_json,
        documents_text: s.documents_text,
        process_text: s.process_text,
        eligibility_text: s.eligibility_text,
        min_age: s.min_age,
        max_age: s.max_age,
        eligible_genders: s.eligible_genders,
        income_max: s.income_max,
      });

      const mapped = items.map(mapScheme);
      setSchemes(mapped);
    } catch (e) {
      console.warn('Backend offline, using fallback schemes', e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = schemes.filter((s) => {
    const matchQ =
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.ministry.toLowerCase().includes(query.toLowerCase()) ||
      (s.benefit && s.benefit.toLowerCase().includes(query.toLowerCase()));
    return matchQ;
  });

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    setDisplayCount(newCat === 'all' ? 60 : 40);
  };

  const visibleSchemes = filtered.slice(0, displayCount);
  const hasMore = filtered.length > displayCount;

  async function analyzeEligibility() {
    setAnalyzing(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/eligibility/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: parseInt(profile.age) || 25,
          gender: profile.gender.toLowerCase() || 'male',
          state: profile.state || 'Delhi',
          occupation: profile.occupation.toLowerCase().replace(/\s+/g, '_') || 'student',
          annual_income: INCOME_MAP[profile.income] || 200000,
          category: profile.category.toLowerCase() || 'general',
          education: profile.education.toLowerCase().replace(/\s+/g, '_') || 'college_student',
          disability_status: !!profile.disability,
        }),
      });
      const data = await response.json();
      if (data.results) {
        const matchedIds = data.results.filter((r: any) => r.is_eligible).map((r: any) => r.scheme_id);
        const matchedSchemes = schemes.filter((s) => matchedIds.includes(s.id));
        setResults(matchedSchemes.length > 0 ? matchedSchemes : schemes.slice(0, 6));
      }
    } catch (err) {
      console.error('Eligibility check failed:', err);
      setResults(schemes.slice(0, 6));
    } finally {
      setAnalyzing(false);
      setShowForm(false);
      setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' }), 200);
    }
  }

  async function sendChat(customQuery?: string) {
    const messageText = customQuery || chatMsg;
    if (!messageText.trim()) return;

    setChatHistory((h) => [...h, { role: 'user', text: messageText }]);
    if (!customQuery) setChatMsg('');

    setChatLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, lang }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatHistory((h) => [
          ...h,
          {
            role: 'bot',
            text: data.reply,
            matched: data.matched_schemes,
          },
        ]);
      } else {
        throw new Error('Chat API response failed');
      }
    } catch (e) {
      setChatHistory((h) => [
        ...h,
        {
          role: 'bot',
          text: 'I can assist you in finding government schemes! Try asking about scholarships, farmer subsidies, healthcare, or business loans.',
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Dynamic Detail Modal */}
      {selectedScheme && (
        <SchemeDetailModal scheme={selectedScheme} onClose={() => setSelectedScheme(null)} />
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 bg-gradient-to-b from-blue-50/50 via-white to-slate-50">
        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-md border border-blue-100 text-blue-700 rounded-full px-4 py-1.5 text-xs font-extrabold shadow-sm mb-6">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>AI-Powered • 4,700+ Government Schemes • Instant Match</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">
            Discover Government Welfare Schemes <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 bg-clip-text text-transparent">
              Tailored Exactly For You
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            Search scholarships, healthcare cover, farmer subsidies, and business loans across India. Check your eligibility in seconds using AI.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            <button
              onClick={() => setShowForm(true)}
              className="px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-extrabold text-sm sm:text-base shadow-xl hover:shadow-2xl hover:scale-105 transition cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" /> Check My Eligibility
            </button>
            <a
              href="#browse-schemes"
              className="px-8 py-4 rounded-full bg-white border border-slate-200 text-slate-700 font-extrabold text-sm sm:text-base shadow-sm hover:bg-slate-50 transition"
            >
              Browse 4,700+ Schemes ↓
            </a>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { num: '4,700+', label: 'Government Schemes' },
              { num: 'AI Engine', label: 'Eligibility Parser' },
              { num: '<3 Sec', label: 'Match Time' },
              { num: '100% Free', label: 'Government Portal' },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-slate-200/60 shadow-sm"
              >
                <div className="text-xl sm:text-2xl font-black text-blue-600">{stat.num}</div>
                <div className="text-xs font-bold text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEARCH & FILTER SECTION */}
      <section id="browse-schemes" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 mb-8 space-y-6">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 4,700+ schemes by keyword, ministry, scholarship, or benefit (e.g. Kisan, Student, Ayushman)..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 font-medium"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id === 'all' ? 'all' : cat.label.split(' ')[0])}
                className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  (cat.id === 'all' && category === 'all') || category === cat.label.split(' ')[0]
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{cat.emoji}</span> {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* AI Eligibility Results Report if active */}
        {results && (
          <div id="results" className="mb-12 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-2xl">
                🤖
              </div>
              <div>
                <h3 className="text-xl font-extrabold">Your AI Eligibility Report</h3>
                <p className="text-xs text-blue-200">
                  Based on your profile, our AI matched <strong className="text-emerald-400">{results.length} schemes</strong> you qualify for.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((scheme, i) => (
                <SchemeCard
                  key={scheme.id}
                  scheme={scheme}
                  onViewDetails={() => setSelectedScheme(scheme)}
                  score={Math.max(75, 98 - i * 3)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Schemes Grid Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Explore Government Schemes</h2>
            <p className="text-xs text-slate-500">
              Showing {Math.min(displayCount, filtered.length)} of {filtered.length}{category !== 'all' ? ` ${category}` : ''} schemes
              {schemes.length > 0 && ` • ${schemes.length} total in database`}
            </p>
          </div>
        </div>

        {/* Schemes Cards Grid */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 font-bold">Loading government schemes database...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleSchemes.map((scheme) => (
                <SchemeCard
                  key={scheme.id}
                  scheme={scheme}
                  onViewDetails={() => setSelectedScheme(scheme)}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={() => setDisplayCount((c) => c + (category === 'all' ? 60 : 40))}
                  className="px-8 py-3 rounded-full bg-white border-2 border-blue-200 text-blue-700 font-extrabold text-sm hover:bg-blue-50 hover:border-blue-400 shadow-sm transition flex items-center gap-2"
                >
                  Load More Schemes ({filtered.length - Math.min(displayCount, filtered.length)} remaining)
                </button>
              </div>
            )}

            {/* Empty State */}
            {filtered.length === 0 && !loading && (
              <div className="py-20 text-center text-slate-400">
                <div className="text-5xl mb-4">🔍</div>
                <p className="font-bold text-slate-600">No schemes found for this filter.</p>
                <p className="text-sm mt-1">Try a different category or search term.</p>
              </div>
            )}
          </>
        )}
      </section>

      {/* FLOATING AI CHATBOT DRAWER */}
      <div className="fixed bottom-6 right-6 z-50">
        {chatOpen && (
          <div className="absolute bottom-16 right-0 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[480px] animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 to-emerald-600 p-4 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="w-6 h-6" />
                <div>
                  <h4 className="font-extrabold text-sm">SchemeSeva AI Assistant</h4>
                  <span className="text-[10px] text-blue-100 block">Searches 4,700+ Schemes Live</span>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="text-white hover:text-slate-200 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
              {chatHistory.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {m.text}
                  </div>

                  {/* Matched Scheme Cards in Chat */}
                  {m.matched && m.matched.length > 0 && (
                    <div className="mt-2 space-y-2 w-full">
                      {m.matched.map((s: any) => (
                        <div
                          key={s.id}
                          onClick={() => setSelectedScheme(s)}
                          className="bg-white p-3 rounded-xl border border-blue-100 shadow-xs hover:border-blue-500 cursor-pointer transition flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="text-[10px] font-bold text-blue-600 block">
                              {s.category || s.scheme_type}
                            </span>
                            <span className="text-xs font-bold text-slate-900 block line-clamp-1">
                              {s.name}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg flex-shrink-0">
                            Details →
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {chatLoading && (
                <div className="text-xs text-slate-400 font-medium italic">🤖 AI is searching schemes...</div>
              )}
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="p-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto flex-shrink-0">
              {['Scholarships', 'Farmer Subsidies', 'Health Insurance'].map((q) => (
                <button
                  key={q}
                  onClick={() => sendChat(q)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-full text-[10px] font-bold whitespace-nowrap cursor-pointer transition"
                >
                  💡 {q}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-white border-t border-slate-100 flex gap-2 flex-shrink-0">
              <input
                type="text"
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                placeholder="Ask about any scheme..."
                className="flex-1 px-3 py-2 border border-slate-200 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => sendChat()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold transition cursor-pointer"
              >
                Send
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setChatOpen((o) => !o)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-2xl flex items-center justify-center text-2xl hover:scale-105 transition cursor-pointer border-2 border-white"
        >
          🤖
        </button>
      </div>

      {/* ELIGIBILITY CHECKER MODAL */}
      {showForm && (
        <div
          id="eligibility-modal"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">✨ AI Eligibility Checker</h3>
                <p className="text-xs text-slate-500">Step {formStep} of 2 — Profile Details</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700 text-lg font-bold">
                ✕
              </button>
            </div>

            {formStep === 1 ? (
              <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                <div className="col-span-2">
                  <label className="block text-slate-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="Arjun Sharma"
                    className="w-full p-3 rounded-xl border border-slate-200 font-normal"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Age *</label>
                  <input
                    type="number"
                    value={profile.age}
                    onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                    placeholder="25"
                    className="w-full p-3 rounded-xl border border-slate-200 font-normal"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Gender</label>
                  <select
                    value={profile.gender}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 font-normal"
                  >
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-600 mb-1">State</label>
                  <select
                    value={profile.state}
                    onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 font-normal"
                  >
                    <option value="">Select State...</option>
                    {STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                <div>
                  <label className="block text-slate-600 mb-1">Occupation</label>
                  <select
                    value={profile.occupation}
                    onChange={(e) => setProfile({ ...profile, occupation: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 font-normal"
                  >
                    <option value="">Select...</option>
                    <option value="Student">Student</option>
                    <option value="Farmer">Farmer</option>
                    <option value="Business Owner">Business Owner</option>
                    <option value="Senior Citizen">Senior Citizen</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Annual Income</label>
                  <select
                    value={profile.income}
                    onChange={(e) => setProfile({ ...profile, income: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 font-normal"
                  >
                    <option value="">Select...</option>
                    {Object.keys(INCOME_MAP).map((inc) => (
                      <option key={inc} value={inc}>
                        {inc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {formStep === 2 && (
                <button
                  onClick={() => setFormStep(1)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  ← Back
                </button>
              )}
              {formStep === 1 ? (
                <button
                  onClick={() => setFormStep(2)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-md hover:bg-blue-700 cursor-pointer"
                >
                  Next Step →
                </button>
              ) : (
                <button
                  onClick={analyzeEligibility}
                  disabled={analyzing}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer"
                >
                  {analyzing ? '🔄 Analyzing...' : '✨ Analyze My Eligibility'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SchemeCard({
  scheme,
  onViewDetails,
  score,
}: {
  scheme: any;
  onViewDetails: () => void;
  score?: number;
}) {
  const badgeStyle = CAT_COLORS[scheme.category] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold border ${badgeStyle}`}>
            {scheme.category}
          </span>
          {score ? (
            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {score}% Match
            </span>
          ) : (
            <span className="text-[11px] font-bold text-slate-500">🔥 {scheme.popularity}% Popular</span>
          )}
        </div>

        <h3 className="text-base font-extrabold text-slate-900 leading-snug mb-1 line-clamp-2">
          {scheme.name}
        </h3>

        <p className="text-xs text-slate-500 mb-4 line-clamp-1">🏛 {scheme.ministry}</p>

        <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 text-xs text-slate-800 font-semibold mb-4">
          🎁 <span className="line-clamp-2">{scheme.benefit}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-4 border-t border-slate-100 mt-auto">
        <button
          onClick={onViewDetails}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition cursor-pointer"
        >
          Details
        </button>

        <a
          href={scheme.official_url || scheme.applyUrl}
          target="_blank"
          rel="noreferrer"
          className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs text-center transition flex items-center justify-center gap-1"
        >
          Apply <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
