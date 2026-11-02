export async function r2MultipartUpload(
  file: File,
  opts: { folder?: string; onProgress?: (p: number) => void } = {}
): Promise<{ publicUrl: string; key: string }> {
  const partSize = 10 * 1024 * 1024;
  const concurrency = 3;
  const totalParts = Math.max(1, Math.ceil(file.size / partSize));

  const createRes = await fetch("/api/upload/multipart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "create",
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      folder: opts.folder || "uploads",
    }),
  });
  if (!createRes.ok) throw new Error(`Start failed: ${createRes.status}`);
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

    const signRes = await fetch("/api/upload/multipart", {
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
    fetch("/api/upload/multipart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "abort", key, uploadId }),
    }).catch(() => {});
    throw err;
  }

  const completeRes = await fetch("/api/upload/multipart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "complete", key, uploadId, parts }),
  });
  if (!completeRes.ok) throw new Error(`Complete failed: ${completeRes.status}`);
  return { publicUrl, key };
}

function putPart(url: string, blob: Blob, onProgress: (loaded: number) => void, attempt = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag");
        if (!etag) return reject(new Error("No ETag — check R2 CORS ExposeHeaders: [\"ETag\"]"));
        resolve(etag.replace(/"/g, ""));
      } else if (xhr.status >= 500 && attempt < 3) {
        setTimeout(() => putPart(url, blob, onProgress, attempt + 1).then(resolve, reject), 500 * (attempt + 1));
      } else {
        reject(new Error(`Part failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => {
      if (attempt < 3) setTimeout(() => putPart(url, blob, onProgress, attempt + 1).then(resolve, reject), 500 * (attempt + 1));
      else reject(new Error("Network error on part"));
    };
    xhr.send(blob);
  });
}
