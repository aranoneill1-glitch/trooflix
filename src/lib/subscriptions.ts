import { createClient } from "@supabase/supabase-js";

// Use the Admin client so these checks work securely on the server
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export type UserTier = "free" | "plus" | "creator";
export type VerificationTick = "none" | "plus_red" | "creator_gold";

/**
 * Returns the user's effective tier.
 * If a Plus/Creator subscription expired and the 14-day grace period is over,
 * they are downgraded to 'free'.
 */
export async function getUserTier(userId: string): Promise<UserTier> {
  if (!userId) return "free";

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("tier, plus_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile || !profile.tier) return "free";

  // If they have a tier but it's expired past the grace period, force them to free
  if ((profile.tier === "plus" || profile.tier === "creator") && profile.plus_expires_at) {
    const expiryDate = new Date(profile.plus_expires_at);
    if (expiryDate < new Date()) {
      return "free";
    }
  }

  return (profile.tier as UserTier) || "free";
}

/**
 * Returns the correct verification tick based on tier.
 */
export async function getVerificationTick(userId: string): Promise<VerificationTick> {
  const tier = await getUserTier(userId);
  if (tier === "creator") return "creator_gold";
  if (tier === "plus") return "plus_red";
  return "none";
}

/**
 * Checks if a user can watch a specific creator's Premium content.
 * 1. Creators can always watch their OWN content.
 * 2. Anyone else must have an active individual creator subscription.
 */
export async function canWatchPremium(userId: string, creatorId: number): Promise<boolean> {
  if (!userId) return false;

  // Check if the viewer is the creator of this content
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("creator_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (profile?.creator_id === creatorId) return true;

  // Check if they have an active subscription to this specific creator
  const { data: sub } = await supabaseAdmin
    .from("creator_subscriptions")
    .select("status")
    .eq("subscriber_user_id", userId)
    .eq("creator_id", creatorId)
    .eq("status", "active")
    .maybeSingle();

  return !!sub;
}

/**
 * Boolean checks for UI/Server logic
 */
export function canUploadLongForm(tier: UserTier): boolean {
  return tier === "creator";
}

export function canPostTweets(tier: UserTier): boolean {
  return tier === "creator";
}

export function canGoLive(tier: UserTier): boolean {
  return tier === "creator";
}

export function canUploadMerch(tier: UserTier): boolean {
  return tier === "plus" || tier === "creator";
}

export function getMaxReelLength(tier: UserTier): number {
  // Free users max 3 minutes (180 seconds), Plus/Creator unlimited (0 = unlimited)
  return tier === "free" ? 180 : 0;
}
