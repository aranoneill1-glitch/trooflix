import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const CREATORS_KEY = "trooflix:creators";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Fetch all active products from Supabase
    const { data: products, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!products || products.length === 0) return NextResponse.json({ products: [] });

    // 2. Fetch creators from KV to get their names/slugs/avatars
    const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
    const creatorMap = new Map(creators.map((c: any) => [Number(c.id), c]));

    // Fetch fallback profiles from Supabase
    const creatorIds = [...new Set(products.map(p => p.creator_id))];
    const { data: profiles } = await supabaseAdmin.from("profiles").select("user_id, avatar_url, username").in("user_id", creatorIds);
    const profileMap = new Map(profiles?.map(pr => [Number(pr.user_id), pr]) || []);

    // 3. Merge them together for the frontend
    const enrichedProducts = products.map((p) => {
      const creator = creatorMap.get(Number(p.creator_id)) || {};
      const dbProfile: any = profileMap.get(Number(p.creator_id)) || {};
      return {
        id: p.id,
        name: p.name,
        price_cents: p.price_cents,
        image_url: p.image_url,
        stock: p.inventory_count || 0,
        creator_id: p.creator_id, // <--- FIX: Added missing creator_id
        creatorName: creator.name || dbProfile.username || "Unknown Creator",
        creatorSlug: creator.slug || dbProfile.username || "",
        creatorPhoto: creator.photoUrl || dbProfile.avatar_url || "",
      };
    });

    return NextResponse.json({ products: enrichedProducts });
  } catch (e: any) {
    console.error("Global products error:", e);
    return NextResponse.json({ products: [] });
  }
}
