'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ScanText, Upload, CheckCircle, AlertCircle, FileImage, Sparkles, ChevronRight, X, RefreshCw, Award, Loader2, ExternalLink, ArrowRight } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { axiosInstance } from '@/lib/axiosInstance';
import SchemeDetailModal from '@/components/SchemeDetailModal';

interface OcrData {
  full_name?: string;
  date_of_birth?: string;
  age?: string;
  gender?: string;
  document_id?: string;
  address?: string;
  state?: string;
  annual_income?: string;
  category?: string;
  raw_text?: string;
}

function cleanOcrText(raw: string): string {
  let t = raw;
  // Collapse multiple spaces / tabs into a single space
  t = t.replace(/[ \t]+/g, ' ');
  // Fix common OCR misreads
  t = t.replace(/\bRio\b/g, 'R/o');   // "R/o" (resident of) often OCR'd as "Rio"
  t = t.replace(/\bR10\b/g, 'R/o');
  t = t.replace(/\bS\/o\b/gi, 'Son of');
  t = t.replace(/\bD\/o\b/gi, 'Daughter of');
  t = t.replace(/\bW\/o\b/gi, 'Wife of');
  // Remove stray single-character noise words (but keep "a", "I", digits, common abbreviations)
  t = t.replace(/(?<=\s)[^aAiI0-9\n](?=\s)/g, '');
  // Collapse any resulting double spaces
  t = t.replace(/  +/g, ' ');
  return t.trim();
}

function isValidName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 4) return false;
  // Reject if it's only one short word (likely OCR garbage)
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 1 && words[0].length < 4) return false;
  // Reject known non-name fragments
  const rejects = /\b(R\/o|resident|village|district|tehsil|block|mother|father|address|income|certificate|caste|class|date|birth)\b/i;
  if (rejects.test(trimmed)) return false;
  return true;
}

function extractName(t: string): string | undefined {
  // Priority 1: Certificate pattern — "certify that [NAME] Son/Daughter/Wife of"
  const certifyMatch = t.match(
    /certify\s+that\s+(?:Shri|Smt\.?|Kumari|Sri|Mr\.?|Mrs\.?|Ms\.?)?\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,4})\s+(?:Son|Daughter|Wife|S\/o|D\/o|W\/o)\s+of/i
  );
  if (certifyMatch && isValidName(certifyMatch[1])) return certifyMatch[1].trim();

  // Priority 2: "Shri/Smt/Kumari [NAME] Son/Daughter of"
  const shriMatch = t.match(
    /(?:Shri|Smt\.?|Kumari|Sri|Mr\.?|Mrs\.?|Ms\.?)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,4})\s+(?:Son|Daughter|Wife|S\/o|D\/o|W\/o)\s+of/i
  );
  if (shriMatch && isValidName(shriMatch[1])) return shriMatch[1].trim();

  // Priority 3: "certify that [NAME]" without the Son/Daughter part (shorter certificates)
  const certifySimple = t.match(
    /certify\s+that\s+(?:Shri|Smt\.?|Kumari|Sri|Mr\.?|Mrs\.?|Ms\.?)?\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,4})/i
  );
  if (certifySimple && isValidName(certifySimple[1])) return certifySimple[1].trim();

  // Priority 4: "Name of Applicant/Candidate: [NAME]"
  const applicantMatch = t.match(
    /(?:name\s+of\s+(?:applicant|candidate|person|beneficiary))\s*[:\-]?\s*([A-Z][a-zA-Z\s]{3,40})/i
  );
  if (applicantMatch && isValidName(applicantMatch[1])) return applicantMatch[1].trim();

  // Priority 5: Generic "Name:" — but skip if preceded by "mother's", "father's", "husband's"
  const genericNameRe = /(?<!(?:mother'?s?|father'?s?|husband'?s?|wife'?s?)\s)(?:name|नाम)\s*[:\-]\s*([A-Z][a-zA-Z\s]{3,40})/gi;
  let m;
  while ((m = genericNameRe.exec(t)) !== null) {
    if (isValidName(m[1])) return m[1].trim();
  }

  return undefined;
}

function extractCategory(t: string): string | undefined {
  const lower = t.toLowerCase();

  // --- SC detection ---
  if (
    /\bscheduled\s+castes?\b/i.test(t) ||
    /\bSC\b/.test(t) ||  // uppercase only to avoid false matches
    /\bsc\s+(?:category|certificate|caste)\b/i.test(t)
  ) return 'sc';

  // --- ST detection ---
  if (
    /\bscheduled\s+tribes?\b/i.test(t) ||
    /\bST\b/.test(t) ||  // uppercase only
    /\bst\s+(?:category|certificate|caste)\b/i.test(t)
  ) return 'st';

  // --- OBC detection ---
  if (
    /\bOBC\b/.test(t) ||
    /other\s+backward\s+class(?:es)?\b/i.test(t) ||
    /backward\s+class(?:es)?\b/i.test(t) ||
    /recognized\s+as\s+(?:a\s+)?backward\s+class/i.test(t) ||
    /belongs?\s+to\s+(?:the\s+)?[\w\s-]+community\s+which\s+is\s+(?:recognized|recognised)\s+as\s+(?:a\s+)?backward/i.test(t) ||
    /\bobc\s+(?:category|certificate|caste)\b/i.test(t)
  ) return 'obc';

  // --- General category ---
  if (/\bgeneral\s+(?:category|certificate)\b/i.test(t)) return 'general';

  // --- EWS ---
  if (
    /\bEWS\b/.test(t) ||
    /economically\s+weaker\s+section/i.test(t)
  ) return 'ews';

  return undefined;
}

function extractFields(text: string): OcrData {
  const raw = text;
  const t = cleanOcrText(raw);
  const data: OcrData = { raw_text: raw };

  // Log raw OCR text for debugging
  console.log('--- RAW OCR TEXT ---');
  console.log(raw);
  console.log('--- CLEANED OCR TEXT ---');
  console.log(t);

  // Full name (smart extraction)
  data.full_name = extractName(t);

  // Date of birth / age
  const dobMatch = t.match(/(?:DOB|Date of Birth|जन्म)\s*[:\-]?\s*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})/i);
  if (dobMatch) {
    data.date_of_birth = dobMatch[1];
    const parts = dobMatch[1].split(/[\/\-\.]/);
    if (parts.length === 3) {
      const year = parseInt(parts[2].length === 4 ? parts[2] : parts[0]);
      if (!isNaN(year)) data.age = String(new Date().getFullYear() - year);
    }
  }

  // Gender
  if (/\b(female|woman|महिला|स्त्री)\b/i.test(t)) data.gender = 'female';
  else if (/\b(male|man|पुरुष)\b/i.test(t)) data.gender = 'male';
  else if (/\b(transgender|किन्नर)\b/i.test(t)) data.gender = 'transgender';

  // Aadhaar
  const aadhaarMatch = t.match(/\b(\d{4}\s\d{4}\s\d{4})\b/);
  if (aadhaarMatch) data.document_id = aadhaarMatch[1];

  // Income
  const incomeMatch = t.match(/(?:income|आय|salary)\s*[:\-]?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+)/i);
  if (incomeMatch) data.annual_income = incomeMatch[1].replace(/,/g, '');

  // State
  const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Jammu and Kashmir','Ladakh'];
  for (const s of STATES) {
    if (t.toLowerCase().includes(s.toLowerCase())) {
      data.state = s;
      break;
    }
  }

  // Category (smart extraction)
  data.category = extractCategory(t);

  // Address
  const addressMatch = t.match(/(?:address|पता|R\/o|resident\s+of)\s*[:\-]?\s*([^\n]{10,100})/i);
  if (addressMatch) data.address = addressMatch[1].trim();

  return data;
}

const FIELD_LABELS: Record<string, string> = {
  full_name: 'Full Name',
  date_of_birth: 'Date of Birth',
  age: 'Age',
  gender: 'Gender',
  document_id: 'Document ID',
  address: 'Address',
  state: 'State',
  annual_income: 'Annual Income (₹)',
  category: 'Category',
};

export default function OcrPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [ocrData, setOcrData] = useState<OcrData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedToStorage, setSavedToStorage] = useState(false);

  const [recommendations, setRecommendations] = useState<any[] | null>(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [selectedScheme, setSelectedScheme] = useState<any | null>(null);
  const [loadingSchemeDetail, setLoadingSchemeDetail] = useState(false);

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

  const handleGetRecommendations = async () => {
    setLoadingRecs(true);
    setRecError(null);

    try {
      let userProfile: any = {};
      const rawUser = localStorage.getItem('user');
      if (rawUser) {
        try { userProfile = JSON.parse(rawUser); } catch {}
      }

      const ageVal = ocrData?.age ? parseInt(ocrData.age, 10) : (userProfile.age || 25);
      const genderVal = ocrData?.gender || userProfile.gender || 'male';
      const stateVal = ocrData?.state || userProfile.state || 'Maharashtra';
      const incomeVal = ocrData?.annual_income ? parseFloat(ocrData.annual_income) : (userProfile.annual_income || 150000);
      const categoryVal = ocrData?.category || userProfile.category || 'general';
      const occupationVal = userProfile.occupation || 'farmer';
      const educationVal = userProfile.education || 'graduate';

      const payload = {
        age: ageVal,
        gender: genderVal.toLowerCase(),
        state: stateVal,
        occupation: occupationVal.toLowerCase(),
        annual_income: incomeVal,
        category: categoryVal.toLowerCase(),
        education: educationVal.toLowerCase(),
        is_rural: false,
        disability_status: Boolean(userProfile.disability_status),
      };

      const res = await axiosInstance.post('/api/eligibility/check', payload);
      const sorted = (res.data.results || []).sort(
        (a: any, b: any) => Number(b.is_eligible) - Number(a.is_eligible) || b.eligibility_score - a.eligibility_score
      );

      setRecommendations(sorted);
    } catch (err: any) {
      setRecError('Could not fetch instant recommendations. You can view all schemes via the Form page.');
    } finally {
      setLoadingRecs(false);
    }
  };

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file (JPG, PNG, WEBP, etc.)');
      setStatus('error');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setStatus('processing');
    setProgress(0);
    setOcrData(null);
    setSavedToStorage(false);
    setErrorMsg(null);
    setRecommendations(null);

    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const rawText = result.data.text;
      const extracted = extractFields(rawText);
      setOcrData(extracted);
      setStatus('done');

      localStorage.setItem('ocrData', JSON.stringify(extracted));
      setSavedToStorage(true);
    } catch (err) {
      setErrorMsg('OCR failed. Please try a clearer image with readable text.');
      setStatus('error');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const reset = () => {
    setImageFile(null);
    setImagePreview(null);
    setProgress(0);
    setStatus('idle');
    setOcrData(null);
    setErrorMsg(null);
    setSavedToStorage(false);
    setRecommendations(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filledCount = ocrData ? Object.entries(ocrData).filter(([k, v]) => k !== 'raw_text' && v).length : 0;
  const totalFields = Object.keys(FIELD_LABELS).length;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-[#090f1d]/90 rounded-3xl p-6 border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-violet-500/10 text-violet-400 rounded-2xl flex items-center justify-center border border-violet-500/30">
              <ScanText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Document OCR Scanner</h1>
              <p className="text-sm text-slate-400">Securely extract data from Aadhaar, Income Certificate, or any ID – processed entirely in your browser.</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4 flex-wrap">
            {['🛡 Runs in browser', '🔒 Zero data upload', '⚡ Instant results', '📋 Auto-fill Forms'].map(tag => (
              <span key={tag} className="px-3 py-1 bg-slate-800/80 text-slate-300 rounded-full text-xs font-medium border border-slate-700/60">{tag}</span>
            ))}
          </div>
        </div>

        {/* Drop Zone */}
        {status === 'idle' && (
          <div
            className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${
              dragging ? 'border-violet-500 bg-violet-500/10' : 'border-slate-700 bg-[#090f1d]/90 hover:border-violet-400/60 hover:bg-violet-500/5'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileImage className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <p className="text-lg font-bold text-slate-300">Drop your document image here</p>
            <p className="text-sm text-slate-500 mt-1">or click to browse — JPG, PNG, WEBP supported</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* Processing State */}
        {status === 'processing' && (
          <div className="bg-[#090f1d]/90 rounded-3xl p-8 border border-slate-800 shadow-2xl text-center">
            {imagePreview && (
              <img src={imagePreview} alt="Document" className="max-h-48 mx-auto rounded-xl mb-6 object-contain shadow border border-slate-700" />
            )}
            <div className="mb-3 text-sm font-bold text-violet-400 flex items-center justify-center gap-2">
              <span className="animate-spin text-lg">⚙</span>
              Running Tesseract.js OCR Engine...
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-violet-500 to-indigo-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">{progress}% completed</p>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="bg-[#090f1d]/90 rounded-3xl p-6 border border-red-500/30 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-4">
              <AlertCircle className="w-6 h-6" />
              <span className="font-bold">OCR Failed</span>
            </div>
            <p className="text-sm text-slate-400 mb-4">{errorMsg}</p>
            <button onClick={reset} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-700 transition-all border border-slate-700">
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
          </div>
        )}

        {/* Results */}
        {status === 'done' && ocrData && (
          <div className="space-y-6">
            <div className="bg-[#090f1d]/90 rounded-3xl p-6 border border-slate-800 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <h2 className="font-bold text-white">Extraction Complete</h2>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded-full font-bold border border-emerald-500/30">
                    {filledCount}/{totalFields} fields
                  </span>
                </div>
                <button onClick={reset} className="text-slate-500 hover:text-slate-300 transition" title="Reset">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {imagePreview && (
                <img src={imagePreview} alt="Scanned document" className="max-h-32 rounded-xl mb-5 object-contain shadow-sm border border-slate-700" />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                {Object.entries(FIELD_LABELS).map(([key, label]) => {
                  const val = (ocrData as any)[key];
                  return (
                    <div key={key} className={`p-3 rounded-xl border ${val ? 'bg-violet-500/10 border-violet-500/30' : 'bg-slate-800/50 border-slate-700/60'}`}>
                      <div className="text-xs font-semibold uppercase text-slate-500 mb-0.5">{label}</div>
                      {val ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-slate-200">{val}</span>
                          <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500 italic">Not detected</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {savedToStorage && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl flex items-center gap-2 font-semibold">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Data saved to browser storage. Ready for form auto-fill!</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleGetRecommendations}
                  disabled={loadingRecs}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {loadingRecs ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Matching Document Data...</>
                  ) : (
                    <><Award className="w-5 h-5" /> Get Recommendation as per Document</>
                  )}
                </button>

                <button
                  onClick={() => router.push('/form')}
                  className="flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Continue to Form
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={reset}
                  className="flex items-center justify-center gap-2 px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-all cursor-pointer border border-slate-700"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {recError && (
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl text-sm flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {recError}
                </div>
              )}
            </div>

            {/* Scheme Detail Modal */}
            {selectedScheme && (
              <SchemeDetailModal scheme={selectedScheme} onClose={() => setSelectedScheme(null)} />
            )}

            {/* Instant Document Scheme Recommendations */}
            {recommendations && (
              <div className="bg-[#090f1d]/90 rounded-3xl p-6 border border-emerald-500/30 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                      <Award className="w-5 h-5 text-emerald-400" />
                      Matching Recommendations as per Document
                    </h2>
                    <p className="text-xs text-slate-500">
                      Based on extracted document details & profile ({recommendations.filter(r => r.is_eligible).length} eligible schemes)
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 font-bold text-xs rounded-full border border-emerald-500/30">
                    {recommendations.filter(r => r.is_eligible).length} Matched
                  </span>
                </div>

                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 scheme-scroll">
                  {recommendations.map((r: any) => (
                    <div
                      key={r.scheme_id}
                      onClick={() => handleOpenScheme(r.scheme_id, r.scheme_name)}
                      className={`rounded-xl border p-4 transition-all cursor-pointer hover:shadow-lg group ${
                        r.is_eligible ? 'bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-400' : 'bg-slate-800/50 border-slate-700 opacity-75'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${r.is_eligible ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                          <h3 className="font-bold text-slate-200 text-sm group-hover:text-emerald-400 transition flex items-center gap-1.5">
                            {r.scheme_name}
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition" />
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {r.is_eligible && (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded-full font-bold border border-emerald-500/30">Eligible ✓</span>
                          )}
                        </div>
                      </div>

                      {r.matched_criteria && r.matched_criteria.length > 0 && (
                        <div className="text-xs text-emerald-400 flex flex-wrap gap-1 mb-2">
                          {r.matched_criteria.slice(0, 3).map((c: string) => (
                            <span key={c} className="px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">{c}</span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 text-xs">
                        <span className="text-slate-500 text-[11px]">Click to view full scheme details & apply</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/schemes?q=${encodeURIComponent(r.scheme_name)}`);
                          }}
                          className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 hover:underline"
                        >
                          Find on Catalog <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
