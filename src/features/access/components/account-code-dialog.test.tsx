import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AccountCodeDialog } from './account-code-dialog'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const issued = {
  code: 'ABCDEFGH2345',
  expiresAt: '2026-11-06T10:00:00Z',
  purpose: 'activation',
} as const

describe('account code dialog', () => {
  it('shows the grouped code and copies it', async () => {
    const user = userEvent.setup()
    render(<AccountCodeDialog value={issued} onClose={vi.fn()} />)
    expect(screen.getByText('ABCD-EFGH-2345')).toBeInTheDocument()
    expect(screen.getByText('ვადა: 24 საათი')).toBeInTheDocument()
    expect(
      screen.getByText(/გაუქმდება: \d+ ნოემბერი, \d{2}:\d{2}/),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'კოდის კოპირება' }))
    expect(
      await screen.findByRole('button', { name: 'დაკოპირდა' }),
    ).toBeVisible()
    await expect(navigator.clipboard.readText()).resolves.toBe('ABCD-EFGH-2345')
  })

  it('closes from the close button', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<AccountCodeDialog value={issued} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'დახურვა' }))
    expect(onClose).toHaveBeenCalled()
  })
})
