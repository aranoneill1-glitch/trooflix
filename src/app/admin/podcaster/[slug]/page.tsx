"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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
  creatorId?: number | null;
};

type Creator = {
  id: number;
  name: string;
  slug: string;
  photoUrl: string;
  description: string;
};

export default function PodcasterVideosPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [creator, setCreator] = useState<Creator | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [editing, setEditing] = useState<Video | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    title: "",
    description: "",
    bitchuteUrl: "",
    posterUrl: "",
    backdropUrl: "",
  });

  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const videoInput = useRef<HTMLInputElement>(null);
  const posterInput = useRef<HTMLInputElement>(null);
  const backdropInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/creators")
      .then((r) => r.json())
      .then((all: Creator[]) => {
        const found = all.find((c) => c.slug === slug);
        if (!found) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setCreator(found);
        return fetch("/api/videos")
          .then((r) => r.json())
          .then((allVideos: Video[]) => {
            setVideos(allVideos.filter((v) => v.creatorId === found.id));
            setLoading(false);
          });
      })
      .catch(() => setLoading(false));
  }, [slug]);

  const resetForm = () => {
    setForm({ title: "", description: "", bitchuteUrl: "", posterUrl: "", backdropUrl: "" });
    setEditing(null);
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
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
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
    if (saving || !creator) return;
    setSaving(true);
    setStatus(editing ? "Updating…" : "Saving…");
    try {
      const url = editing ? `/api/videos?id=${editing.id}` : "/api/videos";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          bitchuteUrl: form.bitchuteUrl,
          posterUrl: form.posterUrl,
          backdropUrl: form.backdropUrl,
          creatorId: creator.id,
          // Silent defaults for podcaster videos
          type: "Podcast",
          category: "Podcasts",
          featured: false,
          year: new Date().getFullYear(),
          rating: "TV-MA",
        }),
      });
      if (!res.ok) throw new Error(await res.text());

      const updated = await fetch("/api/videos", { cache: "no-store" }).then((r) => r.json());
      setVideos(updated.filter((v: Video) => v.creatorId === creator.id));

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

  const startEdit = (v: Video) => {
    setEditing(v);
    setForm({
      title: v.title || "",
      description: v.description || "",
      bitchuteUrl: v.bitchuteUrl || "",
      posterUrl: v.posterUrl || "",
      backdropUrl: v.backdropUrl || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this video?")) return;
    await fetch(`/api/videos?id=${id}`, { method: "DELETE" });
    if (creator) {
      const updated = await fetch("/api/videos", { cache: "no-store" }).then((r) => r.json());
      setVideos(updated.filter((v: Video) => v.creatorId === creator.id));
    }
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

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/50">Loading…</p>
      </main>
    );
  }

  if (notFound || !creator) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/70 mb-4">Podcaster not found.</p>
          <Link href="/admin" className="text-red-500 hover:underline">← Back to Admin</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0b0f] text-white">
      <div className="sticky top-0 z-50 bg-[#0b0b0f]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/admin" className="text-white/70 hover:text-white text-sm whitespace-nowrap">
            ← Back to Admin
          </Link>
          <div className="flex items-center gap-3 ml-auto">
            {creator.photoUrl ? (
              <img src={creator.photoUrl} alt={creator.name} className="w-10 h-10 object-cover rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center font-bold">
                {creator.name[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold leading-tight">{creator.name}</p>
              <p className="text-xs text-white/50">Manage Videos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-8">
        <p className="text-white/50 mb-6">
          {editing ? `Editing: ${editing.title}` : `Add videos to ${creator.name}'s profile`}
        </p>

        <form onSubmit={submit} className="bg-[#141418] rounded-lg p-6 space-y-4 mb-10">
          <div>
            <label className="block text-sm text-white/60 mb-1">Video Name *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 focus:border-red-600 outline-none"
            />
          </div>

          <div>
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
            <label className="block text-sm text-white/60 mb-1">Card Image (Poster)</label>
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

          <div>
            <label className="block text-sm text-white/60 mb-1">Card Backdrop</label>
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

          <div>
            <label className="block text-sm text-white/60 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 focus:border-red-600 outline-none"
            />
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
              <button type="button" onClick={resetForm} className="text-white/60 hover:text-white text-sm">
                Cancel edit
              </button>
            )}
            {status && <span className="text-sm">{status}</span>}
          </div>
        </form>

        <h2 className="text-xl font-bold mb-4">{creator.name}'s Videos ({videos.length})</h2>
        <div className="space-y-2">
          {videos.map((v) => (
            <div
              key={v.id}
              className={`flex items-center gap-4 rounded p-3 transition ${
                editing?.id === v.id ? "bg-red-950/40 border border-red-600" : "bg-[#141418]"
              }`}
            >
              {v.posterUrl && (
                <img src={v.posterUrl} alt="" className="w-12 h-16 object-cover rounded" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{v.title}</p>
                <p className="text-sm text-white/50 truncate">{v.description || "No description"}</p>
              </div>
              <button
                onClick={() => startEdit(v)}
                className="text-blue-400 hover:text-blue-300 text-sm px-3 py-1 border border-blue-400/40 rounded hover:border-blue-300 transition"
              >
                Edit
              </button>
              <button
                onClick={() => remove(v.id)}
                className="text-red-500 hover:text-red-400 text-sm px-3 py-1 border border-red-500/40 rounded hover:border-red-400 transition"
              >
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
