import type { StopCategory, LngLat } from '../types'
import { haversineKm } from '../geo'

/**
 * Real-place finding via Overpass (OpenStreetMap).
 *
 * The kids' Adventure Walk asks "what would delight a child near this walk?".
 * Wander asks the grown-up question: "what's genuinely worth a detour here?"
 * — so the selector set is much broader: pubs, bars, breweries, cafés,
 * bakeries, delis, markets, galleries, street art, theatres, cinemas,
 * bookshops, museums, historic architecture, places of worship, viewpoints,
 * parks, gardens, waterside and notable trees.
 *
 * Best-effort: if Overpass is down or finds nothing, the generator falls
 * back to open-ended "wander" spots spaced along the route.
 */

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

export interface Candidate {
  coord: LngLat
  name?: string
  category: StopCategory
}

function bboxAround(coords: LngLat[], padKm: number): string {
  let south = Infinity,
    north = -Infinity,
    west = Infinity,
    east = -Infinity
  for (const [lng, lat] of coords) {
    south = Math.min(south, lat)
    north = Math.max(north, lat)
    west = Math.min(west, lng)
    east = Math.max(east, lng)
  }
  const midLat = (south + north) / 2
  const latPad = padKm / 110.57
  const lngPad = padKm / (111.32 * Math.cos((midLat * Math.PI) / 180) || 1)
  return `${south - latPad},${west - lngPad},${north + latPad},${east + lngPad}`
}

/**
 * Overpass selectors → category. Named places are strongly preferred: an
 * unnamed café is noise, but a named one is a real recommendation, so most
 * food/drink/culture selectors require ["name"].
 */
const SELECTORS: [string, StopCategory][] = [
  // drink
  ['node["amenity"="pub"]["name"]', 'pub'],
  ['node["amenity"="bar"]["name"]', 'bar'],
  ['node["amenity"="biergarten"]["name"]', 'pub'],
  ['node["craft"="brewery"]["name"]', 'brewery'],
  ['node["microbrewery"="yes"]["name"]', 'brewery'],
  ['node["industrial"="brewery"]["name"]', 'brewery'],
  // food
  ['node["amenity"="cafe"]["name"]', 'cafe'],
  ['node["shop"="coffee"]["name"]', 'cafe'],
  ['node["shop"="bakery"]["name"]', 'bakery'],
  ['node["shop"="deli"]["name"]', 'deli'],
  ['node["shop"="cheese"]["name"]', 'deli'],
  ['node["amenity"="marketplace"]["name"]', 'market'],
  ['node["amenity"="restaurant"]["name"]', 'restaurant'],
  ['way["amenity"="marketplace"]["name"]', 'market'],
  // arts & culture
  ['node["tourism"="gallery"]["name"]', 'gallery'],
  ['way["tourism"="gallery"]["name"]', 'gallery'],
  ['node["tourism"="artwork"]', 'artwork'],
  ['way["tourism"="artwork"]["name"]', 'artwork'],
  ['node["artwork_type"~"mural|graffiti|street_art"]', 'street-art'],
  ['node["tourism"="museum"]["name"]', 'museum'],
  ['way["tourism"="museum"]["name"]', 'museum'],
  ['node["amenity"="theatre"]["name"]', 'theatre'],
  ['way["amenity"="theatre"]["name"]', 'theatre'],
  ['node["amenity"="cinema"]["name"]', 'cinema'],
  ['node["shop"="books"]["name"]', 'bookshop'],
  ['node["amenity"="arts_centre"]["name"]', 'music'],
  ['node["amenity"="nightclub"]["name"]', 'music'],
  // heritage & architecture
  ['node["historic"="memorial"]', 'memorial'],
  ['node["historic"="monument"]', 'monument'],
  ['way["historic"="monument"]["name"]', 'monument'],
  ['node["historic"]["historic"!~"memorial|monument"]["name"]', 'historic'],
  ['way["historic"]["name"]', 'historic'],
  ['way["amenity"="place_of_worship"]["name"]', 'worship'],
  ['node["amenity"="place_of_worship"]["name"]', 'worship'],
  ['way["man_made"="bridge"]["name"]', 'bridge'],
  ['node["tourism"="attraction"]["name"]', 'landmark'],
  ['way["tourism"="attraction"]["name"]', 'landmark'],
  // green & scenic
  ['node["tourism"="viewpoint"]', 'viewpoint'],
  ['way["leisure"="park"]["name"]', 'park'],
  ['way["leisure"="garden"]["name"]', 'garden'],
  ['node["natural"="tree"]["name"]', 'tree'],
  ['way["natural"="water"]["name"]', 'water'],
  ['way["waterway"~"river|canal"]["name"]', 'river'],
  ['node["amenity"="fountain"]', 'fountain'],
]

/** Places that aren't actually visitable — filter before they reach ranking. */
function notVisitable(tags: Record<string, string>): boolean {
  if (tags.access === 'private' || tags.access === 'no') return true
  if (tags.disused === 'yes' || tags['disused:amenity']) return true
  if (tags.opening_hours === 'closed') return true
  return false
}

async function queryOverpass(body: string): Promise<any> {
  let lastErr: unknown
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: `data=${encodeURIComponent(body)}`,
      })
      if (!res.ok) throw new Error(`Overpass failed (${res.status})`)
      return await res.json()
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Overpass unreachable')
}

export async function findCandidates(routeCoords: LngLat[], padKm = 0.35): Promise<Candidate[]> {
  const bbox = bboxAround(routeCoords, padKm)
  const body = `[out:json][timeout:16];(${SELECTORS.map(([s]) => `${s}(${bbox});`).join('')});out center 200;`
  const data = await queryOverpass(body)
  const out: Candidate[] = []
  for (const el of data.elements ?? []) {
    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    if (lat == null || lon == null) continue
    const tags = el.tags ?? {}
    if (notVisitable(tags)) continue
    const category = categorise(tags)
    if (!category) continue
    out.push({ coord: [lon, lat], name: tags.name, category })
  }
  return dedupe(out)
}

function categorise(tags: Record<string, string>): StopCategory | null {
  // drink
  if (tags.amenity === 'pub' || tags.amenity === 'biergarten') return 'pub'
  if (tags.amenity === 'bar') return 'bar'
  if (tags.craft === 'brewery' || tags.microbrewery === 'yes' || tags.industrial === 'brewery') return 'brewery'
  // food
  if (tags.amenity === 'cafe' || tags.shop === 'coffee') return 'cafe'
  if (tags.shop === 'bakery') return 'bakery'
  if (tags.shop === 'deli' || tags.shop === 'cheese') return 'deli'
  if (tags.amenity === 'marketplace') return 'market'
  if (tags.amenity === 'restaurant') return 'restaurant'
  // culture
  if (tags.tourism === 'gallery') return 'gallery'
  if (tags.artwork_type && /mural|graffiti|street_art/.test(tags.artwork_type)) return 'street-art'
  if (tags.tourism === 'artwork') return 'artwork'
  if (tags.tourism === 'museum') return 'museum'
  if (tags.amenity === 'theatre') return 'theatre'
  if (tags.amenity === 'cinema') return 'cinema'
  if (tags.shop === 'books') return 'bookshop'
  if (tags.amenity === 'arts_centre' || tags.amenity === 'nightclub') return 'music'
  // heritage
  if (tags.historic === 'memorial') return 'memorial'
  if (tags.historic === 'monument') return 'monument'
  if (tags.historic) return 'historic'
  if (tags.amenity === 'place_of_worship') return 'worship'
  if (tags.man_made === 'bridge') return 'bridge'
  if (tags.tourism === 'attraction') return 'landmark'
  // green
  if (tags.tourism === 'viewpoint') return 'viewpoint'
  if (tags.leisure === 'park') return 'park'
  if (tags.leisure === 'garden') return 'garden'
  if (tags.natural === 'tree') return 'tree'
  if (tags.natural === 'water') return 'water'
  if (tags.waterway) return 'river'
  if (tags.amenity === 'fountain') return 'fountain'
  return null
}

/** Drop near-duplicates (two candidates within ~55 m of each other). */
function dedupe(list: Candidate[]): Candidate[] {
  const kept: Candidate[] = []
  for (const c of list) {
    if (kept.some((k) => haversineKm(k.coord, c.coord) < 0.055)) continue
    kept.push(c)
  }
  return kept
}
