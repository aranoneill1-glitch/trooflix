import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const KEY = "trooflix:heroes";

export async function GET() {
  try {
    const heroes = (await kv.get<{ main?: number; docufilm?: number; podcast?: number }>(KEY)) || {};
    return NextResponse.json(heroes);
  } catch (e: any) {
    console.error("GET heroes error:", e);
    return NextResponse.json({});
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { slot, id } = body;
    if (!["main", "docufilm", "podcast"].includes(slot)) {
      return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
    }
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const heroes = (await kv.get<{ main?: number; docufilm?: number; podcast?: number }>(KEY)) || {};
    heroes[slot as "main" | "docufilm" | "podcast"] = Number(id);
    await kv.set(KEY, heroes);
    return NextResponse.json({ ok: true, heroes });
  } catch (e: any) {
    console.error("POST heroes error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
