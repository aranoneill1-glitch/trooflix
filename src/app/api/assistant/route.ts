import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type AssistantAction =
  | { type: "navigate"; path: string; label?: string }
  | { type: "open_topup" }
  | { type: "open_orders"; tab?: "bought" | "sold" }
  | { type: "open_upload"; mediaType?: "video" | "short" | "podcast" | "documentary" | "tweet" }
  | { type: "open_search"; query?: string }
  | { type: "open_profile" }
  | { type: "message"; text: string };

function normalize(s: string) {
  return (s || "").toLowerCase().trim();
}

function heuristicActions(message: string): { reply: string; actions: AssistantAction[] } {
  const m = normalize(message);

  // Credits / wallet / top up
  if (/(add|buy|get|top ?up|load).*(credit|coin|troocoin)|\btop ?up\b|\bwallet\b|\bcredits?\b|\bcoins?\b/.test(m)) {
    return {
      reply: "Opening your wallet so you can add TrooCoins/credits.",
      actions: [{ type: "open_topup" }, { type: "navigate", path: "/wallet?topup=true", label: "Open Wallet (Top Up)" }],
    };
  }

  // Orders
  if (/\b(my )?orders?\b|\bpurchases?\b|\bbought\b|\bsold\b|\btrack(ing)?\b/.test(m)) {
    const tab = /\bsold\b/.test(m) ? "sold" : "bought";
    return {
      reply: tab === "sold" ? "Taking you to your sold orders." : "Taking you to your orders.",
      actions: [{ type: "open_orders", tab }, { type: "navigate", path: `/orders${tab === "sold" ? "?tab=sold" : ""}`, label: "Open Orders" }],
    };
  }

  // Reels / shorts / feed
  if (/\breels?\b|\bshorts?\b|\bfeed\b/.test(m)) {
    return {
      reply: "Opening Reels/Shorts.",
      actions: [{ type: "navigate", path: "/feed", label: "Open Reels" }],
    };
  }

  // Upload
  if (/\bupload\b|\bpost\b.*(video|short|podcast|documentary|tweet)|\bcreate\b.*(video|short|podcast|documentary|post)/.test(m)) {
    let mediaType: AssistantAction extends infer A ? A extends { type: "open_upload"; mediaType?: infer T } ? T : never : never = "video";
    if (/\bshort\b|\breel\b/.test(m)) mediaType = "short";
    else if (/\bpodcast\b/.test(m)) mediaType = "podcast";
    else if (/\bdocumentary\b|\bdoco?\b/.test(m)) mediaType = "documentary";
    else if (/\btweet\b/.test(m)) mediaType = "tweet";
    const qs = mediaType === "video" ? "" : `?type=${encodeURIComponent(mediaType)}`;
    return {
      reply: `Opening upload${mediaType && mediaType !== "video" ? ` (${mediaType})` : ""}.`,
      actions: [{ type: "open_upload", mediaType: mediaType as any }, { type: "navigate", path: `/creator-dashboard/upload${qs}`, label: "Open Upload" }],
    };
  }

  // Profile
  if (/\bmy profile\b|\bprofile\b|\baccount\b/.test(m)) {
    return {
      reply: "Opening your profile.",
      actions: [{ type: "open_profile" }],
    };
  }

  // Messages/chat
  if (/\bmessages?\b|\binbox\b|\bdms?\b|\bchat\b/.test(m)) {
    return {
      reply: "Opening your messages.",
      actions: [{ type: "navigate", path: "/messages", label: "Open Messages" }],
    };
  }

  // Search
  if (/\bsearch\b|\bfind\b|\blook for\b/.test(m)) {
    const q = message.replace(/^(please\s+)?(can you\s+)?(search|find|look for)\s*(for)?\s*/i, "").trim();
    const path = q ? `/search?q=${encodeURIComponent(q)}` : "/search";
    return {
      reply: q ? `Searching for "${q}".` : "Opening search.",
      actions: [{ type: "open_search", query: q || undefined }, { type: "navigate", path, label: "Open Search" }],
    };
  }

  // Creator dashboard / manage content
  if (/\bmanage content\b|\bmy videos\b|\bdashboard\b|\bcreator studio\b/.test(m)) {
    return {
      reply: "Opening Creator Dashboard.",
      actions: [{ type: "navigate", path: "/creator-dashboard", label: "Open Creator Dashboard" }],
    };
  }

  if (/\bwallet\b/.test(m)) {
    return { reply: "Opening your wallet.", actions: [{ type: "navigate", path: "/wallet", label: "Open Wallet" }] };
  }

  if (/\bhome\b/.test(m)) {
    return { reply: "Taking you home.", actions: [{ type: "navigate", path: "/", label: "Home" }] };
  }

  return {
    reply: "I can help with things like: add credits, show my orders, take me to reels, upload a video/short/podcast, open profile, wallet, messages, search, or creator dashboard. What would you like to do?",
    actions: [],
  };
}

export async function POST(req: Request) {
  let message = "";
  let authed = false;
  try {
    const body = await req.json().catch(() => ({}));
    message = String(body?.message || "").trim().slice(0, 1000);
    if (!message) return NextResponse.json({ error: "Missing message" }, { status: 400 });

    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      authed = !!user;
    } catch {
      authed = false;
    }

    // If no OpenAI key, use heuristic routing so core actions work immediately.
    if (!process.env.OPENAI_API_KEY) {
      const out = heuristicActions(message);
      return NextResponse.json({ reply: out.reply, actions: out.actions, mode: "heuristic", authed });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const system = `You are Trooflix's in-app assistant. Help users accomplish tasks in the Trooflix app.
You can perform actions by returning JSON with keys: reply (string) and actions (array).
Allowed actions:
- {"type":"navigate","path":"/path","label":"..."}
- {"type":"open_topup"}
- {"type":"open_orders","tab":"bought"|"sold"}
- {"type":"open_upload","mediaType":"video"|"short"|"podcast"|"documentary"|"tweet"}
- {"type":"open_search","query":"..."}
- {"type":"open_profile"}
Known routes: / (home), /feed (reels/shorts), /search, /orders, /wallet (credits/troocoins/top up via /wallet?topup=true), /messages, /creator-dashboard, /creator-dashboard/upload, /creator-dashboard/manage-content, /profile/[username] is public profile but current user's profile shortcut is /creator-dashboard?studioTab=profile or open_profile action.
Interpret user requests like "add credits", "buy coins", "take me to reels", "show my orders", "upload a video/short/podcast/documentary", "open wallet/messages/profile/dashboard", "search for ...".
Be concise. Always include at least one helpful action when the request maps to a feature. If ambiguous, ask a short clarifying question in reply and include likely actions.
Return ONLY valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_ASSISTANT_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: message },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }
    const reply = typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply : "Done.";
    const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
    if (!actions.length) {
      const fallback = heuristicActions(message);
      return NextResponse.json({ reply, actions: fallback.actions, mode: "llm", authed });
    }
    return NextResponse.json({ reply, actions, mode: "llm", authed });
  } catch (error: any) {
    console.error("/api/assistant error", error);
    const fallback = heuristicActions(message);
    return NextResponse.json({
      reply: fallback.reply || "I couldn't process that right now. Try asking to add credits, show orders, open reels, or upload a video.",
      actions: fallback.actions || [],
      mode: "heuristic_fallback",
      authed,
    });
  }
}
