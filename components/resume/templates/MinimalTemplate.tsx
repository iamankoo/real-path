import type { ResumeData, ResumeEditor } from "@/lib/resume";

import ResumeTemplateShell from "./ResumeTemplateShell";

type ResumeProps = {
  data: ResumeData;
  editable?: boolean;
  editor?: ResumeEditor;
};

export default function MinimalTemplate({ data, editable, editor }: ResumeProps) {
  return (
    <ResumeTemplateShell
      data={data}
      variant="minimal"
      editable={editable}
      editor={editor}
    />
  );
}
