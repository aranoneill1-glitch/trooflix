const fs = require('fs');

// ==========================================
// 1. Create Server-Side Notifications API
// ==========================================
fs.mkdirSync('src/app/api/notifications', { recursive: true });
fs.writeFileSync('src/app/api/notifications/route.ts', `import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ notifications: [] });

    // 1. Fetch notifications
    const { data: notifications, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("id", { ascending: false });

    if (error) throw error;
    if (!notifications || notifications.length === 0) return NextResponse.json({ notifications: [] });

    // 2. Fetch actor profiles
    const actorIds = [...new Set(notifications.map(n => n.actor_id).filter(Boolean))];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, display_name, username, avatar_url")
      .in("user_id", actorIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    // 3. Merge
    const enriched = notifications.map(n => {
      const actor = profileMap.get(n.actor_id);
      return {
        ...n,
        sender_avatar: actor?.avatar_url || null,
        actor_name: actor?.display_name || actor?.username || "Someone",
        title: n.title || (n.type === "like" ? "New like" : n.type === "comment" ? "New comment" : n.type === "follow" ? "New follower" : "Notification"),
        message: n.message || (n.type === "like" ? "Someone liked your post" : n.type === "comment" ? "Someone commented on your post" : n.type === "follow" ? "Someone started following you" : ""),
      };
    });

    return NextResponse.json({ notifications: enriched });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
`);
console.log('OK: /api/notifications created.');

// ==========================================
// 2. Fix NotificationBell.tsx to use the API
// ==========================================
const bellPath = 'src/components/NotificationBell.tsx';
let s = fs.readFileSync(bellPath, 'utf8');

// Replace the client-side Supabase fetch with a fetch to our new API
const fetchRegex = /const \{ data, error: fetchError \} = await supabase[\s\S]*?\.order\("id", \{ ascending: false \}\);\s*if \(fetchError\) console\.error\("[NotificationBell\] Fetch error:", fetchError\);/;

const newFetch = `const res = await fetch(\`/api/notifications?userId=\${user.id}\`);
      const json = await res.json();
      const data = json.notifications || [];`;

if (s.match(fetchRegex)) {
  s = s.replace(fetchRegex, newFetch);
  console.log('OK: NotificationBell now uses server API.');
} else {
  // Fallback: Find whatever the current fetch looks like and replace it
  const altRegex = /const \{ data, error: fetchError \} = await supabase[\s\S]*?\}\);/;
  const altRegex2 = /const \{ data \} = await supabase[\s\S]*?\}\);/;
  if (s.match(altRegex)) {
    s = s.replace(altRegex, newFetch);
    console.log('OK: NotificationBell updated (fallback 1).');
  } else if (s.match(altRegex2)) {
    s = s.replace(altRegex2, newFetch);
    console.log('OK: NotificationBell updated (fallback 2).');
  } else {
    console.error('WARN: Could not find the fetch block.');
  }
}

// Clean up the now-unused profile fetching logic from the client side
const profileFetchRegex = /const actorIds = \[[\s\S]*?\}\s*\}/;
if (s.match(profileFetchRegex)) {
  s = s.replace(profileFetchRegex, '');
  console.log('OK: Removed old client-side profile fetching.');
}

fs.writeFileSync(bellPath, s);

// ==========================================
// 3. Fix the 405 error on /api/views
// ==========================================
const viewsPath = 'src/app/api/views/route.ts';
if (fs.existsSync(viewsPath)) {
  let v = fs.readFileSync(viewsPath, 'utf8');
  if (!v.includes('export async function GET')) {
    v += `\nexport async function GET() {\n  return NextResponse.json({ ok: true });\n}\n`;
    fs.writeFileSync(viewsPath, v);
    console.log('OK: Added GET handler to /api/views to fix 405.');
  }
}
