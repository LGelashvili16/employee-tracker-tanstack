import { useCallback, useMemo, useRef, useState } from 'react'
import { cn } from 'cn'
import type { ReactNode } from 'react'
import type { ModalOptions } from '#/contexts/modal-context'
import { ModalContext } from '#/contexts/modal-context'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'

type ModalState = {
  id: number
  isOpen: boolean
  content: ReactNode
  options: ModalOptions
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalState | null>(null)
  const nextId = useRef(0)

  const openModal = useCallback((content: ReactNode, options: ModalOptions) => {
    nextId.current += 1
    setModal({ id: nextId.current, isOpen: true, content, options })
  }, [])

  const closeModal = useCallback(() => {
    setModal((current) =>
      current?.isOpen ? { ...current, isOpen: false } : current,
    )
  }, [])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) closeModal()
    },
    [closeModal],
  )

  const handleOpenChangeComplete = useCallback((open: boolean) => {
    if (open) return
    // Keep content through the exit animation; a rapid reopen must survive cleanup.
    setModal((current) => (current?.isOpen ? current : null))
  }, [])

  // Callers subscribe only to stable actions, not every dialog state change.
  const actions = useMemo(
    () => ({ openModal, closeModal }),
    [openModal, closeModal],
  )

  return (
    <ModalContext value={actions}>
      {children}
      <Dialog
        open={modal?.isOpen ?? false}
        onOpenChange={handleOpenChange}
        onOpenChangeComplete={handleOpenChangeComplete}
      >
        <DialogContent
          className={cn(
            'max-h-[90svh] overflow-y-auto motion-reduce:animate-none',
            modal?.options.size === 'wide' ? 'sm:max-w-6xl' : 'sm:max-w-lg',
          )}
        >
          {modal ? (
            <div key={modal.id} className="flex min-w-0 flex-col gap-4">
              <DialogHeader className="pr-8">
                <DialogTitle>{modal.options.title}</DialogTitle>
                {modal.options.description ? (
                  <DialogDescription>
                    {modal.options.description}
                  </DialogDescription>
                ) : null}
              </DialogHeader>
              {modal.content}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </ModalContext>
  )
}
