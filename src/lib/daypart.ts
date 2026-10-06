export type Daypart = 'morning' | 'afternoon' | 'evening' | 'night'

/** Local hour (0–23) → part of the day. */
export function daypartForHour(hour: number): Daypart {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

const LABELS: Record<Daypart, string> = {
  morning: 'This morning’s feature',
  afternoon: 'This afternoon’s feature',
  evening: 'This evening’s feature',
  night: 'Tonight’s feature',
}

export const featureLabel = (part: Daypart) => LABELS[part]
