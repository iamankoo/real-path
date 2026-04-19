"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#e6f4f1] via-[#edf3ff] to-[#f3e9ff] px-6 py-16 text-gray-800">
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-white/60 bg-white/90 p-8 text-center shadow-2xl backdrop-blur-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-rose-600">
          Something went wrong
        </p>
        <h1 className="mt-4 text-4xl font-black text-gray-900">
          Real Path hit a temporary issue.
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Your work is protected by local editing and cloud save retries. Please try
          again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-8 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:scale-[1.02]"
        >
          Retry
        </button>
      </section>
    </main>
  );
}
