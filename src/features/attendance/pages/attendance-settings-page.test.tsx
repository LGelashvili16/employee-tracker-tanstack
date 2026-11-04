import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AttendanceSettingsPage } from './attendance-settings-page'

const read = vi.hoisted(() => vi.fn())
const notifications = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast: notifications }))
vi.mock('#/features/scheduling/scheduling.functions', () => ({
  getScheduleSettings: read,
  createScheduleVersion: vi.fn(),
}))
vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }))
beforeEach(() => {
  read.mockReset()
  notifications.success.mockReset()
  notifications.error.mockReset()
})

describe('attendance settings states', () => {
  it('announces loading and hides decorative skeletons', () => {
    read.mockReturnValue(new Promise(() => {}))
    render(<AttendanceSettingsPage actorId="admin" />)
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
    render(<AttendanceSettingsPage actorId="admin" />)
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
    render(<AttendanceSettingsPage actorId="admin" />)
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
