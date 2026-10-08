/* eslint-disable @next/next/no-img-element */
import { hr } from "@/lib/i18n/hr";

// Calm dashed band with the recipe sources and the stores we compare (team "ticker").
const LOGOS = [
  { src: "/logos/coolinarika.svg", alt: "Coolinarika" },
  { src: "/logos/index.png", alt: "Index recepti", suffix: "recepti" },
  { src: "/logos/konzum.svg", alt: "Konzum" },
  { src: "/logos/lidl.svg", alt: "Lidl" },
  { src: "/logos/spar.svg", alt: "Spar" },
  { src: "/logos/kaufland.svg", alt: "Kaufland" },
  { src: "/logos/plodine.svg", alt: "Plodine" },
  { src: "/logos/dm.svg", alt: "dm" },
  { src: "/logos/biobio.svg", alt: "bio&bio" },
  { src: "/logos/tvornica.png", alt: "Tvornica zdrave hrane" },
];

export function Ticker() {
  return (
    <section className="ticker -mx-4 mt-10 overflow-hidden border-y-[1.5px] border-dashed border-ink/35 bg-cream py-4 sm:-mx-6" aria-label="Izvori recepata i trgovine">
      <p className="micro mb-3 text-center text-rind">{hr.home.ticker}</p>
      <div className="ticker-track flex w-max">
        {[0, 1].map((k) => (
          <div key={k} className="flex items-center gap-14 pr-14" aria-hidden={k === 1}>
            {LOGOS.map((l) => (
              <span key={l.src} className="flex items-center gap-2">
                <img src={l.src} alt={l.alt} className="h-6 w-auto opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0" />
                {l.suffix && <b className="font-heading text-lg text-ink/70">{l.suffix}</b>}
                <i className="ml-14 size-1.5 rounded-full bg-guava" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
