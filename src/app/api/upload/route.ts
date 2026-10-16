import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export async function POST(req: Request) {
  try {
    // Auth: allow admin OR any signed-in user
    const adminPassword = process.env.ADMIN_PASSWORD;
    const cookieStore = await cookies();
    const adminCookie = cookieStore.get("trooflix_admin")?.value;
    const isAdmin = adminPassword && adminCookie === adminPassword;

    if (!isAdmin) {
      // Check for a Supabase session cookie (name contains sb- and -auth-token)
      const all = cookieStore.getAll();
      const hasSession = all.some(
        (c) => c.name.includes("sb-") && c.name.includes("-auth-token")
      );
      if (!hasSession) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { filename, contentType, folder } = await req.json();
    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "filename and contentType required" },
        { status: 400 }
      );
    }

    const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, "-");
    const key = `${folder || "videos"}/${Date.now()}-${safeName}`;

    // 1-year browser cache for uploaded assets (videos, images).
    // Combined with filenames that include a timestamp, this is safe:
    // any new upload gets a new key, so browser cache never goes stale.
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({ signedUrl, publicUrl, key });
  } catch (e: any) {
    console.error("upload presign error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
