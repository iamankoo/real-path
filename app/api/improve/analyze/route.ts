import { POST as analyzePost } from "@/app/api/analyze/route";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return analyzePost(request);
}
