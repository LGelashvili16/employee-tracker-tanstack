import { createContext } from 'react'
import type { ReactNode } from 'react'

export type ModalOptions = {
  title: string
  description?: string
  size?: 'default' | 'wide'
}

export type ModalContextValue = {
  openModal: (content: ReactNode, options: ModalOptions) => void
  closeModal: () => void
}

export const ModalContext = createContext<ModalContextValue | null>(null)
