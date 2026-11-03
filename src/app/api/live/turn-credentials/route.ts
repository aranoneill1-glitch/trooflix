import { NextResponse } from "next/server";

export async function GET() {
  try {
    const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;
    const apiToken = process.env.CLOUDFLARE_TURN_KEY_API_TOKEN;

    if (!keyId || !apiToken) {
      return NextResponse.json({ error: "TURN keys not configured" }, { status: 500 });
    }

    // Corrected endpoint: generate-ice-servers
    const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ttl: 86400 })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Cloudflare API error: ${res.status} - ${errorText}`);
    }

    const data = await res.json();
    return NextResponse.json({ iceServers: data.iceServers });
  } catch (error: any) {
    console.error("TURN API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
