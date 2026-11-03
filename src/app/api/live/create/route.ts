import { NextResponse } from "next/server";

export async function POST() {
  try {
    // 1. Try to get Account ID from Vercel, or extract it from the R2 Endpoint
    let accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!accountId && process.env.R2_ENDPOINT) {
      // R2_ENDPOINT looks like: https://<account_id>.r2.cloudflarestorage.com
      const match = process.env.R2_ENDPOINT.match(/https:\/\/([a-f0-9]+)\.r2/);
      if (match) accountId = match[1];
    }

    // 2. Look for the API token under any common name
    const apiToken = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || process.env.CLOUDFLARE_STREAM_TOKEN;

    if (!accountId) {
      return NextResponse.json({ error: "Missing CLOUDFLARE_ACCOUNT_ID and could not extract from R2_ENDPOINT" }, { status: 500 });
    }
    
    if (!apiToken) {
      return NextResponse.json({ error: "Missing API Token. Please add CLOUDFLARE_API_TOKEN to Vercel." }, { status: 500 });
    }

    const createRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/live_inputs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        meta: { name: "Trooflix Live Stream" },
        recording: { mode: "automatic" }
      })
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      const cfError = err.errors?.[0]?.message || JSON.stringify(err);
      return NextResponse.json({ error: `Cloudflare Error: ${cfError}` }, { status: 500 });
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
