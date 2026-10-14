"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, ChevronLeft, Check, AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const CATEGORIES = [
  "History",
  "Politics",
  "True Crime",
  "Science & Health",
  "Technology",
  "Religion & Belief",
  "Ancient History",
  "The Unknown",
  "Comedy",
  "News",
  "Other",
];

type Creator = {
  id: number;
  name: string;
  slug: string;
  photoUrl?: string;
  heroBackdropUrl?: string;
  description?: string;
  category?: string;
};

export default function CreatorSettings() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);

  // Editable
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [heroBackdropUrl, setHeroBackdropUrl] = useState("");

  // Uploading flags
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      fetch(`/api/me/creator?user_id=${data.user.id}`)
        .then((r) => r.json())
        .then((d) => {
          setCreator(d.creator);
          if (d.creator) {
            setName(d.creator.name || "");
            setSlug(d.creator.slug || "");
            setBio(d.creator.description || "");
            setPhotoUrl(d.creator.photoUrl || "");
            setHeroBackdropUrl(d.creator.heroBackdropUrl || "");
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, []);

  const presignAndPut = async (file: File, folder: string) => {
    const presign = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "image/jpeg",
        folder,
      }),
    });
    if (!presign.ok) throw new Error("Upload prep failed");
    const { signedUrl, publicUrl } = await presign.json();
    const put = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "image/jpeg" },
      body: file,
    });
    if (!put.ok) throw new Error("Upload failed");
    return publicUrl;
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadingPhoto(true);
    setStatus("");
    try {
      const url = await presignAndPut(f, "creators");
      setPhotoUrl(url);
    } catch (err: any) {
      setStatus("❌ " + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onHero = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadingHero(true);
    setStatus("");
    try {
      const url = await presignAndPut(f, "backdrops");
      setHeroBackdropUrl(url);
    } catch (err: any) {
      setStatus("❌ " + err.message);
    } finally {
      setUploadingHero(false);
    }
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    setStatus("");
    try {
      const res = await fetch("/api/creator/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name: name.trim(),
          slug: slug.trim(),
          bio: bio.trim(),

          photoUrl,
          heroBackdropUrl,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setStatus("❌ " + (d.error || "Could not save"));
      } else {
        setCreator(d.creator);
        setStatus("✅ Saved");
        setTimeout(() => setStatus(""), 2500);
      }
    } catch {
      setStatus("❌ Network error");
    } finally {
      setSaving(false);
    }
  };

  const deleteProfile = async () => {
    if (!userId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/creator/profile?userId=${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/profile");
      } else {
        const d = await res.json();
        setStatus("❌ " + (d.error || "Could not delete"));
        setDeleting(false);
        setConfirmDelete(false);
      }
    } catch {
      setStatus("❌ Network error");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-white/50 text-center">Loading…</div>
    );
  }

  if (!creator) {
    return (
      <div className="p-8 text-white/50 text-center">
        Couldn&apos;t load your creator profile.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <Link
        href="/creator"
        className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-4 transition"
      >
        <ChevronLeft size={16} /> Back to dashboard
      </Link>

      <h1 className="text-2xl font-black mb-1">Creator Settings</h1>
      <p className="text-white/50 text-sm mb-6">
        How you appear on your podcaster page.
      </p>

      {/* Photo */}
      <section className="bg-[#141418] border border-white/5 rounded-xl p-5 mb-4">
        <h2 className="text-sm font-semibold mb-3">Profile photo</h2>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center overflow-hidden flex-shrink-0">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Camera size={24} className="text-white/60" />
            )}
          </div>
          <label className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition">
            {uploadingPhoto ? "Uploading…" : photoUrl ? "Change photo" : "Upload photo"}
            <input
              type="file"
              accept="image/*"
              onChange={onPhoto}
              disabled={uploadingPhoto}
              className="hidden"
            />
          </label>
        </div>
      </section>

      {/* Hero backdrop */}
      <section className="bg-[#141418] border border-white/5 rounded-xl p-5 mb-4">
        <h2 className="text-sm font-semibold mb-1">Hero banner</h2>
        <p className="text-xs text-white/50 mb-3">
          The big image at the top of your podcaster page (16:9 works best).
        </p>
        <label className="block border-2 border-dashed border-white/10 hover:border-red-600/50 rounded-xl overflow-hidden cursor-pointer transition">
          <input
            type="file"
            accept="image/*"
            onChange={onHero}
            disabled={uploadingHero}
            className="hidden"
          />
          {heroBackdropUrl ? (
            <img
              src={heroBackdropUrl}
              alt=""
              className="w-full aspect-video object-cover"
            />
          ) : (
            <div className="aspect-video flex items-center justify-center">
              <div className="text-center">
                <Camera size={26} className="mx-auto mb-2 text-white/40" />
                <p className="text-sm text-white/50">
                  {uploadingHero ? "Uploading…" : "Click to upload banner"}
                </p>
              </div>
            </div>
          )}
        </label>
      </section>

      {/* Identity */}
      <section className="bg-[#141418] border border-white/5 rounded-xl p-5 mb-4 space-y-4">
        <h2 className="text-sm font-semibold mb-1">Identity</h2>

        <div>
          <label className="text-xs text-white/50 block mb-2">Creator name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="w-full bg-black/40 border border-white/10 rounded px-3 py-2.5 outline-none focus:border-red-600"
          />
        </div>

        <div>
          <label className="text-xs text-white/50 block mb-2">
            URL slug <span className="text-white/30">/podcaster/{slug || "…"}</span>
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) =>
              setSlug(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, "-")
                  .replace(/-+/g, "-")
              )
            }
            maxLength={40}
            className="w-full bg-black/40 border border-white/10 rounded px-3 py-2.5 outline-none focus:border-red-600 font-mono"
          />
          <p className="text-[11px] text-amber-400/90 mt-1">
            ⚠️ Changing your slug breaks any existing links to your page.
          </p>
        </div>

        <div>
          <label className="text-xs text-white/50 block mb-2">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={500}
            className="w-full bg-black/40 border border-white/10 rounded px-3 py-2.5 outline-none focus:border-red-600 resize-none"
          />
          <p className="text-[11px] text-white/40 mt-1 text-right">
            {bio.length}/500
          </p>
        </div>

      </section>

      {status && (
        <div
          className={`rounded px-4 py-3 text-sm mb-4 ${
            status.startsWith("✅")
              ? "bg-green-950/30 border border-green-600/40 text-green-300"
              : "bg-red-950/30 border border-red-600/40 text-red-300"
          }`}
        >
          {status}
        </div>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="w-full md:w-auto flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 font-semibold px-6 py-3 rounded-lg transition mb-8"
      >
        <Check size={16} /> {saving ? "Saving…" : "Save changes"}
      </button>

      {/* Danger zone */}
      <section className="border border-red-600/30 rounded-xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-semibold mb-1">Delete creator profile</h2>
            <p className="text-xs text-white/60 leading-relaxed">
              Your podcaster page and videos will be hidden from Trooflix. Your
              user account stays active. Contact admin to restore.
            </p>
          </div>
        </div>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-sm bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-semibold px-4 py-2 rounded-lg transition"
          >
            Delete creator profile
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={deleteProfile}
              disabled={deleting}
              className="text-sm bg-red-600 hover:bg-red-500 disabled:opacity-50 font-semibold px-4 py-2 rounded-lg transition"
            >
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-sm bg-white/10 hover:bg-white/20 font-semibold px-4 py-2 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
