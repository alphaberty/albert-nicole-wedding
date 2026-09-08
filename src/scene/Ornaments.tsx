import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { glyphTexture, materials, ribbonGeometry, COLORS } from './materials'
import { Blossom } from './WindChime'

export interface Placement {
  x: number
  y: number
  z?: number
  s: number
  rx?: number
  ry?: number
  rz?: number
}

interface OrnamentProps {
  target: Placement | null
  /** Exponential approach speed per second; 0 = instant. */
  speed: number
  /** Float amplitude (0 for reduced motion). */
  float: number
  phase?: number
  children: React.ReactNode
}

/** Moves and scales its children toward a target; scales to zero when hidden. */
export function Ornament({ target, speed, float, phase = 0, children }: OrnamentProps) {
  const ref = useRef<THREE.Group>(null)
  const inner = useRef<THREE.Group>(null)
  const current = useRef({ x: target?.x ?? 0, y: target?.y ?? 0, z: target?.z ?? 0, s: 0, rx: 0, ry: 0, rz: 0 })

  useFrame(({ clock }, delta) => {
    const g = ref.current
    if (!g) return
    const c = current.current
    const t = target ?? { x: c.x, y: c.y, z: c.z, s: 0, rx: c.rx, ry: c.ry, rz: c.rz }
    const k = speed === 0 ? 1 : 1 - Math.exp(-Math.min(delta, 0.1) * speed)
    c.x += (t.x - c.x) * k
    c.y += (t.y - c.y) * k
    c.z += ((t.z ?? 0) - c.z) * k
    c.s += (t.s - c.s) * k
    c.rx += ((t.rx ?? 0) - c.rx) * k
    c.ry += ((t.ry ?? 0) - c.ry) * k
    c.rz += ((t.rz ?? 0) - c.rz) * k
    g.position.set(c.x, c.y, c.z)
    const s = Math.max(0.0001, c.s)
    g.scale.setScalar(s)
    g.rotation.set(c.rx, c.ry, c.rz)
    g.visible = c.s > 0.01
    if (inner.current && float > 0) {
      const time = clock.elapsedTime + phase
      inner.current.position.y = Math.sin(time * 0.9) * 0.08 * float
      inner.current.rotation.z = Math.sin(time * 0.6 + 1) * 0.04 * float
      inner.current.rotation.y = Math.sin(time * 0.4) * 0.12 * float
    }
  })

  return (
    <group ref={ref} visible={false}>
      <group ref={inner}>{children}</group>
    </group>
  )
}

/** Loose silk ribbon curling through the air. */
export function Ribbon({ color = 'red' as 'red' | 'blush' }) {
  const m = materials()
  const geo = useMemo(
    () =>
      ribbonGeometry(
        [
          new THREE.Vector3(-1.5, 0.1, 0.2),
          new THREE.Vector3(-0.9, 0.7, -0.2),
          new THREE.Vector3(-0.2, 0.35, 0.35),
          new THREE.Vector3(0.45, 0.85, -0.1),
          new THREE.Vector3(1.05, 0.25, 0.3),
          new THREE.Vector3(1.6, 0.6, -0.25),
        ],
        0.26,
        110,
        2.2,
      ),
    [],
  )
  const mat = useMemo(
    () =>
      color === 'red'
        ? m.redSilk
        : new THREE.MeshPhysicalMaterial({
            color: COLORS.blushDeep,
            roughness: 0.5,
            sheen: 1,
            sheenColor: '#fff0f4',
            side: THREE.DoubleSide,
          }),
    [color, m.redSilk],
  )
  return <mesh geometry={geo} material={mat} castShadow />
}

/** A sculptural place setting: ivory plate, gold rim, folded red napkin, blossom. */
export function TableSetting() {
  const m = materials()
  return (
    <group>
      <mesh material={m.ivory} castShadow receiveShadow>
        <cylinderGeometry args={[1, 0.92, 0.06, 40]} />
      </mesh>
      <mesh position={[0, 0.032, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.gold}>
        <torusGeometry args={[0.98, 0.012, 6, 64]} />
      </mesh>
      <mesh position={[0, 0.032, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.gold}>
        <torusGeometry args={[0.7, 0.008, 6, 64]} />
      </mesh>
      <mesh position={[0, 0.04, 0]} material={m.ivory}>
        <cylinderGeometry args={[0.66, 0.7, 0.02, 40]} />
      </mesh>
      {/* Folded napkin */}
      <mesh position={[-0.05, 0.1, 0.1]} rotation={[0, 0.4, 0]} material={m.redSilk} castShadow>
        <boxGeometry args={[0.62, 0.05, 0.36]} />
      </mesh>
      <mesh position={[0.04, 0.155, 0.04]} rotation={[0, 0.65, 0]} material={m.redSilk} castShadow>
        <boxGeometry args={[0.4, 0.05, 0.3]} />
      </mesh>
      <Blossom position={[0.36, 0.2, -0.15]} size={0.19} />
      {/* Chopstick rest & chopsticks */}
      <mesh position={[0.95, 0.06, 0.55]} rotation={[0, -0.25, 0]} material={m.blush}>
        <boxGeometry args={[0.14, 0.05, 0.18]} />
      </mesh>
      <mesh position={[0.86, 0.11, 0.2]} rotation={[0, -0.25, 0]} material={m.gold}>
        <cylinderGeometry args={[0.012, 0.008, 1.5, 8]} />
      </mesh>
      <mesh position={[0.94, 0.11, 0.22]} rotation={[0, -0.25, 0.05]} material={m.gold}>
        <cylinderGeometry args={[0.012, 0.008, 1.5, 8]} />
      </mesh>
    </group>
  )
}

export function FlowerCluster() {
  const m = materials()
  return (
    <group>
      <Blossom position={[0, 0, 0]} size={0.34} />
      <Blossom position={[0.45, -0.15, 0.2]} size={0.24} color={COLORS.blushDeep} />
      <Blossom position={[-0.4, -0.2, 0.1]} size={0.2} />
      <Blossom position={[0.2, 0.32, -0.25]} size={0.17} color="#f7d9df" />
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.cos(i * 1.9) * 0.62, Math.sin(i * 2.3) * 0.36, Math.sin(i) * 0.25]} material={m.gold}>
          <sphereGeometry args={[0.03 + (i % 2) * 0.012, 10, 10]} />
        </mesh>
      ))}
    </group>
  )
}

/** Red lacquer tile with 囍 in gold, hung from a fine cord. */
export function HappinessTile() {
  const m = materials()
  const tex = useMemo(() => glyphTexture('囍', COLORS.gold, 512), [])
  return (
    <group>
      <mesh position={[0, 1.2, 0]} material={m.goldSoft}>
        <cylinderGeometry args={[0.007, 0.007, 1.4, 5]} />
      </mesh>
      <mesh material={m.red} castShadow>
        <boxGeometry args={[1, 1, 0.09]} />
      </mesh>
      <mesh position={[0, 0, 0.047]}>
        <planeGeometry args={[0.8, 0.8]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.05]} material={m.gold}>
        <ringGeometry args={[0.6, 0.62, 64]} />
      </mesh>
      <mesh position={[0, -0.62, 0]} material={m.gold}>
        <sphereGeometry args={[0.045, 12, 12]} />
      </mesh>
      <mesh position={[0, -0.85, 0]} material={m.redSilk}>
        <cylinderGeometry args={[0.02, 0.06, 0.4, 10]} />
      </mesh>
    </group>
  )
}
