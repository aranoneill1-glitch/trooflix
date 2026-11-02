import { NextResponse } from "next/server";
import { S3Client, CreateMultipartUploadCommand } from "@aws-sdk/client-s3";

const S3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
});

export async function POST(req: Request) {
  const { filename, contentType } = await req.json();
  const key = `${Date.now()}-${Math.random().toString(36).substring(7)}.${filename.split(".").pop()}`;
  const command = new CreateMultipartUploadCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType || "video/mp4",
  });
  const res = await S3.send(command);
  return NextResponse.json({ uploadId: res.UploadId, key });
}
