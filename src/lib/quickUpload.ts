"use client";

// A File picked in a user gesture on one page, consumed by the upload page
// after client-side navigation. Module state survives Next.js soft navigation.
let pending: { file: File; accept: string } | null = null;

export function setPendingUpload(file: File, accept: string) {
  pending = { file, accept };
}

export function takePendingUpload() {
  const value = pending;
  pending = null;
  return value;
}

/** Open the native picker from inside a click handler, then hand the File to `done`. */
export function pickMedia(accept: string, done: (file: File) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.style.display = "none";
  document.body.appendChild(input);
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    input.remove();
    if (file) done(file);
  }, { once: true });
  input.click();
}
