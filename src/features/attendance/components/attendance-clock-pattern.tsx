import { useId } from 'react'

export function AttendanceClockPattern() {
  const patternId = useId()
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-0 size-full text-foreground/[0.14] [mask-image:radial-gradient(ellipse_at_center,transparent_12%,black_85%)]"
    >
      <defs>
        <pattern
          id={patternId}
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2" cy="2" r="1.15" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  )
}
