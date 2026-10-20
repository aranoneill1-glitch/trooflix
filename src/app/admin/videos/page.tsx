"use client";

import { useEffect, useRef, useState } from "react";
import { grabVideoPoster } from "@/lib/grabVideoPoster";

type Video = {
  id: number;
  title: string;
  description: string;
  category: string;
  type: string;
  featured: boolean;
  videoUrl?: string;
  bitchuteUrl?: string;
  posterUrl: string;
  backdropUrl: string;
  year: number;
  rating: string;
  creatorId?: number | null;
};

type Creator = {
  id: number;
  name: string;
  slug: string;
};

const CATEGORIES = [
  "History",
  "Politics & Geopolitics",
  "War & Conflict",
  "True Crime & Justice",
  "Conspiracy & Unsolved",
  "Society & Culture",
  "Business & Finance",
  "Science & Technology",
  "Environment & Nature",
  "Religion & Spirituality",
  "Comedy & Satire",
  "News & Current Events",
];

const TYPES = ["Movie", "Documentary", "Podcast", "Series"];

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [editing, setEditing] = useState<Video | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: CATEGORIES[0],
    type: "Documentary",
    featured: false,
    videoUrl: "",
    posterUrl: "",
    backdropUrl: "",
    year: 2026,
    rating: "TV-MA",
    creatorId: null as number | null,
  });
  const [status, setStatus] = useState("");
  const [heroes, setHeroes] = useState<{ main?: number; docufilm?: number; podcast?: number }>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [regenStatus, setRegenStatus] = useState<string>("");
  const [regenerating, setRegenerating] = useState(false);

  const videoInput = useRef<HTMLInputElement>(null);
  const posterInput = useRef<HTMLInputElement>(null);
  const backdropInput = useRef<HTMLInputElement>(null);

  const uploadPosterFile = async (file: File): Promise<string> => {
    const presignRes = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "image/jpeg",
        folder: "posters",
      }),
    });
    if (!presignRes.ok) throw new Error("Presign failed");
    const { signedUrl, publicUrl } = await presignRes.json();
    const putRes = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "image/jpeg" },
      body: file,
    });
    if (!putRes.ok) throw new Error("Upload failed");
    return publicUrl;
  };

  const regenerateThumbnails = async () => {
    const targets = videos.filter(
      (v) => (v.videoUrl ?? v.bitchuteUrl) && v.posterUrl.startsWith("/api/poster")
    );
    if (targets.length === 0) {
      setRegenStatus("No placeholder posters to fix.");
      return;
    }
    setRegenerating(true);
    let done = 0;
    let failed = 0;
    for (const v of targets) {
      const src = v.videoUrl ?? v.bitchuteUrl ?? "";
      setRegenStatus(`Generating ${done + 1}/${targets.length}… (${v.title})`);
      try {
        const posterFile = await grabVideoPoster(src, 0.5);
        const posterUrl = await uploadPosterFile(posterFile);
        const res = await fetch(`/api/videos?id=${v.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ posterUrl }),
        });
        if (!res.ok) throw new Error("Save failed");
        done++;
      } catch (e) {
        console.warn("Regen failed for", v.title, e);
        failed++;
      }
    }
    await loadVideos();
    setRegenerating(false);
    setRegenStatus(
      `Done — ${done} fixed${failed ? `, ${failed} failed` : ""}.`
    );
  };

  const loadVideos = async () => {
    const res = await fetch("/api/videos", { cache: "no-store" });
    const data = await res.json();
    setVideos(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    setForm((f) => ({ ...f, year: new Date().getFullYear() }));
    loadVideos();
    fetch("/api/heroes").then((r) => r.json()).then((d) => setHeroes(d || {})).catch(() => {});
    fetch("/api/creators").then((r) => r.json()).then((d) => setCreators(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      category: CATEGORIES[0],
      type: "Documentary",
      featured: false,
      videoUrl: "",
      posterUrl: "",
      backdropUrl: "",
      year: new Date().getFullYear(),
      rating: "TV-MA",
      creatorId: null,
    });
    setEditing(null);
    setProgress(0);
  };

  const uploadFile = (file: File, folder: string, onDone: (url: string) => void) => {
    setUploading(folder);
    setProgress(0);
    fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        folder,
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to get upload URL");
        return r.json();
      })
      .then(({ signedUrl, publicUrl }) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signedUrl, true);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            onDone(publicUrl);
            setStatus("✅ Uploaded");
            setTimeout(() => setStatus(""), 2000);
          } else {
            setStatus("❌ Upload failed: " + xhr.status);
          }
          setUploading(null);
          setProgress(0);
        };
        xhr.onerror = () => {
          setStatus("❌ Upload network error");
          setUploading(null);
          setProgress(0);
        };
        xhr.send(file);
      })
      .catch((e) => {
        setStatus("❌ " + e.message);
        setUploading(null);
        setProgress(0);
      });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || uploading) return;
    setSaving(true);
    setStatus(editing ? "Updating…" : "Saving…");
    try {
      const url = editing ? `/api/videos?id=${editing.id}` : "/api/videos";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadVideos();
      const wasEditing = !!editing;
      resetForm();
      setStatus(wasEditing ? "✅ Updated" : "✅ Added");
      setTimeout(() => setStatus(""), 2000);
    } catch (err: any) {
      setStatus("❌ " + (err?.message || "Failed"));
    } finally {
      setSaving(false);
    }
  };

  const setHero = async (slot: "main" | "docufilm" | "podcast", id: number) => {
    const res = await fetch("/api/heroes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot, id }),
    });
    if (res.ok) {
      const d = await res.json();
      setHeroes(d.heroes || {});
      setStatus(`✅ Set ${slot} hero`);
      setTimeout(() => setStatus(""), 2000);
    } else {
      setStatus("❌ Could not set hero");
    }
  };

  const startEdit = (video: Video) => {
    setEditing(video);
    setForm({
      title: video.title || "",
      description: video.description || "",
      category: video.category || CATEGORIES[0],
      type: video.type || "Documentary",
      featured: !!video.featured,
      videoUrl: video.videoUrl ?? video.bitchuteUrl ?? "",
      posterUrl: video.posterUrl || "",
      backdropUrl: video.backdropUrl || "",
      year: video.year || new Date().getFullYear(),
      rating: video.rating || "TV-MA",
      creatorId: video.creatorId ?? null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this video?")) return;
    await fetch(`/api/videos?id=${id}`, { method: "DELETE" });
    await loadVideos();
  };

  const UploadButton = ({
    label,
    folder,
    inputRef,
    onDone,
  }: {
    label: string;
    folder: string;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onDone: (url: string) => void;
  }) => (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading === folder}
        className="bg-red-600 hover:bg-red-500 disabled:opacity-50 px-4 py-2 rounded text-sm font-semibold whitespace-nowrap"
      >
        {uploading === folder ? `${progress}%` : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={folder === "videos" ? "video/*" : "image/*"}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadFile(file, folder, onDone);
          e.target.value = "";
        }}
        className="hidden"
      />
    </>
  );

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Videos</h1>
        <p className="text-white/50 text-sm">
          {editing ? `Editing: ${editing.title}` : "Add and manage videos in your catalog"}
        </p>
      </div>

      <form onSubmit={submit} className="bg-[#141418] rounded-lg p-6 space-y-4 mb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm text-white/60 mb-1">Title *</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 focus:border-red-600 outline-none" />
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-white/60 mb-1">Video File *</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={form.videoUrl}
                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                placeholder="Click Upload, or paste a URL"
                className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 focus:border-red-600 outline-none text-sm"
              />
              <UploadButton
                label="Upload Video"
                folder="videos"
                inputRef={videoInput}
                onDone={(url) => setForm((f) => ({ ...f, videoUrl: url }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">Type *</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 focus:border-red-600 outline-none">
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">Category *</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 focus:border-red-600 outline-none">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                className="accent-red-600 w-4 h-4" />
              <span className="text-sm text-white/80">Feature in Trending Now</span>
            </label>
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-white/60 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 focus:border-red-600 outline-none" />
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-white/60 mb-1">Podcaster</label>
            <select
              value={form.creatorId ?? ""}
              onChange={(e) => setForm({ ...form, creatorId: e.target.value ? Number(e.target.value) : null })}
              className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 focus:border-red-600 outline-none"
            >
              <option value="">— None —</option>
              {creators.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-white/60 mb-1">Poster (portrait image)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.posterUrl}
                onChange={(e) => setForm({ ...form, posterUrl: e.target.value })}
                placeholder="Click Upload, or paste a URL"
                className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 focus:border-red-600 outline-none text-sm"
              />
              <UploadButton
                label="Upload"
                folder="posters"
                inputRef={posterInput}
                onDone={(url) => setForm((f) => ({ ...f, posterUrl: url }))}
              />
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-white/60 mb-1">Backdrop (landscape image, for hero)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.backdropUrl}
                onChange={(e) => setForm({ ...form, backdropUrl: e.target.value })}
                placeholder="Click Upload, or paste a URL"
                className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 focus:border-red-600 outline-none text-sm"
              />
              <UploadButton
                label="Upload"
                folder="backdrops"
                inputRef={backdropInput}
                onDone={(url) => setForm((f) => ({ ...f, backdropUrl: url }))}
              />
            </div>
          </div>
        </div>

        {uploading && (
          <div className="bg-black/40 border border-white/10 rounded p-3">
            <p className="text-sm text-white/70 mb-2">Uploading {uploading}… {progress}%</p>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-red-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving || !!uploading}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-50 font-semibold px-6 py-2 rounded transition"
          >
            {saving ? (editing ? "Updating…" : "Adding…") : (editing ? "Save Changes" : "Add Video")}
          </button>
          {editing && (
            <button type="button" onClick={resetForm} className="text-white/60 hover:text-white text-sm transition">
              Cancel edit
            </button>
          )}
          {status && <span className="text-sm">{status}</span>}
        </div>
      </form>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Catalog ({videos.length})</h2>
        <div className="flex items-center gap-3">
          {regenStatus && <span className="text-xs text-white/60">{regenStatus}</span>}
          <button
            type="button"
            onClick={regenerateThumbnails}
            disabled={regenerating}
            className="bg-white/10 hover:bg-white/20 disabled:opacity-50 text-sm font-semibold px-4 py-2 rounded transition"
          >
            {regenerating ? "Regenerating…" : "Regenerate thumbnails"}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {videos.map((v) => (
          <div key={v.id} className={`flex items-center gap-4 rounded p-3 transition ${editing?.id === v.id ? "bg-red-950/40 border border-red-600" : "bg-[#141418]"}`}>
            <img src={v.posterUrl} alt="" className="w-12 h-16 object-cover rounded" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">
                {v.title}
                {v.featured && <span className="text-red-500 text-xs ml-2">★ FEATURED</span>}
              </p>
              <p className="text-sm text-white/50 truncate">{v.type} · {v.category} · {v.year}</p>
            </div>
            <button onClick={() => startEdit(v)} className="text-blue-400 hover:text-blue-300 text-sm px-3 py-1 border border-blue-400/40 rounded hover:border-blue-300 transition">
              Edit
            </button>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setHero("main", v.id)}
                className={`text-xs px-2 py-0.5 rounded border transition ${
                  heroes.main === v.id
                    ? "bg-red-600 border-red-600 text-white"
                    : "border-white/20 text-white/60 hover:text-white hover:border-white/40"
                }`}
              >
                {heroes.main === v.id ? "★ Main" : "Set Main"}
              </button>
              <button
                onClick={() => setHero("docufilm", v.id)}
                className={`text-xs px-2 py-0.5 rounded border transition ${
                  heroes.docufilm === v.id
                    ? "bg-red-600 border-red-600 text-white"
                    : "border-white/20 text-white/60 hover:text-white hover:border-white/40"
                }`}
              >
                {heroes.docufilm === v.id ? "★ Doc" : "Set Doc"}
              </button>
              <button
                onClick={() => setHero("podcast", v.id)}
                className={`text-xs px-2 py-0.5 rounded border transition ${
                  heroes.podcast === v.id
                    ? "bg-red-600 border-red-600 text-white"
                    : "border-white/20 text-white/60 hover:text-white hover:border-white/40"
                }`}
              >
                {heroes.podcast === v.id ? "★ Pod" : "Set Pod"}
              </button>
            </div>
            <button onClick={() => remove(v.id)} className="text-red-500 hover:text-red-400 text-sm px-3 py-1 border border-red-500/40 rounded hover:border-red-400 transition">
              Delete
            </button>
          </div>
        ))}
        {videos.length === 0 && <p className="text-white/40">No videos yet. Add one above.</p>}
      </div>
    </div>
  );
}
