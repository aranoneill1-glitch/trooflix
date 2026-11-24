import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

function key(userId: string) {
  return `trooflix:fav:creators:${userId}`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    if (!userId) return NextResponse.json({ ids: [] });
    const ids = (await kv.get<number[]>(key(userId))) || [];
    return NextResponse.json({ ids: Array.isArray(ids) ? ids : [] });
  } catch (e: any) {
    console.error("GET favorites/creators error:", e);
    return NextResponse.json({ ids: [] });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, creatorId } = await req.json();
    if (!userId || !creatorId) return NextResponse.json({ error: "userId and creatorId required" }, { status: 400 });
    const k = key(String(userId));
    const ids = (await kv.get<number[]>(k)) || [];
    const cid = Number(creatorId);
    if (!ids.includes(cid)) ids.unshift(cid);
    await kv.set(k, ids);
    return NextResponse.json({ ok: true, ids });
  } catch (e: any) {
    console.error("POST favorites/creators error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const creatorId = searchParams.get("creatorId");
    if (!userId || !creatorId) return NextResponse.json({ error: "userId and creatorId required" }, { status: 400 });
    const k = key(String(userId));
    const ids = (await kv.get<number[]>(k)) || [];
    const next = ids.filter((id: number) => Number(id) !== Number(creatorId));
    await kv.set(k, next);
    return NextResponse.json({ ok: true, ids: next });
  } catch (e: any) {
    console.error("DELETE favorites/creators error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
