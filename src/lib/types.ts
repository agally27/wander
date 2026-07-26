export type LngLat = [number, number] // [lng, lat]

export interface Place {
  name: string
  detail?: string
  coord: LngLat
}

export type VibeId = 'gems' | 'history' | 'pub' | 'foodie' | 'culture' | 'green'
export type Pace = 'stroll' | 'brisk'
/** loop: returns to the start via different streets. outAndBack: walks out
 *  and returns along the very same path — a there-and-back. */
export type WalkShape = 'loop' | 'outAndBack'

/**
 * Categories of real place we surface on an adult walk. Superset of the
 * kids' app: adds the things grown-ups actually detour for — pubs, bars,
 * breweries, cafés, bakeries, markets, delis, galleries, indie shops,
 * cinemas, notable architecture — alongside the shared green/heritage set.
 */
export type StopCategory =
  // drink & food
  | 'pub'
  | 'bar'
  | 'brewery'
  | 'cafe'
  | 'bakery'
  | 'restaurant'
  | 'market'
  | 'deli'
  // arts & culture
  | 'gallery'
  | 'artwork'
  | 'street-art'
  | 'museum'
  | 'theatre'
  | 'cinema'
  | 'bookshop'
  | 'music'
  // heritage & architecture
  | 'historic'
  | 'monument'
  | 'memorial'
  | 'landmark'
  | 'worship'
  | 'bridge'
  // green & scenic
  | 'park'
  | 'garden'
  | 'viewpoint'
  | 'water'
  | 'river'
  | 'fountain'
  | 'tree'
  // fallback
  | 'wander'

export type StopStatus = 'ahead' | 'next' | 'visited'

export interface Stop {
  id: string
  title: string
  /** real place name from OpenStreetMap, when we have one */
  placeName?: string
  /**
   * Where the stop sits ON the walked route — snapped to the route line so
   * its marker always lies on the drawn path and proximity unlocking matches
   * what you actually walk past.
   */
  coord: LngLat
  /**
   * The true OpenStreetMap coordinate of the place, before snapping. Used
   * for photo lookup; may sit a little off the path (e.g. a pub set back
   * from the street, or a park centroid).
   */
  placeCoord?: LngLat
  category: StopCategory
  /** 1-based order along the walk */
  order: number
  /** one-line "why stop here" blurb */
  blurb: string
  /** longer, honest background — general category knowledge, never invented facts */
  note: string
  /** spoiler-free teaser for the preview list */
  teaser: string
  distFromPrevKm: number
  etaMin: number
  status: StopStatus
}

export type WalkState = 'new' | 'active' | 'done'

export interface Walk {
  id: string
  title: string
  vibe: VibeId
  pace: Pace
  shape: WalkShape
  requestedMin: number
  estMinutes: number
  distanceKm: number
  intro: string
  start: Place
  /** full walking line: start → stops → back to start (loop), or
   *  start → stops → turnaround → back the same way (outAndBack) */
  coords: LngLat[]
  stops: Stop[]
  createdAt: number
  startedAt?: number
  completedAt?: number
  state: WalkState
}

export interface VibeMeta {
  id: VibeId
  name: string
  tagline: string
  emoji: string
  color: string
  soft: string
}

/** A place the user chose to keep — the adult "collection". */
export interface FieldNote {
  id: string
  name: string
  category: StopCategory
  coord: LngLat
  note: string
  /** optional personal star rating 1–5 */
  rating?: number
  /** personal free-text remark */
  remark?: string
  sourceWalkId: string
  sourceWalkTitle: string
  savedAt: number
}

export interface Stats {
  walksCompleted: number
  stopsVisited: number
  kmWalked: number
}

export type Screen =
  | 'home'
  | 'create'
  | 'generating'
  | 'preview'
  | 'flyover'
  | 'walk'
  | 'done'
  | 'saved'
  | 'walks'
