import { NextResponse } from "next/server";
import { S3Client, UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
});

export async function POST(req: Request) {
  const { uploadId, key, partNumber } = await req.json();
  const uploadUrl = await getSignedUrl(S3, new UploadPartCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  }), { expiresIn: 3600 });
  return NextResponse.json({ uploadUrl });
}
