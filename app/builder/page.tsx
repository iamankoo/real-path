import { Suspense } from "react";
import BuilderExperience from "@/components/builder/BuilderExperience";

export default function BuilderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm">Loading builder...</div>}>
      <BuilderExperience />
    </Suspense>
  );
}