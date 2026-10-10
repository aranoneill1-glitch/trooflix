"use client";

const KEY = "trooflix:progress";

export type ProgressEntry = {
  id: number;
  seconds: number;
  duration: number;
  updatedAt: number;
};

function readAll(): Record<number, ProgressEntry> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function writeAll(data: Record<number, ProgressEntry>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("progress-changed"));
}

export function saveProgress(id: number, seconds: number, duration: number) {
  if (!id || !duration || seconds < 5) return;
  const all = readAll();
  const pct = seconds / duration;
  // Don't track if nearly finished
  if (pct > 0.95) {
    delete all[id];
  } else {
    all[id] = { id, seconds, duration, updatedAt: Date.now() };
  }
  writeAll(all);
}

export function getProgress(id: number): ProgressEntry | null {
  const all = readAll();
  return all[id] || null;
}

export function getAllProgress(): ProgressEntry[] {
  return Object.values(readAll()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function clearProgress(id: number) {
  const all = readAll();
  delete all[id];
  writeAll(all);
}
