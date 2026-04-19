"use client";

import Link from "next/link";

export default function Navbar() {
  const openAuth = (mode: "login" | "signup") => {
    window.dispatchEvent(new CustomEvent("real-path:open-auth", { detail: { mode } }));
  };

  return (
    <nav className="fixed top-0 w-full bg-white/70 backdrop-blur-md border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-gray-900">
        REAL PATH
        </Link>

        <div className="hidden md:flex gap-8 text-gray-600">
          <Link href="/builder" className="hover:text-green-600 transition">
            Resume Builder
          </Link>
         <Link href="/analyzer">
  Analyzer
</Link>
          <Link href="/pricing" className="hover:text-green-600 transition">
          Pricing
          </Link>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => openAuth("login")}
            className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-100 transition"
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => openAuth("signup")}
            className="px-5 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition"
          >
            Get Started
          </button>
        </div>
      </div>
    </nav>
  );
}
