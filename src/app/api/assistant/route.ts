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

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function heuristicActions(message: string): { reply: string; actions: AssistantAction[] } {
  const m = normalize(message);

  // Credits / wallet / top up
  if (/(add|buy|get|top ?up|load).*(credit|coin|troocoin)|\btop ?up\b|\bwallet\b|\bcredits?\b|\bcoins?\b/.test(m)) {
    return {
      reply: pick([
        "Let’s power up your wallet — opening top-up so you can add TrooCoins/credits.",
        "On it. Taking you to your wallet to add credits.",
        "Credits coming up — opening your wallet top-up now.",
      ]),
      actions: [{ type: "open_topup" }, { type: "navigate", path: "/wallet?topup=true", label: "Open Wallet (Top Up)" }],
    };
  }

  // Orders
  if (/\b(my )?orders?\b|\bpurchases?\b|\bbought\b|\bsold\b|\btrack(ing)?\b/.test(m)) {
    const tab = /\bsold\b/.test(m) ? "sold" : "bought";
    return {
      reply: tab === "sold"
        ? pick(["Let’s check what you’ve sold — opening your sold orders.", "Opening your sold orders now."])
        : pick(["Let’s track down your orders — opening them now.", "Opening your orders so you can see purchases and tracking."]),
      actions: [{ type: "open_orders", tab }, { type: "navigate", path: `/orders${tab === "sold" ? "?tab=sold" : ""}`, label: tab === "sold" ? "Sold Orders" : "My Orders" }],
    };
  }

  // Reels / shorts / feed
  if (/\breels?\b|\bshorts?\b|\bfeed\b|\bswipe\b/.test(m)) {
    return {
      reply: pick([
        "Time for a scroll — taking you to Reels.",
        "Let’s jump into Reels/Shorts.",
        "Opening the Reels feed for you.",
      ]),
      actions: [{ type: "navigate", path: "/feed", label: "Open Reels" }],
    };
  }

  // Upload
  if (/\bupload\b|\bpost\b.*(video|short|podcast|documentary|tweet)|\bcreate\b.*(video|short|podcast|documentary|post)/.test(m)) {
    let mediaType: "video" | "short" | "podcast" | "documentary" | "tweet" = "video";
    if (/\bshort\b|\breel\b/.test(m)) mediaType = "short";
    else if (/\bpodcast\b/.test(m)) mediaType = "podcast";
    else if (/\bdocumentary\b|\bdoco?\b/.test(m)) mediaType = "documentary";
    else if (/\btweet\b/.test(m)) mediaType = "tweet";
    const qs = mediaType === "video" ? "" : `?type=${encodeURIComponent(mediaType)}`;
    const label = mediaType === "video" ? "video" : mediaType;
    return {
      reply: pick([
        `Let’s create something great — opening ${label} upload.`,
        `Studio time. Taking you to upload your ${label}.`,
        `Opening the upload flow for your ${label}.`,
      ]),
      actions: [{ type: "open_upload", mediaType: mediaType as any }, { type: "navigate", path: `/creator-dashboard/upload${qs}`, label: `Upload ${label}` }],
    };
  }

  // Profile
  if (/\bmy profile\b|\bprofile\b|\baccount\b/.test(m)) {
    return {
      reply: pick(["Taking you to your profile.", "Opening your profile now."]),
      actions: [{ type: "open_profile" }, { type: "navigate", path: "/creator-dashboard?studioTab=profile", label: "My Profile" }],
    };
  }

  // Messages/chat
  if (/\bmessages?\b|\binbox\b|\bdms?\b|\bchat\b/.test(m)) {
    return {
      reply: pick(["Opening your messages.", "Let’s check your inbox — opening messages."]),
      actions: [{ type: "navigate", path: "/messages", label: "Open Messages" }],
    };
  }

  // Search
  if (/\bsearch\b|\bfind\b|\blook for\b|\bdiscover\b/.test(m)) {
    const q = message.replace(/^(please\s+)?(can you\s+)?(search|find|look for|discover)\s*(for)?\s*/i, "").trim();
    const path = q ? `/search?q=${encodeURIComponent(q)}` : "/search";
    return {
      reply: q
        ? pick([`Let’s hunt that down — searching for “${q}”.`, `On it. Searching for “${q}”.`])
        : pick(["Opening search — tell me what you’re in the mood for.", "Let’s discover something — opening search."]),
      actions: [{ type: "open_search", query: q || undefined }, { type: "navigate", path, label: q ? `Search: ${q}` : "Open Search" }],
    };
  }

  // Creator dashboard / manage content
  if (/\bmanage content\b|\bmy videos\b|\bdashboard\b|\bcreator studio\b|\bmanage\b/.test(m)) {
    return {
      reply: pick(["Opening Creator Dashboard so you can manage everything.", "Taking you to your Creator Dashboard."]),
      actions: [{ type: "navigate", path: "/creator-dashboard", label: "Open Creator Dashboard" }],
    };
  }

  if (/\bwallet\b/.test(m)) {
    return { reply: pick(["Opening your wallet.", "Taking you to your wallet."]), actions: [{ type: "navigate", path: "/wallet", label: "Open Wallet" }] };
  }

  if (/\bhome\b/.test(m)) {
    return { reply: pick(["Heading home.", "Taking you back to Home."]), actions: [{ type: "navigate", path: "/", label: "Home" }] };
  }

  // Friendly fallback with suggestions
  return {
    reply: pick([
      "I’ve got you. I can help you jump around Trooflix — try “add credits”, “show my orders”, “take me to reels”, “upload a short”, or “search for documentaries”. What do you want to do?",
      "Tell me what you’re trying to do and I’ll take you there. For example: add credits, open reels, check orders, upload a video, or find creators.",
      "I can act as your Trooflix guide: open wallet/credits, orders, reels, upload, messages, profile, dashboard, or search. What’s next?",
    ]),
    actions: [
      { type: "navigate", path: "/wallet?topup=true", label: "Add credits" },
      { type: "navigate", path: "/feed", label: "Open Reels" },
      { type: "navigate", path: "/orders", label: "My Orders" },
      { type: "navigate", path: "/creator-dashboard/upload", label: "Upload Video" },
    ],
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
    const system = `You are Trooflix AI, a friendly, smart in-app assistant with personality. Help users accomplish tasks in the Trooflix app.
Be conversational, warm, and a bit imaginative while staying helpful and clear. You can suggest ideas (what to watch, what to create, how to find things) but don't invent facts about the user's account/data.

You can perform actions by returning JSON with keys: reply (string) and actions (array).
Allowed actions:
- {"type":"navigate","path":"/path","label":"..."}
- {"type":"open_topup"}
- {"type":"open_orders","tab":"bought"|"sold"}
- {"type":"open_upload","mediaType":"video"|"short"|"podcast"|"documentary"|"tweet"}
- {"type":"open_search","query":"..."}
- {"type":"open_profile"}
Known routes: / (home), /feed (reels/shorts), /search, /orders, /wallet (credits/troocoins/top up via /wallet?topup=true), /messages, /creator-dashboard, /creator-dashboard/upload, /creator-dashboard/manage-content. Current user's profile shortcut: /creator-dashboard?studioTab=profile or open_profile action.
Interpret requests like "add credits", "buy coins", "take me to reels", "show my orders", "upload a video/short/podcast/documentary", "open wallet/messages/profile/dashboard", "search for ...".
When a request maps to a feature, include at least one helpful action. If ambiguous, ask a short clarifying question and include likely actions. Keep replies concise but personable.
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
