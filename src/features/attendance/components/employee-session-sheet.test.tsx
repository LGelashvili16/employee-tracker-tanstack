import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import { EmployeeSessionSheet } from './employee-session-sheet'

const api = vi.hoisted(() => ({ read: vi.fn() }))
vi.mock('../attendance.functions', () => ({
  readMyAttendanceSessions: api.read,
}))
beforeEach(() => vi.clearAllMocks())
it('stays mounted while closed, fetches on opening and does not fetch a different page while closing', async () => {
  api.read.mockResolvedValue({ ok: true, value: { items: [], hasMore: false } })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const view = (date?: string, page = 0) => (
    <QueryClientProvider client={client}>
      <EmployeeSessionSheet
        actorId="worker"
        date={date}
        page={page}
        onPageChange={vi.fn()}
        onClose={vi.fn()}
      />
    </QueryClientProvider>
  )
  const { rerender } = render(view())
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(api.read).not.toHaveBeenCalled()
  rerender(view('2026-11-09', 1))
  await screen.findByText('ამ დღეს სესიები არ არის.')
  expect(api.read).toHaveBeenCalledExactlyOnceWith({
    data: { date: '2026-11-09', page: 1 },
  })
  rerender(view())
  expect(api.read).toHaveBeenCalledOnce()
})
function mount() {
  const onClose = vi.fn()
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <EmployeeSessionSheet
        actorId="worker"
        date="2026-11-09"
        page={0}
        onPageChange={vi.fn()}
        onClose={onClose}
      />
    </QueryClientProvider>,
  )
  return onClose
}
it('distinguishes the exact corrected interval from other sessions with original and current seconds', async () => {
  const base = {
    timezone: 'Asia/Tbilisi',
    reviewState: 'pending',
    corrected: false,
    originalStartedAt: '2026-11-09T11:29:44.000Z',
    originalEndedAt: '2026-11-09T12:35:57.000Z',
  }
  api.read.mockResolvedValue({
    ok: true,
    value: {
      hasMore: false,
      serverNow: '2026-11-12T10:00:00Z',
      items: [
        {
          ...base,
          id: 'second',
          startedAt: '2026-11-09T12:38:00.000Z',
          endedAt: '2026-11-09T12:38:02.000Z',
        },
        {
          ...base,
          id: 'first',
          startedAt: base.originalStartedAt,
          endedAt: '2026-11-09T12:30:00.000Z',
          corrected: true,
        },
      ],
    },
  })
  const close = mount()
  const corrected = await screen.findByText('შესწორებულია')
  const card = corrected.closest('[data-slot="card"]')!
  expect(within(card as HTMLElement).getByText(/16:30:00/)).toBeVisible()
  expect(
    within(card as HTMLElement).getByText(/თავდაპირველად:.*16:35:57/),
  ).toBeVisible()
  expect(within(card as HTMLElement).getByText(/15:29:44/)).toBeVisible()
  expect(screen.getByText(/16:38:02/)).toBeVisible()
  expect(screen.getAllByText('შესწორებულია')).toHaveLength(1)
  expect(screen.queryByText('Asia/Tbilisi')).not.toBeInTheDocument()
  expect(api.read).toHaveBeenCalledWith({
    data: { date: '2026-11-09', page: 0 },
  })
  await userEvent.setup().keyboard('{Escape}')
  expect(close).toHaveBeenCalled()
})
it('shows a safe failure without leaking database details', async () => {
  api.read.mockRejectedValue(new Error('private sql details'))
  mount()
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'სესიები ვერ ჩაიტვირთა.',
  )
  expect(screen.queryByText('private sql details')).not.toBeInTheDocument()
})
