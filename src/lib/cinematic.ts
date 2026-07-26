import type { Walk, LngLat } from './types'
import { cumulativeKm, haversineKm } from './geo'

/**
 * The fly-over director. Turns a Walk into a scene timeline that the player
 * performs in real time on the live map — no video, no pre-rendering, driven
 * entirely by the walk data.
 *
 * Scene flow:
 *   intro → launch → (travel → stop) × n → travel home → finale
 *
 * Camera work is Elecride's fly-through, re-tuned: Elecride paces a bike
 * ride at pitch 62 / zoom 14.6 with a look-ahead bearing and a 6% easing
 * turn. Here the pace is a walking glide, the camera sits lower and closer,
 * and the flight pauses to zoom in at every stop rather than running the
 * route end to end.
 */

export type SceneKind = 'intro' | 'launch' | 'travel' | 'stop' | 'finale'

export interface Scene {
  kind: SceneKind
  durationMs: number
  /** travel scenes: route km window this scene covers */
  fromKm: number
  toKm: number
  /** stop scenes: index into walk.stops */
  stopIndex?: number
}

export interface Timeline {
  scenes: Scene[]
  totalKm: number
  cum: number[]
  /** km along the route of each stop */
  stopKm: number[]
}

export const CAM = {
  travelPitch: 58,
  travelZoom: 16.6,
  // Closer to travelPitch than before — real footpaths swap between "travel"
  // and "stop" framing at every single stop, and a big pitch swing each time
  // reads as the camera angle constantly changing. A smaller gap keeps the
  // settle-and-zoom feel without the repeated tilt.
  stopPitch: 48,
  stopZoom: 17.4,
  // A real pedestrian path has small kinks (jogs round corners, footpath
  // nodes placed a little unevenly) that a short look-ahead reacts to every
  // frame, making the camera swing back and forth. Looking further ahead
  // and easing more slowly both damp that out in favour of the path's
  // overall direction of travel.
  lookAheadKm: 0.3,
  bearingEase: 0.045,
}

export type CamProfile = typeof CAM & { terrain: boolean; exaggeration: number }

/**
 * A walk needs this much total ascent before 3D terrain earns its place.
 * Below it there's nothing to see — an ordinary town walk is essentially
 * flat at any believable exaggeration — and terrain isn't free: it shifts
 * every DOM marker onto the elevation surface and enables occlusion testing
 * (markers behind a rise get faded out), which on flat ground only makes
 * the numbered stops drift and blink against their own trail line.
 */
const HILLY_GAIN_M = 80

/**
 * Camera framing for this walk.
 *
 * MapLibre re-derives `transform.elevation` from the terrain under the
 * CENTRE point every frame, and the camera then sits a fixed height above
 * that — a height set by zoom and pitch. At the flat-walk framing
 * (zoom 16.6 / pitch 58) that height works out around 300 m. Fine over a
 * town; useless on a real hill, where ground ahead of the camera can rise
 * several hundred metres more than the point being centred on, so the
 * camera ends up *inside* the hillside and renders its underside — the
 * "zoomed in too far, just polygons" failure, and the likeliest cause of
 * the black screen before it.
 *
 * So a hilly walk pulls the camera back and lifts it (lower zoom, less
 * pitch — altitude scales with cos(pitch)), landing near 1 km up: above
 * the relief, looking down at the mountain rather than into it. Terrain
 * exaggeration also drops to 1.0, since real hills need no help and every
 * extra multiple is more rise for the camera to collide with.
 */
export function camFor(walk: Walk): CamProfile {
  const gain = walk.elevationGainM ?? 0
  if (gain < HILLY_GAIN_M) {
    // Flat/urban: unchanged framing, no terrain — so extruded buildings are
    // the 3D interest, and markers sit exactly on the trail line.
    return { ...CAM, terrain: false, exaggeration: 1 }
  }
  return {
    ...CAM,
    travelPitch: 52,
    travelZoom: 15,
    stopPitch: 45,
    stopZoom: 15.8,
    terrain: true,
    exaggeration: 1,
  }
}

const INTRO_MS = 3000
const LAUNCH_MS = 1900
const STOP_MS = 4000
const FINALE_MS = 2600
const MIN_TRAVEL_MS = 650

export function buildTimeline(walk: Walk): Timeline {
  const cum = cumulativeKm(walk.coords)
  const totalKm = cum[cum.length - 1] || 0.001

  // km position of each stop = nearest route vertex's cumulative distance
  const stopKm = walk.stops.map((s) => {
    let best = Infinity
    let bi = 0
    for (let i = 0; i < walk.coords.length; i += 2) {
      const dist = haversineKm(s.coord, walk.coords[i])
      if (dist < best) {
        best = dist
        bi = i
      }
    }
    return cum[bi]
  })

  // enforce ascending order so travel segments never run backwards
  for (let i = 1; i < stopKm.length; i++) {
    if (stopKm[i] <= stopKm[i - 1]) stopKm[i] = Math.min(totalKm, stopKm[i - 1] + 0.02)
  }

  // total travel budget: the whole fly-over lands around 25–60 s
  const travelBudget = Math.min(28000, Math.max(15000, totalKm * 9000))

  const scenes: Scene[] = [
    { kind: 'intro', durationMs: INTRO_MS, fromKm: 0, toKm: 0 },
    { kind: 'launch', durationMs: LAUNCH_MS, fromKm: 0, toKm: 0 },
  ]
  let cursor = 0
  stopKm.forEach((km, i) => {
    const seg = Math.max(0.01, km - cursor)
    scenes.push({
      kind: 'travel',
      durationMs: Math.max(MIN_TRAVEL_MS, (seg / totalKm) * travelBudget),
      fromKm: cursor,
      toKm: km,
    })
    scenes.push({ kind: 'stop', durationMs: STOP_MS, fromKm: km, toKm: km, stopIndex: i })
    cursor = km
  })
  scenes.push({
    kind: 'travel',
    durationMs: Math.max(MIN_TRAVEL_MS, ((totalKm - cursor) / totalKm) * travelBudget),
    fromKm: cursor,
    toKm: totalKm,
  })
  scenes.push({ kind: 'finale', durationMs: FINALE_MS, fromKm: totalKm, toKm: totalKm })
  return { scenes, totalKm, cum, stopKm }
}

/** Index of the scene that shows stop i. */
export function sceneIndexOfStop(tl: Timeline, i: number): number {
  return tl.scenes.findIndex((s) => s.kind === 'stop' && s.stopIndex === i)
}

/** Route slice from 0..km for the progressive trail reveal. */
export function routeSliceTo(coords: LngLat[], cum: number[], km: number): LngLat[] {
  if (km <= 0) return [coords[0], coords[0]]
  const out: LngLat[] = []
  for (let i = 0; i < coords.length; i++) {
    if (cum[i] <= km) out.push(coords[i])
    else {
      // interpolate the exact tip so the trail grows smoothly
      const prev = Math.max(0, i - 1)
      const span = cum[i] - cum[prev] || 1
      const t = (km - cum[prev]) / span
      out.push([
        coords[prev][0] + (coords[i][0] - coords[prev][0]) * t,
        coords[prev][1] + (coords[i][1] - coords[prev][1]) * t,
      ])
      break
    }
  }
  if (out.length < 2) out.push(out[0])
  return out
}
