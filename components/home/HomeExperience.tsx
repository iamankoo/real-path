"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  LogIn,
  LogOut,
  Menu,
  Sparkles,
  Upload,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import { useEffect } from "react";

import { HELP_CONTACT_EMAIL } from "@/lib/constants";

const templateCards = [
  {
    id: "modern",
    title: "Modern",
    description: "Bold headline, high-signal skills, and a clean recruiter-first reading path.",
    imageSrc: "/images/templates/modern-preview.svg",
    accent: "from-sky-500 to-violet-600",
  },
  {
    id: "professional",
    title: "Professional",
    description: "Structured, conservative, and polished for consulting, enterprise, and leadership roles.",
    imageSrc: "/images/templates/professional-preview.svg",
    accent: "from-slate-700 to-slate-500",
  },
  {
    id: "minimal",
    title: "Minimal",
    description: "Tight typography and lighter chrome for one-page resumes that stay quietly sharp.",
    imageSrc: "/images/templates/minimal-preview.svg",
    accent: "from-emerald-500 to-cyan-500",
  },
] as const;

const quoteRowOne = [
  "Recruiters spend only 6 seconds on a resume",
  "Tailored resumes increase interview chances by 2x",
  "Use action verbs to stand out",
  "Quantified impact gets noticed faster",
];

const quoteRowTwo = [
  "ATS-friendly structure beats fancy decoration",
  "One-page resumes feel more intentional",
  "Role-fit keywords improve shortlist odds",
  "Clear summaries help hiring managers decide faster",
];

export default function HomeExperience() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cloudUser, setCloudUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const refreshUser = () => {
      fetch("/api/auth/me", { cache: "no-store" })
        .then((response) => response.json())
        .then((payload) => {
          if (!cancelled && payload.authenticated && payload.user) {
            setCloudUser({ name: payload.user.name, email: payload.user.email });
          } else if (!cancelled) {
            setCloudUser(null);
          }
        })
        .catch(() => undefined);
    };

    const handleAuthChanged = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : undefined;
      const user = detail?.user;

      if (user?.name && user?.email) {
        setCloudUser({ name: user.name, email: user.email });
      } else {
        refreshUser();
      }
    };

    refreshUser();
    window.addEventListener("real-path:auth-changed", handleAuthChanged);

    return () => {
      cancelled = true;
      window.removeEventListener("real-path:auth-changed", handleAuthChanged);
    };
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setCloudUser(null);
    window.dispatchEvent(
      new CustomEvent("real-path:auth-changed", {
        detail: { authenticated: false, user: null },
      }),
    );
    router.replace("/");
    router.refresh();
  };

  const openLogin = () => {
    setDrawerOpen(false);
    window.dispatchEvent(new CustomEvent("real-path:open-auth", { detail: { mode: "login" } }));
  };

  const drawerItems = [
    { label: "Profile", href: "/profile", icon: User },
    { label: "Saved Resumes", href: "/saved-resumes", icon: FileText },
    { label: "Saved Photos", href: "/saved-photos", icon: ImageIcon },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#e6f4f1] via-[#edf3ff] to-[#f3e9ff] text-gray-800">
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="fixed right-6 top-6 z-50 rounded-xl border border-white/50 bg-white/80 p-3 text-gray-900 shadow-xl backdrop-blur-xl transition hover:scale-105"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {drawerOpen ? (
        <div className="fixed inset-0 z-[60] bg-slate-950/35" onClick={() => setDrawerOpen(false)}>
          <aside
            className="absolute right-0 top-0 h-full w-full max-w-sm border-l border-white/50 bg-white/95 p-6 shadow-2xl backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-600">
                  REAL PATH
                </p>
                <h2 className="mt-2 text-2xl font-bold text-gray-900">Cloud Menu</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {cloudUser ? cloudUser.email : "Guest workspace"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-xl border border-gray-200 p-2 text-gray-700 transition hover:bg-gray-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-8 space-y-3">
              {drawerItems.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      router.push(item.href);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-left font-semibold text-gray-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700"
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <div className="flex items-center gap-3 text-emerald-700">
                <HelpCircle className="h-5 w-5" />
                <h3 className="font-bold">Help & Contact</h3>
              </div>
              <a
                href={`mailto:${HELP_CONTACT_EMAIL}`}
                className="mt-3 block text-sm font-semibold text-emerald-700 underline-offset-4 hover:underline"
              >
                {HELP_CONTACT_EMAIL}
              </a>
            </div>

            {cloudUser ? (
              <button
                type="button"
                onClick={logout}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-4 text-sm font-semibold text-white transition hover:scale-[1.02]"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            ) : (
              <button
                type="button"
                onClick={openLogin}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-4 text-sm font-semibold text-white transition hover:scale-[1.02]"
              >
                <LogIn className="h-4 w-4" />
                Login / Signup
              </button>
            )}
          </aside>
        </div>
      ) : null}
      <section className="relative max-w-7xl mx-auto px-6 pt-40 pb-32 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <p className="text-sm font-semibold text-indigo-600 mb-4 uppercase tracking-wider">
            AI Resume Platform
          </p>

          <h1 className="text-6xl font-extrabold leading-tight mb-6 text-gray-900">
            Is your resume <br />
            good enough?
          </h1>

          <p className="text-lg text-gray-600 mb-10 max-w-lg">
            Analyze your resume with AI or build a job-winning one from scratch.
            Optimize for ATS, recruiters and top companies.
          </p>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl">
            <div className="group bg-white/80 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 hover:shadow-2xl hover:-translate-y-3 hover:scale-[1.05] transition-all duration-500 ease-out transform cursor-pointer">
              <Upload className="w-6 h-6 text-green-500 mb-3" />

              <h3 className="text-lg font-semibold mb-2">
                Analyze Resume
              </h3>

              <p className="text-sm text-gray-500 mb-5">
                Upload your resume and get instant ATS score with detailed feedback.
              </p>

              <button
                onClick={() => router.push("/analyzer")}
                className="w-full bg-green-500 text-white py-2.5 rounded-lg font-medium hover:bg-green-600"
              >
                Upload Resume
              </button>
            </div>

            <div className="group bg-white backdrop-blur-xl border border-indigo-200 rounded-2xl shadow-xl p-6 hover:shadow-2xl hover:-translate-y-3 hover:scale-[1.05] transition-all duration-500 ease-out transform cursor-pointer">
              <Sparkles className="w-6 h-6 text-indigo-600 mb-3" />

              <h3 className="text-lg font-semibold mb-2">
                Build Resume
              </h3>

              <p className="text-sm text-gray-500 mb-5">
                Create a professional resume with AI guidance and smart templates.
              </p>

              <button
                onClick={() => router.push("/builder")}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700"
              >
                Start Building
              </button>
            </div>
          </div>
        </div>

        <div className="hidden md:block">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-10">
            <p className="text-sm text-gray-500 mb-2">
              Resume Score
            </p>

            <div className="w-full bg-gray-200 rounded-full h-4 mb-3 overflow-hidden">
              <div className="bg-green-500 h-4 rounded-full w-[92%]"></div>
            </div>

            <p className="text-green-600 font-semibold mb-6">
              92 / 100 — Excellent
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-600">
            Professional Templates
          </p>
          <h2 className="mt-4 text-4xl font-black text-slate-950">
            Pick a real layout before you start filling sections
          </h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {templateCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => router.push(`/builder?template=${card.id}`)}
              className="group overflow-hidden rounded-[1.6rem] border border-white/70 bg-white/92 text-left shadow-[0_22px_70px_rgba(15,23,42,0.1)] transition hover:-translate-y-1 hover:shadow-[0_32px_90px_rgba(15,23,42,0.16)]"
            >
              <div className={`bg-gradient-to-r ${card.accent} p-[1px]`}>
                <div className="rounded-t-[1.55rem] bg-white p-4">
                  <div className="overflow-hidden rounded-[1.2rem] border border-slate-100 bg-slate-50">
                    <Image
                      src={card.imageSrc}
                      alt={`${card.title} resume preview`}
                      width={960}
                      height={720}
                      className="h-64 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-2xl font-bold text-slate-950">{card.title}</h3>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
                    Preview
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{card.description}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700">
                  Use this template
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="overflow-hidden rounded-[1.8rem] bg-gradient-to-r from-indigo-700 via-violet-600 to-sky-600 p-[1px] shadow-[0_26px_90px_rgba(79,70,229,0.22)]">
          <div className="overflow-hidden rounded-[calc(1.8rem-1px)] bg-slate-950 px-0 py-10 text-white">
            <div className="px-8">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-200">
                Resume Insights
              </p>
              <h2 className="mt-3 text-3xl font-black">Sharper resumes move faster</h2>
            </div>

            <div className="mt-8 space-y-4">
              <div className="marquee-mask">
                <div className="marquee-track marquee-left">
                  {[...quoteRowOne, ...quoteRowOne].map((quote, index) => (
                    <span
                      key={`${quote}-one-${index}`}
                      className="inline-flex shrink-0 items-center rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm font-semibold text-white/95 backdrop-blur"
                    >
                      {quote}
                    </span>
                  ))}
                </div>
              </div>

              <div className="marquee-mask">
                <div className="marquee-track marquee-right">
                  {[...quoteRowTwo, ...quoteRowTwo].map((quote, index) => (
                    <span
                      key={`${quote}-two-${index}`}
                      className="inline-flex shrink-0 items-center rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm font-semibold text-white/95 backdrop-blur"
                    >
                      {quote}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .marquee-mask {
          overflow: hidden;
          width: 100%;
        }

        .marquee-track {
          display: flex;
          width: max-content;
          gap: 1rem;
          padding: 0 2rem;
        }

        .marquee-left {
          animation: marquee-left 28s linear infinite;
        }

        .marquee-right {
          animation: marquee-right 28s linear infinite;
        }

        @keyframes marquee-left {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        @keyframes marquee-right {
          from {
            transform: translateX(-50%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </main>
  );
}
