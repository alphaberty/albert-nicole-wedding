/**
 * CSS/SVG stand-in used when WebGL is unavailable. Same silhouette and palette
 * as the 3D chime, with a gentle CSS sway (disabled for reduced motion).
 */
export function StaticChime() {
  const tubes = [
    { x: 40, h: 150 },
    { x: 66, h: 118 },
    { x: 92, h: 134 },
    { x: 118, h: 104 },
    { x: 144, h: 160 },
  ]
  return (
    <div className="static-chime" aria-hidden="true">
      <svg viewBox="0 0 184 330" width="100%" height="100%">
        <defs>
          <linearGradient id="sc-red" x1="0" x2="1">
            <stop offset="0" stopColor="#7d1f1d" />
            <stop offset="0.45" stopColor="#B33532" />
            <stop offset="1" stopColor="#7d1f1d" />
          </linearGradient>
          <linearGradient id="sc-pink" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FBE1E7" />
            <stop offset="1" stopColor="#E7A9B8" />
          </linearGradient>
          <linearGradient id="sc-gold" x1="0" x2="1">
            <stop offset="0" stopColor="#9c8347" />
            <stop offset="0.5" stopColor="#E3CC8E" />
            <stop offset="1" stopColor="#9c8347" />
          </linearGradient>
          <filter id="sc-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="6" dy="14" stdDeviation="8" floodColor="#5a2a28" floodOpacity="0.18" />
          </filter>
        </defs>
        <g className="static-chime__sway" filter="url(#sc-shadow)">
          <line x1="92" y1="0" x2="92" y2="34" stroke="url(#sc-gold)" strokeWidth="2" />
          <circle cx="92" cy="36" r="5" fill="url(#sc-gold)" />
          <ellipse cx="92" cy="58" rx="60" ry="14" fill="url(#sc-pink)" />
          <ellipse cx="92" cy="64" rx="60" ry="14" fill="#E7A9B8" opacity="0.9" />
          <ellipse cx="92" cy="58" rx="60" ry="14" fill="url(#sc-pink)" />
          <ellipse cx="92" cy="58" rx="58" ry="12.5" fill="none" stroke="url(#sc-gold)" strokeWidth="1.2" />
          <text x="92" y="63" textAnchor="middle" fontSize="15" fill="#A52D2A" fontFamily="serif">
            囍
          </text>
          {tubes.map((t, i) => (
            <g key={i} className={`static-chime__tube static-chime__tube--${i}`}>
              <line x1={t.x} y1="70" x2={t.x} y2="100" stroke="#B59A5D" strokeWidth="1" />
              <rect x={t.x - 5} y="100" width="10" height={t.h} rx="5" fill="url(#sc-red)" />
              <rect x={t.x - 5.5} y="99" width="11" height="4" rx="2" fill="url(#sc-gold)" />
            </g>
          ))}
          <g className="static-chime__striker">
            <line x1="92" y1="70" x2="92" y2="176" stroke="#B59A5D" strokeWidth="1" />
            <ellipse cx="92" cy="180" rx="18" ry="6" fill="url(#sc-pink)" stroke="url(#sc-gold)" strokeWidth="1" />
            <line x1="92" y1="186" x2="92" y2="230" stroke="#B59A5D" strokeWidth="1" />
            <path d="M78 232 Q92 226 106 232 L104 292 Q92 300 80 292 Z" fill="url(#sc-red)" />
            <circle cx="92" cy="258" r="9" fill="#F1C5CF" />
            <text x="92" y="262" textAnchor="middle" fontSize="11" fill="#A52D2A" fontFamily="serif">
              囍
            </text>
            <circle cx="92" cy="304" r="3" fill="url(#sc-gold)" />
          </g>
        </g>
      </svg>
    </div>
  )
}
