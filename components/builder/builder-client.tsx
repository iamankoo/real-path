"use client";

import { useSearchParams } from "next/navigation";

export default function BuilderClient() {
  const searchParams = useSearchParams();
  const template = searchParams.get("template");

  return (
    <div>
      Builder template: {template}
    </div>
  );
}