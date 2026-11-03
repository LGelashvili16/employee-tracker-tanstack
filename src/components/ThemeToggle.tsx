import { useEffect, useState } from 'react'
import { IconDeviceDesktop, IconMoon, IconSun } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'

type ThemeMode = 'light' | 'dark' | 'auto'

const themeOptions = [
  { mode: 'light', label: 'Light', icon: IconSun },
  { mode: 'dark', label: 'Dark', icon: IconMoon },
  { mode: 'auto', label: 'System', icon: IconDeviceDesktop },
] as const

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'auto'
  }

  const stored = window.localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark' || stored === 'auto') {
    return stored
  }

  return 'auto'
}

function applyThemeMode(mode: ThemeMode) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolved = mode === 'auto' ? (prefersDark ? 'dark' : 'light') : mode

  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(resolved)

  if (mode === 'auto') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', mode)
  }

  document.documentElement.style.colorScheme = resolved
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('auto')

  useEffect(() => {
    const initialMode = getInitialMode()
    setMode(initialMode)
    applyThemeMode(initialMode)
  }, [])

  useEffect(() => {
    if (mode !== 'auto') {
      return
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeMode('auto')

    media.addEventListener('change', onChange)
    return () => {
      media.removeEventListener('change', onChange)
    }
  }, [mode])

  function selectMode(nextMode: ThemeMode) {
    setMode(nextMode)
    applyThemeMode(nextMode)
    window.localStorage.setItem('theme', nextMode)
  }

  return (
    <div
      role="group"
      aria-label="Color theme"
      className="inline-flex shrink-0 items-center gap-0.5 rounded-xl border border-border bg-muted/60 p-1"
    >
      {themeOptions.map(({ mode: option, label, icon: Icon }) => (
        <Button
          key={option}
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`${label} theme`}
          aria-pressed={mode === option}
          title={`${label} theme`}
          onClick={() => selectMode(option)}
          className="rounded-lg text-muted-foreground hover:text-foreground aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm"
        >
          <Icon className="size-4" stroke={1.75} aria-hidden="true" />
        </Button>
      ))}
    </div>
  )
}
