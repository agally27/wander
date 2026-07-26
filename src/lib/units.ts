export type Unit = 'mi' | 'km'

const KM_TO_MI = 0.621371

/** All distances are stored in km internally; this only affects display. */
export function convertKm(km: number, unit: Unit): number {
  return unit === 'mi' ? km * KM_TO_MI : km
}

/** e.g. "2.4 mi" / "3.9 km" — one decimal place, the unit spelled out short. */
export function formatDistance(km: number, unit: Unit): string {
  const v = convertKm(km, unit)
  const rounded = Math.round(v * 10) / 10
  return `${rounded} ${unit}`
}

/** Just the number, for stat tiles that show the unit as a separate label. */
export function formatDistanceValue(km: number, unit: Unit): number {
  return Math.round(convertKm(km, unit) * 10) / 10
}

export function unitLabel(unit: Unit): string {
  return unit === 'mi' ? 'miles' : 'km'
}

const M_TO_FT = 3.28084

/** Elevation follows the same mi/km preference — feet alongside miles,
 *  metres alongside km, matching how hill heights are conventionally quoted
 *  in each system. e.g. "410 ft" / "125 m". */
export function formatElevation(m: number, unit: Unit): string {
  const v = unit === 'mi' ? m * M_TO_FT : m
  return `${Math.round(v)} ${unit === 'mi' ? 'ft' : 'm'}`
}
