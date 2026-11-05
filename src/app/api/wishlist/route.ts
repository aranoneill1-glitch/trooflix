import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  try {
    const { data, error } = await supabaseAdmin
      .from("wishlists")
      .select("product_id, products(*)")
      .eq("user_id", userId);

    if (error) throw error;
    
    // Flatten the products array for the frontend
    const items = data.map((w: any) => w.products).filter(Boolean);
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ items: [] });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, productId } = await req.json();
    if (!userId || !productId) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("wishlists")
      .insert({ user_id: userId, product_id: Number(productId) });

    if (error && error.code !== "23505") throw error; // Ignore if already wishlisted
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const productId = searchParams.get("productId");
    if (!userId || !productId) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("wishlists")
      .delete()
      .eq("user_id", userId)
      .eq("product_id", Number(productId));

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
