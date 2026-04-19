"use client";

import { FileText, LoaderCircle, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import InsightsDashboard from "@/components/resume/InsightsDashboard";
import {
  appResetEvent,
  authChangedEvent,
  authRefreshEvent,
} from "@/lib/client/auth-state";
import type { ResumeInsights } from "@/lib/resume";

type AnalyzerResult = ResumeInsights & {
  fileName: string;
  extractedCharacters: number;
  extractionMethod: "embedded-text" | "ocr-fallback";
};

const maxResumeBytes = 8 * 1024 * 1024;

type AnalyzerHistoryEntry = {
  fileName: string;
  targetRole: string;
  extractedCharacters: number;
  extractionMethod: AnalyzerResult["extractionMethod"];
  insights: AnalyzerResult;
};

export default function AnalyzerPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalyzerResult | null>(null);
  const [authMode, setAuthMode] = useState<"checking" | "guest" | "user">("checking");

  useEffect(() => {
    let cancelled = false;

    const refreshAuth = () => {
      fetch("/api/auth/me", { cache: "no-store" })
        .then((response) => response.json())
        .then((payload) => {
          if (!cancelled) {
            setAuthMode(payload.authenticated && payload.mode === "user" ? "user" : "guest");
          }
        })
        .catch(() => {
          if (!cancelled) {
            setAuthMode("guest");
          }
        });
    };
    const handleAuthChanged = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : undefined;
      setAuthMode(detail?.authenticated === false ? "guest" : "user");
    };
    const handleAppReset = () => {
      setFile(null);
      setTargetRole("");
      setDragging(false);
      setLoading(false);
      setError("");
      setResult(null);
      setAuthMode("guest");
    };

    refreshAuth();
    window.addEventListener(authRefreshEvent, refreshAuth);
    window.addEventListener(authChangedEvent, handleAuthChanged);
    window.addEventListener(appResetEvent, handleAppReset);

    return () => {
      cancelled = true;
      window.removeEventListener(authRefreshEvent, refreshAuth);
      window.removeEventListener(authChangedEvent, handleAuthChanged);
      window.removeEventListener(appResetEvent, handleAppReset);
    };
  }, []);

  const handleFileSelection = (selectedFile: File | null) => {
    setFile(selectedFile);
    setError("");
  };

  const persistHistory = async (historyEntry: AnalyzerHistoryEntry) => {
    if (authMode !== "user") {
      return;
    }

    const response = await fetch("/api/cloud/analyzer-history", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(historyEntry),
    }).catch(() => null);

    if (response?.ok) {
      const payload = await response.json().catch(() => null);

      if (payload?.mode !== "user") {
        window.dispatchEvent(new CustomEvent(authRefreshEvent));
      }

      return;
    }
  };

  const analyzeResume = async () => {
    if (!file) {
      setError("Upload a PDF resume first.");
      return;
    }

    if (file.size > maxResumeBytes) {
      setError("Upload a PDF resume smaller than 8 MB.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("targetRole", targetRole);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Analysis failed");
      }

      setResult(payload);
      const historyEntry: AnalyzerHistoryEntry = {
        fileName: payload.fileName,
        targetRole,
        extractedCharacters: payload.extractedCharacters,
        extractionMethod: payload.extractionMethod,
        insights: payload,
      };

      void persistHistory(historyEntry).catch(() => undefined);
    } catch (analysisError) {
      const message =
        analysisError instanceof Error
          ? analysisError.message
          : "Resume analysis failed. Please try another PDF.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(37,99,235,0.14),_transparent_30%),linear-gradient(180deg,_#f8fffc,_#eff7ff_52%,_#f8fafc)] px-4 py-10 md:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-[2rem] border border-white/60 bg-white/88 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.92fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-600">
                Analyzer V1
              </p>
              <h1 className="mt-4 text-5xl font-black tracking-tight text-slate-950">
                Upload, extract, analyze, improve.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                The analyzer now supports drag and drop, a proper upload button,
                a richer report with ATS score, role-fit, shortlist chance,
                keyword gaps, recommended roles, and OCR fallback for scanned PDFs
                on Vercel.
              </p>
            </div>

            <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50/80 p-6">
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  handleFileSelection(event.dataTransfer.files?.[0] || null);
                }}
                className={`rounded-[1.6rem] border-2 border-dashed p-8 text-center transition ${
                  dragging
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-300 bg-white"
                }`}
              >
                <UploadCloud className="mx-auto h-12 w-12 text-emerald-600" />
                <h2 className="mt-4 text-2xl font-bold text-slate-950">
                  Drag and drop your resume PDF
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {"Upload Resume -> Extract PDF -> Analyze with AI -> View detailed report."}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Text PDFs are parsed directly. Scanned or image-based PDFs fall back
                  to OCR when `OPENAI_API_KEY` is configured.
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={analyzeResume}
                    disabled={loading}
                    className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition enabled:hover:scale-[1.02] disabled:opacity-60"
                  >
                    {loading ? "Analyzing..." : "Analyze"}
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={(event) =>
                    handleFileSelection(event.target.files?.[0] || null)
                  }
                  className="hidden"
                />

                {file ? (
                  <div className="mt-6 flex items-center justify-center gap-3 rounded-full bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700">
                    <FileText className="h-4 w-4" />
                    {file.name}
                  </div>
                ) : null}
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Optional target role
                </label>
                <input
                  value={targetRole}
                  onChange={(event) => setTargetRole(event.target.value)}
                  placeholder="Frontend Developer, Full Stack Engineer, Data Analyst..."
                  className="input"
                />
              </div>

              {error ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {loading ? (
          <section className="rounded-[2rem] border border-slate-200 bg-white/92 p-10 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-emerald-600" />
            <p className="mt-4 text-lg font-semibold text-slate-950">
              Extracting content and scoring your resume. OCR fallback will be used automatically if the PDF has little or no embedded text.
            </p>
          </section>
        ) : null}

        {result ? (
          <section className="space-y-8">
            <InsightsDashboard insights={result} title="Advanced Analysis Report" />
          </section>
        ) : null}
      </div>
    </main>
  );
}
