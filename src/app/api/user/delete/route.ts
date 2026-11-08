import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";

export const POST = withAuth(async (req, user) => {
  try {
    const { userId } = await req.json();
    if (userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized: Cannot delete another user" }, { status: 403 });
    }
    return NextResponse.json({ ok: true, message: "Deletion authorized." });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
});
