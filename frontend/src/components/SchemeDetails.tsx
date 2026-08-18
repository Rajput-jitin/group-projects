import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getBackendUrl } from '@/lib/api';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { ExternalLink, Award, UserCheck, Sparkles, ListOrdered, FileText, Bookmark, ChevronDown } from 'lucide-react';

interface Scheme {
  title: string;
  official_url?: string | null;
  level?: string; // "Central" | "State"
  dbt_eligible?: boolean;
  detailed_description_md: string;
  eligibility_md: string;
  benefits_md: string;
  application_process_md: string;
  documents_md: string;
  application_process: string[]; // array of URLs
  faqs?: { question: string; answer: string }[];
}

const ALL_TABS = [
  { id: 'overview', label: 'Overview', icon: Award },
  { id: 'eligibility', label: 'Eligibility', icon: UserCheck },
  { id: 'benefits', label: 'Benefits', icon: Sparkles },
  { id: 'process', label: 'How to Apply', icon: ListOrdered },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'faqs', label: 'FAQs', icon: Bookmark },
];

export const SchemeDetails: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [scheme, setScheme] = useState<Scheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;
    const fetchScheme = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${getBackendUrl()}/api/schemes/${slug}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // Map backend fields to our interface (adjust as needed)
        const mapped: Scheme = {
          title: data.name,
          official_url: data.official_url ?? null,
          level: data.details_json?.level?.label ?? undefined,
          dbt_eligible: data.benefit?.toLowerCase().includes('dbt') ?? false,
          detailed_description_md: data.detailed_description_md ?? '',
          eligibility_md: data.eligibility_md ?? '',
          benefits_md: data.benefits_md ?? '',
          application_process_md: data.application_process_md ?? '',
          documents_md: data.documents_md ?? '',
          application_process: data.application_process ?? [],
          faqs: data.details_json?.faqs ?? [],
        };
        setScheme(mapped);
        setError(null);
      } catch (e: any) {
        setError(e.message);
        setScheme(null);
      } finally {
        setLoading(false);
      }
    };
    fetchScheme();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="spinner border-4 border-t-amber-400 rounded-full w-12 h-12 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-400 text-center mt-8">Error: {error}</div>;
  }

  if (!scheme) return null;

  const hasFaqs = scheme.faqs && scheme.faqs.length > 0;

  // Filter tabs — hide FAQs if no data
  const tabs = ALL_TABS.filter((tab) => {
    if (tab.id === 'faqs' && !hasFaqs) return false;
    return true;
  });

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <MarkdownRenderer markdown={scheme.detailed_description_md} />;
      case 'eligibility':
        return <MarkdownRenderer markdown={scheme.eligibility_md} />;
      case 'benefits':
        return <MarkdownRenderer markdown={scheme.benefits_md} />;
      case 'process':
        return (
          <div className="space-y-6">
            <MarkdownRenderer markdown={scheme.application_process_md} />
            {firstApplyUrl && (
              <a
                href={firstApplyUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-sm shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:from-indigo-500 hover:to-violet-500 transition-all"
              >
                Apply Now <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        );
      case 'documents':
        return (
          <div className="max-h-[400px] overflow-y-auto">
            <MarkdownRenderer markdown={scheme.documents_md} />
          </div>
        );
      case 'faqs':
        if (!hasFaqs) return null;
        return (
          <div className="space-y-3">
            {scheme.faqs!.map((faq, idx) => {
              const isExpanded = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  className={`rounded-2xl border transition-all ${
                    isExpanded
                      ? 'bg-slate-900 border-indigo-500/30'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
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
                    <div className="px-4 pb-4 pt-0 text-sm text-slate-400 leading-relaxed border-t border-white/10">
                      <div className="pt-3">{faq.answer}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      default:
        return null;
    }
  };

  const firstApplyUrl = scheme.application_process?.[0] ?? scheme.official_url;

  return (
    <div className="flex justify-center py-12 px-4 min-h-screen bg-slate-950">
      <div className="glass-card max-w-3xl w-full bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
        {/* Top Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="font-outfit text-3xl text-white font-bold mb-4 md:mb-0">
            {scheme.title}
          </h1>
          <div className="flex gap-2 items-center">
            {firstApplyUrl && (
              <a
                href={firstApplyUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-amber-400 text-slate-950 font-black rounded-lg hover:bg-amber-300 transition"
                aria-label="Apply now"
              >
                Apply Now
              </a>
            )}
            {scheme.level && (
              <span className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs font-medium">
                {scheme.level}
              </span>
            )}
            {scheme.dbt_eligible && (
              <span className="px-2 py-1 bg-green-800 text-green-200 rounded text-xs font-medium">
                DBT Eligible
              </span>
            )}
          </div>
        </div>

        {/* Pill-style Tab Navigation */}
        <nav
          className="flex gap-1.5 overflow-x-auto mb-5 pb-1"
          role="tablist"
          aria-label="Scheme detail sections"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <section>{renderTabContent()}</section>
      </div>
    </div>
  );
};

export default SchemeDetails;
