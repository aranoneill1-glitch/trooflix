import { NextResponse } from "next/server";
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_BASE = process.env.R2_PUBLIC_URL || process.env.R2_ENDPOINT!;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action;

    if (action === "create") {
      const ext = (body.filename || "").split(".").pop() || "bin";
      const key = `${body.folder || "uploads"}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
      const out = await S3.send(new CreateMultipartUploadCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: body.contentType || "application/octet-stream",
      }));
      return NextResponse.json({ uploadId: out.UploadId, key, publicUrl: `${PUBLIC_BASE}/${key}` });
    }

    if (action === "sign") {
      const url = await getSignedUrl(S3, new UploadPartCommand({
        Bucket: BUCKET, Key: body.key, UploadId: body.uploadId, PartNumber: body.partNumber,
      }), { expiresIn: 3600 });
      return NextResponse.json({ url });
    }

    if (action === "complete") {
      const parts = (body.parts as any[])
        .map((p) => ({ PartNumber: p.PartNumber, ETag: p.ETag }))
        .sort((a, b) => a.PartNumber - b.PartNumber);
      await S3.send(new CompleteMultipartUploadCommand({
        Bucket: BUCKET, Key: body.key, UploadId: body.uploadId, MultipartUpload: { Parts: parts },
      }));
      return NextResponse.json({ ok: true, publicUrl: `${PUBLIC_BASE}/${body.key}` });
    }

    if (action === "abort") {
      await S3.send(new AbortMultipartUploadCommand({ Bucket: BUCKET, Key: body.key, UploadId: body.uploadId }));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Multipart error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
