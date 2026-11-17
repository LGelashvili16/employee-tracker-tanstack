import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { registerAutomaticAttendanceDevice } from '../attendance-security.functions'

// Identification does not request HR activation. Strict Mode reuses the in-flight POST
// so simultaneous first requests cannot issue different browser cookies.
export function AutomaticDeviceRegistration({
  children,
  fallback,
}: {
  children: ReactNode
  fallback: ReactNode
}) {
  const pending = useRef<ReturnType<
    typeof registerAutomaticAttendanceDevice
  > | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let mounted = true
    const timeout = setTimeout(() => {
      if (mounted) setReady(true)
    }, 10000)
    pending.current ??= registerAutomaticAttendanceDevice()
    void pending.current
      .catch(() => null)
      .then(() => {
        clearTimeout(timeout)
        if (mounted) setReady(true)
      })
    return () => {
      mounted = false
      clearTimeout(timeout)
    }
  }, [])
  // Registration failure must not lock employees out of the rest of the app.
  // Clock actions still enforce the current device and network policy server-side.
  return ready ? children : fallback
}
