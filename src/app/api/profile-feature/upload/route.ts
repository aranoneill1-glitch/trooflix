import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/utils/supabase/server";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  try {
    const { contentType, size } = await req.json();
    const extension = ALLOWED_TYPES[contentType];
    if (!extension) return NextResponse.json({ error: "Choose a JPG, PNG, WebP, AVIF, MP4, or WebM file" }, { status: 400 });
    const maxBytes = contentType.startsWith("image/") ? 20 * 1024 * 1024 : 250 * 1024 * 1024;
    if (!Number.isSafeInteger(size) || size <= 0 || size > maxBytes) {
      return NextResponse.json({ error: "Image files must be 20 MB or smaller; videos must be 250 MB or smaller" }, { status: 400 });
    }

    const S3 = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
    const key = `profile-features/${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const command = new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key, ContentType: contentType, ContentLength: size });
    const uploadUrl = await getSignedUrl(S3, command, { expiresIn: 900 });
    const publicUrl = `${(process.env.R2_PUBLIC_URL || process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`).replace(/\/$/, "")}/${key}`;
    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (error) {
    console.error("Profile feature upload signing failed:", error);
    return NextResponse.json({ error: "Could not prepare the upload" }, { status: 500 });
  }
}
