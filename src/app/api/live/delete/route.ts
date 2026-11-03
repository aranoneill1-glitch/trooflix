import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    // 1. Get the live_input_id from the user's profile
    const { data: profile } = await supabase.from("profiles").select("live_input_id").eq("user_id", userId).single();
    const liveInputId = profile?.live_input_id;

    if (liveInputId) {
      // 2. Tell Cloudflare to delete it
      await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/live_inputs/${liveInputId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${CF_API_TOKEN}` }
      });

      // 3. Clear it from the database so the next stream creates a new one
      await supabase.from("profiles").update({ live_input_id: null }).eq("user_id", userId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Live Input Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
