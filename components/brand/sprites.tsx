// Shared illustrated characters (from the team's Lovable design), referenced via <use href="#id" />.
// <Sprites /> is mounted once in the root layout; <Character id="carrot" /> draws one anywhere.
// Style: flat fills, no outlines, slightly rough cut-paper edges (#rough filter), dot eyes.
const INK = "#1F1A20";
const Eyes = ({ x, y, gap = 20, r = 6 }: { x: number; y: number; gap?: number; r?: number }) => (
  <g fill={INK}>
    <ellipse cx={x - gap / 2} cy={y + 2} rx={r} ry={r * 1.1} />
    <ellipse cx={x + gap / 2} cy={y - 1} rx={r} ry={r * 1.1} />
  </g>
);

export const VIEWBOX = {
  carrot: "0 0 130 230",
  avocado: "0 0 150 190",
  sarma: "0 0 260 155",
  pea: "0 0 200 120",
  tofu: "0 0 150 140",
  almond: "0 0 120 200",
  oat: "0 0 120 200",
} as const;
export type CharId = keyof typeof VIEWBOX;

export function Sprites() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
      <defs>
        <filter id="rough" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="4" />
          <feDisplacementMap in="SourceGraphic" scale="3.2" />
        </filter>
      </defs>
      <symbol id="carrot" viewBox={VIEWBOX.carrot}>
        <g filter="url(#rough)">
          <path d="M62 50C44 38 38 22 44 8c12 2 19 14 22 30C70 16 84 6 94 12c0 16-10 28-26 38" fill="#5DBB4E" />
          <path d="M66 44C33 40 20 62 28 100c6 30 24 78 40 116 18-40 35-86 38-120 4-34-8-56-40-52Z" fill="#F08A3C" />
          <path d="M66 44C40 42 30 60 34 92c18-26 44-30 70-14 0-24-12-36-38-34Z" fill="#F6A55E" />
          <path d="M44 128l12-4m26 14 12 3m-44 22 9-3" stroke="#C9682A" strokeWidth="3" strokeLinecap="round" />
          <Eyes x={66} y={90} gap={26} r={5.5} />
        </g>
      </symbol>
      <symbol id="avocado" viewBox={VIEWBOX.avocado}>
        <g filter="url(#rough)">
          <path d="M75 6C52 5 42 24 35 45 27 66 9 87 10 117c0 39 27 66 66 66 40 0 67-25 67-66 0-29-18-54-25-72C110 23 98 7 75 6Z" fill="#5DBB4E" />
          <path d="M75 20C57 20 51 36 45 54 38 74 23 92 24 117c0 31 21 52 52 52s53-21 53-52c0-25-14-45-21-64-6-18-15-33-33-33Z" fill="#D9E3A5" />
          <circle cx="80" cy="112" r="27" fill="#7E5B52" />
          <path d="M53 108c22 4 38 20 42 30-4 2-10 4-15 4-15 0-27-12-27-27 0-3 0-5 0-7Z" fill="#60453D" />
          <Eyes x={72} y={70} gap={26} r={6} />
        </g>
      </symbol>
      <symbol id="sarma" viewBox={VIEWBOX.sarma}>
        <g filter="url(#rough)">
          <ellipse cx="132" cy="96" rx="114" ry="52" fill="#F4F0E8" />
          <ellipse cx="132" cy="96" rx="94" ry="38" fill="#EADFC8" />
          <path d="M49 84c7-18 43-27 71-15 16 7 18 21 9 33-15 18-65 19-80 0-5-6-6-12 0-18Z" fill="#8DB364" />
          <path d="M127 91c10-23 60-30 86-13 13 8 11 24-2 32-23 15-70 12-82-4-4-5-5-10-2-15Z" fill="#6E9B4B" />
          <path d="M57 91c26-12 42-12 67-5m15 15c25-16 48-17 70-10" fill="none" stroke="#B9D58E" strokeWidth="3" strokeLinecap="round" />
          <Eyes x={88} y={82} gap={16} r={3.5} />
          <Eyes x={172} y={86} gap={16} r={3.5} />
        </g>
      </symbol>
      <symbol id="pea" viewBox={VIEWBOX.pea}>
        <g filter="url(#rough)">
          <path d="M12 62C28 18 152 6 190 38c-14 54-152 72-178 24Z" fill="#4E9E3F" />
          <path d="M186 40c6-10 4-22-6-28" fill="none" stroke="#4E9E3F" strokeWidth="5" strokeLinecap="round" />
          {[52, 100, 146].map((cx, i) => (
            <g key={cx}>
              <circle cx={cx} cy={48 - i * 3} r="22" fill="#9BD06A" />
              <Eyes x={cx} y={44 - i * 3} gap={14} r={3.6} />
            </g>
          ))}
        </g>
      </symbol>
      <symbol id="tofu" viewBox={VIEWBOX.tofu}>
        <g filter="url(#rough)">
          <path d="M20 46 62 22l70 16v66l-42 26-70-18Z" fill="#F3E6C4" />
          <path d="M90 62v68l42-26V38Z" fill="#E2CF9E" />
          <path d="M20 46 62 22l70 16-42 24Z" fill="#FBF3DC" />
          <Eyes x={55} y={84} gap={22} r={5} />
        </g>
      </symbol>
      <symbol id="almond" viewBox={VIEWBOX.almond}>
        <g filter="url(#rough)">
          <path d="M22 54 40 30h40l18 24v136H22Z" fill="#F7EFE2" />
          <path d="M40 30V14h40v16Z" fill="#D77F72" />
          <path d="M80 30l18 24v136h-14V54Z" fill="#E8DCC8" />
          <rect x="22" y="120" width="62" height="70" fill="#C69A6B" />
          <path d="M56 62c18 6 18 36 0 46-18-10-18-40 0-46Z" fill="#9A6B44" />
          <Eyes x={53} y={140} gap={20} r={4.5} />
          <text x="53" y="180" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fontWeight="700" fill="#F7EFE2">BADEM</text>
        </g>
      </symbol>
      <symbol id="oat" viewBox={VIEWBOX.oat}>
        <g filter="url(#rough)">
          <path d="M22 54 40 30h40l18 24v136H22Z" fill="#F7EFE2" />
          <path d="M40 30V14h40v16Z" fill="#E4C879" />
          <path d="M80 30l18 24v136h-14V54Z" fill="#E8DCC8" />
          <rect x="22" y="120" width="62" height="70" fill="#8FB1C7" />
          <path d="M54 110V66" stroke="#B8962F" strokeWidth="3" strokeLinecap="round" />
          {[70, 80, 90].map((y) => (
            <g key={y} fill="#E4C879">
              <ellipse cx="46" cy={y} rx="7" ry="4" transform={`rotate(-35 46 ${y})`} />
              <ellipse cx="62" cy={y} rx="7" ry="4" transform={`rotate(35 62 ${y})`} />
            </g>
          ))}
          <Eyes x={53} y={140} gap={20} r={4.5} />
          <text x="53" y="180" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fontWeight="700" fill="#F7EFE2">ZOB</text>
        </g>
      </symbol>
    </svg>
  );
}

export function Character({ id, className, label }: { id: CharId; className?: string; label?: string }) {
  return (
    <svg className={className} viewBox={VIEWBOX[id]} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <use href={`#${id}`} />
    </svg>
  );
}
