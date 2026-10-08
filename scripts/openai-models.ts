// Lists the OpenAI models our key can use (chat-capable families and image models). Never prints the key.
// Usage: npm run llm:models:openai
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
const key = process.env.OPENAI_API_KEY;
if (!key) throw new Error("OPENAI_API_KEY is missing in .env.local");

const res = await fetch("https://api.openai.com/v1/models", { headers: { authorization: `Bearer ${key}` } });
if (!res.ok) {
  console.error(`OpenAI API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  process.exit(1);
}
const { data } = (await res.json()) as { data: { id: string; created: number }[] };
const chat = data
  .filter((m) => /^(gpt|o\d|chatgpt)/.test(m.id) && !/(audio|realtime|transcribe|tts|image|search|embedding|instruct)/.test(m.id))
  .sort((a, b) => b.created - a.created);
console.log(`Key works. ${chat.length} chat-capable models (newest first):\n`);
for (const m of chat) console.log(`  ${m.id.padEnd(40)} ${new Date(m.created * 1000).toISOString().slice(0, 10)}`);

const images = data.filter((m) => /^(gpt-image|chatgpt-image|dall-e)/.test(m.id)).sort((a, b) => b.created - a.created);
console.log(`\n${images.length} image models (dish illustrations, OPENAI_IMAGE_MODEL):\n`);
for (const m of images) console.log(`  ${m.id.padEnd(40)} ${new Date(m.created * 1000).toISOString().slice(0, 10)}`);
