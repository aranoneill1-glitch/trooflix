import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const creatorId = searchParams.get("creatorId");
  if (!creatorId) return NextResponse.json({ error: "Missing creatorId" }, { status: 400 });

  try {
    const settings = await kv.get(`trooflix:shop-settings:${creatorId}`);
    // Return default settings if they haven't customized it yet
    return NextResponse.json(settings || {
      bannerUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop",
      tagline: "The official store. Support my work.",
      accentColor: "#E53945" // Default Trooflix Red
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { creatorId, bannerUrl, tagline, accentColor } = body;

    if (!creatorId) return NextResponse.json({ error: "Missing creatorId" }, { status: 400 });

    const settings = { bannerUrl, tagline, accentColor };
    await kv.set(`trooflix:shop-settings:${creatorId}`, settings);

    return NextResponse.json({ success: true, settings });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
