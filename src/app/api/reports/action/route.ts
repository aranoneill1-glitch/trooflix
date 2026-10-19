import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kv } from "@vercel/kv";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const VIDEOS_KEY = "trooflix:videos";

export async function POST(req: Request) {
  try {
    // Admin auth
    const cookieStore = await cookies();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminCookie = cookieStore.get("trooflix_admin")?.value;
    const isAdmin = adminPassword && adminCookie === adminPassword;

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reportId, decision } = await req.json();
    if (!reportId || !["delete", "dismiss"].includes(decision)) {
      return NextResponse.json({ error: "reportId and decision (delete|dismiss) required" }, { status: 400 });
    }

    // Fetch the report
    const { data: report } = await supabaseAdmin
      .from("reports")
      .select("reporter_user_id, content_type, content_id, reason")
      .eq("id", reportId)
      .maybeSingle();

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // ---- DECISION: DELETE ----
    if (decision === "delete") {
      // 1. Delete the content
      if (report.content_type === "post") {
        // Delete from KV (all related data)
        const videos = (await kv.get<any[]>(VIDEOS_KEY)) || [];
        const filtered = videos.filter((v: any) => String(v.id) !== String(report.content_id));
        await kv.set(VIDEOS_KEY, filtered);

        // Clean up related records
        const postId = Number(report.content_id);
        await Promise.all([
          supabaseAdmin.from("likes").delete().eq("video_id", postId),
          supabaseAdmin.from("dislikes").delete().eq("video_id", postId),
          supabaseAdmin.from("comments").delete().eq("video_id", postId),
          supabaseAdmin.from("views").delete().eq("video_id", postId),
          supabaseAdmin.from("reposts").delete().eq("post_id", postId),
          supabaseAdmin.from("notifications").delete().eq("post_id", postId),
        ]);
      } else if (report.content_type === "comment") {
        // Delete the comment + its replies
        await supabaseAdmin.from("comments").delete().eq("parent_id", Number(report.content_id));
        await supabaseAdmin.from("comments").delete().eq("id", Number(report.content_id));
        await supabaseAdmin.from("comment_likes").delete().eq("comment_id", Number(report.content_id));
      }
      // For "user" content_type, we'd delete the user account — not implemented yet
    }

    // ---- Update report status ----
    const newStatus = decision === "delete" ? "actioned" : "dismissed";
    await supabaseAdmin
      .from("reports")
      .update({
        status: newStatus,
        reviewed_by: "admin",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    // ---- Notify the reporter ----
    try {
      await supabaseAdmin.from("notifications").insert({
        user_id: report.reporter_user_id,
        actor_id: report.reporter_user_id,
        type: "report_update",
        post_id: report.content_type === "post" ? Number(report.content_id) : null,
        meta: { outcome: newStatus, reason: report.reason, content_type: report.content_type },
      });
    } catch (notifErr) {
      console.warn("report notification failed:", notifErr);
    }

    return NextResponse.json({ ok: true, decision, newStatus });
  } catch (e: any) {
    console.error("report action error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
