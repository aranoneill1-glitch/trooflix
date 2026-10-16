/**
 * Trooflix video preloader — Instagram-style "adjacent preload".
 *
 * Maintains a small pool of hidden <video> elements that download the next
 * N videos in the background, so by the time the user swipes, the video is
 * already buffered and plays instantly.
 *
 * Strategy (matches Instagram Reels):
 *  - Preload 2 videos ahead of the current index
 *  - Preload 1 video behind (for back-scrolling)
 *  - Reuse elements — never leak
 *  - Release buffers for far-away videos
 */

const POOL_SIZE = 4;
const pool: HTMLVideoElement[] = [];
const loaded = new Map<number, HTMLVideoElement>();

function getPoolElement(index: number): HTMLVideoElement {
  if (!pool[index]) {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.style.display = "none";
    // Don't play, just download
    pool[index] = v;
  }
  return pool[index];
}

/**
 * Preload a single video URL. Silent no-op if already loaded.
 */
export function preloadVideo(videoId: number, url: string) {
  if (loaded.has(videoId)) return;

  // Find a free pool slot
  for (let i = 0; i < POOL_SIZE; i++) {
    const el = getPoolElement(i);
    // If this element isn't tied to a video yet, use it
    if (!el.dataset.videoId) {
      el.dataset.videoId = String(videoId);
      el.src = url;
      el.load();
      loaded.set(videoId, el);
      return;
    }
  }

  // Pool full — evict the oldest
  const [oldestId, oldestEl] = loaded.entries().next().value as [number, HTMLVideoElement];
  loaded.delete(oldestId);
  delete oldestEl.dataset.videoId;
  oldestEl.src = url;
  oldestEl.load();
  loaded.set(videoId, oldestEl);
}

/**
 * Release a preloaded video (called when it scrolls far out of range).
 */
export function releaseVideo(videoId: number) {
  const el = loaded.get(videoId);
  if (!el) return;
  el.pause();
  el.removeAttribute("src");
  el.load();
  delete el.dataset.videoId;
  loaded.delete(videoId);
}

/**
 * Preload a "window" of videos around the active index.
 * @param videos - full list of videos
 * @param activeIndex - current centered index
 * @param ahead - how many forward to preload (default 2)
 * @param behind - how many backward to preload (default 1)
 */
export function preloadWindow<T extends { id: number; videoUrl?: string; bitchuteUrl?: string }>(
  videos: T[],
  activeIndex: number,
  ahead = 2,
  behind = 1
) {
  // Preload ahead
  for (let i = 1; i <= ahead; i++) {
    const v = videos[activeIndex + i];
    if (v) preloadVideo(v.id, v.videoUrl ?? v.bitchuteUrl ?? "");
  }
  // Preload behind
  for (let i = 1; i <= behind; i++) {
    const v = videos[activeIndex - i];
    if (v) preloadVideo(v.id, v.videoUrl ?? v.bitchuteUrl ?? "");
  }
}
