# Wander 🚶‍♀️✨ — curated local walks for grown-ups

The adult sibling of **Adventure Walk**. Same idea — turn an ordinary walk into
something worth doing — but reframed for grown-ups and built around the real
places nearby: pubs, breweries, cafés, bakeries, delis, markets, galleries,
street art, theatres, bookshops, historic architecture, gardens, waterside and
quiet viewpoints.

Pick a vibe and a starting point; Wander routes a real loop on footpaths and
threads it through the best actual places around you, pulled live from
OpenStreetMap. On the walk each stop opens with an honest bit of background and
a photo when one exists — and anything you like, you keep in your **field
notes** with a rating and a remark.

## Run it

```bash
cd adult-walk
npm install
npm run dev
```

Open the printed URL (best at phone width — the app is capped at 480 px).
`npm run build` produces a static bundle in `dist/` you can deploy anywhere.

**Trying it indoors:** start a walk, flip the **📡 GPS / 🧪 Preview** toggle to
Preview, and tap **"Walk a little further"** to move along the route — the full
arrive → stop card → save loop works without leaving your chair. Real GPS
proximity unlocking (≈40 m) kicks in outdoors.

## Finding real local places

This is the part you asked for. Generation is a ranking problem: *of everything
around this loop, what would a grown-up actually detour for?*

1. **Three scout loops** are routed in different directions from your start
   point on real footpaths (FOSSGIS **Valhalla** pedestrian costing, **OSRM**
   foot profile as fallback).
2. **One Overpass query** (OpenStreetMap) sweeps a broad set of grown-up
   place types around all three loops — see `lib/api/discoveries.ts`. Named
   places are strongly preferred, so an unnamed café is noise but *The Marble
   Arch* is a recommendation.
3. The **loop whose surroundings score best for your vibe wins** — routes are
   chosen for what's along them, not just where they go.
4. Candidates are ranked on **proximity to the path · vibe affinity ·
   named-real-place bonus · variety** (category repeats are punished, coverage
   across drink / food / culture / heritage / green is rewarded), then one
   winner is picked per route segment so stops stay nicely spaced.
5. The walk is **re-routed through the chosen places**, and any gaps become
   open-ended "wander" spots — a prompt to slow down and look around.

If Overpass is unreachable, the walk still generates with wander spots along a
real footpath loop, so it never hard-fails.

### Honest content, by design

Real place **names** come from OpenStreetMap and are marked *"a real place on
the map."* The background note is always **general category knowledge**
("pubs like this…", "specialty coffee is judged like wine…") — never an
invented fact about a specific named place. Photos, when shown, are freely
licensed Wikimedia Commons images near the coordinate, credited and hotlinked,
never stored. The engine never makes claims about a specific real business.

## The six vibes

| Vibe | Leans into |
|------|------------|
| ✨ **Local Gems** | a well-rounded loop of the best bits |
| 🏛️ **History & Heritage** | old buildings, monuments, plaques, grand facades |
| 🍺 **Pub & Brewery Trail** | pubs, taprooms, bars, beer gardens |
| 🥐 **Food & Coffee** | cafés, bakeries, delis, markets |
| 🎨 **Arts & Culture** | galleries, street art, theatres, bookshops, cinemas |
| 🌳 **Green Escape** | parks, gardens, waterside, viewpoints, notable trees |

Vibe → category weightings live in `lib/vibes.ts`; a Claude-powered ranker or
copywriter could replace the scoring and note-writing without touching the UI.

## How it fits together

```
CreateFlow (vibe → location → length/pace)
        ↓
generator.ts
  1. size a loop from duration + pace
  2. scout three footpath loops (routing.ts)
  3. find real places nearby      → Overpass (discoveries.ts)
  4. score & pick the best loop + one stop per segment (vibes.ts)
  5. re-route through the chosen places
        ↓
PreviewScreen  → map + stop list, "start walk"
WalkScreen     → GPS/preview movement, arrive → stop card → save
DoneScreen     → distance / stops / kept places
SavedScreen    → field notes, ratings & remarks (localStorage)
```

## Relationship to Adventure Walk

Wander is a **separate app** living alongside the kids' app in this repo. It
**reuses the proven engine** verbatim — `geo.ts`, `api/routing.ts`,
`api/geocode.ts`, `api/imagery.ts` — and rebuilds the experience layer on top:
a much broader adult Overpass selector set, vibe-based ranking instead of
age-interest scoring, honest grown-up copy instead of stickers/challenges, and
a "field notes" collection instead of badges/XP. Everything is keyless, free
and client-side; your location never leaves the device.

## Tech

React 18 · TypeScript · Vite · Zustand · MapLibre GL. Data: OpenStreetMap
(Overpass), Valhalla/OSRM routing, Photon geocoding, OpenFreeMap tiles,
Wikimedia Commons imagery — all free and keyless.
