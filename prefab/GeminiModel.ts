import { load } from "jsr:@std/dotenv@^0.225.3";
import { GoogleGenAI } from "npm:@google/genai@^0.8.0";
import { Convo, Message, Model } from "@/relay.ts";

await load({ export: true, envPath: ".env" });
const apiKey = Deno.env.get("GEMINI_API_KEY");
if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY environment variable not set or found in .env file.",
  );
}
const ai = new GoogleGenAI({
  apiKey: apiKey,
});

export class GeminiModel extends Model {
  basemodel: string;
  constructor(basemodel?: string) {
    super();
    this.basemodel = basemodel ?? "gemini-1.5-flash-8b";
  }
  async gen<T>(c: Convo, schema?: object): Promise<T> {
    const config = {
      responseMimeType: schema ? "application/json" : "text/plain",
      systemInstruction: [{ text: c.system }],
      responseSchema: schema,
    };
    const model = this.basemodel;
    const contents = c.messages.map((m: Message) => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));
    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });
    let total = "";
    for await (const chunk of response) {
      total += chunk.text;
    }
    if (schema) {
      return JSON.parse(total.trim()) as T;
    } else {
      return total.trim() as T;
    }
  }
}
