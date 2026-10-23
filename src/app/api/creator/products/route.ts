import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const creatorId = searchParams.get("creatorId");
  if (!creatorId) return NextResponse.json({ products: [] });

  try {
    const { data } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("creator_id", Number(creatorId))
      .order("created_at", { ascending: false });

    return NextResponse.json({ products: data || [] });
  } catch (e) {
    return NextResponse.json({ products: [] });
  }
}

export async function POST(req: Request) {
  try {
    const { creatorId, name, description, price_cents, image_url, inventory_count } = await req.json();
    if (!creatorId || !name || !price_cents) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("products")
      .insert({
        creator_id: Number(creatorId),
        name,
        description,
        price_cents: Number(price_cents),
        image_url,
        inventory_count: Number(inventory_count) || 0,
        active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, product: data });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, name, description, price_cents, image_url, inventory_count } = await req.json();
    if (!id || !name || !price_cents) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("products")
      .update({
        name,
        description,
        price_cents: Number(price_cents),
        image_url,
        inventory_count: Number(inventory_count),
      })
      .eq("id", Number(id))
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, product: data });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("products")
      .delete()
      .eq("id", Number(id));

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
