import type { Walk, Pace, Place, Stop, StopCategory, LngLat, VibeId, WalkShape } from './types'
import { bearingDeg, cumulativeKm, haversineKm, pointAtDistance, seeded, snapToPolyline } from './geo'
import { fetchWalkRoute, loopWaypoints, outAndBackWaypoints, type RawRoute } from './api/routing'
import { findCandidates, type Candidate } from './api/discoveries'
import { contentFor, pick, walkIntro, walkTitle, teaserFor } from './content'
import { GROUP_OF, VIBE_AFFINITY, type VarietyGroup } from './vibes'

/**
 * The Wander route engine — the adult sibling of Adventure Walk's discovery
 * engine.
 *
 *   1. size a loop from duration + pace
 *   2. search broadly around the start for real places (one query) — wide
 *      enough to cover wherever a loop of this size could reach
 *   3. if a genuinely good cluster for this vibe exists, aim the scout
 *      headings toward it rather than guessing blind; scout THREE loops
 *   4. keep the loop whose surroundings score best for this vibe
 *   5. rank candidates on proximity · vibe affinity · named-place bonus ·
 *      variety, and select one per route segment so stops stay spaced
 *   6. re-route the walk through the chosen real places
 *
 * Deterministic and keyless. Output is a fully structured Walk, so a
 * Claude-powered ranker/writer could replace steps 5–6 without touching UI.
 */

export type GenProgress = 'sizing' | 'mapping' | 'finding' | 'choosing' | 'routing' | 'ready'

const SPEED_KMH: Record<Pace, number> = { stroll: 3.6, brisk: 4.8 }
const STOP_MIN = 4
/**
 * How far a real place's true OSM location can sit from the drawn route and
 * still honestly be called "along the walk" — about the width of a city
 * block. Selection happens against the SCOUT route, but the FINAL route
 * (after re-routing through every pick, or a fallback to the scout route if
 * that call fails) can land further away — a park's centroid is often deep
 * inside it, and out-and-back's scout is just a rough reach in one
 * direction, not routed through picks at all. Snapping alone would still
 * force a marker onto the line, but that's dishonest if the real place
 * isn't actually there: past this distance a stop is demoted to a nameless
 * wander spot rather than claiming a café or shop the walk doesn't pass.
 */
const STRAY_CAP_KM = 0.08

export interface GenerateParams {
  vibe: VibeId
  durationMin: number
  pace: Pace
  shape: WalkShape
  start: Place
}

export async function generateWalk(
  params: GenerateParams,
  onProgress: (p: GenProgress) => void,
): Promise<Walk> {
  const { vibe, durationMin, pace, shape, start } = params
  const rng = seeded(`${start.coord.join(',')}|${vibe}|${Date.now() >> 16}`)

  onProgress('sizing')
  const speed = SPEED_KMH[pace]
  const targetCount = durationMin <= 30 ? 4 : durationMin <= 60 ? 5 : 6
  const walkMin = Math.max(12, durationMin - targetCount * STOP_MIN)
  const targetKm = (speed * walkMin) / 60
  // an out-and-back covers the same ground twice, so the outbound reach
  // should aim for half the total distance the user asked for
  const oneWayKm = shape === 'outAndBack' ? targetKm / 2 : targetKm

  onProgress('finding')
  // The one-way distance the walk would reach without any stretching (see
  // below) — for a loop that's its radius, for out-and-back its outbound
  // reach. Search well beyond it (a loop's farthest point is on the far
  // side of the circle, ~2x radius, plus headroom for the stretch below) —
  // wide enough that a genuinely good cluster just past the naive edge is
  // still visible to bestClusterFor, not just ones already comfortably
  // inside it. Searching before scouting means we know where real places
  // are before aiming the walk, rather than only checking near paths we
  // happened to guess.
  const naiveReachKm =
    shape === 'outAndBack'
      ? Math.max(0.15, oneWayKm * 0.8)
      : Math.max(0.18, (targetKm / (2 * Math.PI)) * 0.8)
  let candidates: Candidate[] = []
  try {
    candidates = await findCandidates([start.coord], naiveReachKm * 2.8 + 0.15)
  } catch (e) {
    candidates = [] // Overpass down → wander spots carry the walk
    console.warn('[wander] Could not reach Overpass — falling back to wander spots', e)
  }

  onProgress('mapping')
  // If there's a genuinely appealing cluster for this vibe nearby, aim the
  // walk at it (tight spread of headings around it) instead of guessing;
  // otherwise fall back to the original blind 120°-apart spread — honestly,
  // there's nothing to aim at.
  const cluster = bestClusterFor(start.coord, candidates, vibe)
  const baseHeading = cluster?.headingDeg ?? Math.floor(rng() * 360)
  const offsets = cluster ? [-32, 0, 32] : [0, 120, 240]

  // A real destination worth walking to (a proper high street, say) can sit
  // a little past a naive duration-derived radius — finding the right
  // direction is wasted if the loop is then too small to actually get
  // there. Stretch the target distance toward a genuinely good cluster,
  // capped so a short walk request can't balloon far past what was asked.
  let effectiveTargetKm = targetKm
  let effectiveOneWayKm = oneWayKm
  if (cluster) {
    const wantReachKm = cluster.distanceKm * 1.08 // a little past it, so the loop can wrap around/through it
    const maxReachKm = naiveReachKm * 1.35
    if (wantReachKm > naiveReachKm && wantReachKm <= maxReachKm) {
      if (shape === 'outAndBack') {
        effectiveOneWayKm = wantReachKm / 0.8 // undo outAndBackWaypoints' own correction factor
      } else {
        effectiveTargetKm = (wantReachKm / 0.8) * 2 * Math.PI // undo loopWaypoints': r = (targetKm/2π)·0.8
      }
    }
  }

  const scoutResults = await Promise.allSettled(
    offsets.map((off) =>
      fetchWalkRoute(
        shape === 'outAndBack'
          ? outAndBackWaypoints(start.coord, effectiveOneWayKm, baseHeading + off)
          : loopWaypoints(start.coord, effectiveTargetKm, baseHeading + off),
        speed,
      ),
    ),
  )
  const scouts = scoutResults
    .filter((r): r is PromiseFulfilledResult<RawRoute> => r.status === 'fulfilled')
    .map((r) => r.value)
  if (!scouts.length) {
    const firstErr = scoutResults[0] as PromiseRejectedResult
    throw firstErr.reason instanceof Error ? firstErr.reason : new Error('No walking route found from here')
  }

  onProgress('choosing')
  const evaluated = scouts.map((s) => ({
    route: s,
    chosen: rankAndSelect(candidates, s.coords, targetCount, vibe, rng),
  }))
  evaluated.sort((a, b) => quality(b.chosen) - quality(a.chosen))
  const best = evaluated[0]
  let chosen = best.chosen
  const scout = best.route

  onProgress('routing')
  let coords = scout.coords
  let distanceKm = scout.distanceKm
  let timeMin = scout.timeMin
  if (chosen.some((c) => c.fromMap)) {
    try {
      // Loop: through every pick and back to the start. Out-and-back: through
      // the picks only — that's the outbound leg; the return is mirrored
      // below rather than routed again, so it's guaranteed identical.
      const waypoints =
        shape === 'outAndBack'
          ? [start.coord, ...chosen.map((c) => c.coord)]
          : [start.coord, ...chosen.map((c) => c.coord), start.coord]
      const final = await fetchWalkRoute(waypoints, speed)
      coords = final.coords
      distanceKm = final.distanceKm
      timeMin = final.timeMin
    } catch (e) {
      // Keep the scout route. Snapping below still pins every stop onto it,
      // so markers can never end up floating off the drawn route.
      console.warn('[wander] Could not re-route through the picks — keeping the scout route', e)
    }
  }

  if (shape === 'outAndBack') {
    // Mirror the outbound leg back to the start rather than asking the
    // router for a second, independent path — the return is then
    // geometrically guaranteed to retrace the outbound line exactly.
    coords = [...coords, ...coords.slice(0, -1).reverse()]
    distanceKm *= 2
    timeMin *= 2
  }

  // Pin every stop onto the route we actually drew.
  //
  // Routing engines snap waypoints to the nearest walkable way, and polygon
  // features (parks, gardens) report a centroid that can sit well off any
  // path — so a raw OSM coordinate is often a little to one side of the
  // route. Projecting each stop onto the final polyline guarantees its
  // marker sits ON the walk, and gives us its true distance along the route.
  const cum = cumulativeKm(coords)
  const placed = chosen
    .map((c) => {
      const snapped = snapToPolyline(coords, cum, c.coord)
      return { c, coord: snapped.coord, alongKm: snapped.alongKm, offKm: snapped.offKm }
    })
    // Re-routing can reorder the walk, so sort by real position along the
    // final line — otherwise stop numbers zig-zag back and forth on the map.
    .sort((a, b) => a.alongKm - b.alongKm)

  const strayed = placed.filter((p) => p.c.fromMap && p.offKm > STRAY_CAP_KM)
  if (strayed.length) {
    console.warn(
      `[wander] ${strayed.length} stop(s) sat >${STRAY_CAP_KM * 1000}m from the route — demoted to wander spots rather than claiming a place the walk doesn't pass`,
      strayed.map((p) => ({ name: p.c.name, offMetres: Math.round(p.offKm * 1000) })),
    )
  }

  let prevKm = 0
  let etaMin = 0
  const stops: Stop[] = placed.map((p, i) => {
    const c = p.c
    // Too far from where the route actually ended up: don't claim a real
    // place the walk doesn't genuinely pass — fall back to an honest,
    // unnamed pause instead.
    const isReal = c.fromMap && p.offKm <= STRAY_CAP_KM
    const category = isReal ? c.category : 'wander'
    const name = isReal ? c.name : undefined
    const content = contentFor(category)
    // Distance along the path, not straight-line — matches what you walk.
    const distFromPrevKm = Math.max(0, p.alongKm - prevKm)
    etaMin += (distFromPrevKm / speed) * 60 + (i === 0 ? 0 : STOP_MIN)
    prevKm = p.alongKm
    return {
      id: `s${i + 1}`,
      title: name ? name : pick(content.titles, rng),
      placeName: name,
      coord: p.coord,
      placeCoord: isReal ? c.coord : undefined,
      category,
      order: i + 1,
      blurb: pick(content.blurbs, rng),
      note: pick(content.notes, rng),
      teaser: teaserFor(category),
      distFromPrevKm,
      etaMin: Math.round(etaMin),
      status: i === 0 ? 'next' : 'ahead',
    }
  })

  const realCount = stops.filter((s) => s.placeName).length
  console.info(`[wander] Walk built with ${realCount}/${stops.length} real places from ${candidates.length} candidates found`)

  onProgress('ready')
  return {
    id: `walk-${Date.now().toString(36)}`,
    title: walkTitle(vibe, rng),
    vibe,
    pace,
    shape,
    requestedMin: durationMin,
    estMinutes: Math.round(timeMin + stops.length * STOP_MIN),
    distanceKm: Math.round(distanceKm * 10) / 10,
    intro: walkIntro(vibe, stops.length),
    start,
    coords,
    stops,
    createdAt: Date.now(),
    state: 'new',
  }
}

/**
 * Repairs a Walk's stop placement after the fact — self-healing for walks
 * saved before stop-snapping existed (or any other drift between a stop's
 * coordinate and the route it sits on). Cheap pure geometry, safe to run on
 * every load: falls back from `placeCoord` (the true, un-snapped place) to
 * `coord` when a walk predates that field, so even the oldest saved walks
 * get pulled back onto their own route line.
 */
export function reconcileWalk(walk: Walk): Walk {
  // `shape` postdates this field too — every walk before it existed was a loop.
  if (!walk.shape) walk = { ...walk, shape: 'loop' }
  if (!walk.coords?.length || !walk.stops?.length) return walk
  const cum = cumulativeKm(walk.coords)
  const speed = SPEED_KMH[walk.pace]

  const placed = walk.stops
    .map((s) => {
      const raw = s.placeCoord ?? s.coord
      const snapped = snapToPolyline(walk.coords, cum, raw)
      return { s, coord: snapped.coord, alongKm: snapped.alongKm, offKm: snapped.offKm }
    })
    .sort((a, b) => a.alongKm - b.alongKm)

  let prevKm = 0
  let etaMin = 0
  const stops = placed.map(({ s, coord, alongKm, offKm }, i) => {
    // Same honesty check as generateWalk: a walk saved before this existed
    // may already be claiming a real place its route never actually passes.
    const isReal = !!s.placeName && offKm <= STRAY_CAP_KM
    const category = isReal ? s.category : 'wander'
    const rng = seeded(`${s.id}|${s.coord.join(',')}`)
    const content = contentFor(category)
    const distFromPrevKm = Math.max(0, alongKm - prevKm)
    etaMin += (distFromPrevKm / speed) * 60 + (i === 0 ? 0 : STOP_MIN)
    prevKm = alongKm
    return {
      ...s,
      coord,
      category,
      placeName: isReal ? s.placeName : undefined,
      placeCoord: isReal ? s.placeCoord : undefined,
      title: isReal ? s.title : pick(content.titles, rng),
      blurb: isReal ? s.blurb : pick(content.blurbs, rng),
      note: isReal ? s.note : pick(content.notes, rng),
      teaser: teaserFor(category),
      order: i + 1,
      distFromPrevKm,
      etaMin: Math.round(etaMin),
    }
  })
  return { ...walk, stops }
}

export interface ClusterHint {
  headingDeg: number
  /** weighted-average distance from start to the top candidates — used to
   *  decide whether the walk's target distance should stretch to reach it */
  distanceKm: number
}

/**
 * Where to aim the walk, if there's a genuinely appealing cluster of real
 * places for this vibe nearby — otherwise null, so the caller falls back to
 * an honest blind spread instead of chasing noise. The circular mean keeps
 * two clusters on opposite sides of the start from cancelling out into a
 * meaningless average heading.
 */
export function bestClusterFor(start: LngLat, candidates: Candidate[], vibe: VibeId): ClusterHint | null {
  const scored = candidates
    .map((c) => ({
      c,
      s: (VIBE_AFFINITY[vibe][c.category] ?? 0.3) + (c.name ? 0.4 : 0),
      d: haversineKm(start, c.coord),
    }))
    .sort((a, b) => b.s - a.s)
  const top = scored.slice(0, Math.min(8, Math.max(3, Math.ceil(scored.length * 0.35))))
  if (!top.length || top[0].s < 1.3) return null

  let sinSum = 0
  let cosSum = 0
  let distSum = 0
  let wSum = 0
  for (const { c, s, d } of top) {
    const rad = (bearingDeg(start, c.coord) * Math.PI) / 180
    sinSum += Math.sin(rad) * s
    cosSum += Math.cos(rad) * s
    distSum += d * s
    wSum += s
  }
  if (!wSum) return null
  const headingDeg = (((Math.atan2(sinSum, cosSum) * 180) / Math.PI) % 360 + 360) % 360
  return { headingDeg, distanceKm: distSum / wSum }
}

interface Chosen {
  coord: LngLat
  name?: string
  category: StopCategory
  fromMap: boolean
  score: number
}

/** How good a selection is overall — used to compare scout loops. */
function quality(chosen: Chosen[]): number {
  const real = chosen.filter((c) => c.fromMap)
  const groups = new Set(real.map((c) => GROUP_OF[c.category])).size
  const cats = new Set(real.map((c) => c.category)).size
  return real.reduce((s, c) => s + c.score, 0) + groups * 1.6 + cats * 0.5
}

/**
 * Rank candidates for THIS vibe, then pick one per route segment so stops
 * are spread. Ranking blends:
 *   proximity to the path · vibe affinity · named-real-place bonus ·
 *   variety (group coverage + category-repeat penalty)
 */
export function rankAndSelect(
  candidates: Candidate[],
  route: LngLat[],
  n: number,
  vibe: VibeId,
  rng: () => number,
): Chosen[] {
  const cum = cumulativeKm(route)
  const total = cum[cum.length - 1] || 1

  const positioned = candidates
    .map((c) => {
      let best = Infinity
      let bi = 0
      for (let i = 0; i < route.length; i += 2) {
        const d = haversineKm(c.coord, route[i])
        if (d < best) {
          best = d
          bi = i
        }
      }
      return { ...c, offKm: best, t: cum[bi] / total }
    })
    // Keep picks genuinely close to the walked line. This is measured
    // against the SCOUT route, not the final one re-routed through the
    // picks — so it needs headroom over STRAY_CAP_KM (the final honesty
    // check) for that difference, but not so much that we select things
    // that are essentially guaranteed to fail it: a candidate let through
    // here on a loose tolerance can still cost the walk a real stop later,
    // and worse, can make a scout loop LOOK richer than it can honestly
    // deliver, skewing which loop direction gets chosen.
    .filter((c) => c.offKm < STRAY_CAP_KM + 0.04 && c.t > 0.03 && c.t < 0.97)

  const chosen: Chosen[] = []
  const usedCats = new Map<StopCategory, number>()
  const usedGroups = new Map<VarietyGroup, number>()

  const scoreOf = (c: { category: StopCategory; offKm: number; name?: string }): number => {
    const affinity = VIBE_AFFINITY[vibe][c.category] ?? 0.6
    const named = c.name ? 1.1 : 0
    const catRepeat = (usedCats.get(c.category) ?? 0) * 2.2
    const groupRepeat = Math.max(0, (usedGroups.get(GROUP_OF[c.category]) ?? 0) - 1) * 0.9
    const proximity = -c.offKm * 4
    return affinity + named + proximity - catRepeat - groupRepeat + rng() * 0.5
  }

  for (let bin = 0; bin < n; bin++) {
    const lo = bin / n
    const hi = (bin + 1) / n
    const inBin = positioned.filter((c) => c.t >= lo && c.t < hi && !chosen.some((ch) => ch.coord === c.coord))
    if (!inBin.length) continue
    const scored = inBin.map((c) => ({ c, s: scoreOf(c) })).sort((a, b) => b.s - a.s)
    const top = scored[0]
    chosen.push({ coord: top.c.coord, name: top.c.name, category: top.c.category, fromMap: true, score: top.s })
    usedCats.set(top.c.category, (usedCats.get(top.c.category) ?? 0) + 1)
    usedGroups.set(GROUP_OF[top.c.category], (usedGroups.get(GROUP_OF[top.c.category]) ?? 0) + 1)
  }

  // Fill remaining slots with open-ended wander spots spread along the route.
  let need = n - chosen.length
  for (let i = 1; need > 0 && i <= n * 2; i++) {
    const t = (i % (n + 1) || 1) / (n + 1) + (i > n ? 0.5 / (n + 1) : 0)
    const coord = pointAtDistance(route, cum, Math.min(0.95, t) * total)
    if (chosen.some((c) => haversineKm(c.coord, coord) < 0.12)) continue
    chosen.push({ coord, category: 'wander', fromMap: false, score: 0 })
    need--
  }

  // Order by position along the route so the walk flows one way.
  return chosen
    .map((c) => {
      let best = Infinity
      let bi = 0
      for (let i = 0; i < route.length; i += 2) {
        const d = haversineKm(c.coord, route[i])
        if (d < best) {
          best = d
          bi = i
        }
      }
      return { c, t: cum[bi] / total }
    })
    .sort((a, b) => a.t - b.t)
    .map((x) => x.c)
}
