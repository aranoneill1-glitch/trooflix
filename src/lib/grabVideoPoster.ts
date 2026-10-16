// Grab a still frame from a video URL (client-side) and return a JPEG File.
// Used at upload time and by admin "regenerate thumbnails".
export async function grabVideoPoster(
  videoUrl: string,
  atSeconds = 0.5
): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = videoUrl;

    const cleanup = () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.remove();
    };

    const fail = (msg: string) => {
      cleanup();
      reject(new Error(msg));
    };

    video.onloadedmetadata = () => {
      const t = Math.min(atSeconds, video.duration / 2);
      try {
        video.currentTime = t;
      } catch {
        fail("Could not seek video");
      }
    };

    video.onseeked = () => {
      try {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) return fail("Video has no dimensions");
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return fail("No canvas context");
        ctx.drawImage(video, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            cleanup();
            if (!blob) return reject(new Error("Canvas produced no blob"));
            const file = new File([blob], `poster-${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
            resolve(file);
          },
          "image/jpeg",
          0.85
        );
      } catch (e: any) {
        // Most common cause: tainted canvas from missing CORS on R2
        fail(e?.message || "Failed to capture frame");
      }
    };

    video.onerror = () => fail("Could not load video for poster");
    setTimeout(() => {
      if (video.readyState < 2) fail("Timeout loading video");
    }, 15000);
  });
}
