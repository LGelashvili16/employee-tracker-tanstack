import { useContext } from 'react'
import { PwaContext } from '#/contexts/pwa-context'

export function usePwa() {
  const context = useContext(PwaContext)
  if (!context) throw new Error('PwaProvider is required')
  return context
}
