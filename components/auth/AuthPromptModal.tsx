"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Cloud, LockKeyhole, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  analyzerHistoryKey,
  appResetEvent,
  authChangedEvent,
  authOpenEvent,
  authRefreshEvent,
  lastCloudResumeIdKey,
  promptSeenKey,
  resumeDraftKey,
} from "@/lib/client/auth-state";

type AuthMode = "login" | "signup";
type ModalView = "prompt" | "auth";

type AuthUser = {
  id: string;
  name: string;
  email: string;
};

const features = [
  "Resume auto save",
  "Analyzer history",
  "Version backup",
  "Multi-device access",
];

const isTypingElement = (element: Element | null) => {
  if (!element) {
    return false;
  }

  const tagName = element.tagName.toLowerCase();

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    element.getAttribute("contenteditable") === "true"
  );
};

const markPromptSeen = () => {
  window.sessionStorage.setItem(promptSeenKey, "true");
};

const safeReadJson = <T,>(key: string) => {
  const raw = window.localStorage.getItem(key);

  if (!raw) {
    return { ok: true as const, value: null as T | null };
  }

  try {
    return { ok: true as const, value: JSON.parse(raw) as T };
  } catch {
    window.localStorage.removeItem(key);
    return { ok: false as const, value: null };
  }
};

const replayGuestAnalyzerHistory = async () => {
  const parsed = safeReadJson<unknown[]>(analyzerHistoryKey);

  if (!parsed.ok) {
    return;
  }

  if (!Array.isArray(parsed.value)) {
    window.localStorage.removeItem(analyzerHistoryKey);
    return;
  }

  if (!parsed.value.length) {
    return;
  }

  const history = parsed.value.slice(-10);

  const results = await Promise.all(
    history.map(async (entry) => {
      const response = await fetch("/api/cloud/analyzer-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      }).catch(() => null);

      if (!response?.ok) {
        return false;
      }

      const payload = await response.json().catch(() => null);
      return payload?.mode === "user" && payload?.saved === true;
    }),
  );

  if (results.every(Boolean)) {
    window.localStorage.removeItem(analyzerHistoryKey);
  }
};

const replayGuestResumeDraft = async () => {
  const parsed = safeReadJson<Record<string, unknown>>(resumeDraftKey);

  if (!parsed.ok || !parsed.value) {
    return;
  }

  const draft = parsed.value;
  const response = await fetch("/api/cloud/resumes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title:
        typeof draft.title === "string" && draft.title.trim()
          ? draft.title
          : "Imported guest resume",
      template: draft.template || "modern",
      data: draft.data,
    }),
  }).catch(() => null);

  const payload = response?.ok ? await response.json().catch(() => null) : null;

  if (payload?.mode === "user" && payload?.saved === true && payload?.resume?.id) {
    window.localStorage.setItem(lastCloudResumeIdKey, payload.resume.id);
    window.localStorage.removeItem(resumeDraftKey);
  }
};

export default function AuthPromptModal() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ModalView>("prompt");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const promptDismissTimerRef = useRef<number | null>(null);
  const closeAfterAuthTimerRef = useRef<number | null>(null);

  const dismiss = () => {
    if (promptDismissTimerRef.current) {
      window.clearTimeout(promptDismissTimerRef.current);
      promptDismissTimerRef.current = null;
    }

    setOpen(false);
    setError("");
    setMessage("");
    markPromptSeen();
  };

  const openAuth = useCallback((mode: AuthMode = "login") => {
    if (promptDismissTimerRef.current) {
      window.clearTimeout(promptDismissTimerRef.current);
      promptDismissTimerRef.current = null;
    }

    markPromptSeen();
    setAuthMode(mode);
    setView("auth");
    setOpen(true);
    setError("");
    setMessage("");
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled) {
          setAuthenticated(Boolean(payload.authenticated && payload.mode === "user"));
        }
      })
      .catch(() => undefined);

    const openAuthFromEvent = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : undefined;
      setAuthenticated(false);
      openAuth(detail?.mode === "signup" ? "signup" : "login");
    };
    const handleAuthChanged = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : undefined;
      setAuthenticated(Boolean(detail?.authenticated ?? detail?.user));
    };
    const refreshAuthFromEvent = () => {
      fetch("/api/auth/me", { cache: "no-store" })
        .then((response) => response.json())
        .then((payload) => {
          if (!cancelled) {
            setAuthenticated(Boolean(payload.authenticated && payload.mode === "user"));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setAuthenticated(false);
          }
        });
    };
    const handleAppReset = () => {
      setAuthenticated(false);
      setOpen(false);
      setView("prompt");
      setLoading(false);
      setError("");
      setMessage("");
    };

    window.addEventListener(authOpenEvent, openAuthFromEvent);
    window.addEventListener(authChangedEvent, handleAuthChanged);
    window.addEventListener(authRefreshEvent, refreshAuthFromEvent);
    window.addEventListener(appResetEvent, handleAppReset);

    return () => {
      cancelled = true;
      window.removeEventListener(authOpenEvent, openAuthFromEvent);
      window.removeEventListener(authChangedEvent, handleAuthChanged);
      window.removeEventListener(authRefreshEvent, refreshAuthFromEvent);
      window.removeEventListener(appResetEvent, handleAppReset);
    };
  }, [openAuth]);

  useEffect(() => {
    if (authenticated || window.sessionStorage.getItem(promptSeenKey) === "true") {
      return;
    }

    let timerId: number | undefined;

    const tryOpenPrompt = () => {
      if (window.sessionStorage.getItem(promptSeenKey) === "true" || authenticated) {
        return;
      }

      if (isTypingElement(document.activeElement)) {
        timerId = window.setTimeout(tryOpenPrompt, 2000);
        return;
      }

      markPromptSeen();
      setView("prompt");
      setOpen(true);
    };

    timerId = window.setTimeout(tryOpenPrompt, 10000);

    return () => {
      if (timerId) {
        window.clearTimeout(timerId);
      }
    };
  }, [authenticated]);

  useEffect(() => {
    if (!open || view !== "prompt") {
      return;
    }

    promptDismissTimerRef.current = window.setTimeout(() => {
      setOpen(false);
    }, 5000);

    return () => {
      if (promptDismissTimerRef.current) {
        window.clearTimeout(promptDismissTimerRef.current);
        promptDismissTimerRef.current = null;
      }
    };
  }, [open, view]);

  const cancelPromptAutoDismiss = () => {
    if (promptDismissTimerRef.current) {
      window.clearTimeout(promptDismissTimerRef.current);
      promptDismissTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (closeAfterAuthTimerRef.current) {
        window.clearTimeout(closeAfterAuthTimerRef.current);
      }
    };
  }, []);

  const finishAuth = async (user?: AuthUser) => {
    setMessage(user ? `Welcome, ${user.name}. Saving your work to cloud.` : "Login successful.");

    const migrationResults = await Promise.allSettled([
      replayGuestResumeDraft(),
      replayGuestAnalyzerHistory(),
    ]);
    const hasMigrationFailure = migrationResults.some((result) => result.status === "rejected");

    setAuthenticated(true);
    window.dispatchEvent(
      new CustomEvent(authChangedEvent, { detail: { authenticated: true, user } }),
    );

    if (hasMigrationFailure) {
      setMessage(
        "Login successful. Your guest draft is still on this device and will retry when autosave runs.",
      );
    }

    if (closeAfterAuthTimerRef.current) {
      window.clearTimeout(closeAfterAuthTimerRef.current);
    }

    closeAfterAuthTimerRef.current = window.setTimeout(() => setOpen(false), 650);
  };

  const submitLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || "Login failed.");
      }

      await finishAuth(payload?.user);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const submitSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || "Signup failed.");
      }

      await finishAuth(payload?.user);
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  if (authenticated) {
    return null;
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="real-path-auth-prompt-title"
            className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/30 bg-white/88 p-6 text-slate-950 shadow-[0_35px_90px_rgba(15,23,42,0.38)] backdrop-blur-2xl md:p-7"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(event) => event.stopPropagation()}
            onFocus={cancelPromptAutoDismiss}
            onPointerMove={cancelPromptAutoDismiss}
            onKeyDown={cancelPromptAutoDismiss}
          >
            <button
              type="button"
              onClick={dismiss}
              className="absolute right-5 top-5 rounded-full bg-white/80 p-2 text-slate-600 shadow-sm transition hover:bg-white hover:text-slate-950"
              aria-label="Close login prompt"
            >
              <X className="h-4 w-4" />
            </button>

            {view === "prompt" ? (
              <div>
                <div className="inline-flex rounded-3xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 p-4 text-white shadow-lg">
                  <Cloud className="h-7 w-7" />
                </div>

                <h2
                  id="real-path-auth-prompt-title"
                  className="mt-6 pr-8 text-3xl font-black leading-tight text-slate-950"
                >
                  Save your resume securely on Real Path Cloud
                </h2>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  Login now to save your resume, access it anytime, and continue
                  from any device instantly.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 rounded-2xl border border-indigo-100 bg-white/75 px-3 py-3 text-sm font-semibold text-slate-700"
                    >
                      <Check className="h-4 w-4 text-emerald-600" />
                      {feature}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => openAuth("login")}
                  className="mt-7 w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:scale-[1.02] hover:bg-indigo-700"
                >
                  Login / Signup
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="mt-3 w-full rounded-xl px-5 py-3 text-sm font-semibold text-slate-500 transition hover:bg-white/70 hover:text-slate-950"
                >
                  Not now
                </button>
              </div>
            ) : (
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-indigo-700">
                  <LockKeyhole className="h-4 w-4" />
                  Real Path Cloud
                </div>

                <h2
                  id="real-path-auth-prompt-title"
                  className="mt-5 pr-8 text-3xl font-black text-slate-950"
                >
                  {authMode === "login" ? "Login to save your work." : "Create your cloud account."}
                </h2>

                <div className="mt-6 flex rounded-xl bg-slate-100 p-1">
                  {(["login", "signup"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setAuthMode(mode);
                        setError("");
                      }}
                      className={`flex-1 rounded-lg px-4 py-2 text-sm font-bold capitalize transition ${
                        authMode === mode
                          ? "bg-white text-indigo-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-950"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {message ? (
                  <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {message}
                  </div>
                ) : null}

                {error ? (
                  <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}

                {authMode === "login" ? (
                  <form className="mt-6 space-y-4" onSubmit={submitLogin}>
                    <input
                      name="email"
                      type="email"
                      required
                      className="input"
                      placeholder="Email"
                    />
                    <input
                      name="password"
                      type="password"
                      required
                      className="input"
                      placeholder="Password"
                    />
                    <button disabled={loading} className="btn-primary w-full">
                      {loading ? "Logging in..." : "Login / Signup"}
                    </button>
                  </form>
                ) : (
                  <form className="mt-6 space-y-4" onSubmit={submitSignup}>
                    <input name="name" required className="input" placeholder="Full name" />
                    <input
                      name="email"
                      type="email"
                      required
                      className="input"
                      placeholder="Email"
                    />
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      className="input"
                      placeholder="Password"
                    />
                    <button disabled={loading} className="btn-primary w-full">
                      {loading ? "Creating account..." : "Create account"}
                    </button>
                  </form>
                )}

                <button
                  type="button"
                  onClick={dismiss}
                  className="mt-4 w-full rounded-xl px-5 py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                >
                  Not now
                </button>
              </div>
            )}
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
