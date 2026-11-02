import { NextResponse } from "next/server";
import { S3Client, CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";

const S3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
});

export async function POST(req: Request) {
  const { uploadId, key, parts } = await req.json();
  const command = new CompleteMultipartUploadCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  });
  await S3.send(command);
  const publicUrlBase = process.env.R2_PUBLIC_URL || process.env.R2_ENDPOINT;
  return NextResponse.json({ publicUrl: `${publicUrlBase}/${key}` });
}
