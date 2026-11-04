import type { ReactNode } from 'react'
import { ModalProvider } from './modal-provider'
import { PwaProvider } from './pwa-provider'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <PwaProvider>
      <ModalProvider>{children}</ModalProvider>
    </PwaProvider>
  )
}
