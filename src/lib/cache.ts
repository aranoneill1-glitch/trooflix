"use client";

/**
 * Trooflix shared cache — module-level caches that persist across page
 * navigations, so we don't re-fetch the same data on every mount.
 *
 * Pattern: same as LikeButton uses for likes. Global state + listeners
 * + inflight dedupe.
 */

import { createClient } from "@/utils/supabase/client";

// ---------------------------------------------------------------------------
// Auth cache
// ---------------------------------------------------------------------------

type AuthUser = {
  id: string;
  email: string;
} | null;

let cachedUser: AuthUser | undefined = undefined; // undefined = not fetched yet
let userInflight: Promise<AuthUser> | null = null;
const userListeners = new Set<(user: AuthUser) => void>();


async function fetchUser(): Promise<AuthUser> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    return { id: data.user.id, email: data.user.email || "" };
  } catch {
    return null;
  }
}

/** Returns the current user (cached). First call hits Supabase, rest are free. */
export async function getCachedUser(): Promise<AuthUser> {
  if (cachedUser !== undefined) return cachedUser;
  if (userInflight) return userInflight;

  userInflight = (async () => {
    const u = await fetchUser();
    cachedUser = u;
    userInflight = null;
    userListeners.forEach((fn) => fn(u));
    return u;
  })();

  return userInflight;
}

/** Force the next getCachedUser() to re-fetch (call on sign in/out). */
export function clearUserCache() {
  cachedUser = undefined;
  userInflight = null;
}

/** Subscribe to auth changes. */
export function onUserChange(fn: (user: AuthUser) => void) {
  userListeners.add(fn);
  return () => userListeners.delete(fn);
}

// ---------------------------------------------------------------------------
// Videos cache
// ---------------------------------------------------------------------------

type Video = any; // whatever the shape is
let cachedVideos: Video[] | null = null;
let videosInflight: Promise<Video[]> | null = null;
const videosListeners = new Set<(v: Video[]) => void>();
let videosFetchedAt = 0;
const VIDEOS_TTL_MS = 60_000; // 60s

async function fetchVideos(): Promise<Video[]> {
  try {
    const r = await fetch("/api/videos", { cache: "no-store" });
    const d = await r.json();
    return Array.isArray(d) ? d : [];
  } catch {
    return [];
  }
}

export async function getCachedVideos(opts: { force?: boolean } = {}): Promise<Video[]> {
  const fresh = Date.now() - videosFetchedAt < VIDEOS_TTL_MS;
  if (cachedVideos && fresh && !opts.force) return cachedVideos;
  if (videosInflight) return videosInflight;

  videosInflight = (async () => {
    const v = await fetchVideos();
    cachedVideos = v;
    videosFetchedAt = Date.now();
    videosInflight = null;
    videosListeners.forEach((fn) => fn(v));
    return v;
  })();

  return videosInflight;
}

export function invalidateVideosCache() {
  cachedVideos = null;
  videosFetchedAt = 0;
}

export function onVideosChange(fn: (v: Video[]) => void) {
  videosListeners.add(fn);
  return () => videosListeners.delete(fn);
}

// ---------------------------------------------------------------------------
// Creators cache
// ---------------------------------------------------------------------------

let cachedCreators: any[] | null = null;
let creatorsInflight: Promise<any[]> | null = null;
const creatorsListeners = new Set<(c: any[]) => void>();
let creatorsFetchedAt = 0;
const CREATORS_TTL_MS = 60_000;

async function fetchCreators(): Promise<any[]> {
  try {
    const r = await fetch("/api/creators", { cache: "no-store" });
    const d = await r.json();
    return Array.isArray(d) ? d : [];
  } catch {
    return [];
  }
}

export async function getCachedCreators(opts: { force?: boolean } = {}): Promise<any[]> {
  const fresh = Date.now() - creatorsFetchedAt < CREATORS_TTL_MS;
  if (cachedCreators && fresh && !opts.force) return cachedCreators;
  if (creatorsInflight) return creatorsInflight;

  creatorsInflight = (async () => {
    const c = await fetchCreators();
    cachedCreators = c;
    creatorsFetchedAt = Date.now();
    creatorsInflight = null;
    creatorsListeners.forEach((fn) => fn(c));
    return c;
  })();

  return creatorsInflight;
}

export function invalidateCreatorsCache() {
  cachedCreators = null;
  creatorsFetchedAt = 0;
}

export function onCreatorsChange(fn: (c: any[]) => void) {
  creatorsListeners.add(fn);
  return () => creatorsListeners.delete(fn);
}

// ---------------------------------------------------------------------------
// Profile cache (per user_id)
// ---------------------------------------------------------------------------

const cachedProfiles = new Map<string, any>();
const profilesInflight = new Map<string, Promise<any>>();
const profilesListeners = new Set<(userId: string, profile: any) => void>();

async function fetchProfile(userId: string): Promise<any> {
  try {
    const r = await fetch(`/api/profile?user_id=${userId}`, { cache: "no-store" });
    const d = await r.json();
    return d.profile || null;
  } catch {
    return null;
  }
}

export async function getCachedProfile(userId: string): Promise<any> {
  if (cachedProfiles.has(userId)) return cachedProfiles.get(userId);
  if (profilesInflight.has(userId)) return profilesInflight.get(userId)!;

  const p = (async () => {
    const prof = await fetchProfile(userId);
    cachedProfiles.set(userId, prof);
    profilesInflight.delete(userId);
    profilesListeners.forEach((fn) => fn(userId, prof));
    return prof;
  })();

  profilesInflight.set(userId, p);
  return p;
}

export function invalidateProfileCache(userId?: string) {
  if (userId) cachedProfiles.delete(userId);
  else cachedProfiles.clear();
}

export function onProfileChange(fn: (userId: string, profile: any) => void) {
  profilesListeners.add(fn);
  return () => profilesListeners.delete(fn);
}
