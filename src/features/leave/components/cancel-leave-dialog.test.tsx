import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LeaveTable } from './leave-table'
import type { LeaveItem } from '../leave.types'

const mocks = vi.hoisted(() => ({
  cancel: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }))
vi.mock('../leave.functions', () => ({ withdrawLeave: mocks.cancel }))
vi.mock('sonner', () => ({
  toast: { success: mocks.success, error: mocks.error },
}))
afterEach(() => vi.resetAllMocks())
const item: LeaveItem = {
  id: '019a5e78-e000-7000-8000-000000000001',
  requesterId: 'worker',
  image: null,
  name: 'ანა',
  kind: 'day_off',
  startDate: '2026-11-10',
  endDate: '2026-11-10',
  note: '',
  status: 'pending',
  canCancel: true,
  revision: 0,
  reviewReason: '',
  reviewerName: null,
  createdAt: '2026-11-09T12:00:00Z',
}
function setup(value = item, review = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  render(
    <QueryClientProvider client={client}>
      <LeaveTable
        items={[value]}
        actorId="worker"
        review={review}
        onReview={vi.fn()}
      />
    </QueryClientProvider>,
  )
  return { user: userEvent.setup(), invalidate }
}
describe('employee request cancellation', () => {
  it('asks for confirmation and reports one confirmed cancellation while preventing repeats', async () => {
    let finish: (value: unknown) => void = () => {}
    mocks.cancel.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const { user, invalidate } = setup()
    await user.click(screen.getByRole('button', { name: 'გაუქმება' }))
    expect(
      await screen.findByRole('dialog', { name: 'მოთხოვნის გაუქმება' }),
    ).toBeVisible()
    expect(
      screen.getByText(/10 ნოემბერი 2026.*გაუქმებული მოთხოვნა აღარ განიხილება/),
    ).toBeVisible()
    expect(mocks.cancel).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'მოთხოვნის გაუქმება' }))
    expect(
      screen.getByRole('button', { name: 'მოთხოვნის გაუქმება' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'მოთხოვნის გაუქმება' }),
    ).toHaveAttribute('aria-busy', 'true')
    finish({ ok: true, value: { id: item.id } })
    await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce())
    expect(mocks.cancel).toHaveBeenCalledExactlyOnceWith({
      data: { id: item.id, revision: 0 },
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['leave'] })
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  })
  it('retains a safe conflict message when a reviewer acts first', async () => {
    mocks.cancel.mockResolvedValue({
      ok: false,
      message: 'მოთხოვნა უკვე განხილულია. განაახლეთ სია.',
    })
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'გაუქმება' }))
    await user.click(
      await screen.findByRole('button', { name: 'მოთხოვნის გაუქმება' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'მოთხოვნა უკვე განხილულია. განაახლეთ სია.',
    )
    expect(mocks.error).toHaveBeenCalledOnce()
    expect(mocks.success).not.toHaveBeenCalled()
  })
  it.each([
    { ...item, canCancel: false },
    { ...item, status: 'approved' as const, canCancel: false },
    { ...item, status: 'cancelled' as const, canCancel: false },
    { ...item, requesterId: 'another-worker' },
  ])(
    'hides cancellation for reviewed or out-of-scope requests: %j',
    (value) => {
      setup(value)
      expect(
        screen.queryByRole('button', { name: 'გაუქმება' }),
      ).not.toBeInTheDocument()
    },
  )
  it('keeps the request unchanged when confirmation is dismissed', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'გაუქმება' }))
    await user.click(await screen.findByRole('button', { name: 'დატოვება' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(mocks.cancel).not.toHaveBeenCalled()
  })
})
