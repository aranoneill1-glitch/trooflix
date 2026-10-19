import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// POST /api/reports — { reporterUserId, contentType, contentId, reason, details }
export async function POST(req: Request) {
  try {
    const { reporterUserId, contentType, contentId, reason, details } = await req.json();

    if (!reporterUserId || !contentType || !contentId || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Prevent duplicate reports from same user on same content
    const { data: existing } = await supabaseAdmin
      .from("reports")
      .select("id")
      .eq("reporter_user_id", reporterUserId)
      .eq("content_type", contentType)
      .eq("content_id", String(contentId))
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, alreadyReported: true });
    }

    const { error } = await supabaseAdmin.from("reports").insert({
      reporter_user_id: reporterUserId,
      content_type: contentType,
      content_id: String(contentId),
      reason,
      details: details || null,
    });

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("POST report error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// GET /api/reports — admin only: list all pending reports
export async function GET() {
  try {
    const cookieStore = await cookies();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminCookie = cookieStore.get("trooflix_admin")?.value;
    const isAdmin = adminPassword && adminCookie === adminPassword;

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    return NextResponse.json({ reports: data || [] });
  } catch (e: any) {
    console.error("GET reports error:", e);
    return NextResponse.json({ reports: [] });
  }
}

// PATCH /api/reports — { id, status } — admin only: update status
export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminCookie = cookieStore.get("trooflix_admin")?.value;
    const isAdmin = adminPassword && adminCookie === adminPassword;

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, status } = await req.json();
    if (!id || !["reviewed", "dismissed", "actioned"].includes(status)) {
      return NextResponse.json({ error: "Invalid id or status" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("reports")
      .update({
        status,
        reviewed_by: "admin",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("PATCH report error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
