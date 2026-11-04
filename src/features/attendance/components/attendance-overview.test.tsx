import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AttendanceOverview } from './attendance-overview'
import { ClockTimer } from './attendance-clock'
import { FinishWorkConfirmation } from './finish-work-confirmation'
import { ModalProvider } from '#/providers/modal-provider'
import {
  attendanceStatus,
  formatAttendanceDate,
} from '../attendance.presentation'
import type { AttendanceOverview as Overview } from '../attendance.types'
import type { ReactNode } from 'react'

const calls = vi.hoisted(() => ({
  read: vi.fn(),
  start: vi.fn(),
  finish: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock('../attendance.functions', () => ({
  readMyAttendance: calls.read,
  startMyWork: calls.start,
  finishMyWork: calls.finish,
}))
vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }))
vi.mock('sonner', () => ({
  toast: { success: calls.success, error: calls.error },
}))
vi.mock('@number-flow/react', () => ({
  default: ({ value }: { value: number }) => <span>{value}</span>,
}))
vi.mock('motion/react', () => ({
  useReducedMotion: () => true,
  MotionConfig: ({ children }: { children: ReactNode }) => children,
  motion: {
    div: ({
      children,
      className,
    }: {
      children: ReactNode
      className: string
    }) => <div className={className}>{children}</div>,
  },
}))

const sessionId = '019a4fb0-1234-7000-8000-123456789012'
function overview(): Overview {
  return {
    serverNow: '2026-11-04T07:00:00.000Z',
    workday: {
      date: '2026-11-04',
      timezone: 'Asia/Tbilisi',
      kind: 'scheduled',
      effectiveFrom: '2026-11-01',
      start: '10:00',
      end: '19:00',
      startsAt: '2026-11-04T06:00:00.000Z',
      endsAt: '2026-11-04T15:00:00.000Z',
    },
    openSession: null,
    lastSessionId: null,
    today: null,
    recent: [],
    week: { seconds: 0, days: 0, lateSeconds: 0 },
  }
}
function working(): Overview {
  const initial = overview()
  const day = {
    date: initial.workday.date,
    timezone: 'Asia/Tbilisi',
    firstIn: '2026-11-04T06:00:00.000Z',
    lastOut: null,
    seconds: 3600,
    lateSeconds: 0,
    earlySeconds: 0,
    earlyStartSeconds: 0,
    outsideSeconds: 0,
    approvedOutsideSeconds: 0,
    pendingReviews: 0,
    rejectedReviews: 0,
    requiresReview: false,
    corrected: false,
    incomplete: true,
  }
  return {
    ...initial,
    openSession: {
      id: sessionId,
      workDate: day.date,
      timezone: day.timezone,
      startedAt: day.firstIn,
      endedAt: null,
      expectedEndAt: '2026-11-04T15:00:00.000Z',
      expectedStartAt: '2026-11-04T06:00:00.000Z',
      maxOpenHours: 16,
    },
    lastSessionId: sessionId,
    today: day,
    recent: [day],
    week: { seconds: 3600, days: 1, lateSeconds: 0 },
  }
}
beforeEach(() => {
  vi.clearAllMocks()
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('persisted attendance dashboard', () => {
  it.each([true, false])(
    'hides internal pending-review status on employee screens while running=%s',
    async (running) => {
      const state = working()
      if (!state.today) throw new Error('Missing working fixture')
      state.today.pendingReviews = 1
      state.today.incomplete = running
      if (!running) state.openSession = null
      calls.read.mockResolvedValue({ ok: true, value: state })
      render(
        <ModalProvider>
          <AttendanceOverview actorId="employee" />
        </ModalProvider>,
      )
      await screen.findByRole('button', {
        name: running ? 'სამუშაოს დასრულება' : 'სამუშაოს დაწყება',
      })
      expect(screen.queryByText('განხილვის მოლოდინში')).not.toBeInTheDocument()
      expect(screen.getAllByText('8 საათზე ნაკლები').length).toBeGreaterThan(0)
    },
  )
  it('uses Georgian calendar dates and distinguishes attendance states', () => {
    expect(formatAttendanceDate('2026-11-04')).toBe('4 ნოემბერი 2026')
    expect(attendanceStatus(overview())).toEqual({
      label: 'არ დაწყებულა',
      variant: 'yellow',
    })
    expect(attendanceStatus(working())).toEqual({
      label: 'მუშაობთ',
      variant: 'green',
    })
    const active = working()
    expect(
      attendanceStatus({
        ...active,
        openSession: active.openSession
          ? { ...active.openSession, workDate: '2026-11-03' }
          : null,
      }),
    ).toEqual({ label: 'წინა დღეს დაწყებული', variant: 'secondary' })
    for (const [lateSeconds, earlySeconds, variant] of [
      [0, 0, 'green'],
      [60, 0, 'orange'],
      [0, 60, 'yellow'],
      [60, 60, 'orange'],
    ] as const) {
      expect(
        attendanceStatus({
          ...active,
          openSession: null,
          today: active.today
            ? { ...active.today, incomplete: false, lateSeconds, earlySeconds }
            : null,
        }),
      ).toEqual({ label: 'დასრულებულია', variant })
    }
    const initial = overview()
    expect(
      attendanceStatus({
        ...initial,
        workday: { ...initial.workday, kind: 'unconfigured' },
      }),
    ).toEqual({ label: 'განრიგი არ არის', variant: 'orange' })
    expect(
      attendanceStatus({
        ...initial,
        workday: { ...initial.workday, kind: 'day_off' },
      }),
    ).toEqual({ label: 'დასვენების დღე', variant: 'secondary' })
  })
  it('shows a Georgian loading state without offering actions', () => {
    calls.read.mockReturnValue(new Promise(() => {}))
    render(
      <ModalProvider>
        <AttendanceOverview actorId="employee" />
      </ModalProvider>,
    )
    expect(
      screen.getByRole('status', { name: 'დასწრება იტვირთება' }),
    ).toHaveAttribute('aria-busy', 'true')
    expect(
      screen.queryByRole('button', { name: 'სამუშაოს დაწყება' }),
    ).not.toBeInTheDocument()
  })
  it('disables check-in without a configured schedule and does not fabricate history', async () => {
    const initial = overview()
    calls.read.mockResolvedValue({
      ok: true,
      value: {
        ...initial,
        workday: { ...initial.workday, kind: 'unconfigured' },
      },
    })
    render(
      <ModalProvider>
        <AttendanceOverview actorId="employee" />
      </ModalProvider>,
    )
    expect(
      await screen.findByRole('button', { name: 'სამუშაოს დაწყება' }),
    ).toBeDisabled()
    expect(screen.getByText('დასწრების ჩანაწერები ჯერ არ არის.')).toBeVisible()
  })
  it('refetches the persisted server state after check-in and shows a success toast', async () => {
    let state = overview()
    calls.read.mockImplementation(async () => ({ ok: true, value: state }))
    calls.start.mockImplementation(async () => {
      state = working()
      return { ok: true, value: { id: sessionId } }
    })
    const user = userEvent.setup()
    render(
      <ModalProvider>
        <AttendanceOverview actorId="employee" />
      </ModalProvider>,
    )
    await user.click(
      await screen.findByRole('button', { name: 'სამუშაოს დაწყება' }),
    )
    await screen.findByRole('button', { name: 'სამუშაოს დასრულება' })
    await waitFor(() =>
      expect(calls.success).toHaveBeenCalledExactlyOnceWith(
        'სამუშაოს დაწყება დაფიქსირდა.',
      ),
    )
    expect(calls.start.mock.calls[0][0].data.expectedLastSessionId).toBeNull()
    expect(calls.start.mock.calls[0][0].data).not.toHaveProperty('employeeId')
    expect(
      screen.getByRole('timer', { name: 'ნამუშევარი დრო' }),
    ).toHaveTextContent('01:00:00')
  })
  it('prevents repeat submission and keeps the clock stopped until the server confirms check-in', async () => {
    calls.read.mockResolvedValue({ ok: true, value: overview() })
    let complete: ((value: unknown) => void) | undefined
    calls.start.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve
        }),
    )
    const user = userEvent.setup()
    render(
      <ModalProvider>
        <AttendanceOverview actorId="employee" />
      </ModalProvider>,
    )
    const button = await screen.findByRole('button', {
      name: 'სამუშაოს დაწყება',
    })
    await user.click(button)
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    await user.click(button)
    expect(calls.start).toHaveBeenCalledOnce()
    expect(calls.success).not.toHaveBeenCalled()
    expect(
      screen.getByRole('timer', { name: 'ნამუშევარი დრო' }),
    ).toHaveTextContent('00:00:00')
    complete?.({ ok: false, message: 'შესვლა ვერ დაფიქსირდა.' })
    await waitFor(() =>
      expect(calls.error).toHaveBeenCalledExactlyOnceWith(
        'შესვლა ვერ დაფიქსირდა.',
      ),
    )
  })
  it('recovers the elapsed time on a fresh load and confirms an early check-out', async () => {
    let state = working()
    calls.read.mockImplementation(async () => ({ ok: true, value: state }))
    calls.finish.mockImplementation(async () => {
      state = { ...state, openSession: null }
      return { ok: true, value: { id: sessionId } }
    })
    const user = userEvent.setup()
    render(
      <ModalProvider>
        <AttendanceOverview actorId="employee" />
      </ModalProvider>,
    )
    await user.click(
      await screen.findByRole('button', { name: 'სამუშაოს დასრულება' }),
    )
    expect(calls.finish).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('08:00')).toBeVisible()
    await user.click(within(dialog).getByRole('button', { name: 'დასრულება' }))
    await waitFor(() =>
      expect(calls.finish).toHaveBeenCalledWith({
        data: { sessionId, confirmEarly: true },
      }),
    )
    await waitFor(() =>
      expect(calls.success).toHaveBeenCalledExactlyOnceWith(
        'სამუშაოს დასრულება დაფიქსირდა.',
      ),
    )
  })
  it('leaves the timer running after a rejected check-out and reports one safe error', async () => {
    const state = working()
    calls.read.mockResolvedValue({ ok: true, value: state })
    calls.finish.mockResolvedValue({
      ok: false,
      message: 'გასვლა ვერ დაფიქსირდა.',
    })
    const user = userEvent.setup()
    render(
      <ModalProvider>
        <AttendanceOverview actorId="employee" />
      </ModalProvider>,
    )
    await user.click(
      await screen.findByRole('button', { name: 'სამუშაოს დასრულება' }),
    )
    await user.click(screen.getByRole('button', { name: 'დასრულება' }))
    await waitFor(() =>
      expect(calls.error).toHaveBeenCalledExactlyOnceWith(
        'გასვლა ვერ დაფიქსირდა.',
      ),
    )
    expect(calls.success).not.toHaveBeenCalled()
    expect(
      screen.getByRole('timer', { name: 'ნამუშევარი დრო' }),
    ).toHaveTextContent('01:00:00')
  })
  it.each([1, 9])(
    'confirms checkout after 19:00 with %s elapsed hours',
    async (hours) => {
      const state = working()
      state.serverNow = '2026-11-04T20:00:00.000Z'
      if (!state.today || !state.openSession)
        throw new Error('Missing working fixture')
      state.today.seconds = hours * 3600
      state.today.firstIn = new Date(
        Date.parse(state.serverNow) - hours * 3600000,
      ).toISOString()
      state.openSession.startedAt = state.today.firstIn
      calls.read.mockResolvedValue({ ok: true, value: state })
      const user = userEvent.setup()
      render(
        <ModalProvider>
          <AttendanceOverview actorId="employee" />
        </ModalProvider>,
      )
      await user.click(
        await screen.findByRole('button', { name: 'სამუშაოს დასრულება' }),
      )
      expect(calls.finish).not.toHaveBeenCalled()
      const dialog = screen.getByRole('dialog', { name: 'სამუშაოს დასრულება' })
      expect(within(dialog).getByText('დღეს აღრიცხული დრო')).toBeVisible()
      expect(within(dialog).getByText(`0${hours}:00:00`)).toBeVisible()
      expect(
        within(dialog).queryByText('გასვლა აღირიცხება ადრე დასრულებად.'),
      ).not.toBeInTheDocument()
      await user.click(within(dialog).getByRole('button', { name: 'გაუქმება' }))
      expect(calls.finish).not.toHaveBeenCalled()
    },
  )
  it('keeps the shared confirmation open and prevents repeat checkout while saving', async () => {
    calls.read.mockResolvedValue({ ok: true, value: working() })
    let complete: ((value: unknown) => void) | undefined
    calls.finish.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve
        }),
    )
    const user = userEvent.setup()
    render(
      <ModalProvider>
        <AttendanceOverview actorId="employee" />
      </ModalProvider>,
    )
    await user.click(
      await screen.findByRole('button', { name: 'სამუშაოს დასრულება' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'სამუშაოს დასრულება' })
    const confirm = within(dialog).getByRole('button', { name: 'დასრულება' })
    await user.click(confirm)
    expect(confirm).toBeDisabled()
    expect(confirm).toHaveAttribute('aria-busy', 'true')
    expect(
      within(dialog).getByRole('button', { name: 'გაუქმება' }),
    ).toBeDisabled()
    await user.keyboard('{Escape}')
    await user.click(within(dialog).getByRole('button', { name: 'დახურვა' }))
    expect(screen.getByRole('dialog')).toBeVisible()
    await user.click(confirm)
    expect(calls.finish).toHaveBeenCalledOnce()
    complete?.({ ok: false, message: 'გასვლა ვერ დაფიქსირდა.' })
    await waitFor(() => expect(confirm).toBeEnabled())
    await user.click(within(dialog).getByRole('button', { name: 'გაუქმება' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  })
  it('marks an unresolved previous-day session and asks before closing it at the current time', async () => {
    const state = working()
    state.serverNow = '2026-11-05T07:00:00.000Z'
    state.workday = { ...state.workday, date: '2026-11-05' }
    state.today = null
    state.recent = state.recent.map((day) => ({
      ...day,
      seconds: 25 * 3600,
      requiresReview: true,
    }))
    calls.read.mockResolvedValue({ ok: true, value: state })
    const user = userEvent.setup()
    render(
      <ModalProvider>
        <AttendanceOverview actorId="employee" />
      </ModalProvider>,
    )
    const finish = await screen.findByRole('button', {
      name: 'სამუშაოს დასრულება',
    })
    expect(
      screen.getByRole('timer', { name: 'ნამუშევარი დრო' }),
    ).toHaveTextContent('25:00:00')
    expect(screen.getByText('2026-11-04 დღის აღრიცხული დრო')).toBeVisible()
    await user.click(finish)
    expect(
      within(screen.getByRole('dialog')).getByText(
        /ღია ჩანაწერი დასრულდება მიმდინარე დროით/,
      ),
    ).toBeVisible()
    expect(calls.finish).not.toHaveBeenCalled()
  })
  it('advances from the server sample using monotonic time rather than browser wall-clock changes', () => {
    vi.useFakeTimers({
      toFake: ['Date', 'setTimeout', 'clearTimeout', 'performance'],
    })
    render(<ClockTimer seconds={3600} running />)
    act(() => {
      vi.setSystemTime(new Date('2030-01-01'))
      vi.advanceTimersByTime(2000)
    })
    expect(
      screen.getByRole('timer', { name: 'ნამუშევარი დრო' }),
    ).toHaveTextContent('01:00:02')
  })
  it.each([
    [
      8 * 3600 - 1,
      '8 საათზე ნაკლები',
      'yellow',
      '8 საათი შესრულებულია',
      'green',
    ],
    [9 * 3600, '8 საათი შესრულებულია', 'green', '9 საათზე მეტი', 'orange'],
  ] as const)(
    'updates duration color and label while crossing %s seconds',
    (seconds, before, beforeColor, after, afterColor) => {
      vi.useFakeTimers({
        toFake: ['setTimeout', 'clearTimeout', 'performance'],
      })
      render(<ClockTimer seconds={seconds} running />)
      expect(screen.getByText(before)).toHaveAttribute(
        'data-variant',
        beforeColor,
      )
      expect(
        screen.getByText('მიზანი: 8 სთ მუშაობა + 1 სთ შესვენება'),
      ).toBeVisible()
      act(() => vi.advanceTimersByTime(1000))
      expect(screen.getByText(after)).toHaveAttribute(
        'data-variant',
        afterColor,
      )
    },
  )
  it('summarizes all today sessions plus elapsed time since the server sample', async () => {
    const monotonicTime = vi.spyOn(performance, 'now').mockReturnValue(0)
    const state = working()
    if (!state.today) throw new Error('Missing working fixture')
    state.today.seconds = 2 * 3600
    calls.read.mockResolvedValue({ ok: true, value: state })
    const user = userEvent.setup()
    render(
      <ModalProvider>
        <AttendanceOverview actorId="employee" />
      </ModalProvider>,
    )
    const finish = await screen.findByRole('button', {
      name: 'სამუშაოს დასრულება',
    })
    monotonicTime.mockReturnValue(125000)
    await user.click(finish)
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('02:02:05')).toBeVisible()
    expect(calls.finish).not.toHaveBeenCalled()
  })
  it('keeps the confirmation and background clock synchronized across a target boundary', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
    const seconds = 8 * 3600 - 3
    function timers(showConfirmation: boolean) {
      return (
        <ModalProvider>
          <ClockTimer seconds={seconds} running />
          {showConfirmation ? (
            <FinishWorkConfirmation
              oldSession={false}
              workedSeconds={seconds}
              clockStartedAt={0}
              remainingSeconds={3}
              finish={calls.finish}
              submitting={{ current: false }}
            />
          ) : null}
        </ModalProvider>
      )
    }
    const { rerender } = render(timers(false))
    act(() => vi.advanceTimersByTime(1250))
    rerender(timers(true))
    expect(
      screen.getByRole('timer', { name: 'დასრულებამდე აღრიცხული დრო' }),
    ).toHaveTextContent('07:59:58')
    expect(screen.getByText('გასვლა აღირიცხება ადრე დასრულებად.')).toBeVisible()
    act(() => vi.advanceTimersByTime(3750))
    expect(
      screen.getByRole('timer', { name: 'ნამუშევარი დრო' }),
    ).toHaveTextContent('08:00:02')
    expect(
      screen.getByRole('timer', { name: 'დასრულებამდე აღრიცხული დრო' }),
    ).toHaveTextContent('08:00:02')
    for (const badge of screen.getAllByText('8 საათი შესრულებულია'))
      expect(badge).toHaveAttribute('data-variant', 'green')
    expect(
      screen.queryByText('გასვლა აღირიცხება ადრე დასრულებად.'),
    ).not.toBeInTheDocument()
    expect(calls.finish).not.toHaveBeenCalled()
  })
})
