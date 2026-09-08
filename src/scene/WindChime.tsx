import { useMemo, useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import {
  CHIME,
  createChime,
  pendantRestPosition,
  pendulumRotation,
  plaqueRestPosition,
  stepChime,
} from './chimePhysics'
import { glyphTexture, labelTexture, materials, COLORS } from './materials'
import { chimeAudio } from '../lib/audio'
import { chimeInput } from '../lib/hooks'

interface Props {
  /** Ambient breeze strength, 0 for reduced motion. */
  ambient: number
}

/** Lettering on the five hanging plaques: double happiness and "joy" in a few tongues. */
const PLAQUE_TEXT = ['囍', '喜', '희', '喜び', 'Joy']

// Geometry is shared between every instance of the same part so the GPU
// uploads each shape once; segment counts are kept modest for phones.
let blossomGeo: { centre: THREE.SphereGeometry; petal: THREE.SphereGeometry } | null = null
function blossomGeometry() {
  if (!blossomGeo) {
    blossomGeo = { centre: new THREE.SphereGeometry(1, 10, 10), petal: new THREE.SphereGeometry(1, 12, 8) }
  }
  return blossomGeo
}

/** A small blossom: five petal ellipsoids around a gold centre. */
export function Blossom({
  size = 0.18,
  color = COLORS.blush,
  ...props
}: { size?: number; color?: string } & ThreeElements['group']) {
  const m = materials()
  const geo = blossomGeometry()
  const petal = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, clearcoat: 0.3, sheen: 0.6, sheenColor: '#ffe3ea' }),
    [color],
  )
  return (
    <group {...props}>
      <mesh material={m.gold} geometry={geo.centre} scale={size * 0.3} castShadow />
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2
        return (
          <mesh
            key={i}
            material={petal}
            geometry={geo.petal}
            position={[Math.cos(a) * size * 0.62, 0, Math.sin(a) * size * 0.62]}
            rotation={[0.35 * Math.sin(a), -a, 0.35 * Math.cos(a)]}
            scale={[size * 0.55, size * 0.55 * 0.32, size * 0.55 * 0.62]}
            castShadow
          />
        )
      })}
    </group>
  )
}

function roundedPlaque(w: number, h: number, depth: number): THREE.ExtrudeGeometry {
  const r = Math.min(0.07, w * 0.18)
  const shape = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  shape.moveTo(x + r, y)
  shape.lineTo(x + w - r, y)
  shape.quadraticCurveTo(x + w, y, x + w, y + r)
  shape.lineTo(x + w, y + h - r)
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  shape.lineTo(x + r, y + h)
  shape.quadraticCurveTo(x, y + h, x, y + h - r)
  shape.lineTo(x, y + r)
  shape.quadraticCurveTo(x, y, x + r, y)
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
    curveSegments: 6,
  })
  geo.translate(0, 0, -depth / 2)
  return geo
}

interface ChimeGeometry {
  cordAbove: THREE.CylinderGeometry
  cordBelow: THREE.CylinderGeometry
  finial: THREE.SphereGeometry
  hangRing: THREE.TorusGeometry
  finialStem: THREE.CylinderGeometry
  canopy: THREE.LatheGeometry
  crown: THREE.LatheGeometry
  canopyBand: THREE.TorusGeometry
  canopyLine: THREE.TorusGeometry
  crownBand: THREE.TorusGeometry
  discRing: THREE.TorusGeometry
  glyphLarge: THREE.PlaneGeometry
  glyphSmall: THREE.PlaneGeometry
  glyphTile: THREE.PlaneGeometry
  plaqueString: THREE.CylinderGeometry
  plaqueLoop: THREE.TorusGeometry
  plaques: THREE.ExtrudeGeometry[]
  plaqueFaces: THREE.PlaneGeometry[]
  bead: THREE.SphereGeometry
  tassel: THREE.ConeGeometry
  pendantString: THREE.CylinderGeometry
  coin: THREE.CylinderGeometry
  coinFace: THREE.PlaneGeometry
  pendantBead: THREE.SphereGeometry
  strikerString: THREE.CylinderGeometry
  striker: THREE.CylinderGeometry
  strikerRim: THREE.TorusGeometry
  sailString: THREE.CylinderGeometry
  sail: THREE.PlaneGeometry
  tile: THREE.CylinderGeometry
  tileRim: THREE.TorusGeometry
}

let chimeGeo: ChimeGeometry | null = null
function chimeGeometry(): ChimeGeometry {
  if (chimeGeo) return chimeGeo
  const R = CHIME.discRadius
  const sail = new THREE.PlaneGeometry(0.42, 0.72, 3, 10)
  const pos = sail.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    const x = pos.getX(i)
    pos.setZ(i, Math.sin(y * 4.2) * 0.045 + Math.sin(x * 9) * 0.01)
  }
  sail.computeVertexNormals()
  // Turned canopy: a shallow dome with a rolled rim, like a lacquered lid.
  const canopyProfile = [
    [0, 0.2], [0.18, 0.2], [0.4, 0.18], [0.62, 0.14], [0.8, 0.09], [0.92, 0.04], [0.99, -0.02],
    [0.985, -0.08], [0.94, -0.13], [0.82, -0.155], [0.55, -0.165], [0, -0.165],
  ].map(([x, y]) => new THREE.Vector2(x * R, y))
  const crownProfile = [
    [0, 0.42], [0.1, 0.42], [0.24, 0.38], [0.36, 0.31], [0.4, 0.24], [0.38, 0.19], [0, 0.19],
  ].map(([x, y]) => new THREE.Vector2(x * R, y))
  chimeGeo = {
    cordAbove: new THREE.CylinderGeometry(0.012, 0.012, 6, 5),
    cordBelow: new THREE.CylinderGeometry(0.012, 0.012, CHIME.pivotHeight - 0.62, 5),
    finial: new THREE.SphereGeometry(0.07, 14, 14),
    hangRing: new THREE.TorusGeometry(0.07, 0.014, 8, 24),
    finialStem: new THREE.CylinderGeometry(0.02, 0.035, 0.12, 10),
    canopy: new THREE.LatheGeometry(canopyProfile, 72),
    crown: new THREE.LatheGeometry(crownProfile, 48),
    canopyBand: new THREE.TorusGeometry(R * 0.985, 0.022, 8, 72),
    canopyLine: new THREE.TorusGeometry(R * 0.62, 0.008, 6, 64),
    crownBand: new THREE.TorusGeometry(R * 0.39, 0.012, 6, 48),
    discRing: new THREE.TorusGeometry(R * 0.9, 0.016, 8, 48),
    glyphLarge: new THREE.PlaneGeometry(0.7, 0.7),
    glyphSmall: new THREE.PlaneGeometry(0.32, 0.32),
    glyphTile: new THREE.PlaneGeometry(0.22, 0.22),
    plaqueString: new THREE.CylinderGeometry(0.007, 0.007, CHIME.stringLength, 4),
    plaqueLoop: new THREE.TorusGeometry(0.03, 0.009, 6, 16),
    plaques: CHIME.plaqueHeights.map((h, i) => roundedPlaque(CHIME.plaqueWidths[i], h, 0.06)),
    plaqueFaces: CHIME.plaqueHeights.map((h, i) => new THREE.PlaneGeometry(CHIME.plaqueWidths[i] * 0.8, h * 0.84)),
    bead: new THREE.SphereGeometry(0.035, 8, 8),
    tassel: new THREE.ConeGeometry(0.045, 0.22, 10),
    pendantString: new THREE.CylinderGeometry(0.006, 0.006, CHIME.pendantString, 4),
    coin: new THREE.CylinderGeometry(0.085, 0.085, 0.025, 20),
    coinFace: new THREE.PlaneGeometry(0.13, 0.13),
    pendantBead: new THREE.SphereGeometry(0.055, 10, 10),
    strikerString: new THREE.CylinderGeometry(0.008, 0.008, CHIME.strikerString, 4),
    striker: new THREE.CylinderGeometry(CHIME.strikerRadius, CHIME.strikerRadius * 0.92, 0.09, 32),
    strikerRim: new THREE.TorusGeometry(CHIME.strikerRadius, 0.014, 6, 36),
    sailString: new THREE.CylinderGeometry(0.007, 0.007, CHIME.sailString - 0.4, 4),
    sail,
    tile: new THREE.CylinderGeometry(0.15, 0.15, 0.03, 24),
    tileRim: new THREE.TorusGeometry(0.15, 0.008, 5, 24),
  }
  return chimeGeo
}

export function WindChime({ ambient }: Props) {
  const state = useRef(createChime())
  const swayRef = useRef<THREE.Group>(null)
  const spinRef = useRef<THREE.Group>(null)
  const plaquePivots = useRef<(THREE.Group | null)[]>([])
  const plaqueBodies = useRef<(THREE.Group | null)[]>([])
  const pendantPivots = useRef<(THREE.Group | null)[]>([])
  const pendantBodies = useRef<(THREE.Group | null)[]>([])
  const strikerRef = useRef<THREE.Group>(null)
  const strikerBodyRef = useRef<THREE.Group>(null)
  const sailRef = useRef<THREE.Group>(null)
  const sailBodyRef = useRef<THREE.Group>(null)
  // Smoothed thread angles: a light thread follows the body it carries with a
  // little lag and never tilts as far as the body does.
  const threads = useRef({ plaques: CHIME.plaqueHeights.map(() => [0, 0]), striker: [0, 0], sail: [0, 0] })

  const m = materials()
  const g = chimeGeometry()
  const glyphRed = useMemo(
    () => new THREE.MeshBasicMaterial({ map: glyphTexture('囍', COLORS.red), transparent: true, depthWrite: false }),
    [],
  )
  const glyphGold = useMemo(
    () => new THREE.MeshBasicMaterial({ map: glyphTexture('囍', COLORS.goldDeep), transparent: true, depthWrite: false }),
    [],
  )
  const coinFace = useMemo(
    () => new THREE.MeshBasicMaterial({ map: glyphTexture('囍', COLORS.red, 128), transparent: true, depthWrite: false }),
    [],
  )
  const plaqueFaces = useMemo(
    () =>
      PLAQUE_TEXT.map(
        (text, i) =>
          new THREE.MeshBasicMaterial({
            map: labelTexture(text, COLORS.gold, CHIME.plaqueWidths[i] / CHIME.plaqueHeights[i]),
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -1,
          }),
      ),
    [],
  )

  useFrame((_, delta) => {
    const s = state.current
    const input = {
      impulseX: chimeInput.impulseX,
      impulseZ: chimeInput.impulseZ,
      spinImpulse: chimeInput.spinImpulse,
      ambient,
    }
    if (chimeInput.celebrate) {
      input.impulseX += 1.2
      input.impulseZ += 0.5
      input.spinImpulse += 1.2
      chimeInput.celebrate = false
    }
    chimeInput.impulseX = 0
    chimeInput.impulseZ = 0
    chimeInput.spinImpulse = 0

    stepChime(s, delta, input, (i, v) => chimeAudio.strike(i, v))

    if (swayRef.current) {
      const [rx, rz] = pendulumRotation(s.body)
      swayRef.current.rotation.x = rx
      swayRef.current.rotation.z = rz
    }
    if (spinRef.current) spinRef.current.rotation.y = s.spin

    // Thread follows the body: a fraction of the body angle, eased over ~80 ms.
    const follow = 1 - Math.exp(-Math.min(delta, 0.1) * 12)
    const split = (
      thread: number[],
      rx: number,
      rz: number,
      share: number,
      pivot: THREE.Group | null,
      body: THREE.Group | null,
      twist = 0,
    ) => {
      thread[0] += (rx * share - thread[0]) * follow
      thread[1] += (rz * share - thread[1]) * follow
      if (pivot) {
        pivot.rotation.x = thread[0]
        pivot.rotation.z = thread[1]
      }
      if (body) {
        body.rotation.x = rx - thread[0]
        body.rotation.y = twist
        body.rotation.z = rz - thread[1]
      }
    }
    const th = threads.current
    // Plaques and coins hang on free threads, so they settle facing the viewer
    // however the chime has spun, with only a little twist in the air. Their
    // lettering therefore stays readable instead of turning edge-on.
    s.plaques.forEach((t, i) => {
      const [rx, rz] = pendulumRotation(t)
      split(th.plaques[i], rx, rz, 0.55, plaquePivots.current[i], plaqueBodies.current[i], -s.spin + s.twists[i].a * 0.35)
    })
    s.pendants.forEach((t, i) => {
      const pivot = pendantPivots.current[i]
      const body = pendantBodies.current[i]
      const [rx, rz] = pendulumRotation(t)
      if (pivot) {
        pivot.rotation.x = rx
        pivot.rotation.z = rz
      }
      if (body) body.rotation.y = -s.spin + s.pendantTwists[i].a * 0.5
    })
    {
      const [rx, rz] = pendulumRotation(s.striker)
      split(th.striker, rx, rz, 0.7, strikerRef.current, strikerBodyRef.current)
    }
    {
      const [rx, rz] = pendulumRotation(s.sail)
      split(th.sail, rx, rz, 0.5, sailRef.current, sailBodyRef.current, Math.sin(s.time * 1.3) * 0.12 + s.sail.x * 0.35)
    }
  })

  const R = CHIME.discRadius
  const str = CHIME.stringLength
  const pivotY = CHIME.pivotHeight

  return (
    <group>
      {/* Cord above the pivot, straight up out of view */}
      <mesh position={[0, pivotY + 3, 0]} geometry={g.cordAbove} material={m.gold} />

      {/* Everything below the pivot sways as one body */}
      <group ref={swayRef} position={[0, pivotY, 0]}>
        <mesh position={[0, -(pivotY - 0.62) / 2, 0]} geometry={g.cordBelow} material={m.gold} />
        <group position={[0, -pivotY, 0]}>
          <group ref={spinRef}>
            {/* Finial and hanging ring */}
            <mesh position={[0, 0.62, 0]} geometry={g.hangRing} material={m.gold} castShadow />
            <mesh position={[0, 0.5, 0]} geometry={g.finial} material={m.gold} castShadow />
            <mesh position={[0, 0.44, 0]} geometry={g.finialStem} material={m.gold} />

            {/* Two-tier turned canopy */}
            <mesh geometry={g.crown} material={m.blush} castShadow receiveShadow />
            <mesh position={[0, 0.235, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={g.crownBand} material={m.gold} />
            <mesh geometry={g.canopy} material={m.blush} castShadow receiveShadow />
            <mesh position={[0, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={g.canopyLine} material={m.gold} />
            <mesh position={[0, -0.04, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={g.canopyBand} material={m.gold} castShadow />
            <mesh position={[0, -0.15, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={g.discRing} material={m.gold} />
            <mesh position={[0, 0.205, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={g.glyphLarge} material={glyphRed} />

            {/* Blossoms resting on the canopy */}
            <Blossom position={[R * 0.7, 0.14, -R * 0.38]} size={0.2} />
            <Blossom position={[-R * 0.52, 0.16, R * 0.5]} size={0.15} color={COLORS.blushDeep} />

            {/* Ring of small pendants around the rim */}
            {Array.from({ length: CHIME.pendantCount }, (_, i) => {
              const [px, pz] = pendantRestPosition(i)
              const coin = i % 2 === 0
              return (
                <group
                  key={`p${i}`}
                  position={[px, -0.15, pz]}
                  ref={(el) => {
                    pendantPivots.current[i] = el
                  }}
                >
                  <mesh position={[0, -CHIME.pendantString / 2, 0]} geometry={g.pendantString} material={m.goldSoft} />
                  <group
                    position={[0, -CHIME.pendantString - 0.08, 0]}
                    ref={(el) => {
                      pendantBodies.current[i] = el
                    }}
                  >
                    {coin ? (
                      <>
                        <mesh rotation={[Math.PI / 2, 0, 0]} geometry={g.coin} material={m.gold} castShadow />
                        <mesh position={[0, 0, 0.016]} geometry={g.coinFace} material={coinFace} />
                        <mesh position={[0, 0, -0.016]} rotation={[0, Math.PI, 0]} geometry={g.coinFace} material={coinFace} />
                      </>
                    ) : (
                      <>
                        <mesh geometry={g.pendantBead} material={i % 4 === 1 ? m.blush : m.red} castShadow />
                        <mesh position={[0, -0.075, 0]} geometry={g.bead} material={m.gold} scale={0.7} />
                      </>
                    )}
                  </group>
                </group>
              )
            })}

            {/* Lettered plaques */}
            {CHIME.plaqueHeights.map((h, i) => {
              const [rx, rz] = plaqueRestPosition(i)
              return (
                <group
                  key={`q${i}`}
                  position={[rx, -0.16, rz]}
                  ref={(el) => {
                    plaquePivots.current[i] = el
                  }}
                >
                  <mesh position={[0, -str / 2, 0]} geometry={g.plaqueString} material={m.goldSoft} />
                  <group
                    position={[0, -str, 0]}
                    ref={(el) => {
                      plaqueBodies.current[i] = el
                    }}
                  >
                    <mesh position={[0, 0.01, 0]} geometry={g.plaqueLoop} material={m.gold} />
                    <mesh position={[0, -h / 2 - 0.04, 0]} geometry={g.plaques[i]} material={m.lacquer} castShadow />
                    <mesh position={[0, -h / 2 - 0.04, 0.046]} geometry={g.plaqueFaces[i]} material={plaqueFaces[i]} />
                    <mesh position={[0, -h / 2 - 0.04, -0.046]} rotation={[0, Math.PI, 0]} geometry={g.plaqueFaces[i]} material={plaqueFaces[i]} />
                    <mesh position={[0, -h - 0.1, 0]} geometry={g.bead} material={m.gold} />
                    <mesh position={[0, -h - 0.25, 0]} geometry={g.tassel} material={m.redSilk} castShadow />
                  </group>
                </group>
              )
            })}

            {/* Striker and sail */}
            <group position={[0, -0.16, 0]} ref={strikerRef}>
              <mesh position={[0, -CHIME.strikerString / 2, 0]} geometry={g.strikerString} material={m.goldSoft} />
              <group position={[0, -CHIME.strikerString, 0]} ref={strikerBodyRef}>
                <mesh geometry={g.striker} material={m.blush} castShadow />
                <mesh rotation={[Math.PI / 2, 0, 0]} geometry={g.strikerRim} material={m.gold} />
                <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={g.glyphSmall} material={glyphGold} />

                <group ref={sailRef}>
                  <mesh position={[0, -CHIME.sailString / 2 + 0.2, 0]} geometry={g.sailString} material={m.goldSoft} />
                  <group position={[0, -CHIME.sailString + 0.2, 0]} ref={sailBodyRef}>
                    <mesh position={[0, -0.36, 0]} geometry={g.sail} material={m.redSilk} castShadow />
                    <group position={[0, -0.36, 0.06]}>
                      <mesh rotation={[Math.PI / 2, 0, 0]} geometry={g.tile} material={m.blush} />
                      <mesh rotation={[Math.PI / 2, 0, 0]} geometry={g.tileRim} material={m.gold} />
                      <mesh position={[0, 0, 0.02]} geometry={g.glyphTile} material={glyphRed} />
                    </group>
                    <mesh position={[0, -0.76, 0]} geometry={g.bead} material={m.gold} />
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
