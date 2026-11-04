import { Toaster as Sonner } from 'sonner'
import type { CSSProperties } from 'react'

// CSS variables follow the existing root theme without introducing another theme provider.
const toasterStyle: CSSProperties & Record<`--${string}`, string> = {
  fontFamily: 'var(--font-sans)',
  '--normal-bg': 'var(--popover)',
  '--normal-text': 'var(--popover-foreground)',
  '--normal-border': 'var(--border)',
  '--success-bg': 'var(--badge-green)',
  '--success-text': 'var(--badge-green-foreground)',
  '--success-border': 'var(--badge-green-foreground)',
  '--error-bg': 'var(--badge-red)',
  '--error-text': 'var(--badge-red-foreground)',
  '--error-border': 'var(--badge-red-foreground)',
  '--warning-bg': 'var(--badge-yellow)',
  '--warning-text': 'var(--badge-yellow-foreground)',
  '--warning-border': 'var(--badge-yellow-foreground)',
  '--info-bg': 'var(--popover)',
  '--info-text': 'var(--popover-foreground)',
  '--info-border': 'var(--border)',
  '--border-radius': 'var(--radius)',
}

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
      style={toasterStyle}
      containerAriaLabel="შეტყობინებები"
      toastOptions={{ closeButtonAriaLabel: 'შეტყობინების დახურვა' }}
    />
  )
}
