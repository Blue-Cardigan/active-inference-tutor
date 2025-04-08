'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Effect for handling header visibility on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Show header if scrolling up or at the top
      if (currentScrollY < lastScrollY || currentScrollY < 10) {
        setShowHeader(true);
      } else {
        setShowHeader(false);
      }
      // Remember scroll position for the next comparison
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Cleanup listener on component unmount
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]); // Rerun effect if lastScrollY changes

  return (
    <>
      {/* --- Simple Header Navigation --- */}
      <header
        className={`bg-white shadow-sm sticky top-0 z-10 transition-transform duration-300 ease-in-out ${showHeader ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <nav className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="text-xl font-semibold text-gray-800 hover:text-blue-600 transition-colors">
            Active Inference Tutor
          </Link>
          <div className="flex items-center space-x-4">
          </div>
        </nav>
      </header>

      {/* --- Main Content Area --- */}
      <main className="min-h-screen pt-6 pb-12 bg-gray-100 text-gray-900">
        {children}
      </main>

      {/* --- Optional Footer --- */}
      {/* <footer className="bg-gray-200 text-center p-4 text-sm text-gray-600">
            © {new Date().getFullYear()} Active Inference Tutor
        </footer> */}
    </>
  );
} 