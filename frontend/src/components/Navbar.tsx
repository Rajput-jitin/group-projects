'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { User, FileText, Scan, Home, BookOpen, Sparkles } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setUserName(u.full_name || 'Citizen');
      } catch (e) {
        setUserName('Citizen');
      }
    } else {
      setUserName('Citizen');
    }
  }, [pathname]);

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/schemes', label: 'Find Schemes', icon: BookOpen },
    { href: '/ocr', label: 'Analytics & OCR', icon: Scan },
    { href: '/form', label: 'Apply Form', icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-cyan-500 p-0.5 shadow-lg group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-xl">
              🏛️
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-white tracking-tight">
                Scheme<span className="text-amber-400">Seva</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-950 text-cyan-400 border border-cyan-800/80 flex items-center gap-1 shadow-inner">
                <Sparkles className="w-3 h-3 text-cyan-400" /> Smart Offline AI
              </span>
            </div>
          </div>
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side — Profile button (always visible) */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link
            href="/profile"
            className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-100 transition group shadow-sm"
          >
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-cyan-500 p-0.5">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-xs font-black text-amber-400">
                {userName.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
            <span className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition">
              {userName.split(' ')[0] || 'Profile'}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
