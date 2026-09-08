/**
 * A small, self-contained simulation of a hanging chime.
 *
 * Every hanging piece is a damped pendulum, tracked as the horizontal
 * displacement of its lower end (x, z) rather than as angles. That keeps the
 * maths cheap, and for the modest swing angles of a chime it is visually
 * indistinguishable.
 *
 *  - The whole chime hangs from a pivot on its cord and sways as one body.
 *    When it accelerates, everything hanging from it lags behind by inertia.
 *  - Five lettered plaques hang from the canopy; a striker in the middle
 *    knocks them, they knock each other, and each twists on its thread.
 *  - A ring of small pendants around the rim swings fast and light.
 *  - Wind mostly pushes the paper sail, the sail tugs the striker.
 */

export const CHIME = {
  plaqueCount: 5,
  ringRadius: 0.66,
  /** Half-width used for plaque contacts. */
  plaqueRadius: 0.24,
  plaqueHeights: [1.25, 0.95, 1.12, 0.85, 1.35],
  plaqueWidths: [0.5, 0.44, 0.48, 0.42, 0.54],
  stringLength: 0.5,
  strikerRadius: 0.3,
  /** Longer than the plaques' pendulums so it swings out of phase and meets them. */
  strikerString: 1.3,
  sailString: 0.72,
  discRadius: 0.95,
  pendantCount: 8,
  pendantRadius: 0.86,
  pendantString: 0.32,
  /** The cord pivot sits this far above the canopy; the whole chime swings about it. */
  pivotHeight: 2.6,
  gravity: 9.81,
}

export interface Pendulum {
  x: number
  z: number
  vx: number
  vz: number
  /** Effective pendulum length (pivot to centre of mass). */
  len: number
  mass: number
  /** Linear damping. */
  damping: number
  /** Quadratic air drag: big swings die faster than small ones. */
  airDrag: number
  /** How strongly wind pushes this piece. */
  drag: number
  /** Swing limit as a fraction of length. */
  limit: number
}

export interface Twist {
  a: number
  v: number
}

export interface ChimeState {
  /** Sway of the whole chime about the cord pivot (world frame). */
  body: Pendulum
  plaques: Pendulum[]
  twists: Twist[]
  pendants: Pendulum[]
  pendantTwists: Twist[]
  striker: Pendulum
  /** Displacement relative to the striker. */
  sail: Pendulum
  spin: number
  spinVel: number
  time: number
  touching: boolean[]
  pairTouching: boolean[]
  accumulator: number
}

export interface StepInput {
  /** Extra wind impulse this frame (added to velocity, scene units/s). */
  impulseX: number
  impulseZ: number
  spinImpulse: number
  /** 0 = still air, 1 = normal breeze. */
  ambient: number
}

export type StrikeHandler = (plaque: number, velocity: number) => void

const SUBSTEP = 1 / 120
const N = CHIME.plaqueCount
const P = CHIME.pendantCount

function pendulum(len: number, mass: number, damping: number, airDrag: number, drag: number, limit = 0.5): Pendulum {
  return { x: 0, z: 0, vx: 0, vz: 0, len, mass, damping, airDrag, drag, limit }
}

export function createChime(): ChimeState {
  return {
    body: pendulum(CHIME.pivotHeight, 6, 0.55, 0.15, 1.4, 0.32),
    plaques: CHIME.plaqueHeights.map((h, i) =>
      pendulum(CHIME.stringLength + h * 0.5, 0.5 + h * 0.3, 0.32, 0.3, 0.7 + (i % 2) * 0.1),
    ),
    twists: CHIME.plaqueHeights.map(() => ({ a: 0, v: 0 })),
    pendants: Array.from({ length: P }, (_, i) =>
      pendulum(CHIME.pendantString + 0.08, 0.05, 1.1, 0.6, 0.6 + (i % 3) * 0.15, 0.7),
    ),
    pendantTwists: Array.from({ length: P }, () => ({ a: 0, v: 0 })),
    striker: pendulum(CHIME.strikerString, 1.1, 0.35, 0.25, 1.1),
    sail: pendulum(CHIME.sailString, 0.25, 1.6, 1.4, 2.6, 0.4),
    spin: 0,
    spinVel: 0,
    time: 0,
    touching: new Array(N).fill(false),
    pairTouching: new Array(N * N).fill(false),
    accumulator: 0,
  }
}

const REST: [number, number][] = Array.from({ length: N }, (_, i) => {
  const a = (i / N) * Math.PI * 2 + Math.PI / 5
  return [Math.cos(a) * CHIME.ringRadius, Math.sin(a) * CHIME.ringRadius]
})
const PENDANT_REST: [number, number][] = Array.from({ length: P }, (_, i) => {
  const a = (i / P) * Math.PI * 2 + Math.PI / 8
  return [Math.cos(a) * CHIME.pendantRadius, Math.sin(a) * CHIME.pendantRadius]
})

export function plaqueRestPosition(i: number): [number, number] {
  return REST[i]
}
export function pendantRestPosition(i: number): [number, number] {
  return PENDANT_REST[i]
}

/** Slow, layered breeze with an occasional gust. Returns a world-space force. */
function ambientWind(t: number, strength: number): [number, number] {
  if (strength <= 0) return [0, 0]
  const base = 0.09 * strength
  let wx = base * (Math.sin(t * 0.45) + 0.6 * Math.sin(t * 1.1 + 1.7) + 0.3 * Math.sin(t * 2.9 + 0.4))
  let wz = base * (Math.sin(t * 0.37 + 2.1) + 0.6 * Math.sin(t * 0.93 + 0.3))
  const gust = Math.max(0, Math.sin(t * 0.08) * Math.sin(t * 0.053 + 1) - 0.45) * 0.9 * strength
  wx += gust * Math.cos(t * 0.21)
  wz += gust * 0.4 * Math.sin(t * 0.17)
  return [wx, wz]
}

function integrate(p: Pendulum, ax: number, az: number, dt: number) {
  const k = CHIME.gravity / p.len
  const speed = Math.hypot(p.vx, p.vz)
  const damp = p.damping + p.airDrag * speed
  p.vx += (-k * p.x - damp * p.vx + ax) * dt
  p.vz += (-k * p.z - damp * p.vz + az) * dt
  p.x += p.vx * dt
  p.z += p.vz * dt
  const max = p.len * p.limit
  const d = Math.hypot(p.x, p.z)
  if (d > max) {
    p.x *= max / d
    p.z *= max / d
    const nx = p.x / max
    const nz = p.z / max
    const out = p.vx * nx + p.vz * nz
    if (out > 0) {
      p.vx -= out * nx * 1.4
      p.vz -= out * nz * 1.4
    }
  }
}

function twistStep(t: Twist, torque: number, dt: number, k = 14, c = 2.2) {
  t.v += (-k * t.a - c * t.v + torque) * dt
  t.a += t.v * dt
}

/** Elastic contact between two hanging bodies. Returns closing speed, or -1 when apart. */
function contact(
  a: Pendulum,
  b: Pendulum,
  ax: number,
  az: number,
  bx: number,
  bz: number,
  minDist: number,
  restitution: number,
): number {
  const dx = bx - ax
  const dz = bz - az
  const d = Math.hypot(dx, dz) || 1e-6
  if (d >= minDist) return -1
  const nx = dx / d
  const nz = dz / d
  const vrel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz
  if (vrel > 0) {
    const j = ((1 + restitution) * vrel) / (1 / a.mass + 1 / b.mass)
    a.vx -= (j / a.mass) * nx
    a.vz -= (j / a.mass) * nz
    b.vx += (j / b.mass) * nx
    b.vz += (j / b.mass) * nz
  }
  const push = (minDist - d) * 0.5
  a.x -= nx * push
  a.z -= nz * push
  b.x += nx * push
  b.z += nz * push
  return Math.max(0, vrel)
}

export function stepChime(s: ChimeState, dt: number, input: StepInput, onStrike: StrikeHandler) {
  dt = Math.min(dt, 0.05)
  s.accumulator += dt

  // Impulses (world frame) reach the body directly and the hanging pieces in
  // the chime's own rotating frame.
  const cos = Math.cos(-s.spin)
  const sin = Math.sin(-s.spin)
  const ix = input.impulseX * cos - input.impulseZ * sin
  const iz = input.impulseX * sin + input.impulseZ * cos
  if (input.impulseX !== 0 || input.impulseZ !== 0) {
    s.body.vx += input.impulseX * 0.9
    s.body.vz += input.impulseZ * 0.9
    s.sail.vx += ix * 1.2
    s.sail.vz += iz * 1.2
    s.striker.vx += ix * 0.5
    s.striker.vz += iz * 0.5
    s.plaques.forEach((t, i) => {
      const f = 0.25 + 0.1 * Math.sin(i * 1.7)
      t.vx += ix * f
      t.vz += iz * f
    })
    s.pendants.forEach((t, i) => {
      const f = 0.5 + 0.2 * Math.sin(i * 2.3)
      t.vx += ix * f
      t.vz += iz * f
    })
  }
  s.spinVel = Math.max(-5, Math.min(5, s.spinVel + input.spinImpulse))

  const [wxWorld, wzWorld] = ambientWind(s.time, input.ambient)
  const wx = wxWorld * cos - wzWorld * sin
  const wz = wxWorld * sin + wzWorld * cos

  while (s.accumulator >= SUBSTEP) {
    s.accumulator -= SUBSTEP
    s.time += SUBSTEP
    const h = SUBSTEP
    const centrifugal = Math.min(4, s.spinVel * s.spinVel) * 0.22

    // Whole-chime sway, then the inertial push it gives everything below.
    const body = s.body
    const bvx = body.vx
    const bvz = body.vz
    integrate(body, (wxWorld * body.drag) / body.mass, (wzWorld * body.drag) / body.mass, h)
    const baxWorld = (body.vx - bvx) / h
    const bazWorld = (body.vz - bvz) / h
    const bax = -(baxWorld * cos - bazWorld * sin) * 0.85
    const baz = -(baxWorld * sin + bazWorld * cos) * 0.85

    // Sail (relative to striker) and the reaction it exerts on the striker.
    const sail = s.sail
    const striker = s.striker
    const kSail = CHIME.gravity / sail.len
    const reactX = (kSail * sail.x * sail.mass) / striker.mass
    const reactZ = (kSail * sail.z * sail.mass) / striker.mass
    integrate(
      sail,
      (wx * sail.drag) / sail.mass - striker.vx * 0.4 + bax,
      (wz * sail.drag) / sail.mass - striker.vz * 0.4 + baz,
      h,
    )
    integrate(
      striker,
      (wx * striker.drag) / striker.mass + reactX + bax,
      (wz * striker.drag) / striker.mass + reactZ + baz,
      h,
    )

    for (let i = 0; i < N; i++) {
      const t = s.plaques[i]
      const [rx, rz] = REST[i]
      const cx = (rx + t.x) * centrifugal
      const cz = (rz + t.z) * centrifugal
      integrate(t, (wx * t.drag) / t.mass + cx + bax, (wz * t.drag) / t.mass + cz + baz, h)
      // Flat plaques twist on their thread when the air hits them side-on.
      twistStep(s.twists[i], (wx * Math.cos(i * 1.3) - wz * Math.sin(i * 0.7)) * 4 + s.spinVel * 0.15, h)
    }

    for (let i = 0; i < P; i++) {
      const t = s.pendants[i]
      const [rx, rz] = PENDANT_REST[i]
      const cx = (rx + t.x) * centrifugal
      const cz = (rz + t.z) * centrifugal
      integrate(t, (wx * t.drag) / t.mass + cx + bax * 1.2, (wz * t.drag) / t.mass + cz + baz * 1.2, h)
      twistStep(s.pendantTwists[i], (wx * Math.sin(i * 2.1) + wz * Math.cos(i * 1.1)) * 6, h, 22, 2.6)
    }

    // Striker ↔ plaque contacts.
    const minStriker = CHIME.plaqueRadius + CHIME.strikerRadius
    for (let i = 0; i < N; i++) {
      const t = s.plaques[i]
      const [rx, rz] = REST[i]
      const v = contact(striker, t, striker.x, striker.z, rx + t.x, rz + t.z, minStriker, 0.5)
      if (v >= 0) {
        if (!s.touching[i]) {
          s.touching[i] = true
          if (v > 0.05) {
            onStrike(i, Math.min(1, v / 1.3))
            s.twists[i].v += (Math.random() - 0.5) * v * 6
          }
        }
      } else {
        s.touching[i] = false
      }
    }

    // Plaque ↔ plaque contacts (a softer knock on both).
    const minPair = CHIME.plaqueRadius * 2 + 0.02
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const a = s.plaques[i]
        const b = s.plaques[j]
        const [ax, az] = REST[i]
        const [bx, bz] = REST[j]
        const v = contact(a, b, ax + a.x, az + a.z, bx + b.x, bz + b.z, minPair, 0.35)
        const key = i * N + j
        if (v >= 0) {
          if (!s.pairTouching[key]) {
            s.pairTouching[key] = true
            if (v > 0.08) {
              onStrike(i, Math.min(0.6, v / 2))
              onStrike(j, Math.min(0.45, v / 2.6))
            }
          }
        } else {
          s.pairTouching[key] = false
        }
      }
    }

    s.spinVel *= Math.exp(-1.5 * h)
    s.spin += s.spinVel * h
  }
}

/** Convert a horizontal displacement into pivot rotations (x about Z, z about X). */
export function pendulumRotation(p: Pendulum): [number, number] {
  const rx = Math.asin(Math.max(-1, Math.min(1, p.z / p.len)))
  const rz = -Math.asin(Math.max(-1, Math.min(1, p.x / p.len)))
  return [rx, rz]
}
