import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CREATORS_KEY = "trooflix:creators";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function getCallerCreator(userId: string) {
  if (!userId) return null;

  const { data: app } = await supabaseAdmin
    .from("creator_applications")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();

  if (!app || app.status !== "approved") return null;

  const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
  const idx = creators.findIndex((c: any) => c.ownerUserId === userId);
  if (idx === -1) return null;
  return { creators, idx, creator: creators[idx] };
}

// PATCH /api/creator/profile — update own creator profile
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body;
    const found = await getCallerCreator(userId);
    if (!found) {
      return NextResponse.json({ error: "Not an approved creator" }, { status: 403 });
    }

    const { creators, idx, creator } = found;
    const updates: any = {};

    if (body.name !== undefined) {
      const n = String(body.name).trim().slice(0, 80);
      if (n.length < 2) return NextResponse.json({ error: "Name too short" }, { status: 400 });
      updates.name = n;
    }
    if (body.bio !== undefined) {
      updates.description = String(body.bio).trim().slice(0, 500);
    }
    if (body.category !== undefined) {
      updates.category = String(body.category).trim().slice(0, 60);
    }
    if (body.photoUrl !== undefined) {
      updates.photoUrl = String(body.photoUrl);
    }
    if (body.heroBackdropUrl !== undefined) {
      updates.heroBackdropUrl = String(body.heroBackdropUrl);
    }

    // Slug (special — must be unique)
    if (body.slug !== undefined) {
      const s = slugify(String(body.slug));
      if (s.length < 3) {
        return NextResponse.json({ error: "Slug too short" }, { status: 400 });
      }
      const taken = creators.some(
        (c: any, i: number) => i !== idx && c.slug === s
      );
      if (taken) {
        return NextResponse.json({ error: "That slug is already taken" }, { status: 409 });
      }
      updates.slug = s;
    }

    creators[idx] = { ...creator, ...updates };
    await kv.set(CREATORS_KEY, creators);

    return NextResponse.json({ ok: true, creator: creators[idx] });
  } catch (e: any) {
    console.error("PATCH creator profile error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/creator/profile?userId=X — soft-hide creator
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "";
    const found = await getCallerCreator(userId);
    if (!found) {
      return NextResponse.json({ error: "Not an approved creator" }, { status: 403 });
    }

    const { creators, idx, creator } = found;
    creators[idx] = { ...creator, hidden: true, hiddenAt: new Date().toISOString() };
    await kv.set(CREATORS_KEY, creators);

    // Also mark application rejected so they don't show up as "approved"
    await supabaseAdmin
      .from("creator_applications")
      .update({ status: "rejected", admin_notes: "Creator deleted own profile" })
      .eq("user_id", userId);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE creator profile error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
