import { apiFetch } from "@/lib/api-fetch";

export async function r2MultipartUpload(
  file: File,
  opts: { folder?: string; onProgress?: (p: number) => void } = {}
): Promise<{ publicUrl: string; key: string }> {
  const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const partSize = isMobile ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
  const concurrency = isMobile ? 1 : 3;
  const totalParts = Math.max(1, Math.ceil(file.size / partSize));

  if (file.size === 0) throw new Error("Your file appears to be 0 bytes.");

  if (isMobile) {
    await new Promise(r => setTimeout(r, 500));
    const probe = await file.slice(0, 1).arrayBuffer();
    if (probe.byteLength === 0) throw new Error("Your video is still loading from iCloud.");
  }

  const createRes = await apiFetch("/api/upload/multipart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create", filename: file.name, contentType: file.type || "application/octet-stream", folder: opts.folder || "uploads" }),
  });
  if (!createRes.ok) throw new Error(`Could not start upload (HTTP ${createRes.status})`);
  const { uploadId, key, publicUrl } = await createRes.json();

  const parts: { PartNumber: number; ETag: string }[] = [];
  const partLoaded: Record<number, number> = {};
  for (let i = 1; i <= totalParts; i++) partLoaded[i] = 0;

  const report = () => {
    let loaded = 0;
    for (const k in partLoaded) loaded += partLoaded[k];
    if (opts.onProgress) opts.onProgress(Math.min(99, Math.round((loaded / file.size) * 100)));
  };

  const uploadOne = async (partNumber: number) => {
    const start = (partNumber - 1) * partSize;
    const blob = file.slice(start, Math.min(start + partSize, file.size));
    if (blob.size === 0) throw new Error(`Chunk ${partNumber} is empty.`);

    const signRes = await apiFetch("/api/upload/multipart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sign", key, uploadId, partNumber }),
    });
    if (!signRes.ok) throw new Error(`Sign failed for part ${partNumber}`);
    const { url } = await signRes.json();

    const etag = await putPart(url, blob, (loaded) => { partLoaded[partNumber] = loaded; report(); });
    parts.push({ PartNumber: partNumber, ETag: etag });
  };

  try {
    const queue: number[] = [];
    for (let i = 1; i <= totalParts; i++) queue.push(i);
    let active = 0, done = 0;
    await new Promise<void>((resolve, reject) => {
      const tick = () => {
        if (done === totalParts) return resolve();
        while (active < concurrency && queue.length) {
          const n = queue.shift()!;
          active++;
          uploadOne(n).then(() => { active--; done++; tick(); }).catch(reject);
        }
      };
      tick();
    });
  } catch (err) {
    apiFetch("/api/upload/multipart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "abort", key, uploadId }) }).catch(() => {});
    throw err;
  }

  const completeRes = await apiFetch("/api/upload/multipart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "complete", key, uploadId, parts }),
  });
  if (!completeRes.ok) throw new Error(`Could not complete upload`);
  return { publicUrl, key };
}

function putPart(url: string, blob: Blob, onProgress: (loaded: number) => void, attempt = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.timeout = 5 * 60 * 1000;
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag");
        if (!etag) return reject(new Error("No ETag — check R2 CORS ExposeHeaders"));
        resolve(etag.replace(/"/g, ""));
      } else if (xhr.status >= 500 && attempt < 3) {
        setTimeout(() => putPart(url, blob, onProgress, attempt + 1).then(resolve, reject), 1000 * (attempt + 1));
      } else {
        reject(new Error(`Part upload failed with HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => attempt < 3 ? setTimeout(() => putPart(url, blob, onProgress, attempt + 1).then(resolve, reject), 1000 * (attempt + 1)) : reject(new Error("Network error"));
    xhr.ontimeout = () => attempt < 3 ? setTimeout(() => putPart(url, blob, onProgress, attempt + 1).then(resolve, reject), 1000 * (attempt + 1)) : reject(new Error("Timeout"));
    xhr.send(blob);
  });
}
