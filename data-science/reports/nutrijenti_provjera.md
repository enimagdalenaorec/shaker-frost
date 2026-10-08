# Provjera dopune nutrijenata (CIQUAL naspram prosjeka sličnih)

Generira `scripts/11d_report.py` iz `11b_nutrition_fill.py` i `11c_web_check.py`.
Kriterij: udio proizvoda s kcal unutar 10 % stvarne etikete, plus medijan apsolutne greške (MAE) po nutrijentu
(g na 100 g, kcal na 100 g). Obje metode se mjere na istim proizvodima.

## 1. Sakrivene etikete (svi proizvodi gdje obje metode daju vrijednost)

Vegan i potencijalno vegan proizvodi s potpunom etiketom: 7700, od toga obje metode: 4589.
Kod prosjeka sličnih izbačen je sam proizvod i sva njegova druga pakiranja (isti proizvod).

| segment           |    n |   CIQUAL unutar 10 % kcal |   CIQUAL MAE kcal |   CIQUAL MAE fat |   CIQUAL MAE carbohydrates |   CIQUAL MAE protein |   CIQUAL MAE sugars |   CIQUAL MAE salt |   prosjek_slicnih unutar 10 % kcal |   prosjek_slicnih MAE kcal |   prosjek_slicnih MAE fat |   prosjek_slicnih MAE carbohydrates |   prosjek_slicnih MAE protein |   prosjek_slicnih MAE sugars |   prosjek_slicnih MAE salt |
|:------------------|-----:|--------------------------:|------------------:|-----------------:|---------------------------:|---------------------:|--------------------:|------------------:|-----------------------------------:|---------------------------:|--------------------------:|------------------------------------:|------------------------------:|-----------------------------:|---------------------------:|
| osnovne namirnice | 1604 |                      76.4 |              12   |             0.5  |                        2.6 |                 0.68 |                0.75 |              0.02 |                               81.2 |                          7 |                      0.34 |                                 1.6 |                           0.5 |                          0.4 |                       0.01 |
| pića              |  412 |                      43.2 |               4.8 |             0.13 |                        1.3 |                 0.17 |                1.05 |              0.01 |                               57.3 |                          3 |                      0    |                                 0.7 |                           0.1 |                          0.6 |                       0.01 |
| prerađeno         | 2573 |                      53.7 |              24   |             2.1  |                        4.7 |                 1.06 |                2.64 |              0.21 |                               64.2 |                         17 |                      1.4  |                                 3   |                           0.8 |                          1.8 |                       0.11 |
| ukupno            | 4589 |                      60.7 |              16   |             0.98 |                        3.3 |                 0.75 |                1.42 |              0.09 |                               69.5 |                         10 |                      0.6  |                                 2.1 |                           0.5 |                          1   |                       0.05 |

Uzorak od 50 (17 / 17 / 16 po skupini, isti proizvodi za obje metode):

| segment           |   n |   CIQUAL unutar 10 % kcal |   CIQUAL MAE kcal |   CIQUAL MAE fat |   CIQUAL MAE carbohydrates |   CIQUAL MAE protein |   CIQUAL MAE sugars |   CIQUAL MAE salt |   prosjek_slicnih unutar 10 % kcal |   prosjek_slicnih MAE kcal |   prosjek_slicnih MAE fat |   prosjek_slicnih MAE carbohydrates |   prosjek_slicnih MAE protein |   prosjek_slicnih MAE sugars |   prosjek_slicnih MAE salt |
|:------------------|----:|--------------------------:|------------------:|-----------------:|---------------------------:|---------------------:|--------------------:|------------------:|-----------------------------------:|---------------------------:|--------------------------:|------------------------------------:|------------------------------:|-----------------------------:|---------------------------:|
| osnovne namirnice |  17 |                      82.4 |               5   |             0.4  |                       3.7  |                 1.1  |                0.67 |              0.05 |                               76.5 |                      13.5  |                       0.4 |                                1.67 |                          0.67 |                         0.6  |                       0.04 |
| pića              |  17 |                      47.1 |               6.3 |             0.13 |                       1.79 |                 0.13 |                1.28 |              0.01 |                               47.1 |                       3    |                       0   |                                0.7  |                          0.1  |                         0.7  |                       0.01 |
| prerađeno         |  16 |                      75   |              15.5 |             2.04 |                       2.9  |                 1.11 |                1.65 |              0.33 |                               93.8 |                      11.21 |                       1   |                                2.9  |                          1.8  |                         2.05 |                       0.25 |
| ukupno            |  50 |                      68   |               7.4 |             0.37 |                       2.15 |                 0.35 |                1.21 |              0.06 |                               72   |                       7.5  |                       0.3 |                                1.58 |                          0.26 |                         1    |                       0.02 |

Pobjednik po skupini (popunjava prvi, drugi izvor samo ono što ostane prazno): {'osnovne namirnice': 'knn', 'pića': 'knn', 'prerađeno': 'knn'}.

## 2. Točne etikete s weba (50 proizvoda bez etikete)

50 proizvoda traženo, točna etiketa s URL-om nađena za 26.

| segment           |   n |   CIQUAL unutar 10 % kcal |   CIQUAL MAE kcal |   prosjek_slicnih unutar 10 % kcal |   prosjek_slicnih MAE kcal |
|:------------------|----:|--------------------------:|------------------:|-----------------------------------:|---------------------------:|
| osnovne namirnice |  11 |                      90.9 |               2   |                               81.8 |                          5 |
| pića              |   6 |                      66.7 |               2   |                               66.7 |                          2 |
| prerađeno         |   9 |                      44.4 |              12   |                               55.6 |                          9 |
| ukupno            |  26 |                      69.2 |               6.4 |                               69.2 |                          4 |

Pojedinačno (`data/work/nutrijenti_web.csv`):

| name                                            | segment           |   web_kcal |   ciqual_kcal |   knn_kcal | web_url                                                                                          |
|:------------------------------------------------|:------------------|-----------:|--------------:|-----------:|:-------------------------------------------------------------------------------------------------|
| Riso Gallo riža carnaroli 500 g                 | osnovne namirnice |        348 |         350   |      348   | https://us.britishessentials.com/products/gallo-carnaroli-risotto-rice-500g                      |
| GROŽĐICE 100 g ŠAFRAM (15)                      | osnovne namirnice |        299 |         322   |      326   | https://www.robin.hr/proizvodi/1044/susene-grozdjice-safram-200-g                                |
| VANILIN ŠEĆER 5+1 GRATIS DR.OETKER              | osnovne namirnice |        395 |         397   |      397.5 | https://podravkagrupa.com/hr/proizvod/vanilin-secer/                                             |
| Rajčica grapolo                                 | osnovne namirnice |         18 |          19.2 |       23   | https://www.robin.hr/proizvodi/493/rajcica-1kg                                                   |
| KBio.Riža bijela dug.zrna Parboiled 1kg         | osnovne namirnice |        363 |         361   |      352   | https://fddb.info/db/de/lebensmittel/kaufland_bio_kaufland_bio_parboiled_reis_1468069/index.html |
| ULJE OMEGOL 490 ml ZVIJEZDA                     | osnovne namirnice |        828 |         899   |      828   | https://www.konzum.hr/web/products/omegol-biljno-ulje-1-l                                        |
| LJEŠNJAK MLIJEČNA ČOKOLA.100 g                  | osnovne namirnice |        535 |         632   |      644   | https://zvecevo.hr/en/products/samo-ti/samo-ti-hazelnut/                                         |
| ULJE SUNCOKRETOVO TENA 5 L                      | osnovne namirnice |        828 |         900   |      828   | https://voli.me/proizvod/2424                                                                    |
| BROKULA SMRZ.400 g PODRAVKA                     | osnovne namirnice |         28 |          26.4 |       29   | https://www.podravkagrupa.com/hr/proizvod/brokula/                                               |
| GRIS.TORINESE RESTOR.300g                       | osnovne namirnice |        384 |         350   |      347   | https://world.openfoodfacts.org/product/8005221302348                                            |
| ULJE SUNCOKRET 1L PLUTUS                        | osnovne namirnice |        899 |         900   |      828   | https://nibelung-enterprise.com/hr/proizvodi/                                                    |
| PIVO ZMAJSKO 0,33 L PORTER                      | pića              |         43 |          39   |       42   | https://world.openfoodfacts.org/product/3857500024121/porter                                     |
| SOK NUTRINO JAB I BRES 200ml                    | pića              |         60 |          46.8 |       43   | https://nutrinofood.com/en/proizvodi/nutrino-juice-apple-and-peach-200ml/                        |
| *PIVO CHOUFFE HOUBLON 0.33L -24/1-              | pića              |         84 |          39   |       42   | https://world.openfoodfacts.org/product/5410769300085/chouffe                                    |
| MINERALNA VODA JAMNICA 1 L                      | pića              |          0 |           0   |        0   | https://world.openfoodfacts.org/product/3858890873054                                            |
| PIVO STIEGL COLUMBUS PALE ALE 0,33 L NB         | pića              |         39 |          39   |       42   | https://fddb.info/db/de/lebensmittel/stiegl_columbus/index.html                                  |
| VODA NEGAZIRANA SANT'ANNA 0,5 L                 | pića              |          0 |           0   |        0   | https://it.openfoodfacts.org/product/8020141800002/acqua-minerale-naturale-sant-anna             |
| KRASTAVCI DOORA DELIKAT.1580 g                  | prerađeno         |         13 |          16   |       14   | https://www.konzum.hr/web/products/doora-krastavac-delikates-290g                                |
| ORBIT REFRESHERS TROPICAL 15,6g                 | prerađeno         |        170 |         263   |      148.5 | https://www.piccantino.com/orbit/refreshers-tropical                                             |
| ČOK.LINDT ZL.ZEC VREĆ.105 g                     | prerađeno         |        564 |         552   |      591   | https://world.openfoodfacts.org/api/v2/product/9003600561668.json                                |
| PRALINE BOERO TAM.ČOK. WHISKEY 95 g WITORS (24) | prerađeno         |        412 |         558   |      538   | https://www.witors.it/en/products/boero-crema-whisky                                             |
| CIMET 20 g                                      | prerađeno         |         22 |         243   |      272   | https://aleva.rs/monozacini/cimet-mleveni/                                                       |
| NAPITAK OD RIŽE BIO 1l                          | prerađeno         |         61 |          52.2 |       52   | https://www.fatsecret.it/calorie-nutrizione/sunny-nature/bevanda-di-riso-bio/100ml               |
| MASLINE ZELENE BADEM 320/170 g OLYMP            | prerađeno         |        178 |         164   |      175   | https://atidelicates.cz/en/products/olives/olymp-green-olives-stuffed-with-almond__s42x271.html  |
| dmBio napitak od zobi 1 l, 8 kom VE             | prerađeno         |         42 |          41   |       42   | https://www.dm.hr/p/d/3048025/dmbio-napitak-od-zobi-bez-glutena-8-x-1-l                          |
| BIO ZOBENE PAHULJICE 500 g ADV                  | prerađeno         |        372 |         369   |      372   | https://www.tommy.hr/proizvodi/zobene-pahuljice-500-g-sitne-prima-vita-advent-1                  |

## 3. Korak 5: ostatak (11f razvrstavanje, Tavily + Sonnet, primjena u `11e_web_fill.py`)

Proizvodi s <= 4 od 7 vrijednosti nakon koraka 3 i 4, razvrstani modelom (`11f_gap_triage.py`):

| vrsta         |   proizvoda |   ciqual_po_nazivu |
|:--------------|------------:|-------------------:|
| caj           |         131 |                  0 |
| dodatak       |         399 |                  0 |
| genericko     |         411 |                253 |
| marka         |         345 |                  0 |
| neprehrambeno |         122 |                  0 |

Web (Tavily + Sonnet bez alata) za vrstu 'marka': 345 traženo, točna etiketa s URL-om 31. Pića iznad 1,2 % alkohola nemaju obveznu deklaraciju, pa za njih vrijedi pravilo vrste pića; web etikete koje ne prolaze provjeru iz koraka 7 nisu korištene.

## 4. Dopuna djelomičnih etiketa do svih 7

Proizvodi s 1-6 od 7 vrijednosti dobivaju ostatak (`11e_web_fill.py`): kcal formulom iz etikete ili jedan makronutrijent iz ostatka kcal (`izracun_etiketa`); zasićene = masti x tipični omjer, šećeri = UH x tipični omjer, sol = medijan, ostali makronutrijenti iz profila skupine skaliranog na kcal proizvoda (`omjer_slicnih`; skupina = koncept, obitelj, segment, svi). Bez kcal oslonca popunjava se samo unutar koncepta, inače proizvod ostaje djelomičan (`etiketa_nepotpuna`).

Provjera: potpune etikete, jedno polje sakriveno (granica: 10 % ili 1 g; kcal 10 kcal; sol 0,1 g):

| field         |    n |   unutar_granice_pct |   mae |
|:--------------|-----:|---------------------:|------:|
| kcal          | 3000 |                 94.3 | 1.8   |
| protein       | 3000 |                 71.7 | 0.431 |
| salt          | 3000 |                 54.3 | 0.086 |
| saturated_fat | 3000 |                 83.4 | 0.1   |
| sugars        | 3000 |                 59.3 | 0.848 |

## 5. Isti proizvod u više trgovina / pakiranja

Grupe (isti naziv bez količine i pakiranja + ista marka u nazivu): {'usklađeno': 1820, 'etikete se razlikuju': 204, 'bez etikete': 2173}.
Usklađene grupe dobivaju prosjek etiketa, pa isti proizvod ima iste vrijednosti u svakoj trgovini; izvorna
etiketa je u `<nutrijent>_etiketa`. Grupe s etiketama koje se razlikuju > 10 % kcal nisu korištene.
Kontrola: parovi takvih proizvoda s etiketom slažu se unutar 10 % kcal u 85 % slučajeva; ista etiketa iz
trgovine i iz OFF-a za isti barkod slaže se u 92 % (gornja granica zbog šuma etiketa).

## 6. Rezultat

Primijenjeno u 11b (broj proizvoda po izvoru): {'prosjek_slicnih': 3072, 'ciqual_koncept': 3488, 'ciqual_vrsta_pica': 1964}; 11e je zatim dodao `ciqual_naziv` i `web`.
Brojke ispod su iz 11b; konačno stanje (oznake izvora, razlozi praznina) je u `report/data_facts.md`.

| vegan_class        |     n |   svih7 |   djelomicno |   nista |
|:-------------------|------:|--------:|-------------:|--------:|
| potencijalno_vegan |  6919 |    6106 |          316 |     497 |
| vegan              | 11834 |   10504 |          654 |     676 |

Izvor kcal (vegan + potencijalno vegan):

| kcal_src          |    n |
|:------------------|-----:|
| OFF               | 6314 |
| ciqual_koncept    | 3151 |
| trgovina          | 2691 |
| prosjek_slicnih   | 2591 |
| ciqual_vrsta_pica | 1849 |
| nan               | 1188 |
| isti_proizvod     |  949 |
| trgovina_povezano |   20 |

## Napomene

Popravljeno 2026-10-08:
- Standardizacija: boce žestokih pića (`scripts/spirits.py`) ne dobivaju koncept hrane (prije VODKA BELUGA ->
  leca_crna, WHISKEY ... ORIGINAL -> origano, JACK DANIELS FIRE -> cimet, DE KUYPER APRICOT -> marelica).
- Standardizacija: koncepti voća i povrća isključuju pekarske proizvode i gotova jela (štrudla, savijača, pita,
  tart, kroasan, muffin, vafl, varivo, tortelini, namaz, kruh); zapisano u `ispravke` u `vocab/koncepti_B.json`.
  Margarin isključuje 'margarita' (`vocab/ispravke_A.json`).
- Vegan klasa: proizvodi s gramima ili riječju hrane (praline, keks, desert, šećer, začin za gin...) nisu
  'čisto žestoko piće' (`SPIRITS_NOT_DRINK` u `vegan_lexicon.py`).
- 117 neprehrambenih artikala (pelene, deterdženti, kozmetika, eterična ulja, igračke) ručno označeno kao
  'nije_hrana' (`vocab/neprehrambeno.json`, primjenjuje `05_products.py`).
- Duplikati: barkod od samih nula više nije ključ, OFF daje jedan zapis po barkodu (03, 04c, 05, 08).
- Miješani izvori: procijenjeno polje se usklađuje s etiketom (zasićene <= masti, šećeri <= UH), 25 polja.
- Web etikete piva i žestica više ne padaju na provjeri kcal (alkohol nosi kalorije).

Ostaje (namjerno ili izvan dosega):
- Kava i čaj: etikete navode pripremljeni napitak, CIQUAL suhi proizvod (dogovoreno, u redu).
- 14 etiketa (OFF / trgovina) gdje su zasićene > masti ili šećeri > UH na samoj etiketi: greška etikete,
  ostaje označena 'provjeriti' u `nutrition_note`.
- Blitva na težinu je sparena s kuhanom blitvom: CIQUAL nema sirovi list, to je najbliža hrana.
- Unutar 10 % je strog kriterij za namirnice s malo kcal (povrće 20 kcal: dozvoljeno ±2 kcal).
