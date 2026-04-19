"use client";

import {
  Bot,
  LoaderCircle,
  MessageCircle,
  Minus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  AYANSH_FALLBACK_MESSAGE,
  AYANSH_QUICK_QUESTIONS,
  AYANSH_SUPPORT_EMAIL,
  AYANSH_WELCOME_MESSAGE,
  createAyanshMessage,
  findAyanshFaqAnswer,
  type AyanshMessage,
  type AyanshReply,
} from "@/lib/ayansh";
import {
  appResetEvent,
  authChangedEvent,
  ayanshChatStorageKey,
  ayanshOpenStorageKey,
  isAuthenticatedPayload,
} from "@/lib/client/auth-state";

type StoredAyanshState = {
  messages: AyanshMessage[];
};

const createWelcomeMessage = () =>
  createAyanshMessage({
    role: "assistant",
    content: AYANSH_WELCOME_MESSAGE,
    source: "welcome",
  });

const formatTimestamp = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export default function AyanshWidget() {
  const [open, setOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [messages, setMessages] = useState<AyanshMessage[]>(() => [createWelcomeMessage()]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const resetWidget = () => {
      setAuthenticated(false);
      setOpen(false);
      setMessages([createWelcomeMessage()]);
      setDraft("");
      setTyping(false);
      setError("");
      setHydrated(true);
    };

    const restoreFromStorage = () => {
      try {
        const stored = window.localStorage.getItem(ayanshChatStorageKey);
        const storedOpen = window.localStorage.getItem(ayanshOpenStorageKey);

        if (stored) {
          const parsed = JSON.parse(stored) as StoredAyanshState;

          if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
            setMessages(parsed.messages);
          }
        }

        if (storedOpen === "true") {
          setOpen(true);
        }
      } catch {
        setMessages([createWelcomeMessage()]);
        setOpen(false);
      } finally {
        setHydrated(true);
      }
    };

    let cancelled = false;

    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json().catch(() => null))
      .then((payload) => {
        if (cancelled) {
          return;
        }

        if (isAuthenticatedPayload(payload)) {
          setAuthenticated(true);
          restoreFromStorage();
          return;
        }

        resetWidget();
      })
      .catch(() => {
        if (!cancelled) {
          resetWidget();
        }
      });

    const handleAuthChanged = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : undefined;

      if (detail?.authenticated) {
        setAuthenticated(true);
        restoreFromStorage();
        return;
      }

      resetWidget();
    };

    window.addEventListener(authChangedEvent, handleAuthChanged);
    window.addEventListener(appResetEvent, resetWidget);

    return () => {
      cancelled = true;
      window.removeEventListener(authChangedEvent, handleAuthChanged);
      window.removeEventListener(appResetEvent, resetWidget);
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !authenticated) {
      return;
    }

    window.localStorage.setItem(ayanshChatStorageKey, JSON.stringify({ messages }));
  }, [authenticated, hydrated, messages]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (authenticated) {
      window.localStorage.setItem(ayanshOpenStorageKey, String(open));
    }

    if (open) {
      const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 120);
      return () => window.clearTimeout(focusTimer);
    }
  }, [authenticated, hydrated, open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, typing]);

  const recentHistory = useMemo(
    () =>
      messages
        .filter((message) => message.source !== "welcome")
        .slice(-8)
        .map(({ role, content }) => ({ role, content })),
    [messages],
  );

  const appendAssistantMessage = (content: string, source: AyanshMessage["source"]) => {
    setMessages((current) => [
      ...current,
      createAyanshMessage({
        role: "assistant",
        content,
        source,
      }),
    ]);
  };

  const askAyansh = async (question: string) => {
    const trimmed = question.trim();

    if (!trimmed || typing) {
      return;
    }

    setOpen(true);
    setDraft("");
    setError("");

    const userMessage = createAyanshMessage({
      role: "user",
      content: trimmed,
      source: "local",
    });

    setMessages((current) => [...current, userMessage]);

    const faqReply = findAyanshFaqAnswer(trimmed);

    if (faqReply) {
      window.setTimeout(() => appendAssistantMessage(faqReply.answer, "faq"), 180);
      return;
    }

    setTyping(true);

    try {
      const response = await fetch("/api/ayansh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: recentHistory,
        }),
      });
      const payload = (await response.json()) as Partial<AyanshReply> & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Ayansh could not answer right now.");
      }

      appendAssistantMessage(
        payload.answer || AYANSH_FALLBACK_MESSAGE,
        payload.mode === "ai" ? "ai" : payload.mode === "faq" ? "faq" : "fallback",
      );
    } catch {
      setError("Ayansh is having trouble connecting. Support details are shown below.");
      appendAssistantMessage(AYANSH_FALLBACK_MESSAGE, "fallback");
    } finally {
      setTyping(false);
    }
  };

  const submitQuestion = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void askAyansh(draft);
  };

  const clearChat = () => {
    setMessages([createWelcomeMessage()]);
    setError("");
    setDraft("");
  };

  return (
    <div className="fixed bottom-5 right-5 z-[80] font-sans text-slate-900 print:hidden max-sm:bottom-4 max-sm:right-4">
      {open ? (
        <section
          className="mb-4 flex h-[620px] w-[390px] flex-col overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/95 shadow-[0_30px_90px_rgba(15,23,42,0.26)] backdrop-blur-2xl transition-all duration-300 max-sm:fixed max-sm:inset-3 max-sm:mb-0 max-sm:h-auto max-sm:w-auto max-sm:rounded-[1.25rem]"
          aria-label="Ayansh AI Help Box chat panel"
        >
          <header className="relative overflow-hidden border-b border-slate-200 bg-slate-950 px-5 py-4 text-white">
            <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-indigo-500/30 blur-3xl" />
            <div className="absolute -bottom-20 left-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 shadow-inner ring-1 ring-white/20">
                  <Bot className="h-5 w-5 text-emerald-300" />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight">Ayansh - AI Help Box</h2>
                  <p className="mt-1 text-xs font-medium text-slate-300">
                    Your personal Real Path assistant
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={clearChat}
                  className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                  aria-label="Clear Ayansh chat"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                  aria-label="Minimize Ayansh"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white sm:hidden"
                  aria-label="Close Ayansh"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,_#f8fafc,_#ffffff)] px-5 py-5"
          >
            {messages.map((message) => {
              const fromUser = message.role === "user";

              return (
                <div
                  key={message.id}
                  className={`animate-ayansh-message flex ${fromUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                      fromUser
                        ? "rounded-br-md bg-indigo-600 text-white"
                        : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <p className="whitespace-pre-line">{message.content}</p>
                    {!fromUser && message.source === "welcome" ? (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {AYANSH_QUICK_QUESTIONS.map((item, index) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => askAyansh(item.label)}
                            disabled={typing}
                            className={`rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-3 text-left text-xs font-semibold text-indigo-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 ${
                              index < 2 ? "col-span-2" : ""
                            }`}
                          >
                            <span className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">
                              <Sparkles className="h-3.5 w-3.5" />
                              Quick action
                            </span>
                            {item.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <p
                      className={`mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                        fromUser ? "text-indigo-100" : "text-slate-400"
                      }`}
                    >
                      {formatTimestamp(message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}

            {typing ? (
              <div className="animate-ayansh-message flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                    <LoaderCircle className="h-4 w-4 animate-spin text-indigo-600" />
                    Ayansh is typing
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="border-t border-amber-100 bg-amber-50 px-5 py-3 text-xs font-medium text-amber-800">
              {error}{" "}
              <a href={`mailto:${AYANSH_SUPPORT_EMAIL}`} className="font-bold underline">
                {AYANSH_SUPPORT_EMAIL}
              </a>
            </div>
          ) : null}

          <form onSubmit={submitQuestion} className="border-t border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-inner focus-within:border-indigo-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50">
              <input
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask Ayansh anything..."
                className="min-w-0 flex-1 bg-transparent px-2 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                maxLength={1200}
              />
              <button
                type="submit"
                disabled={typing || !draft.trim()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-lg transition hover:scale-105 hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message to Ayansh"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {!open ? (
        <div className="group relative flex justify-end">
          <div className="pointer-events-none absolute bottom-full right-0 mb-3 translate-y-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 opacity-0 shadow-xl transition duration-200 group-hover:translate-y-0 group-hover:opacity-100">
            Ayansh AI Help Box
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="ayansh-pulse relative flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 via-indigo-600 to-emerald-500 text-white shadow-[0_20px_55px_rgba(79,70,229,0.38)] ring-1 ring-white/50 transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(79,70,229,0.46)] focus:outline-none focus:ring-4 focus:ring-indigo-200"
            aria-label="Open Ayansh AI Help Box"
            aria-expanded={open}
          >
            <span className="absolute inset-1 rounded-full border border-white/20" />
            <MessageCircle className="relative h-6 w-6" />
            <span className="relative mt-0.5 text-[11px] font-black tracking-tight">Ayansh</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
