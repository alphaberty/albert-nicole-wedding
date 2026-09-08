/**
 * A small, self-contained simulation of a hanging wind chime.
 *
 * Every hanging piece is a damped pendulum, tracked as the horizontal
 * displacement of its lower end (x, z) rather than as angles. That keeps the
 * maths cheap, and for the modest swing angles of a chime it is visually
 * indistinguishable. The striker and the sail are chained: wind mostly pushes
 * the sail, the sail tugs the striker, and the striker knocks the tubes.
 * Tubes also knock each other, and a fast spin flares them outward.
 */

export const CHIME = {
  tubeCount: 5,
  ringRadius: 0.62,
  tubeRadius: 0.075,
  tubeLengths: [2.15, 1.7, 1.95, 1.5, 2.35],
  stringLength: 0.55,
  strikerRadius: 0.3,
  strikerString: 1.42,
  sailString: 0.72,
  discRadius: 0.95,
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
}

export interface ChimeState {
  tubes: Pendulum[]
  striker: Pendulum
  /** Displacement relative to the striker. */
  sail: Pendulum
  spin: number
  spinVel: number
  time: number
  touching: boolean[]
  /** Tube-pair contact flags, index i * tubeCount + j. */
  tubeTouching: boolean[]
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

export type StrikeHandler = (tube: number, velocity: number) => void

const SUBSTEP = 1 / 120
const N = CHIME.tubeCount

function pendulum(len: number, mass: number, damping: number, airDrag: number, drag: number): Pendulum {
  return { x: 0, z: 0, vx: 0, vz: 0, len, mass, damping, airDrag, drag }
}

export function createChime(): ChimeState {
  const tubes = CHIME.tubeLengths.map((l, i) =>
    pendulum(CHIME.stringLength + l * 0.5, 0.6 + l * 0.25, 0.3, 0.25, 0.55 + (i % 2) * 0.08),
  )
  return {
    tubes,
    striker: pendulum(CHIME.strikerString, 1.1, 0.4, 0.3, 0.9),
    sail: pendulum(CHIME.sailString, 0.25, 0.9, 0.8, 3.6),
    spin: 0,
    spinVel: 0,
    time: 0,
    touching: new Array(N).fill(false),
    tubeTouching: new Array(N * N).fill(false),
    accumulator: 0,
  }
}

const REST: [number, number][] = Array.from({ length: N }, (_, i) => {
  const a = (i / N) * Math.PI * 2 + Math.PI / 5
  return [Math.cos(a) * CHIME.ringRadius, Math.sin(a) * CHIME.ringRadius]
})

export function tubeRestPosition(i: number): [number, number] {
  return REST[i]
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
  // Strings and the canopy stop a tube swinging much past ~30°.
  const max = p.len * 0.5
  const d = Math.hypot(p.x, p.z)
  if (d > max) {
    p.x *= max / d
    p.z *= max / d
    // Bleed off the outward part of the velocity, keep the tangential part.
    const nx = p.x / max
    const nz = p.z / max
    const out = p.vx * nx + p.vz * nz
    if (out > 0) {
      p.vx -= out * nx * 1.4
      p.vz -= out * nz * 1.4
    }
  }
}

/** Elastic contact between two hanging bodies at (ax, az) and (bx, bz). Returns closing speed or 0. */
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
  if (!s.tubeTouching) s.tubeTouching = new Array(N * N).fill(false)
  dt = Math.min(dt, 0.05)
  s.accumulator += dt

  // Impulses are applied once, converted to velocity in the chime's own frame.
  const cos = Math.cos(-s.spin)
  const sin = Math.sin(-s.spin)
  const ix = input.impulseX * cos - input.impulseZ * sin
  const iz = input.impulseX * sin + input.impulseZ * cos
  if (ix !== 0 || iz !== 0) {
    s.sail.vx += ix * 1.6
    s.sail.vz += iz * 1.6
    s.striker.vx += ix * 0.7
    s.striker.vz += iz * 0.7
    s.tubes.forEach((t, i) => {
      const f = 0.35 + 0.1 * Math.sin(i * 1.7)
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

    // Sail (relative to striker) and the reaction it exerts on the striker.
    const sail = s.sail
    const striker = s.striker
    const kSail = CHIME.gravity / sail.len
    const reactX = (kSail * sail.x * sail.mass) / striker.mass
    const reactZ = (kSail * sail.z * sail.mass) / striker.mass
    integrate(sail, (wx * sail.drag) / sail.mass - striker.vx * 0.4, (wz * sail.drag) / sail.mass - striker.vz * 0.4, h)
    integrate(striker, (wx * striker.drag) / striker.mass + reactX, (wz * striker.drag) / striker.mass + reactZ, h)

    for (let i = 0; i < N; i++) {
      const t = s.tubes[i]
      const [rx, rz] = REST[i]
      // Spinning flings the tubes outward from the axis.
      const cx = (rx + t.x) * centrifugal
      const cz = (rz + t.z) * centrifugal
      integrate(t, (wx * t.drag) / t.mass + cx, (wz * t.drag) / t.mass + cz, h)
    }

    // Striker ↔ tube contacts.
    const minStriker = CHIME.tubeRadius + CHIME.strikerRadius
    for (let i = 0; i < N; i++) {
      const t = s.tubes[i]
      const [rx, rz] = REST[i]
      const v = contact(striker, t, striker.x, striker.z, rx + t.x, rz + t.z, minStriker, 0.55)
      if (v >= 0) {
        if (!s.touching[i]) {
          s.touching[i] = true
          if (v > 0.05) onStrike(i, Math.min(1, v / 1.4))
        }
      } else {
        s.touching[i] = false
      }
    }

    // Tube ↔ tube contacts (a softer clank on both tubes).
    const minTube = CHIME.tubeRadius * 2 + 0.01
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const a = s.tubes[i]
        const b = s.tubes[j]
        const [ax, az] = REST[i]
        const [bx, bz] = REST[j]
        const v = contact(a, b, ax + a.x, az + a.z, bx + b.x, bz + b.z, minTube, 0.4)
        const key = i * N + j
        if (v >= 0) {
          if (!s.tubeTouching[key]) {
            s.tubeTouching[key] = true
            if (v > 0.08) {
              onStrike(i, Math.min(0.7, v / 2))
              onStrike(j, Math.min(0.5, v / 2.6))
            }
          }
        } else {
          s.tubeTouching[key] = false
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
