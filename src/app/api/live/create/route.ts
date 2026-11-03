import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
      return NextResponse.json({ error: "Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN in Vercel Environment Variables" }, { status: 500 });
    }

    // 1. Check if the user already has a Live Input saved
    const { data: profile } = await supabase.from("profiles").select("live_input_id").eq("user_id", userId).single();
    let liveInputId = profile?.live_input_id;

    // 2. If they have one, try to fetch it
    if (liveInputId) {
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/live_inputs/${liveInputId}`, {
        headers: { Authorization: `Bearer ${CF_API_TOKEN}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.result && data.result.webRTC) {
          return NextResponse.json({
            liveInputId: liveInputId,
            whipUrl: data.result.webRTC.url,
            whepUrl: data.result.webRTC.playbackUrl,
          });
        }
      }
      // If fetch fails (e.g., deleted in Cloudflare), clear it from DB and create new
      await supabase.from("profiles").update({ live_input_id: null }).eq("user_id", userId);
    }

    // 3. Create a brand new Live Input
    const createRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/live_inputs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        meta: { name: "Trooflix Live Stream" },
        recording: { mode: "automatic" }
      })
    });

    if (!createRes.ok) {
      const errorData = await createRes.json().catch(() => ({}));
      // This will send the EXACT Cloudflare error to your frontend
      const cfError = errorData.errors?.[0]?.message || JSON.stringify(errorData) || "Cloudflare rejected the creation";
      return NextResponse.json({ error: `Cloudflare Error: ${cfError}` }, { status: 500 });
    }

    const createData = await createRes.json();
    
    // Handle different possible response structures from Cloudflare
    liveInputId = createData.result?.uid || createData.result?.id;
    const webRTC = createData.result?.webRTC;

    if (!liveInputId || !webRTC) {
      return NextResponse.json({ error: "Cloudflare did not return a Live Input ID or WebRTC URL" }, { status: 500 });
    }

    // 4. Save the new ID to the database
    await supabase.from("profiles").update({ live_input_id: liveInputId }).eq("user_id", userId);

    return NextResponse.json({
      liveInputId: liveInputId,
      whipUrl: webRTC.url,
      whepUrl: webRTC.playbackUrl,
    });

  } catch (error: any) {
    console.error("Live API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
