"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { ResumeData, ResumeTemplate } from "@/lib/resume";

type SavedResume = {
  id: string;
  title: string;
  template: ResumeTemplate;
  data: ResumeData;
  version: number;
  updated_at: string;
};

export default function SavedResumesPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<SavedResume[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const restoreResume = (resume: SavedResume) => {
    window.localStorage.setItem(
      "real_path_resume_restore",
      JSON.stringify({
        id: resume.id,
        template: resume.template,
        data: resume.data,
      }),
    );
    router.push("/builder");
  };

  useEffect(() => {
    fetch("/api/cloud/resumes")
      .then(async (response) => {
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || "Saved resumes could not be loaded.");
        }

        return payload;
      })
      .then((payload) => {
        setResumes(payload.resumes || []);
        setMessage(payload.mode === "guest" ? "Guest mode is active. Cloud resumes are not saved." : "");
      })
      .catch((loadError) =>
        setMessage(
          loadError instanceof Error
            ? loadError.message
            : "Saved resumes could not be loaded.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#e6f4f1] via-[#edf3ff] to-[#f3e9ff] px-6 py-16 text-gray-800">
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-white/60 bg-white/90 p-8 shadow-2xl backdrop-blur-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-600">
          Saved Resumes
        </p>
        <h1 className="mt-4 text-4xl font-black text-gray-900">Real Path Cloud Library</h1>

        {message ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {message}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4">
          {loading ? <p className="text-slate-600">Loading saved resumes...</p> : null}
          {!loading && resumes.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-600">
              No saved resumes yet. Build a resume while logged in and it will appear here.
            </div>
          ) : null}
          {resumes.map((resume) => (
            <div key={resume.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-950">{resume.title}</h2>
              <p className="mt-2 text-sm text-slate-600">
                {resume.template} template - version {resume.version} - updated{" "}
                {new Date(resume.updated_at).toLocaleString()}
              </p>
              <button
                type="button"
                onClick={() => restoreResume(resume)}
                className="mt-4 rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:scale-[1.02]"
              >
                Open in builder
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
