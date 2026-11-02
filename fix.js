const fs = require("fs");
const p = "src/app/creator-dashboard/upload/page.tsx";
let s = fs.readFileSync(p, "utf8");

const regex = /const uploadToR2 = async \(file: File\) => \{[\s\S]*?return publicUrl;\n  \};/;

const newFn = `const uploadToR2 = async (file: File, label: string) => {
    // 1. iOS Safari 0-byte bug check
    if (file.size === 0) {
      throw new Error("The browser is reading this file as 0 bytes. If you are on an iPhone, this happens when the video is still downloading from iCloud. Open the Photos app, wait for the video to fully download, then try again.");
    }

    // 2. Warn if file is too large for mobile memory
    if (file.size > 100 * 1024 * 1024) { // 100MB
      throw new Error("This video is over 100MB. Mobile browsers often fail to upload files this large from the Photos app. Please export the video to your Files app first, or upload from a computer.");
    }

    setUploadStatus(\`Uploading \${label}...\`);
    setUploadProgress(0);

    const res = await fetch("/api/r2-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type || "video/mp4" }),
    });
    const { uploadUrl, publicUrl, error } = await res.json();
    if (error) throw new Error(error);

    // 3. Use fetch with a ReadableStream for iOS Safari compatibility
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type || "video/mp4" },
    });

    if (!uploadRes.ok) throw new Error("Failed to upload to R2");

    // 4. Verify it actually uploaded with data
    const checkRes = await fetch(publicUrl, { method: "HEAD" });
    const size = checkRes.headers.get("content-length");
    if (size === "0") throw new Error("Upload failed: the file is 0 bytes in storage.");

    return publicUrl;
  };`;

if (!regex.test(s)) { console.error("COULD NOT FIND uploadToR2"); process.exit(1); }
s = s.replace(regex, newFn);

fs.writeFileSync(p, s, "utf8");
console.log("OK: Upload logic updated with iOS size validation.");
