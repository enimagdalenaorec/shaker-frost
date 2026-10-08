# Vegan class audit

**What was checked.** A stratified random sample of the `vegan` class (active products, seed 2026):
every evidence type at least 40 products, 407 in total, out of 11,751 active products. Each product
was reviewed by name, brand, categories and the full ingredient text where one exists, and judged
'ok' when nothing in it is or likely is of animal origin. The reviewer is the model that wrote the
rules (Claude), not a human panel, so read this as a careful spot check, not a gold standard.
Sample with verdicts: `vegan_audit_sample.csv`.

**Result.** 406 of 407 correct (99.75 %, 95 % Wilson 98.6–100.0 %).
Weighted by stratum size: 99.72 %.

| evidence (stratum)                                                         |   products in class |   reviewed |   correct | precision   | 95 % Wilson   |
|:---------------------------------------------------------------------------|--------------------:|-----------:|----------:|:------------|:--------------|
| OFF analiza: vegan, svi sastojci prepoznati, naša provjera čista           |                1323 |         40 |        39 | 97.5 %      | 87.1–99.6 %   |
| OFF oznaka vegan                                                           |                1961 |         57 |        57 | 100.0 %     | 93.7–100.0 %  |
| jednosastojna biljna namirnica (izvedeno)                                  |                5393 |        156 |       156 | 100.0 %     | 97.6–100.0 %  |
| marka s isključivo biljnim asortimanom                                     |                 254 |         40 |        40 | 100.0 %     | 91.2–100.0 %  |
| naziv sadrži 'vegan'                                                       |                 273 |         40 |        40 | 100.0 %     | 91.2–100.0 %  |
| trgovina: 'Pogodno za vegane' + popis sastojaka bez životinjskih sastojaka |                2547 |         74 |        74 | 100.0 %     | 95.1–100.0 %  |

**The one false positive and its fix.** 'Kapsule za Cappuccino' (Bellarom, 4056489300854): OFF's
ingredient list says only 'roasted ground coffee', so OFF's analysis says vegan, but OFF also files it
under en:powdered-cappucino and such packs normally hold milk powder. Milky coffee and cocoa drinks
(cappuccino, latte, macchiato, mocha, frappé, 3u1, hot chocolate) now need explicit vegan evidence (label,
'vegan' in the name, plant-only brand, or the shop attribute with a clean ingredient list); the product
is now `potencijalno_vegan`.

**Rule gap found without a false positive.** 'MASLINE ZEL.PUNJ.PAPRIKOM' passed the single-ingredient rule
because the abbreviation 'punj.' (punjene) was not in the deny list; the product is vegan anyway. Fixed.

## Earlier rounds (before this sample)
Random reviews of 200-220 products per round, each followed by a fix:
- OFF vegan labels on non-vegan products (POP salama, 'Baguette peciva sa sirom', Knorr juha kokošja,
  gelatine gummies): the conflict rule sends contradicting evidence to `nesigurno`.
- Restricted-circulation barcodes: Lidl 20686321 (Chef Select ricotta tortelloni) carried a Vemondo OFF
  record; OFF links on prefix-2 codes now need a brand match (682 rejected).
- Names that look like staples: 'BANANICA' (chocolate candy), 'LJESNJAK KIFLICE' (pastry), 'SOMERSBY
  LUBENICA' (cider), 'KORLAT MARELICA 40%' (brandy): stems take only case endings, bakery and
  confectionery words deny, brands are stripped only for staple brands, liquid pack sizes pass only for
  oil, vinegar and water.
- Retailer attribute 'Pogodno za vegane' contradicted by the ingredient list: honey (7 products), pork
  gelatine, lactose, beeswax. The attribute alone never makes a product vegan.

## Not measured
Recall. `nesigurno` holds 44,445 products, mostly without any ingredient text or label; how many of
them are vegan is unknown. Reviews of that class found mainly drinks, sweets and alcohol without data.
