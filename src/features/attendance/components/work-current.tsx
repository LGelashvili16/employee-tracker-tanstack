import type { CSSProperties } from 'react'
import './work-current.css'

// Fixed positions and negative delays keep SSR deterministic and the flow continuous.
const particles = [
  [12, 7.8, -2.1, 2],
  [28, 6.4, -5.3, 2.5],
  [79, 8.6, -4.2, 2],
  [89, 7.2, -0.8, 2.5],
  [18, 9.1, -6.7, 3],
  [68, 6.9, -3.4, 2],
  [38, 8.3, -7.5, 2],
  [85, 9.6, -8.2, 3],
  [9, 8.1, -5.6, 2],
  [72, 7.4, -1.7, 2.5],
  [24, 9.4, -3.8, 2],
  [92, 6.7, -4.9, 2],
] as const

export function WorkCurrent() {
  return (
    <span className="work-current" aria-hidden="true">
      <span className="work-current__wash" />
      {particles.map(([top, duration, delay, size], index) => (
        <span
          key={index}
          className="work-current__particle"
          style={
            {
              top: `${top}%`,
              '--particle-size': `${size}px`,
              '--drift-duration': `${duration}s`,
              '--drift-delay': `${delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  )
}
