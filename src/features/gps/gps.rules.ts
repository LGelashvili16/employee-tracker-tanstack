// A tracker normally reports every few minutes; an older fix is shown as stale.
export const gpsStaleAfterMs = 30 * 60_000

export function isGpsFixStale(fixAt: Date, now: number) {
  return now - fixAt.getTime() > gpsStaleAfterMs
}

export function formatGpsFixAge(fixAt: Date, now: number) {
  const minutes = Math.floor((now - fixAt.getTime()) / 60_000)
  if (minutes < 1) return 'ახლახან'
  if (minutes < 60) return `${minutes} წუთის წინ`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} საათის წინ`
  return `${Math.floor(hours / 24)} დღის წინ`
}
