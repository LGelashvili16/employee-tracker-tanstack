import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PwaStatus } from './pwa-status'

const worker = vi.hoisted(() => ({
  updateAvailable: false,
  registrationFailed: false,
  applyUpdate: vi.fn(),
  dismissUpdate: vi.fn(),
  dismissRegistrationError: vi.fn(),
}))
vi.mock('#/hooks/use-service-worker', () => ({
  useServiceWorker: () => worker,
}))

beforeEach(() => {
  worker.updateAvailable = false
  worker.registrationFailed = false
  vi.clearAllMocks()
})

describe('PWA status and updates', () => {
  it('does not apply an update until the user chooses it', async () => {
    worker.updateAvailable = true
    worker.applyUpdate.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<PwaStatus online />)
    expect(screen.getByRole('status')).toHaveTextContent(
      'შეინახეთ ცვლილებები ყველა გახსნილ ჩანართში',
    )
    expect(worker.applyUpdate).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'მოგვიანებით' }))
    expect(worker.dismissUpdate).toHaveBeenCalledOnce()
    expect(worker.applyUpdate).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'განახლება' }))
    expect(worker.applyUpdate).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'განახლება' })).toBeDisabled()
  })

  it('explains the online-only boundary instead of offering an update offline', () => {
    worker.updateAvailable = true
    render(<PwaStatus online={false} />)
    expect(screen.getByRole('status')).toHaveTextContent(
      'ოფლაინ მოქმედებები მოგვიანებით ავტომატურად არ გაიგზავნება',
    )
    expect(
      screen.queryByRole('button', { name: 'განახლება' }),
    ).not.toBeInTheDocument()
    expect(worker.applyUpdate).not.toHaveBeenCalled()
  })

  it('lets a failed update be retried without exposing library errors', async () => {
    worker.updateAvailable = true
    worker.applyUpdate.mockRejectedValue(new Error('Worker error'))
    const user = userEvent.setup()
    render(<PwaStatus online />)
    await user.click(screen.getByRole('button', { name: 'განახლება' }))
    expect(
      await screen.findByText('განახლება ვერ მოხერხდა. სცადეთ ხელახლა.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'განახლება' })).toBeEnabled()
    expect(screen.queryByText('Worker error')).not.toBeInTheDocument()
  })
})
