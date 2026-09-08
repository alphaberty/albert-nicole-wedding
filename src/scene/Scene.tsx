import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { WindChime } from './WindChime'
import { FlowerCluster, HappinessTile, Ornament, Ribbon, TableSetting, type Placement } from './Ornaments'
import { chimeInput } from '../lib/hooks'

import { SECTION } from './sections'

interface Layout {
  chime: Placement
  ribbon: Placement | null
  table: Placement | null
  flowers: Placement | null
  tile: Placement | null
}

function layoutFor(section: number, vw: number, vh: number): Layout {
  const hw = vw / 2
  const hh = vh / 2
  const portrait = vw < vh * 1.05
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  const corner: Placement = portrait
    ? { x: hw * 0.5, y: hh * 0.86, s: clamp(vw * 0.115, 0.25, 0.36), ry: 0.3 }
    : { x: hw * 0.6, y: hh * 0.9, s: 0.55, ry: 0.2 }

  switch (section) {
    case SECTION.landing:
      return {
        chime: portrait ? { x: 0, y: hh * 0.86, s: clamp(vw * 0.22, 0.45, 0.72) } : { x: hw * 0.42, y: hh * 0.78, s: 0.86 },
        ribbon: null,
        table: null,
        flowers: portrait ? null : { x: -hw * 0.7, y: -hh * 0.72, s: 0.55, rx: 0.5 },
        tile: null,
      }
    case SECTION.meal:
      return {
        chime: corner,
        ribbon: null,
        table: portrait
          ? { x: -hw * 0.55, y: -hh * 0.78, s: 0.5, rx: 1.05, ry: -0.3 }
          : { x: hw * 0.6, y: -hh * 0.5, s: 1.0, rx: 1.1, ry: -0.35 },
        flowers: null,
        tile: null,
      }
    case SECTION.afterParty:
      return {
        chime: corner,
        ribbon: portrait ? { x: -hw * 0.2, y: -hh * 0.8, s: 0.6, rz: 0.15 } : { x: hw * 0.58, y: -hh * 0.2, s: 1.05, rz: -0.1 },
        table: null,
        flowers: null,
        tile: null,
      }
    case SECTION.name:
      return {
        chime: corner,
        ribbon: null,
        table: null,
        flowers: portrait ? { x: -hw * 0.58, y: -hh * 0.8, s: 0.7, rx: 0.6 } : { x: hw * 0.6, y: -hh * 0.3, s: 1.15, rx: 0.55 },
        tile: null,
      }
    case SECTION.email:
      return {
        chime: corner,
        ribbon: null,
        table: null,
        flowers: portrait ? null : { x: hw * 0.82, y: -hh * 0.72, s: 0.6, rx: 0.5 },
        tile: portrait ? { x: -hw * 0.55, y: -hh * 0.72, s: 0.45, ry: 0.25 } : { x: hw * 0.56, y: -hh * 0.18, s: 0.8, ry: 0.3 },
      }
    case SECTION.review:
      return {
        chime: corner,
        ribbon: portrait ? null : { x: hw * 0.62, y: -hh * 0.55, s: 0.9, rz: 0.2 },
        table: null,
        flowers: portrait ? { x: -hw * 0.62, y: -hh * 0.82, s: 0.5, rx: 0.6 } : { x: hw * 0.3, y: -hh * 0.75, s: 0.6, rx: 0.5 },
        tile: null,
      }
    default:
      return {
        chime: portrait ? { x: hw * 0.05, y: hh * 0.98, s: 0.42 } : { x: hw * 0.5, y: hh * 0.9, s: 0.72 },
        ribbon: portrait ? { x: -hw * 0.3, y: -hh * 0.85, s: 0.55, rz: 0.25 } : { x: hw * 0.55, y: -hh * 0.5, s: 1.0, rz: 0.15 },
        table: null,
        flowers: portrait ? { x: -hw * 0.65, y: hh * 0.72, s: 0.45, rx: 0.5 } : { x: hw * 0.88, y: -hh * 0.05, s: 0.7, rx: 0.5 },
        tile: portrait ? null : { x: hw * 0.18, y: -hh * 0.35, s: 0.55, ry: -0.3 },
      }
  }
}

function ChimeWorld({ section, reduced }: { section: number; reduced: boolean }) {
  const { viewport, camera, size } = useThree()
  const chimeGroup = useRef<THREE.Group>(null)
  const current = useRef({ x: 0, y: 0, s: 0.001, ry: 0 })
  const layout = useMemo(() => layoutFor(section, viewport.width, viewport.height), [section, viewport.width, viewport.height])
  const speed = reduced ? 0 : 7
  const fine = useMemo(() => window.matchMedia('(pointer: fine)').matches, [])
  const firstFrame = useRef(true)

  useEffect(() => {
    // Snap into place on first paint so nothing "flies in".
    current.current = { x: layout.chime.x, y: layout.chime.y, s: layout.chime.s, ry: layout.chime.ry ?? 0 }
    firstFrame.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((_, delta) => {
    const g = chimeGroup.current
    if (!g) return
    const c = current.current
    const t = layout.chime
    const ease = speed === 0 ? 1 : 1 - Math.exp(-Math.min(delta, 0.1) * speed)
    c.x += (t.x - c.x) * ease
    c.y += (t.y - c.y) * ease
    c.s += (t.s - c.s) * ease
    c.ry += ((t.ry ?? 0) - c.ry) * ease
    g.position.set(c.x, c.y, 0)
    g.scale.setScalar(c.s)
    g.rotation.y = c.ry

    if (!reduced && fine) {
      camera.position.x += (chimeInput.pointerX * 0.22 - camera.position.x) * 0.04
      camera.position.y += (chimeInput.pointerY * 0.14 - camera.position.y) * 0.04
      camera.lookAt(0, 0, 0)
    }
  })

  const float = reduced ? 0 : 1
  const shadowSize = Math.max(6, viewport.width * 0.8)
  void size

  return (
    <>
      <group ref={chimeGroup}>
        <WindChime ambient={reduced ? 0 : 1} />
      </group>

      <Ornament target={layout.table} speed={speed} float={float} phase={1}>
        <TableSetting />
      </Ornament>
      <Ornament target={layout.ribbon} speed={speed} float={float} phase={2}>
        <Ribbon />
      </Ornament>
      <Ornament target={layout.flowers} speed={speed} float={float} phase={3}>
        <FlowerCluster />
      </Ornament>
      <Ornament target={layout.tile} speed={speed} float={float} phase={4}>
        <HappinessTile />
      </Ornament>

      {/* Wall behind the composition that only shows the objects' soft shadows. */}
      <mesh position={[0, 0, -1.7]} receiveShadow>
        <planeGeometry args={[shadowSize * 3, shadowSize * 3]} />
        <shadowMaterial transparent opacity={0.11} color="#5a2a28" />
      </mesh>
    </>
  )
}

function Lights() {
  return (
    <>
      <hemisphereLight args={['#fff6ee', '#f3d6dc', 0.8]} />
      <directionalLight
        position={[2.5, 5, 11]}
        intensity={2.1}
        color="#fff4ea"
        castShadow
        shadow-mapSize-width={1536}
        shadow-mapSize-height={1536}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-camera-near={1}
        shadow-camera-far={25}
        shadow-bias={-0.0004}
        shadow-radius={10}
      />
      <directionalLight position={[-5, 2, 3]} intensity={0.5} color="#ffd9e2" />
      <directionalLight position={[0, -3, 5]} intensity={0.25} color="#fff0e6" />
      <Suspense fallback={null}>
        <Environment resolution={128} frames={1}>
          <Lightformer intensity={1.6} color="#fff7f0" position={[0, 6, -8]} scale={[12, 6, 1]} />
          <Lightformer intensity={0.9} color="#f7c9d3" position={[-8, 1, 2]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} />
          <Lightformer intensity={1.1} color="#fff1e4" position={[8, 3, 3]} rotation-y={-Math.PI / 2} scale={[8, 4, 1]} />
          <Lightformer intensity={0.5} color="#e9c7a5" position={[0, -6, 4]} rotation-x={Math.PI / 2} scale={[10, 6, 1]} />
        </Environment>
      </Suspense>
    </>
  )
}

interface SceneProps {
  section: number
  reduced: boolean
  onError: () => void
}

export function Scene({ section, reduced, onError }: SceneProps) {
  return (
    <Canvas
      className="scene-canvas"
      dpr={[1, 1.75]}
      shadows
      camera={{ position: [0, 0, 8], fov: 35, near: 0.5, far: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false }}
      frameloop="always"
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
        gl.shadowMap.type = THREE.PCFSoftShadowMap
        const canvas = gl.domElement
        canvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          onError()
        })
      }}
      style={{ pointerEvents: 'none' }}
      eventSource={undefined}
    >
      <Lights />
      <ChimeWorld section={section} reduced={reduced} />
    </Canvas>
  )
}
