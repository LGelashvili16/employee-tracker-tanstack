import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AttendanceOverview } from './attendance-overview'
import { ClockTimer } from './attendance-clock'
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
})

describe('persisted attendance dashboard', () => {
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
    ).toEqual({ label: 'გამოტოვებული გასვლა', variant: 'red' })
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
    expect(screen.getByText('ღია ჩანაწერის დრო')).toBeVisible()
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
      toFake: ['Date', 'setInterval', 'clearInterval', 'performance'],
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
})
