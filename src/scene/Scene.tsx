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

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * Where everything sits for a given scene. Positions are in scene units at
 * z = 0; `vw`/`vh` are the visible width/height there, `pxWidth` the CSS pixel
 * width (used to line the 3D objects up with the CSS text column on desktop).
 */
function layoutFor(section: number, vw: number, vh: number, pxWidth: number): Layout {
  const hw = vw / 2
  const hh = vh / 2
  const portrait = vw < vh * 1.05

  if (portrait) {
    const corner: Placement = { x: hw * 0.5, y: hh * 0.86, s: clamp(vw * 0.115, 0.25, 0.36), ry: 0.3 }
    switch (section) {
      case SECTION.landing:
        return {
          chime: { x: 0, y: hh * 0.86, s: clamp(vw * 0.22, 0.45, 0.72) },
          ribbon: null,
          table: null,
          flowers: null,
          tile: null,
        }
      case SECTION.meal:
        return { chime: corner, ribbon: null, table: { x: -hw * 0.55, y: -hh * 0.78, s: 0.5, rx: 1.05, ry: -0.3 }, flowers: null, tile: null }
      case SECTION.afterParty:
        return { chime: corner, ribbon: { x: -hw * 0.2, y: -hh * 0.8, s: 0.6, rz: 0.15 }, table: null, flowers: null, tile: null }
      case SECTION.name:
        return { chime: corner, ribbon: null, table: null, flowers: { x: -hw * 0.58, y: -hh * 0.8, s: 0.7, rx: 0.6 }, tile: null }
      case SECTION.email:
        return { chime: corner, ribbon: null, table: null, flowers: null, tile: { x: -hw * 0.55, y: -hh * 0.72, s: 0.45, ry: 0.25 } }
      case SECTION.review:
        return { chime: corner, ribbon: null, table: null, flowers: { x: -hw * 0.62, y: -hh * 0.82, s: 0.5, rx: 0.6 }, tile: null }
      default:
        return {
          chime: { x: hw * 0.05, y: hh * 0.98, s: 0.42 },
          ribbon: { x: -hw * 0.3, y: -hh * 0.85, s: 0.55, rz: 0.25 },
          table: null,
          flowers: { x: -hw * 0.65, y: hh * 0.72, s: 0.45, rx: 0.5 },
          tile: null,
        }
    }
  }

  // Landscape / desktop: the text column (see global.css) ends at
  // clamp(48px, 50vw - 600px, 220px) + 600px. Everything 3D lives to its right,
  // centred in the remaining space and scaled to fill it.
  const columnRightPx = Math.min(pxWidth * 0.5, clamp(pxWidth / 2 - 600, 48, 220) + 600)
  const rightFrac = columnRightPx / pxWidth
  const centreX = ((rightFrac + 1) / 2 - 0.5) * vw
  const availUnits = vw * (1 - rightFrac)
  const heroScale = clamp(availUnits / 4.8, 0.8, 1.0)
  const smallScale = clamp(availUnits / 6, 0.5, 0.7)
  const corner: Placement = { x: centreX + availUnits * 0.12, y: hh * 0.9, s: smallScale, ry: 0.2 }
  const lowerLeft = { x: centreX - availUnits * 0.18, y: -hh * 0.45 }
  const lowerRight = { x: centreX + availUnits * 0.22, y: -hh * 0.55 }

  switch (section) {
    case SECTION.landing:
      return {
        chime: { x: centreX, y: hh * 0.87, s: heroScale },
        ribbon: null,
        table: null,
        flowers: { x: centreX + availUnits * 0.34, y: -hh * 0.7, s: 0.6, rx: 0.5 },
        tile: null,
      }
    case SECTION.meal:
      return {
        chime: corner,
        ribbon: null,
        table: { x: lowerLeft.x, y: lowerLeft.y, s: clamp(availUnits / 4.2, 0.8, 1.1), rx: 1.1, ry: -0.35 },
        flowers: null,
        tile: null,
      }
    case SECTION.afterParty:
      return {
        chime: corner,
        ribbon: { x: centreX, y: -hh * 0.25, s: clamp(availUnits / 4, 0.9, 1.2), rz: -0.1 },
        table: null,
        flowers: null,
        tile: null,
      }
    case SECTION.name:
      return {
        chime: corner,
        ribbon: null,
        table: null,
        flowers: { x: lowerLeft.x, y: -hh * 0.3, s: clamp(availUnits / 3.6, 1, 1.3), rx: 0.55 },
        tile: null,
      }
    case SECTION.email:
      return {
        chime: corner,
        ribbon: null,
        table: null,
        flowers: { x: lowerRight.x, y: -hh * 0.75, s: 0.6, rx: 0.5 },
        tile: { x: lowerLeft.x, y: -hh * 0.18, s: 0.85, ry: 0.3 },
      }
    case SECTION.review:
      return {
        chime: corner,
        ribbon: { x: centreX, y: -hh * 0.55, s: 0.95, rz: 0.2 },
        table: null,
        flowers: { x: lowerLeft.x - availUnits * 0.15, y: -hh * 0.72, s: 0.6, rx: 0.5 },
        tile: null,
      }
    default:
      return {
        chime: { x: centreX, y: hh * 0.9, s: clamp(availUnits / 4.4, 0.7, 0.9) },
        ribbon: { x: centreX, y: -hh * 0.5, s: 1.0, rz: 0.15 },
        table: null,
        flowers: { x: lowerRight.x + availUnits * 0.1, y: -hh * 0.05, s: 0.7, rx: 0.5 },
        tile: { x: lowerLeft.x - availUnits * 0.1, y: -hh * 0.35, s: 0.55, ry: -0.3 },
      }
  }
}

function ChimeWorld({ section, reduced }: { section: number; reduced: boolean }) {
  const { viewport, camera, size } = useThree()
  const chimeGroup = useRef<THREE.Group>(null)
  const current = useRef({ x: 0, y: 0, s: 0.001, ry: 0 })
  const layout = useMemo(
    () => layoutFor(section, viewport.width, viewport.height, size.width),
    [section, viewport.width, viewport.height, size.width],
  )
  const speed = reduced ? 0 : 7
  const fine = useMemo(() => window.matchMedia('(pointer: fine)').matches, [])

  useEffect(() => {
    // Snap into place on first paint so nothing "flies in".
    current.current = { x: layout.chime.x, y: layout.chime.y, s: layout.chime.s, ry: layout.chime.ry ?? 0 }
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
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-camera-near={1}
        shadow-camera-far={25}
        shadow-bias={-0.0004}
        shadow-radius={8}
      />
      <directionalLight position={[-5, 2, 3]} intensity={0.5} color="#ffd9e2" />
      <directionalLight position={[0, -3, 5]} intensity={0.25} color="#fff0e6" />
      <Suspense fallback={null}>
        <Environment resolution={64} frames={1}>
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
      dpr={[1, 1.5]}
      shadows
      camera={{ position: [0, 0, 8], fov: 35, near: 0.5, far: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false }}
      frameloop="always"
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
        gl.shadowMap.type = THREE.PCFSoftShadowMap
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          onError()
        })
      }}
      style={{ pointerEvents: 'none' }}
    >
      <Lights />
      <ChimeWorld section={section} reduced={reduced} />
    </Canvas>
  )
}
