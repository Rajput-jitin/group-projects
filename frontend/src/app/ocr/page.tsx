'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ScanText, Upload, CheckCircle, AlertCircle, FileImage, Sparkles, ChevronRight, X, RefreshCw, Award, Loader2 } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { axiosInstance } from '@/lib/axiosInstance';

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

function extractFields(text: string): OcrData {
  const t = text;
  const data: OcrData = { raw_text: t };

  const nameMatch = t.match(/(?:name|नाम)\s*[:\-]?\s*([A-Z][a-zA-Z\s]{2,40})/i);
  if (nameMatch) data.full_name = nameMatch[1].trim();

  const dobMatch = t.match(/(?:DOB|Date of Birth|जन्म)\s*[:\-]?\s*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})/i);
  if (dobMatch) {
    data.date_of_birth = dobMatch[1];
    const parts = dobMatch[1].split(/[\/\-\.]/);
    if (parts.length === 3) {
      const year = parseInt(parts[2].length === 4 ? parts[2] : parts[0]);
      if (!isNaN(year)) data.age = String(new Date().getFullYear() - year);
    }
  }

  if (/\b(female|woman|महिला|स्त्री)\b/i.test(t)) data.gender = 'female';
  else if (/\b(male|man|पुरुष)\b/i.test(t)) data.gender = 'male';
  else if (/\b(transgender|किन्नर)\b/i.test(t)) data.gender = 'transgender';

  const aadhaarMatch = t.match(/\b(\d{4}\s\d{4}\s\d{4})\b/);
  if (aadhaarMatch) data.document_id = aadhaarMatch[1];

  const incomeMatch = t.match(/(?:income|आय|salary)\s*[:\-]?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+)/i);
  if (incomeMatch) data.annual_income = incomeMatch[1].replace(/,/g, '');

  const STATES = ['Andhra Pradesh','Assam','Bihar','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'];
  for (const s of STATES) {
    if (t.toLowerCase().includes(s.toLowerCase())) {
      data.state = s;
      break;
    }
  }

  if (/\b(SC|Scheduled Caste)\b/i.test(t)) data.category = 'sc';
  else if (/\b(ST|Scheduled Tribe)\b/i.test(t)) data.category = 'st';
  else if (/\b(OBC|Other Backward)\b/i.test(t)) data.category = 'obc';

  const addressMatch = t.match(/(?:address|पता)\s*[:\-]?\s*([^\n]{10,100})/i);
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
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center">
              <ScanText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Document OCR Scanner</h1>
              <p className="text-sm text-slate-500">Securely extract data from Aadhaar, Income Certificate, or any ID – processed entirely in your browser.</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4 flex-wrap">
            {['🛡 Runs in browser', '🔒 Zero data upload', '⚡ Instant results', '📋 Auto-fill Forms'].map(tag => (
              <span key={tag} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{tag}</span>
            ))}
          </div>
        </div>

        {/* Drop Zone */}
        {status === 'idle' && (
          <div
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              dragging ? 'border-violet-500 bg-violet-50' : 'border-slate-300 bg-white hover:border-violet-400 hover:bg-violet-50/30'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileImage className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-lg font-semibold text-slate-700">Drop your document image here</p>
            <p className="text-sm text-slate-400 mt-1">or click to browse — JPG, PNG, WEBP supported</p>
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
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
            {imagePreview && (
              <img src={imagePreview} alt="Document" className="max-h-48 mx-auto rounded-xl mb-6 object-contain shadow" />
            )}
            <div className="mb-3 text-sm font-semibold text-violet-600 flex items-center justify-center gap-2">
              <span className="animate-spin text-lg">⚙</span>
              Running Tesseract.js OCR Engine...
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-violet-500 to-indigo-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">{progress}% completed</p>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle className="w-6 h-6" />
              <span className="font-semibold">OCR Failed</span>
            </div>
            <p className="text-sm text-slate-600 mb-4">{errorMsg}</p>
            <button onClick={reset} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-all">
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
          </div>
        )}

        {/* Results */}
        {status === 'done' && ocrData && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <h2 className="font-semibold text-slate-800">Extraction Complete</h2>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
                    {filledCount}/{totalFields} fields
                  </span>
                </div>
                <button onClick={reset} className="text-slate-400 hover:text-slate-600" title="Reset">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {imagePreview && (
                <img src={imagePreview} alt="Scanned document" className="max-h-32 rounded-xl mb-5 object-contain shadow-sm border border-slate-100" />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                {Object.entries(FIELD_LABELS).map(([key, label]) => {
                  const val = (ocrData as any)[key];
                  return (
                    <div key={key} className={`p-3 rounded-xl border ${val ? 'bg-violet-50 border-violet-100' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-xs font-semibold uppercase text-slate-500 mb-0.5">{label}</div>
                      {val ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-slate-800">{val}</span>
                          <Sparkles className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Not detected</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {savedToStorage && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Data saved to browser storage. Ready for form auto-fill!</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleGetRecommendations}
                  disabled={loadingRecs}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {loadingRecs ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Matching Document Data...</>
                  ) : (
                    <><Award className="w-5 h-5" /> Get Recommendation as per Document</>
                  )}
                </button>

                <button
                  onClick={() => router.push('/form')}
                  className="flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Continue to Form
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={reset}
                  className="flex items-center justify-center gap-2 px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {recError && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {recError}
                </div>
              )}
            </div>

            {/* Instant Document Scheme Recommendations */}
            {recommendations && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Award className="w-5 h-5 text-emerald-600" />
                      Matching Recommendations as per Document
                    </h2>
                    <p className="text-xs text-slate-500">
                      Based on extracted document details & profile ({recommendations.filter(r => r.is_eligible).length} eligible schemes)
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-full">
                    {recommendations.filter(r => r.is_eligible).length} Matched
                  </span>
                </div>

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {recommendations.map((r: any) => (
                    <div
                      key={r.scheme_id}
                      className={`rounded-xl border p-4 transition-all ${
                        r.is_eligible ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200 opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${r.is_eligible ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <h3 className="font-bold text-slate-800 text-sm">{r.scheme_name}</h3>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {r.is_eligible && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-bold">Eligible ✓</span>
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
                          {r.matched_criteria.slice(0, 3).map((c: string) => (
                            <span key={c} className="px-2 py-0.5 bg-emerald-100 rounded-full">{c}</span>
                          ))}
                        </div>
                      )}
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
