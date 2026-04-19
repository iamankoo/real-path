"use client";

import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

import ResumePreview from "@/app/builder/ResumePreview";
import InsightsDashboard from "@/components/resume/InsightsDashboard";
import TemplateRenderer from "@/components/resume/TemplateRenderer";
import { useResumeStore } from "@/components/builder/useResumeStore";
import {
  appResetEvent,
  authChangedEvent,
  authRefreshEvent,
  cloudRestoreKey,
  lastCloudResumeIdKey,
} from "@/lib/client/auth-state";
import { analyzeResumeData } from "@/lib/resume-analysis";
import {
  type ResumeBasics,
  type ResumeData,
  type ResumeEditor,
  type ResumeTemplate,
  optimizeResumeForOnePage,
  roleOptions,
  templateOptions,
} from "@/lib/resume";

const totalSteps = 8;

const isTemplate = (value: string | null): value is ResumeTemplate =>
  templateOptions.some((option) => option.id === value);

type StoredResumeDraft = {
  id?: string | null;
  template?: ResumeTemplate;
  step?: number;
  title?: string;
  data?: Partial<ResumeData>;
};

const parseStoredDraft = (value: string | null) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as StoredResumeDraft;
  } catch {
    return null;
  }
};

export default function BuilderExperience() {
  const searchParams = useSearchParams();
  const queryTemplate = searchParams.get("template");
  const {
    selectedTemplate,
    setSelectedTemplate,
    basics,
    education,
    experience,
    projects,
    skills,
    certifications,
    achievements,
    resumeData,
    updateBasic,
    updateSkill,
    updateEducation,
    updateExperience,
    updateProject,
    updateCertification,
    updateAchievement,
    addEducation,
    addExperience,
    addProject,
    addCertification,
    addAchievement,
    removeEducation,
    removeExperience,
    removeProject,
    removeCertification,
    removeAchievement,
    applyResumePatch,
    resetResumeState,
  } = useResumeStore(isTemplate(queryTemplate) ? queryTemplate : "modern");

  const [step, setStep] = useState(0);
  const [role, setRole] = useState<(typeof roleOptions)[number]["value"] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [improving, setImproving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState("Checking cloud session...");
  const [authMode, setAuthMode] = useState<"checking" | "guest" | "user">("checking");
  const [syncNonce, setSyncNonce] = useState(0);
  const deferredResume = useDeferredValue(resumeData);
  const optimizedResume = useMemo(() => optimizeResumeForOnePage(resumeData), [resumeData]);
  const deferredOptimizedResume = useDeferredValue(optimizedResume);
  const insights = analyzeResumeData(deferredOptimizedResume);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const cloudResumeIdRef = useRef<string | null>(null);
  const hasRestoredRef = useRef(false);
  const finalPreviewTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isTemplate(queryTemplate) && queryTemplate !== selectedTemplate) {
      setSelectedTemplate(queryTemplate);
    }
  }, [queryTemplate, selectedTemplate, setSelectedTemplate]);

  useEffect(() => {
    let cancelled = false;

    const refreshAuth = () => {
      fetch("/api/auth/me", { cache: "no-store" })
        .then((response) => response.json())
        .then((payload) => {
          if (cancelled) {
            return;
          }

          setAuthMode(payload.authenticated && payload.mode === "user" ? "user" : "guest");
          setSaveStatus(
            payload.authenticated && payload.mode === "user"
              ? "Cloud session ready."
              : "Log in to save this resume to Real Path Cloud.",
          );
        })
        .catch(() => {
          if (!cancelled) {
            setAuthMode("guest");
            setSaveStatus("Log in to save this resume to Real Path Cloud.");
          }
        });
    };

    refreshAuth();
    window.addEventListener(authRefreshEvent, refreshAuth);

    return () => {
      cancelled = true;
      window.removeEventListener(authRefreshEvent, refreshAuth);
    };
  }, []);

  useEffect(() => {
    if (hasRestoredRef.current) {
      return;
    }

    hasRestoredRef.current = true;
    const saved = window.localStorage.getItem(cloudRestoreKey);

    if (!saved) {
      return;
    }

    const parsed = parseStoredDraft(saved);

    if (!parsed) {
      window.localStorage.removeItem(cloudRestoreKey);
      setSaveStatus("Saved resume restore data was invalid and has been reset.");
      return;
    }

    if (parsed.data) {
      applyResumePatch(parsed.data);
    }

    if (parsed.template && isTemplate(parsed.template)) {
      setSelectedTemplate(parsed.template);
    }

    cloudResumeIdRef.current = parsed.id || null;
    setStep(9);
    setSaveStatus("Loaded saved resume from Real Path Cloud.");

    window.localStorage.removeItem(cloudRestoreKey);
  }, [applyResumePatch, setSelectedTemplate]);

  useEffect(() => {
    const handleAppReset = () => {
      const defaultTemplate = isTemplate(queryTemplate) ? queryTemplate : "modern";

      cloudResumeIdRef.current = null;
      resetResumeState(defaultTemplate);
      setStep(0);
      setRole(null);
      setIsGenerating(false);
      setImproving(false);
      setDownloading(false);
      setAiMessage("");
      setAuthMode("guest");
      setSaveStatus("Session required for cloud save. Start a fresh resume.");
      setSyncNonce((current) => current + 1);
    };

    window.addEventListener(appResetEvent, handleAppReset);

    return () => {
      window.removeEventListener(appResetEvent, handleAppReset);
    };
  }, [queryTemplate, resetResumeState]);

  useEffect(() => {
    const handleAuthChanged = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : undefined;

      if (detail?.authenticated === false) {
        cloudResumeIdRef.current = null;
        setAuthMode("guest");
        setSaveStatus("Session ended. Resetting builder state...");
        setSyncNonce((current) => current + 1);
        return;
      }

      const cloudResumeId = window.localStorage.getItem(lastCloudResumeIdKey);

      if (cloudResumeId) {
        cloudResumeIdRef.current = cloudResumeId;
        window.localStorage.removeItem(lastCloudResumeIdKey);
      }

      setAuthMode("user");
      setSaveStatus("Login detected. Linking this resume to your account...");
      setSyncNonce((current) => current + 1);
    };

    window.addEventListener(authChangedEvent, handleAuthChanged);

    return () => {
      window.removeEventListener(authChangedEvent, handleAuthChanged);
    };
  }, []);

  useEffect(() => {
    if (step === 0) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      if (authMode === "checking") {
        return;
      }

      if (authMode === "guest") {
        setSaveStatus("Log in to save this resume to Real Path Cloud.");
        return;
      }

      setSaveStatus("Saving to Real Path Cloud...");

      try {
        const response = await fetch("/api/cloud/resumes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resumeId: cloudResumeIdRef.current,
            title: deferredResume.fullName || deferredResume.targetRole || "Untitled Resume",
            template: selectedTemplate,
            data: deferredResume,
          }),
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Cloud autosave failed.");
        }

        if (payload.mode === "guest") {
          setAuthMode("guest");
          setSaveStatus("Session expired. Log in again to continue cloud saving.");
          window.dispatchEvent(new CustomEvent(authRefreshEvent));
          return;
        }

        if (payload.resume?.id) {
          cloudResumeIdRef.current = payload.resume.id;
        }

        setSaveStatus("Saved to Real Path Cloud.");
      } catch (saveError) {
        setSaveStatus(
          saveError instanceof Error
            ? saveError.message
            : "Cloud autosave failed. Local editing is still available.",
        );
      }
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [authMode, deferredResume, selectedTemplate, step, syncNonce]);

  const editor: ResumeEditor = {
    onBasicChange: updateBasic,
    onSkillChange: updateSkill,
    onEducationChange: updateEducation,
    onExperienceChange: updateExperience,
    onProjectChange: updateProject,
    onCertificationChange: updateCertification,
    onAchievementChange: updateAchievement,
  };

  useEffect(() => {
    return () => {
      if (finalPreviewTimerRef.current) {
        window.clearTimeout(finalPreviewTimerRef.current);
      }
    };
  }, []);

  const handleBasicChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    updateBasic(event.target.name as keyof ResumeBasics, event.target.value);
  };

  const progressPercentage = (Math.min(step, totalSteps) / totalSteps) * 100;
  const showPreview = step >= 1 && step <= totalSteps;

  const goToFinalPreview = () => {
    setIsGenerating(true);
    setAiMessage("");
    setStep(9);

    if (finalPreviewTimerRef.current) {
      window.clearTimeout(finalPreviewTimerRef.current);
    }

    finalPreviewTimerRef.current = window.setTimeout(() => {
      setIsGenerating(false);
      finalPreviewTimerRef.current = null;
    }, 420);
  };

  const improveResumeWithAI = async () => {
    setImproving(true);
    setAiMessage("");

    try {
      const response = await fetch("/api/improve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resumeData }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to improve resume");
      }

      startTransition(() => {
        applyResumePatch(payload.resume || {});
      });

      setAiMessage(
        payload.mode === "openai"
          ? "AI refreshed your summary and strongest bullets."
          : "Local resume optimization applied. AI rewrites will activate when OpenAI is connected.",
      );
    } catch {
      setAiMessage("Resume improvement failed. Please try again.");
    } finally {
      setImproving(false);
    }
  };

  const uploadPdfToCloud = async (pdfBlob: Blob, fileName: string) => {
    const formData = new FormData();
    formData.append("file", pdfBlob, fileName);
    formData.append("resumeData", JSON.stringify(optimizedResume));
    formData.append("template", selectedTemplate);

    if (cloudResumeIdRef.current) {
      formData.append("resumeId", cloudResumeIdRef.current);
    }

    await fetch("/api/cloud/pdf-exports", {
      method: "POST",
      body: formData,
    }).catch(() => undefined);
  };

  const downloadPDF = async () => {
    if (!exportRef.current) {
      return;
    }

    setDownloading(true);

    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: "#ffffff",
        scale: Math.min(3, window.devicePixelRatio || 2),
        useCORS: true,
        logging: false,
        windowWidth: 794,
      });

      const document = new jsPDF({
        unit: "pt",
        format: "a4",
        compress: true,
      });
      const margin = 22;
      const pageWidth = document.internal.pageSize.getWidth();
      const pageHeight = document.internal.pageSize.getHeight();
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;
      const pageContentHeight = pageHeight - margin * 2;
      const imageData = canvas.toDataURL("image/png", 1);

      let remainingHeight = contentHeight;
      let yOffset = margin;

      document.addImage(imageData, "PNG", margin, yOffset, contentWidth, contentHeight);
      remainingHeight -= pageContentHeight;

      while (remainingHeight > 0) {
        yOffset -= pageContentHeight;
        document.addPage();
        document.addImage(imageData, "PNG", margin, yOffset, contentWidth, contentHeight);
        remainingHeight -= pageContentHeight;
      }

      const fileName = `${resumeData.fullName || "Resume"}.pdf`;
      const pdfBlob = document.output("blob");
      document.save(fileName);
      void uploadPdfToCloud(pdfBlob, fileName);
    } catch {
      setAiMessage("PDF export failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,_#f8fbff,_#eef5ff_48%,_#f8fafc)] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        {step === 0 ? (
          <section className="grid min-h-[85vh] items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-600">
                Resume Builder V1
              </p>
              <h1 className="mt-4 text-5xl font-black tracking-tight text-slate-950 md:text-6xl">
                Build a startup-grade resume flow.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                Pick your hiring lane first. We will tailor the form flow, keep a
                live editable preview on the side, and finish with a WYSIWYG PDF.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur">
              <h2 className="text-3xl font-bold text-slate-950">
                What type of resume are you building?
              </h2>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {roleOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRole(option.value)}
                    className={`rounded-[1.6rem] border p-6 text-left transition ${
                      role === option.value
                        ? "border-indigo-600 bg-indigo-50 shadow-lg"
                        : "border-slate-200 bg-white hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl"
                    }`}
                  >
                    <p className="text-lg font-semibold text-slate-900">{option.label}</p>
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={!role}
                onClick={() => setStep(1)}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition enabled:hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        ) : (
          <section
            className={`grid gap-8 ${
              step === 9 ? "grid-cols-1" : "xl:grid-cols-[1.08fr_0.92fr]"
            }`}
          >
            <div className="rounded-[2rem] border border-white/60 bg-white/90 p-8 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur">
              {step <= totalSteps ? (
                <>
                  <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                        Builder Progress
                      </p>
                      <h2 className="mt-2 text-3xl font-bold text-slate-950">
                        Step {step} of {totalSteps}
                      </h2>
                    </div>

                    <div className="min-w-48">
                      <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                        <span>{Math.round(progressPercentage)}% complete</span>
                        <span>{selectedTemplate} template</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500 transition-all duration-500"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">
                      {saveStatus}
                    </div>
                  </div>

                  <div className="mb-10 flex items-center gap-2">
                    {Array.from({ length: totalSteps }, (_, index) => index + 1).map(
                      (item) => (
                        <div key={item} className="flex items-center gap-2">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                              step === item
                                ? "bg-slate-950 text-white"
                                : step > item
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            {step > item ? <CheckCircle2 className="h-4 w-4" /> : item}
                          </div>
                          {item < totalSteps ? (
                            <div
                              className={`h-1 w-7 rounded-full ${
                                step > item ? "bg-emerald-400" : "bg-slate-200"
                              }`}
                            />
                          ) : null}
                        </div>
                      ),
                    )}
                  </div>

                  {step === 1 ? (
                    <div className="space-y-6">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                          Personal Details
                        </p>
                        <h3 className="mt-2 text-3xl font-bold text-slate-950">
                          Start with your professional identity.
                        </h3>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <input
                          name="fullName"
                          placeholder="Full Name"
                          value={basics.fullName}
                          onChange={handleBasicChange}
                          className="input-premium"
                        />
                        <input
                          name="phone"
                          placeholder="Phone Number"
                          value={basics.phone}
                          onChange={handleBasicChange}
                          className="input-premium"
                        />
                        <input
                          name="email"
                          placeholder="Professional Email"
                          value={basics.email}
                          onChange={handleBasicChange}
                          className="input-premium"
                        />
                        <input
                          name="linkedin"
                          placeholder="LinkedIn URL"
                          value={basics.linkedin}
                          onChange={handleBasicChange}
                          className="input-premium"
                        />
                        <input
                          name="github"
                          placeholder="GitHub / Portfolio"
                          value={basics.github}
                          onChange={handleBasicChange}
                          className="input-premium"
                        />
                        <input
                          name="location"
                          placeholder="Current Location"
                          value={basics.location}
                          onChange={handleBasicChange}
                          className="input-premium"
                        />
                      </div>

                      <div className="flex justify-between">
                        <button type="button" onClick={() => setStep(0)} className="btn-secondary">
                          <ArrowLeft className="mr-2 inline h-4 w-4" />
                          Back
                        </button>
                        <button type="button" onClick={() => setStep(2)} className="btn-primary">
                          Next
                          <ArrowRight className="ml-2 inline h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {step === 2 ? (
                    <div className="space-y-6">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                          Professional Positioning
                        </p>
                        <h3 className="mt-2 text-3xl font-bold text-slate-950">
                          Lock in the role and headline story.
                        </h3>
                      </div>

                      <div className="space-y-4">
                        <input
                          name="targetRole"
                          placeholder="What role are you targeting?"
                          value={basics.targetRole}
                          onChange={handleBasicChange}
                          className="input"
                        />
                        <select
                          name="experienceYears"
                          value={basics.experienceYears}
                          onChange={handleBasicChange}
                          className="input"
                        >
                          <option value="">Years of experience?</option>
                          <option value="0">0 (Fresher)</option>
                          <option value="1-2">1-2 years</option>
                          <option value="3-5">3-5 years</option>
                          <option value="5+">5+ years</option>
                        </select>
                        <input
                          name="topSkills"
                          placeholder="Strongest skills, comma separated"
                          value={basics.topSkills}
                          onChange={handleBasicChange}
                          className="input"
                        />
                        <textarea
                          name="professionalSummary"
                          placeholder="Write a sharp professional summary"
                          value={basics.professionalSummary}
                          onChange={handleBasicChange}
                          rows={5}
                          className="input"
                        />
                        <textarea
                          name="biggestAchievement"
                          placeholder="Biggest professional achievement"
                          value={basics.biggestAchievement}
                          onChange={handleBasicChange}
                          rows={3}
                          className="input"
                        />
                        <textarea
                          name="valueProposition"
                          placeholder="What value do you bring to a company?"
                          value={basics.valueProposition}
                          onChange={handleBasicChange}
                          rows={3}
                          className="input"
                        />
                      </div>

                      <div className="flex justify-between">
                        <button type="button" onClick={() => setStep(1)} className="btn-secondary">
                          <ArrowLeft className="mr-2 inline h-4 w-4" />
                          Back
                        </button>
                        <button type="button" onClick={() => setStep(3)} className="btn-primary">
                          Next
                          <ArrowRight className="ml-2 inline h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {step === 3 ? (
                    <div className="space-y-6">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                          Education
                        </p>
                        <h3 className="mt-2 text-3xl font-bold text-slate-950">
                          Add the academic proof points.
                        </h3>
                      </div>

                      <div className="space-y-5">
                        {education.map((entry, index) => (
                          <div
                            key={`education-${index}`}
                            className="rounded-[1.6rem] border border-slate-200 bg-slate-50/70 p-6"
                          >
                            <div className="grid gap-4 md:grid-cols-2">
                              <input
                                placeholder="Degree"
                                value={entry.degree}
                                onChange={(event) =>
                                  updateEducation(index, "degree", event.target.value)
                                }
                                className="input"
                              />
                              <input
                                placeholder="Specialization"
                                value={entry.specialization}
                                onChange={(event) =>
                                  updateEducation(index, "specialization", event.target.value)
                                }
                                className="input"
                              />
                              <input
                                placeholder="University"
                                value={entry.university}
                                onChange={(event) =>
                                  updateEducation(index, "university", event.target.value)
                                }
                                className="input"
                              />
                              <input
                                placeholder="Graduation Year"
                                value={entry.graduationYear}
                                onChange={(event) =>
                                  updateEducation(index, "graduationYear", event.target.value)
                                }
                                className="input"
                              />
                              <input
                                placeholder="CGPA / Percentage"
                                value={entry.cgpa}
                                onChange={(event) =>
                                  updateEducation(index, "cgpa", event.target.value)
                                }
                                className="input md:col-span-2"
                              />
                            </div>

                            {education.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => removeEducation(index)}
                                className="mt-4 text-sm font-semibold text-rose-600"
                              >
                                Remove entry
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap justify-between gap-3">
                        <button type="button" onClick={() => setStep(2)} className="btn-secondary">
                          <ArrowLeft className="mr-2 inline h-4 w-4" />
                          Back
                        </button>
                        <div className="flex gap-3">
                          <button type="button" onClick={addEducation} className="btn-secondary">
                            + Add Degree
                          </button>
                          <button type="button" onClick={() => setStep(4)} className="btn-primary">
                            Next
                            <ArrowRight className="ml-2 inline h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {step === 4 ? (
                    <div className="space-y-6">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                          Experience
                        </p>
                        <h3 className="mt-2 text-3xl font-bold text-slate-950">
                          Capture ownership, delivery, and outcomes.
                        </h3>
                      </div>

                      <div className="space-y-5">
                        {experience.map((entry, index) => (
                          <div
                            key={`experience-${index}`}
                            className="rounded-[1.6rem] border border-slate-200 bg-slate-50/70 p-6"
                          >
                            <div className="grid gap-4 md:grid-cols-2">
                              <input
                                placeholder="Company Name"
                                value={entry.company}
                                onChange={(event) =>
                                  updateExperience(index, "company", event.target.value)
                                }
                                className="input"
                              />
                              <input
                                placeholder="Role Title"
                                value={entry.role}
                                onChange={(event) =>
                                  updateExperience(index, "role", event.target.value)
                                }
                                className="input"
                              />
                              <input
                                placeholder="Duration (Start - End)"
                                value={entry.duration}
                                onChange={(event) =>
                                  updateExperience(index, "duration", event.target.value)
                                }
                                className="input"
                              />
                              <input
                                placeholder="Team Size (Optional)"
                                value={entry.teamSize}
                                onChange={(event) =>
                                  updateExperience(index, "teamSize", event.target.value)
                                }
                                className="input"
                              />
                              <input
                                placeholder="Tools / Technologies Used"
                                value={entry.tools}
                                onChange={(event) =>
                                  updateExperience(index, "tools", event.target.value)
                                }
                                className="input md:col-span-2"
                              />
                            </div>
                            <textarea
                              placeholder="Responsibilities, initiatives, and ownership"
                              value={entry.responsibilities}
                              onChange={(event) =>
                                updateExperience(index, "responsibilities", event.target.value)
                              }
                              rows={4}
                              className="input mt-4"
                            />
                            <textarea
                              placeholder="Measured impact with numbers, scale, or speed"
                              value={entry.measurableImpact}
                              onChange={(event) =>
                                updateExperience(index, "measurableImpact", event.target.value)
                              }
                              rows={3}
                              className="input mt-4"
                            />

                            {experience.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => removeExperience(index)}
                                className="mt-4 text-sm font-semibold text-rose-600"
                              >
                                Remove entry
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap justify-between gap-3">
                        <button type="button" onClick={() => setStep(3)} className="btn-secondary">
                          <ArrowLeft className="mr-2 inline h-4 w-4" />
                          Back
                        </button>
                        <div className="flex gap-3">
                          <button type="button" onClick={addExperience} className="btn-secondary">
                            + Add Job
                          </button>
                          <button type="button" onClick={() => setStep(5)} className="btn-primary">
                            Next
                            <ArrowRight className="ml-2 inline h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {step === 5 ? (
                    <div className="space-y-6">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                          Projects
                        </p>
                        <h3 className="mt-2 text-3xl font-bold text-slate-950">
                          Show your strongest proof of execution.
                        </h3>
                      </div>

                      <div className="space-y-5">
                        {projects.map((entry, index) => (
                          <div
                            key={`project-${index}`}
                            className="rounded-[1.6rem] border border-slate-200 bg-slate-50/70 p-6"
                          >
                            <div className="grid gap-4 md:grid-cols-2">
                              <input
                                placeholder="Project Title"
                                value={entry.title}
                                onChange={(event) =>
                                  updateProject(index, "title", event.target.value)
                                }
                                className="input"
                              />
                              <input
                                placeholder="Tech Stack"
                                value={entry.techStack}
                                onChange={(event) =>
                                  updateProject(index, "techStack", event.target.value)
                                }
                                className="input"
                              />
                            </div>

                            <textarea
                              placeholder="Problem statement"
                              value={entry.problem}
                              onChange={(event) =>
                                updateProject(index, "problem", event.target.value)
                              }
                              rows={2}
                              className="input mt-4"
                            />
                            <textarea
                              placeholder="Your contribution"
                              value={entry.contribution}
                              onChange={(event) =>
                                updateProject(index, "contribution", event.target.value)
                              }
                              rows={2}
                              className="input mt-4"
                            />
                            <textarea
                              placeholder="Outcome / result"
                              value={entry.outcome}
                              onChange={(event) =>
                                updateProject(index, "outcome", event.target.value)
                              }
                              rows={2}
                              className="input mt-4"
                            />
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                              <input
                                placeholder="GitHub Link"
                                value={entry.github}
                                onChange={(event) =>
                                  updateProject(index, "github", event.target.value)
                                }
                                className="input"
                              />
                              <input
                                placeholder="Live Link"
                                value={entry.liveLink}
                                onChange={(event) =>
                                  updateProject(index, "liveLink", event.target.value)
                                }
                                className="input"
                              />
                            </div>

                            {projects.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => removeProject(index)}
                                className="mt-4 text-sm font-semibold text-rose-600"
                              >
                                Remove entry
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap justify-between gap-3">
                        <button type="button" onClick={() => setStep(4)} className="btn-secondary">
                          <ArrowLeft className="mr-2 inline h-4 w-4" />
                          Back
                        </button>
                        <div className="flex gap-3">
                          <button type="button" onClick={addProject} className="btn-secondary">
                            + Add Project
                          </button>
                          <button type="button" onClick={() => setStep(6)} className="btn-primary">
                            Next
                            <ArrowRight className="ml-2 inline h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {step === 6 ? (
                    <div className="space-y-6">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                          Skills
                        </p>
                        <h3 className="mt-2 text-3xl font-bold text-slate-950">
                          Group your technical and soft skills cleanly.
                        </h3>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <input
                          name="languages"
                          placeholder="Programming Languages"
                          value={skills.languages}
                          onChange={(event) => updateSkill("languages", event.target.value)}
                          className="input"
                        />
                        <input
                          name="frameworks"
                          placeholder="Frameworks"
                          value={skills.frameworks}
                          onChange={(event) => updateSkill("frameworks", event.target.value)}
                          className="input"
                        />
                        <input
                          name="tools"
                          placeholder="Tools"
                          value={skills.tools}
                          onChange={(event) => updateSkill("tools", event.target.value)}
                          className="input"
                        />
                        <input
                          name="databases"
                          placeholder="Databases"
                          value={skills.databases}
                          onChange={(event) => updateSkill("databases", event.target.value)}
                          className="input"
                        />
                        <input
                          name="cloud"
                          placeholder="Cloud Platforms"
                          value={skills.cloud}
                          onChange={(event) => updateSkill("cloud", event.target.value)}
                          className="input"
                        />
                        <input
                          name="softSkills"
                          placeholder="Soft Skills"
                          value={skills.softSkills}
                          onChange={(event) => updateSkill("softSkills", event.target.value)}
                          className="input"
                        />
                        <input
                          name="spokenLanguages"
                          placeholder="Languages Known"
                          value={skills.spokenLanguages}
                          onChange={(event) =>
                            updateSkill("spokenLanguages", event.target.value)
                          }
                          className="input md:col-span-2"
                        />
                      </div>

                      <div className="flex justify-between">
                        <button type="button" onClick={() => setStep(5)} className="btn-secondary">
                          <ArrowLeft className="mr-2 inline h-4 w-4" />
                          Back
                        </button>
                        <button type="button" onClick={() => setStep(7)} className="btn-primary">
                          Next
                          <ArrowRight className="ml-2 inline h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {step === 7 ? (
                    <div className="space-y-6">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                          Certifications
                        </p>
                        <h3 className="mt-2 text-3xl font-bold text-slate-950">
                          Add credentials that strengthen trust.
                        </h3>
                      </div>

                      <div className="space-y-5">
                        {certifications.map((entry, index) => (
                          <div
                            key={`certification-${index}`}
                            className="rounded-[1.6rem] border border-slate-200 bg-slate-50/70 p-6"
                          >
                            <div className="grid gap-4 md:grid-cols-2">
                              <input
                                placeholder="Certification Name"
                                value={entry.name}
                                onChange={(event) =>
                                  updateCertification(index, "name", event.target.value)
                                }
                                className="input"
                              />
                              <input
                                placeholder="Issuing Organization"
                                value={entry.organization}
                                onChange={(event) =>
                                  updateCertification(index, "organization", event.target.value)
                                }
                                className="input"
                              />
                              <input
                                placeholder="Year"
                                value={entry.year}
                                onChange={(event) =>
                                  updateCertification(index, "year", event.target.value)
                                }
                                className="input"
                              />
                              <input
                                placeholder="Credential Link"
                                value={entry.credentialLink}
                                onChange={(event) =>
                                  updateCertification(index, "credentialLink", event.target.value)
                                }
                                className="input"
                              />
                            </div>

                            {certifications.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => removeCertification(index)}
                                className="mt-4 text-sm font-semibold text-rose-600"
                              >
                                Remove entry
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap justify-between gap-3">
                        <button type="button" onClick={() => setStep(6)} className="btn-secondary">
                          <ArrowLeft className="mr-2 inline h-4 w-4" />
                          Back
                        </button>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={addCertification}
                            className="btn-secondary"
                          >
                            + Add Certification
                          </button>
                          <button type="button" onClick={() => setStep(8)} className="btn-primary">
                            Next
                            <ArrowRight className="ml-2 inline h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {step === 8 ? (
                    <div className="space-y-6">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                          Achievements
                        </p>
                        <h3 className="mt-2 text-3xl font-bold text-slate-950">
                          Finish with standout achievements.
                        </h3>
                      </div>

                      <div className="space-y-5">
                        {achievements.map((entry, index) => (
                          <div
                            key={`achievement-${index}`}
                            className="rounded-[1.6rem] border border-slate-200 bg-slate-50/70 p-6"
                          >
                            <input
                              placeholder="Achievement Title"
                              value={entry.title}
                              onChange={(event) =>
                                updateAchievement(index, "title", event.target.value)
                              }
                              className="input"
                            />
                            <textarea
                              placeholder="Describe your achievement"
                              value={entry.description}
                              onChange={(event) =>
                                updateAchievement(index, "description", event.target.value)
                              }
                              rows={3}
                              className="input mt-4"
                            />

                            {achievements.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => removeAchievement(index)}
                                className="mt-4 text-sm font-semibold text-rose-600"
                              >
                                Remove entry
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap justify-between gap-3">
                        <button type="button" onClick={() => setStep(7)} className="btn-secondary">
                          <ArrowLeft className="mr-2 inline h-4 w-4" />
                          Back
                        </button>
                        <div className="flex gap-3">
                          <button type="button" onClick={addAchievement} className="btn-secondary">
                            + Add Achievement
                          </button>
                          <button type="button" onClick={goToFinalPreview} className="btn-primary">
                            Generate Resume
                            <Sparkles className="ml-2 inline h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}

              {step === 9 ? (
                <>
                  <div className="space-y-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                          Final Resume
                        </p>
                        <h2 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                          Startup-grade final preview
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                          This final screen now uses the same template renderer for preview
                          and export, so what you see here is what the PDF captures.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setStep(8)}
                          className="btn-secondary"
                        >
                          <ArrowLeft className="mr-2 inline h-4 w-4" />
                          Back to form
                        </button>
                        <button
                          type="button"
                          onClick={improveResumeWithAI}
                          disabled={improving}
                          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition enabled:hover:scale-[1.02] disabled:opacity-60"
                        >
                          <WandSparkles className="h-4 w-4" />
                          {improving ? "Improving..." : "Improve with AI"}
                        </button>
                        <button
                          type="button"
                          onClick={downloadPDF}
                          disabled={downloading}
                          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg transition enabled:hover:scale-[1.02] disabled:opacity-60"
                        >
                          <Download className="h-4 w-4" />
                          {downloading ? "Preparing PDF..." : "Download PDF"}
                        </button>
                      </div>
                    </div>

                    {aiMessage ? (
                      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
                        {aiMessage}
                      </div>
                    ) : null}

                    {isGenerating ? (
                      <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-12 text-center">
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Generating
                        </p>
                        <p className="mt-4 text-2xl font-bold text-slate-950">
                          Finalizing layout, ATS insights, and export-ready output.
                        </p>
                      </div>
                    ) : (
                      <>
                        <InsightsDashboard insights={insights} />

                        <ResumePreview
                          data={optimizedResume}
                          template={selectedTemplate}
                          onTemplateChange={setSelectedTemplate}
                          editable
                          editor={editor}
                          title="Editable Final Resume"
                          helperText="Make final edits inline here. Every on-blur change syncs back to the form and the PDF export."
                        />
                      </>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {showPreview ? (
              <div className="xl:sticky xl:top-6 xl:self-start">
                <ResumePreview
                  data={optimizedResume}
                  template={selectedTemplate}
                  onTemplateChange={setSelectedTemplate}
                  editable
                  editor={editor}
                  title="Inline Preview"
                  helperText="Click directly inside the preview to edit. Changes debounce while typing and sync back on blur."
                />
              </div>
            ) : null}
          </section>
        )}
      </div>

      <div className="pointer-events-none fixed left-[-9999px] top-0 w-[794px] bg-white">
        <div ref={exportRef} className="bg-white">
          <TemplateRenderer template={selectedTemplate} data={optimizedResume} />
        </div>
      </div>
    </main>
  );
}
