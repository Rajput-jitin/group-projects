'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import SchemeDetailModal from '@/components/SchemeDetailModal';
import FormattedText from '@/components/FormattedText';
import { getBackendUrl } from '@/lib/api';
import { Search, Filter, Sparkles, ExternalLink, ChevronLeft, ChevronRight, CheckCircle2, Mic, MicOff } from 'lucide-react';
const CATEGORIES = [
  'All',
  'Social Welfare',
  'Education',
  'Agriculture',
  'Business',
  'Women & Child',
  'Health',
  'Skills',
  'Housing',
];

const STATES_LIST = [
  'All States/UTs',
  'Andaman & Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra & Nagar Haveli and Daman & Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu & Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

const CAT_TO_TYPE: Record<string, string> = {
  Education: 'scholarship',
  Agriculture: 'agriculture',
  'Women & Child': 'women_welfare',
  Housing: 'housing',
  Skills: 'employment',
  Health: 'health',
  Business: 'startup',
  'Social Welfare': 'pension',
};

const TYPE_MAP: Record<string, string> = {
  agriculture: 'Agriculture',
  scholarship: 'Education',
  women_welfare: 'Women & Child',
  housing: 'Housing',
  employment: 'Skills',
  health: 'Health',
  startup: 'Business',
  pension: 'Social Welfare',
  insurance: 'Health',
  skill_development: 'Skills',
};

/** Regex to pull the first https URL out of a block of text */
const URL_IN_TEXT_RE = /https?:\/\/[^\s,)>"']+\.[a-zA-Z]{2,}[^\s,)>"']*/;
const SKIP_DOMAINS = ['myscheme.gov.in', 'google.com', 'youtube.com', 'facebook.com'];

function extractUrlFromText(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.match(URL_IN_TEXT_RE);
  if (!m) return null;
  const url = m[0].replace(/[.,;:]+$/, '');
  const domain = url.split('/')[2] ?? '';
  if (SKIP_DOMAINS.some((d) => domain.includes(d))) return null;
  return url;
}

function mapScheme(s: any) {
  let targetUrl: string | null = s.official_url ?? null;
  const slug = s.details_json?.slug as string | undefined;

  // 1. If missing or only the bare myscheme root, try harder.
  if (!targetUrl || targetUrl === 'https://myscheme.gov.in' || targetUrl === 'https://myscheme.gov.in/') {
    // 2. Try to extract a real URL from the application-process text.
    const fromText = extractUrlFromText(s.process_text);
    if (fromText) {
      targetUrl = fromText;
    } else if (slug) {
      // 3. Use the scheme-specific myscheme deep link (real page, not a search dump).
      targetUrl = `https://www.myscheme.gov.in/schemes/${slug}`;
    } else {
      // 4. No usable URL — surface an honest null so the UI shows a clear message.
      targetUrl = null;
    }
  }

  return {
    id: s.id,
    name: s.name,
    ministry: s.ministry || 'Government of India',
    category: TYPE_MAP[s.scheme_type] || 'Social Welfare',
    scheme_type: s.scheme_type,
    benefit: s.benefits_summary || 'Financial & Welfare Support',
    description: s.description,
    popularity: Math.round(s.popularity_score || 85),
    status: s.status ? s.status.charAt(0).toUpperCase() + s.status.slice(1) : 'Open',
    official_url: targetUrl,
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

function SchemesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || 'All';
  const stateParam = searchParams.get('state') || 'All States/UTs';

  const [schemes, setSchemes] = useState<any[]>([]);
  const [search, setSearch] = useState(queryParam);
  const [selectedCat, setSelectedCat] = useState(categoryParam);
  const [levelFilter, setLevelFilter] = useState<'All' | 'Central' | 'State'>('All');
  const [selectedState, setSelectedState] = useState(stateParam);
  const [dbtOnly, setDbtOnly] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(16);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedScheme, setSelectedScheme] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Handle Speech Recognition for Voice Search
  const handleVoiceSearch = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice recognition is not supported in this browser. Please type your query.');
      return;
    }

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearch(transcript);
        setIsListening(false);
        setPage(1);
        fetchSchemes(transcript, selectedCat, levelFilter, selectedState, dbtOnly, 1);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert('Microphone access was denied or not allowed. Please allow microphone permission in your browser URL bar to use voice search.');
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('Speech recognition error:', event.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  // Sync state with URL params on mount / navigation
  useEffect(() => {
    if (queryParam !== undefined) setSearch(queryParam);
    if (categoryParam) setSelectedCat(categoryParam);
    if (stateParam) setSelectedState(stateParam);
  }, [queryParam, categoryParam, stateParam]);

  const fetchSchemes = useCallback(
    async (
      q: string,
      cat: string,
      lvl: string,
      st: string,
      dbt: boolean,
      pageNum: number
    ) => {
      setLoading(true);
      try {
        const backendUrl = getBackendUrl();
        const params = new URLSearchParams({
          page: pageNum.toString(),
          page_size: pageSize.toString(),
        });

        if (q.trim()) params.set('q', q.trim());
        if (cat !== 'All' && CAT_TO_TYPE[cat]) params.set('scheme_type', CAT_TO_TYPE[cat]);
        if (st !== 'All States/UTs') params.set('state', st);
        if (lvl !== 'All') params.set('level', lvl);
        if (dbt) params.set('dbt', 'true');

        const res = await fetch(`${backendUrl}/api/schemes?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();

        let items = (data.items || []).map(mapScheme);

        setSchemes(items);
        setTotalCount(data.total || items.length);
        setTotalPages(Math.max(1, Math.ceil((data.total || items.length) / pageSize)));
      } catch (e) {
        console.warn('Backend fetch failed', e);
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  // Trigger fetch when search or filters change; debounce search input
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any pending debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchSchemes(search, selectedCat, levelFilter, selectedState, dbtOnly, 1);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, selectedCat, levelFilter, selectedState, dbtOnly, fetchSchemes]);

  // Fetch when page changes explicitly
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      fetchSchemes(search, selectedCat, levelFilter, selectedState, dbtOnly, newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen">
      {/* Detail Modal */}
      {selectedScheme && (
        <SchemeDetailModal scheme={selectedScheme} onClose={() => setSelectedScheme(null)} />
      )}

      {/* Header Title */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          Find Government Schemes
        </h1>
        <p className="text-sm sm:text-base text-slate-400 mt-3 font-medium">
          {totalCount > 0
            ? `Showing page ${page} of ${totalPages} (${totalCount.toLocaleString()} total matching schemes)`
            : 'Filter through 4,700+ subsidies, scholarships, healthcare benefits, and grants.'}
        </p>
      </div>

      {/* FILTER BAR SECTION */}
      <div className="bg-slate-900/90 rounded-3xl p-6 shadow-2xl border border-slate-800 mb-8 space-y-5">
        {/* Search Input */}
        <div className="relative flex items-center">
          <Search className="w-5 h-5 absolute left-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isListening ? "Listening... Speak your query" : "Search all 4,700+ schemes by keyword, ministry or benefit..."}
            className="w-full pl-12 pr-12 py-3 rounded-2xl border border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-slate-950 text-slate-100 placeholder-slate-500 font-medium"
          />
          <button
            type="button"
            onClick={handleVoiceSearch}
            title="Voice Search"
            className={`absolute right-3 p-2 rounded-xl transition cursor-pointer flex-shrink-0 ${
              isListening
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        </div>
        {isListening && (
          <p className="text-xs text-rose-400 font-bold -mt-2 animate-pulse pl-2">
            🎙 Listening... Speak now
          </p>
        )}

        {/* Filters Controls Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80">
          {/* Level Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Scheme Level
            </label>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['All', 'Central', 'State'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevelFilter(lvl)}
                  className={`flex-1 py-1.5 text-xs font-extrabold rounded-lg transition ${
                    levelFilter === lvl
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* State / UT Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              State / UT Selection
            </label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {STATES_LIST.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* DBT Only Toggle */}
          <div className="flex items-center justify-between bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 self-end">
            <div>
              <span className="text-xs font-black text-slate-200 block">Direct Benefit Transfer (DBT)</span>
              <span className="text-[10px] text-slate-500 font-semibold block">Cash/Account Transfers Only</span>
            </div>
            <button
              type="button"
              onClick={() => setDbtOnly(!dbtOnly)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                dbtOnly ? 'bg-amber-400' : 'bg-slate-800'
              }`}
            >
              <div
                className={`bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  dbtOnly ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
          <span className="text-xs font-bold text-slate-400 mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-amber-400" /> Category:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedCat === cat
                  ? 'bg-amber-400/20 text-amber-400 border border-amber-400/40 shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Schemes Grid */}
      {loading ? (
        <div className="text-center py-20 font-bold text-slate-500">
          {search ? `Searching schemes for "${search}"...` : 'Loading scheme catalog...'}
        </div>
      ) : schemes.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-slate-800">
          <p className="text-slate-300 font-bold text-lg">No schemes found</p>
          <p className="text-slate-500 text-xs mt-2">Try relaxing your search terms or state filter.</p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedCat('All');
              setLevelFilter('All');
              setSelectedState('All States/UTs');
              setDbtOnly(false);
            }}
            className="mt-4 px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-black hover:bg-amber-300 transition cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {schemes.map((scheme) => (
              <div
                key={scheme.id}
                className="bg-slate-900/90 rounded-3xl p-5 border border-slate-800/80 hover:border-amber-400/50 shadow-lg hover:shadow-2xl transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400/10 text-amber-400 border border-amber-400/30 uppercase tracking-wider">
                      {scheme.category}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> {scheme.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-white leading-snug mb-1 line-clamp-2">
                    {scheme.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mb-3 line-clamp-1">🏛 {scheme.ministry}</p>

                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-medium mb-4">
                    🎁 <span className="line-clamp-2">{scheme.benefit}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80 mt-auto">
                  <button
                    onClick={() => setSelectedScheme(scheme)}
                    className="flex-1 py-2 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-200 font-bold text-xs transition cursor-pointer"
                  >
                    Details
                  </button>

                  {scheme.official_url ? (
                    <a
                      href={scheme.official_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs text-center transition flex items-center justify-center gap-1"
                    >
                      Apply <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span
                      title="Official application link unavailable for this scheme"
                      className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-500 font-black text-xs text-center cursor-not-allowed select-none flex items-center justify-center gap-1"
                    >
                      Link Unavailable
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* PAGINATION CONTROLS */}
          <div className="flex items-center justify-between mt-10 p-4 bg-slate-900/90 rounded-2xl border border-slate-800">
            <button
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Previous Page
            </button>

            <span className="text-xs font-black text-slate-400">
              Page <strong className="text-amber-400">{page}</strong> of <strong className="text-white">{totalPages}</strong>
            </span>

            <button
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
              className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
            >
              Next Page <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function SchemesPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-400">Loading catalog...</div>}>
      <SchemesContent />
    </Suspense>
  );
}
