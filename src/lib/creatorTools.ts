import { kv } from "@vercel/kv";
import { createClient as createServerClient } from "@supabase/supabase-js";

export const CREATOR_TOOLS_COIN_UNLOCK_USD = 0; // any coin purchase unlocks

const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function hasCreatorToolsUnlocked(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const kvUnlocked = (await kv.get<string>(`trooflix:creator-tools-unlocked:${userId}`)) === "1";
    if (kvUnlocked) return true;
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("verification_tick, is_verified")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) return false;
    if (data.verification_tick === "plus_red" || data.verification_tick === "creator_gold" || data.is_verified === true) {
      try { await kv.set(`trooflix:creator-tools-unlocked:${userId}`, "1"); } catch {}
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function unlockCreatorTools(userId: string): Promise<void> {
  if (!userId) return;
  await kv.set(`trooflix:creator-tools-unlocked:${userId}`, "1");
}
