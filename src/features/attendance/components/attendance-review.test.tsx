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
import { CompanyAttendanceSessionsTable } from './company-attendance-sessions-table'
import type { ReviewSession } from '../attendance.types'

const calls = vi.hoisted(() => ({
  review: vi.fn(),
  correct: vi.fn(),
  history: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock('../attendance.functions', () => ({
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
    canCorrect: true,
    isFirstOfDay: true,
    isLastOfDay: true,
  }
}
function mount(canReview = true, canCorrect = canReview) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <CompanyAttendanceSessionsTable
        rows={[
          {
            ...session(),
            canReview,
            canCorrect,
            date: session().workDate,
            serverNow: '2026-11-04T16:00:00.000Z',
          },
        ]}
      />
    </QueryClientProvider>,
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  calls.history.mockResolvedValue({
    ok: true,
    value: { items: [], hasMore: false },
  })
})
describe('manager attendance workflow', () => {
  it('shows correction controls without approval controls for company correctors', async () => {
    mount(false, true)
    expect(screen.getByRole('button', { name: 'შესწორება' })).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'განხილვა' }),
    ).not.toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'შესწორება' }))
    expect(
      screen.getByRole('dialog', { name: 'დროის შესწორება' }),
    ).toHaveAttribute('data-slot', 'sheet-content')
  })
  it('shows deviations without actions when the server does not authorize review', () => {
    mount(false)
    expect(screen.getByText('განხილვის მოლოდინში')).toBeVisible()
    expect(screen.getByText('გვიან დაწყება 00:05')).toBeVisible()
    expect(screen.getByText('განრიგს გარეთ 00:30')).toBeVisible()
    expect(
      screen.queryByRole('columnheader', { name: 'მოქმედებები' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'შესწორება' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'განხილვა' }),
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
    const end = within(dialog).getByLabelText(/^დასრულება/)
    fireEvent.change(end, { target: { value: '09:00' } })
    await user.type(
      within(dialog).getByLabelText(/^შესწორების მიზეზი/),
      'რეალური გასვლის დრო გადამოწმებულია',
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'შესწორების შენახვა' }),
    )
    expect(
      await within(dialog).findByText('დასრულება უნდა იყოს დაწყების შემდეგ.'),
    ).toBeVisible()
    expect(calls.correct).not.toHaveBeenCalled()
    fireEvent.change(end, { target: { value: '19:00' } })
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
  it('selects an overnight checkout with the Georgian shadcn calendar and preserves the work date', async () => {
    const user = userEvent.setup()
    calls.correct.mockResolvedValue({ ok: true, value: { id: session().id } })
    mount(false, true)
    await user.click(screen.getByRole('button', { name: 'შესწორება' }))
    const sheet = screen.getByRole('dialog', { name: 'დროის შესწორება' })
    expect(sheet).not.toHaveTextContent('შესწორება აუქმებს წინა დამტკიცებას.')
    await user.click(
      within(sheet).getByRole('button', { name: 'დაწყების თარიღი' }),
    )
    expect(
      screen.getByRole('button', { name: 'ხუთშაბათი, 5 ნოემბერი 2026' }),
    ).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(sheet).toBeVisible()
    await user.click(
      within(sheet).getByRole('button', { name: 'დასრულების თარიღი' }),
    )
    const nextDay = screen.getByRole('button', {
      name: 'ხუთშაბათი, 5 ნოემბერი 2026',
    })
    nextDay.focus()
    await user.keyboard('{Enter}')
    fireEvent.change(within(sheet).getByLabelText(/^დასრულება/), {
      target: { value: '09:00' },
    })
    await user.type(
      within(sheet).getByLabelText(/^შესწორების მიზეზი/),
      'ღამის ცვლის დასრულება შესწორდა',
    )
    await user.click(
      within(sheet).getByRole('button', { name: 'შესწორების შენახვა' }),
    )
    await waitFor(() =>
      expect(calls.correct).toHaveBeenCalledWith({
        data: expect.objectContaining({
          start: '2026-11-04T10:05',
          end: '2026-11-05T09:00',
        }),
      }),
    )
  })
  it('keeps the correction sheet open and disables edits while saving', async () => {
    let complete:
      ((value: { ok: true; value: { id: string } }) => void) | undefined
    calls.correct.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve
        }),
    )
    const user = userEvent.setup()
    mount(false, true)
    await user.click(screen.getByRole('button', { name: 'შესწორება' }))
    const sheet = screen.getByRole('dialog', { name: 'დროის შესწორება' })
    await user.type(
      within(sheet).getByLabelText(/^შესწორების მიზეზი/),
      'დასრულება გადამოწმებულია',
    )
    const save = within(sheet).getByRole('button', {
      name: 'შესწორების შენახვა',
    })
    await user.click(save)
    await waitFor(() => expect(save).toHaveAttribute('aria-busy', 'true'))
    expect(
      within(sheet).getByRole('button', { name: 'გაუქმება' }),
    ).toBeDisabled()
    expect(within(sheet).getByLabelText(/^დასრულება/)).toBeDisabled()
    expect(
      within(sheet).queryByRole('button', { name: 'დახურვა' }),
    ).not.toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(sheet).toBeVisible()
    await act(async () => complete?.({ ok: true, value: { id: session().id } }))
    await waitFor(() => expect(sheet).not.toBeInTheDocument())
    expect(calls.correct).toHaveBeenCalledOnce()
  })
})
