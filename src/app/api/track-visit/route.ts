import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const STATS_KEY = "trooflix:stats";

type Stats = {
  totalViews: number;
  uniqueVisitors: number;
  today: { date: string; count: number };
  daily: Record<string, number>; // date -> count
  lastUpdated: string;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function getStats(): Promise<Stats> {
  const existing = await kv.get<Stats>(STATS_KEY);
  if (existing) return existing;
  return {
    totalViews: 0,
    uniqueVisitors: 0,
    today: { date: todayKey(), count: 0 },
    daily: {},
    lastUpdated: new Date().toISOString(),
  };
}

export async function POST(req: Request) {
  try {
    const { isUnique } = await req.json().catch(() => ({ isUnique: false }));
    const stats = await getStats();
    const today = todayKey();

    // Reset today if date changed
    if (stats.today.date !== today) {
      stats.today = { date: today, count: 0 };
    }

    stats.totalViews += 1;
    stats.today.count += 1;
    if (isUnique) stats.uniqueVisitors += 1;

    // Keep daily rollup
    stats.daily[today] = (stats.daily[today] || 0) + 1;

    // Prune daily entries older than 30 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffKey = cutoff.toISOString().slice(0, 10);
    Object.keys(stats.daily).forEach((k) => {
      if (k < cutoffKey) delete stats.daily[k];
    });

    stats.lastUpdated = new Date().toISOString();
    await kv.set(STATS_KEY, stats);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("track-visit error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  try {
    const stats = await getStats();
    // Compute last 7 days
    const last7: Record<string, number> = {};
    let last7Total = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = stats.daily[key] || 0;
      last7[key] = count;
      last7Total += count;
    }
    return NextResponse.json({
      totalViews: stats.totalViews,
      uniqueVisitors: stats.uniqueVisitors,
      today: stats.today.count,
      last7Days: last7Total,
      daily: last7,
    });
  } catch (e) {
    console.error("get stats error:", e);
    return NextResponse.json({
      totalViews: 0,
      uniqueVisitors: 0,
      today: 0,
      last7Days: 0,
      daily: {},
    });
  }
}
