/** Large line-drawn leaf used as a quiet graphic on the home card. */
export function LeafArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className={className} aria-hidden>
      <path d="M176 24C96 22 34 64 30 132c-1 16 3 30 10 42 18-48 54-86 104-110C104 90 72 128 56 178c12 6 26 8 40 6 62-8 92-66 80-160Z" />
      <path d="M56 178C78 120 116 74 176 24" />
      <path d="M86 128c14 2 30 0 46-6" />
      <path d="M104 98c12 2 26 0 40-6" />
      <path d="M122 72c10 1 22-1 32-6" />
      <path d="M72 154c16 4 34 2 50-6" />
    </svg>
  );
}
