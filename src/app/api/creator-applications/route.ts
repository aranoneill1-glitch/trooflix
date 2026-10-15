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

// GET /api/creator-applications?status=pending  → list
// GET /api/creator-applications?user_id=X       → that user's application (or null)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const userId = searchParams.get("user_id");

    if (userId) {
      const { data, error } = await supabaseAdmin
        .from("creator_applications")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return NextResponse.json({ application: data || null });
    }

    let query = supabaseAdmin
      .from("creator_applications")
      .select("id, user_id, creator_name, bio, category, photo_url, status, admin_notes, reviewed_at, created_at")
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ applications: data || [] });
  } catch (e: any) {
    console.error("GET creator-applications error:", e);
    return NextResponse.json({ applications: [], application: null });
  }
}

// POST /api/creator-applications — { userId, creatorName, bio, category, photoUrl? }
export async function POST(req: Request) {
  try {
    const { userId, creatorName, bio, category, photoUrl } = await req.json();

    if (!userId || !creatorName || !bio || !category) {
      return NextResponse.json(
        { error: "userId, creatorName, bio, category required" },
        { status: 400 }
      );
    }

    const trimmed = {
      creator_name: String(creatorName).trim().slice(0, 80),
      bio: String(bio).trim().slice(0, 500),
      category: String(category).trim().slice(0, 60),
      photo_url: photoUrl ? String(photoUrl) : null,
    };

    // Check existing
    const { data: existing } = await supabaseAdmin
      .from("creator_applications")
      .select("id, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      if (existing.status === "pending") {
        return NextResponse.json(
          { error: "You already have a pending application." },
          { status: 409 }
        );
      }
      if (existing.status === "approved") {
        return NextResponse.json(
          { error: "You're already an approved creator." },
          { status: 409 }
        );
      }
      // rejected → allow re-application by updating the row
      const { data, error } = await supabaseAdmin
        .from("creator_applications")
        .update({
          ...trimmed,
          status: "pending",
          admin_notes: null,
          reviewed_at: null,
          created_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ ok: true, application: data });
    }

    const { data, error } = await supabaseAdmin
      .from("creator_applications")
      .insert({ user_id: userId, ...trimmed })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, application: data });
  } catch (e: any) {
    console.error("POST creator-applications error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/creator-applications — { id, action: "approve"|"reject", adminNotes? }
export async function PATCH(req: Request) {
  try {
    const { id, action, adminNotes } = await req.json();
    if (!id || !action) {
      return NextResponse.json({ error: "id and action required" }, { status: 400 });
    }

    const { data: app, error: fetchErr } = await supabaseAdmin
      .from("creator_applications")
      .select("*")
      .eq("id", Number(id))
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (action === "reject") {
      // Clear verified flag when un-approving
      await supabaseAdmin
        .from("profiles")
        .update({ is_verified: false })
        .eq("user_id", app.user_id);

      const { error } = await supabaseAdmin
        .from("creator_applications")
        .update({
          status: "rejected",
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", Number(id));
      if (error) throw error;
      return NextResponse.json({ ok: true, status: "rejected" });
    }

    if (action === "approve") {
      // 0. Flag the user's profile as verified (drives the red badge)
      await supabaseAdmin
        .from("profiles")
        .update({ is_verified: true })
        .eq("user_id", app.user_id);

      // 1. Add to creators KV
      const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
      const newCreator = {
        id: Date.now(),
        name: app.creator_name,
        slug: slugify(app.creator_name),
        photoUrl: app.photo_url || "",
        heroBackdropUrl: "",
        description: app.bio,
        ownerUserId: app.user_id,
        isVerified: true,
        createdAt: new Date().toISOString(),
      };
      creators.push(newCreator);
      await kv.set(CREATORS_KEY, creators);

      // 2. Mark approved
      const { error } = await supabaseAdmin
        .from("creator_applications")
        .update({
          status: "approved",
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", Number(id));
      if (error) throw error;

      return NextResponse.json({
        ok: true,
        status: "approved",
        creator: newCreator,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    console.error("PATCH creator-applications error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
