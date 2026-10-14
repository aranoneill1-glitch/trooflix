import { NextResponse } from "next/server";

// GET /api/giphy-search?q=hello&limit=24
// Server-side proxy to Giphy so the API key never reaches the browser.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(Number(searchParams.get("limit") || 24), 50);
    const offset = Math.max(Number(searchParams.get("offset") || 0), 0);

    const key = process.env.GIPHY_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "Giphy key not configured", gifs: [] },
        { status: 500 }
      );
    }

    // Empty query → trending endpoint (what Instagram does when you open the picker)
    const base = q
      ? `https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(q)}`
      : `https://api.giphy.com/v1/gifs/trending?`;

    const url = `${base}${q ? "&" : ""}api_key=${key}&limit=${limit}&offset=${offset}&rating=pg-13`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text();
      console.error("Giphy error:", res.status, text);
      return NextResponse.json({ gifs: [] });
    }

    const data = await res.json();
    const gifs = (data.data || []).map((g: any) => ({
      id: g.id,
      title: g.title,
      // Use the fixed-height version for the grid (fast, small)
      preview:
        g.images?.fixed_height_small?.url ||
        g.images?.fixed_height?.url ||
        g.images?.original?.url,
      // Use fixed_height for messages (good balance)
      full:
        g.images?.fixed_height?.url ||
        g.images?.original?.url,
      width: Number(g.images?.fixed_height?.width || 200),
      height: Number(g.images?.fixed_height?.height || 200),
    }));

    return NextResponse.json({ gifs });
  } catch (e: any) {
    console.error("giphy-search error:", e);
    return NextResponse.json({ gifs: [] });
  }
}
