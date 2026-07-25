import type { LngLat } from '../types'

/**
 * Best-available visual for a discovery point, layered:
 *
 *   1. a freely licensed photo near the location (Wikimedia Commons
 *      geosearch — keyless, CORS-enabled via origin=*), shown with credit
 *   2. the live map itself (the camera is already zooming into the spot)
 *   3. the illustrated discovery card (emoji + theme colour) — always there
 *
 * Commons hosts free-licensed media and its API permits hotlinking thumbs;
 * we display with a credit line and never store or transform the images.
 * Everything is best-effort: the preview never waits on, or fails for, a
 * missing photo.
 */

export interface PlaceImage {
  url: string
  credit: string
}

const cache = new Map<string, PlaceImage | null>()

export async function findPlaceImage(coord: LngLat, name?: string): Promise<PlaceImage | null> {
  const key = coord.join(',')
  if (cache.has(key)) return cache.get(key) ?? null
  try {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      generator: 'geosearch',
      ggscoord: `${coord[1]}|${coord[0]}`,
      ggsradius: '140',
      ggslimit: '8',
      ggsnamespace: '6', // File: namespace
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: '640',
    })
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 3500)
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error(String(res.status))
    const data = await res.json()
    const pages: any[] = Object.values(data?.query?.pages ?? {})
    const usable = pages
      .filter((p) => /\.(jpe?g|png|webp)$/i.test(p.title ?? ''))
      .map((p) => ({ p, info: p.imageinfo?.[0] }))
      .filter((x) => x.info?.thumburl)
    if (!usable.length) {
      cache.set(key, null)
      return null
    }
    // Prefer a file whose name echoes the place name, else the first hit.
    const lower = (name ?? '').toLowerCase()
    const match =
      (lower && usable.find((x) => x.p.title.toLowerCase().includes(lower.split(' ')[0]))) || usable[0]
    const artist = match.info.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, '').trim()
    const img: PlaceImage = {
      url: match.info.thumburl,
      credit: artist ? `📷 ${artist} · Wikimedia Commons` : '📷 Wikimedia Commons',
    }
    cache.set(key, img)
    return img
  } catch {
    cache.set(key, null)
    return null
  }
}
