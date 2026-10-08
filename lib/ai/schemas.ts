import { z } from "zod";

// Every LLM output is validated against one of these (CLAUDE.md §8).

/** How an ingredient works in the dish: decides which replacement makes sense. */
export const ROLES = ["any", "frying", "flavour", "baking", "binder", "leavening", "base", "smoky", "sweet", "creaminess", "liquid", "sauce", "glaze"] as const;
export type Role = (typeof ROLES)[number];

export const DISH_CATEGORIES = [
  "glavno jelo", "juha i varivo", "tjestenina", "palačinke i tijesta", "kolač i desert", "salata", "umak", "doručak", "prilog", "ostalo",
] as const;

/** Recipe extracted from an arbitrary page or pasted text. */
export const ExtractedRecipe = z.object({
  is_recipe: z.boolean(),
  title: z.string(),
  servings: z.number().int().nullable(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
  notes: z.string().nullable(),
});
export type ExtractedRecipe = z.infer<typeof ExtractedRecipe>;

export const Analysis = z.object({
  dish_category: z.enum(DISH_CATEGORIES),
  servings: z.number().int().nullable(),
  ingredients: z.array(
    z.object({
      index: z.number().int(),
      name_hr: z.string(),
      slug: z.string().nullable(),
      quantity: z.number().nullable(),
      unit: z.enum(["g", "ml", "kom"]).nullable(),
      quantity_estimated: z.boolean(),
      role: z.enum(ROLES),
      status: z.enum(["vegan", "not_vegan", "depends"]),
      reason_hr: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ),
});
export type Analysis = z.infer<typeof Analysis>;

export const Research = z.object({
  dish_notes_hr: z.string(),
  items: z.array(
    z.object({
      key: z.string(),
      notes_hr: z.string(),
      suggestions: z.array(z.object({ substitute_hr: z.string(), when_hr: z.string() })),
    }),
  ),
});
export type Research = z.infer<typeof Research>;

export const Choice = z.object({
  items: z.array(
    z.object({
      index: z.number().int(),
      alternatives: z
        .array(
          z.object({
            concept_id: z.string().nullable(),
            label_hr: z.string(),
            facets: z.object({
              okus: z.string().nullable(),
              zasladeno: z.string().nullable(),
              namjena: z.string().nullable(),
              oblik: z.string().nullable(),
            }),
            ratio: z.number(),
            reasoning_hr: z.string(),
            confidence: z.number().min(0).max(1),
          }),
        )
        .min(1)
        .max(3),
    }),
  ),
});
export type Choice = z.infer<typeof Choice>;

export const Rewrite = z.object({
  title_hr: z.string(),
  steps: z.array(z.object({ text_hr: z.string(), changed: z.boolean() })),
  tip_hr: z.string().nullable(),
});
export type Rewrite = z.infer<typeof Rewrite>;
