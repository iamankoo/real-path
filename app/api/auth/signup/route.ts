import { handleSignup } from "@/app/api/auth/signup/start/route";
console.log("MONGO:", process.env.MONGODB_URI);

export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleSignup(request);
}