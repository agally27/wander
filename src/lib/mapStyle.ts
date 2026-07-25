import type { StyleSpecification } from 'maplibre-gl'

/**
 * Wander "warm paper" map style.
 * Vector tiles: OpenFreeMap (free, keyless) — OpenMapTiles schema.
 * A quieter, more editorial palette than the kids' storybook map: warm
 * off-white paper, muted greens and slate water, so the amber walking
 * line and the numbered stops stay the heroes.
 */

const TILES = 'https://tiles.openfreemap.org/planet'
const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf'

const BG = '#EAE5D9'
const WATER = '#9BC0CC'
const PARK = '#C4D9B3'
const WOOD = '#AFCFA0'
const LANDUSE = '#E3DDCC'
const BUILDING = '#D9D1BE'
const BUILDING_LINE = '#C7BCA3'
const ROAD_CASING = '#CFC6AE'
const ROAD_MAJOR = '#FDFCF8'
const ROAD_MINOR = '#F5F2E9'
const PATH = '#BE8F55'
const RAIL = '#BBB39C'
const LABEL = '#514C3D'
const LABEL_HALO = '#F4F1E8'
const ROAD_LABEL = '#6B6250'

export function buildPaperStyle(): StyleSpecification {
  return {
    version: 8,
    name: 'Wander Paper',
    glyphs: GLYPHS,
    sources: {
      omt: { type: 'vector', url: TILES },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': BG } },
      { id: 'landuse', type: 'fill', source: 'omt', 'source-layer': 'landuse', paint: { 'fill-color': LANDUSE } },
      {
        id: 'wood', type: 'fill', source: 'omt', 'source-layer': 'landcover',
        filter: ['==', ['get', 'class'], 'wood'], paint: { 'fill-color': WOOD, 'fill-opacity': 0.75 },
      },
      {
        id: 'grass', type: 'fill', source: 'omt', 'source-layer': 'landcover',
        filter: ['==', ['get', 'class'], 'grass'], paint: { 'fill-color': PARK, 'fill-opacity': 0.65 },
      },
      { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': PARK, 'fill-opacity': 0.85 } },
      { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': WATER } },
      {
        id: 'waterway', type: 'line', source: 'omt', 'source-layer': 'waterway',
        paint: { 'line-color': WATER, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 16, 4] },
      },
      {
        id: 'building', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 13,
        paint: { 'fill-color': BUILDING, 'fill-outline-color': BUILDING_LINE },
      },
      {
        id: 'rail', type: 'line', source: 'omt', 'source-layer': 'transportation',
        filter: ['==', ['get', 'class'], 'rail'], paint: { 'line-color': RAIL, 'line-width': 1.3, 'line-dasharray': [3, 2] },
      },
      {
        id: 'road-casing', type: 'line', source: 'omt', 'source-layer': 'transportation',
        filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'service'], true, false],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ROAD_CASING, 'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 10, 1.5, 14, 6, 17, 16] },
      },
      {
        id: 'road-minor', type: 'line', source: 'omt', 'source-layer': 'transportation',
        filter: ['match', ['get', 'class'], ['minor', 'service', 'tertiary'], true, false],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ROAD_MINOR, 'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 12, 1.2, 14, 3.5, 17, 11] },
      },
      {
        id: 'road-major', type: 'line', source: 'omt', 'source-layer': 'transportation',
        filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary'], true, false],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ROAD_MAJOR, 'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 10, 1.5, 14, 4.5, 17, 13] },
      },
      {
        id: 'paths', type: 'line', source: 'omt', 'source-layer': 'transportation',
        filter: ['==', ['get', 'class'], 'path'], layout: { 'line-cap': 'round' },
        paint: { 'line-color': PATH, 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1, 17, 3], 'line-dasharray': [2.5, 2] },
      },
      {
        id: 'road-name', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name',
        minzoom: 14,
        filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'service', 'path'], true, false],
        layout: {
          'symbol-placement': 'line',
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 14, 10, 18, 13],
          'text-letter-spacing': 0.02,
        },
        paint: { 'text-color': ROAD_LABEL, 'text-halo-color': LABEL_HALO, 'text-halo-width': 1.4 },
      },
      {
        id: 'poi-green-labels', type: 'symbol', source: 'omt', 'source-layer': 'poi',
        minzoom: 14,
        filter: ['match', ['get', 'class'], ['park', 'garden'], true, false],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Italic'],
          'text-size': 11,
          'text-max-width': 7,
        },
        paint: { 'text-color': '#3F6B49', 'text-halo-color': LABEL_HALO, 'text-halo-width': 1.4 },
      },
      {
        id: 'place-labels', type: 'symbol', source: 'omt', 'source-layer': 'place',
        filter: ['match', ['get', 'class'], ['city', 'town', 'village', 'suburb', 'neighbourhood'], true, false],
        layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 8, 11, 14, 14] },
        paint: { 'text-color': LABEL, 'text-halo-color': LABEL_HALO, 'text-halo-width': 1.6 },
      },
    ],
  }
}
