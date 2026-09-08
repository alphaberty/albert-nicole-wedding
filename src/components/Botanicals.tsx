/**
 * Line-art botanicals in the style of the invitation: fine red strokes,
 * open blossoms, leaves, and a small perched bird. Purely decorative.
 */

function Blossom({ x, y, r, rotate = 0 }: { x: number; y: number; r: number; rotate?: number }) {
  const petals = Array.from({ length: 6 }, (_, i) => i * 60)
  const inner = Array.from({ length: 5 }, (_, i) => i * 72 + 30)
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      {petals.map((a) => (
        <path
          key={a}
          transform={`rotate(${a}) scale(${r / 40})`}
          d="M0 0 C -16 -8 -34 -26 -22 -42 C -12 -54 6 -46 4 -30 C 3 -18 2 -8 0 0 Z"
        />
      ))}
      {inner.map((a) => (
        <path
          key={a}
          transform={`rotate(${a}) scale(${(r / 40) * 0.55})`}
          d="M0 0 C -14 -6 -30 -22 -20 -36 C -12 -46 4 -40 3 -26 C 2 -16 1 -6 0 0 Z"
        />
      ))}
      <circle r={r * 0.11} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <circle key={i} cx={Math.cos(i * 0.9) * r * 0.2} cy={Math.sin(i * 0.9) * r * 0.2} r={r * 0.028} fill="currentColor" />
      ))}
    </g>
  )
}

function Leaf({ x, y, rotate = 0, s = 1 }: { x: number; y: number; rotate?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${s})`}>
      <path d="M0 0 C 12 -30 38 -44 66 -36 C 48 -14 26 -2 0 0 Z" />
      <path d="M0 0 C 20 -22 40 -30 64 -35" />
      <path d="M18 -10 C 24 -18 30 -22 38 -26" />
      <path d="M30 -4 C 36 -12 44 -18 52 -22" />
    </g>
  )
}

function Bird({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      {/* body */}
      <path d="M0 0 C -18 -4 -34 8 -36 22 C -37 34 -26 42 -12 40 C 2 38 12 30 16 20 C 20 10 14 2 0 0 Z" />
      {/* head */}
      <path d="M0 0 C 2 -12 12 -18 22 -14 C 30 -10 30 2 22 6 C 16 9 8 8 4 4" />
      {/* beak */}
      <path d="M28 -8 L 40 -6 L 29 -1" />
      {/* eye */}
      <circle cx="19" cy="-8" r="1.6" fill="currentColor" />
      {/* wing */}
      <path d="M-8 6 C -22 8 -30 20 -26 32 C -18 26 -6 20 4 12" />
      <path d="M-14 12 C -20 18 -22 24 -21 30" />
      {/* tail */}
      <path d="M-34 24 C -48 30 -60 38 -68 48 C -54 44 -44 42 -30 40" />
      <path d="M-40 30 C -50 36 -56 42 -60 46" />
      {/* feet + branch */}
      <path d="M-4 40 L -6 48 M 4 39 L 4 48" />
      <path d="M-40 50 C -20 46 10 46 40 52 C 60 56 80 58 96 54" />
      <path d="M20 49 C 26 42 34 40 40 42" />
    </g>
  )
}

function Spray({ mirror = false }: { mirror?: boolean }) {
  return (
    <svg viewBox="0 0 420 420" className={`botanical ${mirror ? 'botanical--br' : 'botanical--tl'}`} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-10 60 C 60 80 110 140 150 220 C 180 280 200 340 210 420" />
        <path d="M60 90 C 100 60 140 40 190 30" />
        <path d="M150 220 C 200 200 250 190 300 200" />
        <Blossom x={190} y={40} r={44} rotate={12} />
        <Blossom x={92} y={165} r={34} rotate={-30} />
        <Blossom x={300} y={205} r={40} rotate={40} />
        <Blossom x={30} y={40} r={22} rotate={70} />
        <Leaf x={110} y={130} rotate={-50} s={0.9} />
        <Leaf x={150} y={230} rotate={40} s={0.8} />
        <Leaf x={215} y={330} rotate={-70} s={0.7} />
        <Leaf x={250} y={120} rotate={-10} s={0.6} />
        <Bird x={300} y={100} s={0.9} />
      </g>
    </svg>
  )
}

export function Botanicals() {
  return (
    <div className="botanicals" aria-hidden="true">
      <Spray />
      <Spray mirror />
    </div>
  )
}
