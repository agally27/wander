import type { LngLat } from '../types'
import { decodePolyline6, destination, haversineKm } from '../geo'

/**
 * Walking routes via the FOSSGIS Valhalla instance (free, keyless,
 * CORS-enabled), with the FOSSGIS OSRM foot profile as a fallback.
 * Same two-engine chain proven in the Elecride project, switched to
 * pedestrian costing: footpaths, parks and crossings are first-class.
 */

const VALHALLA = 'https://valhalla1.openstreetmap.de/route'

export interface RawRoute {
  coords: LngLat[]
  distanceKm: number
  timeMin: number
}

export async function fetchWalkRoute(waypoints: LngLat[], speedKmh: number): Promise<RawRoute> {
  try {
    return await fetchValhalla(waypoints, speedKmh)
  } catch (e) {
    if (!looksUnreachable(e)) throw e
    return await fetchOsrmFoot(waypoints, speedKmh)
  }
}

function looksUnreachable(e: unknown): boolean {
  const msg = String((e as any)?.message ?? e).toLowerCase()
  return (
    (e as any)?.name === 'TypeError' ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('load failed') ||
    /\((403|429|5\d\d)\)/.test(msg)
  )
}

async function fetchValhalla(waypoints: LngLat[], speedKmh: number): Promise<RawRoute> {
  const body = {
    locations: waypoints.map(([lon, lat]) => ({ lon, lat })),
    costing: 'pedestrian',
    costing_options: {
      pedestrian: {
        walking_speed: speedKmh,
        // prefer paths/parks over road walking, keep it family-safe
        walkway_factor: 0.8,
        sidewalk_factor: 0.9,
        driveway_factor: 5,
        use_ferry: 0,
        max_hiking_difficulty: 1,
      },
    },
    directions_options: { units: 'kilometers' },
  }
  const res = await fetch(`${VALHALLA}?json=${encodeURIComponent(JSON.stringify(body))}`)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Routing failed (${res.status}) ${text.slice(0, 140)}`)
  }
  const data = await res.json()
  const trip = data.trip
  if (!trip?.legs?.length) throw new Error('No walking route found between these points')
  const coords: LngLat[] = []
  for (const leg of trip.legs) {
    const seg = decodePolyline6(leg.shape)
    coords.push(...(coords.length ? seg.slice(1) : seg))
  }
  return { coords, distanceKm: trip.summary.length, timeMin: trip.summary.time / 60 }
}

async function fetchOsrmFoot(waypoints: LngLat[], speedKmh: number): Promise<RawRoute> {
  const path = waypoints.map(([lon, lat]) => `${lon.toFixed(6)},${lat.toFixed(6)}`).join(';')
  const res = await fetch(
    `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${path}?overview=full&geometries=polyline6&steps=false&alternatives=false`,
  )
  if (!res.ok) throw new Error(`Routing failed (${res.status})`)
  const data = await res.json()
  const route = data.routes?.[0]
  if (data.code !== 'Ok' || !route?.geometry) throw new Error('No walking route found between these points')
  const distanceKm = route.distance / 1000
  return {
    coords: decodePolyline6(route.geometry),
    distanceKm,
    timeMin: (distanceKm / Math.max(2, speedKmh)) * 60,
  }
}

/**
 * A gentle loop of roughly `targetKm`, starting and ending at `start`.
 * Waypoints sit on a circle whose circumference approximates the target
 * distance, with a road-network correction factor (reused from Elecride).
 */
export function loopWaypoints(start: LngLat, targetKm: number, headingDeg: number): LngLat[] {
  const r = Math.max(0.18, (targetKm / (2 * Math.PI)) * 0.8)
  const center = destination(start, r, headingDeg)
  const pts: LngLat[] = [start]
  for (const off of [140, 200, 260, 320]) {
    pts.push(destination(center, r, headingDeg + off))
  }
  pts.push(start)
  return pts
}

/** Order candidate waypoints greedily from the start so the walk flows one way. */
export function orderByNearestNeighbour(start: LngLat, points: LngLat[]): LngLat[] {
  const left = [...points]
  const out: LngLat[] = []
  let cur = start
  while (left.length) {
    let bi = 0
    let bd = Infinity
    left.forEach((p, i) => {
      const d = haversineKm(cur, p)
      if (d < bd) {
        bd = d
        bi = i
      }
    })
    cur = left.splice(bi, 1)[0]
    out.push(cur)
  }
  return out
}
