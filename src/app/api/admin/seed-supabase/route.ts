import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const MOCK_DATA = [
  { name: "The History Vault", category: "History", img: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&h=400&fit=crop" },
  { name: "Geopolitics Decoded", category: "Politics", img: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400&h=400&fit=crop" },
  { name: "War Stories", category: "War", img: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=400&h=400&fit=crop" },
  { name: "True Crime Files", category: "True Crime", img: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=400&fit=crop" },
  { name: "The Unknown", category: "Conspiracy", img: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=400&h=400&fit=crop" },
  { name: "Society Today", category: "Society", img: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400&h=400&fit=crop" },
  { name: "Market Watch", category: "Business", img: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=400&fit=crop" },
  { name: "Future Tech", category: "Science", img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=400&fit=crop" },
  { name: "Wild Earth", category: "Environment", img: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=400&fit=crop" },
  { name: "Faith & Reason", category: "Religion", img: "https://images.unsplash.com/photo-1548625149-fc4a29cf7092?w=400&h=400&fit=crop" }
];

export async function GET() {
  try {
    // Delete old mocks first (idempotent)
    await supabaseAdmin.from("profiles").delete().like("username", "mockcreator_%");

    const inserts = Array.from({ length: 50 }).map((_, i) => {
      const base = MOCK_DATA[i % MOCK_DATA.length];
      return {
        user_id: crypto.randomUUID(),
        username: `mockcreator_${i + 1}`,
        display_name: `${base.name} ${i + 1}`,
        avatar_url: base.img,
        bio: `Exploring the depths of ${base.category}. This is a mock creator for preview purposes.`,
        tier: "podcaster",
        is_verified: true,
      };
    });

    const { error } = await supabaseAdmin.from("profiles").insert(inserts);
    if (error) throw error;

    return NextResponse.json({ ok: true, message: `Inserted 50 mock creators into Supabase.` });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
