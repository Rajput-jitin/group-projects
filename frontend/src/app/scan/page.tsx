'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createWorker } from 'tesseract.js';
import { Scan, Upload, FileText, CheckCircle, AlertCircle, RefreshCw, ArrowRight, ShieldCheck, Edit2, Save } from 'lucide-react';

const DOCUMENT_TYPES = [
  { id: 'aadhaar_card', name: 'Aadhaar Card', fields: ['full_name', 'aadhaar_number', 'date_of_birth', 'address'] },
  { id: 'income_certificate', name: 'Income Certificate', fields: ['full_name', 'annual_income', 'issuing_authority', 'issue_date'] },
  { id: 'caste_certificate', name: 'Caste Certificate', fields: ['full_name', 'category', 'issuing_authority'] },
  { id: 'student_id', name: 'Student ID Card', fields: ['full_name', 'institution_name', 'course', 'student_id_number'] },
  { id: 'farmer_card', name: 'Farmer Card (KCC)', fields: ['full_name', 'land_holding', 'registration_number'] },
  { id: 'disability_certificate', name: 'Disability Certificate', fields: ['full_name', 'disability_type', 'disability_percentage'] },
  { id: 'ration_card', name: 'Ration Card', fields: ['full_name', 'family_members', 'ration_card_number'] },
  { id: 'residence_certificate', name: 'Residence Certificate', fields: ['full_name', 'address', 'state', 'issue_date'] },
];

export default function OCRScanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedDocType, setSelectedDocType] = useState('aadhaar_card');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [rawText, setRawText] = useState('');
  const [extractedData, setExtractedData] = useState<Record<string, string>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse raw text into fields based on doc type patterns
  const parseFieldsFromText = (text: string, docTypeId: string): Record<string, string> => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed: Record<string, string> = {};

    const currentDoc = DOCUMENT_TYPES.find(d => d.id === docTypeId);
    const expectedFields = currentDoc ? currentDoc.fields : [];

    // Smart regex pattern matching for common Indian document formats
    // 1. Aadhaar number pattern (12 digits or 4-4-4)
    const aadhaarMatch = text.match(/\b\d{4}\s?\d{4}\s?\d{4}\b/);
    if (aadhaarMatch) parsed['aadhaar_number'] = aadhaarMatch[0];

    // 2. Date of Birth pattern (DD/MM/YYYY or YYYY-MM-DD or DOB: ...)
    const dobMatch = text.match(/(?:DOB|Date of Birth|Birth|DOB:?)\s*[:\s]?\s*(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})/i) ||
                     text.match(/\b(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})\b/);
    if (dobMatch) parsed['date_of_birth'] = dobMatch[1] || dobMatch[0];

    // 3. Annual Income pattern (₹ or Rs or Income)
    const incomeMatch = text.match(/(?:income|annual|rs\.?|₹)\s*[:\s]?\s*([\d,]+)/i);
    if (incomeMatch) parsed['annual_income'] = incomeMatch[1];

    // 4. Full name extraction (line containing Name / Name:)
    const nameLine = lines.find(l => /^name\s*[:\s]/i.test(l) || /full name/i.test(l));
    if (nameLine) {
      parsed['full_name'] = nameLine.replace(/^name\s*[:\s]*/i, '').trim();
    } else if (lines.length > 0) {
      // Pick first non-heading clean line as candidate name
      const candidate = lines.find(l => /^[A-Z][a-z]+(\s+[A-Z][a-z]+)+$/.test(l));
      if (candidate) parsed['full_name'] = candidate;
    }

    // 5. Fill remaining expected fields with empty or line fallback so user can complete
    expectedFields.forEach(f => {
      if (!parsed[f]) {
        parsed[f] = '';
      }
    });

    return parsed;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSavedSuccess(false);

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      runOCR(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const runOCR = async (imageSrc: string) => {
    setScanning(true);
    setProgress(0);
    setProgressStatus('Initializing Tesseract OCR worker in browser...');
    setRawText('');
    setExtractedData({});

    try {
      const worker = await createWorker('eng');
      
      setProgress(30);
      setProgressStatus('Processing image and recognizing text...');

      const ret = await worker.recognize(imageSrc);
      
      setProgress(90);
      setProgressStatus('Extracting key document fields...');

      const text = ret.data.text;
      setRawText(text);

      const parsed = parseFieldsFromText(text, selectedDocType);
      setExtractedData(parsed);

      await worker.terminate();

      setProgress(100);
      setProgressStatus('OCR Scan Complete!');

      // Save to client side LocalStorage
      saveToLocalStorage(parsed, selectedDocType, text);
    } catch (err: any) {
      console.error('OCR Error:', err);
      setError('OCR Processing failed. Please ensure the image is clear and contains readable text.');
    } finally {
      setScanning(false);
    }
  };

  const saveToLocalStorage = (data: Record<string, string>, docType: string, text: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ocrExtractedData', JSON.stringify(data));
      localStorage.setItem('ocrDocumentType', docType);
      localStorage.setItem('ocrRawText', text);
      localStorage.setItem('ocrScanTimestamp', new Date().toISOString());
      setSavedSuccess(true);
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    const updated = { ...extractedData, [key]: value };
    setExtractedData(updated);
    saveToLocalStorage(updated, selectedDocType, rawText);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 text-blue-700 text-xs font-bold mb-3 border border-blue-200">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          100% Private Client-Side Browser OCR
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Client-Side Document OCR Scanner
        </h1>
        <p className="text-sm sm:text-base text-slate-600 mt-2">
          Upload any government document (Aadhaar, Income, Caste, Student ID). Text is extracted directly in your browser using Tesseract.js and saved to client storage for filling application forms.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Controls & Image Upload */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-5">
            
            {/* Document Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Document Type
              </label>
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                disabled={scanning}
                className="w-full px-3.5 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 text-sm font-semibold bg-slate-50"
              >
                {DOCUMENT_TYPES.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* File Upload Box */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Upload Document Image
              </label>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div
                onClick={() => !scanning && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  scanning
                    ? 'border-blue-300 bg-blue-50/50 pointer-events-none'
                    : imagePreview
                    ? 'border-emerald-300 bg-emerald-50/30 hover:border-blue-400'
                    : 'border-slate-300 bg-slate-50 hover:bg-blue-50/40 hover:border-blue-400'
                }`}
              >
                {imagePreview ? (
                  <div className="space-y-3">
                    <img
                      src={imagePreview}
                      alt="Document Preview"
                      className="max-h-48 mx-auto rounded-xl shadow border border-slate-200 object-contain"
                    />
                    <p className="text-xs text-blue-600 font-semibold">
                      Click to change image
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 py-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto text-xl font-bold">
                      📸
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      Click to Upload or Drag Document Image
                    </p>
                    <p className="text-xs text-slate-500">
                      Supports PNG, JPG, JPEG (Aadhaar, Certificates, IDs)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Scanning Progress */}
            {scanning && (
              <div className="space-y-2 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <div className="flex justify-between text-xs font-bold text-blue-900">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    Scanning Document...
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-blue-700 font-medium">{progressStatus}</p>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Output & Form Mapping */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Extracted Client-Side Data
              </h2>

              {savedSuccess && (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1 border border-emerald-200">
                  <CheckCircle className="w-3.5 h-3.5" /> Saved in Browser
                </span>
              )}
            </div>

            {Object.keys(extractedData).length > 0 ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Review and edit the fields extracted from your image. Any changes are automatically synced to client storage.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {Object.entries(extractedData).map(([key, val]) => (
                    <div key={key} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        {key.replace(/_/g, ' ')}
                      </label>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        placeholder={`Enter ${key.replace(/_/g, ' ')}`}
                        className="w-full text-xs font-bold text-slate-900 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>

                {/* Raw OCR Text Toggle */}
                {rawText && (
                  <details className="mt-4 text-xs text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <summary className="font-bold cursor-pointer hover:text-blue-600">
                      Show Raw OCR Recognised Text
                    </summary>
                    <pre className="mt-2 text-[11px] text-slate-800 bg-white p-2.5 rounded-lg overflow-x-auto font-mono whitespace-pre-wrap max-h-40">
                      {rawText}
                    </pre>
                  </details>
                )}

                {/* Action Button to Form */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-emerald-600 font-semibold">
                    ✓ Data ready for scheme form filling
                  </span>
                  
                  <Link
                    href="/form"
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition"
                  >
                    Proceed to Application Form with Scanned Data
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Scan className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No Document Scanned Yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Upload an image on the left to start Tesseract.js client-side OCR extraction.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
