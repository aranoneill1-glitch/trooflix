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
  | { type: "ui"; action: string; label?: string }
  | { type: "message"; text: string };

function normalize(s: string) {
  return (s || "").toLowerCase().trim();
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

type Cmd = { id: string; patterns: RegExp[]; reply: string | string[]; actions: AssistantAction[] };

const COMMANDS: Cmd[] = [
  { id: "home", patterns: [/\bhome\b/, /\bgo home\b/, /\bmain page\b/], reply: ["Heading home.", "Taking you back to Home."], actions: [{ type: "navigate", path: "/", label: "Home" }] },
  { id: "feed", patterns: [/\breels?\b/, /\bshorts?\b/, /\bfeed\b/, /\bswipe\b/], reply: ["Opening Reels/Shorts.", "Taking you to Reels."], actions: [{ type: "navigate", path: "/feed", label: "Open Reels" }] },
  { id: "search", patterns: [/\bsearch\b/, /\bfind\b/, /\blook for\b/, /\bdiscover\b/, /\bexplore\b/], reply: ["Opening search.", "Let’s find something."], actions: [{ type: "navigate", path: "/search", label: "Open Search" }] },
  { id: "wallet", patterns: [/\bwallet\b/, /\bbalance\b/], reply: ["Opening your wallet.", "Taking you to your wallet."], actions: [{ type: "navigate", path: "/wallet", label: "Open Wallet" }] },

  // Credits / wallet actions (specific first)
  { id: "add_credits", patterns: [/\badd credits?\b/, /(add|buy|get|top ?up|load).*(credit|coin|troocoin)/, /\btop ?up\b/, /\bcredits?\b/, /\bcoins?\b/], reply: ["Opening Add Credits.", "Taking you to add credits."], actions: [{ type: "open_topup" }, { type: "navigate", path: "/wallet?topup=true", label: "Add Credits" }] },
  { id: "withdraw_credits", patterns: [/\bwithdraw credits?\b/, /\bwithdraw\b/, /\bcash ?out\b/, /\bpayout\b/], reply: ["Opening wallet for withdrawals.", "Taking you to withdraw credits."], actions: [{ type: "navigate", path: "/wallet", label: "Withdraw Credits" }] },
  { id: "send_credits", patterns: [/\bsend credits?\b/, /\btransfer credits?\b/, /\bsend coins?\b/, /\btip credits?\b/], reply: ["Opening wallet to send credits.", "Taking you to send credits."], actions: [{ type: "navigate", path: "/wallet", label: "Send Credits" }] },

  // Orders (specific before generic)
  { id: "manage_orders", patterns: [/\bmanage orders?\b/, /\bcreator orders?\b/, /\bseller orders?\b/, /\bshop orders?\b/], reply: ["Opening Manage Orders.", "Taking you to manage orders."], actions: [{ type: "navigate", path: "/creator-dashboard/orders", label: "Manage Orders" }] },
  { id: "orders_sold", patterns: [/\bsold orders?\b/, /\bsales\b/, /\bsold\b/], reply: ["Opening sold orders.", "Taking you to sold orders."], actions: [{ type: "open_orders", tab: "sold" }, { type: "navigate", path: "/orders?tab=sold", label: "Sold Orders" }] },
  { id: "orders", patterns: [/\borders?\b/, /\bpurchases?\b/, /\bbought\b/, /\btrack(ing)?\b/], reply: ["Opening your orders.", "Taking you to orders."], actions: [{ type: "open_orders", tab: "bought" }, { type: "navigate", path: "/orders", label: "Orders" }] },

  // Messaging
  { id: "send_message", patterns: [/\bsend message\b/, /\bsend a message\b/, /\bnew message\b/, /\bcompose message\b/], reply: ["Opening messages to send a message.", "Taking you to send a message."], actions: [{ type: "navigate", path: "/messages", label: "Send Message" }] },
  { id: "messages", patterns: [/\bmessages?\b/, /\binbox\b/, /\bdms?\b/, /\bchat\b/], reply: ["Opening messages.", "Taking you to your inbox."], actions: [{ type: "navigate", path: "/messages", label: "Messages" }] },
  { id: "notifications", patterns: [/\bnotifications?\b/, /\bbell\b/, /\balerts?\b/], reply: ["Opening notifications.", "Checking your notifications."], actions: [{ type: "navigate", path: "/notifications", label: "Notifications" }] },

  // Profile / account / subscription
  { id: "change_profile_picture", patterns: [/\bchange profile picture\b/, /\bchange avatar\b/, /\bupdate profile picture\b/, /\bupdate avatar\b/, /\bprofile picture\b/, /\bavatar\b/], reply: ["Opening profile so you can change your profile picture.", "Taking you to change your profile picture."], actions: [{ type: "open_profile" }, { type: "navigate", path: "/creator-dashboard?studioTab=profile", label: "Change Profile Picture" }] },
  { id: "edit_profile", patterns: [/\bedit profile\b/, /\bupdate profile\b/], reply: ["Opening profile editor.", "Taking you to edit your profile."], actions: [{ type: "open_profile" }, { type: "navigate", path: "/creator-dashboard?studioTab=profile", label: "Edit Profile" }] },
  { id: "profile", patterns: [/\bmy profile\b/, /\bprofile\b/], reply: ["Opening your profile.", "Taking you to your profile."], actions: [{ type: "open_profile" }, { type: "navigate", path: "/creator-dashboard?studioTab=profile", label: "My Profile" }] },
  { id: "manage_subscription", patterns: [/\bmanage subscription\b/, /\bmanage subscriptions\b/], reply: ["Opening account to manage your subscription.", "Taking you to manage your subscription."], actions: [{ type: "navigate", path: "/account", label: "Manage Subscription" }] },
  { id: "cancel_subscription", patterns: [/\bcancel subscription\b/, /\bunsubscribe\b/, /\bend subscription\b/], reply: ["Opening account to cancel your subscription.", "Taking you to cancel your subscription."], actions: [{ type: "navigate", path: "/account", label: "Cancel Subscription" }] },
  { id: "change_password", patterns: [/\bchange password\b/, /\bupdate password\b/, /\bnew password\b/, /\breset password\b/, /\bforgot password\b/], reply: ["Opening password reset/change.", "Taking you to change your password."], actions: [{ type: "navigate", path: "/forgot-password", label: "Change Password" }] },
  { id: "account", patterns: [/\baccount\b/, /\baccount settings\b/], reply: ["Opening account settings.", "Taking you to your account."], actions: [{ type: "navigate", path: "/account", label: "Account" }] },

  { id: "my_list", patterns: [/\bmy list\b/, /\bwatchlist\b/, /\bsaved\b/, /\bfavorites?\b/], reply: ["Opening My List.", "Taking you to your saved list."], actions: [{ type: "navigate", path: "/my-list", label: "My List" }] },
  { id: "creators", patterns: [/\bcreators?\b/, /\bfind creators?\b/, /\bbrowse creators?\b/], reply: ["Opening creators.", "Taking you to creators."], actions: [{ type: "navigate", path: "/creators", label: "Creators" }] },
  { id: "tv", patterns: [/\btv\b/, /\blive tv\b/], reply: ["Opening TV.", "Taking you to TV."], actions: [{ type: "navigate", path: "/tv", label: "TV" }] },
  { id: "books", patterns: [/\bbooks?\b/], reply: ["Opening Books.", "Taking you to Books."], actions: [{ type: "navigate", path: "/books", label: "Books" }] },
  { id: "movies", patterns: [/\bmovies?\b/], reply: ["Opening Movies.", "Taking you to Movies."], actions: [{ type: "navigate", path: "/movies", label: "Movies" }] },
  { id: "upgrade", patterns: [/\bupgrade\b/, /\bplus\b/, /\btrooflix plus\b/, /\bpremium\b/, /\bsubscribe\b/], reply: ["Opening upgrade options.", "Taking you to Trooflix Plus/upgrade."], actions: [{ type: "navigate", path: "/upgrade", label: "Upgrade" }] },
  { id: "apply", patterns: [/\bapply\b/, /\bbecome a creator\b/, /\bcreator application\b/], reply: ["Opening creator application.", "Taking you to apply."], actions: [{ type: "navigate", path: "/apply", label: "Apply" }] },
  { id: "features", patterns: [/\bfeatures\b/, /\bwhat is trooflix\b/], reply: ["Opening features.", "Showing Trooflix features."], actions: [{ type: "navigate", path: "/features", label: "Features" }] },
  { id: "why", patterns: [/\bwhy trooflix\b/, /\bwhy us\b/], reply: ["Opening Why Trooflix.", "Taking you there."], actions: [{ type: "navigate", path: "/why-trooflix", label: "Why Trooflix" }] },
  { id: "terms", patterns: [/\bterms\b/, /\bprivacy\b/, /\bpolicy\b/], reply: ["Opening Terms.", "Taking you to terms."], actions: [{ type: "navigate", path: "/terms", label: "Terms" }] },
  { id: "login", patterns: [/\blog ?in\b/, /\bsign ?in\b/], reply: ["Opening login.", "Taking you to sign in."], actions: [{ type: "navigate", path: "/login", label: "Log in" }] },
  { id: "signup", patterns: [/\bsign ?up\b/, /\bregister\b/, /\bcreate account\b/], reply: ["Opening sign up.", "Taking you to create an account."], actions: [{ type: "navigate", path: "/signup", label: "Sign up" }] },

  // Creator dashboard / studio (requested keywords mapped explicitly)
  { id: "dashboard", patterns: [/\bcreator dashboard\b/, /\bcreator studio\b/, /\bdashboard\b/, /\bstudio\b/], reply: ["Opening Creator Dashboard.", "Taking you to Creator Studio."], actions: [{ type: "navigate", path: "/creator-dashboard", label: "Creator Dashboard" }] },
  { id: "upload_short", patterns: [/\bupload short\b/, /\bpost short\b/, /\bnew short\b/, /\bcreate short\b/, /\bupload reel\b/], reply: ["Opening Upload Short.", "Taking you to upload a short."], actions: [{ type: "open_upload", mediaType: "short" }, { type: "navigate", path: "/creator-dashboard/upload?type=short", label: "Upload Short" }] },
  { id: "upload_podcast", patterns: [/\bupload podcast\b/, /\bpost podcast\b/, /\bnew podcast\b/, /\bcreate podcast\b/], reply: ["Opening Upload Podcast.", "Taking you to upload a podcast."], actions: [{ type: "open_upload", mediaType: "podcast" }, { type: "navigate", path: "/creator-dashboard/upload?type=podcast", label: "Upload Podcast" }] },
  { id: "upload_video", patterns: [/\bupload video\b/, /\bpost video\b/, /\bnew video\b/, /\bcreate video\b/], reply: ["Opening Upload Video.", "Taking you to upload a video."], actions: [{ type: "open_upload", mediaType: "video" }, { type: "navigate", path: "/creator-dashboard/upload", label: "Upload Video" }] },
  { id: "upload", patterns: [/\bupload\b/], reply: ["Opening upload.", "Taking you to upload."], actions: [{ type: "open_upload", mediaType: "video" }, { type: "navigate", path: "/creator-dashboard/upload", label: "Upload" }] },
  { id: "go_live", patterns: [/\bgo live\b/, /\bstart live\b/, /\blive\b/, /\blive stream\b/, /\bstart stream\b/], reply: ["Opening Go Live.", "Taking you to go live."], actions: [{ type: "navigate", path: "/creator-dashboard/live", label: "Go Live" }] },
  { id: "add_item", patterns: [/\badd item\b/, /\bnew item\b/, /\badd product\b/, /\bnew product\b/], reply: ["Opening shop to add an item.", "Taking you to add an item."], actions: [{ type: "navigate", path: "/creator-dashboard/shop", label: "Add Item" }] },
  { id: "import_video", patterns: [/\bimport video\b/, /\bimport videos\b/, /\bimport\b/], reply: ["Opening Import Video.", "Taking you to import video."], actions: [{ type: "navigate", path: "/creator-dashboard/import", label: "Import Video" }] },
  { id: "edit_video", patterns: [/\bedit video\b/, /\bedit videos\b/], reply: ["Opening Manage Videos to edit videos.", "Taking you to edit videos."], actions: [{ type: "navigate", path: "/creator-dashboard/manage-content", label: "Edit Video" }] },
  { id: "manage_videos", patterns: [/\bmanage videos\b/, /\bmanage video\b/, /\bmanage content\b/, /\bmy videos\b/, /\bmy uploads\b/], reply: ["Opening Manage Videos.", "Taking you to manage videos."], actions: [{ type: "navigate", path: "/creator-dashboard/manage-content", label: "Manage Videos" }] },
  { id: "manage_shop", patterns: [/\bmanage shop\b/, /\bmy shop\b/, /\bcreator shop\b/, /\bshop settings\b/], reply: ["Opening Manage Shop.", "Taking you to manage your shop."], actions: [{ type: "navigate", path: "/creator-dashboard/shop", label: "Manage Shop" }] },
  { id: "merch", patterns: [/\bmerch(andise)?\b/, /\bshop\b/, /\bstore\b/, /\bcreators market\b/, /\bmarket\b/], reply: ["Opening the shop/merchandise.", "Taking you to merchandise."], actions: [{ type: "navigate", path: "/merchandise", label: "Merchandise" }] },
  { id: "customize_shop", patterns: [/\bcustomize shop\b/, /\bshop customize\b/], reply: ["Opening shop customization.", "Taking you to customize your shop."], actions: [{ type: "navigate", path: "/creator-dashboard/shop/customize", label: "Customize Shop" }] },
  { id: "change_theme", patterns: [/\bchange theme\b/, /\btheme\b/, /\bcustomize theme\b/, /\bstudio theme\b/], reply: ["Opening Change Theme.", "Taking you to change your theme."], actions: [{ type: "navigate", path: "/creator-dashboard/theme", label: "Change Theme" }] },
  { id: "subscriptions", patterns: [/\bsubscriptions?\b/, /\bsubscribers?\b/], reply: ["Opening Subscriptions.", "Taking you to subscriptions."], actions: [{ type: "navigate", path: "/creator-dashboard/subscriptions", label: "Subscriptions" }] },
  { id: "security_billing", patterns: [/\bsecurity\b/, /\bbilling\b/, /\bsecurity and billing\b/], reply: ["Opening security & billing.", "Taking you to security and billing."], actions: [{ type: "navigate", path: "/creator-dashboard/security-billing", label: "Security & Billing" }] },
  { id: "creator_settings", patterns: [/\bcreator settings\b/, /\bstudio settings\b/, /\bdashboard settings\b/], reply: ["Opening creator settings.", "Taking you to creator settings."], actions: [{ type: "navigate", path: "/creator-dashboard/settings", label: "Creator Settings" }] },
];

function heuristicActions(message: string): { reply: string; actions: AssistantAction[] } {
  const m = normalize(message);

  // UI / contextual actions (app master)
  if (/\b(open|show)\b.*\b(create|add content|add)\b.*\bmenu\b|\bcreate menu\b|\badd content\b/.test(m)) {
    return { reply: "Opening the create menu.", actions: [{ type: "ui", action: "open_create_menu", label: "Open Create Menu" }] };
  }
  if (/\brefresh\b|\breload\b/.test(m)) {
    return { reply: "Refreshing the app.", actions: [{ type: "ui", action: "refresh", label: "Refresh" }] };
  }
  if (/\bgo back\b|\bback\b/.test(m) && !/\bplayback\b/.test(m)) {
    return { reply: "Going back.", actions: [{ type: "ui", action: "go_back", label: "Go Back" }] };
  }
  if (/\bscroll (to )?top\b|\btop of page\b/.test(m)) {
    return { reply: "Scrolling to the top.", actions: [{ type: "ui", action: "scroll_top", label: "Scroll to Top" }] };
  }
  if (/\b(open|show)\b.*\bcomments?\b|\bcomments?\b.*\b(open|show)\b/.test(m)) {
    return { reply: "Opening comments for the current video (if available).", actions: [{ type: "ui", action: "open_comments", label: "Open Comments" }] };
  }
  if (/\b(like|heart)\b.*\b(this|video|reel|short)\b|\blike this\b/.test(m)) {
    return { reply: "Liking the current video/reel (if available).", actions: [{ type: "ui", action: "like_reel", label: "Like Current Video" }] };
  }
  if (/\b(tip|send tip|support)\b.*\b(creator|this|video|reel)\b|\btip creator\b/.test(m)) {
    return { reply: "Opening tip for the current creator/video (if available).", actions: [{ type: "ui", action: "open_tip", label: "Send Tip" }] };
  }
  if (/\bshare\b.*\b(this|video|reel|short)\b|\bshare this\b/.test(m)) {
    return { reply: "Sharing the current video/reel (if available).", actions: [{ type: "ui", action: "share_reel", label: "Share" }] };
  }
  if (/\bnext (reel|short|video)\b|\bscroll down\b|\bswipe down\b/.test(m)) {
    return { reply: "Moving to the next reel/video.", actions: [{ type: "ui", action: "next_reel", label: "Next Reel" }] };
  }
  if (/\b(previous|prev) (reel|short|video)\b|\bscroll up\b|\bswipe up\b/.test(m)) {
    return { reply: "Moving to the previous reel/video.", actions: [{ type: "ui", action: "prev_reel", label: "Previous Reel" }] };
  }
  if (/\b(mute|unmute|toggle mute|sound)\b/.test(m)) {
    return { reply: "Toggling sound/mute (if available).", actions: [{ type: "ui", action: "toggle_mute", label: "Toggle Mute" }] };
  }
  if (/\b(close|hide)\b.*\bassistant\b/.test(m)) {
    return { reply: "Closing assistant.", actions: [{ type: "ui", action: "close_assistant", label: "Close Assistant" }] };
  }

  // Search with query extraction
  if (/\b(search|find|look for|discover)\b/.test(m)) {
    const q = message.replace(/^(please\s+)?(can you\s+)?(search|find|look for|discover)\s*(for)?\s*/i, "").trim();
    if (q) {
      const path = `/search?q=${encodeURIComponent(q)}`;
      return { reply: pick([`Searching for “${q}”.`, `Let’s find “${q}”.`]), actions: [{ type: "open_search", query: q }, { type: "navigate", path, label: `Search: ${q}` }] };
    }
  }

  // Prefer more specific matches first
  const sorted = [...COMMANDS].sort((a, b) => b.id.length - a.id.length);
  for (const cmd of sorted) {
    if (cmd.patterns.some((p) => p.test(m))) {
      return { reply: Array.isArray(cmd.reply) ? pick(cmd.reply) : cmd.reply, actions: cmd.actions };
    }
  }

  return {
    reply: pick([
      "I can do a lot in Trooflix. Try keywords like: upload video, upload podcast, upload short, go live, add item, edit profile, change theme, manage videos, edit video, import video, manage shop, orders, manage orders, subscriptions, manage subscription, change password, cancel subscription, add credits, withdraw credits, send credits, send message, change profile picture.",
      "Tell me what you want and I’ll link you there. Keywords I understand: upload video/podcast/short, go live, add item, edit profile, change theme, manage videos, edit video, import video, manage shop, orders, manage orders, subscriptions, manage subscription, change password, cancel subscription, add credits, withdraw credits, send credits, send message, change profile picture.",
    ]),
    actions: [
      { type: "navigate", path: "/creator-dashboard/upload", label: "Upload Video" },
      { type: "navigate", path: "/creator-dashboard/live", label: "Go Live" },
      { type: "navigate", path: "/wallet?topup=true", label: "Add Credits" },
      { type: "navigate", path: "/messages", label: "Send Message" },
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
Be conversational, warm, and a bit imaginative while staying helpful and clear. You can suggest ideas but don't invent facts about the user's account/data.

Return ONLY valid JSON with keys: reply (string) and actions (array).
Allowed actions:
- {"type":"navigate","path":"/path","label":"..."}
- {"type":"open_topup"}
- {"type":"open_orders","tab":"bought"|"sold"}
- {"type":"open_upload","mediaType":"video"|"short"|"podcast"|"documentary"|"tweet"}
- {"type":"open_search","query":"..."}
- {"type":"open_profile"}
- {"type":"ui","action":"open_create_menu|close_assistant|refresh|go_back|scroll_top|open_comments|open_tip|like_reel|share_reel|next_reel|prev_reel|toggle_mute","label":"..."} (for on-screen/contextual controls; best effort depending on current page)

Map user requests to these app routes/buttons/features when relevant:
Home /, Reels/Shorts /feed, Search /search?q=..., Wallet /wallet, Top up /wallet?topup=true, Orders /orders and /orders?tab=sold, Messages /messages, Notifications /notifications, My Profile /creator-dashboard?studioTab=profile, Account /account, My List /my-list, Merchandise/Shop /merchandise, Creators /creators, TV /tv, Books /books, Movies /movies, Upgrade/Plus /upgrade, Apply /apply, Features /features, Why Trooflix /why-trooflix, Terms /terms, Login /login, Sign up /signup, Forgot password /forgot-password.
Creator Dashboard /creator-dashboard, Upload /creator-dashboard/upload (?type=short|podcast|documentary), Go Live /creator-dashboard/live, Manage Content /creator-dashboard/manage-content, Creator Orders /creator-dashboard/orders, Creator Shop /creator-dashboard/shop, Customize Shop /creator-dashboard/shop/customize, Import /creator-dashboard/import, Creator Settings /creator-dashboard/settings, Theme /creator-dashboard/theme, Subscriptions /creator-dashboard/subscriptions, Security & Billing /creator-dashboard/security-billing.

When a request maps to a feature/button, include at least one helpful action. If ambiguous, ask a short clarifying question and include likely actions. Keep replies concise but personable.`;

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
