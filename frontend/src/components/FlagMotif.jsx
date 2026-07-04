// A small decorative waving-flag motif — three vertical bands on a pole,
// clipped to a gentle wave silhouette. Colors are pulled from the theme
// (currentColor for the pole, CSS vars for the bands) so it stays in sync
// with the rest of the palette wherever it's dropped in.
export default function FlagMotif({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 180 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id="flagMotifShape">
          <path d="M10,20 C40,10 70,30 100,20 C130,10 150,25 170,18 L170,88 C150,95 130,80 100,90 C70,100 40,85 10,90 Z" />
        </clipPath>
      </defs>

      {/* pole */}
      <rect x="4" y="4" width="4" height="108" rx="2" fill="currentColor" opacity="0.45" />
      <circle cx="6" cy="6" r="5" fill="currentColor" opacity="0.6" />

      {/* waving cloth, three vertical bands clipped to a soft wave outline */}
      <g clipPath="url(#flagMotifShape)">
        <rect x="10" y="0" width="54" height="120" fill="var(--green-700)" />
        <rect x="64" y="0" width="54" height="120" fill="var(--paper-100)" />
        <rect x="118" y="0" width="54" height="120" fill="var(--green-700)" />
      </g>
    </svg>
  );
}