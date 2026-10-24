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
  uploaderUserId?: string | null;
};

type Creator = {
  id: number;
  name: string;
  slug: string;
};

const CATEGORIES = [
  "History", "Politics & Geopolitics", "War & Conflict", "True Crime & Justice",
  "Conspiracy & Unsolved", "Society & Culture", "Business & Finance",
  "Science & Technology", "Environment & Nature", "Religion & Spirituality",
  "Comedy & Satire", "News & Current Events",
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
  const [filter, setFilter] = useState<"all" | "home" | "feed" | "podcasts" | "documentaries" | "movies" | "reels" | "images" | "troos" | "no_poster">("all");
  const [search, setSearch] = useState("");
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
      body: JSON.stringify({ filename: file.name, contentType: file.type || "image/jpeg", folder: "posters" }),
    });
    if (!presignRes.ok) throw new Error("Presign failed");
    const { signedUrl, publicUrl } = await presignRes.json();
    const putRes = await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": file.type || "image/jpeg" }, body: file });
    if (!putRes.ok) throw new Error("Upload failed");
    return publicUrl;
  };

  const regenerateThumbnails = async () => {
    const targets = videos.filter((v) => (v.videoUrl ?? v.bitchuteUrl) && v.posterUrl.startsWith("/api/poster"));
    if (targets.length === 0) { setRegenStatus("No placeholder posters to fix."); return; }
    setRegenerating(true);
    let done = 0, failed = 0;
    for (const v of targets) {
      const src = v.videoUrl ?? v.bitchuteUrl ?? "";
      setRegenStatus(`Generating ${done + 1}/${targets.length}… (${v.title})`);
      try {
        const posterFile = await grabVideoPoster(src, 0.5);
        const posterUrl = await uploadPosterFile(posterFile);
        const res = await fetch(`/api/videos?id=${v.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ posterUrl }) });
        if (!res.ok) throw new Error("Save failed");
        done++;
      } catch (e) { failed++; }
    }
    await loadVideos();
    setRegenerating(false);
    setRegenStatus(`Done — ${done} fixed${failed ? `, ${failed} failed` : ""}.`);
  };

  const loadVideos = async () => {
    const res = await fetch("/api/videos", { cache: "no-store" });
    const data = await res.json();
    setVideos(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    setForm((f) => ({ ...f, year: new Date().getFullYear() }));
    loadVideos();
    fetch("/api/creators").then((r) => r.json()).then((d) => setCreators(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const resetForm = () => {
    setForm({
      title: "", description: "", category: CATEGORIES[0], type: "Documentary", featured: false,
      videoUrl: "", posterUrl: "", backdropUrl: "", year: new Date().getFullYear(), rating: "TV-MA", creatorId: null,
    });
    setEditing(null);
    setProgress(0);
  };

  const uploadFile = (file: File, folder: string, onDone: (url: string) => void) => {
    setUploading(folder);
    setProgress(0);
    fetch("/api/upload", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type || "application/octet-stream", folder }),
    })
      .then((r) => { if (!r.ok) throw new Error("Failed to get upload URL"); return r.json(); })
      .then(({ signedUrl, publicUrl }) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signedUrl, true);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            onDone(publicUrl);
            setStatus("✅ Uploaded");
            setTimeout(() => setStatus(""), 2000);
          } else { setStatus("❌ Upload failed: " + xhr.status); }
          setUploading(null); setProgress(0);
        };
        xhr.onerror = () => { setStatus("❌ Upload network error"); setUploading(null); setProgress(0); };
        xhr.send(file);
      })
      .catch((e) => { setStatus("❌ " + e.message); setUploading(null); setProgress(0); });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || uploading) return;
    setSaving(true);
    setStatus(editing ? "Updating…" : "Saving…");
    try {
      const url = editing ? `/api/videos?id=${editing.id}` : "/api/videos";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error(await res.text());
      await loadVideos();
      const wasEditing = !!editing;
      resetForm();
      setStatus(wasEditing ? "✅ Updated" : "✅ Added");
      setTimeout(() => setStatus(""), 2000);
    } catch (err: any) {
      setStatus("❌ " + (err?.message || "Failed"));
    } finally { setSaving(false); }
  };

  const toggleFeatured = async (video: Video) => {
    try {
      const res = await fetch(`/api/videos?id=${video.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: !video.featured }),
      });
      if (res.ok) { await loadVideos(); }
    } catch (err) { alert("Failed to toggle featured status"); }
  };

  const startEdit = (video: Video) => {
    setEditing(video);
    setForm({
      title: video.title || "", description: video.description || "", category: video.category || CATEGORIES[0],
      type: video.type || "Documentary", featured: !!video.featured, videoUrl: video.videoUrl ?? video.bitchuteUrl ?? "",
      posterUrl: video.posterUrl || "", backdropUrl: video.backdropUrl || "", year: video.year || new Date().getFullYear(),
      rating: video.rating || "TV-MA", creatorId: video.creatorId ?? null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this video?")) return;
    await fetch(`/api/videos?id=${id}`, { method: "DELETE" });
    await loadVideos();
  };

  const UploadButton = ({ label, folder, inputRef, onDone }: { label: string; folder: string; inputRef: React.RefObject<HTMLInputElement | null>; onDone: (url: string) => void; }) => (
    <>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading === folder} className="bg-red-600 hover:bg-red-500 disabled:opacity-50 px-4 py-2 rounded text-sm font-semibold whitespace-nowrap">
        {uploading === folder ? `${progress}%` : label}
      </button>
      <input ref={inputRef} type="file" accept={folder === "videos" ? "video/*" : "image/*"} onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile(file, folder, onDone); e.target.value = ""; }} className="hidden" />
    </>
  );

  const filteredVideos = videos.filter((v) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchesTitle = (v.title || "").toLowerCase().includes(q);
      const matchesCategory = (v.category || "").toLowerCase().includes(q);
      if (!matchesTitle && !matchesCategory) return false;
    }
    switch (filter) {
      case "all": return true;
      case "home": return (v.type === "Documentary" || v.type === "Movie" || v.type === "Podcast") && !v.uploaderUserId;
      case "feed": return !!v.uploaderUserId || v.type === "Reel" || v.type === "Image" || v.type === "Troo";
      case "podcasts": return v.type === "Podcast";
      case "documentaries": return v.type === "Documentary";
      case "movies": return v.type === "Movie";
      case "reels": return v.type === "Reel";
      case "images": return v.type === "Image";
      case "troos": return v.type === "Troo";
      case "no_poster": return !v.posterUrl || v.posterUrl.startsWith("/api/poster");
      default: return true;
    }
  });

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Videos</h1>
        <p className="text-white/50 text-sm">{editing ? `Editing: ${editing.title}` : "Add and manage videos in your catalog"}</p>
      </div>

      <form onSubmit={submit} className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 mb-10 shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">{editing ? "Edit Video" : "Add New Video"}</h2>
          {editing && (
            <button type="button" onClick={resetForm} className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 px-3 py-1.5 rounded-lg transition">
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          <div className="col-span-2">
            <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Title *</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500 transition" placeholder="e.g. The Art of Deception" />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Video File *</label>
            <div className="flex gap-3">
              <input type="text" required value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="Click Upload, or paste a URL" className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500 transition text-sm" />
              <button type="button" onClick={() => videoInput.current?.click()} disabled={uploading === "videos"} className="bg-white text-black hover:bg-gray-200 disabled:opacity-50 px-6 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition">
                {uploading === "videos" ? `${progress}%` : "Upload"}
              </button>
              <input ref={videoInput} type="file" accept="video/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile(file, "videos", (url) => setForm((f) => ({ ...f, videoUrl: url }))); e.target.value = ""; }} className="hidden" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Type *</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500 transition appearance-none">
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Category *</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500 transition appearance-none">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="col-span-2">
            <label className="flex items-center gap-3 bg-black/20 border border-white/5 rounded-xl px-4 py-4 cursor-pointer hover:bg-black/30 transition">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="accent-red-600 w-5 h-5 rounded" />
              <div>
                <p className="text-sm font-bold text-white">Feature in Hero Carousel</p>
                <p className="text-xs text-white/40">This video will rotate on the homepage banner.</p>
              </div>
            </label>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500 transition resize-none" placeholder="Brief summary of the video..." />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Podcaster</label>
            <select value={form.creatorId ?? ""} onChange={(e) => setForm({ ...form, creatorId: e.target.value ? Number(e.target.value) : null })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500 transition appearance-none">
              <option value="">— None (Admin Content) —</option>
              {creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Poster (portrait)</label>
            <div className="flex gap-2">
              <input type="text" value={form.posterUrl} onChange={(e) => setForm({ ...form, posterUrl: e.target.value })} placeholder="Paste URL" className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500 transition text-sm min-w-0" />
              <button type="button" onClick={() => posterInput.current?.click()} disabled={uploading === "posters"} className="bg-white/10 text-white hover:bg-white/20 disabled:opacity-50 px-4 py-3 rounded-xl text-sm font-bold transition">
                {uploading === "posters" ? `${progress}%` : "Upload"}
              </button>
              <input ref={posterInput} type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile(file, "posters", (url) => setForm((f) => ({ ...f, posterUrl: url }))); e.target.value = ""; }} className="hidden" />
            </div>
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Backdrop (landscape)</label>
            <div className="flex gap-2">
              <input type="text" value={form.backdropUrl} onChange={(e) => setForm({ ...form, backdropUrl: e.target.value })} placeholder="Paste URL" className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500 transition text-sm min-w-0" />
              <button type="button" onClick={() => backdropInput.current?.click()} disabled={uploading === "backdrops"} className="bg-white/10 text-white hover:bg-white/20 disabled:opacity-50 px-4 py-3 rounded-xl text-sm font-bold transition">
                {uploading === "backdrops" ? `${progress}%` : "Upload"}
              </button>
              <input ref={backdropInput} type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile(file, "backdrops", (url) => setForm((f) => ({ ...f, backdropUrl: url }))); e.target.value = ""; }} className="hidden" />
            </div>
          </div>
        </div>

        {uploading && (
          <div className="bg-black/40 border border-white/10 rounded-xl p-4">
            <p className="text-sm text-white/70 mb-2">Uploading {uploading}… {progress}%</p>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-red-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 pt-2">
          <button type="submit" disabled={saving || !!uploading} className="bg-white text-black hover:scale-[1.02] disabled:opacity-50 font-bold px-8 py-3.5 rounded-xl transition shadow-lg">
            {saving ? (editing ? "Saving..." : "Adding...") : (editing ? "Save Changes" : "Add Video")}
          </button>
          {status && <span className="text-sm font-semibold">{status}</span>}
        </div>
      </form>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div><h2 className="text-lg font-bold">Catalog ({filteredVideos.length}{filter !== "all" || search ? ` of ${videos.length}` : ""})</h2></div>
        <div className="flex items-center gap-2 flex-wrap">
          {regenStatus && <span className="text-xs text-white/60">{regenStatus}</span>}
          <button type="button" onClick={regenerateThumbnails} disabled={regenerating} className="bg-white/10 hover:bg-white/20 disabled:opacity-50 text-xs md:text-sm font-semibold px-3 md:px-4 py-2 rounded transition">
            {regenerating ? "Regenerating…" : "Regenerate thumbnails"}
          </button>
        </div>
      </div>

      <div className="relative mb-3">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title or category…" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-red-600" />
        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs">Clear</button>}
      </div>

      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {[{ key: "all", label: "All" }, { key: "home", label: "Home" }, { key: "feed", label: "Feed" }, { key: "podcasts", label: "Podcasts" }, { key: "documentaries", label: "Docs" }, { key: "movies", label: "Movies" }, { key: "reels", label: "Reels" }, { key: "images", label: "Images" }, { key: "troos", label: "Troos" }, { key: "no_poster", label: "No Poster" }].map((tab) => (
          <button key={tab.key} onClick={() => setFilter(tab.key as any)} className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${filter === tab.key ? "bg-white text-black" : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"}`}>
            {tab.label}
            {tab.key === "no_poster" && <span className="ml-1 text-red-400">●</span>}
          </button>
        ))}
      </div>
      
      <div className="space-y-2">
        {filteredVideos.length === 0 ? (
          <div className="text-center py-12 text-white/50">
            <p className="text-sm">No videos match this filter.</p>
            {(filter !== "all" || search) && <button onClick={() => { setFilter("all"); setSearch(""); }} className="mt-3 text-xs text-red-400 hover:text-red-300">Clear filters</button>}
          </div>
        ) : (
        filteredVideos.map((v) => {
          const isAdminContent = !v.uploaderUserId && (v.type === "Documentary" || v.type === "Movie" || v.type === "Podcast");
          const noPoster = !v.posterUrl || v.posterUrl.startsWith("/api/poster");
          return (
          <div key={v.id} className={`flex items-center gap-4 rounded p-3 transition ${editing?.id === v.id ? "bg-red-950/40 border border-red-600" : "bg-[#141418]"}`}>
            <img src={v.posterUrl} alt="" className="w-12 h-16 object-cover rounded" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate flex items-center gap-2 flex-wrap">
                {v.title}
                {v.featured && <span className="text-red-500 text-xs">★ FEATURED</span>}
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${isAdminContent ? "bg-blue-600/20 text-blue-400" : "bg-green-600/20 text-green-400"}`}>{isAdminContent ? "Home" : "Feed"}</span>
                {noPoster && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-red-600/20 text-red-400">No Poster</span>}
              </p>
              <p className="text-sm text-white/50 truncate">{v.type} · {v.category} · {v.year}</p>
            </div>
            
            <button onClick={() => startEdit(v)} className="text-blue-400 hover:text-blue-300 text-sm px-3 py-1 border border-blue-400/40 rounded hover:border-blue-300 transition">Edit</button>
            
            <button
              onClick={() => toggleFeatured(v)}
              className={`text-sm px-3 py-1 rounded border transition font-semibold ${
                v.featured
                  ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                  : "border-white/20 text-white/60 hover:text-white hover:border-white/40"
              }`}
            >
              {v.featured ? "★ Featured" : "☆ Feature"}
            </button>
            
            <button onClick={() => remove(v.id)} className="text-red-500 hover:text-red-400 text-sm px-3 py-1 border border-red-500/40 rounded hover:border-red-400 transition">Delete</button>
          </div>
          );
        })
        )}
      </div>
    </div>
  );
}
