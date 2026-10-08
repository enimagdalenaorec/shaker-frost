// Example recipes on the home page: two from saved coolinarika pages (work offline), one live from index.hr.
export const EXAMPLE_RECIPES = [
  { slug: "sarma", label: "Sarma", swaps: 3, href: "/recept/novi?primjer=sarma", tone: "bg-apricot-100 text-apricot-700" },
  { slug: "palacinke", label: "Palačinke", swaps: 2, href: "/recept/novi?primjer=palacinke", tone: "bg-honey-100 text-honey-700" },
  {
    slug: "kolac-od-sljiva",
    label: "Kolač od šljiva",
    swaps: 3,
    href: `/recept/novi?url=${encodeURIComponent("https://recepti.index.hr/recept/1244-preokrenuti-kolac-od-sljiva")}`,
    tone: "bg-mint-100 text-mint-800",
  },
] as const;

export const EXAMPLE_SEARCHES = ["kruh", "tofu", "zobeno mlijeko", "biljni maslac", "veganski sir"] as const;
