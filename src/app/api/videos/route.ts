import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const KEY = "trooflix:videos";

export async function GET() {
  try {
    const videos = (await kv.get<any[]>(KEY)) || [];
    return NextResponse.json(videos);
  } catch (e) {
    console.error("GET error:", e);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const videos = (await kv.get<any[]>(KEY)) || [];

    const newVideo = {
      id: Date.now(),
      title: body.title || "Untitled",
      description: body.description || "",
      category: body.category || "Uncensored",
      type: body.type || "Documentary",
      featured: !!body.featured,
      bitchuteUrl: (body.bitchuteUrl || "").includes("bitchute.com")
        ? body.bitchuteUrl.replace("/video/", "/embed/")
        : body.bitchuteUrl,
      posterUrl:
        body.posterUrl ||
        `/api/poster?title=${encodeURIComponent(body.title || "Untitled")}&category=${encodeURIComponent(body.category || "Uncensored")}`,
      backdropUrl:
        body.backdropUrl ||
        `/api/poster?title=${encodeURIComponent(body.title || "Untitled")}&category=${encodeURIComponent(body.category || "Uncensored")}`,
      year: body.year || new Date().getFullYear(),
      rating: body.rating || "TV-MA",
      match: body.match || 95,
      duration: body.duration || "",
      createdAt: new Date().toISOString(),
    };

    videos.push(newVideo);
    await kv.set(KEY, videos);
    return NextResponse.json(newVideo);
  } catch (e: any) {
    console.error("POST error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    const videos = (await kv.get<any[]>(KEY)) || [];
    const filtered = videos.filter((v: any) => v.id !== id);
    await kv.set(KEY, filtered);
    return NextResponse.json({ ok: true, deleted: id });
  } catch (e: any) {
    console.error("DELETE error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
