import { NextResponse } from "next/server";

export async function GET() {
  try {
    const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;
    const apiToken = process.env.CLOUDFLARE_TURN_KEY_API_TOKEN;

    if (!keyId || !apiToken) {
      return NextResponse.json({ error: "TURN keys not configured" }, { status: 500 });
    }

    const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ttl: 86400 }) // Valid for 24 hours
    });

    if (!res.ok) throw new Error("Failed to generate TURN credentials");

    const data = await res.json();
    
    // Return the iceServers array directly
    return NextResponse.json({ iceServers: data.iceServers });
  } catch (error: any) {
    console.error("TURN API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
