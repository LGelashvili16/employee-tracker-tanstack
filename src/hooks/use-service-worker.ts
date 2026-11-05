import { useEffect, useRef, useState } from 'react'

export function useServiceWorker() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registrationFailed, setRegistrationFailed] = useState(false)
  const updateRef = useRef<(() => Promise<void>) | null>(null)

  // Register only after hydration and check the browser worker when the app resumes.
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
    let disposed = false
    let registration: ServiceWorkerRegistration | undefined
    let lastCheck = 0

    const checkForUpdate = () => {
      if (
        document.hidden ||
        !navigator.onLine ||
        Date.now() - lastCheck < 60_000
      )
        return
      lastCheck = Date.now()
      // A failed background check leaves the current app usable and retries on resume.
      void registration?.update().catch(() => {})
    }

    void import('virtual:pwa-register')
      .then(({ registerSW }) => {
        if (disposed) return
        updateRef.current = registerSW({
          immediate: true,
          onNeedRefresh() {
            if (!disposed) setUpdateAvailable(true)
          },
          onRegisterError() {
            if (!disposed) setRegistrationFailed(true)
          },
          onRegisteredSW(_url, nextRegistration) {
            registration = nextRegistration
          },
        })
      })
      .catch(() => {
        if (!disposed) setRegistrationFailed(true)
      })

    window.addEventListener('focus', checkForUpdate)
    window.addEventListener('online', checkForUpdate)
    document.addEventListener('visibilitychange', checkForUpdate)
    return () => {
      disposed = true
      updateRef.current = null
      window.removeEventListener('focus', checkForUpdate)
      window.removeEventListener('online', checkForUpdate)
      document.removeEventListener('visibilitychange', checkForUpdate)
    }
  }, [])

  async function applyUpdate() {
    if (!updateRef.current) throw new Error('Service worker is unavailable')
    await updateRef.current()
  }

  return {
    updateAvailable,
    registrationFailed,
    applyUpdate,
    dismissUpdate: () => setUpdateAvailable(false),
    dismissRegistrationError: () => setRegistrationFailed(false),
  }
}
