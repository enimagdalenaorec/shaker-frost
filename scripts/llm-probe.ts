// Measures latency of candidate Gemini models for our two call types. Usage: npm run llm:probe [model ...]
import { config } from "dotenv";
import { GoogleGenAI } from "@google/genai";

config({ path: ".env.local", quiet: true });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const models = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-pro-preview"];

const schema = {
  type: "object",
  properties: {
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, is_vegan: { type: "boolean" }, role: { type: "string" } },
        required: ["name", "is_vegan", "role"],
      },
    },
  },
  required: ["ingredients"],
};

for (const model of models) {
  // 1) structured extraction
  let t = Date.now();
  try {
    const r = await ai.models.generateContent({
      model,
      contents: "Sastojci za palačinke: 2 jaja, 500 ml mlijeka, 250 g brašna, prstohvat soli, ulje za prženje. Vrati JSON.",
      config: { responseMimeType: "application/json", responseJsonSchema: schema, temperature: 0.2 },
    });
    const parsed = JSON.parse(r.text ?? "{}");
    console.log(`${model.padEnd(26)} json    ${String(Date.now() - t).padStart(6)} ms  ${parsed.ingredients?.length ?? "?"} ingredients`);
  } catch (e) {
    console.log(`${model.padEnd(26)} json    ERROR ${(e as Error).message.slice(0, 140)}`);
  }
  // 2) google search grounding + json in one call
  t = Date.now();
  try {
    const r = await ai.models.generateContent({
      model,
      contents: "Kako zamijeniti jaja u veganskim palačinkama? Kratko, 2 rečenice.",
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", responseJsonSchema: { type: "object", properties: { notes: { type: "string" } }, required: ["notes"] } },
    });
    const sources = r.candidates?.[0]?.groundingMetadata?.groundingChunks?.length ?? 0;
    console.log(`${model.padEnd(26)} search  ${String(Date.now() - t).padStart(6)} ms  ${sources} sources  ${(r.text ?? "").slice(0, 80).replace(/\n/g, " ")}`);
  } catch (e) {
    console.log(`${model.padEnd(26)} search  ERROR ${(e as Error).message.slice(0, 160)}`);
  }
}
