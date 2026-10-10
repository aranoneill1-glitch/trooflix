"use client";

const KEY = "trooflix:mylist";

export function getMyList(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMyList(ids: number[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("mylist-changed"));
}

export function toggleMyList(id: number): boolean {
  const list = getMyList();
  const exists = list.includes(id);
  const next = exists ? list.filter((x) => x !== id) : [...list, id];
  saveMyList(next);
  return !exists;
}

export function isInMyList(id: number): boolean {
  return getMyList().includes(id);
}
