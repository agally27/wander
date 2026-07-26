import type { LngLat } from '../types'
import { sampleIndicesByDistance } from '../geo'

/**
 * Elevation profiles via the Open-Meteo elevation API (free, keyless,
 * CORS-enabled) — the same proven, keyless source used for range
 * calculations in Elecride. The API accepts up to 100 points per call, so
 * the route is resampled to ~100 evenly spaced points by distance.
 */

export interface ElevationSample {
  distKm: number
  ele: number // metres
}

export async function fetchElevationProfile(coords: LngLat[], cum: number[]): Promise<ElevationSample[]> {
  const idx = sampleIndicesByDistance(cum, 100)
  const lats = idx.map((i) => coords[i][1].toFixed(5)).join(',')
  const lngs = idx.map((i) => coords[i][0].toFixed(5)).join(',')
  const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`)
  if (!res.ok) throw new Error(`Elevation lookup failed (${res.status})`)
  const data = await res.json()
  const eles: number[] = data.elevation ?? []
  const samples = idx.map((i, k) => ({ distKm: cum[i], ele: eles[k] ?? 0 }))
  return smooth(samples)
}

/** Light 3-tap smoothing to remove DEM noise before computing gain/loss. */
function smooth(s: ElevationSample[]): ElevationSample[] {
  if (s.length < 3) return s
  return s.map((p, i) => {
    if (i === 0 || i === s.length - 1) return p
    return { ...p, ele: (s[i - 1].ele + p.ele * 2 + s[i + 1].ele) / 4 }
  })
}

export function gainLoss(profile: ElevationSample[]): { gainM: number; lossM: number } {
  let gain = 0
  let loss = 0
  for (let i = 1; i < profile.length; i++) {
    const d = profile[i].ele - profile[i - 1].ele
    if (d > 0) gain += d
    else loss -= d
  }
  return { gainM: Math.round(gain), lossM: Math.round(loss) }
}
