import { NextResponse } from "next/server";

export async function GET() {
  const pw = process.env.ADMIN_PASSWORD;
  return NextResponse.json({
    exists: !!pw,
    length: pw ? pw.length : 0,
    // Show first 3 chars only so we can confirm the value without leaking it
    prefix: pw ? pw.slice(0, 3) : null,
    // Show the char codes of the last 3 chars to catch hidden whitespace
    suffix_codes: pw ? [...pw.slice(-3)].map((c) => c.charCodeAt(0)) : null,
  });
}
