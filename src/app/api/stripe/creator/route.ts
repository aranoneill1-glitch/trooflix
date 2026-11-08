import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.userId || !body.creatorId) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }
    const url = new URL("/api/stripe/checkout", req.url);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: body.userId, type: "creator", creatorId: body.creatorId }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
