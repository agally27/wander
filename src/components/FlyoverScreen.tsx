import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, { Map as MLMap, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useApp } from '../store'
import { buildPaperStyle } from '../lib/mapStyle'
import { bboxOf, bearingDeg, pointAtDistance } from '../lib/geo'
import { buildTimeline, routeSliceTo, sceneIndexOfStop, CAM, type Timeline } from '../lib/cinematic'
import { findPlaceImage, type PlaceImage } from '../lib/api/imagery'
import { vibeMeta } from '../lib/vibes'
import { CatIcon, catLabel } from './ui'

const EMPTY_FC = { type: 'FeatureCollection', features: [] } as any
const SPEEDS = [0.5, 1, 1.5, 2]

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Stand-in so the hooks below always run in the same order. */
const EMPTY_WALK = {
  coords: [[0, 0], [0, 0]] as LngLatPair[],
  stops: [],
  title: '',
  distanceKm: 0,
  estMinutes: 0,
  vibe: 'gems',
} as unknown as import('../lib/types').Walk

type LngLatPair = [number, number]

/**
 * The fly-over: a ~30–60 s cinematic preview of a walk, performed live on
 * the map. Camera pacing is Elecride's fly-through (km-paced rAF travel with
 * a smoothed look-ahead bearing), re-tuned to a walking glide that pauses
 * and zooms at each stop while the trail draws itself in behind.
 *
 * Respects prefers-reduced-motion: no continuous camera, instant cuts.
 */
export default function FlyoverScreen() {
  const { current, goto } = useApp()
  // Placeholder keeps hook order stable; we bail out after the hooks run.
  const walk = current ?? EMPTY_WALK
  const tl = useMemo<Timeline>(() => buildTimeline(walk), [walk])

  const el = useRef<HTMLDivElement>(null)
  const map = useRef<MLMap | null>(null)
  const raf = useRef(0)
  const markers = useRef<Marker[]>([])
  const reduced = useRef(prefersReducedMotion())

  const [sceneIdx, setSceneIdx] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [ready, setReady] = useState(false)
  const [speed, setSpeed] = useState(1)
  const sceneIdxRef = useRef(0)
  const playingRef = useRef(true)
  const speedRef = useRef(1)
  sceneIdxRef.current = sceneIdx
  playingRef.current = playing
  speedRef.current = speed

  const scene = tl.scenes[sceneIdx]
  const activeStop = scene?.kind === 'stop' ? walk.stops[scene.stopIndex!] : null
  const vibe = vibeMeta(walk.vibe)

  // ── map setup ───────────────────────────────────────────
  useEffect(() => {
    if (!el.current) return
    const m = new maplibregl.Map({
      container: el.current,
      style: buildPaperStyle(),
      center: walk.coords[0],
      zoom: 15,
      pitch: 0,
      attributionControl: { compact: true },
      interactive: false,
    })
    m.on('load', () => {
      m.addSource('trail', { type: 'geojson', data: EMPTY_FC })
      m.addLayer({
        id: 'trail-halo', type: 'line', source: 'trail',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 10, 'line-opacity': 0.9 },
      })
      m.addLayer({
        id: 'trail-line', type: 'line', source: 'trail',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#D98A3D', 'line-width': 5, 'line-dasharray': [0.1, 1.7] },
      })
      // extruded buildings give the pitched camera something to fly past
      if (m.getLayer('buildings-3d')) m.setLayoutProperty('buildings-3d', 'visibility', 'visible')
      setReady(true)
    })
    map.current = m
    return () => {
      cancelAnimationFrame(raf.current)
      markers.current.forEach((mk) => mk.remove())
      m.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // stop markers — plain anchors, no transforms (MapLibre owns those)
  useEffect(() => {
    const m = map.current
    if (!m || !ready) return
    markers.current.forEach((mk) => mk.remove())
    markers.current = walk.stops.map((s, i) => {
      const anchor = document.createElement('div')
      anchor.className = 'fly-pin'
      const badge = document.createElement('div')
      badge.className = 'fly-pin__badge'
      badge.textContent = String(i + 1)
      anchor.appendChild(badge)
      return new Marker({ element: anchor }).setLngLat(s.coord).addTo(m)
    })
  }, [ready, walk.stops])

  // ── the performance ─────────────────────────────────────
  useEffect(() => {
    const m = map.current
    if (!m || !ready) return
    cancelAnimationFrame(raf.current)
    const sc = tl.scenes[sceneIdx]
    if (!sc) return

    const trail = (km: number) =>
      (m.getSource('trail') as maplibregl.GeoJSONSource | undefined)?.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: routeSliceTo(walk.coords, tl.cum, km) },
      } as any)

    const advance = () => {
      if (sceneIdxRef.current < tl.scenes.length - 1) setSceneIdx((i) => i + 1)
      else setPlaying(false)
    }

    // Reduced motion: show the end state of each scene, no camera movement.
    if (reduced.current) {
      trail(sc.toKm)
      const at = pointAtDistance(walk.coords, tl.cum, sc.toKm)
      if (sc.kind === 'intro' || sc.kind === 'finale') {
        const [sw, ne] = bboxOf(walk.coords)
        m.jumpTo({ pitch: 0, bearing: 0 })
        m.fitBounds([sw, ne], { padding: 60, duration: 0 })
      } else {
        m.jumpTo({ center: at, zoom: CAM.stopZoom - 1, pitch: 0, bearing: 0 })
      }
      if (!playingRef.current) return
      const t = window.setTimeout(advance, Math.min(1600, sc.durationMs) / speedRef.current)
      return () => window.clearTimeout(t)
    }

    if (!playing) return

    // ---- intro: slow overview orbit ----
    if (sc.kind === 'intro') {
      const [sw, ne] = bboxOf(walk.coords)
      m.fitBounds([sw, ne], { padding: 56, pitch: 0, bearing: 0, duration: 1200 })
      const t = window.setTimeout(advance, sc.durationMs / speedRef.current)
      return () => window.clearTimeout(t)
    }

    // ---- launch: drop to walking height at the start ----
    if (sc.kind === 'launch') {
      const ahead = pointAtDistance(walk.coords, tl.cum, Math.min(0.25, tl.totalKm))
      m.easeTo({
        center: walk.coords[0],
        zoom: CAM.travelZoom,
        pitch: CAM.travelPitch,
        bearing: bearingDeg(walk.coords[0], ahead),
        duration: sc.durationMs * 0.9,
      })
      trail(0)
      const t = window.setTimeout(advance, sc.durationMs / speedRef.current)
      return () => window.clearTimeout(t)
    }

    // ---- stop: settle and zoom in on the place ----
    if (sc.kind === 'stop') {
      m.easeTo({
        center: walk.stops[sc.stopIndex!].coord,
        zoom: CAM.stopZoom,
        pitch: CAM.stopPitch,
        duration: 900,
      })
      trail(sc.toKm)
      const t = window.setTimeout(advance, sc.durationMs / speedRef.current)
      return () => window.clearTimeout(t)
    }

    // ---- finale: pull back to the whole loop ----
    if (sc.kind === 'finale') {
      const [sw, ne] = bboxOf(walk.coords)
      trail(tl.totalKm)
      m.easeTo({ pitch: 0, bearing: 0, duration: 700 })
      m.fitBounds([sw, ne], { padding: 56, duration: 1800 })
      const t = window.setTimeout(advance, sc.durationMs / speedRef.current)
      return () => window.clearTimeout(t)
    }

    // ---- travel: km-paced glide with smoothed look-ahead bearing ----
    // speedRef is read fresh every frame (not baked into kmPerMs), so
    // dragging the speed control mid-glide takes effect immediately instead
    // of only on the next scene — same live-adjustable pattern as Elecride.
    const span = Math.max(0.001, sc.toKm - sc.fromKm)
    const kmPerMs = span / sc.durationMs
    let travelled = sc.fromKm
    let last: number | null = null

    const frame = (t: number) => {
      if (!playingRef.current) return
      if (last === null) last = t
      const dt = Math.min(80, t - last) // clamp tab-switch jumps
      last = t
      travelled = Math.min(sc.toKm, travelled + dt * kmPerMs * speedRef.current)
      const here = pointAtDistance(walk.coords, tl.cum, travelled)
      const ahead = pointAtDistance(walk.coords, tl.cum, Math.min(tl.totalKm, travelled + CAM.lookAheadKm))
      const cur = m.getBearing()
      const target = bearingDeg(here, ahead)
      const delta = ((target - cur + 540) % 360) - 180
      m.jumpTo({
        center: here,
        bearing: cur + delta * CAM.bearingEase,
        pitch: CAM.travelPitch,
        zoom: CAM.travelZoom,
      })
      trail(travelled)
      if (travelled < sc.toKm) raf.current = requestAnimationFrame(frame)
      else advance()
    }
    raf.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneIdx, ready, playing])

  const jumpToStop = (i: number) => {
    const idx = sceneIndexOfStop(tl, i)
    if (idx >= 0) {
      cancelAnimationFrame(raf.current)
      setSceneIdx(idx)
      setPlaying(true)
    }
  }

  const progress = tl.scenes.length > 1 ? sceneIdx / (tl.scenes.length - 1) : 1
  const done = sceneIdx >= tl.scenes.length - 1 && !playing

  if (!current) return null

  return (
    <div className="flyover">
      <div ref={el} className="flyover__map" />

      <div className="flyover__bar" style={{ width: `${progress * 100}%` }} />

      <button className="flyover__exit" onClick={() => goto('preview')} aria-label="Exit fly-over">
        ✕
      </button>

      <div className="flyover__speed">
        {SPEEDS.map((s) => (
          <button key={s} className={speed === s ? 'is-on' : ''} onClick={() => setSpeed(s)}>
            {s}×
          </button>
        ))}
      </div>

      {scene?.kind === 'intro' && (
        <div className="flyover__title">
          <span className="flyover__vibe" style={{ background: vibe.soft, color: vibe.color }}>
            {vibe.emoji} {vibe.name}
          </span>
          <h1>{walk.title}</h1>
          <p>
            {walk.distanceKm} km · {walk.estMinutes} min · {walk.stops.length} stops
          </p>
        </div>
      )}

      {activeStop && <StopCard key={activeStop.id} stop={activeStop} />}

      {scene?.kind === 'finale' && (
        <div className="flyover__title flyover__title--end">
          <h1>Your walk awaits</h1>
          <p>{walk.stops.filter((s) => s.placeName).length} real places along the way</p>
        </div>
      )}

      <div className="flyover__controls">
        <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '❚❚' : '▶'}
        </button>
        <div className="flyover__dots">
          {walk.stops.map((s, i) => (
            <button
              key={s.id}
              className={activeStop?.id === s.id ? 'is-on' : ''}
              onClick={() => jumpToStop(i)}
              aria-label={`Stop ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            if (done) {
              setSceneIdx(0)
              setPlaying(true)
            } else {
              goto('preview')
            }
          }}
        >
          {done ? '↻' : '⤼'}
        </button>
      </div>
    </div>
  )
}

/** The card that appears while the camera holds on a stop. */
function StopCard({ stop }: { stop: import('../lib/types').Stop }) {
  const [img, setImg] = useState<PlaceImage | null>(null)
  useEffect(() => {
    let live = true
    if (stop.placeName) {
      findPlaceImage(stop.placeCoord ?? stop.coord, stop.placeName).then((i) => live && setImg(i))
    }
    return () => {
      live = false
    }
  }, [stop.id])

  return (
    <div className="fly-card">
      {img && (
        <div className="fly-card__img" style={{ backgroundImage: `url(${img.url})` }}>
          <span className="fly-card__credit">{img.credit}</span>
        </div>
      )}
      <div className="fly-card__body">
        <CatIcon category={stop.category} size={40} />
        <div className="fly-card__text">
          <div className="fly-card__n">Stop {stop.order}</div>
          <div className="fly-card__t">{stop.title}</div>
          <div className="fly-card__s">
            {catLabel(stop.category)} · {stop.teaser}
          </div>
        </div>
      </div>
    </div>
  )
}
