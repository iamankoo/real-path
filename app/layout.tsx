import type { Metadata } from "next";

import AyanshWidget from "@/components/ayansh/AyanshWidget";
import AuthPromptModal from "@/components/auth/AuthPromptModal";
import AuthSessionGuard from "@/components/auth/AuthSessionGuard";
import AuthReset from "@/components/AuthReset"; // ✅ NEW IMPORT
import { getCurrentUserSession } from "@/lib/server/session";

import "./globals.css";

export const metadata: Metadata = {
  title: "REAL PATH - AI Resume Builder",
  description: "Create professional resumes with AI-powered suggestions.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let initialAuthenticated = false;

  try {
    const auth = await getCurrentUserSession();
    initialAuthenticated = Boolean(auth.user);
  } catch (error) {
    console.error("Initial auth state check failed.", error);
  }

  return (
    <html lang="en">
      <body className="antialiased pt-20">
        
        {/* ✅ FIX: Proper client-side storage reset */}
        <AuthReset isAuth={initialAuthenticated} />

        <AuthSessionGuard initialAuthenticated={initialAuthenticated} />
        {children}
        <AuthPromptModal />
        <AyanshWidget />
      </body>
    </html>
  );
}