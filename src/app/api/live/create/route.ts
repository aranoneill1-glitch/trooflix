import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

    if (!accountId || !apiToken) {
      return NextResponse.json({ error: "Missing Cloudflare credentials" }, { status: 500 });
    }

    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/live_inputs`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        meta: { name: "Trooflix Live Stream" },
        recording: { mode: "off" },
        preferLowLatency: true,
      }),
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.errors }, { status: res.status });

    return NextResponse.json({
      liveInputId: data.result.uid,
      whipUrl: data.result.webRTC.url,
      whepUrl: data.result.webRTCPlayback.url,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
