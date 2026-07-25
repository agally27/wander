import type { LngLat } from './types'

const R = 6371.0088 // earth radius km

export function haversineKm(a: LngLat, b: LngLat): number {
  const dLat = ((b[1] - a[1]) * Math.PI) / 180
  const dLng = ((b[0] - a[0]) * Math.PI) / 180
  const la1 = (a[1] * Math.PI) / 180
  const la2 = (b[1] * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * Project point p onto the segment a→b using a local equirectangular frame
 * (accurate over the tens-of-km corridors we care about). Returns the
 * along-track fraction t (0 at a, 1 at b, may fall outside [0,1]) and the
 * perpendicular distance in km.
 */
export function projectParam(a: LngLat, b: LngLat, p: LngLat): { t: number; perpKm: number } {
  const kx = 111.32 * Math.cos((a[1] * Math.PI) / 180)
  const ky = 110.57
  const ax = 0
  const ay = 0
  const bx = (b[0] - a[0]) * kx
  const by = (b[1] - a[1]) * ky
  const px = (p[0] - a[0]) * kx
  const py = (p[1] - a[1]) * ky
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy || 1e-9
  const t = (px * dx + py * dy) / len2
  const projx = t * dx
  const projy = t * dy
  const perpKm = Math.hypot(px - projx, py - projy)
  return { t, perpKm }
}

export function bearingDeg(a: LngLat, b: LngLat): number {
  const la1 = (a[1] * Math.PI) / 180
  const la2 = (b[1] * Math.PI) / 180
  const dLng = ((b[0] - a[0]) * Math.PI) / 180
  const y = Math.sin(dLng) * Math.cos(la2)
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

/** Project a point `distKm` away from origin along `bearing` degrees. */
export function destination(origin: LngLat, distKm: number, bearing: number): LngLat {
  const br = (bearing * Math.PI) / 180
  const la1 = (origin[1] * Math.PI) / 180
  const ln1 = (origin[0] * Math.PI) / 180
  const dr = distKm / R
  const la2 = Math.asin(Math.sin(la1) * Math.cos(dr) + Math.cos(la1) * Math.sin(dr) * Math.cos(br))
  const ln2 =
    ln1 + Math.atan2(Math.sin(br) * Math.sin(dr) * Math.cos(la1), Math.cos(dr) - Math.sin(la1) * Math.sin(la2))
  return [((ln2 * 180) / Math.PI + 540) % 360 - 180, (la2 * 180) / Math.PI]
}

/** Decode a Valhalla polyline (precision 6). Returns [lng, lat] coords. */
export function decodePolyline6(str: string): LngLat[] {
  let index = 0
  let lat = 0
  let lng = 0
  const coords: LngLat[] = []
  while (index < str.length) {
    for (const which of [0, 1]) {
      let shift = 0
      let result = 0
      let byte: number
      do {
        byte = str.charCodeAt(index++) - 63
        result |= (byte & 0x1f) << shift
        shift += 5
      } while (byte >= 0x20)
      const delta = result & 1 ? ~(result >> 1) : result >> 1
      if (which === 0) lat += delta
      else lng += delta
    }
    coords.push([lng / 1e6, lat / 1e6])
  }
  return coords
}

/** Cumulative distance (km) along a coordinate array. */
export function cumulativeKm(coords: LngLat[]): number[] {
  const out = new Array<number>(coords.length)
  out[0] = 0
  for (let i = 1; i < coords.length; i++) {
    out[i] = out[i - 1] + haversineKm(coords[i - 1], coords[i])
  }
  return out
}

/** Pick n roughly evenly spaced indices along coords by distance. */
export function sampleIndicesByDistance(cum: number[], n: number): number[] {
  const total = cum[cum.length - 1]
  if (cum.length <= n) return cum.map((_, i) => i)
  const idx: number[] = []
  let j = 0
  for (let i = 0; i < n; i++) {
    const target = (total * i) / (n - 1)
    while (j < cum.length - 1 && cum[j] < target) j++
    if (idx[idx.length - 1] !== j) idx.push(j)
  }
  return idx
}

/** Point along the polyline at a given distance (km). */
export function pointAtDistance(coords: LngLat[], cum: number[], distKm: number): LngLat {
  if (distKm <= 0) return coords[0]
  const total = cum[cum.length - 1]
  if (distKm >= total) return coords[coords.length - 1]
  let lo = 0
  let hi = cum.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (cum[mid] < distKm) lo = mid + 1
    else hi = mid
  }
  const i = Math.max(1, lo)
  const seg = cum[i] - cum[i - 1] || 1e-9
  const t = (distKm - cum[i - 1]) / seg
  const a = coords[i - 1]
  const b = coords[i]
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

export function bboxOf(coords: LngLat[]): [LngLat, LngLat] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of coords) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return [
    [minX, minY],
    [maxX, maxY],
  ]
}

/** Curviness 0..1 — total heading change per km, normalised. */
export function curviness(coords: LngLat[], cum: number[]): number {
  if (coords.length < 3) return 0
  let turn = 0
  const step = Math.max(1, Math.floor(coords.length / 200))
  for (let i = step; i < coords.length - step; i += step) {
    const b1 = bearingDeg(coords[i - step], coords[i])
    const b2 = bearingDeg(coords[i], coords[i + step])
    let d = Math.abs(b2 - b1)
    if (d > 180) d = 360 - d
    turn += d
  }
  const total = cum[cum.length - 1] || 1
  return Math.min(1, turn / total / 120)
}

/** Deterministic pseudo-random 0..1 from a seed string — keeps derived metrics stable per route. */
export function seeded(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return ((h >>> 0) % 100000) / 100000
  }
}
