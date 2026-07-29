'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getToken, removeToken } from '@/lib/api';
import { User, LogIn, LogOut, FileText, Scan, Home, BookOpen, ShieldCheck } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const token = getToken();
    setIsLoggedIn(!!token);
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setUserName(u.full_name || u.email || 'User');
      } catch (e) {
        setUserName('User');
      }
    }
  }, [pathname]);

  const handleLogout = () => {
    removeToken();
    setIsLoggedIn(false);
    router.push('/login');
  };

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/schemes', label: 'Schemes', icon: BookOpen },
    { href: '/ocr', label: 'OCR Scanner', icon: Scan },
    { href: '/form', label: 'Application Form', icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-blue-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:scale-105 transition-transform">
            🏛️
          </div>
          <div>
            <span className="text-xl font-extrabold bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 bg-clip-text text-transparent">
              SchemeSeva <span className="text-orange-500 font-black">AI</span>
            </span>
            <span className="block text-[10px] tracking-wider text-gray-500 font-semibold uppercase -mt-1">
              Government Welfare Portal
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                    : 'text-gray-600 hover:text-blue-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side auth buttons */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  pathname === '/profile'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  {userName.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:inline font-semibold">{userName}</span>
              </Link>

              <button
                onClick={handleLogout}
                title="Logout"
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
              >
                <LogIn className="w-4 h-4" />
                Login
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-sm hover:shadow transition-all"
              >
                <User className="w-4 h-4" />
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
