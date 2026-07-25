import { useEffect, useRef } from 'react'
import maplibregl, { Map as MLMap, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { buildPaperStyle } from '../lib/mapStyle'
import { bboxOf } from '../lib/geo'
import type { Stop, LngLat } from '../lib/types'

const EMPTY_FC = { type: 'FeatureCollection', features: [] } as any

/**
 * One shared map used by the location picker, the preview and walk mode.
 * The route renders as a dashed amber line; stops as numbered markers that
 * fill in once visited; the walker as a pulsing dot.
 */
export default function MapCanvas(props: {
  coords?: LngLat[]
  stops?: Stop[]
  position?: LngLat | null
  center?: LngLat
  follow?: boolean
  onPick?: (c: LngLat) => void
  onStopClick?: (id: string) => void
}) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<MLMap | null>(null)
  const markers = useRef<Marker[]>([])
  const meMarker = useRef<Marker | null>(null)
  const onPickRef = useRef(props.onPick)
  onPickRef.current = props.onPick
  const onStopClickRef = useRef(props.onStopClick)
  onStopClickRef.current = props.onStopClick

  useEffect(() => {
    if (!el.current) return
    const m = new maplibregl.Map({
      container: el.current,
      style: buildPaperStyle(),
      center: props.center ?? props.coords?.[0] ?? [-2.98, 53.4],
      zoom: 14,
      attributionControl: { compact: true },
    })
    m.on('load', () => {
      m.addSource('route', { type: 'geojson', data: EMPTY_FC })
      m.addLayer({
        id: 'route-halo', type: 'line', source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': 0.9 },
      })
      m.addLayer({
        id: 'route-trail', type: 'line', source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#D98A3D', 'line-width': 4, 'line-dasharray': [0.1, 1.8] },
      })
      syncRoute(m)
    })
    m.on('click', (e) => {
      onPickRef.current?.([e.lngLat.lng, e.lngLat.lat])
    })
    map.current = m
    return () => {
      markers.current.forEach((mk) => mk.remove())
      meMarker.current?.remove()
      m.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function syncRoute(m: MLMap) {
    const src = m.getSource('route') as maplibregl.GeoJSONSource | undefined
    if (!src) return
    src.setData(
      props.coords?.length
        ? ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: props.coords } } as any)
        : EMPTY_FC,
    )
  }

  useEffect(() => {
    const m = map.current
    if (!m) return
    const apply = () => {
      syncRoute(m)
      if (props.coords?.length && !props.follow) {
        const [sw, ne] = bboxOf(props.coords)
        m.fitBounds([sw, ne], { padding: 48, duration: 600 })
      }
    }
    if (m.isStyleLoaded()) apply()
    else m.once('load', apply)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.coords])

  useEffect(() => {
    const m = map.current
    if (!m) return
    markers.current.forEach((mk) => mk.remove())
    markers.current = []
    props.stops?.forEach((s, i) => {
      const node = document.createElement('div')
      node.className = 'stop-marker'
      node.dataset.visited = String(s.status === 'visited')
      node.dataset.next = String(s.status === 'next')
      node.textContent = s.status === 'visited' ? '✓' : String(i + 1)
      if (onStopClickRef.current) {
        node.style.cursor = 'pointer'
        node.addEventListener('click', (ev) => {
          ev.stopPropagation()
          onStopClickRef.current?.(s.id)
        })
      }
      markers.current.push(new Marker({ element: node }).setLngLat(s.coord).addTo(m))
    })
  }, [props.stops])

  useEffect(() => {
    const m = map.current
    if (!m) return
    if (!props.position) {
      meMarker.current?.remove()
      meMarker.current = null
      return
    }
    if (!meMarker.current) {
      const node = document.createElement('div')
      node.className = 'me-marker'
      meMarker.current = new Marker({ element: node }).setLngLat(props.position).addTo(m)
    } else {
      meMarker.current.setLngLat(props.position)
    }
    if (props.follow) m.easeTo({ center: props.position, duration: 800 })
  }, [props.position, props.follow])

  useEffect(() => {
    const m = map.current
    if (!m || !props.center) return
    m.easeTo({ center: props.center, zoom: Math.max(m.getZoom(), 14), duration: 500 })
  }, [props.center])

  return <div ref={el} style={{ position: 'absolute', inset: 0 }} />
}
