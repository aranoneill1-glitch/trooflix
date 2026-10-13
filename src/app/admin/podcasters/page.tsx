"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

type Creator = {
  id: number;
  name: string;
  slug: string;
  photoUrl: string;
  heroBackdropUrl?: string;
  description: string;
};

export default function PodcastersPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [podcasterSearch, setPodcasterSearch] = useState("");
  const [editingCreator, setEditingCreator] = useState<Creator | null>(null);
  const [creatorForm, setCreatorForm] = useState({
    name: "",
    photoUrl: "",
    heroBackdropUrl: "",
    description: "",
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoProgress, setPhotoProgress] = useState(0);
  const [creatorStatus, setCreatorStatus] = useState("");
  const [savingCreator, setSavingCreator] = useState(false);

  const photoInput = useRef<HTMLInputElement>(null);
  const heroBackdropInput = useRef<HTMLInputElement>(null);

  const loadCreators = async () => {
    const res = await fetch("/api/creators", { cache: "no-store" });
    const d = await res.json();
    setCreators(Array.isArray(d) ? d : []);
  };

  useEffect(() => {
    loadCreators();
  }, []);

  const resetCreatorForm = () => {
    setCreatorForm({ name: "", photoUrl: "", heroBackdropUrl: "", description: "" });
    setEditingCreator(null);
    setPhotoProgress(0);
  };

  const submitCreator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingCreator) return;
    setSavingCreator(true);
    setCreatorStatus(editingCreator ? "Updating…" : "Saving…");
    try {
      const url = editingCreator
        ? `/api/creators?id=${editingCreator.id}`
        : "/api/creators";
      const method = editingCreator ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creatorForm),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadCreators();
      const wasEditing = !!editingCreator;
      resetCreatorForm();
      setCreatorStatus(wasEditing ? "✅ Updated" : "✅ Added");
      setTimeout(() => setCreatorStatus(""), 2000);
    } catch (err: any) {
      setCreatorStatus("❌ " + (err?.message || "Failed"));
    } finally {
      setSavingCreator(false);
    }
  };

  const startEditCreator = (c: Creator) => {
    setEditingCreator(c);
    setCreatorForm({
      name: c.name || "",
      photoUrl: c.photoUrl || "",
      heroBackdropUrl: c.heroBackdropUrl || "",
      description: c.description || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeCreator = async (id: number) => {
    if (!confirm("Delete this podcaster? Videos assigned to them won't be deleted.")) return;
    await fetch(`/api/creators?id=${id}`, { method: "DELETE" });
    await loadCreators();
  };

  // Upload a file to R2 and return the public URL
  const uploadToR2 = (file: File, folder: string, onDone: (url: string) => void, onError: (msg: string) => void) => {
    setUploadingPhoto(true);
    setPhotoProgress(0);
    fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "image/jpeg",
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
        xhr.setRequestHeader("Content-Type", file.type || "image/jpeg");
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable)
            setPhotoProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            onDone(publicUrl);
          } else {
            onError("Upload failed: " + xhr.status);
          }
          setUploadingPhoto(false);
          setPhotoProgress(0);
        };
        xhr.onerror = () => {
          onError("Upload network error");
          setUploadingPhoto(false);
          setPhotoProgress(0);
        };
        xhr.send(file);
      })
      .catch((e) => {
        onError(e.message);
        setUploadingPhoto(false);
        setPhotoProgress(0);
      });
  };

  const uploadCreatorPhoto = (file: File) => {
    uploadToR2(
      file,
      "creators",
      (url) => {
        setCreatorForm((f) => ({ ...f, photoUrl: url }));
        setCreatorStatus("✅ Photo uploaded");
        setTimeout(() => setCreatorStatus(""), 2000);
      },
      (msg) => setCreatorStatus("❌ " + msg)
    );
  };

  const uploadHeroBackdrop = (file: File) => {
    uploadToR2(
      file,
      "creators",
      (url) => {
        setCreatorForm((f) => ({ ...f, heroBackdropUrl: url }));
        setCreatorStatus("✅ Backdrop uploaded");
        setTimeout(() => setCreatorStatus(""), 2000);
      },
      (msg) => setCreatorStatus("❌ " + msg)
    );
  };

  const filteredCreators = creators.filter((c) =>
    c.name.toLowerCase().includes(podcasterSearch.toLowerCase())
  );

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Podcasters</h1>
        <p className="text-white/50 text-sm">
          {editingCreator ? `Editing: ${editingCreator.name}` : "Add and manage podcasters on the platform"}
        </p>
      </div>

      {/* Add/Edit form */}
      <form onSubmit={submitCreator} className="bg-[#141418] rounded-lg p-6 space-y-4 mb-10">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm text-white/60 mb-1">Name *</label>
            <input
              required
              value={creatorForm.name}
              onChange={(e) => setCreatorForm({ ...creatorForm, name: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 focus:border-red-600 outline-none"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-white/60 mb-1">Photo</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={creatorForm.photoUrl}
                onChange={(e) => setCreatorForm({ ...creatorForm, photoUrl: e.target.value })}
                placeholder="Click Upload, or paste a URL"
                className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 focus:border-red-600 outline-none text-sm"
              />
              <button
                type="button"
                onClick={() => photoInput.current?.click()}
                disabled={uploadingPhoto}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-50 px-4 py-2 rounded text-sm font-semibold whitespace-nowrap"
              >
                {uploadingPhoto ? `${photoProgress}%` : "Upload"}
              </button>
              <input
                ref={photoInput}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadCreatorPhoto(file);
                  e.target.value = "";
                }}
                className="hidden"
              />
            </div>
            {creatorForm.photoUrl && (
              <img
                src={creatorForm.photoUrl}
                alt="preview"
                className="mt-3 w-20 h-20 object-cover rounded-full border border-white/10"
              />
            )}
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-white/60 mb-1">Hero Backdrop (landscape for profile page)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={creatorForm.heroBackdropUrl}
                onChange={(e) => setCreatorForm({ ...creatorForm, heroBackdropUrl: e.target.value })}
                placeholder="Click Upload, or paste a URL"
                className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 focus:border-red-600 outline-none text-sm"
              />
              <button
                type="button"
                onClick={() => heroBackdropInput.current?.click()}
                disabled={uploadingPhoto}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-50 px-4 py-2 rounded text-sm font-semibold whitespace-nowrap"
              >
                Upload
              </button>
              <input
                ref={heroBackdropInput}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadHeroBackdrop(file);
                  e.target.value = "";
                }}
                className="hidden"
              />
            </div>
            {creatorForm.heroBackdropUrl && (
              <img
                src={creatorForm.heroBackdropUrl}
                alt="backdrop preview"
                className="mt-3 w-full max-w-md h-24 object-cover rounded border border-white/10"
              />
            )}
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-white/60 mb-1">Description</label>
            <textarea
              value={creatorForm.description}
              onChange={(e) => setCreatorForm({ ...creatorForm, description: e.target.value })}
              rows={3}
              className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 focus:border-red-600 outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={savingCreator || uploadingPhoto}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-50 font-semibold px-6 py-2 rounded transition"
          >
            {savingCreator
              ? editingCreator
                ? "Updating…"
                : "Adding…"
              : editingCreator
              ? "Save Changes"
              : "Add Podcaster"}
          </button>
          {editingCreator && (
            <button
              type="button"
              onClick={resetCreatorForm}
              className="text-white/60 hover:text-white text-sm"
            >
              Cancel edit
            </button>
          )}
          {creatorStatus && <span className="text-sm">{creatorStatus}</span>}
        </div>
      </form>

      {/* Podcaster list */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <h2 className="text-lg font-bold">
          All Podcasters ({creators.length})
        </h2>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
          />
          <input
            type="text"
            value={podcasterSearch}
            onChange={(e) => setPodcasterSearch(e.target.value)}
            placeholder="Search podcasters…"
            className="bg-black/40 border border-white/10 rounded-lg pl-9 pr-9 py-2 text-sm focus:border-red-600 outline-none w-64"
          />
          {podcasterSearch && (
            <button
              onClick={() => setPodcasterSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition text-xs"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {filteredCreators.map((c) => (
          <div
            key={c.id}
            className={`flex items-center gap-4 rounded p-3 transition ${
              editingCreator?.id === c.id ? "bg-red-950/40 border border-red-600" : "bg-[#141418]"
            }`}
          >
            {c.photoUrl ? (
              <img src={c.photoUrl} alt={c.name} className="w-12 h-12 object-cover rounded-full" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-white font-bold">
                {c.name[0]?.toUpperCase() || "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{c.name}</p>
              <p className="text-sm text-white/50 truncate">{c.description || "No description"}</p>
            </div>
            <a
              href={`/admin/podcaster/${c.slug}`}
              className="text-white bg-red-600 hover:bg-red-500 text-sm px-3 py-1 rounded transition font-semibold"
            >
              Manage Videos
            </a>
            <button
              onClick={() => startEditCreator(c)}
              className="text-blue-400 hover:text-blue-300 text-sm px-3 py-1 border border-blue-400/40 rounded hover:border-blue-300 transition"
            >
              Edit
            </button>
            <button
              onClick={() => removeCreator(c.id)}
              className="text-red-500 hover:text-red-400 text-sm px-3 py-1 border border-red-500/40 rounded hover:border-red-400 transition"
            >
              Delete
            </button>
          </div>
        ))}
        {creators.length === 0 && (
          <p className="text-white/40">No podcasters yet. Add one above.</p>
        )}
        {creators.length > 0 && filteredCreators.length === 0 && (
          <p className="text-white/40">
            No podcasters match "{podcasterSearch}".
          </p>
        )}
      </div>
    </div>
  );
}
