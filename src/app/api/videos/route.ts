import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const dataPath = path.join(dataDir, "videos.json");

function ensureFile() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, "[]");
}

function readVideos() {
  try {
    ensureFile();
    return JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  } catch {
    return [];
  }
}

function writeVideos(videos: any[]) {
  ensureFile();
  fs.writeFileSync(dataPath, JSON.stringify(videos, null, 2));
}

export async function GET() {
  return NextResponse.json(readVideos());
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const videos = readVideos();
    const newVideo = {
      id: Date.now(),
      title: body.title || "Untitled",
      description: body.description || "",
      category: body.category || "Uncensored",
      type: body.type || "Documentary",
      featured: !!body.featured,
      bitchuteUrl: (body.bitchuteUrl || "").includes("bitchute.com")
        ? (body.bitchuteUrl || "").replace("/video/", "/embed/")
        : (body.bitchuteUrl || ""),
      posterUrl: body.posterUrl || `/api/poster?title=${encodeURIComponent(body.title || "Untitled")}&category=${encodeURIComponent(body.category || "Uncensored")}`,
      backdropUrl: body.backdropUrl || `/api/poster?title=${encodeURIComponent(body.title || "Untitled")}&category=${encodeURIComponent(body.category || "Uncensored")}`,
      year: body.year || 2026,
      rating: body.rating || "TV-MA",
      match: body.match || 95,
      duration: body.duration || "",
      createdAt: new Date().toISOString(),
    };
    videos.push(newVideo);
    writeVideos(videos);
    return NextResponse.json(newVideo);
  } catch (e: any) {
    console.error("POST ERROR:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    writeVideos(readVideos().filter((v: any) => v.id !== id));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
