import EditableSection from "@/components/builder/EditableSection";
import {
  type ResumeData,
  type ResumeEditor,
  type ResumeTemplate,
  getResumeSummary,
  getVisibleEntries,
  hasMeaningfulText,
} from "@/lib/resume";

type ResumeTemplateShellProps = {
  data: ResumeData;
  variant: ResumeTemplate;
  editable?: boolean;
  editor?: ResumeEditor;
};

const templateStyles = {
  modern: {
    sheet:
      "mx-auto w-full max-w-[794px] overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white px-7 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] md:min-h-[1123px] md:px-8 md:py-8",
    header: "items-start text-left",
    name: "text-4xl font-black tracking-tight text-slate-950",
    role: "mt-3 text-base font-semibold text-indigo-700",
    contact: "text-sm text-slate-500",
    divider: "bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500",
    heading: "text-xs font-semibold uppercase tracking-[0.32em] text-slate-900",
    badge:
      "rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700",
  },
  professional: {
    sheet:
      "mx-auto w-full max-w-[794px] overflow-hidden rounded-xl border-2 border-slate-300 bg-white px-7 py-8 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:min-h-[1123px] md:px-8 md:py-8",
    header: "items-center text-center",
    name: "text-4xl font-bold tracking-[0.08em] uppercase text-slate-950",
    role: "mt-3 text-sm font-semibold uppercase tracking-[0.3em] text-slate-600",
    contact: "text-sm text-slate-500",
    divider: "bg-slate-300",
    heading: "text-sm font-bold uppercase tracking-[0.28em] text-slate-900",
    badge:
      "rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700",
  },
  minimal: {
    sheet:
      "mx-auto w-full max-w-[794px] overflow-hidden rounded-2xl border border-slate-200 bg-white px-7 py-8 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:min-h-[1123px] md:px-8 md:py-8",
    header: "items-start text-left",
    name: "text-[2.35rem] font-semibold tracking-tight text-slate-950",
    role: "mt-3 text-base text-slate-600",
    contact: "text-sm text-slate-500",
    divider: "bg-slate-200",
    heading: "text-xs font-semibold uppercase tracking-[0.28em] text-slate-700",
    badge:
      "rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700",
  },
} as const;

function SectionTitle({
  title,
  headingClassName,
  dividerClassName,
}: {
  title: string;
  headingClassName: string;
  dividerClassName: string;
}) {
  return (
    <div className="mb-4">
      <p className={headingClassName}>{title}</p>
      <div className={`mt-2 h-px w-full ${dividerClassName}`} />
    </div>
  );
}

const buildHref = (value: string, kind: "email" | "url") => {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (kind === "email") {
    return `mailto:${trimmed}`;
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

function ResumeText({
  as = "p",
  value,
  placeholder,
  onSave,
  editable,
  className,
  multiline = false,
}: {
  as?: "div" | "h1" | "h2" | "h3" | "p" | "span";
  value: string;
  placeholder: string;
  onSave?: (value: string) => void;
  editable?: boolean;
  className?: string;
  multiline?: boolean;
}) {
  const Tag = as;

  if (editable && onSave) {
    return (
      <EditableSection
        as={Tag}
        value={value}
        placeholder={placeholder}
        onSave={onSave}
        multiline={multiline}
        className={className}
      />
    );
  }

  if (!hasMeaningfulText(value)) {
    return null;
  }

  return (
    <Tag className={className}>{value}</Tag>
  );
}

function ResumeLinkText({
  value,
  placeholder,
  onSave,
  editable,
  className,
  kind,
}: {
  value: string;
  placeholder: string;
  onSave?: (value: string) => void;
  editable?: boolean;
  className?: string;
  kind: "email" | "url";
}) {
  if (editable && onSave) {
    return (
      <EditableSection
        as="span"
        value={value}
        placeholder={placeholder}
        onSave={onSave}
        className={className}
      />
    );
  }

  if (!hasMeaningfulText(value)) {
    return null;
  }

  const href = buildHref(value, kind);

  if (!href) {
    return <span className={className}>{value}</span>;
  }

  return (
    <a
      href={href}
      target={kind === "url" ? "_blank" : undefined}
      rel={kind === "url" ? "noreferrer" : undefined}
      className={`${className || ""} underline decoration-slate-300 underline-offset-4 hover:text-indigo-700`}
    >
      {value}
    </a>
  );
}

function BulletText({
  value,
  placeholder,
  onSave,
  editable,
  className,
}: {
  value: string;
  placeholder: string;
  onSave?: (value: string) => void;
  editable?: boolean;
  className?: string;
}) {
  if (editable && onSave) {
    return (
      <EditableSection
        as="div"
        value={value}
        placeholder={placeholder}
        onSave={onSave}
        multiline
        className={className}
      />
    );
  }

  const bullets = value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (bullets.length === 0) {
    return null;
  }

  return (
    <ul className={`${className || ""} space-y-1.5 pl-4`}>
      {bullets.map((bullet) => (
        <li key={bullet} className="list-disc">
          {bullet}
        </li>
      ))}
    </ul>
  );
}

export default function ResumeTemplateShell({
  data,
  variant,
  editable = false,
  editor,
}: ResumeTemplateShellProps) {
  const styles = templateStyles[variant];
  const summary = getResumeSummary(data);
  const visibleExperience = editable ? data.experience : getVisibleEntries(data.experience);
  const visibleEducation = editable ? data.education : getVisibleEntries(data.education);
  const visibleProjects = editable ? data.projects : getVisibleEntries(data.projects);
  const visibleCertifications = editable
    ? data.certifications
    : getVisibleEntries(data.certifications);
  const visibleAchievements = editable
    ? data.achievements
    : getVisibleEntries(data.achievements);
  const skillEntries = [
    { label: "Languages", field: "languages", value: data.skills.languages, placeholder: "JavaScript, TypeScript" },
    { label: "Frameworks", field: "frameworks", value: data.skills.frameworks, placeholder: "React, Next.js" },
    { label: "Tools", field: "tools", value: data.skills.tools, placeholder: "Git, Figma, Postman" },
    { label: "Databases", field: "databases", value: data.skills.databases, placeholder: "MongoDB, PostgreSQL" },
    { label: "Cloud", field: "cloud", value: data.skills.cloud, placeholder: "AWS, Vercel, GCP" },
    { label: "Soft Skills", field: "softSkills", value: data.skills.softSkills, placeholder: "Communication, ownership" },
    { label: "Languages Known", field: "spokenLanguages", value: data.skills.spokenLanguages, placeholder: "English, Hindi" },
  ] as const;
  const topSkillBadges = data.topSkills
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);

  return (
    <div className={styles.sheet}>
      <div className={`flex flex-col gap-4 ${styles.header}`}>
        <div>
          <ResumeText
            as="h1"
            value={data.fullName}
            placeholder="Your Name"
            editable={editable}
            onSave={(value) => editor?.onBasicChange("fullName", value)}
            className={styles.name}
          />

          <ResumeText
            as="p"
            value={data.targetRole}
            placeholder="Target role"
            editable={editable}
            onSave={(value) => editor?.onBasicChange("targetRole", value)}
            className={styles.role}
          />
        </div>

        <div
          className={`flex flex-wrap gap-x-4 gap-y-2 ${styles.contact} ${
            variant === "professional" ? "justify-center" : ""
          }`}
        >
          <ResumeLinkText
            value={data.email}
            placeholder="email@example.com"
            editable={editable}
            onSave={(value) => editor?.onBasicChange("email", value)}
            className="whitespace-pre-wrap"
            kind="email"
          />
          <ResumeText
            as="span"
            value={data.phone}
            placeholder="+91 98765 43210"
            editable={editable}
            onSave={(value) => editor?.onBasicChange("phone", value)}
            className="whitespace-pre-wrap"
          />
          <ResumeText
            as="span"
            value={data.location}
            placeholder="Bangalore, India"
            editable={editable}
            onSave={(value) => editor?.onBasicChange("location", value)}
            className="whitespace-pre-wrap"
          />
          <ResumeLinkText
            value={data.linkedin}
            placeholder="linkedin.com/in/username"
            editable={editable}
            onSave={(value) => editor?.onBasicChange("linkedin", value)}
            className="whitespace-pre-wrap"
            kind="url"
          />
          {(editable || hasMeaningfulText(data.github)) && (
            <ResumeLinkText
              value={data.github}
              placeholder="github.com/username"
              editable={editable}
              onSave={(value) => editor?.onBasicChange("github", value)}
              className="whitespace-pre-wrap"
              kind="url"
            />
          )}
        </div>

        {(editable || hasMeaningfulText(data.topSkills)) && (
          <div className={variant === "professional" ? "text-center" : ""}>
            <ResumeText
              as="p"
              value={data.topSkills}
              placeholder="Top skills separated by commas"
              editable={editable}
              onSave={(value) => editor?.onBasicChange("topSkills", value)}
              className="text-sm text-slate-500"
            />

            {topSkillBadges.length > 0 ? (
              <div
                className={`mt-3 flex flex-wrap gap-2 ${
                  variant === "professional" ? "justify-center" : ""
                }`}
              >
                {topSkillBadges.map((skill) => (
                  <span key={skill} className={styles.badge}>
                    {skill}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="mt-6 space-y-5">
        <section>
          <SectionTitle
            title="Professional Summary"
            headingClassName={styles.heading}
            dividerClassName={styles.divider}
          />

          <ResumeText
            as="p"
            value={summary}
            placeholder="Click here and write a crisp, results-focused summary."
            editable={editable}
            onSave={(value) => editor?.onBasicChange("professionalSummary", value)}
            multiline
            className="whitespace-pre-wrap text-sm leading-6 text-slate-700"
          />
        </section>

        {(editable || visibleExperience.length > 0) && (
          <section>
            <SectionTitle
              title="Experience"
              headingClassName={styles.heading}
              dividerClassName={styles.divider}
            />

            <div className="space-y-3">
              {visibleExperience.map((entry, index) => (
                <div
                  key={`${entry.company}-${entry.role}-${index}`}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <ResumeText
                        as="h3"
                        value={entry.role}
                        placeholder="Role title"
                        editable={editable}
                        onSave={(value) => editor?.onExperienceChange(index, "role", value)}
                        className="text-lg font-semibold text-slate-900"
                      />
                      <ResumeText
                        as="p"
                        value={entry.company}
                        placeholder="Company name"
                        editable={editable}
                        onSave={(value) => editor?.onExperienceChange(index, "company", value)}
                        className="text-sm font-medium text-slate-600"
                      />
                    </div>

                    <ResumeText
                      as="p"
                      value={entry.duration}
                      placeholder="Jan 2024 - Present"
                      editable={editable}
                      onSave={(value) => editor?.onExperienceChange(index, "duration", value)}
                      className="text-sm text-slate-500"
                    />
                  </div>

                  <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                    <BulletText
                      value={entry.responsibilities}
                      placeholder="Describe your ownership, delivery, and collaboration."
                      editable={editable}
                      onSave={(value) =>
                        editor?.onExperienceChange(index, "responsibilities", value)
                      }
                      className="text-sm text-slate-700"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {(editable || visibleProjects.length > 0) && (
          <section>
            <SectionTitle
              title="Projects"
              headingClassName={styles.heading}
              dividerClassName={styles.divider}
            />

            <div className="space-y-3">
              {visibleProjects.map((entry, index) => (
                <div key={`${entry.title}-${index}`} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <ResumeText
                      as="h3"
                      value={entry.title}
                      placeholder="Project title"
                      editable={editable}
                      onSave={(value) => editor?.onProjectChange(index, "title", value)}
                      className="text-lg font-semibold text-slate-900"
                    />

                    <ResumeText
                      as="span"
                      value={entry.techStack}
                      placeholder="React, Node.js, MongoDB"
                      editable={editable}
                      onSave={(value) => editor?.onProjectChange(index, "techStack", value)}
                      className={styles.badge}
                    />
                  </div>

                  <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                    <BulletText
                      value={entry.problem}
                      placeholder="What problem did this project solve?"
                      editable={editable}
                      onSave={(value) => editor?.onProjectChange(index, "problem", value)}
                      className="text-sm text-slate-700"
                    />
                    <BulletText
                      value={entry.contribution}
                      placeholder="What exactly did you own or implement?"
                      editable={editable}
                      onSave={(value) => editor?.onProjectChange(index, "contribution", value)}
                      className="text-sm text-slate-700"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {(editable || visibleEducation.length > 0) && (
          <section>
            <SectionTitle
              title="Education"
              headingClassName={styles.heading}
              dividerClassName={styles.divider}
            />

            <div className="space-y-3">
              {visibleEducation.map((entry, index) => (
                <div key={`${entry.university}-${index}`} className="rounded-2xl bg-slate-50/70 p-4">
                  <ResumeText
                    as="h3"
                    value={[entry.degree, entry.specialization].filter(hasMeaningfulText).join(" in ")}
                    placeholder="Degree in specialization"
                    editable={editable}
                    onSave={(value) => {
                      const [degreePart, specializationPart = ""] = value.split(" in ");
                      editor?.onEducationChange(index, "degree", degreePart.trim());
                      editor?.onEducationChange(index, "specialization", specializationPart.trim());
                    }}
                    className="text-lg font-semibold text-slate-900"
                  />
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                    <ResumeText
                      as="span"
                      value={entry.university}
                      placeholder="University name"
                      editable={editable}
                      onSave={(value) => editor?.onEducationChange(index, "university", value)}
                    />
                    <ResumeText
                      as="span"
                      value={entry.graduationYear}
                      placeholder="2026"
                      editable={editable}
                      onSave={(value) =>
                        editor?.onEducationChange(index, "graduationYear", value)
                      }
                    />
                    <ResumeText
                      as="span"
                      value={entry.cgpa}
                      placeholder="CGPA 8.8 / 10"
                      editable={editable}
                      onSave={(value) => editor?.onEducationChange(index, "cgpa", value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {(editable || skillEntries.some((entry) => hasMeaningfulText(entry.value))) && (
          <section>
            <SectionTitle
              title="Skills"
              headingClassName={styles.heading}
              dividerClassName={styles.divider}
            />

            <div className="grid gap-2.5 md:grid-cols-2">
              {skillEntries
                .filter((entry) => editable || hasMeaningfulText(entry.value))
                .map((entry) => (
                  <div key={entry.field} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      {entry.label}
                    </p>
                    <ResumeText
                      as="p"
                      value={entry.value}
                      placeholder={entry.placeholder}
                      editable={editable}
                      onSave={(value) => editor?.onSkillChange(entry.field, value)}
                      multiline
                      className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700"
                    />
                  </div>
                ))}
            </div>
          </section>
        )}

        {(editable || visibleCertifications.length > 0) && (
          <section>
            <SectionTitle
              title="Certifications"
              headingClassName={styles.heading}
              dividerClassName={styles.divider}
            />

            <div className="space-y-3">
              {visibleCertifications.map((entry, index) => (
                <div key={`${entry.name}-${index}`} className="rounded-3xl bg-slate-50/70 p-4">
                  <ResumeText
                    as="p"
                    value={[entry.name, entry.organization, entry.year]
                      .filter(hasMeaningfulText)
                      .join(" | ")}
                    placeholder="Certification | Issuer | Year"
                    editable={editable}
                    onSave={(value) => {
                      const [namePart = "", organizationPart = "", yearPart = ""] =
                        value.split("|");
                      editor?.onCertificationChange(index, "name", namePart.trim());
                      editor?.onCertificationChange(
                        index,
                        "organization",
                        organizationPart.trim(),
                      );
                      editor?.onCertificationChange(index, "year", yearPart.trim());
                    }}
                    className="text-sm font-medium text-slate-700"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {(editable || visibleAchievements.length > 0) && (
          <section>
            <SectionTitle
              title="Achievements"
              headingClassName={styles.heading}
              dividerClassName={styles.divider}
            />

            <div className="space-y-3">
              {visibleAchievements.map((entry, index) => (
                <div key={`${entry.title}-${index}`} className="rounded-3xl border border-slate-100 p-4">
                  <ResumeText
                    as="h3"
                    value={entry.title}
                    placeholder="Achievement title"
                    editable={editable}
                    onSave={(value) => editor?.onAchievementChange(index, "title", value)}
                    className="text-base font-semibold text-slate-900"
                  />
                  <ResumeText
                    as="p"
                    value={entry.description}
                    placeholder="Describe the result or recognition."
                    editable={editable}
                    onSave={(value) =>
                      editor?.onAchievementChange(index, "description", value)
                    }
                    multiline
                    className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700"
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
