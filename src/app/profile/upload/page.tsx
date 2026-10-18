"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { grabVideoPoster } from "@/lib/grabVideoPoster";

const MAX_SECONDS = 90;

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [stage, setStage] = useState<"pick" | "uploading" | "poster">("pick");
  const [tier, setTier] = useState<"user" | "pro" | "podcaster">("user");
  const [tierLoaded, setTierLoaded] = useState(false);

  // Load user's tier
  useEffect(() => {
    import("@/lib/cache").then(({ getCachedUser }) =>
      getCachedUser().then(async (u) => {
        if (!u) { setTierLoaded(true); return; }
        try {
          const res = await fetch(`/api/profile?user_id=${u.id}`, { cache: "no-store" });
          const d = await res.json();
          if (d.profile?.tier && ["user", "pro", "podcaster"].includes(d.profile.tier)) {
            setTier(d.profile.tier);
          }
        } catch {}
        setTierLoaded(true);
      })
    );
  }, []);

  // Compute the effective limit
  const effectiveLimit = tier === "user" ? MAX_SECONDS : null; // null = unlimited

  // Auto-open the picker on mount
  useEffect(() => {
    const t = setTimeout(() => {
      inputRef.current?.click();
    }, 100);
    return () => clearTimeout(t);
  }, []);

  const presignAndPut = async (
    file: File,
    folder: string,
    onProgress?: (n: number) => void
  ) => {
    const presign = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        folder,
      }),
    });
    if (!presign.ok) throw new Error("Upload prep failed");
    const { signedUrl, publicUrl } = await presign.json();

    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signedUrl, true);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(publicUrl);
        else reject(new Error("Upload failed: " + xhr.status));
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(file);
    });
  };

  const readDuration = (file: File): Promise<number> =>
    new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        resolve(video.duration);
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => reject(new Error("Could not read video"));
      video.src = URL.createObjectURL(file);
    });

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) {
      // User cancelled — back to profile
      router.push("/profile/compose");
      return;
    }
    setError("");

    // Check duration first
    let dur = 0;
    try {
      dur = await readDuration(f);
      if (effectiveLimit !== null && dur > effectiveLimit + 0.5) {
        const mins = Math.floor(dur / 60);
        const secs = Math.round(dur % 60);
        const durLabel = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        setError(
          `This video is ${durLabel}. Free accounts post up to ${MAX_SECONDS}s. Trim in your phone or tap here to learn about Pro.`
        );
        return;
      }
    } catch (err: any) {
      setError(err.message || "Could not read video");
      return;
    }

    setUploading(true);
    setStage("uploading");
    setProgress(0);

    try {
      const videoUrl = await presignAndPut(f, "videos", setProgress);

      // Try poster generation, but don't block on it
      setStage("poster");
      let posterUrl = "";
      try {
        const posterFile = await grabVideoPoster(videoUrl, 0.5);
        posterUrl = await presignAndPut(posterFile, "posters");
      } catch (err) {
        console.warn("poster gen failed:", err);
      }

      // Redirect to editor
      const params = new URLSearchParams({
        v: videoUrl,
        p: posterUrl,
        d: String(Math.round(dur)),
      });
      router.push(`/profile/upload/editor?${params.toString()}`);
    } catch (err: any) {
      setError(err.message || "Upload failed");
      setUploading(false);
      setStage("pick");
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={onFile}
        className="hidden"
      />

      <div className="max-w-md w-full text-center space-y-4">
        {!uploading && !error && (
          <>
            <p className="text-2xl md:text-3xl font-black tracking-tight mb-2">UPLOAD A REEL</p>
            <p className="text-sm text-white/50 mb-6">
              MP4, WebM, MOV · {tier === "user" ? `max ${MAX_SECONDS}s` : "no length limit"}
            </p>
            <button
              onClick={() => inputRef.current?.click()}
              className="px-8 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-semibold transition"
            >
              Choose video
            </button>
            <button
              onClick={() => router.push("/profile/compose")}
              className="block mx-auto text-xs text-white/40 hover:text-white transition mt-3"
            >
              Cancel
            </button>
          </>
        )}

        {stage === "uploading" && (
          <>
            <p className="text-lg font-semibold">Uploading… {progress}%</p>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        )}

        {stage === "poster" && (
          <>
            <Check className="mx-auto text-green-400" size={40} />
            <p className="text-lg font-semibold">Generating video…</p>
            <p className="text-sm text-white/50">Opening editor…</p>
          </>
        )}

        {error && (
          <>
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => {
                setError("");
                inputRef.current?.click();
              }}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-semibold transition"
            >
              Try again
            </button>
            <button
              onClick={() => router.push("/profile/compose")}
              className="block mx-auto text-xs text-white/40 hover:text-white transition"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </main>
  );
}
