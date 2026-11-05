import type { ReactNode } from 'react'
import { ModalProvider } from './modal-provider'
import { PwaProvider } from './pwa-provider'
import { Toaster } from '#/components/ui/sonner'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <PwaProvider>
      <ModalProvider>
        {children}
        <Toaster />
      </ModalProvider>
    </PwaProvider>
  )
}
