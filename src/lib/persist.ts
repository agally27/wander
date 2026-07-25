import type { FieldNote, Stats, Walk } from './types'

const WALKS_KEY = 'wander.walks.v1'
const NOTES_KEY = 'wander.fieldnotes.v1'
const STATS_KEY = 'wander.stats.v1'

export const emptyStats = (): Stats => ({ walksCompleted: 0, stopsVisited: 0, kmWalked: 0 })

export function loadWalks(): Walk[] {
  try {
    return JSON.parse(localStorage.getItem(WALKS_KEY) ?? '[]')
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
