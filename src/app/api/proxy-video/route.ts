import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  const range = req.headers.get("range");

  try {
    const res = await fetch(url, {
      headers: range ? { Range: range } : {},
    });

    // Forward all important headers back to the browser
    const headers = new Headers();
    res.headers.forEach((value, key) => {
      headers.set(key, value);
    });
    
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Headers", "Range");

    return new NextResponse(res.body, {
      status: res.status,
      headers: headers,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
