import type { FieldNote, Stats, Walk } from './types'
import type { Unit } from './units'
import { reconcileWalk } from './generator'

const WALKS_KEY = 'wander.walks.v1'
const NOTES_KEY = 'wander.fieldnotes.v1'
const STATS_KEY = 'wander.stats.v1'
const UNIT_KEY = 'wander.unit.v1'

export const emptyStats = (): Stats => ({ walksCompleted: 0, stopsVisited: 0, kmWalked: 0 })

export function loadWalks(): Walk[] {
  try {
    const raw: Walk[] = JSON.parse(localStorage.getItem(WALKS_KEY) ?? '[]')
    // Re-pin every stop onto its route on load — self-heals any walk saved
    // before stop-snapping existed, so old dots never drift off the line.
    return raw.map(reconcileWalk)
  } catch {
    return []
  }
}

export function saveWalks(list: Walk[]) {
  try {
    localStorage.setItem(WALKS_KEY, JSON.stringify(list.slice(0, 40)))
  } catch {
    /* storage unavailable — session still works in memory */
  }
}

export function loadNotes(): FieldNote[] {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveNotes(list: FieldNote[]) {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(list.slice(0, 300)))
  } catch {
    /* ignore */
  }
}

export function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    return raw ? { ...emptyStats(), ...JSON.parse(raw) } : emptyStats()
  } catch {
    return emptyStats()
  }
}

export function saveStats(s: Stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

/** Miles by default. */
export function loadUnit(): Unit {
  try {
    const raw = localStorage.getItem(UNIT_KEY)
    return raw === 'km' || raw === 'mi' ? raw : 'mi'
  } catch {
    return 'mi'
  }
}

export function saveUnit(u: Unit) {
  try {
    localStorage.setItem(UNIT_KEY, u)
  } catch {
    /* ignore */
  }
}
