import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const KEY = "trooflix:videos";

// FORCE NEXT.JS TO NEVER CACHE THIS API ROUTE
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      category: body.category || "Uncategorized",
      visibility: body.visibility || "plus",
      type: body.type || "Documentary",
      featured: !!body.featured,
      creatorId: body.creatorId || null,
      uploaderUserId: body.uploaderUserId || null,
      videoUrl: body.videoUrl ?? body.bitchuteUrl ?? "",
      posterUrl:
        body.posterUrl ||
        `/api/poster?title=${encodeURIComponent(body.title || "Untitled")}&category=${encodeURIComponent(body.category || "Uncensored")}`,
      backdropUrl:
        body.backdropUrl ||
        `/api/poster?size=wide&title=${encodeURIComponent(body.title || "Untitled")}&category=${encodeURIComponent(body.category || "Uncensored")}`,
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

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    const body = await req.json();
    const videos = (await kv.get<any[]>(KEY)) || [];

    const index = videos.findIndex((v: any) => String(v.id) === String(id));
    if (index === -1) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    videos[index] = {
      ...videos[index],
      title: body.title ?? videos[index].title,
      description: body.description ?? videos[index].description,
      category: body.category ?? videos[index].category,
      type: body.type ?? videos[index].type,
      featured: body.featured ?? videos[index].featured,
      creatorId: body.creatorId !== undefined ? body.creatorId : (videos[index].creatorId ?? null),
      uploaderUserId: body.uploaderUserId !== undefined ? body.uploaderUserId : (videos[index].uploaderUserId ?? null),
      videoUrl: body.videoUrl ?? body.bitchuteUrl ?? videos[index].videoUrl ?? videos[index].bitchuteUrl ?? "",
      posterUrl: body.posterUrl ?? videos[index].posterUrl,
      backdropUrl: body.backdropUrl ?? videos[index].backdropUrl,
      year: body.year ?? videos[index].year,
      rating: body.rating ?? videos[index].rating,
      pinned: body.pinned ?? videos[index].pinned ?? false,
      order: body.order ?? videos[index].order ?? 0,
      textOverlays: Array.isArray(body.textOverlays) ? body.textOverlays : (videos[index].textOverlays || []),
    };

    await kv.set(KEY, videos);
    return NextResponse.json(videos[index]);
  } catch (e: any) {
    console.error("PUT error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    const videos = (await kv.get<any[]>(KEY)) || [];
    const filtered = videos.filter((v: any) => String(v.id) !== String(id));
    await kv.set(KEY, filtered);
    return NextResponse.json({ ok: true, deleted: id });
  } catch (e: any) {
    console.error("DELETE error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
