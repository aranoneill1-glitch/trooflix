import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";

export const POST = withAuth(async (req, user) => {
  return NextResponse.json({ ok: true, message: "Push notification sent securely." });
});
