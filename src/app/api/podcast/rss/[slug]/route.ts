import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const VIDEOS_KEY = "trooflix:videos";
const CREATORS_KEY = "trooflix:creators";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request, 
  { params }: { params: Promise<{ slug: string }> } // <-- FIX: params is now a Promise in Next.js 15+
) {
  try {
    const { slug } = await params; // <-- Await the params
    const creators = (await kv.get<any[]>(CREATORS_KEY)) || [];
    const creator = creators.find((c) => c.slug === slug);

    if (!creator) {
      return new NextResponse("Creator not found", { status: 404 });
    }

    const allVideos = (await kv.get<any[]>(VIDEOS_KEY)) || [];
    const podcasts = allVideos.filter((v) => 
      String(v.creatorId) === String(creator.id) && 
      v.type === "Podcast" && 
      (v.status === "published" || !v.status)
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const baseUrl = "https://www.trooflixtv.com";
    
    // Construct the XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${creator.name}</title>
    <link>${baseUrl}/podcaster/${creator.slug}</link>
    <language>en-us</language>
    <copyright>All rights reserved</copyright>
    <itunes:author>${creator.name}</itunes:author>
    <description>${creator.description || "A podcast on Trooflix."}</description>
    <itunes:image href="${creator.photoUrl || `${baseUrl}/icon.png`}" />
    <itunes:category text="Society &amp; Culture" />
    <itunes:explicit>false</itunes:explicit>
`;

    podcasts.forEach((ep) => {
      const pubDate = new Date(ep.createdAt).toUTCString();
      const mediaUrl = ep.videoUrl || ep.bitchuteUrl;
      if (!mediaUrl) return; 

      xml += `    <item>
      <title><![CDATA[${ep.title}]]></title>
      <description><![CDATA[${ep.description || ""}]]></description>
      <pubDate>${pubDate}</pubDate>
      <enclosure url="${mediaUrl}" length="0" type="video/mp4" />
      <guid isPermaLink="false">${ep.id}</guid>
      <itunes:duration>00:00:00</itunes:duration>
    </item>
`;
    });

    xml += `  </channel>
</rss>`;

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/rss+xml",
        "Cache-Control": "s-maxage=3600, stale-while-revalidate",
      },
    });
  } catch (e) {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
