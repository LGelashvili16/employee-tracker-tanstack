import { useEffect, useState } from 'react'

/** The component is keyed by the server sample; performance.now avoids changes to the browser's wall clock. */
export function useElapsedSeconds(running: boolean) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!running) return
    // Synchronize the visible counter with an external monotonic browser timer, including throttled background tabs.
    const started = performance.now()
    const interval = window.setInterval(
      () => setElapsed(Math.floor((performance.now() - started) / 1000)),
      1000,
    )
    return () => window.clearInterval(interval)
  }, [running])
  return elapsed
}
