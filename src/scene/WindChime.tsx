import { useMemo, useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { CHIME, createChime, pendulumRotation, stepChime, tubeRestPosition } from './chimePhysics'
import { glyphTexture, materials, COLORS } from './materials'
import { chimeAudio } from '../lib/audio'
import { chimeInput } from '../lib/hooks'

interface Props {
  /** Ambient breeze strength, 0 for reduced motion. */
  ambient: number
}

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

interface ChimeGeometry {
  cord: THREE.CylinderGeometry
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
  tubeString: THREE.CylinderGeometry
  tubeCap: THREE.TorusGeometry
  tubes: THREE.CylinderGeometry[]
  tubeFoot: THREE.CylinderGeometry
  strikerString: THREE.CylinderGeometry
  striker: THREE.CylinderGeometry
  strikerRim: THREE.TorusGeometry
  sailString: THREE.CylinderGeometry
  sail: THREE.PlaneGeometry
  tile: THREE.CylinderGeometry
  tileRim: THREE.TorusGeometry
  bead: THREE.SphereGeometry
}

let chimeGeo: ChimeGeometry | null = null
function chimeGeometry(): ChimeGeometry {
  if (chimeGeo) return chimeGeo
  const R = CHIME.discRadius
  const r = CHIME.tubeRadius
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
  // Smaller upper tier that the cord passes through.
  const crownProfile = [
    [0, 0.42], [0.1, 0.42], [0.24, 0.38], [0.36, 0.31], [0.4, 0.24], [0.38, 0.19], [0, 0.19],
  ].map(([x, y]) => new THREE.Vector2(x * R, y))
  chimeGeo = {
    cord: new THREE.CylinderGeometry(0.012, 0.012, 6.4, 5),
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
    tubeString: new THREE.CylinderGeometry(0.007, 0.007, CHIME.stringLength, 4),
    tubeCap: new THREE.TorusGeometry(r + 0.012, 0.014, 6, 20),
    tubes: CHIME.tubeLengths.map((len) => new THREE.CylinderGeometry(r, r, len, 16, 1)),
    tubeFoot: new THREE.CylinderGeometry(r + 0.004, r + 0.004, 0.04, 16),
    strikerString: new THREE.CylinderGeometry(0.008, 0.008, CHIME.strikerString, 4),
    striker: new THREE.CylinderGeometry(CHIME.strikerRadius, CHIME.strikerRadius * 0.92, 0.09, 32),
    strikerRim: new THREE.TorusGeometry(CHIME.strikerRadius, 0.014, 6, 36),
    sailString: new THREE.CylinderGeometry(0.007, 0.007, CHIME.sailString - 0.4, 4),
    sail,
    tile: new THREE.CylinderGeometry(0.15, 0.15, 0.03, 24),
    tileRim: new THREE.TorusGeometry(0.15, 0.008, 5, 24),
    bead: new THREE.SphereGeometry(0.035, 8, 8),
  }
  return chimeGeo
}

export function WindChime({ ambient }: Props) {
  const state = useRef(createChime())
  const spinRef = useRef<THREE.Group>(null)
  const tubeRefs = useRef<(THREE.Group | null)[]>([])
  const strikerRef = useRef<THREE.Group>(null)
  const sailRef = useRef<THREE.Group>(null)
  const m = materials()
  const g = chimeGeometry()
  const happy = useMemo(() => glyphTexture('囍', COLORS.red), [])
  const happyGold = useMemo(() => glyphTexture('囍', COLORS.goldDeep), [])
  const glyphRed = useMemo(() => new THREE.MeshBasicMaterial({ map: happy, transparent: true, depthWrite: false }), [happy])
  const glyphGold = useMemo(() => new THREE.MeshBasicMaterial({ map: happyGold, transparent: true, depthWrite: false }), [happyGold])

  useFrame((_, delta) => {
    const s = state.current
    const input = {
      impulseX: chimeInput.impulseX,
      impulseZ: chimeInput.impulseZ,
      spinImpulse: chimeInput.spinImpulse,
      ambient,
    }
    if (chimeInput.celebrate) {
      input.impulseX += 0.9
      input.impulseZ += 0.4
      input.spinImpulse += 1.4
      chimeInput.celebrate = false
    }
    chimeInput.impulseX = 0
    chimeInput.impulseZ = 0
    chimeInput.spinImpulse = 0

    stepChime(s, delta, input, (i, v) => chimeAudio.strike(i, v))

    if (spinRef.current) {
      spinRef.current.rotation.y = s.spin
      // The whole piece leans a touch with the striker, like a real suspension.
      spinRef.current.rotation.z = -s.striker.x * 0.05
      spinRef.current.rotation.x = s.striker.z * 0.05
    }
    s.tubes.forEach((t, i) => {
      const tg = tubeRefs.current[i]
      if (!tg) return
      const [rx, rz] = pendulumRotation(t)
      tg.rotation.x = rx
      tg.rotation.z = rz
    })
    if (strikerRef.current) {
      const [rx, rz] = pendulumRotation(s.striker)
      strikerRef.current.rotation.x = rx
      strikerRef.current.rotation.z = rz
    }
    if (sailRef.current) {
      const [rx, rz] = pendulumRotation(s.sail)
      sailRef.current.rotation.x = rx
      sailRef.current.rotation.z = rz
      sailRef.current.rotation.y = s.sail.x * 0.6
    }
  })

  const R = CHIME.discRadius
  const str = CHIME.stringLength

  return (
    <group>
      {/* Hanging cord up out of view */}
      <mesh position={[0, 3.85, 0]} geometry={g.cord} material={m.gold} />

      <group ref={spinRef}>
        {/* Finial and hanging ring */}
        <mesh position={[0, 0.62, 0]} rotation={[0, 0, 0]} geometry={g.hangRing} material={m.gold} castShadow />
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

        {/* Blossoms resting on the disc edge */}
        <Blossom position={[R * 0.7, 0.14, -R * 0.38]} size={0.2} />
        <Blossom position={[-R * 0.52, 0.16, R * 0.5]} size={0.15} color={COLORS.blushDeep} />

        {/* Tubes */}
        {CHIME.tubeLengths.map((len, i) => {
          const [rx, rz] = tubeRestPosition(i)
          return (
            <group
              key={i}
              position={[rx, -0.16, rz]}
              ref={(el) => {
                tubeRefs.current[i] = el
              }}
            >
              <mesh position={[0, -str / 2, 0]} geometry={g.tubeString} material={m.goldSoft} />
              <mesh position={[0, -str, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={g.tubeCap} material={m.gold} />
              <mesh position={[0, -(str + len / 2), 0]} geometry={g.tubes[i]} material={m.red} castShadow />
              <mesh position={[0, -(str + len) + 0.01, 0]} geometry={g.tubeFoot} material={m.gold} />
            </group>
          )
        })}

        {/* Striker and sail */}
        <group position={[0, -0.16, 0]} ref={strikerRef}>
          <mesh position={[0, -CHIME.strikerString / 2, 0]} geometry={g.strikerString} material={m.goldSoft} />
          <group position={[0, -CHIME.strikerString, 0]}>
            <mesh geometry={g.striker} material={m.blush} castShadow />
            <mesh rotation={[Math.PI / 2, 0, 0]} geometry={g.strikerRim} material={m.gold} />
            <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={g.glyphSmall} material={glyphGold} />

            <group ref={sailRef}>
              <mesh position={[0, -CHIME.sailString / 2 + 0.2, 0]} geometry={g.sailString} material={m.goldSoft} />
              <mesh position={[0, -CHIME.sailString - 0.16, 0]} geometry={g.sail} material={m.redSilk} castShadow />
              {/* Small pink tile with 囍 facing the viewer */}
              <group position={[0, -CHIME.sailString - 0.16, 0.06]}>
                <mesh rotation={[Math.PI / 2, 0, 0]} geometry={g.tile} material={m.blush} />
                <mesh rotation={[Math.PI / 2, 0, 0]} geometry={g.tileRim} material={m.gold} />
                <mesh position={[0, 0, 0.02]} geometry={g.glyphTile} material={glyphRed} />
              </group>
              <mesh position={[0, -CHIME.sailString - 0.56, 0]} geometry={g.bead} material={m.gold} />
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
