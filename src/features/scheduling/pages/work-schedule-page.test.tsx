import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkSchedulePage } from './work-schedule-page'

const read = vi.hoisted(() => vi.fn())
vi.mock('#/features/attendance/attendance.functions', () => ({
  readAttendanceSettings: vi.fn(async () => ({
    ok: true,
    value: {
      setting: { maxOpenHours: 16, revision: 0 },
      employees: [],
      reviewers: [],
      assignments: [],
      truncated: false,
    },
  })),
  updateAttendanceLimit: vi.fn(),
  updateAttendanceReviewer: vi.fn(),
}))
const notifications = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast: notifications }))
vi.mock('#/features/scheduling/scheduling.functions', () => ({
  getScheduleSettings: read,
  createScheduleVersion: vi.fn(),
}))
vi.mock('#/features/leave/day-off-allowance.functions', () => ({
  getDayOffSettings: vi.fn().mockResolvedValue({
    ok: true,
    value: { defaultDays: 4, resetYearly: true, revision: 0 },
  }),
  updateDayOffSettings: vi.fn(),
}))
vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }))
beforeEach(() => {
  read.mockReset()
  notifications.success.mockReset()
  notifications.error.mockReset()
})

describe('work schedule page states', () => {
  it('announces loading and hides decorative skeletons', () => {
    read.mockReturnValue(new Promise(() => {}))
    render(<WorkSchedulePage actorId="admin" />)
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    }
    expect(
      screen.getByRole('heading', { name: 'სამუშაო განრიგი' }),
    ).toBeVisible()
    expect(
      screen.getByRole('status', { name: 'განრიგი იტვირთება' }),
    ).toHaveAttribute('aria-busy', 'true')
    expect(
      screen.queryByRole('button', { name: 'განრიგის შენახვა' }),
    ).not.toBeInTheDocument()
  })
  it('shows a safe server error and a refresh action instead of a form', async () => {
    read.mockResolvedValue({
      ok: false,
      message: 'განრიგის ჩატვირთვა ვერ მოხერხდა.',
    })
    render(<WorkSchedulePage actorId="admin" />)
    expect(
      await screen.findByText('განრიგის ჩატვირთვა ვერ მოხერხდა.'),
    ).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'განრიგის შენახვა' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'მონაცემების განახლება' }),
    ).toBeEnabled()
    expect(notifications.error).not.toHaveBeenCalled()
    const user = userEvent.setup()
    await user.click(
      screen.getByRole('button', { name: 'მონაცემების განახლება' }),
    )
    expect(notifications.error).toHaveBeenCalledExactlyOnceWith(
      'განრიგის ჩატვირთვა ვერ მოხერხდა.',
    )
  })
  it('shows one settings group and preserves unsaved edits across tab changes', async () => {
    read.mockResolvedValue({
      ok: true,
      value: {
        current: null,
        latest: null,
        upcoming: [],
        hasMoreUpcoming: false,
        today: '2026-11-09',
        minimumEffectiveFrom: '2026-11-09',
        timezone: null,
      },
    })
    const user = userEvent.setup()
    render(<WorkSchedulePage actorId="admin" canConfigureLeave />)
    const reminder = await screen.findByRole('spinbutton', {
      name: 'შესვლის შეხსენება დაწყებამდე (წუთი)',
    })
    await user.clear(reminder)
    await user.type(reminder, '7')
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
    await user.click(
      screen.getByRole('tab', { name: 'დასვენება და შვებულება' }),
    )
    expect(
      screen.queryByRole('button', { name: 'განრიგის შენახვა' }),
    ).not.toBeInTheDocument()
    const allowance = await screen.findByRole('spinbutton', {
      name: 'საწყისი ლიმიტი (დღე)',
    })
    await user.clear(allowance)
    await user.type(allowance, '6')
    await user.click(screen.getByRole('tab', { name: 'დასწრების წესები' }))
    expect(
      await screen.findByRole('spinbutton', {
        name: 'გადამოწმების ზღვარი (საათი)',
      }),
    ).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'წესის შენახვა' }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'განრიგი' }))
    expect(
      screen.getByRole('spinbutton', {
        name: 'შესვლის შეხსენება დაწყებამდე (წუთი)',
      }),
    ).toHaveValue(7)
    await user.click(
      screen.getByRole('tab', { name: 'დასვენება და შვებულება' }),
    )
    expect(
      screen.getByRole('spinbutton', { name: 'საწყისი ლიმიტი (დღე)' }),
    ).toHaveValue(6)
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
  })
  it('shows an honest unconfigured state and editable initial schedule', async () => {
    read.mockResolvedValue({
      ok: true,
      value: {
        current: null,
        latest: null,
        upcoming: [],
        hasMoreUpcoming: false,
        today: '2026-11-04',
        minimumEffectiveFrom: '2026-11-04',
        timezone: null,
      },
    })
    render(<WorkSchedulePage actorId="admin" />)
    expect(
      await screen.findByText(
        'ამ დღისთვის მოქმედი განრიგი ჯერ არ არის განსაზღვრული.',
      ),
    ).toBeVisible()
    expect(
      screen.getByRole('combobox', { name: 'კომპანიის დროის სარტყელი' }),
    ).toHaveTextContent('თბილისი (UTC+04:00)')
    expect(
      screen.queryByRole('button', { name: 'მონაცემების განახლება' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'განრიგის შენახვა' }),
    ).toBeEnabled()
  })
})
