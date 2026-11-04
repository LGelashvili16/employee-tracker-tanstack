import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Button } from '#/components/ui/button'
import { useModal } from '#/hooks/use-modal'
import { ModalProvider } from './modal-provider'

function DialogBody({ children }: { children?: ReactNode }) {
  const [count, setCount] = useState(0)
  const { openModal, closeModal } = useModal()

  return (
    <>
      {children}
      <p>რაოდენობა: {count}</p>
      <Button onClick={() => setCount((current) => current + 1)}>გაზრდა</Button>
      <Button
        onClick={() => openModal(<DialogBody />, { title: 'ახალი ფანჯარა' })}
      >
        ჩანაცვლება
      </Button>
      <Button
        onClick={() => {
          closeModal()
          openModal(<DialogBody />, { title: 'ხელახლა გახსნილი ფანჯარა' })
        }}
      >
        ხელახლა გახსნა
      </Button>
      <Button onClick={closeModal}>დასრულება</Button>
    </>
  )
}

function NestedOpener() {
  const { openModal } = useModal()
  return (
    <Button
      onClick={() =>
        openModal(
          <DialogBody>
            <p>კომპონენტის შიგთავსი</p>
          </DialogBody>,
          {
            title: 'დახმარება',
            description: 'სამუშაო სივრცის გამოყენება',
            size: 'wide',
          },
        )
      }
    >
      გახსნა
    </Button>
  )
}

function Harness() {
  return (
    <ModalProvider>
      <section>
        <NestedOpener />
      </section>
    </ModalProvider>
  )
}

describe('global dialog', () => {
  it('opens from a nested caller with an accessible title and description', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'გახსნა' }))
    const dialog = await screen.findByRole('dialog', { name: 'დახმარება' })
    expect(dialog).toHaveAccessibleDescription('სამუშაო სივრცის გამოყენება')
    expect(within(dialog).getByText('კომპონენტის შიგთავსი')).toBeVisible()
    expect(
      within(dialog).getByRole('button', { name: 'დახურვა' }),
    ).toBeVisible()
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it('dismisses with Escape and returns focus to the opener', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'გახსნა' })
    await user.click(opener)
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    await waitFor(() => expect(opener).toHaveFocus())
  })

  it('dismisses with the Georgian close button and with the hook inside the body', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'გახსნა' }))
    await user.click(await screen.findByRole('button', { name: 'დახურვა' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: 'გახსნა' }))
    await user.click(await screen.findByRole('button', { name: 'დასრულება' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  })

  it('replaces an open dialog and resets the previous body state and description', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'გახსნა' }))
    await user.click(await screen.findByRole('button', { name: 'გაზრდა' }))
    expect(screen.getByText('რაოდენობა: 1')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'ჩანაცვლება' }))

    const dialog = await screen.findByRole('dialog', { name: 'ახალი ფანჯარა' })
    expect(within(dialog).getByText('რაოდენობა: 0')).toBeVisible()
    expect(dialog).not.toHaveAccessibleDescription()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })

  it('keeps rapidly reopened content and starts fresh after a completed close', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'გახსნა' }))
    await user.click(
      await screen.findByRole('button', { name: 'ხელახლა გახსნა' }),
    )
    expect(
      await screen.findByRole('dialog', { name: 'ხელახლა გახსნილი ფანჯარა' }),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'გაზრდა' }))
    await user.click(screen.getByRole('button', { name: 'დასრულება' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    await user.click(screen.getByRole('button', { name: 'გახსნა' }))
    expect(await screen.findByText('რაოდენობა: 0')).toBeVisible()
  })

  it('reports a missing provider', () => {
    expect(() => renderHook(() => useModal())).toThrow(
      'useModal requires ModalProvider',
    )
  })
})
