import { kv } from "@vercel/kv";

export const CREATOR_TOOLS_COIN_UNLOCK_USD = 5;

export async function hasCreatorToolsUnlocked(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    return (await kv.get<string>(`trooflix:creator-tools-unlocked:${userId}`)) === "1";
  } catch {
    return false;
  }
}

export async function unlockCreatorTools(userId: string): Promise<void> {
  if (!userId) return;
  await kv.set(`trooflix:creator-tools-unlocked:${userId}`, "1");
}
