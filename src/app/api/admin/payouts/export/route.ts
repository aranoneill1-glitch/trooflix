import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CREATORS_KEY = "trooflix:creators";

export async function GET() {
  const cookieStore = await cookies();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminCookie = cookieStore.get("trooflix_admin")?.value;
  if (!adminPassword || adminCookie !== adminPassword) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
    const creatorMap = new Map(creators.map((c) => [Number(c.id), c]));

    const { data: subs } = await supabaseAdmin
      .from("creator_subscriptions")
      .select("creator_id, price_cents")
      .in("status", ["active", "trialing"]);

    const owed = new Map<number, { count: number; gross_cents: number }>();
    for (const s of subs || []) {
      const current = owed.get(s.creator_id) || { count: 0, gross_cents: 0 };
      owed.set(s.creator_id, { count: current.count + 1, gross_cents: current.gross_cents + (s.price_cents || 0) });
    }

    let csv = "Creator Name,Slug,Subscribers,Gross Amount,Platform Fee (10%),Net Owed (90%)\n";
    Array.from(owed.entries()).forEach(([creatorId, data]) => {
      const c = creatorMap.get(creatorId) || { name: "Unknown", slug: "unknown" };
      const net = Math.floor(data.gross_cents * 0.9);
      const fee = data.gross_cents - net;
      csv += `"${c.name}","${c.slug}",${data.count},${(data.gross_cents/100).toFixed(2)},${(fee/100).toFixed(2)},${(net/100).toFixed(2)}\n`;
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="trooflix-payouts-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (e) {
    return new NextResponse("Error generating CSV", { status: 500 });
  }
}
