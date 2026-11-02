import { NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

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
    const { fileUrl } = await req.json();
    if (!fileUrl) return NextResponse.json({ error: "Missing fileUrl" }, { status: 400 });

    // Extract the file key from the URL
    const urlObj = new URL(fileUrl);
    const key = decodeURIComponent(urlObj.pathname.substring(1)); // Remove leading slash

    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });

    await S3.send(command);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("R2 delete error:", error);
    // Return success even if not found to prevent blocking DB cleanup
    return NextResponse.json({ success: true });
  }
}
