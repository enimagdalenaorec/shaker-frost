// Saved real recipe pages for the example chips, bundled with the code (no file system access needed on Vercel).
import palacinke from "@/fixtures/recipes/palacinke.json";
import sarma from "@/fixtures/recipes/sarma.json";
import bolonjez from "@/fixtures/recipes/bolonjez.json";

export const EXAMPLE_FIXTURES: Record<string, { url: string; jsonld: Record<string, unknown> }> = {
  sarma,
  palacinke,
  bolonjez,
};
