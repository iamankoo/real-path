"use client";

import TemplateRenderer from "@/components/resume/TemplateRenderer";
import InsightsDashboard from "@/components/resume/InsightsDashboard";
import {
  type ResumeData,
  type ResumeEditor,
  type ResumeInsights,
  type ResumeTemplate,
  templateOptions,
} from "@/lib/resume";

type Props = {
  data: ResumeData;
  template: ResumeTemplate;
  onTemplateChange?: (template: ResumeTemplate) => void;
  editable?: boolean;
  editor?: ResumeEditor;
  insights?: ResumeInsights;
  showInsights?: boolean;
  title?: string;
  helperText?: string;
};

export default function ResumePreview({
  data,
  template,
  onTemplateChange,
  editable = false,
  editor,
  insights,
  showInsights = false,
  title = "Live Preview",
  helperText = "Preview updates instantly. Click any text block to edit it inline.",
}: Props) {
  return (
    <div className="space-y-6">
      {showInsights && insights ? <InsightsDashboard insights={insights} compact /> : null}

      <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Builder Preview</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{helperText}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {templateOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onTemplateChange?.(option.id)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  template === option.id
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-lg"
                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <TemplateRenderer template={template} data={data} editable={editable} editor={editor} />
      </div>
    </div>
  );
}
