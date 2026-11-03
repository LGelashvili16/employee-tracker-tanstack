import { createContext, useContext } from 'react'

export interface PwaContextValue {
  installed: boolean
  ios: boolean
  online: boolean
  requestInstall: (() => Promise<void>) | null
}

export const PwaContext = createContext<PwaContextValue | null>(null)

export function usePwa() {
  const context = useContext(PwaContext)
  if (!context) throw new Error('PwaProvider is required')
  return context
}
