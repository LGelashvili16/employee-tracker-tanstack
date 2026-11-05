import { useEffect, useState } from 'react'

/** The component is keyed by the server sample; performance.now avoids changes to the browser's wall clock. */
export function useElapsedSeconds(
  running: boolean,
  startedAt?: number,
  onStart?: (startedAt: number) => void,
) {
  const [elapsed, setElapsed] = useState(() =>
    running && startedAt !== undefined
      ? Math.max(0, Math.floor((performance.now() - startedAt) / 1000))
      : 0,
  )
  useEffect(() => {
    if (!running) return
    // Synchronize the visible counter with an external monotonic browser timer, including throttled background tabs.
    const started = startedAt ?? performance.now()
    onStart?.(started)
    let timeout: number
    function tick() {
      const milliseconds = Math.max(0, performance.now() - started)
      setElapsed(Math.floor(milliseconds / 1000))
      // Align both displays to the sample's second boundaries, even when the modal opens mid-second.
      timeout = window.setTimeout(tick, 1000 - (milliseconds % 1000))
    }
    tick()
    return () => window.clearTimeout(timeout)
  }, [running, startedAt, onStart])
  return elapsed
}
