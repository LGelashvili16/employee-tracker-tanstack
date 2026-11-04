import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ScheduleVersionForm } from './schedule-version-form'
import type { ScheduleSettings } from '../scheduling.types'

const create = vi.hoisted(() => vi.fn())
const notifications = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast: notifications }))
vi.mock('../scheduling.functions', () => ({
  createScheduleVersion: create,
  getScheduleSettings: vi.fn(),
}))
vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }))
const settings: ScheduleSettings = {
  current: null,
  latest: null,
  upcoming: [],
  hasMoreUpcoming: false,
  today: '2026-11-04',
  minimumEffectiveFrom: '2026-11-04',
  timezone: null,
}
function setup(value = settings) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <ScheduleVersionForm settings={value} actorId="test-admin" />
    </QueryClientProvider>,
  )
  return userEvent.setup()
}
beforeEach(() => {
  create.mockReset()
  notifications.success.mockReset()
  notifications.error.mockReset()
})

describe('company schedule form', () => {
  it('toggles a workday only through the switch, including keyboard activation', async () => {
    const user = setup()
    const control = screen.getByRole('switch', {
      name: 'ორშაბათი: სამუშაო დღე',
    })
    const row = control.closest('[data-slot="field"]')
    if (!row) throw new Error('Expected the workday row')
    await user.click(screen.getByText('ორშაბათი', { exact: true }))
    await user.click(row)
    expect(control).not.toBeChecked()
    await user.click(control)
    expect(control).toBeChecked()
    await user.click(screen.getByText('ორშაბათი', { exact: true }))
    expect(control).toBeChecked()
    control.focus()
    await user.keyboard('[Space]')
    expect(control).not.toBeChecked()
  })
  it('saves the identifier of a selected predefined timezone', async () => {
    create.mockResolvedValue({
      ok: true,
      value: { effectiveFrom: '2026-11-04' },
    })
    const user = setup()
    await user.click(
      screen.getByRole('combobox', { name: 'კომპანიის დროის სარტყელი' }),
    )
    await user.click(
      await screen.findByRole('option', {
        name: 'უნივერსალური დრო (UTC+00:00)',
      }),
    )
    await user.click(
      screen.getByRole('switch', { name: 'ორშაბათი: სამუშაო დღე' }),
    )
    await user.click(screen.getByRole('button', { name: 'განრიგის შენახვა' }))
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        data: expect.objectContaining({ timezone: 'UTC' }),
      }),
    )
  })
  it('requires at least one workday without a change-reason input', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'განრიგის შენახვა' }))
    expect(screen.queryByLabelText('ცვლილების მიზეზი')).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('დაგვიანების შეღავათი (წუთი)'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('ადრე გასვლის შეღავათი (წუთი)'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByLabelText('შესვლის შეხსენება დაწყებამდე (წუთი)'),
    ).toHaveValue(5)
    expect(
      screen.getByLabelText('გასვლის შეხსენება დასრულებამდე (წუთი)'),
    ).toHaveValue(0)
    expect(
      await screen.findByText('მიუთითეთ მინიმუმ ერთი სამუშაო დღე.'),
    ).toBeVisible()
    expect(create).not.toHaveBeenCalled()
  })
  it('submits explicit workdays and prevents duplicate saves while pending', async () => {
    let finish: ((result: unknown) => void) | undefined
    create.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const user = setup()
    await user.click(
      screen.getByRole('switch', { name: 'ორშაბათი: სამუშაო დღე' }),
    )
    expect(screen.getByLabelText('ორშაბათი: დაწყება')).toHaveValue('10:00')
    await user.click(screen.getByRole('button', { name: 'განრიგის შენახვა' }))
    await waitFor(() => expect(create).toHaveBeenCalledOnce())
    expect(
      screen.getByRole('button', { name: 'განრიგის შენახვა' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'განრიგის შენახვა' }),
    ).toHaveAttribute('aria-busy', 'true')
    expect(create.mock.calls[0][0].data.days[0].hours).toEqual({
      start: '10:00',
      end: '19:00',
    })
    expect(create.mock.calls[0][0].data).not.toHaveProperty('reason')
    finish?.({ ok: true, value: { effectiveFrom: '2026-11-04' } })
    await waitFor(() =>
      expect(notifications.success).toHaveBeenCalledExactlyOnceWith(
        'განრიგი შენახულია.',
        { description: 'ძალაში შესვლის თარიღი: 2026-11-04.' },
      ),
    )
    expect(notifications.error).not.toHaveBeenCalled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
  it('shows a server rejection and retains entered hours for correction', async () => {
    create.mockResolvedValue({ ok: false, message: 'განრიგი უკვე შენახულია.' })
    const user = setup()
    await user.click(
      screen.getByRole('switch', { name: 'ორშაბათი: სამუშაო დღე' }),
    )
    await user.click(screen.getByRole('button', { name: 'განრიგის შენახვა' }))
    await waitFor(() =>
      expect(notifications.error).toHaveBeenCalledExactlyOnceWith(
        'განრიგი უკვე შენახულია.',
      ),
    )
    expect(notifications.success).not.toHaveBeenCalled()
    expect(screen.getByLabelText('ორშაბათი: დასრულება')).toHaveValue('19:00')
  })
  it('shows per-field invalid hours and blocks submission', async () => {
    const user = setup()
    await user.click(
      screen.getByRole('switch', { name: 'ორშაბათი: სამუშაო დღე' }),
    )
    await user.clear(screen.getByLabelText('ორშაბათი: დასრულება'))
    await user.click(screen.getByRole('button', { name: 'განრიგის შენახვა' }))
    expect(screen.getByLabelText('ორშაბათი: დასრულება')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(create).not.toHaveBeenCalled()
    expect(notifications.success).not.toHaveBeenCalled()
    expect(notifications.error).not.toHaveBeenCalled()
  })
  it('shows one safe error toast when the save request fails', async () => {
    create.mockRejectedValue(new Error('Private server details'))
    const user = setup()
    await user.click(
      screen.getByRole('switch', { name: 'ორშაბათი: სამუშაო დღე' }),
    )
    await user.click(screen.getByRole('button', { name: 'განრიგის შენახვა' }))
    await waitFor(() =>
      expect(notifications.error).toHaveBeenCalledExactlyOnceWith(
        'მოთხოვნა ვერ დასრულდა. გადაამოწმეთ შენახული განრიგი ხელახლა გაგზავნამდე.',
      ),
    )
    expect(notifications.success).not.toHaveBeenCalled()
  })
})
