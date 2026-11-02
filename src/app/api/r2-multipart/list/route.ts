import { NextResponse } from "next/server";
import { S3Client, ListPartsCommand } from "@aws-sdk/client-s3";

const S3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
});

export async function POST(req: Request) {
  const { uploadId, key } = await req.json();
  const res = await S3.send(new ListPartsCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    UploadId: uploadId,
  }));
  return NextResponse.json({ parts: res.Parts || [] });
}
