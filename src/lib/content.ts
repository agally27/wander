import type { StopCategory, VibeId } from './types'

/**
 * Category copy for the adult app. Everything here is *general* category
 * knowledge or a prompt to look around — never an invented fact about a
 * specific named place. Real names come from OpenStreetMap; the note is
 * always framed as "places like this…", keeping content honest.
 */

export interface CategoryContent {
  label: string
  emoji: string
  color: string
  /** one-liners — "why stop here" */
  blurbs: string[]
  /** longer honest background, general to the category */
  notes: string[]
  /** spoiler-free teaser for the preview list */
  teaser: string
  /** fallback titles when OSM has no name */
  titles: string[]
}

export const CONTENT: Record<StopCategory, CategoryContent> = {
  pub: {
    label: 'Pub', emoji: '🍺', color: '#B5793A',
    blurbs: ['A proper spot for a pint and a sit-down', 'Worth ducking in for a half', 'Classic corner local'],
    notes: [
      'The traditional British pub grew out of Roman tabernae and medieval alehouses — the word itself is short for "public house". Look for the hanging sign: many still show a coat of arms, an old trade, or a local landmark.',
      'Cask ale is served without added gas and only lasts a few days once tapped, so a good cellar is a point of pride. If they list a local brewery, that pint likely travelled only a few miles.',
    ],
    teaser: 'A characterful place for a drink',
    titles: ['A local pub', 'The corner pub', 'A traditional alehouse'],
  },
  bar: {
    label: 'Bar', emoji: '🍸', color: '#9B6BA8',
    blurbs: ['Somewhere for a proper cocktail', 'A stylish stop for a drink', 'Good for an evening one'],
    notes: [
      'Cocktail culture rewards the curious: ask the bar what they make well rather than ordering blind. Many independents build seasonal menus around whatever local distillers and producers are doing.',
    ],
    teaser: 'A stylish spot for a drink',
    titles: ['A local bar', 'A cocktail bar'],
  },
  brewery: {
    label: 'Brewery / Taproom', emoji: '🍻', color: '#C08A34',
    blurbs: ['Beer at the source', 'Taproom freshness a few steps from the tanks', 'Where the beer is actually made'],
    notes: [
      'Drinking at the brewery means the beer has travelled metres, not miles — often the freshest version you can get. Taprooms also tend to pour one-off and experimental batches that never reach shops.',
    ],
    teaser: 'Fresh beer at the source',
    titles: ['A local brewery', 'The taproom'],
  },
  cafe: {
    label: 'Café', emoji: '☕', color: '#A56A44',
    blurbs: ['A good place to pause for coffee', 'Refuel and watch the street go by', 'Worth a flat white stop'],
    notes: [
      'Specialty coffee is judged like wine — origin, roast date and brew method all change the cup. If beans are roasted locally the bag usually says so; a roast date within a few weeks is a good sign.',
    ],
    teaser: 'A good coffee stop',
    titles: ['A local café', 'A coffee house'],
  },
  bakery: {
    label: 'Bakery', emoji: '🥐', color: '#C9944A',
    blurbs: ['Follow your nose in here', 'Grab something warm for the walk', 'Fresh from the oven'],
    notes: [
      'A real bakery bakes on site through the small hours, so morning is when the shelves are fullest. Sourdough is leavened with wild yeast and takes many hours to prove — the tang is a sign of a slow rise.',
    ],
    teaser: 'Something fresh from the oven',
    titles: ['A local bakery', 'The bakehouse'],
  },
  restaurant: {
    label: 'Restaurant', emoji: '🍽️', color: '#C25E4B',
    blurbs: ['One to remember for later', 'Worth booking a table', 'A notable table nearby'],
    notes: [
      'Menus that change often are usually cooking to what is in season and available that week — a good sign the kitchen shops carefully. Worth noting the name for a return visit.',
    ],
    teaser: 'A table worth remembering',
    titles: ['A local restaurant', 'A place to eat'],
  },
  market: {
    label: 'Market', emoji: '🧺', color: '#B87333',
    blurbs: ['Graze the stalls', 'Local producers in one place', 'Good for a wander and a snack'],
    notes: [
      'Markets are among the oldest features of any town — many sit on charters granted centuries ago. Traders here often sell what they grow, catch or make themselves, so it is worth asking where things come from.',
    ],
    teaser: 'Stalls worth grazing',
    titles: ['A market', 'The market square'],
  },
  deli: {
    label: 'Deli', emoji: '🧀', color: '#B5824A',
    blurbs: ['Pick up something good', 'Cheese, charcuterie, the works', 'Assemble a picnic here'],
    notes: [
      'Delis specialise in things that keep and travel — cured meats, aged cheeses, oils and preserves. Staff usually know their producers well, so ask for a taste before you commit.',
    ],
    teaser: 'Good things to take away',
    titles: ['A deli', 'The delicatessen'],
  },
  gallery: {
    label: 'Gallery', emoji: '🖼️', color: '#8C5A9E',
    blurbs: ['Duck in for the current show', 'Free art, usually', 'A quiet cultural pause'],
    notes: [
      'Many smaller galleries are free and change their exhibitions every few weeks, so there is almost always something new. Commercial galleries welcome browsers too — you are never obliged to buy.',
    ],
    teaser: 'Art worth a look',
    titles: ['A gallery', 'An art space'],
  },
  artwork: {
    label: 'Public Art', emoji: '🗿', color: '#7C6BA8',
    blurbs: ['Stop and take it in', 'A deliberate landmark', 'Worth a photo'],
    notes: [
      'Public artworks are often commissioned to mark a place, a person or an event — look for a nearby plaque explaining the story. Sculpture reads differently as you circle it, so walk around.',
    ],
    teaser: 'A piece of public art',
    titles: ['A public artwork', 'A sculpture'],
  },
  'street-art': {
    label: 'Street Art', emoji: '🎨', color: '#C2506E',
    blurbs: ['Look up — and around the corner', 'A wall worth finding', 'Photograph it before it changes'],
    notes: [
      'Street art is impermanent by nature — murals get painted over, added to, or weathered away, so the piece you see may not last. Many cities now run legal walls and festivals that turn whole streets into rolling galleries.',
    ],
    teaser: 'A wall worth finding',
    titles: ['A mural', 'Street art'],
  },
  museum: {
    label: 'Museum', emoji: '🏺', color: '#8A6D3B',
    blurbs: ['Even 20 minutes is worth it', 'Local story under one roof', 'Good rainy-day detour'],
    notes: [
      'Local museums are the fastest way to understand why a place looks the way it does — trade, industry, geology and migration all leave traces here. Many are free or ask only a small donation.',
    ],
    teaser: 'The local story, under one roof',
    titles: ['A museum', 'The local museum'],
  },
  theatre: {
    label: 'Theatre', emoji: '🎭', color: '#9B4F6E',
    blurbs: ['Check what’s on tonight', 'A grand old auditorium', 'Note it for the evening'],
    notes: [
      'Older theatres are worth admiring from outside for the architecture alone — ornate facades, painted signs and the box-office glow. Many run daytime tours and last-minute ticket schemes.',
    ],
    teaser: 'See what’s on the bill',
    titles: ['A theatre', 'The playhouse'],
  },
  cinema: {
    label: 'Cinema', emoji: '🎬', color: '#6E6BA0',
    blurbs: ['Independent picture house', 'Check the listings', 'A cosy screen nearby'],
    notes: [
      'Independent cinemas tend to programme films the multiplexes skip — repertory classics, world cinema and one-off events. Many keep original period features from their days as grand picture palaces.',
    ],
    teaser: 'A screen worth checking',
    titles: ['A cinema', 'The picture house'],
  },
  bookshop: {
    label: 'Bookshop', emoji: '📚', color: '#7A6A4F',
    blurbs: ['Browse for ten minutes', 'A good independent', 'Perfect slow stop'],
    notes: [
      'Independent bookshops curate by hand, so the tables reflect a real person’s taste — a good place to ask for a recommendation. Many host readings and signings; look for a flyer by the till.',
    ],
    teaser: 'Shelves worth browsing',
    titles: ['A bookshop', 'An independent bookseller'],
  },
  music: {
    label: 'Music & Nightlife', emoji: '🎶', color: '#8452A0',
    blurbs: ['Live music venue', 'Check tonight’s line-up', 'One for later'],
    notes: [
      'Small venues are where most touring acts start out — tonight’s support band could be next year’s headliner. Listings are usually posted by the door or online.',
    ],
    teaser: 'A stage worth checking',
    titles: ['A music venue', 'A live venue'],
  },
  historic: {
    label: 'Historic Building', emoji: '🏰', color: '#8A6D3B',
    blurbs: ['Pause and read the facade', 'Centuries in the stonework', 'Look up at the detail'],
    notes: [
      'Historic buildings wear their age in their materials and details — timber framing, carved dates, weathered stone and changing window styles. A listed building carries legal protection; a plaque nearby often explains its story.',
    ],
    teaser: 'History you can stand in front of',
    titles: ['A historic building', 'An old landmark'],
  },
  monument: {
    label: 'Monument', emoji: '🗽', color: '#8A6D3B',
    blurbs: ['A deliberate marker of memory', 'Circle it and read the inscription', 'Built to be noticed'],
    notes: [
      'Monuments are raised to fix a memory in place — a person, a battle, an idea. The inscription and the direction it faces are usually chosen with care, so it is worth reading and looking where it points.',
    ],
    teaser: 'A landmark built to be remembered',
    titles: ['A monument', 'A memorial column'],
  },
  memorial: {
    label: 'Memorial', emoji: '🕊️', color: '#7C7360',
    blurbs: ['A quiet moment here', 'Read the names', 'A place of remembrance'],
    notes: [
      'War memorials appear in almost every British town, most raised after 1918. The lists of names are often of local people, which is why they still draw wreaths each November.',
    ],
    teaser: 'A quiet place of remembrance',
    titles: ['A memorial', 'A war memorial'],
  },
  landmark: {
    label: 'Landmark', emoji: '📍', color: '#B07A3C',
    blurbs: ['The spot everyone means', 'Get your bearings here', 'A local fixture'],
    notes: [
      'Landmarks are the shared reference points of a place — "meet me by the…". Standing at one is a good way to orient yourself and see how the streets around it were arranged.',
    ],
    teaser: 'A local reference point',
    titles: ['A landmark', 'A local fixture'],
  },
  worship: {
    label: 'Church / Place of Worship', emoji: '⛪', color: '#7C6A4A',
    blurbs: ['Step inside if it’s open', 'The oldest walls in the area, often', 'Cool, quiet and free'],
    notes: [
      'Churches and other places of worship are frequently the oldest surviving buildings in a settlement, and many welcome quiet visitors outside services. Look for the churchyard, memorials and stained glass — layers of local history in one place.',
    ],
    teaser: 'Often the oldest walls nearby',
    titles: ['A church', 'A place of worship'],
  },
  bridge: {
    label: 'Bridge', emoji: '🌉', color: '#7A8A6B',
    blurbs: ['Pause halfway for the view', 'A good vantage point', 'Engineering worth admiring'],
    notes: [
      'Bridges are where a town meets its river, and often its finest engineering — arches, ironwork or elegant modern spans. The middle of a bridge is usually the best free viewpoint around.',
    ],
    teaser: 'A crossing with a view',
    titles: ['A bridge', 'The old bridge'],
  },
  park: {
    label: 'Park', emoji: '🌳', color: '#4F7D57',
    blurbs: ['Slow down and breathe here', 'Green room in the city', 'A lap or a bench'],
    notes: [
      'Public parks were a Victorian invention meant to give crowded cities light and air. Many keep grand old trees, bandstands and formal beds from that era — a bench here is one of the best free seats in town.',
    ],
    teaser: 'Green space to slow down in',
    titles: ['A park', 'The public gardens'],
  },
  garden: {
    label: 'Garden', emoji: '🌷', color: '#5C8A4E',
    blurbs: ['A designed, planted pause', 'Seasonal colour worth timing', 'Quiet and cultivated'],
    notes: [
      'Gardens are made to be read season by season — what blooms in spring is bare by autumn, and vice versa. Look for the plant labels and the way paths steer your eye toward a focal point.',
    ],
    teaser: 'A cultivated, seasonal pause',
    titles: ['A garden', 'The ornamental garden'],
  },
  viewpoint: {
    label: 'Viewpoint', emoji: '🔭', color: '#5B8AA0',
    blurbs: ['The payoff view', 'Worth the climb', 'Best panorama around'],
    notes: [
      'Viewpoints are marked because someone decided the outlook was worth the walk. On a clear day you can often pick out landmarks miles off — orient yourself by them before you carry on.',
    ],
    teaser: 'The view that pays off the walk',
    titles: ['A viewpoint', 'A lookout'],
  },
  water: {
    label: 'Waterside', emoji: '💧', color: '#4E8FA6',
    blurbs: ['Waterside calm', 'Sit by the edge a while', 'The light off the water'],
    notes: [
      'Water draws a walk to a natural pause — it cools the air, carries birdlife and reflects the sky. Historically, towns grew up around water for trade and power, so the oldest buildings are often the closest.',
    ],
    teaser: 'A calm stretch of water',
    titles: ['A lake', 'The waterside'],
  },
  river: {
    label: 'River / Canal', emoji: '🚣', color: '#4E8FA6',
    blurbs: ['Follow the towpath a while', 'Watch for boats and birds', 'The reason the town is here'],
    notes: [
      'Rivers and canals were the motorways of their day — the canal network moved coal and goods before railways existed. Towpaths make for flat, quiet walking, and the locks and warehouses are living industrial history.',
    ],
    teaser: 'A waterway to follow',
    titles: ['A river', 'The canal'],
  },
  fountain: {
    label: 'Fountain', emoji: '⛲', color: '#5B8AA0',
    blurbs: ['A cool centrepiece', 'Good meeting spot', 'Listen to the water'],
    notes: [
      'Ornamental fountains were often gifts to a city — a benefactor’s name is frequently carved on the basin. Before mains water, public fountains and drinking troughs were a genuine civic amenity.',
    ],
    teaser: 'A cooling centrepiece',
    titles: ['A fountain', 'The ornamental fountain'],
  },
  tree: {
    label: 'Notable Tree', emoji: '🌲', color: '#4F7D57',
    blurbs: ['This one earned a name', 'Stand under it a moment', 'Older than everything around it'],
    notes: [
      'A tree gets recorded on the map when it is exceptional — ancient, huge, or tied to local lore. Some are older than every building in sight; standing under one is a rare bit of deep time in a town.',
    ],
    teaser: 'A tree that earned its name',
    titles: ['A notable tree', 'An ancient tree'],
  },
  wander: {
    label: 'Wander Spot', emoji: '🧭', color: '#8A8172',
    blurbs: ['Slow here and look around', 'No fixed target — just notice', 'Let the street surprise you'],
    notes: [
      'Not every good moment on a walk has a name on the map. Slow down here, look up at the rooflines, down the side streets and into the shop windows — the unlisted details are half of what makes a place.',
    ],
    teaser: 'An open-ended pause to look around',
    titles: ['A quiet corner', 'An unmarked spot'],
  },
}

export function contentFor(cat: StopCategory): CategoryContent {
  return CONTENT[cat] ?? CONTENT.wander
}

export function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]
}

const TITLE_BY_VIBE: Record<VibeId, string[]> = {
  gems: ['Best of the neighbourhood', 'A loop of local gems', 'The good-bits wander'],
  history: ['A walk through the past', 'Heritage loop', 'Old stones and stories'],
  pub: ['The pub trail', 'A crawl worth taking', 'Taproom to taproom'],
  foodie: ['A tasting loop', 'Coffee, crust and cheese', 'The graze walk'],
  culture: ['An arts amble', 'Galleries and walls', 'The culture loop'],
  green: ['A breath of green', 'Parks and waterside', 'The slow green loop'],
}

const INTRO_BY_VIBE: Record<VibeId, string> = {
  gems: 'A well-rounded loop stitched together from the most rewarding real places near your start point.',
  history: 'A loop that leans into the past — old buildings, monuments and the stories set in local stone.',
  pub: 'A route built around characterful places to drink, with a few good sights to walk off between rounds.',
  foodie: 'A grazing loop past cafés, bakeries, delis and markets — come a little hungry.',
  culture: 'An arts-minded amble past galleries, street art, stages and shelves worth browsing.',
  green: 'A gentler loop that seeks out parks, gardens, waterside and the odd quiet viewpoint.',
}

export function walkTitle(vibe: VibeId, rng: () => number): string {
  return pick(TITLE_BY_VIBE[vibe], rng)
}

export function walkIntro(vibe: VibeId, stops: number): string {
  return `${INTRO_BY_VIBE[vibe]} ${stops} stops, ending back where you began.`
}

export function teaserFor(cat: StopCategory): string {
  return contentFor(cat).teaser
}
