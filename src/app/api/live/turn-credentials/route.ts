import { NextResponse } from "next/server";

export async function GET() {
  try {
    const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;
    const apiToken = process.env.CLOUDFLARE_TURN_KEY_API_TOKEN;

    if (!keyId || !apiToken) {
      return NextResponse.json({ iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }] });
    }

    const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ttl: 86400 })
    });

    if (!res.ok) {
       return NextResponse.json({ iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }] });
    }

    const data = await res.json();
    
    // Safely ensure it is ALWAYS an array
    let servers = data.iceServers;
    if (!Array.isArray(servers)) {
      servers = [servers];
    }

    return NextResponse.json({ iceServers: servers });
  } catch (error: any) {
    // Fallback to STUN if anything goes wrong
    return NextResponse.json({ iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }] });
  }
}
