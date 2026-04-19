import type { ReactNode } from "react";
import Image from "next/image";
import {
  BadgeCheck,
  BriefcaseBusiness,
  ExternalLink,
  ScanSearch,
  Sparkles,
  Target,
} from "lucide-react";

import type { CompanyRecommendation, ResumeInsights } from "@/lib/resume";

import ScoreRing from "./ScoreRing";

type InsightsDashboardProps = {
  insights: ResumeInsights;
  title?: string;
  compact?: boolean;
};

function MetricCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{caption}</p>
    </div>
  );
}

function ListCard({
  icon,
  title,
  items,
}: {
  icon: ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-2 text-slate-700">{icon}</div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>

      <ul className="space-y-3 text-sm leading-6 text-slate-600">
        {items.map((item) => (
          <li key={item} className="rounded-2xl bg-slate-50 px-4 py-3">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompanyCard({ company }: { company: CompanyRecommendation }) {
  return (
    <article className="flex h-full flex-col rounded-3xl border border-indigo-100 bg-white/95 p-5 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image
            src={company.logoUrl}
            alt={`${company.companyName} logo`}
            width={48}
            height={48}
            unoptimized
            className="h-12 w-12 rounded-2xl border border-slate-200 bg-white object-contain p-2"
          />
          <div>
            <h3 className="text-lg font-bold text-slate-950">{company.companyName}</h3>
            <p className="text-sm font-semibold text-indigo-700">
              {company.roleMatch}% role match
            </p>
          </div>
        </div>

        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          {company.workMode}
        </span>
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-800">{company.recommendedRole}</p>
      <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">
        {company.whyRecommended}
      </p>

      {company.salaryRange ? (
        <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
          Salary signal: {company.salaryRange}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={company.applyUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
        >
          Apply
        </a>
        <a
          href={company.jobSearchUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
        >
          Job search
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </article>
  );
}

export default function InsightsDashboard({
  insights,
  title = "Final Resume Report",
  compact = false,
}: InsightsDashboardProps) {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
            {compact ? "Resume Health" : "AI Resume Intelligence"}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {insights.analysisSummary}
          </p>
        </div>

        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
          {insights.analysisEngine === "openai+heuristics"
            ? "OpenAI + scoring engine"
            : "Scoring engine ready"}
        </span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px,1fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-sm">
          <ScoreRing value={insights.atsScore} label="ATS Score" />

          <div className="mt-6 space-y-3 rounded-3xl bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Strength level</span>
              <span className="font-semibold text-slate-900">{insights.strengthLevel}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Salary readiness</span>
              <span className="font-semibold text-slate-900">
                {insights.salaryReadinessBand}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Role Fit"
            value={`${insights.roleFitScore}%`}
            caption="How well this resume maps to the inferred target role."
          />
          <MetricCard
            label="Shortlist Chance"
            value={`${insights.shortlistChance}%`}
            caption="Likelihood of clearing the first recruiter screen."
          />
          <MetricCard
            label="Readability"
            value={`${insights.readability}%`}
            caption="Clarity, scannability, and sentence sharpness."
          />
          <MetricCard
            label="Keyword Match"
            value={`${insights.keywordMatch}%`}
            caption="Coverage of role-relevant ATS keywords and terminology."
          />
          <MetricCard
            label="Formatting"
            value={`${insights.formattingScore}%`}
            caption="Section balance, headings, spacing, and scan friendliness."
          />
          <MetricCard
            label="Impact Score"
            value={`${insights.impactScore}%`}
            caption="Evidence of quantified outcomes and achievement language."
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ListCard
          icon={<Target className="h-5 w-5" />}
          title="Improvement Priority"
          items={insights.improvementPriority}
        />
        <ListCard
          icon={<BriefcaseBusiness className="h-5 w-5" />}
          title="Recommended Roles"
          items={insights.recommendedRoles}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ListCard
          icon={<BadgeCheck className="h-5 w-5" />}
          title="Strengths"
          items={insights.strengths}
        />
        <ListCard
          icon={<ScanSearch className="h-5 w-5" />}
          title="Weak Sections"
          items={insights.weakSections}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ListCard
          icon={<Sparkles className="h-5 w-5" />}
          title="Missing Skills"
          items={insights.missingSkills.length > 0 ? insights.missingSkills : ["No critical gap detected."]}
        />
        <ListCard
          icon={<Target className="h-5 w-5" />}
          title="Missing Keywords"
          items={
            insights.missingKeywords.length > 0
              ? insights.missingKeywords
              : ["Core role keywords are already covered well."]
          }
        />
        <ListCard
          icon={<BadgeCheck className="h-5 w-5" />}
          title="Suggested Certifications"
          items={insights.suggestedCertifications}
        />
      </div>

      {insights.recommendedCompanies?.length ? (
        <section className="rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-white/96 to-indigo-50/70 p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-indigo-600">
                Job Search Intelligence
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Recommended Companies For You
              </h2>
            </div>
            <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm">
              Based on score, role, skills, industry, and location signals
            </span>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {insights.recommendedCompanies.map((company) => (
              <CompanyCard key={company.companyName} company={company} />
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
