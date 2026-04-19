import { HELP_CONTACT_EMAIL } from "@/lib/constants";

export const AYANSH_SUPPORT_EMAIL = HELP_CONTACT_EMAIL;

export const AYANSH_WELCOME_MESSAGE =
  "Hello. I am Ayansh. I can help with resume building, ATS analysis, downloads, login issues, and AI Photo Studio.";

export const AYANSH_FALLBACK_MESSAGE = `I'm unable to fully solve this right now. Please contact our support team.\n\nSupport: ${AYANSH_SUPPORT_EMAIL}`;

export type AyanshRole = "assistant" | "user";

export type AyanshMessage = {
  id: string;
  role: AyanshRole;
  content: string;
  createdAt: string;
  source?: "welcome" | "faq" | "ai" | "fallback" | "local";
};

export type AyanshQuickQuestion = {
  id: string;
  label: string;
  matchers: string[];
  answer: string;
};

export type AyanshReplyMode = "faq" | "ai" | "fallback";

export type AyanshReply = {
  answer: string;
  mode: AyanshReplyMode;
};

export const AYANSH_QUICK_QUESTIONS: AyanshQuickQuestion[] = [
  {
    id: "analyzer",
    label: "Analyzer help",
    matchers: ["resume analyzer not working", "analyzer", "upload resume", "ats analyzer"],
    answer:
      "Try uploading a fresh PDF and keep the file under the platform limit. Text PDFs are read directly, and scanned PDFs use OCR when OpenAI is connected. If the analyzer still fails, refresh once, re-upload the file, and make sure the resume is not password-protected.",
  },
  {
    id: "pdf-download",
    label: "PDF export issue",
    matchers: ["pdf download issue", "download pdf", "pdf export", "download issue"],
    answer:
      "Open the final resume preview first, wait for it to finish rendering, then click Download PDF. If the browser blocks the file, allow downloads for Real Path and try again. The export path is built to preserve the same resume styling you see in preview.",
  },
  {
    id: "login-account",
    label: "Login or signup",
    matchers: ["login", "signup", "account", "password", "email"],
    answer:
      "You can build as a guest immediately. Login is only needed for Real Path Cloud save. Use your email and password to log in, or create an account with full name, email, and password. There is no OTP or mobile verification step.",
  },
  {
    id: "ats-score",
    label: "Improve ATS score",
    matchers: ["improve ats score", "ats score", "score", "keywords"],
    answer:
      "Start with the target job title, paste the job description into the analyzer, then tune your summary, skills, and bullets around the exact tools and responsibilities in that role. Strong ATS resumes use clear section titles, measurable achievements, matching keywords, and no graphics-heavy formatting.",
  },
];

const normalizeQuestion = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\w\s/.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const findAyanshFaqAnswer = (question: string): AyanshReply | null => {
  const normalized = normalizeQuestion(question);

  if (!normalized) {
    return null;
  }

  const match = AYANSH_QUICK_QUESTIONS.find((item) =>
    item.matchers.some((matcher) => normalized.includes(normalizeQuestion(matcher))),
  );

  return match ? { answer: match.answer, mode: "faq" } : null;
};

export const createAyanshMessage = ({
  role,
  content,
  source,
}: {
  role: AyanshRole;
  content: string;
  source?: AyanshMessage["source"];
}): AyanshMessage => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  role,
  content,
  createdAt: new Date().toISOString(),
  source,
});

