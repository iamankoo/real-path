import ModernTemplate from "./templates/ModernTemplate";
import ProfessionalTemplate from "./templates/ProfessionalTemplate";
import MinimalTemplate from "./templates/MinimalTemplate";
import type { ResumeData, ResumeEditor, ResumeTemplate } from "@/lib/resume";

type Props = {
  template: ResumeTemplate;
  data: ResumeData;
  editable?: boolean;
  editor?: ResumeEditor;
};

export default function TemplateRenderer({
  template,
  data,
  editable,
  editor,
}: Props) {

  switch (template) {

    case "modern":
      return <ModernTemplate data={data} editable={editable} editor={editor} />;

    case "professional":
      return <ProfessionalTemplate data={data} editable={editable} editor={editor} />;

    case "minimal":
      return <MinimalTemplate data={data} editable={editable} editor={editor} />;

    default:
      return <ModernTemplate data={data} editable={editable} editor={editor} />;

  }
}
