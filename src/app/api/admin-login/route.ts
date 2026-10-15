import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json();
  const correct = process.env.ADMIN_PASSWORD;

  // Temporary debug response — remove after fix
  return NextResponse.json({
    received: password,
    received_len: typeof password === "string" ? password.length : 0,
    env_exists: !!correct,
    env_len: correct ? correct.length : 0,
    match: password === correct,
  });
}
