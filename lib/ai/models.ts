// Model chains per tier, chosen from the live model list of our key (npm run llm:models).
// Free-tier quotas are per model, so each tier falls through to the next model on 429/503/404.
// Override the first choice with LLM_MODEL_FAST / LLM_MODEL_STRONG.

export type Tier = "fast" | "strong";

const chain = (preferred: string | undefined, ...rest: string[]) => [...new Set([preferred, ...rest].filter(Boolean) as string[])];

// Measured on our key: the lite models answer in ~1 s, gemini-3.5-flash swings between 4 s and 100 s
// under shared free-tier load. Availability beats raw strength on stage, so lite models lead and the
// two tiers start on different models to spread the per-model quota.
export const MODEL_CHAINS: Record<Tier, string[]> = {
  strong: chain(process.env.LLM_MODEL_STRONG, "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-flash-latest"),
  fast: chain(process.env.LLM_MODEL_FAST, "gemini-3.1-flash-lite", "gemini-flash-lite-latest", "gemini-3.5-flash-lite"),
};

// Backup provider, used only when every Gemini model in the chain failed (lib/ai/openai.ts).
// PLACEHOLDER defaults until verified against our key's live model list (npm run llm:models:openai);
// override with OPENAI_MODEL_STRONG / OPENAI_MODEL_FAST.
export const OPENAI_MODELS: Record<Tier, string> = {
  strong: process.env.OPENAI_MODEL_STRONG || "gpt-4.1-mini",
  fast: process.env.OPENAI_MODEL_FAST || "gpt-4.1-mini",
};
