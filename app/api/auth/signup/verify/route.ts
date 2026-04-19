import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      code: "SIGNUP_STEP_REMOVED",
      error: "Signup now creates an account immediately with name, email, and password.",
    },
    { status: 410 },
  );
}
