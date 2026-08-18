'use client';

import { useState } from 'react';
import { ExternalLink, X, FileText, ListOrdered, Award, Building2, UserCheck, Sparkles, Bookmark, ChevronDown } from 'lucide-react';
import FormattedText from './FormattedText';

interface SchemeDetailModalProps {
  scheme: any;
  onClose: () => void;
}

export default function SchemeDetailModal({ scheme, onClose }: SchemeDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'eligibility' | 'benefits' | 'process' | 'documents' | 'faqs'>('overview');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  if (!scheme) return null;

  const details = scheme.details_json || {};
  const tags: string[] = details.tags || [];
  const ministry = scheme.ministry || details.nodalMinistryName || 'Government of India';
  const category = scheme.category || scheme.scheme_type || 'General';

  // ── URL resolution: 4-step chain, never fall back to a generic search page ──
  const URL_RE = /https?:\/\/[^\s,)>"']+\.[a-zA-Z]{2,}[^\s,)>"']*/;
  const SKIP = ['myscheme.gov.in', 'google.com', 'youtube.com', 'facebook.com'];
  const extractUrl = (text: string | null | undefined): string | null => {
    if (!text) return null;
    const m = text.match(URL_RE);
    if (!m) return null;
    const url = m[0].replace(/[.,;:]+$/, '');
    const domain = url.split('/')[2] ?? '';
    return SKIP.some((d) => domain.includes(d)) ? null : url;
  };

  let officialUrl: string | null = scheme.official_url || scheme.applyUrl || null;
  const slug = details.slug || scheme.slug;

  if (!officialUrl || officialUrl === 'https://myscheme.gov.in' || officialUrl === 'https://myscheme.gov.in/') {
    // Step 2: try to pull a real URL from the application-process text
    const processText = scheme.process_text || details.process || '';
    const fromText = extractUrl(processText);
    if (fromText) {
      officialUrl = fromText;
    } else if (slug) {
      // Step 3: scheme-specific myscheme deep link (real scheme page, not a search dump)
      officialUrl = `https://www.myscheme.gov.in/schemes/${slug}`;
    } else {
      // Step 4: no usable URL at all
      officialUrl = null;
    }
  }
  // ─────────────────────────────────────────────────────────────────────────────

  const eligibilityText = scheme.eligibility_text || details.eligibility || scheme.description;
  const documentsText = scheme.documents_text || details.documents || '';
  const processText = scheme.process_text || details.process || '';
  const descriptionText = scheme.description || details.detailedDescription || 'No description available for this scheme.';
  const benefitText = scheme.benefit || scheme.benefits_summary || '';

  // FAQs — conditionally hide the tab if no data
  const faqs = details.faqs && Array.isArray(details.faqs) && details.faqs.length > 0 ? details.faqs : null;

  // ── Tag pill color assignments ──────────────────────────────────────────────
  const TAG_COLORS = [
    'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    'bg-amber-500/15 text-amber-300 border-amber-500/30',
    'bg-rose-500/15 text-rose-300 border-rose-500/30',
    'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    'bg-violet-500/15 text-violet-300 border-violet-500/30',
    'bg-pink-500/15 text-pink-300 border-pink-500/30',
    'bg-teal-500/15 text-teal-300 border-teal-500/30',
  ];

  // ── Build tab list — conditionally include FAQs ─────────────────────────────
  const allTabs = [
    { id: 'overview', label: 'Overview', icon: Award },
    { id: 'eligibility', label: 'Eligibility', icon: UserCheck },
    { id: 'benefits', label: 'Benefits', icon: Sparkles },
    { id: 'process', label: 'How to Apply', icon: ListOrdered },
    { id: 'documents', label: 'Documents', icon: FileText },
    ...(faqs ? [{ id: 'faqs', label: 'FAQs', icon: Bookmark }] : []),
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-950 text-slate-100 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-800 flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-8 relative flex-shrink-0 border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer border border-slate-700/80"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400/10 text-amber-400 border border-amber-400/30 uppercase tracking-wider">
              {category}
            </span>
            {scheme.status && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-400/10 text-emerald-400 border border-emerald-400/30">
                {scheme.status}
              </span>
            )}
            {scheme.popularity && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-400/10 text-cyan-400 border border-cyan-400/30">
                🔥 {scheme.popularity}% Score
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white leading-snug mb-2 pr-8">
            {scheme.name}
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-2 font-medium">
            <Building2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
            {ministry}
          </p>
        </div>

        {/* ── Pill-style Tab Navigation ─────────────────────────────────────── */}
        <div className="flex gap-1.5 bg-slate-950 px-5 py-3 overflow-x-auto flex-shrink-0 border-b border-slate-800/60">
          {allTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-3.5 text-xs font-bold flex items-center gap-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Content Body ─────────────────────────────────────────────────── */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-grow text-slate-300">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                  Detailed Description
                </h4>
                <FormattedText
                  content={descriptionText}
                  variant="paragraph"
                  className="text-sm text-slate-300"
                />
              </div>
              {tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">
                    Tags & Topics
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t, idx) => (
                      <span
                        key={idx}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${TAG_COLORS[idx % TAG_COLORS.length]}`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ELIGIBILITY TAB */}
          {activeTab === 'eligibility' && (
            <div className="space-y-6">
              {/* Key Quick Rules */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 block mb-0.5">Age Limits</span>
                  <span className="text-xs font-extrabold text-slate-200">
                    {scheme.min_age || scheme.max_age
                      ? `${scheme.min_age || 'Any'} - ${scheme.max_age || 'Any'} Years`
                      : 'No strict limit'}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 block mb-0.5">Gender</span>
                  <span className="text-xs font-extrabold text-slate-200 capitalize">
                    {scheme.eligible_genders ? scheme.eligible_genders.join(', ') : 'All Genders'}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 block mb-0.5">Max Income</span>
                  <span className="text-xs font-extrabold text-slate-200">
                    {scheme.income_max ? `₹${(scheme.income_max / 100000).toFixed(1)} Lakh/yr` : 'Not Restricted'}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">
                  Eligibility Criteria
                </h4>
                <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/60">
                  <FormattedText
                    content={eligibilityText}
                    variant="bullets"
                    className="text-sm text-slate-300"
                  />
                </div>
              </div>
            </div>
          )}

          {/* BENEFITS TAB */}
          {activeTab === 'benefits' && benefitText && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-800/40">
                <h4 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  🎁 Scheme Benefits
                </h4>
                <FormattedText
                  content={benefitText}
                  variant="numbered"
                  className="text-sm text-amber-100/90"
                />
              </div>
            </div>
          )}

          {/* APPLICATION PROCESS TAB */}
          {activeTab === 'process' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-4">
                  Step-by-Step Application Process
                </h4>
                <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/60">
                  <FormattedText
                    content={processText || "Apply online through the official government web portal. Complete registration and submit the required documents."}
                    variant="steps"
                    className="text-sm text-slate-300"
                  />
                </div>
              </div>

              {/* Apply Now button at bottom of this tab */}
              {officialUrl && (
                <a
                  href={officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-sm shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:from-indigo-500 hover:to-violet-500 transition-all"
                >
                  Apply Now <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {/* DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">
                Required Documents for Verification
              </h4>
              <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/60 max-h-[400px] overflow-y-auto">
                <FormattedText
                  content={documentsText || "Standard documents: Aadhaar Card, Income Certificate, Bank Passbook, Passport Photo."}
                  variant="numbered"
                  className="text-sm text-slate-300"
                />
              </div>
            </div>
          )}

          {/* FAQS TAB (only renders if faqs exist — tab is already hidden otherwise) */}
          {activeTab === 'faqs' && faqs && (
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-4">
                Frequently Asked Questions
              </h4>
              {faqs.map((faq: any, idx: number) => {
                const isExpanded = expandedFaq === idx;
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border transition-all ${
                      isExpanded
                        ? 'bg-slate-900 border-indigo-500/30'
                        : 'bg-slate-900/50 border-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full text-left flex justify-between items-center p-4 cursor-pointer"
                      onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                    >
                      <span className="font-semibold text-sm text-slate-200 pr-4">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 text-sm text-slate-400 leading-relaxed border-t border-slate-800/60">
                        <div className="pt-3">
                          <FormattedText content={faq.answer} variant="paragraph" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-6 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-4 flex-shrink-0">
          {officialUrl ? (
            <a
              href={officialUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-md hover:shadow-lg hover:from-amber-300 hover:to-amber-400 transition flex items-center justify-center gap-2"
            >
              Apply Now <ExternalLink className="w-4 h-4" />
            </a>
          ) : (
            <div className="flex-1 px-5 py-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-500 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 select-none">
              <ExternalLink className="w-4 h-4 opacity-40" />
              Official application link unavailable for this scheme
            </div>
          )}

          <button
            onClick={() => {
              onClose();
            }}
            className="px-6 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-slate-200 font-bold text-xs sm:text-sm hover:bg-slate-800 transition cursor-pointer flex items-center gap-2 whitespace-nowrap"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
