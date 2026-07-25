import type { StyleSpecification } from 'maplibre-gl'

/**
 * Wander "daylight paper" map style.
 * Vector tiles: OpenFreeMap (free, keyless) — OpenMapTiles schema.
 *
 * This is Elecride's map, rebuilt in daylight. Elecride renders roads as
 * neon circuitry: every class gets a wide, blurred HALO line beneath a
 * bright CORE line, which is what gives that map its depth. The same
 * two-layer trick works beautifully in reverse — here the halo is a soft
 * warm shadow and the core is near-white, so roads read as embossed on
 * paper rather than glowing in the dark.
 *
 * Also carried over from Elecride: the layered water edge, zoom-faded
 * buildings, dashed boundaries, and the full label set (roads, water,
 * places, peaks) — the richness that made that map feel finished.
 */

const TILES = 'https://tiles.openfreemap.org/planet'
const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf'

// palette — warm paper, muted naturals, near-white roads
const BG = '#F2EDE2'
const WATER = '#B4D2DE'
const WATER_EDGE = '#8FB8CB'
const PARK = '#CBE0B9'
const WOOD = '#B9D5A4'
const LANDUSE = '#E9E2D2'
const BUILDING = '#E2DACA'
const BUILDING_LINE = '#CDC2AA'
const HALO_MAJOR = '#D3C7AC'
const HALO_MINOR = '#DED4BE'
const CORE_MOTORWAY = '#FFFFFF'
const CORE_PRIMARY = '#FFFDF7'
const CORE_MINOR = '#FCF9F0'
const CORE_PATH = '#B5763C'
const RAIL = '#C3BAA4'
const LABEL = '#4C4636'
const LABEL_DIM = '#7A7159'
const LABEL_HALO = '#F6F2E9'

export function buildPaperStyle(): StyleSpecification {
  return {
    version: 8,
    name: 'Wander Daylight',
    glyphs: GLYPHS,
    sources: {
      omt: { type: 'vector', url: TILES },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': BG } },

      {
        id: 'landuse', type: 'fill', source: 'omt', 'source-layer': 'landuse',
        paint: { 'fill-color': LANDUSE, 'fill-opacity': 0.75 },
      },
      {
        id: 'landcover-green', type: 'fill', source: 'omt', 'source-layer': 'landcover',
        filter: ['in', ['get', 'class'], ['literal', ['wood', 'grass', 'farmland']]],
        paint: { 'fill-color': WOOD, 'fill-opacity': 0.55 },
      },
      {
        id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park',
        paint: { 'fill-color': PARK, 'fill-opacity': 0.8 },
      },

      // water, with a soft darker edge for depth (Elecride's water-glow, inverted)
      { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': WATER } },
      {
        id: 'water-edge', type: 'line', source: 'omt', 'source-layer': 'water',
        paint: {
          'line-color': WATER_EDGE,
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 8, 0.6, 16, 2.4],
          'line-blur': 1.5,
          'line-opacity': 0.85,
        },
      },
      {
        id: 'waterway', type: 'line', source: 'omt', 'source-layer': 'waterway',
        paint: {
          'line-color': WATER_EDGE,
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 8, 0.5, 16, 3],
          'line-opacity': 0.9,
        },
      },

      // ---- road halos (soft shadow beneath the core) ----
      {
        id: 'halo-minor', type: 'line', source: 'omt', 'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'tertiary', 'residential', 'unclassified']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': HALO_MINOR,
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 10, 1.4, 14, 5.5, 18, 21],
          'line-blur': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 18, 3],
          'line-opacity': 0.75,
        },
      },
      {
        id: 'halo-major', type: 'line', source: 'omt', 'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': HALO_MAJOR,
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 6, 1.8, 10, 5.5, 14, 13, 18, 42],
          'line-blur': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 18, 5],
          'line-opacity': 0.8,
        },
      },

      // ---- road cores ----
      {
        id: 'road-minor', type: 'line', source: 'omt', 'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'tertiary', 'residential', 'unclassified']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': CORE_MINOR,
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 10, 0.4, 14, 2.4, 18, 12],
          'line-opacity': 1,
        },
      },
      {
        id: 'road-secondary', type: 'line', source: 'omt', 'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['secondary', 'primary']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': CORE_PRIMARY,
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 7, 0.6, 11, 2, 15, 6, 18, 18],
          'line-opacity': 1,
        },
      },
      {
        id: 'road-motorway', type: 'line', source: 'omt', 'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': CORE_MOTORWAY,
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 5, 0.8, 9, 2.2, 13, 6, 18, 20],
          'line-opacity': 1,
        },
      },
      // footpaths matter most in a walking app — terracotta dashes, drawn above
      // the road cores so they never get buried
      {
        id: 'road-path', type: 'line', source: 'omt', 'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['path', 'track', 'cycleway']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': CORE_PATH,
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 12, 0.7, 16, 1.9, 19, 3.4],
          'line-dasharray': [2, 1.8],
          'line-opacity': 0.85,
        },
      },
      {
        id: 'rail', type: 'line', source: 'omt', 'source-layer': 'transportation',
        filter: ['==', ['get', 'class'], 'rail'],
        paint: {
          'line-color': RAIL,
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 10, 0.5, 16, 2],
          'line-dasharray': [3, 3],
        },
      },

      // buildings — fade in with zoom like Elecride's
      {
        id: 'buildings', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 13,
        paint: {
          'fill-color': BUILDING,
          'fill-outline-color': BUILDING_LINE,
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0, 15, 0.9],
        },
      },
      // extruded buildings, hidden until the cinematic fly-over pitches the
      // camera over — that's when they add depth rather than clutter
      {
        id: 'buildings-3d', type: 'fill-extrusion', source: 'omt', 'source-layer': 'building', minzoom: 14,
        layout: { visibility: 'none' },
        paint: {
          'fill-extrusion-color': [
            'interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 6],
            0, '#EDE6D6',
            60, '#DED4BE',
            180, '#CFC2A6',
          ],
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 6],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.9,
        },
      },

      {
        id: 'boundary', type: 'line', source: 'omt', 'source-layer': 'boundary',
        filter: ['<=', ['get', 'admin_level'], 4],
        paint: { 'line-color': '#BFB49A', 'line-width': 1, 'line-dasharray': [4, 3], 'line-opacity': 0.7 },
      },

      // ---- labels ----
      {
        id: 'road-labels', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 13,
        layout: {
          'symbol-placement': 'line',
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11,
        },
        paint: { 'text-color': LABEL_DIM, 'text-halo-color': LABEL_HALO, 'text-halo-width': 1.6 },
      },
      {
        id: 'poi-green-labels', type: 'symbol', source: 'omt', 'source-layer': 'poi', minzoom: 14,
        filter: ['in', ['get', 'class'], ['literal', ['park', 'garden']]],
        layout: {
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
          'text-font': ['Noto Sans Italic'],
          'text-size': 11,
          'text-max-width': 7,
        },
        paint: { 'text-color': '#3E6B47', 'text-halo-color': LABEL_HALO, 'text-halo-width': 1.4 },
      },
      {
        id: 'water-labels', type: 'symbol', source: 'omt', 'source-layer': 'water_name',
        layout: {
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
          'text-font': ['Noto Sans Italic'],
          'text-size': 12,
          'text-letter-spacing': 0.15,
        },
        paint: { 'text-color': '#3D7A93', 'text-halo-color': LABEL_HALO, 'text-halo-width': 1.3 },
      },
      {
        id: 'place-labels', type: 'symbol', source: 'omt', 'source-layer': 'place',
        filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'village', 'suburb', 'neighbourhood']]],
        layout: {
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
          'text-font': ['Noto Sans Bold'],
          'text-size': ['match', ['get', 'class'], 'city', 15, 'town', 12.5, 11],
          'text-letter-spacing': 0.12,
          'text-transform': ['match', ['get', 'class'], 'city', 'uppercase', 'none'],
        },
        paint: { 'text-color': LABEL, 'text-halo-color': LABEL_HALO, 'text-halo-width': 1.8 },
      },
      {
        id: 'peak-labels', type: 'symbol', source: 'omt', 'source-layer': 'mountain_peak', minzoom: 10,
        layout: {
          'text-field': ['concat', ['coalesce', ['get', 'name:en'], ['get', 'name'], ''], '\n▲ ', ['coalesce', ['get', 'ele'], ''], ' m'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 10,
        },
        paint: { 'text-color': '#6E7A5E', 'text-halo-color': LABEL_HALO, 'text-halo-width': 1.2 },
      },
    ],
  }
}
