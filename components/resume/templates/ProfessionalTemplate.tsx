import type { ResumeData, ResumeEditor } from "@/lib/resume";

import ResumeTemplateShell from "./ResumeTemplateShell";

type ResumeProps = {
  data: ResumeData;
  editable?: boolean;
  editor?: ResumeEditor;
};

export default function ProfessionalTemplate({
  data,
  editable,
  editor,
}: ResumeProps) {
  return (
    <ResumeTemplateShell
      data={data}
      variant="professional"
      editable={editable}
      editor={editor}
    />
  );
}
