"use client";

import { useEffect, useRef, useState } from "react";

type Video = {
  id: number;
  title: string;
  description: string;
  category: string;
  type: string;
  featured: boolean;
  bitchuteUrl: string;
  posterUrl: string;
  backdropUrl: string;
  year: number;
  rating: string;
};

const CATEGORIES = [
  "History Revisionism",
  "Politics and Power",
  "True Crime",
  "Health and Science",
  "Technology and Control",
  "Religion and Belief",
  "Ancient Civilisations",
  "UFO Phenomena",
];

const TYPES = ["Movie", "Documentary", "Podcast", "Series"];

export default function Admin() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [editing, setEditing] = useState<Video | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: CATEGORIES[0],
    type: "Documentary",
    featured: false,
    bitchuteUrl: "",
    posterUrl: "",
    backdropUrl: "",
    year: 2026,
    rating: "TV-MA",
  });
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const videoInput = useRef<HTMLInputElement>(null);
  const posterInput = useRef<HTMLInputElement>(null);
  const backdropInput = useRef<HTMLInputElement>(null);

  const loadVideos = async () => {
    const res = await fetch("/api/videos", { cache: "no-store" });
    const data = await res.json();
    setVideos(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    setForm((f) => ({ ...f, year: new Date().getFullYear() }));
    loadVideos();
  }, []);

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      category: CATEGORIES[0],
      type: "Documentary",
      featured: false,
      bitchuteUrl: "",
      posterUrl: "",
      backdropUrl: "",
      year: new Date().getFullYear(),
      rating: "TV-MA",
    });
    setEditing(null);
    setProgress(0);
  };

  // Upload using XMLHttpRequest so we get progress events for large files
  const uploadFile = (file: File, folder: string, onDone: (url: string) => void) => {
    setUploading(folder);
    setProgress(0);

    // Get presigned URL
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
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
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

  const startEdit = (video: Video) => {
    setEditing(video);
    setForm({
      title: video.title || "",
      description: video.description || "",
      category: video.category || CATEGORIES[0],
      type: video.type || "Documentary",
      featured: !!video.featured,
      bitchuteUrl: video.bitchuteUrl || "",
      posterUrl: video.posterUrl || "",
      backdropUrl: video.backdropUrl || "",
      year: video.year || new Date().getFullYear(),
      rating: video.rating || "TV-MA",
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
    <main className="min-h-screen bg-[#0b0b0f] text-white">
      <nav className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 bg-[#0b0b0f]/90 backdrop-blur border-b border-white/10">
        <a href="/" className="text-2xl font-black tracking-tight hover:opacity-80 transition">
          <span className="text-white">TROO</span><span className="text-red-600">FLIX</span>
        </a>
        <div className="flex items-center gap-6 text-sm">
          <a href="/" className="text-white/80 hover:text-white transition">← Back to Home</a>
          <button
            onClick={async () => {
              await fetch("/api/admin-logout", { method: "POST" });
              window.location.href = "/admin/login";
            }}
            className="text-white/60 hover:text-white transition"
          >
            Log out
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-8">
        <p className="text-white/50 mb-8">
          {editing ? `Editing: ${editing.title}` : "Add videos to your catalog"}
        </p>

        <form onSubmit={submit} className="bg-[#141418] rounded-lg p-6 space-y-4 mb-10">
          <div className="grid grid-cols-2 gap-4">
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
                  value={form.bitchuteUrl}
                  onChange={(e) => setForm({ ...form, bitchuteUrl: e.target.value })}
                  placeholder="Click Upload, or paste a URL"
                  className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 focus:border-red-600 outline-none text-sm"
                />
                <UploadButton
                  label="Upload Video"
                  folder="videos"
                  inputRef={videoInput}
                  onDone={(url) => setForm((f) => ({ ...f, bitchuteUrl: url }))}
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

        <h2 className="text-xl font-bold mb-4">Catalog ({videos.length})</h2>
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
              <button onClick={() => remove(v.id)} className="text-red-500 hover:text-red-400 text-sm px-3 py-1 border border-red-500/40 rounded hover:border-red-400 transition">
                Delete
              </button>
            </div>
          ))}
          {videos.length === 0 && <p className="text-white/40">No videos yet. Add one above.</p>}
        </div>
      </div>
    </main>
  );
}
