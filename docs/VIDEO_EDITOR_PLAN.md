# Trooflix Studio — Full Plan & Execution Brief

**Audience:** the engineer implementing the editor.
**Goal:** a free, local-first, PWA-installable, CapCut-class video editor in Trooflix — no paid SDKs, no server-side rendering, no per-edit API costs.
**Scope:** trim/split, multi-track timeline, text overlays, audio overlay, canvas-composited preview, one-click publish.
**Non-goal:** cloning CapCut's entire feature set in phase 1. Get the rendering pipeline and timeline data model correct first.

---

## 1. Executive summary

We are **not** building a web wrapper around ffmpeg. We are building a **timeline-driven rendering engine** whose single source of truth is a JSON project object. The same frame-drawing function renders both the live preview and the export. That one decision is what guarantees WYSIWYG and avoids the classic "preview looks right, export looks different" failure.

The stack:

| Layer | Technology | Role |
|---|---|---|
| UI | React 19 / Next.js 16 (existing) | Editor shell, panels, timeline |
| Preview + compositing | Canvas 2D | Draw every frame exactly as exported |
| Decode/encode | WebCodecs (`VideoDecoder` / `VideoEncoder`) | Hardware-accelerated frames |
| Audio | Web Audio + `OfflineAudioContext` | Mix original + overlay audio |
| MP4 packaging / conversions | `ffmpeg.wasm`, lazy-loaded | Mux only; load on demand |
| Media storage | IndexedDB | Video/audio blobs, offline |
| Project state | localStorage / IndexedDB | JSON timeline, offline |
| PWA | Service worker + manifest (already present) | Installable, offline shell |

Browser target: **Chromium first** (Chrome, Edge, Samsung Internet). WebCodecs is strongest there. Safari 16.4+ partially supports WebCodecs; keep a `MediaRecorder` fallback path for older iOS.

---

## 2. Current-state audit (this repository, as of this brief)

Do not assume a greenfield build. What already exists:

- **`src/components/InstagramStudio.tsx`** — the current editor. It already has:
  - Native device picker → straight into a 9:16 full-screen preview.
  - Full-screen preview, Audio + Text toolbar, swipe-up timeline.
  - Text overlays with 6 fonts, color, box toggle, drag, pinch resize/rotate, per-text timing.
  - Audio overlay from another video or audio file, volume + offset.
  - Video timeline with trim handles, split markers, a text timeline with draggable clips, an audio waveform track.
  - Export via `canvas.captureStream()` + `MediaRecorder`, with `AudioContext` mixing and text burned in via `drawText()`.
- **`src/app/creator-dashboard/upload/page.tsx`** — step-based upload flow; renders `InstagramStudio` with the picked `File`, receives `{ file, duration, posterBlob }`.
- **`src/app/api/subtitles/transcribe/route.ts`** — auto-captions currently call **OpenAI Whisper server-side** (`OPENAI_API_KEY`, 25MB limit). This is a paid, online path; section 6.8 replaces it with local AI.
- **PWA already partially present:** `public/manifest.json`, `public/manifest.webmanifest`, `public/manifest-admin.json`, `public/sw.js` (pass-through only, no real caching), registered in `src/app/layout.tsx`.
- **`next.config.ts` has no COOP/COEP headers** — required for `SharedArrayBuffer` / threaded `ffmpeg.wasm`.
- No `ffmpeg.wasm`, WebCodecs helper, or IndexedDB layer in `package.json` yet.

**Implication:** phases 1–5 below are largely a *refactor* of `InstagramStudio.tsx` into a clean engine, not a from-scratch UI rebuild. Keep the existing Instagram-parity UI; replace the engine underneath it.

---

## 3. Target architecture — hybrid rendering pipeline

```
EDITING (real time)
  JSON project (source of truth)
        → renderFrame(ctx, project, playheadTime)
        → <canvas> preview
        → hidden <video>/<audio> elements for audio monitoring

EXPORT (on "Publish")
  1. Build frame plan: timestamps at 1/fps for project.duration
  2. For each timestamp:
       a. renderFrame(offscreenCtx, project, t)     ← SAME function as preview
       b. new VideoFrame(canvas, { timestamp: t*1e6 })
       c. encoder.encode(frame)                     ← respect encodeQueueSize
       d. frame.close()                             ← mandatory
  3. Mix all audio with OfflineAudioContext → AudioBuffer
  4. Lazy-load ffmpeg.wasm → mux video + audio → MP4
  5. Return Blob → publish to R2 via existing upload path
```

**Hard rule:** preview and export call the *same* `renderFrame()`. Never implement export as a separate ffmpeg filter graph.

---

## 4. Data model — the timeline is the source of truth

Never derive clip times from DOM pixel widths. Store seconds. Pixels are a function of zoom.

```ts
interface Project {
  id: string;
  name: string;
  duration: number;                 // seconds
  fps: number;                      // 30
  resolution: { width: number; height: number };
  tracks: Track[];
}

interface Track {
  id: string;
  type: 'video' | 'audio' | 'text';
  clips: Clip[];
}

interface Clip {
  id: string;
  type: 'video' | 'audio' | 'text';
  timelineStart: number;            // when it appears in the output
  timelineEnd: number;              // when it disappears
  sourceStart: number;              // offset into source media
  sourceEnd: number;
  mediaId?: string;                 // IndexedDB key
  // text
  text?: string;
  font?: string;
  color?: string;
  hasBox?: boolean;
  boxColor?: string;
  // transform (video + text), normalized 0..1
  x: number;
  y: number;
  scale: number;
  rotation: number;
  // audio
  volume?: number;
}
```

Migration note: `InstagramStudio` currently holds `EditState { video, audioOverlay, textOverlays }`. Introduce the `Project` model behind the existing UI with an adapter; do not rewrite the UI in the same commit.

---

## 5. Storage

- **Media blobs → IndexedDB.** Key by `mediaId`; store `{ blob, duration, width, height, mime, name }`. Never put video blobs in localStorage.
- **Project JSON → localStorage** (small), mirrored to IndexedDB if projects grow.
- **Service worker:** cache the app shell (HTML/CSS/JS), bundled fonts, and `ffmpeg.wasm` core **after first export**. Never cache user media in the SW.

---

## 6. Module-by-module execution

### 6.1 Media ingestion
- `<input type="file" accept="video/*">` → `File`.
- Probe duration/dimensions with a detached `<video>`.
- Write blob to IndexedDB, create a `Project` with one video clip.
- Nothing is uploaded.

### 6.2 Canvas preview engine
- One `<canvas>` for preview, one detached `<video>` per active video clip.
- `renderFrame(ctx, project, t)`:
  1. Clear.
  2. For each active video clip (bottom→top): compute `sourceTime = clip.sourceStart + (t - clip.timelineStart)`, seek if needed, `ctx.drawImage(video, ...)` with x/y/scale/rotation.
  3. For each active text clip: `drawText(ctx, clip)`.
- Replace today's DOM text overlays with canvas-drawn ones **only after** `renderFrame` is shared. Keep the DOM hit-target layer for dragging, but draw the visible text in canvas.

### 6.3 Timeline / trim / split
- Thumbnail strip generated once per media (cache in memory/IndexedDB).
- Trim handles update `sourceStart` / `sourceEnd`.
- Split at playhead creates two clips with adjusted `timelineStart`, `sourceStart`, `sourceEnd`.
- **Non-destructive:** original blob untouched.
- Text track clips already draggable in the current UI; map their edits to `Clip.timelineStart/timelineEnd`.

### 6.4 Text overlays
- Bundle free fonts (Inter, Roboto, Playfair Display, Courier Prime) via `FontFace`; **await `document.fonts.load()` before rendering** so preview and export use identical glyphs.
- Font carousel, color dots, box toggle, input bar, Done — existing UI, keep it.
- Dragging updates `clip.x/y` normalized; pinch updates `scale/rotation`.

### 6.5 Audio overlay
- Pick audio or video file. If video: extract audio track.
- **Phase 1 (cheap, already works):** use `AudioContext.createMediaElementSource()` on the source video and mix live — no ffmpeg needed.
- **Phase 2:** lazy-load `ffmpeg.wasm` and extract with `ffmpeg.exec(['-i','input.mp4','-vn','-acodec','copy','audio.aac'])`, store the blob in IndexedDB.
- Export mixing uses `OfflineAudioContext` to produce one `AudioBuffer`.

### 6.6 Export (most critical)
- Generate `framePlan = [0, 1/fps, 2/fps, …]`.
- `VideoEncoder.isConfigSupported()` for H.264/VP9; configure with `avc` or `vp09`.
- Loop: seek source → `renderFrame` → `new VideoFrame(canvas, { timestamp })` → `encoder.encode(frame, { keyFrame })` → **`frame.close()`**.
- Backpressure: `if (encoder.encodeQueueSize > 2) await encoder.flush()` before queuing more.
- Mix audio with `OfflineAudioContext`; encode AAC (or hand WAV to ffmpeg).
- Lazy-load ffmpeg.wasm and mux: `ffmpeg -i video.mp4 -i audio.wav -c:v copy -c:a aac output.mp4`.
- Progress + cancel button; catch errors and offer MediaRecorder fallback.

### 6.7 PWA requirements
Add to `next.config.ts`:

```ts
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
    ],
  }];
}
```

These enable `SharedArrayBuffer` for threaded ffmpeg.wasm. Note: COEP may break cross-origin media embeds — proxy R2 media through same-origin routes (the existing `/api/proxy-video` already does this).

Upgrade `public/sw.js` from pass-through to a real cache-first shell strategy. Cache ffmpeg core only after first export.

### 6.8 Local AI (differentiator)
- Replace `/api/subtitles/transcribe` (paid OpenAI) with **Whisper-tiny quantized in a Web Worker**, model cached offline by the SW.
- Optional: MODNet quantized for background removal.
- Keep the server API as a fallback only if local model load fails.

### 6.9 Safari fallback
If `VideoEncoder` is unavailable or export fails: fall back to today's `canvas.captureStream()` + `MediaRecorder` path. Compare output duration and warn if codec support is limited.

---

## 7. Critical code sketches

### Shared renderer
```ts
function renderFrame(ctx: CanvasRenderingContext2D, project: Project, t: number, sources: SourceMap) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (const clip of activeClips(project, t, 'video')) {
    const v = sources.get(clip.mediaId)!;
    const st = clip.sourceStart + (t - clip.timelineStart);
    if (Math.abs(v.currentTime - st) > 0.02) seekSync(v, st);
    drawTransformed(ctx, v, clip);
  }
  for (const clip of activeClips(project, t, 'text')) drawText(ctx, clip);
}
```

### Export loop
```ts
const encoder = new VideoEncoder({
  output: (chunk, meta) => { muxer.add(chunk, meta); },
  error: (e) => fail(e),
});
encoder.configure(config);

for (const t of framePlan) {
  renderFrame(offCtx, project, t, sources);
  const frame = new VideoFrame(offCanvas, { timestamp: Math.round(t * 1e6) });
  encoder.encode(frame, { keyFrame: isKeyFrame(t) });
  frame.close();
  if (encoder.encodeQueueSize > 2) await encoder.flush();
}
await encoder.flush();
```

### Audio mix
```ts
const offline = new OfflineAudioContext(2, sampleRate * duration, sampleRate);
for (const track of audioClips) {
  const buffer = await decode(track.blob);
  const src = offline.createBufferSource();
  const gain = offline.createGain();
  gain.gain.value = track.volume ?? 1;
  src.buffer = buffer;
  src.connect(gain).connect(offline.destination);
  src.start(track.timelineStart, track.sourceStart);
}
const mixed = await offline.startRendering();
```

---

## 8. Performance & memory rules (non-negotiable)

1. `frame.close()` after every encode — no exceptions.
2. Never queue more than 2–3 encoded frames without `flush()`.
3. Never load ffmpeg.wasm on editor open. Lazy import on first export/extract.
4. Never store media in localStorage.
5. Cache thumbnails; don't regenerate on every timeline open.
6. Always show a progress bar and allow cancellation.
7. Use `requestVideoFrameCallback` for preview instead of `timeupdate` where available.
8. Release object URLs on unmount/replace.

---

## 9. Testing matrix

| Scenario | Expected |
|---|---|
| Pick 4K 60s video on mid-range Android | Preview stays responsive; export completes with progress |
| Trim + split + text + audio | Export matches preview frame-for-frame |
| Text drag/pinch | x/y/scale/rotation persist after reload |
| Offline after first load | Editor opens; fonts render; export works |
| Safari 17 | WebCodecs path attempted, MediaRecorder fallback if unsupported |
| Export cancelled mid-way | No leaked frames; memory returns to baseline |
| COOP/COEP enabled | R2 media still loads via same-origin proxy |

---

## 10. Risks & decisions

- **COEP breaks third-party embeds** → proxy all media; audit any external iframe.
- **ffmpeg.wasm 30MB** → lazy only; cache after first use.
- **Low-end devices** → export time varies; cap resolution/fps for long clips, offer "fast export" preset.
- **Instagram fonts/icons** → visually matched equivalents only; no proprietary assets.
- **Safari parity** → target Chromium first; document degraded path.

---

## 11. Milestones & acceptance criteria

| # | Milestone | Acceptance |
|---|---|---|
| 1 | Project model + IndexedDB ingestion | Pick video → project JSON + blob stored; survives reload |
| 2 | Shared `renderFrame` preview | Single clip plays in canvas with audio |
| 3 | Timeline trim/split | Non-destructive edits; preview reflects changes |
| 4 | Text overlays | Font carousel, drag/pinch, timing; canvas-drawn |
| 5 | Audio overlay | Extract/mix; waveform + volume |
| 6 | WebCodecs export + mux | MP4 output identical to preview |
| 7 | PWA + local AI | Installable, offline shell, local captions |

**Do not start milestone 7 before milestone 2's shared renderer exists.**

---

## 12. Open-source references (study, don't copy blindly)

- **Twick** (`@twick/browser-render`) — React SDK, Canvas timeline, WebCodecs export.
- **Kutlass** — client-side React editor, WebCodecs export with ffmpeg fallback.
- **Arcumark** — Next.js editor, IndexedDB media + localStorage projects; PWA data-layer reference.
- **Timeline Studio** — architecture writeups on Canvas + WebCodecs + OfflineAudioContext.

---

## 13. Final instruction to the engineer

> We are not building an online Premiere. We are building a PWA that trims, adds text, and mixes audio on a phone with zero latency and publishes in one tap, at zero server cost. Get `renderFrame()` and the JSON timeline right first. Everything else is polish.
