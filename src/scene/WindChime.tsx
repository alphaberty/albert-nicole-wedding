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

/** A small blossom: five petal ellipsoids around a gold centre. */
export function Blossom({
  size = 0.18,
  color = COLORS.blush,
  ...props
}: { size?: number; color?: string } & ThreeElements['group']) {
  const m = materials()
  const petal = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, clearcoat: 0.3, sheen: 0.6, sheenColor: '#ffe3ea' }),
    [color],
  )
  return (
    <group {...props}>
      <mesh material={m.gold} castShadow>
        <sphereGeometry args={[size * 0.3, 14, 14]} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2
        return (
          <mesh
            key={i}
            material={petal}
            position={[Math.cos(a) * size * 0.62, 0, Math.sin(a) * size * 0.62]}
            rotation={[0.35 * Math.sin(a), -a, 0.35 * Math.cos(a)]}
            scale={[1, 0.32, 0.62]}
            castShadow
          >
            <sphereGeometry args={[size * 0.55, 14, 10]} />
          </mesh>
        )
      })}
    </group>
  )
}

export function WindChime({ ambient }: Props) {
  const state = useRef(createChime())
  const spinRef = useRef<THREE.Group>(null)
  const tubeRefs = useRef<(THREE.Group | null)[]>([])
  const strikerRef = useRef<THREE.Group>(null)
  const sailRef = useRef<THREE.Group>(null)
  const m = materials()
  const happy = useMemo(() => glyphTexture('囍', COLORS.red), [])
  const happyGold = useMemo(() => glyphTexture('囍', COLORS.goldDeep), [])

  const sailGeometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.42, 0.72, 4, 14)
    const pos = g.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      const x = pos.getX(i)
      pos.setZ(i, Math.sin(y * 4.2) * 0.045 + Math.sin(x * 9) * 0.01)
    }
    g.computeVertexNormals()
    return g
  }, [])

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
      const g = tubeRefs.current[i]
      if (!g) return
      const [rx, rz] = pendulumRotation(t)
      g.rotation.x = rx
      g.rotation.z = rz
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

  return (
    <group>
      {/* Hanging cord up out of view */}
      <mesh position={[0, 3.2, 0]} material={m.gold}>
        <cylinderGeometry args={[0.012, 0.012, 6.4, 6]} />
      </mesh>

      <group ref={spinRef}>
        {/* Knot and top ring */}
        <mesh position={[0, 0.24, 0]} material={m.gold} castShadow>
          <sphereGeometry args={[0.085, 16, 16]} />
        </mesh>
        <mesh position={[0, 0.16, 0]} material={m.gold}>
          <cylinderGeometry args={[0.03, 0.05, 0.12, 12]} />
        </mesh>

        {/* Suspension disc */}
        <mesh material={m.blush} castShadow receiveShadow>
          <cylinderGeometry args={[R, R * 0.9, 0.16, 56]} />
        </mesh>
        <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.7, 0.7]} />
          <meshBasicMaterial map={happy} transparent depthWrite={false} opacity={0.9} />
        </mesh>
        <mesh position={[0, -0.09, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.gold}>
          <torusGeometry args={[R * 0.97, 0.018, 10, 72]} />
        </mesh>
        <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.gold}>
          <torusGeometry args={[R * 1.005, 0.012, 8, 72]} />
        </mesh>

        {/* Blossoms resting on the disc edge */}
        <Blossom position={[R * 0.72, 0.1, -R * 0.35]} size={0.2} />
        <Blossom position={[-R * 0.55, 0.1, R * 0.5]} size={0.15} color={COLORS.blushDeep} />

        {/* Tubes */}
        {CHIME.tubeLengths.map((len, i) => {
          const [rx, rz] = tubeRestPosition(i)
          const str = CHIME.stringLength
          return (
            <group
              key={i}
              position={[rx, -0.08, rz]}
              ref={(el) => {
                tubeRefs.current[i] = el
              }}
            >
              <mesh position={[0, -str / 2, 0]} material={m.goldSoft}>
                <cylinderGeometry args={[0.007, 0.007, str, 5]} />
              </mesh>
              <mesh position={[0, -str, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.gold}>
                <torusGeometry args={[CHIME.tubeRadius + 0.012, 0.014, 8, 28]} />
              </mesh>
              <mesh position={[0, -(str + len / 2), 0]} material={m.red} castShadow>
                <cylinderGeometry args={[CHIME.tubeRadius, CHIME.tubeRadius, len, 24, 1]} />
              </mesh>
              <mesh position={[0, -(str + len) + 0.01, 0]} material={m.gold}>
                <cylinderGeometry args={[CHIME.tubeRadius + 0.004, CHIME.tubeRadius + 0.004, 0.04, 24]} />
              </mesh>
            </group>
          )
        })}

        {/* Striker and sail */}
        <group position={[0, -0.08, 0]} ref={strikerRef}>
          <mesh position={[0, -CHIME.strikerString / 2, 0]} material={m.goldSoft}>
            <cylinderGeometry args={[0.008, 0.008, CHIME.strikerString, 5]} />
          </mesh>
          <group position={[0, -CHIME.strikerString, 0]}>
            <mesh material={m.blush} castShadow>
              <cylinderGeometry args={[CHIME.strikerRadius, CHIME.strikerRadius * 0.92, 0.09, 40]} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={m.gold}>
              <torusGeometry args={[CHIME.strikerRadius, 0.014, 8, 48]} />
            </mesh>
            <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.32, 0.32]} />
              <meshBasicMaterial map={happyGold} transparent depthWrite={false} />
            </mesh>

            <group ref={sailRef}>
              <mesh position={[0, -CHIME.sailString / 2 + 0.2, 0]} material={m.goldSoft}>
                <cylinderGeometry args={[0.007, 0.007, CHIME.sailString - 0.4, 5]} />
              </mesh>
              <mesh position={[0, -CHIME.sailString - 0.16, 0]} geometry={sailGeometry} material={m.redSilk} castShadow />
              {/* Small pink tile with 囍 sitting on the sail */}
              <group position={[0, -CHIME.sailString - 0.16, 0.06]}>
                <mesh rotation={[Math.PI / 2, 0, 0]} material={m.blush}>
                  <cylinderGeometry args={[0.15, 0.15, 0.03, 32]} />
                </mesh>
                <mesh rotation={[Math.PI / 2, 0, 0]} material={m.gold}>
                  <torusGeometry args={[0.15, 0.008, 6, 32]} />
                </mesh>
                <mesh position={[0, 0, 0.02]}>
                  <planeGeometry args={[0.22, 0.22]} />
                  <meshBasicMaterial map={happy} transparent depthWrite={false} />
                </mesh>
              </group>
              <mesh position={[0, -CHIME.sailString - 0.56, 0]} material={m.gold}>
                <sphereGeometry args={[0.035, 10, 10]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
