"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, Check, X, ChevronLeft } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
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

type ExistingApp = {
  id: number;
  creator_name: string;
  bio: string;
  category: string;
  photo_url: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export default function ApplyPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<ExistingApp | null>(null);

  const [creatorName, setCreatorName] = useState("");
  const [bio, setBio] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUserId(data.user.id);
      fetch(`/api/creator-applications?user_id=${data.user.id}`)
        .then((r) => r.json())
        .then((d) => {
          setExisting(d.application || null);
          if (d.application) {
            setCreatorName(d.application.creator_name);
            setBio(d.application.bio);
            setCategory(d.application.category);
            setPhotoUrl(d.application.photo_url || "");
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, [router]);

  const onPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const presign = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "image/jpeg",
          folder: "creators",
        }),
      });
      if (!presign.ok) throw new Error("Could not prepare upload");
      const { signedUrl, publicUrl } = await presign.json();

      const put = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      if (!put.ok) throw new Error("Upload failed (" + put.status + ")");
      setPhotoUrl(publicUrl);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setError("");
    if (!userId) return;
    if (!creatorName.trim()) return setError("Creator name is required.");
    if (!bio.trim() || bio.trim().length < 20)
      return setError("Please write at least 20 characters of bio.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/creator-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          creatorName: creatorName.trim(),
          bio: bio.trim(),
          category,
          photoUrl: photoUrl || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Could not submit");
        setSubmitting(false);
        return;
      }
      setExisting(d.application);
      setDone(true);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <TopBar />
        <p className="text-white/50 py-24 text-center">Loading…</p>
        <MobileBottomNav />
      </main>
    );
  }

  const isPending = existing?.status === "pending";
  const isApproved = existing?.status === "approved";
  const isRejected = existing?.status === "rejected";

  return (
    <main className="min-h-screen bg-black text-white pb-24 lg:pb-0">
      <TopBar />

      <div className="pt-20 md:pt-24 max-w-2xl mx-auto px-4 md:px-6">
        <button
          onClick={() => router.back()}
          className="p-1.5 -ml-1.5 rounded-full hover:bg-white/10 transition mb-4"
          aria-label="Back"
        >
          <ChevronLeft size={22} />
        </button>

        <h1 className="text-2xl md:text-3xl font-black mb-1">
          Become a creator
        </h1>
        <p className="text-white/50 text-sm mb-6">
          Tell us about yourself. We review every application personally.
        </p>

        {isApproved && (
          <div className="bg-green-950/40 border border-green-600/40 rounded-xl p-6 mb-4">
            <p className="font-semibold text-green-400 mb-1">You're approved ✅</p>
            <p className="text-sm text-white/70">
              You can start posting videos from your{" "}
              <Link href="/admin" className="underline">
                admin dashboard
              </Link>
              .
            </p>
          </div>
        )}

        {isPending && !done && (
          <div className="bg-yellow-950/30 border border-yellow-600/40 rounded-xl p-6 mb-4">
            <p className="font-semibold text-yellow-400 mb-1">
              Application under review
            </p>
            <p className="text-sm text-white/70">
              We're reviewing your application. You'll hear back shortly.
            </p>
          </div>
        )}

        {done && (
          <div className="bg-yellow-950/30 border border-yellow-600/40 rounded-xl p-6 mb-4">
            <p className="font-semibold text-yellow-400 mb-1">Submitted ✅</p>
            <p className="text-sm text-white/70">
              Thanks! We'll review your application soon.
            </p>
          </div>
        )}

        {isRejected && existing?.admin_notes && (
          <div className="bg-red-950/30 border border-red-600/40 rounded-xl p-6 mb-4">
            <p className="font-semibold text-red-400 mb-1">Not approved</p>
            <p className="text-sm text-white/70 mb-2">
              Reason: {existing.admin_notes}
            </p>
            <p className="text-xs text-white/50">
              You can update your application below and resubmit.
            </p>
          </div>
        )}

        {/* Form */}
        {!isApproved && !isPending && (
          <div className="bg-[#0d0d10] border border-white/5 rounded-xl p-6 mb-4 space-y-4">
            {/* Photo */}
            <div>
              <label className="text-xs text-white/50 block mb-2">
                Profile photo
              </label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {photoUrl ? (
                    <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={24} className="text-white/60" />
                  )}
                </div>
                <label className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition">
                  {uploading ? "Uploading…" : photoUrl ? "Change" : "Upload photo"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onPhotoChange}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Creator name */}
            <div>
              <label className="text-xs text-white/50 block mb-2">
                Creator name
              </label>
              <input
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="e.g. Sarah Jones"
                maxLength={80}
                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2.5 outline-none focus:border-red-600"
              />
              <p className="text-[11px] text-white/40 mt-1">
                This is what appears on your podcaster page.
              </p>
            </div>

            {/* Bio */}
            <div>
              <label className="text-xs text-white/50 block mb-2">
                Bio / pitch
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What do you make videos about? Why should people watch?"
                rows={4}
                maxLength={500}
                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2.5 outline-none focus:border-red-600 resize-none"
              />
              <p className="text-[11px] text-white/40 mt-1 text-right">
                {bio.length}/500
              </p>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs text-white/50 block mb-2">
                Main category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2.5 outline-none focus:border-red-600"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="bg-red-950/30 border border-red-600/40 rounded px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 font-semibold py-3 rounded-lg transition"
            >
              {submitting ? "Submitting…" : isRejected ? "Resubmit application" : "Submit application"}
            </button>
          </div>
        )}
      </div>

      <MobileBottomNav />
    </main>
  );
}
