import * as THREE from 'three'

export const COLORS = {
  ivory: '#FFF9F3',
  blush: '#F1C5CF',
  blushDeep: '#E7A9B8',
  red: '#A52D2A',
  redDeep: '#8A2422',
  gold: '#C8AB66',
  goldDeep: '#B59A5D',
  text: '#342824',
}

let cache: Record<string, THREE.Material> | null = null

export function materials() {
  if (cache) return cache
  cache = {
    blush: new THREE.MeshPhysicalMaterial({
      color: COLORS.blush,
      roughness: 0.42,
      metalness: 0,
      clearcoat: 0.7,
      clearcoatRoughness: 0.35,
      sheen: 0.4,
      sheenColor: new THREE.Color('#ffd8e0'),
    }),
    blushMatte: new THREE.MeshStandardMaterial({ color: COLORS.blush, roughness: 0.7, metalness: 0 }),
    red: new THREE.MeshPhysicalMaterial({
      color: COLORS.red,
      roughness: 0.3,
      metalness: 0.12,
      clearcoat: 0.9,
      clearcoatRoughness: 0.18,
    }),
    redSilk: new THREE.MeshPhysicalMaterial({
      color: COLORS.red,
      roughness: 0.55,
      metalness: 0,
      sheen: 1,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color('#f0a0a0'),
      side: THREE.DoubleSide,
    }),
    gold: new THREE.MeshStandardMaterial({ color: COLORS.gold, metalness: 0.95, roughness: 0.28 }),
    goldSoft: new THREE.MeshStandardMaterial({ color: COLORS.goldDeep, metalness: 0.6, roughness: 0.45 }),
    ivory: new THREE.MeshPhysicalMaterial({
      color: COLORS.ivory,
      roughness: 0.35,
      metalness: 0,
      clearcoat: 0.5,
      clearcoatRoughness: 0.4,
    }),
  }
  return cache
}

/** Renders a single glyph (e.g. 囍) to a transparent texture. */
export function glyphTexture(glyph: string, color: string, size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `${Math.round(size * 0.72)}px "Songti SC", "Noto Serif CJK SC", "PingFang SC", "Microsoft YaHei", serif`
    ctx.fillText(glyph, size / 2, size / 2 + size * 0.04)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/**
 * Flat silk ribbon following a curve. Two vertices per sample, offset along a
 * gently twisting normal so the ribbon catches light along its length.
 */
export function ribbonGeometry(points: THREE.Vector3[], width = 0.22, samples = 140, twist = 1.6): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5)
  const frames = curve.computeFrenetFrames(samples, false)
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const p = new THREE.Vector3()
  const side = new THREE.Vector3()
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    curve.getPointAt(t, p)
    const angle = Math.sin(t * Math.PI * twist) * 0.9
    side.copy(frames.normals[i]).multiplyScalar(Math.cos(angle)).addScaledVector(frames.binormals[i], Math.sin(angle))
    const w = width * (0.6 + 0.4 * Math.sin(t * Math.PI))
    for (const sgn of [-1, 1]) {
      positions.push(p.x + side.x * w * sgn * 0.5, p.y + side.y * w * sgn * 0.5, p.z + side.z * w * sgn * 0.5)
      const n = new THREE.Vector3().crossVectors(frames.tangents[i], side).normalize()
      normals.push(n.x, n.y, n.z)
      uvs.push(t, sgn > 0 ? 1 : 0)
    }
    if (i < samples) {
      const a = i * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  return geo
}
