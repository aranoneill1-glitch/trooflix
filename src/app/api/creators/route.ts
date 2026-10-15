import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const KEY = "trooflix:creators";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const includeHidden = searchParams.get("includeHidden") === "1";
    const all = (await kv.get<any[]>(KEY)) || [];
    const creators = includeHidden ? all : all.filter((c: any) => !c.hidden);

    // Enrich with is_verified from profiles
    const userIds = creators
      .map((c: any) => c.ownerUserId)
      .filter(Boolean) as string[];

    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, is_verified")
        .in("user_id", userIds);

      const verifiedMap: Record<string, boolean> = {};
      (profiles || []).forEach((p: any) => {
        verifiedMap[p.user_id] = !!p.is_verified;
      });

      const enriched = creators.map((c: any) => ({
        ...c,
        isVerified: c.ownerUserId ? !!verifiedMap[c.ownerUserId] : false,
      }));

      return NextResponse.json(enriched);
    }

    return NextResponse.json(creators);
  } catch (e) {
    console.error("GET creators error:", e);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const creators = (await kv.get<any[]>(KEY)) || [];

    const newCreator = {
      id: Date.now(),
      name: body.name || "Untitled Podcaster",
      slug: slugify(body.name || "untitled"),
      photoUrl: body.photoUrl || "",
      heroBackdropUrl: body.heroBackdropUrl || "",
      description: body.description || "",
      createdAt: new Date().toISOString(),
    };

    creators.push(newCreator);
    await kv.set(KEY, creators);
    return NextResponse.json(newCreator);
  } catch (e: any) {
    console.error("POST creators error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    const body = await req.json();
    const creators = (await kv.get<any[]>(KEY)) || [];

    const index = creators.findIndex((c: any) => c.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "Podcaster not found" }, { status: 404 });
    }

    creators[index] = {
      ...creators[index],
      name: body.name ?? creators[index].name,
      slug: body.name ? slugify(body.name) : creators[index].slug,
      photoUrl: body.photoUrl ?? creators[index].photoUrl,
      heroBackdropUrl: body.heroBackdropUrl !== undefined ? body.heroBackdropUrl : (creators[index].heroBackdropUrl ?? ""),
      description: body.description ?? creators[index].description,
    };

    await kv.set(KEY, creators);
    return NextResponse.json(creators[index]);
  } catch (e: any) {
    console.error("PUT creators error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    const creators = (await kv.get<any[]>(KEY)) || [];
    const filtered = creators.filter((c: any) => c.id !== id);
    await kv.set(KEY, filtered);
    return NextResponse.json({ ok: true, deleted: id });
  } catch (e: any) {
    console.error("DELETE creators error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
