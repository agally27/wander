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

const BG = '#EDE9E1'
const WATER = '#AEC4CC'
const PARK = '#D2E0C6'
const WOOD = '#C4D6B6'
const LANDUSE = '#E6E1D6'
const BUILDING = '#DED8CB'
const BUILDING_LINE = '#CFC8B7'
const ROAD_CASING = '#D6D0C0'
const ROAD_MAJOR = '#FBFAF6'
const ROAD_MINOR = '#F4F2EA'
const PATH = '#C9A97E'
const RAIL = '#C2BCAB'
const LABEL = '#5A5648'
const LABEL_HALO = '#F4F1E8'

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
        id: 'place-labels', type: 'symbol', source: 'omt', 'source-layer': 'place',
        filter: ['match', ['get', 'class'], ['city', 'town', 'village', 'suburb', 'neighbourhood'], true, false],
        layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 8, 11, 14, 14] },
        paint: { 'text-color': LABEL, 'text-halo-color': LABEL_HALO, 'text-halo-width': 1.6 },
      },
    ],
  }
}
