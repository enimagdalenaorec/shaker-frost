// Hand-written mock catalog (~50 products). Prices are FAKE; names are realistic.
// Built backwards from the demo recipes (sarma, palačinke, bolonjez, štrukli, kolač s jajima)
// and the "kruh" search demo. Replaced wholesale by the data teammate's export later.

export type Facets = { okus?: string; zasladeno?: string; namjena?: string; oblik?: string; obogaceno?: string };
// [energy_kcal, fat, saturated_fat, carbohydrates, sugars, proteins, salt, fiber] per 100 g/ml; null = unknown
export type Nutri = [number, number, number, number, number, number, number, number | null];

export type MockProduct = {
  id: string;
  name: string;
  brand: string;
  concept?: string;
  size: number | null;
  unit: "g" | "ml" | "kom";
  pack?: number;
  facets?: Facets;
  eko?: boolean;
  tags?: string[];
  base: number; // reference price in EUR before the chain factor
  chains: string[];
  akcija?: Record<string, number>; // chain → discount %
  onlyStores?: Record<string, string[]>; // chain → subset of its physical stores
  n?: Nutri | null;
  nsrc?: "deklaracija" | "web" | "procjena";
  status?: "vegan" | "probably";
  provjeri?: boolean;
  search: string;
  url?: string;
};

export const CONCEPTS: Record<string, [name: string, parent: string, group: string]> = {
  zobeno_mlijeko: ["zobeni napitak", "biljni napitci", "biljne alternative mlijeku"],
  sojino_mlijeko: ["sojin napitak", "biljni napitci", "biljne alternative mlijeku"],
  bademovo_mlijeko: ["bademov napitak", "biljni napitci", "biljne alternative mlijeku"],
  biljno_vrhnje_za_kuhanje: ["biljno vrhnje za kuhanje", "biljna vrhnja", "biljne alternative mlijeku"],
  biljno_kiselo_vrhnje: ["biljna alternativa kiselom vrhnju", "biljna vrhnja", "biljne alternative mlijeku"],
  biljni_jogurt: ["biljni jogurt", "biljni jogurti", "biljne alternative mlijeku"],
  veganski_maslac: ["biljni maslac", "masnoće za mazanje", "ostale biljne zamjene"],
  biljno_ulje: ["suncokretovo ulje", "jestiva ulja", "ulja"],
  kokosovo_ulje: ["kokosovo ulje", "jestiva ulja", "ulja"],
  tofu: ["tofu", "proizvodi od soje", "biljne alternative mesu"],
  mljevena_biljna_zamjena: ["biljna zamjena za mljeveno meso", "biljno meso", "biljne alternative mesu"],
  sojine_ljuskice: ["sojine ljuskice i granulat", "proizvodi od soje", "biljne alternative mesu"],
  veganske_kobasice: ["veganske kobasice", "biljno meso", "biljne alternative mesu"],
  veganski_sir: ["biljna alternativa siru", "biljni sirevi", "ostale biljne zamjene"],
  prehrambeni_kvasac: ["prehrambeni kvasac", "dodaci jelima", "ostale biljne zamjene"],
  zamjena_za_jaja: ["zamjena za jaja", "vezivna sredstva", "zamjene za jaja i vezivo"],
  laneno_sjeme: ["mljeveno laneno sjeme", "sjemenke", "zamjene za jaja i vezivo"],
  chia_sjemenke: ["chia sjemenke", "sjemenke", "zamjene za jaja i vezivo"],
  tjestenina_bez_jaja: ["tjestenina bez jaja", "tjestenina", "brašno, žitarice i tjestenina"],
  agavin_sirup: ["agavin sirup", "zaslađivači", "ostale biljne zamjene"],
  veganska_majoneza: ["veganska majoneza", "umaci", "ostale biljne zamjene"],
};

// Physical Zagreb stores for chains with store-level prices; others get one chain-wide / online row.
export const STORES: Record<string, [id: string, address: string | null][]> = {
  konzum: [["S01", "Ilica 231"], ["S02", "Savska cesta 56"], ["S03", "Avenija Dubrava 43"]],
  kaufland: [["K1", "Jankomir 31"], ["K2", "Zagrebačka avenija 104"]],
  spar: [["all", null]],
  lidl: [["all", null]],
  plodine: [["all", null]],
  dm: [["all", null]],
  biobio: [["online", null]],
  tzh: [["online", null]],
};

export const CHAIN_FACTOR: Record<string, number> = {
  lidl: 0.9, kaufland: 0.95, plodine: 0.98, dm: 1, konzum: 1.05, spar: 1.08, biobio: 1.15, tzh: 1.12,
};

const OAT_PLAIN: Nutri = [46, 1.5, 0.2, 6.7, 4.0, 1.0, 0.1, 0.8];

export const PRODUCTS: MockProduct[] = [
  // --- biljna mlijeka -------------------------------------------------------------------------
  { id: "2000000000011", name: "Alpro Napitak od zobi bez šećera 1 L", brand: "Alpro", concept: "zobeno_mlijeko", size: 1000, unit: "ml",
    facets: { okus: "bez okusa", zasladeno: "nezaslađeno", namjena: "opća", oblik: "tekuće" }, tags: ["gluten"], base: 2.49,
    chains: ["konzum", "spar", "kaufland", "dm"], akcija: { konzum: 20 }, n: OAT_PLAIN, search: "napitak od zobi | zobeno mlijeko | zobeni napitak | oat" },
  { id: "2000000000028", name: "Oatly Zobeni napitak 1 L", brand: "Oatly", concept: "zobeno_mlijeko", size: 1000, unit: "ml",
    facets: { okus: "bez okusa", zasladeno: "nezaslađeno", namjena: "opća", oblik: "tekuće" }, tags: ["gluten"], base: 2.79,
    chains: ["konzum", "spar"], n: [46, 1.5, 0.2, 6.6, 4.0, 1.0, 0.1, 0.8], search: "zobeni napitak | zobeno mlijeko | oat drink" },
  { id: "2000000000035", name: "Vemondo Zobeni napitak 1 L", brand: "Vemondo", concept: "zobeno_mlijeko", size: 1000, unit: "ml",
    facets: { okus: "bez okusa", zasladeno: "nezaslađeno", namjena: "opća", oblik: "tekuće" }, tags: ["gluten"], base: 1.49,
    chains: ["lidl"], n: [44, 1.4, 0.2, 6.5, 3.8, 0.9, 0.1, 0.8], search: "zobeni napitak | zobeno mlijeko" },
  { id: "2000000000042", name: "dmBio Zobeni napitak 1 L", brand: "dmBio", concept: "zobeno_mlijeko", size: 1000, unit: "ml",
    facets: { okus: "bez okusa", zasladeno: "nezaslađeno", namjena: "opća", oblik: "tekuće" }, eko: true, tags: ["gluten"], base: 1.65,
    chains: ["dm"], n: OAT_PLAIN, search: "zobeni napitak | zobeno mlijeko | bio" },
  { id: "2000000000059", name: "Alpro Napitak od zobi vanilija 1 L", brand: "Alpro", concept: "zobeno_mlijeko", size: 1000, unit: "ml",
    facets: { okus: "vanilija", zasladeno: "zaslađeno", namjena: "opća", oblik: "tekuće" }, tags: ["gluten"], base: 1.99,
    chains: ["konzum", "kaufland"], akcija: { kaufland: 25 }, n: [58, 1.5, 0.2, 9.5, 6.6, 1.0, 0.1, 0.8], search: "napitak od zobi vanilija | zobeno mlijeko" },
  { id: "2000000000066", name: "Alpro Sojin napitak original 1 L", brand: "Alpro", concept: "sojino_mlijeko", size: 1000, unit: "ml",
    facets: { okus: "bez okusa", zasladeno: "zaslađeno", namjena: "opća", oblik: "tekuće", obogaceno: "kalcij" }, tags: ["soja"], base: 2.29,
    chains: ["konzum", "spar", "kaufland", "plodine"], n: [39, 1.8, 0.3, 2.5, 2.5, 3.0, 0.09, 0.5], search: "sojin napitak | sojino mlijeko | soya" },
  { id: "2000000000073", name: "Vemondo Sojin napitak bez šećera 1 L", brand: "Vemondo", concept: "sojino_mlijeko", size: 1000, unit: "ml",
    facets: { okus: "bez okusa", zasladeno: "nezaslađeno", namjena: "opća", oblik: "tekuće" }, tags: ["soja"], base: 1.29,
    chains: ["lidl"], n: [33, 1.9, 0.3, 0.2, 0.1, 3.3, 0.05, 0.6], search: "sojin napitak | sojino mlijeko" },
  { id: "2000000000080", name: "Alpro Bademov napitak bez šećera 1 L", brand: "Alpro", concept: "bademovo_mlijeko", size: 1000, unit: "ml",
    facets: { okus: "bez okusa", zasladeno: "nezaslađeno", namjena: "opća", oblik: "tekuće" }, tags: ["orasi"], base: 2.69,
    chains: ["konzum", "dm"], n: [13, 1.1, 0.1, 0.0, 0.0, 0.4, 0.13, 0.2], search: "bademov napitak | bademovo mlijeko" },

  // --- vrhnja i jogurti -----------------------------------------------------------------------
  { id: "2000000000097", name: "Alpro Soya Cuisine biljno vrhnje za kuhanje 250 ml", brand: "Alpro", concept: "biljno_vrhnje_za_kuhanje", size: 250, unit: "ml",
    facets: { okus: "bez okusa", zasladeno: "nezaslađeno", namjena: "za kuhanje", oblik: "tekuće" }, tags: ["soja"], base: 1.59,
    chains: ["konzum", "spar", "kaufland", "plodine"], n: [176, 17, 2.0, 3.5, 0.5, 2.3, 0.1, 0.3], search: "vrhnje za kuhanje | biljno vrhnje | soya cuisine" },
  { id: "2000000000103", name: "Oatly Zobeno vrhnje za kuhanje 250 ml", brand: "Oatly", concept: "biljno_vrhnje_za_kuhanje", size: 250, unit: "ml",
    facets: { okus: "bez okusa", zasladeno: "nezaslađeno", namjena: "za kuhanje", oblik: "tekuće" }, tags: ["gluten"], base: 1.99,
    chains: ["konzum", "spar"], n: [150, 13, 1.0, 6.0, 1.5, 1.0, 0.1, 0.8], search: "vrhnje za kuhanje | zobeno vrhnje | oat cream" },
  { id: "2000000000110", name: "Vemondo Biljna alternativa vrhnju za kuhanje 200 ml", brand: "Vemondo", concept: "biljno_vrhnje_za_kuhanje", size: 200, unit: "ml",
    facets: { okus: "bez okusa", zasladeno: "nezaslađeno", namjena: "za kuhanje", oblik: "tekuće" }, tags: ["soja"], base: 0.99,
    chains: ["lidl"], n: [165, 16, 1.8, 3.2, 0.6, 2.4, 0.1, null], search: "vrhnje za kuhanje | biljno vrhnje" },
  { id: "biobio:10457", name: "Provamel Bio sojino vrhnje za kuhanje 250 ml", brand: "Provamel", concept: "biljno_vrhnje_za_kuhanje", size: 250, unit: "ml",
    facets: { okus: "bez okusa", zasladeno: "nezaslađeno", namjena: "za kuhanje", oblik: "tekuće" }, eko: true, tags: ["soja"], base: 2.39,
    chains: ["biobio", "tzh"], n: [170, 16.5, 2.0, 3.0, 0.4, 2.6, 0.1, null], search: "sojino vrhnje | vrhnje za kuhanje | bio", url: "https://www.biobio.hr/" },
  { id: "2000000000127", name: "Vemondo Biljna alternativa kiselom vrhnju 200 g", brand: "Vemondo", concept: "biljno_kiselo_vrhnje", size: 200, unit: "g",
    facets: { okus: "bez okusa", zasladeno: "nezaslađeno", namjena: "opća", oblik: "pasta ili namaz" }, tags: ["kokos"], base: 1.29,
    chains: ["lidl"], n: [190, 18, 16, 6.0, 1.5, 0.9, 0.2, null], search: "kiselo vrhnje | biljno kiselo vrhnje" },
  { id: "tzh:56597", name: "Bio Vegini Biljno kiselo vrhnje 200 g", brand: "Vegini", concept: "biljno_kiselo_vrhnje", size: 200, unit: "g",
    facets: { okus: "bez okusa", zasladeno: "nezaslađeno", namjena: "opća", oblik: "pasta ili namaz" }, eko: true, tags: ["soja"], base: 2.89,
    chains: ["tzh", "biobio"], n: [150, 14, 2.0, 4.0, 1.0, 2.5, 0.3, null], nsrc: "web", search: "kiselo vrhnje | biljno vrhnje | bio", url: "https://www.tvornicazdravehrane.com/" },
  { id: "2000000000134", name: "Alpro Biljni jogurt natural 500 g", brand: "Alpro", concept: "biljni_jogurt", size: 500, unit: "g",
    facets: { okus: "bez okusa", zasladeno: "nezaslađeno", namjena: "opća", oblik: "pasta ili namaz" }, tags: ["soja"], base: 2.19,
    chains: ["konzum", "spar", "kaufland"], n: [50, 2.3, 0.4, 2.1, 2.1, 4.0, 0.1, 1.0], search: "biljni jogurt | sojin jogurt | natural" },

  // --- masnoće --------------------------------------------------------------------------------
  { id: "2000000000141", name: "Flora Plant biljni maslac 250 g", brand: "Flora", concept: "veganski_maslac", size: 250, unit: "g",
    facets: { okus: "bez okusa", namjena: "za mazanje", oblik: "blok" }, base: 2.99,
    chains: ["konzum", "spar", "kaufland", "plodine"], akcija: { spar: 15 }, n: [640, 71, 30, 0.5, 0.5, 0.2, 0.4, null], search: "biljni maslac | veganski maslac | margarin" },
  { id: "biobio:20311", name: "Naturli Veganski blok za pečenje 200 g", brand: "Naturli", concept: "veganski_maslac", size: 200, unit: "g",
    facets: { okus: "bez okusa", namjena: "za pečenje", oblik: "blok" }, eko: true, tags: ["kokos"], base: 3.49,
    chains: ["biobio", "tzh", "dm"], n: [720, 80, 35, 0.5, 0.5, 0.5, 0.6, null], search: "veganski maslac | blok za pečenje | bio" },
  { id: "2000000000158", name: "Vemondo Biljni namaz 250 g", brand: "Vemondo", concept: "veganski_maslac", size: 250, unit: "g",
    facets: { okus: "bez okusa", namjena: "za mazanje", oblik: "pasta ili namaz" }, base: 1.49,
    chains: ["lidl"], n: [535, 59, 22, 0.5, 0.5, 0.1, 0.5, null], nsrc: "procjena", search: "biljni namaz | veganski maslac | margarin" },
  { id: "2000000000165", name: "Zvijezda Suncokretovo ulje 1 L", brand: "Zvijezda", concept: "biljno_ulje", size: 1000, unit: "ml",
    facets: { namjena: "za kuhanje", oblik: "tekuće" }, base: 2.19,
    chains: ["konzum", "spar", "kaufland", "plodine"], akcija: { plodine: 20 }, n: [828, 92, 10, 0, 0, 0, 0, 0], search: "suncokretovo ulje | ulje | biljno ulje" },
  { id: "2000000000172", name: "Vita D'or Suncokretovo ulje 1 L", brand: "Vita D'or", concept: "biljno_ulje", size: 1000, unit: "ml",
    facets: { namjena: "za kuhanje", oblik: "tekuće" }, base: 1.79,
    chains: ["lidl"], n: [828, 92, 10, 0, 0, 0, 0, 0], search: "suncokretovo ulje | ulje" },
  { id: "2000000000189", name: "dmBio Kokosovo ulje 200 ml", brand: "dmBio", concept: "kokosovo_ulje", size: 200, unit: "ml",
    facets: { okus: "kokos", namjena: "za kuhanje", oblik: "tekuće" }, eko: true, tags: ["kokos"], base: 3.95,
    chains: ["dm", "biobio"], n: [900, 100, 87, 0, 0, 0, 0, 0], search: "kokosovo ulje | ulje | bio" },

  // --- tofu i biljno meso ---------------------------------------------------------------------
  { id: "biobio:30125", name: "Taifun Bio dimljeni tofu 200 g", brand: "Taifun", concept: "tofu", size: 200, unit: "g",
    facets: { okus: "dimljeno", oblik: "blok" }, eko: true, tags: ["soja"], base: 3.29,
    chains: ["biobio", "tzh", "dm"], n: [180, 10.5, 1.6, 1.5, 0.5, 18, 1.0, 1.5], search: "dimljeni tofu | tofu | smoked" },
  { id: "2000000000196", name: "Vemondo Dimljeni tofu 200 g", brand: "Vemondo", concept: "tofu", size: 200, unit: "g",
    facets: { okus: "dimljeno", oblik: "blok" }, tags: ["soja"], base: 1.79,
    chains: ["lidl"], akcija: { lidl: 30 }, n: [175, 10, 1.5, 1.8, 0.6, 17, 1.1, 1.4], search: "dimljeni tofu | tofu" },
  { id: "2000000000202", name: "dmBio Tofu natur 200 g", brand: "dmBio", concept: "tofu", size: 200, unit: "g",
    facets: { okus: "bez okusa", oblik: "blok" }, eko: true, tags: ["soja"], base: 1.95,
    chains: ["dm"], n: [130, 7.5, 1.2, 1.0, 0.5, 14, 0.02, 1.0], search: "tofu natur | tofu | bio" },
  { id: "2000000000219", name: "K-take it veggie Tofu natur 400 g", brand: "K-take it veggie", concept: "tofu", size: 400, unit: "g",
    facets: { okus: "bez okusa", oblik: "blok" }, tags: ["soja"], base: 2.99,
    chains: ["kaufland"], n: [128, 7.2, 1.1, 1.2, 0.6, 13.5, 0.03, 1.1], search: "tofu natur | tofu" },
  { id: "tzh:61002", name: "Domaći tofu (na vagu)", brand: "Tvornica zdrave hrane", concept: "tofu", size: null, unit: "g",
    facets: { okus: "bez okusa", oblik: "blok" }, tags: ["soja"], base: 2.49,
    chains: ["tzh"], n: null, search: "tofu | domaći tofu", url: "https://www.tvornicazdravehrane.com/" },
  { id: "2000000000226", name: "Garden Gourmet Sensational mljeveno 200 g", brand: "Garden Gourmet", concept: "mljevena_biljna_zamjena", size: 200, unit: "g",
    facets: { okus: "bez okusa", oblik: "mljeveno" }, tags: ["soja"], base: 3.79,
    chains: ["konzum", "spar", "kaufland"], akcija: { konzum: 25 }, onlyStores: { konzum: ["S01", "S02"] },
    n: [190, 9, 0.8, 4, 1, 17, 1.1, 5], search: "biljno mljeveno meso | mljeveno | veggie mince" },
  { id: "2000000000233", name: "Beyond Meat Beyond Mince 300 g", brand: "Beyond Meat", concept: "mljevena_biljna_zamjena", size: 300, unit: "g",
    facets: { okus: "bez okusa", oblik: "mljeveno" }, base: 5.99,
    chains: ["konzum", "spar"], onlyStores: { konzum: ["S02"] }, n: [240, 17, 6, 4, 0.5, 17, 0.9, 2], search: "mljeveno | biljno meso | beyond mince | bez soje" },
  { id: "2000000000240", name: "Vemondo Veganska mljevena zamjena 300 g", brand: "Vemondo", concept: "mljevena_biljna_zamjena", size: 300, unit: "g",
    facets: { okus: "bez okusa", oblik: "mljeveno" }, tags: ["soja", "gluten"], base: 2.99,
    chains: ["lidl"], n: [185, 9.5, 1.0, 5, 1.5, 16, 1.2, 4], search: "mljeveno | biljno mljeveno meso" },
  { id: "tzh:58830", name: "Bio sojine ljuskice 250 g", brand: "Tvornica zdrave hrane", concept: "sojine_ljuskice", size: 250, unit: "g",
    facets: { okus: "bez okusa", oblik: "pahuljice" }, eko: true, tags: ["soja"], base: 2.49,
    chains: ["tzh", "biobio"], n: [345, 1.2, 0.2, 14, 7, 50, 0.03, 17], search: "sojine ljuskice | sojin granulat | soja" },
  { id: "2000000000257", name: "Zdravo Sojin granulat 200 g", brand: "Zdravo", concept: "sojine_ljuskice", size: 200, unit: "g",
    facets: { okus: "bez okusa", oblik: "pahuljice" }, tags: ["soja"], base: 1.69,
    chains: ["konzum", "plodine"], n: [340, 1.0, 0.2, 15, 7.5, 49, 0.05, 16], search: "sojin granulat | sojine ljuskice" },
  { id: "2000000000264", name: "Garden Gourmet Veganske kobasice 200 g", brand: "Garden Gourmet", concept: "veganske_kobasice", size: 200, unit: "g",
    facets: { okus: "začinjeno", oblik: "cijelo" }, tags: ["soja", "gluten"], base: 3.99,
    chains: ["konzum", "kaufland"], n: [230, 15, 1.5, 6, 1.0, 16, 1.8, 3], search: "veganske kobasice | kobasice | hrenovke" },
  { id: "2000000000271", name: "Vemondo Veganske kobasice dimljene 200 g", brand: "Vemondo", concept: "veganske_kobasice", size: 200, unit: "g",
    facets: { okus: "dimljeno", oblik: "cijelo" }, tags: ["soja", "gluten"], base: 2.29,
    chains: ["lidl"], n: [215, 14, 1.4, 5, 1.0, 15, 2.0, 3], search: "veganske kobasice | dimljene kobasice" },

  // --- sirevi i okusi -------------------------------------------------------------------------
  { id: "2000000000288", name: "Violife Prosociano za ribanje 150 g", brand: "Violife", concept: "veganski_sir", size: 150, unit: "g",
    facets: { okus: "bez okusa", oblik: "blok" }, tags: ["kokos"], base: 3.69,
    chains: ["konzum", "spar", "dm"], n: [285, 20, 18, 23, 0, 0.5, 2.0, 0], search: "veganski parmezan | biljni sir | violife" },
  { id: "2000000000295", name: "Simply V Ribani biljni sir 150 g", brand: "Simply V", concept: "veganski_sir", size: 150, unit: "g",
    facets: { okus: "bez okusa", oblik: "ribano" }, tags: ["kokos"], base: 2.49,
    chains: ["kaufland", "spar", "konzum"], akcija: { kaufland: 20 }, n: [280, 21, 19, 21, 0, 0.3, 2.1, 0], search: "ribani sir | biljni sir | veganski sir" },
  { id: "2000000000301", name: "Vemondo Veganski ribani 200 g", brand: "Vemondo", concept: "veganski_sir", size: 200, unit: "g",
    facets: { okus: "bez okusa", oblik: "ribano" }, tags: ["kokos"], base: 1.99,
    chains: ["lidl"], n: [290, 22, 19, 21, 0, 0.2, 2.0, null], status: "probably", provjeri: true, search: "ribani sir | biljni sir" },
  { id: "2000000000318", name: "Violife Original blok 200 g", brand: "Violife", concept: "veganski_sir", size: 200, unit: "g",
    facets: { okus: "bez okusa", oblik: "blok" }, tags: ["kokos"], base: 3.29,
    chains: ["konzum", "biobio"], n: [280, 23, 20, 20, 0, 0, 2.3, 0], search: "biljni sir | veganski sir | blok" },
  { id: "tzh:47710", name: "Prehrambeni kvasac listići 150 g", brand: "Tvornica zdrave hrane", concept: "prehrambeni_kvasac", size: 150, unit: "g",
    facets: { okus: "bez okusa", oblik: "pahuljice", obogaceno: "vitamini" }, eko: true, base: 4.49,
    chains: ["tzh", "biobio"], n: [380, 5, 1, 30, 0, 50, 0.1, 20], search: "prehrambeni kvasac | nutritional yeast | kvasac" },
  { id: "2000000000325", name: "dmBio Prehrambeni kvasac 150 g", brand: "dmBio", concept: "prehrambeni_kvasac", size: 150, unit: "g",
    facets: { okus: "bez okusa", oblik: "pahuljice" }, eko: true, base: 3.45,
    chains: ["dm"], n: [370, 4.5, 1, 32, 0, 48, 0.1, 21], search: "prehrambeni kvasac | kvasac" },

  // --- zamjene za jaja ------------------------------------------------------------------------
  { id: "tzh:52201", name: "Orgran No Egg zamjena za jaja 200 g", brand: "Orgran", concept: "zamjena_za_jaja", size: 200, unit: "g",
    facets: { oblik: "prah" }, base: 5.49,
    chains: ["tzh", "biobio", "dm"], n: [350, 0.2, 0, 85, 0, 0.5, 1.5, 5], search: "zamjena za jaja | no egg | vezivo" },
  { id: "2000000000332", name: "Vegan zamjena za jaja 125 g", brand: "Podravka", concept: "zamjena_za_jaja", size: 125, unit: "g",
    facets: { oblik: "prah" }, base: 2.29,
    chains: ["konzum"], n: null, search: "zamjena za jaja | vegan jaja" },
  { id: "2000000000349", name: "Biovega Mljeveno laneno sjeme 250 g", brand: "Biovega", concept: "laneno_sjeme", size: 250, unit: "g",
    facets: { oblik: "mljeveno" }, base: 1.89,
    chains: ["konzum", "spar", "plodine"], n: [530, 42, 4, 1.5, 1.5, 24, 0.1, 27], search: "laneno sjeme | mljeveni lan" },
  { id: "2000000000356", name: "dmBio Laneno sjeme mljeveno 200 g", brand: "dmBio", concept: "laneno_sjeme", size: 200, unit: "g",
    facets: { oblik: "mljeveno" }, eko: true, base: 1.65,
    chains: ["dm"], n: [520, 41, 4, 2, 1.5, 24, 0.1, 27], search: "laneno sjeme | lan | bio" },

  { id: "2000000000455", name: "Nutrigold Chia sjemenke 250 g", brand: "Nutrigold", concept: "chia_sjemenke", size: 250, unit: "g",
    facets: { oblik: "cijelo" }, base: 2.99,
    chains: ["konzum", "spar", "kaufland"], akcija: { spar: 20 }, n: [486, 31, 3.3, 8, 0, 17, 0.02, 34], search: "chia sjemenke | chia | sjemenke" },
  { id: "2000000000462", name: "Crownfield Chia sjemenke 200 g", brand: "Crownfield", concept: "chia_sjemenke", size: 200, unit: "g",
    facets: { oblik: "cijelo" }, base: 1.79,
    chains: ["lidl"], n: [490, 31, 3.4, 7.7, 0, 16.5, 0.02, 34], search: "chia sjemenke | chia" },
  { id: "2000000000479", name: "dmBio Chia sjemenke 200 g", brand: "dmBio", concept: "chia_sjemenke", size: 200, unit: "g",
    facets: { oblik: "cijelo" }, eko: true, base: 2.45,
    chains: ["dm"], n: [490, 31, 3.3, 8, 0, 17, 0.02, 34], search: "chia sjemenke | chia | bio" },
  { id: "tzh:60114", name: "Bio chia sjemenke 500 g", brand: "Tvornica zdrave hrane", concept: "chia_sjemenke", size: 500, unit: "g",
    facets: { oblik: "cijelo" }, eko: true, base: 5.49,
    chains: ["tzh"], n: [490, 31, 3.3, 8, 0, 17, 0.02, 34], search: "chia sjemenke | chia | bio", url: "https://www.tvornicazdravehrane.com/" },

  // --- ostalo ---------------------------------------------------------------------------------
  { id: "2000000000363", name: "Barilla Spaghetti n.5 500 g", brand: "Barilla", concept: "tjestenina_bez_jaja", size: 500, unit: "g",
    facets: { oblik: "sušeno" }, tags: ["gluten"], base: 1.69,
    chains: ["konzum", "spar", "kaufland", "plodine"], n: [359, 2, 0.5, 71, 3.5, 13, 0.01, 3], search: "spageti | tjestenina | pasta" },
  { id: "2000000000370", name: "Combino Spaghetti 500 g", brand: "Combino", concept: "tjestenina_bez_jaja", size: 500, unit: "g",
    facets: { oblik: "sušeno" }, tags: ["gluten"], base: 0.89,
    chains: ["lidl"], akcija: { lidl: 20 }, n: [357, 1.8, 0.4, 72, 3.2, 12.5, 0.01, 3], search: "spageti | tjestenina" },
  { id: "2000000000387", name: "dmBio Agavin sirup 250 ml", brand: "dmBio", concept: "agavin_sirup", size: 250, unit: "ml",
    facets: { zasladeno: "zaslađeno", oblik: "tekuće" }, eko: true, base: 3.25,
    chains: ["dm", "biobio"], n: [310, 0, 0, 76, 68, 0, 0, 0], search: "agavin sirup | zamjena za med | sirup" },
  { id: "2000000000394", name: "Zvijezda Veganska majoneza 250 ml", brand: "Zvijezda", concept: "veganska_majoneza", size: 250, unit: "ml",
    facets: { oblik: "pasta ili namaz" }, base: 2.39,
    chains: ["konzum", "spar"], n: [650, 70, 5, 3, 1.5, 0.5, 1.2, null], search: "veganska majoneza | majoneza" },

  // --- kruh (no concept: search-only) ---------------------------------------------------------
  { id: "2000000000400", name: "Kruh polubijeli 600 g", brand: "Pan-Pek", size: 600, unit: "g", base: 1.59,
    chains: ["konzum", "spar"], akcija: { konzum: 30 }, tags: ["gluten"], n: [250, 1.5, 0.3, 50, 2.5, 8, 1.2, 3], search: "kruh polubijeli | kruh | bijeli kruh" },
  { id: "2000000000417", name: "Kruh raženi 500 g", brand: "Lidl pekara", size: 500, unit: "g", base: 1.49,
    chains: ["lidl"], tags: ["gluten"], n: [210, 1.5, 0.3, 40, 2, 6.5, 1.1, 7], search: "kruh raženi | kruh | crni kruh" },
  { id: "2000000000424", name: "Tost kruh 500 g", brand: "Klara", size: 500, unit: "g", base: 1.39,
    chains: ["kaufland", "konzum"], tags: ["gluten"], n: [260, 3.5, 0.5, 48, 4, 8, 1.1, 3], search: "tost kruh | kruh za tost | kruh" },
  { id: "2000000000431", name: "Kukuruzni kruh 400 g", brand: "Plodine pekara", size: 400, unit: "g", base: 1.29,
    chains: ["plodine"], tags: ["gluten"], n: [240, 3, 0.5, 47, 2, 6, 1.0, 4], status: "probably", provjeri: true, search: "kukuruzni kruh | kruh" },
  { id: "biobio:40880", name: "Integralni kruh bez kvasca 500 g", brand: "bio&bio", size: 500, unit: "g", base: 3.49,
    chains: ["biobio"], eko: true, tags: ["gluten"], n: [230, 2, 0.4, 42, 2, 8.5, 1.0, 7], search: "integralni kruh | kruh bez kvasca | kruh | bio" },
  { id: "2000000000448", name: "Smjesa za kruh 1 kg", brand: "Podravka", size: 1000, unit: "g", base: 1.99,
    chains: ["konzum", "spar"], tags: ["gluten"], n: [350, 1.5, 0.3, 70, 1.5, 11, 1.5, 4], search: "smjesa za kruh | brašno za kruh" },
];
