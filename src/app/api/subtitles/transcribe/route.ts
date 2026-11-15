import { NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Cue = { id: string; start: number; end: number; text: string };

function uid() { return Math.random().toString(36).slice(2, 10); }

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Auto-captions are not configured (missing OPENAI_API_KEY)." }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing media file." }, { status: 400 });
    }

    // Basic guardrail; Whisper/API limits may apply depending on account/model
    const maxBytes = 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ error: "Video/audio file is too large for auto-captions (max 25MB). Trim the clip shorter and try again." }, { status: 413 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";

    let cues: Cue[] = [];

    try {
      // Prefer verbose JSON with segments/timestamps when supported
      const transcription: any = await openai.audio.transcriptions.create({
        file,
        model,
        response_format: "verbose_json",
        timestamp_granularities: ["segment"],
      } as any);

      const segments = Array.isArray(transcription?.segments) ? transcription.segments : [];
      if (segments.length) {
        cues = segments
          .map((s: any) => ({
            id: uid(),
            start: Math.max(0, Number(s.start) || 0),
            end: Math.max(Number(s.start) || 0, Number(s.end) || 0),
            text: String(s.text || "").trim(),
          }))
          .filter((s: Cue) => s.text && s.end > s.start);
      } else if (typeof transcription?.text === "string" && transcription.text.trim()) {
        // Fallback: single cue (no timestamps available)
        cues = [{ id: uid(), start: 0, end: 5, text: transcription.text.trim() }];
      }
    } catch (err: any) {
      // Fallback for SDK/model combinations without verbose_json segment support
      const transcription: any = await openai.audio.transcriptions.create({
        file,
        model,
      } as any);
      if (typeof transcription?.text === "string" && transcription.text.trim()) {
        cues = [{ id: uid(), start: 0, end: 5, text: transcription.text.trim() }];
      } else {
        throw err;
      }
    }

    if (!cues.length) {
      return NextResponse.json({ error: "No speech detected to caption." }, { status: 422 });
    }

    return NextResponse.json({ cues });
  } catch (error: any) {
    console.error("/api/subtitles/transcribe error", error);
    const msg = error?.message || "Failed to auto-detect subtitles.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
