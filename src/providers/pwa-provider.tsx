import type { ReactNode } from 'react'
import { usePwaBrowser } from '#/hooks/use-pwa-browser'
import { PwaContext } from '#/contexts/pwa-context'
import { PwaStatus } from '#/components/common/pwa-status'

export function PwaProvider({ children }: { children: ReactNode }) {
  const browser = usePwaBrowser()
  return (
    <PwaContext value={browser}>
      {children}
      <PwaStatus online={browser.online} />
    </PwaContext>
  )
}
