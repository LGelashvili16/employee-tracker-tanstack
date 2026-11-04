import { createContext } from 'react'

export interface PwaContextValue {
  installed: boolean
  ios: boolean
  online: boolean
  requestInstall: (() => Promise<void>) | null
}

export const PwaContext = createContext<PwaContextValue | null>(null)
