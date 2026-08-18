'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SchemeDetailModal from '@/components/SchemeDetailModal';
import { Search, Mic, MicOff, Sparkles, ArrowRight, ShieldCheck, Award, HeartHandshake, BookOpen, GraduationCap, Sprout, Briefcase, HeartPulse, Building, Baby, Wrench, Home as HomeIcon } from 'lucide-react';
import { getBackendUrl } from '@/lib/api';

const CATEGORY_TILES = [
  { id: 'Social Welfare', label: 'Social Welfare', icon: HeartHandshake, count: '1,240+', color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400' },
  { id: 'Education', label: 'Education', icon: GraduationCap, count: '850+', color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-400' },
  { id: 'Agriculture', label: 'Agriculture', icon: Sprout, count: '620+', color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400' },
  { id: 'Business', label: 'Business & Micro-Loans', icon: Briefcase, count: '490+', color: 'from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-400' },
  { id: 'Women & Child', label: 'Women & Child', icon: Baby, count: '540+', color: 'from-pink-500/20 to-rose-500/10 border-pink-500/30 text-pink-400' },
  { id: 'Health', label: 'Health & Healthcare', icon: HeartPulse, count: '410+', color: 'from-red-500/20 to-rose-500/10 border-red-500/30 text-red-400' },
  { id: 'Skills', label: 'Skills & Employment', icon: Wrench, count: '380+', color: 'from-cyan-500/20 to-sky-500/10 border-cyan-500/30 text-cyan-400' },
  { id: 'Housing', label: 'Housing & Shelter', icon: HomeIcon, count: '290+', color: 'from-violet-500/20 to-purple-500/10 border-violet-500/30 text-violet-400' },
];

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
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
        setSearchQuery(transcript);
        setIsListening(false);
        // Automatically redirect with query
        router.push(`/schemes?q=${encodeURIComponent(transcript)}`);
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/schemes?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/schemes');
    }
  };

  const handleCategoryClick = (catName: string) => {
    router.push(`/schemes?category=${encodeURIComponent(catName)}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden py-16 sm:py-24 border-b border-slate-800/80 bg-radial from-slate-900 via-slate-950 to-slate-950">
        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-slate-900/90 border border-slate-800 text-amber-400 rounded-full px-4 py-1.5 text-xs font-black shadow-lg mb-6">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>AI-Powered Welfare Engine • 4,700+ Verified Schemes</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6">
            Find Government Schemes <br />
            <span className="bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Tailored For Your Rights & Needs
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            Instantly search subsidies, scholarships, healthcare benefits, and farmer grants across India with voice assistance and smart filters.
          </p>

          {/* SEARCH BAR WITH VOICE SEARCH */}
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto mb-12 relative">
            <div className="relative flex items-center bg-slate-900/90 border border-slate-700/80 hover:border-amber-400/50 rounded-3xl shadow-2xl p-2 transition">
              <Search className="w-5 h-5 ml-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isListening ? "Listening... Speak your scheme query" : "Search PM Kisan, Scholarships, Ayushman, Business loans..."}
                className="w-full px-4 py-3 bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none font-medium"
              />

              {/* Speak-to-Search Button */}
              <button
                type="button"
                onClick={handleVoiceSearch}
                title="Voice Search"
                className={`p-3 rounded-2xl transition cursor-pointer flex-shrink-0 mr-1 ${
                  isListening
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                    : 'bg-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-700'
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                type="submit"
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-md transition cursor-pointer flex items-center gap-1.5 flex-shrink-0"
              >
                Search <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {isListening && (
              <p className="text-xs text-rose-400 font-bold mt-2 animate-pulse">
                🎙 Listening... Speak now (e.g., "scholarships for girls in Maharashtra")
              </p>
            )}
          </form>
        </div>
      </section>

      {/* BROWSE BY CATEGORY SECTION */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Browse by Category</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Select a category to filter through all 4,700+ active government schemes
            </p>
          </div>
          <button
            onClick={() => router.push('/schemes')}
            className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            View All Catalog →
          </button>
        </div>

        {/* Category Tiles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {CATEGORY_TILES.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`bg-gradient-to-br ${cat.color} bg-slate-900/90 rounded-3xl p-6 border shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between group`}
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black text-slate-100 mb-1 group-hover:text-amber-400 transition">
                    {cat.label}
                  </h3>
                  <span className="text-xs font-extrabold text-slate-400 block">{cat.count} Schemes</span>
                </div>

                <div className="pt-4 mt-6 border-t border-slate-800/60 flex items-center justify-between text-xs font-extrabold text-slate-400 group-hover:text-slate-200">
                  <span>Explore Schemes</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
