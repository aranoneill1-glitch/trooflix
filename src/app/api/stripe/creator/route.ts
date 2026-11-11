import { NextResponse } from "next/server";
import { assertSelf, requireUser } from "@/lib/api-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.userId || !body.creatorId) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }
    const auth = await requireUser();
    if (auth instanceof Response) return auth;
    const mismatch = assertSelf(auth.user, body.userId);
    if (mismatch) return mismatch;
    const url = new URL("/api/stripe/checkout", req.url);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") || "" },
      body: JSON.stringify({ userId: auth.user.id, type: "creator", creatorId: body.creatorId }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
