import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AttendanceReviewTable } from './attendance-review-table'
import type { ReviewSession } from '../attendance.types'

const calls = vi.hoisted(() => ({
  read: vi.fn(),
  review: vi.fn(),
  correct: vi.fn(),
  history: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock('../attendance.functions', () => ({
  readTeamAttendance: calls.read,
  readCompanyAttendance: calls.read,
  decideAttendance: calls.review,
  amendAttendance: calls.correct,
  readAttendanceReviewHistory: calls.history,
}))
vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }))
vi.mock('sonner', () => ({
  toast: { success: calls.success, error: calls.error },
}))
function session(): ReviewSession {
  return {
    id: '019a4fb0-1234-7000-8000-123456789012',
    employeeId: '019a4fb0-1234-7000-8000-123456789013',
    employeeName: 'ანა',
    workDate: '2026-11-04',
    timezone: 'Asia/Tbilisi',
    startedAt: '2026-11-04T06:05:00.000Z',
    endedAt: '2026-11-04T15:30:00.000Z',
    originalStartedAt: '2026-11-04T06:05:00.000Z',
    originalEndedAt: '2026-11-04T15:30:00.000Z',
    expectedStartAt: '2026-11-04T06:00:00.000Z',
    expectedEndAt: '2026-11-04T15:00:00.000Z',
    revision: 1,
    reviewState: 'pending',
    approvedOutsideSeconds: 0,
    maxOpenHours: 16,
    canReview: true,
    isFirstOfDay: true,
    isLastOfDay: true,
  }
}
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <AttendanceReviewTable actorId="manager" />
    </QueryClientProvider>,
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  calls.read.mockResolvedValue({
    ok: true,
    value: {
      items: [session()],
      hasMore: false,
      serverNow: '2026-11-04T16:00:00.000Z',
    },
  })
  calls.history.mockResolvedValue({
    ok: true,
    value: { items: [], hasMore: false },
  })
})
describe('manager attendance workflow', () => {
  it('renders the company overview without approval or correction controls', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AttendanceReviewTable actorId="admin" company />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('ანა')).toBeVisible()
    expect(
      screen.queryByRole('columnheader', { name: 'მოქმედებები' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'განხილვა' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'შესწორება' }),
    ).not.toBeInTheDocument()
  })
  it('shows real deviations and respects read-only access', async () => {
    calls.read.mockResolvedValue({
      ok: true,
      value: {
        items: [{ ...session(), canReview: false }],
        hasMore: false,
        serverNow: '2026-11-04T16:00:00.000Z',
      },
    })
    mount()
    expect(await screen.findByText('ანა')).toBeVisible()
    expect(screen.getByText('განხილვის მოლოდინში')).toBeVisible()
    expect(screen.getByText('გვიან დაწყება 00:05')).toBeVisible()
    expect(screen.getByText('განრიგს გარეთ 00:30')).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'შესწორება' }),
    ).not.toBeInTheDocument()
  })
  it('validates the reason and keeps overtime approval separate from attendance approval', async () => {
    const user = userEvent.setup()
    calls.review.mockResolvedValue({ ok: true, value: { id: session().id } })
    mount()
    await user.click(await screen.findByRole('button', { name: 'განხილვა' }))
    const dialog = screen.getByRole('dialog')
    await user.click(
      within(dialog).getByRole('button', { name: 'გადაწყვეტილების შენახვა' }),
    )
    expect(calls.review).not.toHaveBeenCalled()
    expect(
      await within(dialog).findByText(
        'მიზეზი უნდა შეიცავდეს სულ მცირე 5 სიმბოლოს.',
      ),
    ).toBeVisible()
    await user.type(
      within(dialog).getByLabelText('გადაწყვეტილების მიზეზი'),
      'დრო გადამოწმებულია ხელმძღვანელის მიერ',
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'გადაწყვეტილების შენახვა' }),
    )
    await waitFor(() =>
      expect(calls.review).toHaveBeenCalledWith({
        data: {
          sessionId: session().id,
          revision: 1,
          decision: 'approve',
          approveOutside: false,
          reason: 'დრო გადამოწმებულია ხელმძღვანელის მიერ',
        },
      }),
    )
    expect(calls.success).toHaveBeenCalledOnce()
  })
  it('supports explicit rejection and prevents repeat actions or closing while saving', async () => {
    let complete: ((value: unknown) => void) | undefined
    calls.review.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve
        }),
    )
    const user = userEvent.setup()
    mount()
    await user.click(await screen.findByRole('button', { name: 'განხილვა' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('radio', { name: 'უარყოფა' }))
    await user.type(
      within(dialog).getByLabelText('გადაწყვეტილების მიზეზი'),
      'მითითებული დრო ვერ დადასტურდა',
    )
    const save = within(dialog).getByRole('button', {
      name: 'გადაწყვეტილების შენახვა',
    })
    await user.click(save)
    expect(save).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(dialog).toBeVisible()
    expect(calls.review).toHaveBeenCalledOnce()
    expect(calls.review.mock.calls[0][0].data.decision).toBe('reject')
    await act(async () => {
      complete?.({
        ok: false,
        message: 'ჩანაწერი შეიცვალა. განაახლეთ მონაცემები.',
      })
    })
    await waitFor(() => expect(save).toBeEnabled())
    expect(calls.error).toHaveBeenCalledExactlyOnceWith(
      'ჩანაწერი შეიცვალა. განაახლეთ მონაცემები.',
    )
  })
  it('validates correction dates and submits local times with the record revision and reason', async () => {
    const user = userEvent.setup()
    calls.correct.mockResolvedValue({ ok: true, value: { id: session().id } })
    mount()
    await user.click(await screen.findByRole('button', { name: 'შესწორება' }))
    const dialog = screen.getByRole('dialog')
    const end = within(dialog).getByLabelText('დასრულება')
    // user-event does not support entering datetime-local values.
    fireEvent.change(end, { target: { value: '2026-11-04T09:00' } })
    await user.type(
      within(dialog).getByLabelText('შესწორების მიზეზი'),
      'რეალური გასვლის დრო გადამოწმებულია',
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'შესწორების შენახვა' }),
    )
    expect(
      await within(dialog).findByText('დასრულება უნდა იყოს დაწყების შემდეგ.'),
    ).toBeVisible()
    expect(calls.correct).not.toHaveBeenCalled()
    fireEvent.change(end, { target: { value: '2026-11-04T19:00' } })
    await user.click(
      within(dialog).getByRole('button', { name: 'შესწორების შენახვა' }),
    )
    await waitFor(() =>
      expect(calls.correct).toHaveBeenCalledWith({
        data: {
          sessionId: session().id,
          revision: 1,
          start: '2026-11-04T10:05',
          end: '2026-11-04T19:00',
          reason: 'რეალური გასვლის დრო გადამოწმებულია',
        },
      }),
    )
  })
})
