'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ScanText,
  Upload,
  CheckCircle,
  AlertCircle,
  FileImage,
  Sparkles,
  ChevronRight,
  X,
  RefreshCw,
  Award,
  Loader2,
  ExternalLink,
  ArrowRight,
  Edit3,
  Eye,
  Sliders
} from 'lucide-react';
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

const STATES_LIST = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Jammu and Kashmir',
  'Ladakh',
];

/**
 * Preprocesses image on a canvas (grayscale + contrast enhancement)
 * to significantly improve Tesseract OCR recognition quality.
 */
async function preprocessImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        // Scale up if image is too small
        const scale = Math.max(1, Math.min(2.5, 2000 / Math.max(img.width, img.height)));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Grayscale + High-contrast binarization enhancement
        for (let i = 0; i < data.length; i += 4) {
          const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          // Mild contrast stretching
          const contrast = 1.3;
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
          const adjusted = Math.min(255, Math.max(0, factor * (avg - 128) + 128));

          data[i] = adjusted;
          data[i + 1] = adjusted;
          data[i + 2] = adjusted;
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function cleanOcrText(raw: string): string {
  let t = raw;
  t = t.replace(/[ \t]+/g, ' ');
  t = t.replace(/\bRio\b/g, 'R/o');
  t = t.replace(/\bR10\b/g, 'R/o');
  t = t.replace(/\bS\/o\b/gi, 'Son of');
  t = t.replace(/\bD\/o\b/gi, 'Daughter of');
  t = t.replace(/\bW\/o\b/gi, 'Wife of');
  t = t.replace(/\bD0B\b/gi, 'DOB');
  t = t.replace(/\bD\.O\.B\b/gi, 'DOB');
  t = t.replace(/(?<=\s)[^aAiI0-9\n](?=\s)/g, '');
  t = t.replace(/  +/g, ' ');
  return t.trim();
}

function isValidName(name: string): boolean {
  const trimmed = name.trim().replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
  if (trimmed.length < 3 || trimmed.length > 45) return false;
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return false;

  const rejects =
    /\b(government|india|unique|identification|authority|aadhaar|income|tax|department|permanent|account|card|election|commission|signature|male|female|birth|year|date|father|mother|husband|wife|address|certificate|district|tehsil|state|enrolment|helpdesk|resident|mera|mera aadhaar|vid)\b/i;

  if (rejects.test(trimmed)) return false;
  return true;
}

function extractName(rawText: string): string | undefined {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 1. Aadhaar Card structure: Name is usually the line directly above "DOB" or "Year of Birth"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:DOB|Date of Birth|Year of Birth|YOB|जन्म\s*तिथि|जन्म\s*वर्ष)/i.test(line)) {
      // Look 1 or 2 lines above
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        const candidate = lines[j].replace(/^[^\w]+|[^\w]+$/g, '').trim();
        // Remove Hindi characters if any to get english name or keep clean english text
        const engOnly = candidate.replace(/[^a-zA-Z\s]/g, '').trim();
        if (isValidName(engOnly) && engOnly.split(/\s+/).length <= 4) {
          return engOnly;
        }
      }
    }
  }

  // 2. Certificate pattern: "certify that [NAME] Son/Daughter/Wife of"
  const certifyMatch = rawText.match(
    /certify\s+that\s+(?:Shri|Smt\.?|Kumari|Sri|Mr\.?|Mrs\.?|Ms\.?)?\s*([A-Za-z\s]{3,40}?)\s+(?:Son|Daughter|Wife|S\/o|D\/o|W\/o)\s+of/i
  );
  if (certifyMatch && isValidName(certifyMatch[1])) return certifyMatch[1].trim();

  // 3. "Shri/Smt/Kumari [NAME] Son/Daughter"
  const shriMatch = rawText.match(
    /(?:Shri|Smt\.?|Kumari|Sri|Mr\.?|Mrs\.?|Ms\.?)\s+([A-Za-z\s]{3,40}?)\s+(?:Son|Daughter|Wife|S\/o|D\/o|W\/o)\s+of/i
  );
  if (shriMatch && isValidName(shriMatch[1])) return shriMatch[1].trim();

  // 4. "Name / Name of Applicant: [NAME]"
  const nameLabelMatch = rawText.match(
    /(?:name\s+of\s+(?:applicant|candidate|person|beneficiary|holder)|name|नाम)\s*[:\-]?\s*([A-Za-z\s]{3,40})/i
  );
  if (nameLabelMatch && isValidName(nameLabelMatch[1])) return nameLabelMatch[1].trim();

  // 5. PAN Card pattern: 2nd or 3rd line under "INCOME TAX DEPARTMENT"
  for (let i = 0; i < lines.length; i++) {
    if (/INCOME\s*TAX\s*DEPARTMENT/i.test(lines[i])) {
      for (let j = i + 1; j <= Math.min(lines.length - 1, i + 4); j++) {
        const candidate = lines[j].replace(/[^a-zA-Z\s]/g, '').trim();
        if (isValidName(candidate) && candidate.split(/\s+/).length <= 4) {
          return candidate;
        }
      }
    }
  }

  return undefined;
}

function extractCategory(t: string): string | undefined {
  if (
    /\bscheduled\s+castes?\b/i.test(t) ||
    /\bSC\b/.test(t) ||
    /\bsc\s+(?:category|certificate|caste)\b/i.test(t)
  ) {
    return 'sc';
  }

  if (
    /\bscheduled\s+tribes?\b/i.test(t) ||
    /\bST\b/.test(t) ||
    /\bst\s+(?:category|certificate|caste)\b/i.test(t)
  ) {
    return 'st';
  }

  if (
    /\bOBC\b/.test(t) ||
    /other\s+backward\s+class(?:es)?\b/i.test(t) ||
    /backward\s+class(?:es)?\b/i.test(t) ||
    /recognized\s+as\s+(?:a\s+)?backward\s+class/i.test(t) ||
    /belongs?\s+to\s+(?:the\s+)?[\w\s-]+community\s+which\s+is\s+(?:recognized|recognised)\s+as\s+(?:a\s+)?backward/i.test(t) ||
    /\bobc\s+(?:category|certificate|caste)\b/i.test(t) ||
    /\bsebc\b/i.test(t) ||
    /\bvjnt\b/i.test(t)
  ) {
    return 'obc';
  }

  if (/\bEWS\b/.test(t) || /economically\s+weaker\s+section/i.test(t)) {
    return 'ews';
  }

  if (/\bgeneral\s+(?:category|certificate)\b/i.test(t)) {
    return 'general';
  }

  return undefined;
}

function extractFields(text: string): OcrData {
  const raw = text;
  const t = cleanOcrText(raw);
  const data: OcrData = { raw_text: raw };

  // Full name
  data.full_name = extractName(raw);

  // Date of birth & Age
  const dobMatch = t.match(
    /(?:DOB|Date of Birth|Date\s*of\s*Birth|जन्म\s*तिथि)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/i
  );
  if (dobMatch) {
    data.date_of_birth = dobMatch[1];
    const parts = dobMatch[1].split(/[\/\-\.]/);
    if (parts.length === 3) {
      const year = parseInt(parts[2].length === 4 ? parts[2] : parts[0], 10);
      if (!isNaN(year) && year > 1900 && year <= new Date().getFullYear()) {
        data.age = String(new Date().getFullYear() - year);
      }
    }
  } else {
    // Year of Birth pattern
    const yobMatch = t.match(/(?:Year of Birth|YOB|जन्म\s*वर्ष)\s*[:\-]?\s*(\d{4})/i);
    if (yobMatch) {
      const year = parseInt(yobMatch[1], 10);
      if (!isNaN(year) && year > 1900 && year <= new Date().getFullYear()) {
        data.date_of_birth = yobMatch[1];
        data.age = String(new Date().getFullYear() - year);
      }
    }
  }

  // Gender
  if (/\b(female|woman|महिला|स्त्री)\b/i.test(t)) data.gender = 'female';
  else if (/\b(transgender|किन्नर)\b/i.test(t)) data.gender = 'transgender';
  else if (/\b(male|man|पुरुष)\b/i.test(t)) data.gender = 'male';
  else if (/\b(M\s*\/\s*Male|Gender\s*:\s*M)\b/i.test(t)) data.gender = 'male';
  else if (/\b(F\s*\/\s*Female|Gender\s*:\s*F)\b/i.test(t)) data.gender = 'female';

  // Document IDs
  // 1. Aadhaar (12 digits with or without spaces)
  const aadhaarMatch = t.match(/\b(\d{4}\s\d{4}\s\d{4})\b/) || t.match(/\b(\d{12})\b/);
  // 2. PAN ([A-Z]{5}[0-9]{4}[A-Z])
  const panMatch = t.match(/\b([A-Z]{5}\d{4}[A-Z])\b/);
  // 3. Voter ID ([A-Z]{3}\d{7})
  const voterMatch = t.match(/\b([A-Z]{3}\d{7})\b/);

  if (aadhaarMatch) data.document_id = aadhaarMatch[1];
  else if (panMatch) data.document_id = `PAN: ${panMatch[1]}`;
  else if (voterMatch) data.document_id = `Voter ID: ${voterMatch[1]}`;

  // Income
  const incomeMatch = t.match(
    /(?:annual\s*income|total\s*income|family\s*income|income|आय|salary)\s*[:\-]?\s*(?:Rs\.?|₹|INR)?\s*([\d,]+)/i
  );
  if (incomeMatch) {
    const cleaned = incomeMatch[1].replace(/,/g, '');
    if (parseInt(cleaned, 10) > 1000) {
      data.annual_income = cleaned;
    }
  }

  // State
  for (const s of STATES_LIST) {
    if (new RegExp(`\\b${s}\\b`, 'i').test(t)) {
      data.state = s;
      break;
    }
  }

  // Category
  data.category = extractCategory(t);

  // Address
  const addressMatch = t.match(/(?:address|पता|R\/o|resident\s+of)\s*[:\-]?\s*([^\n]{10,120})/i);
  if (addressMatch) data.address = addressMatch[1].trim();

  return data;
}

const FIELD_LABELS: Record<string, string> = {
  full_name: 'Full Name',
  date_of_birth: 'Date of Birth / YOB',
  age: 'Age',
  gender: 'Gender',
  document_id: 'Document ID / Number',
  state: 'State',
  annual_income: 'Annual Income (₹)',
  category: 'Category',
  address: 'Address',
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
  const [showRawText, setShowRawText] = useState(false);

  const [recommendations, setRecommendations] = useState<any[] | null>(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [selectedScheme, setSelectedScheme] = useState<any | null>(null);

  const updateField = (key: keyof OcrData, value: string) => {
    if (!ocrData) return;
    const updated = { ...ocrData, [key]: value };
    setOcrData(updated);
    localStorage.setItem('ocrData', JSON.stringify(updated));
  };

  const handleOpenScheme = async (schemeId: string, schemeName: string) => {
    try {
      const res = await axiosInstance.get(`/api/schemes/${schemeId}`);
      if (res.data) {
        setSelectedScheme(res.data);
      } else {
        router.push(`/schemes?q=${encodeURIComponent(schemeName)}`);
      }
    } catch {
      router.push(`/schemes?q=${encodeURIComponent(schemeName)}`);
    }
  };

  const handleGetRecommendations = async () => {
    setLoadingRecs(true);
    setRecError(null);

    try {
      let userProfile: any = {};
      const rawUser = localStorage.getItem('user');
      if (rawUser) {
        try {
          userProfile = JSON.parse(rawUser);
        } catch {}
      }

      const ageVal = ocrData?.age ? parseInt(ocrData.age, 10) : userProfile.age || 25;
      const genderVal = ocrData?.gender || userProfile.gender || 'male';
      const stateVal = ocrData?.state || userProfile.state || 'Maharashtra';
      const incomeVal = ocrData?.annual_income
        ? parseFloat(ocrData.annual_income)
        : userProfile.annual_income || 150000;
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
        (a: any, b: any) =>
          Number(b.is_eligible) - Number(a.is_eligible) || b.eligibility_score - a.eligibility_score
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
      // 1. Preprocess the image to enhance contrast & binarize
      const preprocessedImage = await preprocessImage(file);

      // 2. Run Tesseract OCR on preprocessed image
      const result = await Tesseract.recognize(preprocessedImage, 'eng', {
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
      setErrorMsg('OCR failed. Please ensure the document is clear and readable.');
      setStatus('error');
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

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
    setShowRawText(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filledCount = ocrData
    ? Object.entries(ocrData).filter(([k, v]) => k !== 'raw_text' && v && String(v).trim().length > 0).length
    : 0;
  const totalFields = Object.keys(FIELD_LABELS).length;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-[#090f1d]/90 rounded-3xl p-6 border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-violet-500/10 text-violet-400 rounded-2xl flex items-center justify-center border border-violet-500/30">
              <ScanText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Document OCR Scanner</h1>
              <p className="text-sm text-slate-400">
                Extract details from Aadhaar, Income Certificate, PAN, or Caste Certificate — with automatic enhancement and editable fields.
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-4 flex-wrap">
            {[
              '🛡 Enhanced contrast OCR',
              '🔒 Local browser extraction',
              '✏️ Fully editable fields',
              '📋 1-Click Form Auto-Fill',
            ].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-slate-800/80 text-slate-300 rounded-full text-xs font-medium border border-slate-700/60"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Drop Zone */}
        {status === 'idle' && (
          <div
            className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${
              dragging
                ? 'border-violet-500 bg-violet-500/10'
                : 'border-slate-700 bg-[#090f1d]/90 hover:border-violet-400/60 hover:bg-violet-500/5'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <FileImage className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <p className="text-lg font-bold text-slate-300">Drop your document image here</p>
            <p className="text-sm text-slate-500 mt-1">
              or click to browse — Aadhaar, Income Certificate, PAN, Caste Certificate (JPG, PNG, WEBP)
            </p>
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
          <div className="bg-[#090f1d]/90 rounded-3xl p-8 border border-slate-800 shadow-2xl text-center space-y-4">
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Document"
                className="max-h-48 mx-auto rounded-xl mb-4 object-contain shadow border border-slate-700"
              />
            )}
            <div className="text-sm font-bold text-violet-400 flex items-center justify-center gap-2">
              <span className="animate-spin text-lg">⚙</span>
              Enhancing image & extracting text... ({progress}%)
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-violet-500 to-indigo-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500">
              Running adaptive contrast and layout analysis for Indian identity documents...
            </p>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="bg-[#090f1d]/90 rounded-3xl p-6 border border-red-500/30 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-4">
              <AlertCircle className="w-6 h-6" />
              <span className="font-bold">OCR Processing Issue</span>
            </div>
            <p className="text-sm text-slate-400 mb-4">{errorMsg}</p>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-700 transition-all border border-slate-700"
            >
              <RefreshCw className="w-4 h-4" /> Try with a clearer document
            </button>
          </div>
        )}

        {/* Results & Editable Fields */}
        {status === 'done' && ocrData && (
          <div className="space-y-6">
            <div className="bg-[#090f1d]/90 rounded-3xl p-6 border border-slate-800 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <h2 className="font-bold text-white">Extracted Details (Editable)</h2>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded-full font-bold border border-emerald-500/30">
                    {filledCount}/{totalFields} detected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowRawText(!showRawText)}
                    className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 bg-slate-800 rounded-lg border border-slate-700 transition flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {showRawText ? 'Hide Raw Text' : 'View Raw OCR'}
                  </button>
                  <button onClick={reset} className="text-slate-500 hover:text-slate-300 transition p-1" title="Reset">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Raw OCR Text Accordion */}
              {showRawText && (
                <div className="mb-5 p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-400 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto scheme-scroll">
                  {ocrData.raw_text || 'No text detected'}
                </div>
              )}

              {/* Document Preview & Editable Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                {Object.entries(FIELD_LABELS).map(([key, label]) => {
                  const val = (ocrData as any)[key] || '';
                  return (
                    <div
                      key={key}
                      className={`p-3 rounded-2xl border transition ${
                        val ? 'bg-slate-900/90 border-slate-800 focus-within:border-indigo-500' : 'bg-slate-950/60 border-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400 mb-1">
                        <span>{label}</span>
                        {val && <Sparkles className="w-3 h-3 text-indigo-400" />}
                      </div>
                      <input
                        type="text"
                        value={val}
                        placeholder={`Enter ${label}`}
                        onChange={(e) => updateField(key as keyof OcrData, e.target.value)}
                        className="w-full bg-transparent text-sm font-semibold text-slate-100 placeholder-slate-600 outline-none"
                      />
                    </div>
                  );
                })}
              </div>

              {savedToStorage && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl flex items-center gap-2 font-semibold">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Data synced with browser storage. Ready for form auto-fill!</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleGetRecommendations}
                  disabled={loadingRecs}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {loadingRecs ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Matching Document Data...
                    </>
                  ) : (
                    <>
                      <Award className="w-5 h-5" /> Get Recommendations as per Document
                    </>
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
                      Based on extracted document details & profile ({recommendations.filter((r) => r.is_eligible).length} eligible schemes)
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 font-bold text-xs rounded-full border border-emerald-500/30">
                    {recommendations.filter((r) => r.is_eligible).length} Matched
                  </span>
                </div>

                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 scheme-scroll">
                  {recommendations.map((r: any) => (
                    <div
                      key={r.scheme_id}
                      onClick={() => handleOpenScheme(r.scheme_id, r.scheme_name)}
                      className={`rounded-xl border p-4 transition-all cursor-pointer hover:shadow-lg group ${
                        r.is_eligible
                          ? 'bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-400'
                          : 'bg-slate-800/50 border-slate-700 opacity-75'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              r.is_eligible ? 'bg-emerald-500' : 'bg-slate-500'
                            }`}
                          />
                          <h3 className="font-bold text-slate-200 text-sm group-hover:text-emerald-400 transition flex items-center gap-1.5">
                            {r.scheme_name}
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition" />
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {r.is_eligible && (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded-full font-bold border border-emerald-500/30">
                              Eligible ✓
                            </span>
                          )}
                        </div>
                      </div>

                      {r.matched_criteria && r.matched_criteria.length > 0 && (
                        <div className="text-xs text-emerald-400 flex flex-wrap gap-1 mb-2">
                          {r.matched_criteria.slice(0, 3).map((c: string) => (
                            <span
                              key={c}
                              className="px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20"
                            >
                              {c}
                            </span>
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
