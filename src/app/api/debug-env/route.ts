import { NextResponse } from "next/server";

export async function GET() {
  const pw = process.env.ADMIN_PASSWORD;
  return NextResponse.json({
    exists: !!pw,
    length: pw ? pw.length : 0,
    codes: pw ? [...pw].map((c) => c.charCodeAt(0)) : null,
  });
}
