'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getBackendUrl } from '@/lib/api';
import SchemeDetailModal from '@/components/SchemeDetailModal';
import { Search, Filter, Sparkles, ExternalLink } from 'lucide-react';

const CATEGORIES = ['All', 'Student', 'Farmer', 'Women', 'Housing', 'Employment', 'Health', 'Startup', 'Senior Citizen'];

const CAT_TO_TYPE: Record<string, string> = {
  Student: 'scholarship',
  Farmer: 'agriculture',
  Women: 'women_welfare',
  Housing: 'housing',
  Employment: 'employment',
  Health: 'health',
  Startup: 'startup',
  'Senior Citizen': 'pension',
};

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

function mapScheme(s: any) {
  return {
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
  };
}

export default function SchemesPage() {
  const [schemes, setSchemes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [selectedScheme, setSelectedScheme] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchSchemes = useCallback(async (q: string, cat: string) => {
    setLoading(true);
    try {
      const backendUrl = getBackendUrl();
      const params = new URLSearchParams({ page: '1', page_size: '500' });
      if (q.trim()) params.set('q', q.trim());
      if (cat !== 'All' && CAT_TO_TYPE[cat]) params.set('scheme_type', CAT_TO_TYPE[cat]);

      const res = await fetch(`${backendUrl}/api/schemes?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setSchemes((data.items || []).map(mapScheme));
      setTotal(data.total || 0);
    } catch (e) {
      console.warn('Backend fetch failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search: fires 400ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSchemes(search, selectedCat);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, selectedCat, fetchSchemes]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen">
      {/* Detail Modal */}
      {selectedScheme && (
        <SchemeDetailModal scheme={selectedScheme} onClose={() => setSelectedScheme(null)} />
      )}

      <div className="text-center max-w-3xl mx-auto mb-10">
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Browse Government Welfare Schemes
        </h1>
        <p className="text-sm sm:text-base text-slate-600 mt-3 font-medium">
          {total > 0 ? `Showing ${schemes.length.toLocaleString()} of ${total.toLocaleString()} schemes` : 'Filter through 4,700+ subsidies, scholarships, healthcare benefits, and farmer schemes.'}
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8 space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all 4,700+ schemes by keyword, ministry or benefit (e.g. PM Kisan, Health, Scholarship)..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedCat === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Schemes Grid */}
      {loading ? (
        <div className="text-center py-20 font-bold text-slate-400">
          {search ? `Searching across all schemes for "${search}"...` : 'Loading government schemes...'}
        </div>
      ) : schemes.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-500 font-semibold text-lg">No schemes found for "{search}"</p>
          <p className="text-slate-400 text-sm mt-2">Try a different keyword or clear the search.</p>
          <button onClick={() => { setSearch(''); setSelectedCat('All'); }} className="mt-4 px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition">
            Clear Search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schemes.map((scheme) => (
            <div
              key={scheme.id}
              className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 uppercase tracking-wider">
                    {scheme.category}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> {scheme.status}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 leading-snug mb-1 line-clamp-2">
                  {scheme.name}
                </h3>
                <p className="text-xs text-slate-500 mb-3 line-clamp-1">{scheme.ministry}</p>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-800 font-semibold mb-4">
                  🎁 <span className="line-clamp-2">{scheme.benefit}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-100 mt-auto">
                <button
                  onClick={() => setSelectedScheme(scheme)}
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
                  Official Portal <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
