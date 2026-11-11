import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/** Shared authorization check for server-only admin API routes. */
export async function requireAdmin(): Promise<Response | null> {
  const expected = process.env.ADMIN_PASSWORD;
  const cookieStore = await cookies();
  const supplied = cookieStore.get("trooflix_admin")?.value;

  if (!expected || !supplied || supplied !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
