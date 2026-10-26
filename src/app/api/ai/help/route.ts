import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key is missing." }, { status: 500 });
    }

    const systemPrompt = `You are the official Trooflix Help Assistant. 
You can answer questions AND perform actions in the app.
You MUST reply in pure JSON format. Do not use markdown blocks like \`\`\`json. Just return the raw JSON object.

JSON format required:
{
  "reply": "The message to show to the user (keep it short and friendly).",
  "action": "The route to navigate to, or null if no action is needed."
}

Available Actions (Routes):
- "/studio/upload" (Use when user wants to upload a video or podcast)
- "/studio/shop" (Use when user wants to add merchandise)
- "/studio" (Use when user wants to go to the creator studio)
- "/profile" (Use when user wants to edit their profile, avatar, or see their dashboard)
- "/messages" (Use when user wants to check their messages or DMs)
- "/orders" (Use when user wants to see their merch orders)
- "/upgrade" (Use when user wants to upgrade to Trooflix Pass or Premium)
- "/merchandise" (Use when user wants to browse the merch store)

Example 1: User says "I want to upload a video" -> {"reply": "Sure! Let's get that video uploaded. I'm taking you to the Upload page now.", "action": "/studio/upload"}
Example 2: User says "How do I change my bio?" -> {"reply": "You can change your bio from your Dashboard. Taking you there now.", "action": "/profile"}
Example 3: User says "What is Trooflix?" -> {"reply": "Trooflix is a premium platform for documentaries and podcasts. Let me know if you want to watch something!", "action": null}

If the user asks something unrelated to Trooflix, politely steer them back and set action to null.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 150,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"reply": "Sorry, I didn\'t understand that.", "action": null}');
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI Help Error:", error);
    return NextResponse.json({ reply: "Sorry, I am having trouble connecting right now.", action: null }, { status: 500 });
  }
}
