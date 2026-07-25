import type { LngLat, Place } from '../types'

/** Geocoding via Photon (komoot) — free, keyless, CORS-enabled. */
export async function searchPlaces(query: string, near?: LngLat, limit = 6): Promise<Place[]> {
  if (!query.trim()) return []
  const params = new URLSearchParams({ q: query, limit: String(limit), lang: 'en' })
  if (near) {
    params.set('lon', near[0].toFixed(4))
    params.set('lat', near[1].toFixed(4))
  }
  const res = await fetch(`https://photon.komoot.io/api/?${params}`)
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`)
  const data = await res.json()
  return (data.features ?? []).map((f: any) => {
    const p = f.properties ?? {}
    const parts = [p.city ?? p.county, p.state, p.country].filter(Boolean)
    return {
      name: p.name ?? query,
      detail: parts.join(', '),
      coord: f.geometry.coordinates.slice(0, 2) as LngLat,
    }
  })
}

export async function reverseGeocode(coord: LngLat): Promise<string> {
  try {
    const res = await fetch(
      `https://photon.komoot.io/reverse?lon=${coord[0].toFixed(5)}&lat=${coord[1].toFixed(5)}&lang=en`,
    )
    const data = await res.json()
    const p = data.features?.[0]?.properties
    if (!p) return fmt(coord)
    return [p.name ?? p.street, p.city ?? p.county].filter(Boolean).join(', ') || fmt(coord)
  } catch {
    return fmt(coord)
  }
}

function fmt(c: LngLat) {
  return `${c[1].toFixed(4)}, ${c[0].toFixed(4)}`
}
