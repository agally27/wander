import { create } from 'zustand'
import type { FieldNote, LngLat, Pace, Place, Screen, Stats, Stop, VibeId, Walk } from './lib/types'
import { generateWalk, type GenProgress } from './lib/generator'
import { cumulativeKm, haversineKm, pointAtDistance } from './lib/geo'
import {
  loadNotes, loadStats, loadWalks, saveNotes, saveStats, saveWalks, emptyStats,
} from './lib/persist'

/** Unlock radius in km (~40 m) — generous enough that GPS drift never blocks a stop. */
const UNLOCK_KM = 0.04

interface CreateDraft {
  step: number
  vibe: VibeId | null
  durationMin: number
  pace: Pace
  start: Place | null
}

interface AppState {
  screen: Screen
  goto: (s: Screen) => void

  draft: CreateDraft
  setDraft: (patch: Partial<CreateDraft>) => void
  resetDraft: () => void

  genProgress: GenProgress | null
  genError: string | null
  generate: () => Promise<void>

  walks: Walk[]
  current: Walk | null
  openWalk: (id: string) => void
  deleteWalk: (id: string) => void
  editCurrent: () => void

  // walk mode
  walking: boolean
  position: LngLat | null
  gpsError: string | null
  simulate: boolean
  simT: number
  activeStopId: string | null
  startWalk: () => void
  stopWalk: () => void
  setSimulate: (on: boolean) => void
  simStep: () => void
  updatePosition: (p: LngLat) => void
  openStop: (id: string) => void
  markVisited: (id: string) => void
  dismissStop: () => void
  finishWalk: () => void

  notes: FieldNote[]
  saveNote: (stop: Stop) => void
  updateNote: (id: string, patch: Partial<Pick<FieldNote, 'rating' | 'remark'>>) => void
  removeNote: (id: string) => void
  isSaved: (coord: LngLat) => boolean

  stats: Stats
}

const freshDraft = (): CreateDraft => ({
  step: 0,
  vibe: null,
  durationMin: 45,
  pace: 'stroll',
  start: null,
})

let watchId: number | null = null

function beginGeoWatch(get: () => AppState, set: (p: Partial<AppState>) => void) {
  if (!('geolocation' in navigator)) return
  watchId = navigator.geolocation.watchPosition(
    (pos) => get().updatePosition([pos.coords.longitude, pos.coords.latitude]),
    () => set({ gpsError: 'We can’t see your location. Allow location access, or use Preview walk.' }),
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
  )
}

function clearGeoWatch() {
  if (watchId != null) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
  }
}

export const useApp = create<AppState>((set, get) => ({
  screen: 'home',
  goto: (s) => set({ screen: s }),

  draft: freshDraft(),
  setDraft: (patch) => set((st) => ({ draft: { ...st.draft, ...patch } })),
  resetDraft: () => set({ draft: freshDraft(), genError: null }),

  genProgress: null,
  genError: null,
  generate: async () => {
    const { draft } = get()
    if (!draft.start || !draft.vibe) return
    set({ screen: 'generating', genProgress: 'sizing', genError: null })
    try {
      const walk = await generateWalk(
        { vibe: draft.vibe, durationMin: draft.durationMin, pace: draft.pace, start: draft.start },
        (p) => set({ genProgress: p }),
      )
      const walks = [walk, ...get().walks]
      saveWalks(walks)
      setTimeout(() => set({ walks, current: walk, screen: 'preview' }), 500)
    } catch (e) {
      set({
        genError:
          e instanceof Error && /no walking route/i.test(e.message)
            ? 'We couldn’t map a walk from that spot. Try a start point closer to streets or paths.'
            : 'The walk couldn’t be created — check your connection and try again.',
        screen: 'create',
      })
    }
  },

  walks: loadWalks(),
  current: null,
  openWalk: (id) => {
    const walk = get().walks.find((w) => w.id === id) ?? null
    if (!walk) return
    set({ current: walk, screen: walk.state === 'done' ? 'done' : 'preview' })
  },
  deleteWalk: (id) => {
    const walks = get().walks.filter((w) => w.id !== id)
    saveWalks(walks)
    set({ walks })
  },
  editCurrent: () => {
    const w = get().current
    if (!w) return
    set({
      draft: { step: 1, vibe: w.vibe, durationMin: w.requestedMin, pace: w.pace, start: w.start },
      genError: null,
      screen: 'create',
    })
  },

  walking: false,
  position: null,
  gpsError: null,
  simulate: false,
  simT: 0,
  activeStopId: null,

  startWalk: () => {
    const { current } = get()
    if (!current) return
    const updated: Walk = { ...current, state: 'active', startedAt: current.startedAt ?? Date.now() }
    persistCurrent(set, get, updated)
    set({ walking: true, screen: 'walk', simT: 0, position: current.start.coord })
    if (!get().simulate) beginGeoWatch(get, set)
  },

  stopWalk: () => {
    clearGeoWatch()
    set({ walking: false, activeStopId: null })
  },

  setSimulate: (on) => {
    clearGeoWatch()
    set({ simulate: on, gpsError: null })
    if (!on && get().walking) beginGeoWatch(get, set)
  },

  simStep: () => {
    const { current, simT } = get()
    if (!current) return
    const cum = cumulativeKm(current.coords)
    const total = cum[cum.length - 1]
    const t = Math.min(1, simT + Math.max(0.04, 0.09 - current.stops.length * 0.005))
    set({ simT: t })
    get().updatePosition(pointAtDistance(current.coords, cum, t * total))
  },

  updatePosition: (p) => {
    set({ position: p, gpsError: null })
    const { current, activeStopId } = get()
    if (!current || activeStopId) return
    const next = current.stops.find((s) => s.status === 'next')
    if (next && haversineKm(p, next.coord) <= UNLOCK_KM) {
      set({ activeStopId: next.id })
    }
  },

  openStop: (id) => set({ activeStopId: id }),

  markVisited: (id) => {
    const { current, stats } = get()
    if (!current) return
    const idx = current.stops.findIndex((s) => s.id === id)
    const s = current.stops[idx]
    if (!s || s.status === 'visited') return
    const stops = current.stops.map((x, i) =>
      i === idx ? { ...x, status: 'visited' as const } : i === idx + 1 && x.status === 'ahead' ? { ...x, status: 'next' as const } : x,
    )
    // if a later stop was already the "next", keep the first still-ahead one as next
    if (!stops.some((x) => x.status === 'next')) {
      const firstAhead = stops.findIndex((x) => x.status === 'ahead')
      if (firstAhead >= 0) stops[firstAhead] = { ...stops[firstAhead], status: 'next' }
    }
    persistCurrent(set, get, { ...current, stops })
    const nextStats: Stats = { ...stats, stopsVisited: stats.stopsVisited + 1 }
    saveStats(nextStats)
    set({ stats: nextStats })
  },

  dismissStop: () => set({ activeStopId: null }),

  finishWalk: () => {
    const { current, stats } = get()
    if (!current) return
    get().stopWalk()
    const already = current.state === 'done'
    const done: Walk = { ...current, state: 'done', completedAt: Date.now() }
    persistCurrent(set, get, done)
    if (!already) {
      const nextStats: Stats = {
        walksCompleted: stats.walksCompleted + 1,
        stopsVisited: stats.stopsVisited,
        kmWalked: Math.round((stats.kmWalked + done.distanceKm) * 10) / 10,
      }
      saveStats(nextStats)
      set({ stats: nextStats })
    }
    set({ screen: 'done' })
  },

  notes: loadNotes(),
  saveNote: (stop) => {
    const { notes, current } = get()
    if (notes.some((n) => haversineKm(n.coord, stop.coord) < 0.02)) return
    const note: FieldNote = {
      id: `note-${Date.now().toString(36)}`,
      name: stop.title,
      category: stop.category,
      coord: stop.coord,
      note: stop.note,
      sourceWalkId: current?.id ?? '',
      sourceWalkTitle: current?.title ?? 'A walk',
      savedAt: Date.now(),
    }
    const updated = [note, ...notes]
    saveNotes(updated)
    set({ notes: updated })
  },
  updateNote: (id, patch) => {
    const updated = get().notes.map((n) => (n.id === id ? { ...n, ...patch } : n))
    saveNotes(updated)
    set({ notes: updated })
  },
  removeNote: (id) => {
    const updated = get().notes.filter((n) => n.id !== id)
    saveNotes(updated)
    set({ notes: updated })
  },
  isSaved: (coord) => get().notes.some((n) => haversineKm(n.coord, coord) < 0.02),

  stats: loadStats(),
}))

function persistCurrent(set: (p: Partial<AppState>) => void, get: () => AppState, updated: Walk) {
  const walks = get().walks.map((w) => (w.id === updated.id ? updated : w))
  saveWalks(walks)
  set({ walks, current: updated })
}

// keep emptyStats referenced for tree-shaking clarity
void emptyStats
