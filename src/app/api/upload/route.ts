import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || "https://" + process.env.R2_ACCOUNT_ID + ".r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const POST = withAuth(async (req, user) => {
  try {
    const { filename, contentType, folder } = await req.json();
    if (!filename || !contentType) return NextResponse.json({ error: "Missing filename or contentType" }, { status: 400 });
    const fileExt = filename.split(".").pop();
    const uniqueFileName = (folder || "uploads") + "/" + Date.now() + "-" + user.id + "." + fileExt;
    const command = new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: uniqueFileName, ContentType: contentType });
    const signedUrl = await getSignedUrl(S3, command, { expiresIn: 3600 });
    const publicUrl = (process.env.R2_PUBLIC_URL || process.env.R2_ENDPOINT)!.replace(/\/$/, "") + "/" + uniqueFileName;
    return NextResponse.json({ signedUrl, publicUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
