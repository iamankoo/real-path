import {
  type CompanyRecommendation,
  type ResumeData,
  type ResumeInsights,
  getResumeSummary,
  getVisibleEntries,
  hasMeaningfulText,
} from "@/lib/resume";

type RoleProfile = {
  name: string;
  keywords: string[];
  suggestedCertifications: string[];
};

const roleProfiles: RoleProfile[] = [
  {
    name: "Frontend Developer",
    keywords: [
      "react",
      "next",
      "typescript",
      "javascript",
      "tailwind",
      "css",
      "html",
      "frontend",
      "ui",
      "redux",
    ],
    suggestedCertifications: [
      "Meta Front-End Developer",
      "Google UX Design",
      "AWS Cloud Practitioner",
    ],
  },
  {
    name: "Full Stack Engineer",
    keywords: [
      "node",
      "react",
      "api",
      "mongodb",
      "sql",
      "typescript",
      "backend",
      "frontend",
      "full stack",
      "deployment",
    ],
    suggestedCertifications: [
      "AWS Developer Associate",
      "MongoDB Developer Path",
      "Postman API Fundamentals",
    ],
  },
  {
    name: "Data Analyst",
    keywords: [
      "sql",
      "python",
      "excel",
      "power bi",
      "tableau",
      "analytics",
      "dashboard",
      "kpi",
      "data",
      "statistics",
    ],
    suggestedCertifications: [
      "Google Data Analytics",
      "Microsoft Power BI Data Analyst",
      "Tableau Desktop Specialist",
    ],
  },
  {
    name: "Backend Developer",
    keywords: [
      "node",
      "express",
      "api",
      "postgres",
      "mongodb",
      "redis",
      "microservices",
      "backend",
      "docker",
      "aws",
    ],
    suggestedCertifications: [
      "AWS Developer Associate",
      "Docker Certified Associate",
      "Node.js Services Development",
    ],
  },
  {
    name: "Product Intern",
    keywords: [
      "strategy",
      "research",
      "stakeholder",
      "roadmap",
      "metrics",
      "user feedback",
      "product",
      "growth",
      "experimentation",
      "market",
    ],
    suggestedCertifications: [
      "Google Project Management",
      "Product School Product Analytics",
      "Mixpanel Product Analytics",
    ],
  },
];

const actionVerbPattern =
  /\b(built|led|launched|delivered|optimized|improved|owned|designed|implemented|managed|created|reduced|increased|scaled|automated|analyzed|shipped)\b/gi;
const impactPattern = /\b\d+(\.\d+)?(%|x|k|m|cr|hrs?|days?|users?|clients?|projects?)?\b/gi;
const bulletPattern = /(^|\n)\s*[-*•]/g;
const headingPattern =
  /\b(summary|experience|education|skills|projects|certifications|achievements|profile)\b/gi;

const round = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const scoreBand = (value: number) => {
  if (value >= 86) return "Interview-ready";
  if (value >= 72) return "Strong";
  if (value >= 58) return "Promising";
  return "Needs polish";
};

const salaryBand = (value: number) => {
  if (value >= 85) return "Premium shortlist band";
  if (value >= 70) return "Competitive entry band";
  if (value >= 55) return "Early-stage ready band";
  return "Foundation-building band";
};

type CompanyProfile = {
  companyName: string;
  domain: string;
  industries: string[];
  skillKeywords: string[];
  workModes: CompanyRecommendation["workMode"][];
  salaryRanges: Record<string, string>;
};

const companyProfiles: CompanyProfile[] = [
  {
    companyName: "Google",
    domain: "google.com",
    industries: ["software", "cloud", "data", "ai", "product"],
    skillKeywords: ["react", "python", "java", "cloud", "data", "ai", "analytics", "kubernetes"],
    workModes: ["Hybrid", "Onsite"],
    salaryRanges: { in: "₹18L-₹55L", global: "$120k-$210k" },
  },
  {
    companyName: "Microsoft",
    domain: "microsoft.com",
    industries: ["software", "cloud", "enterprise", "data", "ai"],
    skillKeywords: ["azure", "react", "typescript", "c#", "sql", "cloud", "ai", "api"],
    workModes: ["Hybrid", "Remote"],
    salaryRanges: { in: "₹16L-₹48L", global: "$115k-$205k" },
  },
  {
    companyName: "TCS",
    domain: "tcs.com",
    industries: ["it services", "enterprise", "consulting"],
    skillKeywords: ["java", "sql", "react", "node", "testing", "cloud", "support", "api"],
    workModes: ["Hybrid", "Onsite"],
    salaryRanges: { in: "₹4L-₹18L", global: "$70k-$145k" },
  },
  {
    companyName: "Infosys",
    domain: "infosys.com",
    industries: ["it services", "consulting", "enterprise"],
    skillKeywords: ["java", "python", "react", "sql", "devops", "api", "cloud", "analytics"],
    workModes: ["Hybrid", "Onsite"],
    salaryRanges: { in: "₹4L-₹20L", global: "$75k-$150k" },
  },
  {
    companyName: "Deloitte",
    domain: "deloitte.com",
    industries: ["consulting", "finance", "risk", "analytics", "product"],
    skillKeywords: ["analytics", "sql", "power bi", "tableau", "strategy", "finance", "stakeholder", "research"],
    workModes: ["Hybrid", "Onsite"],
    salaryRanges: { in: "₹7L-₹28L", global: "$85k-$170k" },
  },
  {
    companyName: "Accenture",
    domain: "accenture.com",
    industries: ["consulting", "cloud", "data", "enterprise"],
    skillKeywords: ["cloud", "java", "react", "sap", "data", "analytics", "api", "automation"],
    workModes: ["Hybrid", "Remote"],
    salaryRanges: { in: "₹5L-₹24L", global: "$80k-$165k" },
  },
  {
    companyName: "Amazon",
    domain: "amazon.jobs",
    industries: ["software", "cloud", "operations", "data", "product"],
    skillKeywords: ["aws", "java", "python", "react", "node", "distributed", "sql", "operations"],
    workModes: ["Onsite", "Hybrid"],
    salaryRanges: { in: "₹15L-₹60L", global: "$125k-$230k" },
  },
  {
    companyName: "OpenAI",
    domain: "openai.com",
    industries: ["ai", "research", "software", "product"],
    skillKeywords: ["ai", "llm", "python", "typescript", "react", "api", "evaluation", "research"],
    workModes: ["Hybrid", "Remote"],
    salaryRanges: { in: "₹30L-₹90L", global: "$180k-$350k" },
  },
  {
    companyName: "High-growth AI startups",
    domain: "wellfound.com",
    industries: ["startup", "ai", "software", "product", "growth"],
    skillKeywords: ["react", "node", "python", "ai", "api", "product", "growth", "mongodb", "postgres"],
    workModes: ["Remote", "Hybrid"],
    salaryRanges: { in: "₹8L-₹40L + equity", global: "$90k-$220k + equity" },
  },
];

const detectIndiaPreference = (text: string) =>
  /\b(india|bengaluru|bangalore|hyderabad|pune|mumbai|delhi|gurgaon|gurugram|noida|chennai|kolkata|remote india)\b/i.test(text);

const createCompanySearchUrl = (companyName: string, role: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(`${companyName} careers ${role} jobs`)}`;

const createCompanyRecommendations = ({
  normalizedText,
  targetRole,
  recommendedRoles,
  atsScore,
  roleFitScore,
  shortlistChance,
}: {
  normalizedText: string;
  targetRole?: string;
  recommendedRoles: string[];
  atsScore: number;
  roleFitScore: number;
  shortlistChance: number;
}): CompanyRecommendation[] => {
  const preferredRole = targetRole?.trim() || recommendedRoles[0] || "Software Engineer";
  const wantsIndia = detectIndiaPreference(normalizedText);
  const wantsRemote = /\b(remote|wfh|work from home|distributed)\b/.test(normalizedText);

  return companyProfiles
    .map((company) => {
      const matchedSkills = company.skillKeywords.filter((keyword) =>
        normalizedText.includes(keyword),
      );
      const industryMatched = company.industries.some((industry) =>
        normalizedText.includes(industry),
      );
      const skillScore = matchedSkills.length / company.skillKeywords.length;
      const score = round(
        42 +
          skillScore * 32 +
          roleFitScore * 0.12 +
          atsScore * 0.08 +
          shortlistChance * 0.06 +
          (industryMatched ? 6 : 0),
      );
      const roleMatch = Math.max(48, Math.min(98, score));
      const workMode = wantsRemote && company.workModes.includes("Remote")
        ? "Remote"
        : company.workModes[0];
      const matchReason =
        matchedSkills.length > 0
          ? `Your resume signals ${matchedSkills.slice(0, 3).join(", ")} for ${preferredRole} openings.`
          : `${company.companyName} is a sensible next search because your report points toward ${recommendedRoles.slice(0, 2).join(" and ") || preferredRole} roles.`;

      return {
        companyName: company.companyName,
        logoUrl: `https://www.google.com/s2/favicons?domain=${company.domain}&sz=128`,
        roleMatch,
        recommendedRole: preferredRole,
        whyRecommended: matchReason,
        applyUrl: createCompanySearchUrl(company.companyName, preferredRole),
        jobSearchUrl: createCompanySearchUrl(company.companyName, preferredRole),
        workMode,
        salaryRange: company.salaryRanges[wantsIndia ? "in" : "global"],
      };
    })
    .sort((left, right) => right.roleMatch - left.roleMatch)
    .slice(0, 8);
};

export const buildResumeText = (data: ResumeData) => {
  const sections = [
    data.fullName,
    data.targetRole,
    [data.email, data.phone, data.location].filter(hasMeaningfulText).join(" | "),
    getResumeSummary(data),
    ...getVisibleEntries(data.experience).flatMap((entry) => [
      [entry.role, entry.company, entry.duration].filter(hasMeaningfulText).join(" | "),
      entry.tools,
      entry.responsibilities,
      entry.measurableImpact,
    ]),
    ...getVisibleEntries(data.education).flatMap((entry) => [
      [entry.degree, entry.specialization].filter(hasMeaningfulText).join(" in "),
      [entry.university, entry.graduationYear, entry.cgpa].filter(hasMeaningfulText).join(" | "),
    ]),
    ...getVisibleEntries(data.projects).flatMap((entry) => [
      entry.title,
      entry.techStack,
      entry.problem,
      entry.contribution,
      entry.outcome,
    ]),
    Object.values(data.skills).filter(hasMeaningfulText).join(" | "),
    ...getVisibleEntries(data.certifications).flatMap((entry) => [
      [entry.name, entry.organization, entry.year].filter(hasMeaningfulText).join(" | "),
    ]),
    ...getVisibleEntries(data.achievements).flatMap((entry) => [
      entry.title,
      entry.description,
    ]),
  ];

  return sections.filter(hasMeaningfulText).join("\n");
};

const inferRoles = (text: string) => {
  const normalized = normalize(text);

  return roleProfiles
    .map((profile) => {
      const matchedKeywords = profile.keywords.filter((keyword) =>
        normalized.includes(keyword),
      );

      return {
        ...profile,
        score: matchedKeywords.length / profile.keywords.length,
        matchedKeywords,
      };
    })
    .sort((left, right) => right.score - left.score);
};

const getSectionCoverage = (text: string) => {
  const normalized = normalize(text);

  return [
    /\b(summary|profile)\b/.test(normalized),
    /\b(experience|internship|employment)\b/.test(normalized),
    /\b(education|university|college|degree)\b/.test(normalized),
    /\b(skills|tools|frameworks|languages)\b/.test(normalized),
    /\b(projects|project)\b/.test(normalized),
    /\b(certifications|achievements|awards)\b/.test(normalized),
  ].filter(Boolean).length;
};

const createAnalysisSummary = (
  atsScore: number,
  roleFitScore: number,
  shortlistChance: number,
  topRole: string,
) =>
  `${scoreBand(atsScore)} resume with ${roleFitScore}% role fit for ${topRole}. ` +
  `Estimated shortlist potential is ${shortlistChance}%.`;

export const analyzeResumeText = (
  rawText: string,
  targetRole?: string,
  analysisEngine: ResumeInsights["analysisEngine"] = "heuristics",
): ResumeInsights => {
  const text = rawText.trim();
  const normalized = normalize(text);
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const sentenceLengths = text
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim().split(/\s+/).filter(Boolean).length)
    .filter(Boolean);

  const bullets = (text.match(bulletPattern) || []).length;
  const headings = (text.match(headingPattern) || []).length;
  const actionVerbs = unique(text.match(actionVerbPattern)?.map((word) => word.toLowerCase()) || []);
  const impactMentions = text.match(impactPattern) || [];
  const averageSentenceLength =
    sentenceLengths.length > 0
      ? sentenceLengths.reduce((total, current) => total + current, 0) /
        sentenceLengths.length
      : 0;
  const sectionCoverage = getSectionCoverage(text);
  const inferredRoles = inferRoles(`${targetRole || ""} ${text}`);
  const topRole = inferredRoles[0] ?? roleProfiles[0];
  const secondRole = inferredRoles[1] ?? roleProfiles[1];
  const keywordMatch = round(topRole.score * 100);

  const readabilityBase = 82 - Math.max(0, averageSentenceLength - 22) * 2.2;
  const readabilityBonus = bullets > 2 ? 8 : 0;
  const readabilityPenalty = lines.some((line) => line.length > 140) ? 8 : 0;
  const readability = round(readabilityBase + readabilityBonus - readabilityPenalty);

  const formattingScore = round(
    38 +
      sectionCoverage * 8 +
      Math.min(12, bullets * 3) +
      Math.min(10, headings * 2) +
      (lines.length >= 8 ? 6 : 0),
  );

  const impactScore = round(
    28 +
      Math.min(28, actionVerbs.length * 4) +
      Math.min(26, impactMentions.length * 4) +
      (normalized.includes("impact") ? 6 : 0),
  );

  const targetRoleBoost =
    targetRole && normalized.includes(targetRole.toLowerCase()) ? 8 : 0;
  const roleFitScore = round(keywordMatch * 0.72 + impactScore * 0.18 + targetRoleBoost);

  const atsScore = round(
    formattingScore * 0.28 +
      readability * 0.2 +
      keywordMatch * 0.27 +
      impactScore * 0.25,
  );

  const shortlistChance = round(atsScore * 0.58 + roleFitScore * 0.42);

  const strengths: string[] = [];
  if (keywordMatch >= 65) {
    strengths.push(`Relevant keyword density aligns well with ${topRole.name} roles.`);
  }
  if (impactScore >= 60) {
    strengths.push("Quantified outcomes and action verbs make achievements easier to trust.");
  }
  if (formattingScore >= 70) {
    strengths.push("Section structure is ATS-friendly and easy for recruiters to scan.");
  }
  if (readability >= 72) {
    strengths.push("Content is concise enough for a fast recruiter skim.");
  }

  const weakSections: string[] = [];
  if (formattingScore < 65) {
    weakSections.push("Formatting can be tightened with clearer headings and shorter blocks.");
  }
  if (impactScore < 55) {
    weakSections.push("Experience bullets need stronger metrics or outcome language.");
  }
  if (keywordMatch < 60) {
    weakSections.push(`Keyword coverage is light for ${topRole.name} positions.`);
  }
  if (readability < 65) {
    weakSections.push("Some sections are dense and would benefit from sharper phrasing.");
  }
  if (sectionCoverage < 4) {
    weakSections.push("Important resume sections appear to be missing or too thin.");
  }

  const missingKeywords = topRole.keywords
    .filter((keyword) => !normalized.includes(keyword))
    .slice(0, 6);

  const missingSkills = unique([
    ...missingKeywords,
    secondRole.keywords.find((keyword) => !normalized.includes(keyword)) || "",
  ]).slice(0, 6);

  const improvementPriority = [
    impactScore < 55 ? "Quantify impact in experience bullets" : "",
    keywordMatch < 60 ? `Add ${topRole.name} keywords naturally into summary and skills` : "",
    readability < 65 ? "Tighten long sentences and convert dense paragraphs into bullets" : "",
    formattingScore < 65 ? "Strengthen headings, spacing, and section balance" : "",
    !hasMeaningfulText(text) ? "Add core resume content before analysis" : "",
  ].filter(Boolean);

  const suggestions = unique([
    ...improvementPriority,
    missingKeywords.length > 0
      ? `Add missing keywords such as ${missingKeywords.slice(0, 3).join(", ")}.`
      : "",
    impactMentions.length < 2
      ? "Include at least two concrete numbers, percentages, or scale indicators."
      : "",
    !/linkedin|github|portfolio/.test(normalized)
      ? "Add a professional link such as LinkedIn, GitHub, or portfolio URL."
      : "",
  ]);

  const recommendedRoles = unique(
    inferredRoles
      .slice(0, 4)
      .filter((role) => role.score > 0)
      .map((role) => role.name),
  );
  const roleRecommendations =
    recommendedRoles.length > 0
      ? recommendedRoles
      : [topRole.name, secondRole.name].filter(Boolean);
  const recommendedCompanies = createCompanyRecommendations({
    normalizedText: normalized,
    targetRole,
    recommendedRoles: roleRecommendations,
    atsScore,
    roleFitScore,
    shortlistChance,
  });

  return {
    atsScore,
    roleFitScore,
    shortlistChance,
    readability,
    keywordMatch,
    formattingScore,
    impactScore,
    strengthLevel: scoreBand(atsScore),
    salaryReadinessBand: salaryBand(shortlistChance),
    improvementPriority: improvementPriority.length > 0 ? improvementPriority : suggestions,
    suggestions,
    strengths:
      strengths.length > 0
        ? strengths
        : ["Resume has a workable base, but needs stronger positioning to compete."],
    weakSections:
      weakSections.length > 0
        ? weakSections
        : ["No critical weak section detected, but more measurable outcomes would help."],
    missingSkills,
    missingKeywords,
    suggestedCertifications: topRole.suggestedCertifications,
    recommendedRoles: roleRecommendations,
    recommendedCompanies,
    analysisSummary: createAnalysisSummary(
      atsScore,
      roleFitScore,
      shortlistChance,
      topRole.name,
    ),
    analysisEngine,
  };
};

export const analyzeResumeData = (
  data: ResumeData,
  analysisEngine: ResumeInsights["analysisEngine"] = "heuristics",
) => analyzeResumeText(buildResumeText(data), data.targetRole, analysisEngine);

export const createFallbackImprovement = (data: ResumeData) => {
  const professionalSummary = getResumeSummary(data);

  const improvedExperience = data.experience.map((entry) => {
    const responsibilities = entry.responsibilities
      .split(/\r?\n|[.;]+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) =>
        /^(built|led|launched|delivered|optimized|improved|owned|designed|implemented|managed|created)/i.test(
          line,
        )
          ? line
          : `Delivered ${line.charAt(0).toLowerCase()}${line.slice(1)}`,
      )
      .join("\n");

    const measurableImpact = hasMeaningfulText(entry.measurableImpact)
      ? entry.measurableImpact
      : "Add a metric, timeline, or business outcome to strengthen this bullet.";

    return {
      ...entry,
      responsibilities,
      measurableImpact,
    };
  });

  const improvedProjects = data.projects.map((project) => ({
    ...project,
    contribution: hasMeaningfulText(project.contribution)
      ? project.contribution
      : "Clarify your direct ownership, scope, and implementation choices.",
    outcome: hasMeaningfulText(project.outcome)
      ? project.outcome
      : "State the measurable result, user benefit, or deployment outcome.",
  }));

  return {
    professionalSummary,
    topSkills: data.topSkills,
    valueProposition: data.valueProposition || professionalSummary,
    experience: improvedExperience,
    projects: improvedProjects,
  };
};
