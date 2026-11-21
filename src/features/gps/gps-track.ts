type Coordinate = [longitude: number, latitude: number]
type TrackFix = {
  fixAt: Date
  valid: boolean
  longitude: number
  latitude: number
}

const maxGapMs = 5 * 60_000

export function buildGpsTrack(fixes: TrackFix[]) {
  const segments: Coordinate[][] = []
  let segment: Coordinate[] = []
  let previousTime: number | undefined

  // Break the route after an invalid fix or a long gap in reports.
  for (const fix of fixes) {
    const time = fix.fixAt.getTime()
    if (
      !fix.valid ||
      (previousTime !== undefined && time - previousTime > maxGapMs)
    ) {
      if (segment.length) segments.push(segment)
      segment = []
    }
    if (fix.valid) segment.push([fix.longitude, fix.latitude])
    previousTime = fix.valid ? time : undefined
  }
  if (segment.length) segments.push(segment)
  return segments
}
