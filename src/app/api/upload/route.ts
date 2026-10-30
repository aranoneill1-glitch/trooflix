import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: Request) {
  try {
    const { filename, contentType, folder } = await req.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: "Missing filename or contentType" }, { status: 400 });
    }

    const fileExt = filename.split('.').pop();
    const uniqueFileName = `${folder || 'uploads'}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: uniqueFileName,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(S3, command, { expiresIn: 3600 });

    const publicUrlBase = process.env.R2_PUBLIC_URL || `${process.env.R2_ENDPOINT}`;
    const publicUrl = `${publicUrlBase}/${uniqueFileName}`;

    return NextResponse.json({ signedUrl, publicUrl });
  } catch (error: any) {
    console.error("R2 Presign Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
