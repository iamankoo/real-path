import type { ResumeData, ResumeEditor } from "@/lib/resume";

import ResumeTemplateShell from "./ResumeTemplateShell";

type ResumeProps = {
  data: ResumeData;
  editable?: boolean;
  editor?: ResumeEditor;
};

export default function ModernTemplate({ data, editable, editor }: ResumeProps) {
  return (
    <ResumeTemplateShell
      data={data}
      variant="modern"
      editable={editable}
      editor={editor}
    />
  );
}
