// All prompts, versioned. Bump `version` on any change; it is logged in agent_steps (CLAUDE.md §8).
import { DISH_CATEGORIES } from "./schemas";

export const PROMPTS = {
  extract: {
    version: "extract-v1",
    system: [
      "Ti si precizan parser recepata. Iz zadanog teksta izvuci JEDAN recept.",
      "Ne izmišljaj ništa čega nema u tekstu. Ako tekst nije recept, vrati is_recipe=false i prazne liste.",
      "Sastojke vrati kao zasebne retke, s količinom, onako kako pišu. Korake vrati redom, bez numeracije.",
      "Naslov i tekst na hrvatskom kako je u izvoru.",
    ].join("\n"),
    user: (text: string) => `TEKST STRANICE:\n"""\n${text}\n"""`,
  },

  analyze: {
    version: "analyze-v1",
    system: [
      "Ti si stručnjak za vegansku prehranu i kuhanje. Analiziraj svaki sastojak recepta.",
      "index = redni broj retka sastojka (od 0). name_hr = kratak naziv u nominativu jednine (npr. „jaje“, „mljeveno meso“).",
      "slug = slug iz RJEČNIKA ako sastojak odgovara pojmu ili sinonimu, inače null.",
      "Količinu pretvori u g, ml ili kom: žlica ≈ 15, žličica ≈ 5, šalica ≈ 240 ml, kavena šalica ≈ 100 ml, dcl = 100 ml, dag = 10 g, šaka riže ≈ 40 g, prstohvat ≈ 1 g. Jaja i komade vrati u kom. Bez količine → null. quantity_estimated=true kad procjenjuješ.",
      "status: not_vegan = meso, riba, mlijeko i mliječni proizvodi, jaja, med, želatina, mast, majoneza; depends = može ali ne mora biti veganski (kocka za juhu, Vegeta, gotovo tijesto, kruh, margarin, čokolada, pesto, vino, kupovni umaci); vegan = sve ostalo.",
      "role = kako sastojak djeluje U OVOM jelu: binder (veže: jaje u palačinkama, pljeskavicama), leavening (diže/rahli: jaja u biskvitu), base (glavni sastojak: meso u sarmi, jaja u omletu), smoky (dimljeni okus: slanina, suho meso, kobasica u varivu), frying (masnoća za prženje), flavour (nositelj okusa: maslac u pireu), baking (masnoća u tijestu), creaminess (vrhnje u umaku), sweet (zaslađuje: med), liquid (tekućina: mlijeko u tijestu), any (ostalo).",
      "reason_hr = jedna kratka rečenica. confidence 0–1. Vrati SVE sastojke, i veganske.",
      `dish_category: jedna od: ${DISH_CATEGORIES.join(", ")}.`,
    ].join("\n"),
    user: (p: { title: string; servings: number | null; ingredients: string[]; steps: string[]; vocabulary: string }) =>
      [
        `RECEPT: ${p.title}${p.servings ? ` (${p.servings} porcija)` : ""}`,
        "SASTOJCI:",
        ...p.ingredients.map((l, i) => `${i}. ${l}`),
        "PRVI KORACI (kontekst):",
        ...p.steps.slice(0, 3).map((s) => `- ${s.slice(0, 300)}`),
        "RJEČNIK (slug: naziv | sinonimi):",
        p.vocabulary,
      ].join("\n"),
  },

  research: {
    version: "research-v1",
    system: [
      "Ti si iskusni veganski kuhar. Za zadano jelo i neveganske sastojke (s ulogom u jelu) objasni kako se u praksi zamjenjuju u sličnim jelima.",
      "Budi konkretan: koja zamjena, kada radi, a kada ne (npr. chia i lan vežu, ali ne dižu tijesto; dimljeni tofu daje okus suhog mesa).",
      "notes_hr: 1–3 rečenice po sastojku. suggestions: 2–4 zamjene s kratkim „kada“. dish_notes_hr: 1–2 rečenice o veganizaciji cijelog jela.",
      "key prepiši točno kako je zadan. Odgovori isključivo JSON objektom oblika:",
      '{"dish_notes_hr": "...", "items": [{"key": "...", "notes_hr": "...", "suggestions": [{"substitute_hr": "...", "when_hr": "..."}]}]}',
    ].join("\n"),
    user: (p: { dish: string; category: string; items: { key: string; name: string; role: string }[] }) =>
      [`JELO: ${p.dish} (${p.category})`, "SASTOJCI ZA ZAMJENU:", ...p.items.map((i) => `- key=${i.key} | ${i.name} | uloga: ${i.role}`)].join("\n"),
  },

  choose: {
    version: "choose-v1",
    system: [
      "Za svaki neveganski sastojak odaberi 1–3 veganske zamjene, najbolja prva.",
      "concept_id smiješ birati SAMO iz KANDIDATA tog sastojka ili iz GLOBALNOG POPISA koncepata. Ako nijedan koncept ne odgovara, concept_id=null i u label_hr opiši zamjenu (npr. „izostavi“, „domaći temeljac od povrća“).",
      "facets: odaberi vrijednosti SAMO iz ponuđenih OPCIJA za taj koncept, ili null. Primjer: mlijeko u palačinkama → zasladeno=nezaslađeno, okus=bez okusa; panceta → tofu s okus=dimljeno.",
      "Uzmi u obzir ULOGU sastojka i BILJEŠKE ISTRAŽIVANJA: jaje koje veže ≠ jaje koje diže ≠ jaje kao glavni sastojak.",
      "ratio = grama/ml zamjene po gramu/ml originala (pravila daju polazni omjer). label_hr = kratak naziv zamjene za korisnika.",
      "reasoning_hr = 1–2 rečenice, konkretno za ovo jelo. confidence 0–1.",
    ].join("\n"),
    user: (p: { dish: string; category: string; items: string; concepts: string; research: string }) =>
      [`JELO: ${p.dish} (${p.category})`, "", "SASTOJCI I KANDIDATI:", p.items, "", "BILJEŠKE ISTRAŽIVANJA:", p.research, "", "GLOBALNI POPIS KONCEPATA:", p.concepts].join("\n"),
  },

  rewrite: {
    version: "rewrite-v1",
    system: [
      "Prepiši korake recepta tako da koriste odabrane veganske zamjene. Zadrži redoslijed i ton; promijeni samo ono što treba.",
      "changed=true samo za izmijenjene korake. title_hr: npr. „Veganska sarma“. tip_hr: jedan kratak praktičan savjet ili null.",
    ].join("\n"),
    user: (p: { title: string; steps: string[]; swaps: string }) =>
      [`RECEPT: ${p.title}`, "ZAMJENE:", p.swaps, "KORACI:", ...p.steps.map((s, i) => `${i + 1}. ${s}`)].join("\n"),
  },

  // Dish illustration for the image model, in English (it follows style instructions best in English).
  // The style matches the team's illustrations (public/illustrations), which are sent as references.
  art: {
    version: "art-v1",
    prompt: (p: { dish: string; ingredients: string[] }, withReferences: boolean) =>
      [
        withReferences
          ? "Draw a NEW illustration in exactly the same style as the reference images (same cut-paper technique, texture, dot eyes and palette); do not copy their subjects."
          : null,
        "A single small food illustration for a vegan recipe app.",
        `Subject: the finished dish "${p.dish}" (a Croatian recipe), as it is served. Its ingredients, for context only: ${p.ingredients.slice(0, 12).join("; ").slice(0, 500)}.`,
        "Show the vegan version: no meat, eggs or dairy visible.",
        "Style: flat cut-paper collage, matte paper texture with softly torn edges, no outlines, no text or letters, simple rounded shapes, a few paper layers for depth. The food has a tiny cute face: just two small black dot eyes, no mouth.",
        "Palette: warm and muted, natural food colours leaning to guava pink, pistachio green, ochre and soft cream; nothing neon.",
        "Composition: one centred subject (on a simple plate, in a pot or on a board if it suits the dish), three-quarter view, generous empty margin, transparent background, no table, no props, no cast shadow.",
      ]
        .filter(Boolean)
        .join("\n"),
  },
} as const;
