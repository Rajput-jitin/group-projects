import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">🏛️</div>
            <span className="text-lg font-extrabold text-white">SchemeSeva AI</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            AI-powered Government Scheme Discovery and Intelligent Document Scanning Platform for citizens of India.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Quick Links</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/" className="hover:text-white transition">Home</Link></li>
            <li><Link href="/schemes" className="hover:text-white transition">All Schemes</Link></li>
            <li><Link href="/ocr" className="hover:text-white transition">OCR Document Scanner</Link></li>
            <li><Link href="/form" className="hover:text-white transition">Smart Form Auto-Fill</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Citizen Services</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/profile" className="hover:text-white transition">My Profile</Link></li>
            <li><Link href="/form" className="hover:text-white transition">Eligibility Checker</Link></li>
            <li><Link href="/schemes" className="hover:text-white transition">Scheme Catalog</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Security & Privacy</h4>
          <p className="text-xs text-slate-400 leading-relaxed mb-2">
            🔒 Client-side OCR: Your document images are scanned locally inside your browser and never sent to external servers.
          </p>
          <span className="inline-block px-2.5 py-1 rounded bg-slate-800 text-[11px] font-medium text-emerald-400 border border-slate-700">
            ✓ 100% Encrypted & Safe
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} SchemeSeva AI. All rights reserved. Government Scheme Discovery Platform.
      </div>
    </footer>
  );
}
