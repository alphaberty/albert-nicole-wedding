/**
 * A small, self-contained simulation of a hanging wind chime.
 *
 * Every hanging piece is a damped pendulum, tracked as the horizontal
 * displacement of its lower end (x, z) rather than as angles. That keeps the
 * maths cheap, and for the modest swing angles of a chime it is visually
 * indistinguishable. The striker and the sail are chained: wind mostly pushes
 * the sail, the sail tugs the striker, and the striker knocks the tubes.
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
  damping: number
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

function pendulum(len: number, mass: number, damping: number, drag: number): Pendulum {
  return { x: 0, z: 0, vx: 0, vz: 0, len, mass, damping, drag }
}

export function createChime(): ChimeState {
  const tubes = CHIME.tubeLengths.map((l, i) =>
    pendulum(CHIME.stringLength + l * 0.5, 0.6 + l * 0.25, 0.42, 0.55 + (i % 2) * 0.08),
  )
  return {
    tubes,
    striker: pendulum(CHIME.strikerString, 1.1, 0.5, 0.9),
    sail: pendulum(CHIME.sailString, 0.25, 1.1, 3.6),
    spin: 0,
    spinVel: 0,
    time: 0,
    touching: new Array(CHIME.tubeCount).fill(false),
    accumulator: 0,
  }
}

export function tubeRestPosition(i: number): [number, number] {
  const a = (i / CHIME.tubeCount) * Math.PI * 2 + Math.PI / 5
  return [Math.cos(a) * CHIME.ringRadius, Math.sin(a) * CHIME.ringRadius]
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
  p.vx += (-k * p.x - p.damping * p.vx + ax) * dt
  p.vz += (-k * p.z - p.damping * p.vz + az) * dt
  p.x += p.vx * dt
  p.z += p.vz * dt
  const max = p.len * 0.85
  const d = Math.hypot(p.x, p.z)
  if (d > max) {
    p.x *= max / d
    p.z *= max / d
    p.vx *= 0.5
    p.vz *= 0.5
  }
}

export function stepChime(s: ChimeState, dt: number, input: StepInput, onStrike: StrikeHandler) {
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
  s.spinVel += input.spinImpulse

  const [wxWorld, wzWorld] = ambientWind(s.time, input.ambient)
  const wx = wxWorld * cos - wzWorld * sin
  const wz = wxWorld * sin + wzWorld * cos

  while (s.accumulator >= SUBSTEP) {
    s.accumulator -= SUBSTEP
    s.time += SUBSTEP
    const h = SUBSTEP

    // Sail (relative to striker) and the reaction it exerts on the striker.
    const sail = s.sail
    const striker = s.striker
    const kSail = CHIME.gravity / sail.len
    const reactX = (kSail * sail.x * sail.mass) / striker.mass
    const reactZ = (kSail * sail.z * sail.mass) / striker.mass
    integrate(sail, (wx * sail.drag) / sail.mass - striker.vx * 0.4, (wz * sail.drag) / sail.mass - striker.vz * 0.4, h)
    integrate(striker, (wx * striker.drag) / striker.mass + reactX, (wz * striker.drag) / striker.mass + reactZ, h)

    for (let i = 0; i < s.tubes.length; i++) {
      const t = s.tubes[i]
      integrate(t, (wx * t.drag) / t.mass, (wz * t.drag) / t.mass, h)
    }

    // Striker ↔ tube contacts.
    const minDist = CHIME.tubeRadius + CHIME.strikerRadius
    for (let i = 0; i < s.tubes.length; i++) {
      const t = s.tubes[i]
      const [rx, rz] = tubeRestPosition(i)
      const dx = rx + t.x - striker.x
      const dz = rz + t.z - striker.z
      const d = Math.hypot(dx, dz) || 1e-6
      if (d < minDist) {
        const nx = dx / d
        const nz = dz / d
        const vrel = (striker.vx - t.vx) * nx + (striker.vz - t.vz) * nz
        if (!s.touching[i]) {
          s.touching[i] = true
          if (vrel > 0.05) onStrike(i, Math.min(1, vrel / 1.4))
        }
        if (vrel > 0) {
          const e = 0.55
          const j = ((1 + e) * vrel) / (1 / striker.mass + 1 / t.mass)
          striker.vx -= (j / striker.mass) * nx
          striker.vz -= (j / striker.mass) * nz
          t.vx += (j / t.mass) * nx
          t.vz += (j / t.mass) * nz
        }
        // Separate so they do not sink into each other.
        const push = (minDist - d) * 0.5
        striker.x -= nx * push
        striker.z -= nz * push
        t.x += nx * push
        t.z += nz * push
      } else if (d > minDist + 0.02) {
        s.touching[i] = false
      }
    }

    s.spinVel *= Math.exp(-1.1 * h)
    s.spin += s.spinVel * h
  }
}

/** Convert a horizontal displacement into pivot rotations (x about Z, z about X). */
export function pendulumRotation(p: Pendulum): [number, number] {
  const rx = Math.asin(Math.max(-1, Math.min(1, p.z / p.len)))
  const rz = -Math.asin(Math.max(-1, Math.min(1, p.x / p.len)))
  return [rx, rz]
}
