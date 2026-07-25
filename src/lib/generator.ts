import type { Walk, Pace, Place, Stop, StopCategory, LngLat, VibeId } from './types'
import { cumulativeKm, haversineKm, pointAtDistance, seeded } from './geo'
import { fetchWalkRoute, loopWaypoints, type RawRoute } from './api/routing'
import { findCandidates, type Candidate } from './api/discoveries'
import { contentFor, pick, walkIntro, walkTitle, teaserFor } from './content'
import { GROUP_OF, VIBE_AFFINITY, type VarietyGroup } from './vibes'

/**
 * The Wander route engine — the adult sibling of Adventure Walk's discovery
 * engine.
 *
 *   1. size a loop from duration + pace
 *   2. scout THREE candidate loops in different directions
 *   3. ask Overpass what real places sit near all of them (one query)
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

export interface GenerateParams {
  vibe: VibeId
  durationMin: number
  pace: Pace
  start: Place
}

export async function generateWalk(
  params: GenerateParams,
  onProgress: (p: GenProgress) => void,
): Promise<Walk> {
  const { vibe, durationMin, pace, start } = params
  const rng = seeded(`${start.coord.join(',')}|${vibe}|${Date.now() >> 16}`)

  onProgress('sizing')
  const speed = SPEED_KMH[pace]
  const targetCount = durationMin <= 30 ? 4 : durationMin <= 60 ? 5 : 6
  const walkMin = Math.max(12, durationMin - targetCount * STOP_MIN)
  const targetKm = (speed * walkMin) / 60

  onProgress('mapping')
  const baseHeading = Math.floor(rng() * 360)
  const scoutResults = await Promise.allSettled(
    [0, 120, 240].map((off) => fetchWalkRoute(loopWaypoints(start.coord, targetKm, baseHeading + off), speed)),
  )
  const scouts = scoutResults
    .filter((r): r is PromiseFulfilledResult<RawRoute> => r.status === 'fulfilled')
    .map((r) => r.value)
  if (!scouts.length) {
    const firstErr = scoutResults[0] as PromiseRejectedResult
    throw firstErr.reason instanceof Error ? firstErr.reason : new Error('No walking route found from here')
  }

  onProgress('finding')
  let candidates: Candidate[] = []
  try {
    candidates = await findCandidates(scouts.flatMap((s) => s.coords.filter((_, i) => i % 4 === 0)))
  } catch {
    candidates = [] // Overpass down → wander spots carry the walk
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
      const final = await fetchWalkRoute([start.coord, ...chosen.map((c) => c.coord), start.coord], speed)
      coords = final.coords
      distanceKm = final.distanceKm
      timeMin = final.timeMin
      const cum = cumulativeKm(coords)
      chosen.forEach((c, i) => {
        if (!c.fromMap) c.coord = pointAtDistance(coords, cum, ((i + 1) / (chosen.length + 1)) * distanceKm)
      })
    } catch {
      /* keep the scout loop */
    }
  }

  let prev = start.coord
  let etaMin = 0
  const stops: Stop[] = chosen.map((c, i) => {
    const content = contentFor(c.category)
    const distFromPrevKm = haversineKm(prev, c.coord)
    etaMin += (distFromPrevKm / speed) * 60 + (i === 0 ? 0 : STOP_MIN)
    prev = c.coord
    return {
      id: `s${i + 1}`,
      title: c.name ? c.name : pick(content.titles, rng),
      placeName: c.name,
      coord: c.coord,
      category: c.category,
      order: i + 1,
      blurb: pick(content.blurbs, rng),
      note: pick(content.notes, rng),
      teaser: teaserFor(c.category),
      distFromPrevKm,
      etaMin: Math.round(etaMin),
      status: i === 0 ? 'next' : 'ahead',
    }
  })

  onProgress('ready')
  return {
    id: `walk-${Date.now().toString(36)}`,
    title: walkTitle(vibe, rng),
    vibe,
    pace,
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
    .filter((c) => c.offKm < 0.3 && c.t > 0.04 && c.t < 0.96)

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
