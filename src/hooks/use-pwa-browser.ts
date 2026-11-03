import { useEffect, useState } from 'react'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isInstallPrompt(event: Event): event is InstallPromptEvent {
  return (
    'prompt' in event &&
    typeof event.prompt === 'function' &&
    'userChoice' in event
  )
}

export function usePwaBrowser() {
  const [online, setOnline] = useState(true)
  const [installed, setInstalled] = useState(false)
  const [ios, setIos] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null,
  )

  // Browser installation state and connectivity are external subscriptions.
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)')
    const syncInstalled = () => {
      setInstalled(
        standalone.matches ||
          ('standalone' in navigator && navigator.standalone === true),
      )
    }
    const syncOnline = () => setOnline(navigator.onLine)
    const handleInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
    }
    const handleInstallPrompt = (event: Event) => {
      if (!isInstallPrompt(event)) return
      event.preventDefault()
      setInstallPrompt(event)
    }
    setIos(
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    )
    syncInstalled()
    syncOnline()
    standalone.addEventListener('change', syncInstalled)
    window.addEventListener('online', syncOnline)
    window.addEventListener('offline', syncOnline)
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      standalone.removeEventListener('change', syncInstalled)
      window.removeEventListener('online', syncOnline)
      window.removeEventListener('offline', syncOnline)
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  async function requestInstall() {
    if (!installPrompt) return
    try {
      // Keep this call in the click gesture; browsers reject unsolicited prompts.
      await installPrompt.prompt()
      await installPrompt.userChoice
    } finally {
      // A browser install prompt can be consumed only once, including dismissal.
      setInstallPrompt(null)
    }
  }

  return {
    online,
    installed,
    ios,
    requestInstall: installPrompt ? requestInstall : null,
  }
}
