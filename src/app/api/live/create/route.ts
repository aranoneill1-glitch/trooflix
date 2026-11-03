import { NextResponse } from "next/server";

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

export async function POST() {
  try {
    if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
      return NextResponse.json({ error: "Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN in Vercel" }, { status: 500 });
    }

    const createRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/live_inputs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        meta: { name: "Trooflix Live Stream" },
        recording: { mode: "automatic" }
      })
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      return NextResponse.json({ error: "Cloudflare Error: " + err }, { status: 500 });
    }

    const data = await createRes.json();
    
    return NextResponse.json({
      liveInputId: data.result.uid,
      whipUrl: data.result.webRTC.url,
      whepUrl: data.result.webRTC.playbackUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
