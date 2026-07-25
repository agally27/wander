import type { StopCategory, VibeId, VibeMeta } from './types'

export const VIBES: VibeMeta[] = [
  {
    id: 'gems',
    name: 'Local Gems',
    tagline: 'A well-rounded loop of the best bits nearby',
    emoji: '✨',
    color: '#C08457',
    soft: '#F4ECE3',
  },
  {
    id: 'history',
    name: 'History & Heritage',
    tagline: 'Old stone, plaques, monuments and grand facades',
    emoji: '🏛️',
    color: '#8A6D3B',
    soft: '#F1EADC',
  },
  {
    id: 'pub',
    name: 'Pub & Brewery Trail',
    tagline: 'Characterful pubs, taprooms and beer gardens',
    emoji: '🍺',
    color: '#B5793A',
    soft: '#F3E9D9',
  },
  {
    id: 'foodie',
    name: 'Food & Coffee',
    tagline: 'Cafés, bakeries, delis and market stalls',
    emoji: '🥐',
    color: '#C25E4B',
    soft: '#F6E4DF',
  },
  {
    id: 'culture',
    name: 'Arts & Culture',
    tagline: 'Galleries, street art, theatres and bookshops',
    emoji: '🎨',
    color: '#8C5A9E',
    soft: '#EEE4F2',
  },
  {
    id: 'green',
    name: 'Green Escape',
    tagline: 'Parks, gardens, waterside and quiet viewpoints',
    emoji: '🌳',
    color: '#4F7D57',
    soft: '#E3EFDF',
  },
]

export function vibeMeta(id: VibeId): VibeMeta {
  return VIBES.find((v) => v.id === id)!
}

/**
 * How strongly each vibe wants each category. Higher = more likely to be
 * picked for a walk of that vibe. Missing entries fall back to a low base
 * so every walk still surfaces the occasional pleasant surprise.
 */
export const VIBE_AFFINITY: Record<VibeId, Partial<Record<StopCategory, number>>> = {
  gems: {
    landmark: 3, viewpoint: 2.6, historic: 2.4, gallery: 2.2, artwork: 2.2, market: 2.2,
    park: 2, cafe: 2, pub: 2, museum: 2, monument: 1.8, garden: 1.8, bridge: 1.6, bookshop: 1.6,
  },
  history: {
    historic: 3.2, monument: 3, memorial: 2.8, worship: 2.6, museum: 2.6, landmark: 2.2,
    bridge: 2, artwork: 1.4, viewpoint: 1.4,
  },
  pub: {
    pub: 3.4, brewery: 3.2, bar: 2.8, market: 1.6,
    cafe: 1.2, river: 1.4, park: 1.2, bridge: 1.2, landmark: 1.2,
  },
  foodie: {
    cafe: 3.2, bakery: 3, market: 3, deli: 2.8, restaurant: 2.6, brewery: 1.8, bar: 1.6,
    pub: 1.6, bookshop: 1.2,
  },
  culture: {
    gallery: 3.2, 'street-art': 3, artwork: 3, theatre: 2.8, museum: 2.6, cinema: 2.4,
    bookshop: 2.4, music: 2.2, landmark: 1.6, historic: 1.4,
  },
  green: {
    park: 3.2, garden: 3, viewpoint: 2.8, water: 2.6, river: 2.6, tree: 2.4, fountain: 1.8,
    bridge: 1.4, cafe: 1.2,
  },
}

/** Broad groups used to reward variety within a single walk. */
export type VarietyGroup = 'drink' | 'food' | 'culture' | 'heritage' | 'green'

export const GROUP_OF: Record<StopCategory, VarietyGroup> = {
  pub: 'drink', bar: 'drink', brewery: 'drink',
  cafe: 'food', bakery: 'food', restaurant: 'food', market: 'food', deli: 'food',
  gallery: 'culture', artwork: 'culture', 'street-art': 'culture', museum: 'culture',
  theatre: 'culture', cinema: 'culture', bookshop: 'culture', music: 'culture',
  historic: 'heritage', monument: 'heritage', memorial: 'heritage', landmark: 'heritage',
  worship: 'heritage', bridge: 'heritage',
  park: 'green', garden: 'green', viewpoint: 'green', water: 'green', river: 'green',
  fountain: 'green', tree: 'green',
  wander: 'green',
}
