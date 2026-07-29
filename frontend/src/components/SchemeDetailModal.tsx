'use client';

import { useState } from 'react';
import { ExternalLink, X, CheckCircle2, FileText, ListOrdered, Award, Building2, UserCheck, HelpCircle } from 'lucide-react';

interface SchemeDetailModalProps {
  scheme: any;
  onClose: () => void;
}

export default function SchemeDetailModal({ scheme, onClose }: SchemeDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'eligibility' | 'documents' | 'process'>('overview');

  if (!scheme) return null;

  const details = scheme.details_json || {};
  const tags: string[] = details.tags || [];
  const ministry = scheme.ministry || details.nodalMinistryName || 'Government of India';
  const category = scheme.category || scheme.scheme_type || 'General';
  const officialUrl = scheme.official_url || scheme.applyUrl || 'https://myscheme.gov.in';

  const eligibilityText = scheme.eligibility_text || details.eligibility || scheme.description;
  const documentsText = scheme.documents_text || details.documents || '';
  const processText = scheme.process_text || details.process || '';

  const parseBulletList = (text: string) => {
    if (!text) return [];
    return text
      .split('\n')
      .map((line) => line.replace(/^[\s\-\*\•\d\.\)]+/, '').trim())
      .filter((line) => line.length > 2);
  };

  const eligibilityList = parseBulletList(eligibilityText);
  const documentsList = parseBulletList(documentsText);
  const processList = parseBulletList(processText);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
              {category}
            </span>
            {scheme.status && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {scheme.status}
              </span>
            )}
            {scheme.popularity && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                🔥 {scheme.popularity}% Match Score
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white leading-snug mb-2 pr-8">
            {scheme.name}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-2 font-medium">
            <Building2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
            {ministry}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 overflow-x-auto flex-shrink-0">
          {[
            { id: 'overview', label: 'Overview & Benefits', icon: Award },
            { id: 'eligibility', label: 'Eligibility', icon: UserCheck },
            { id: 'documents', label: 'Documents', icon: FileText },
            { id: 'process', label: 'How to Apply', icon: ListOrdered },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3.5 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-white shadow-sm'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-grow space-y-6 text-slate-700">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {scheme.benefit && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-100">
                  <h4 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    🎁 Scheme Benefits
                  </h4>
                  <p className="text-sm font-bold text-slate-900 leading-relaxed">{scheme.benefit}</p>
                </div>
              )}

              <div>
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                  Detailed Description
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {scheme.description || details.detailedDescription || 'No description available for this scheme.'}
                </p>
              </div>

              {tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                    Tags & Keywords
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200"
                      >
                        #{t}
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
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 block mb-0.5">Age Limits</span>
                  <span className="text-xs font-extrabold text-slate-800">
                    {scheme.min_age || scheme.max_age
                      ? `${scheme.min_age || 'Any'} - ${scheme.max_age || 'Any'} Years`
                      : 'No strict age limit'}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 block mb-0.5">Gender</span>
                  <span className="text-xs font-extrabold text-slate-800 capitalize">
                    {scheme.eligible_genders ? scheme.eligible_genders.join(', ') : 'All Genders'}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 block mb-0.5">Max Income</span>
                  <span className="text-xs font-extrabold text-slate-800">
                    {scheme.income_max ? `₹${(scheme.income_max / 100000).toFixed(1)} Lakh/year` : 'Not Restricted'}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
                  Eligibility Criteria & Guidelines
                </h4>
                {eligibilityList.length > 0 ? (
                  <ul className="space-y-2.5">
                    {eligibilityList.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    General eligibility rules apply based on government notification.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
                Required Documents for Verification
              </h4>
              {documentsList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {documentsList.map((doc, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3 text-xs sm:text-sm font-semibold text-slate-800"
                    >
                      <FileText className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>{doc}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
                  <p className="font-bold text-slate-800">Standard Documents Required:</p>
                  <p>• Aadhaar Card / Identity Proof</p>
                  <p>• Income & Caste Certificate (if applicable)</p>
                  <p>• Bank Passbook / Account details</p>
                  <p>• Educational certificates / Passport Photo</p>
                </div>
              )}
            </div>
          )}

          {/* PROCESS TAB */}
          {activeTab === 'process' && (
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
                Application Steps & Process
              </h4>
              {processList.length > 0 ? (
                <ol className="space-y-3">
                  {processList.map((step, idx) => (
                    <li
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3 text-xs sm:text-sm text-slate-800"
                    >
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed mt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed">
                  Apply directly on the official portal by filling out the online application form and uploading the required documents.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4 flex-shrink-0">
          <a
            href={officialUrl}
            target="_blank"
            rel="noreferrer"
            className="px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-100 transition flex items-center gap-2"
          >
            Official Portal <ExternalLink className="w-4 h-4 text-slate-400" />
          </a>

          <button
            onClick={() => {
              onClose();
              const formEl = document.getElementById('eligibility-modal') || document.getElementById('results');
              if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-2"
          >
            Check Eligibility & Apply
          </button>
        </div>
      </div>
    </div>
  );
}
