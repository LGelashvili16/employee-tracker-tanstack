import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProvisionAccountForm } from './provision-account-form'

const { create, success, error, scheduleRead } = vi.hoisted(() => ({
  create: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  scheduleRead: vi.fn(),
}))
vi.mock('../access.functions', () => ({ createEmployeeAccount: create }))
vi.mock('#/features/scheduling/scheduling.functions', () => ({
  getScheduleSettings: scheduleRead,
}))
vi.mock('sonner', () => ({ toast: { success, error } }))
beforeEach(() => {
  create.mockReset()
  success.mockReset()
  error.mockReset()
  scheduleRead
    .mockReset()
    .mockResolvedValue({ ok: true, value: { current: null } })
})

describe('administrative account provisioning', () => {
  it('keeps restricted provisioning on the employee role without requesting schedule settings', async () => {
    const user = userEvent.setup()
    create.mockResolvedValue({ ok: false, message: 'საცდელი პასუხი.' })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ProvisionAccountForm onCode={vi.fn()} canAssignRoles={false} />
      </QueryClientProvider>,
    )
    expect(screen.getByRole('combobox')).toBeDisabled()
    expect(
      screen.queryByRole('switch', { name: 'კომპანიის განრიგის გამოყენება' }),
    ).not.toBeInTheDocument()
    expect(scheduleRead).not.toHaveBeenCalled()
    await user.type(
      screen.getByRole('textbox', { name: 'სახელი და გვარი' }),
      'ანა მაისურაძე',
    )
    await user.type(
      screen.getByRole('textbox', { name: 'მომხმარებლის სახელი' }),
      'hr-worker',
    )
    await user.click(screen.getByRole('button', { name: 'ანგარიშის შექმნა' }))
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        data: expect.objectContaining({ role: 'employee', workingWeek: null }),
      }),
    )
  })
  it('submits optional profile details and an office week with Saturday off', async () => {
    const days = Array.from({ length: 7 }, (_, index) => ({
      weekday: index + 1,
      hours: index < 6 ? { start: '10:00', end: '19:00' } : null,
    }))
    scheduleRead.mockResolvedValue({ ok: true, value: { current: { days } } })
    create.mockResolvedValue({ ok: false, message: 'საცდელი პასუხი.' })
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ProvisionAccountForm
          onCode={vi.fn()}
          canAssignRoles={false}
          canConfigureSchedule
        />
      </QueryClientProvider>,
    )
    await user.type(
      screen.getByRole('textbox', { name: 'სახელი და გვარი' }),
      'ანა მაისურაძე',
    )
    await user.type(
      screen.getByRole('textbox', { name: 'მომხმარებლის სახელი' }),
      'office-01',
    )
    await user.type(
      screen.getByRole('textbox', { name: 'თანამდებობა' }),
      'დიზაინერი',
    )
    await user.type(
      screen.getByRole('textbox', { name: 'ტელეფონის ნომერი' }),
      '+995 555 12 34 56',
    )
    const inherit = screen.getByRole('switch', {
      name: 'კომპანიის განრიგის გამოყენება',
    })
    await waitFor(() => expect(inherit).toBeEnabled())
    await user.click(inherit)
    await user.click(
      screen.getByRole('switch', { name: 'შაბათი: სამუშაო დღე' }),
    )
    await user.click(screen.getByRole('button', { name: 'ანგარიშის შექმნა' }))
    await waitFor(() => expect(create).toHaveBeenCalledOnce())
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        jobTitle: 'დიზაინერი',
        phone: '+995 555 12 34 56',
        workingWeek: days.map((day) =>
          day.weekday === 6 ? { ...day, hours: null } : day,
        ),
      }),
    })
  })
  it('permits an empty contact email and shows a code only after successful provisioning', async () => {
    const user = userEvent.setup()
    const onCode = vi.fn()
    const secret = {
      code: 'A'.repeat(12),
      expiresAt: '2026-11-05T00:00:00Z',
      purpose: 'activation',
    }
    create.mockResolvedValue({ ok: true, value: secret })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ProvisionAccountForm onCode={onCode} canAssignRoles={false} />
      </QueryClientProvider>,
    )
    await user.type(
      screen.getByRole('textbox', { name: 'მომხმარებლის სახელი' }),
      'worker-01',
    )
    await user.type(
      screen.getByRole('textbox', { name: 'სახელი და გვარი' }),
      'ანა მაისურაძე',
    )
    expect(screen.queryByLabelText('შექმნის მიზეზი')).not.toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: 'სახელი და გვარი' }),
    ).toBeRequired()
    expect(
      screen.getByRole('textbox', { name: 'მომხმარებლის სახელი' }),
    ).toBeRequired()
    expect(screen.getByRole('textbox', { name: 'ელფოსტა' })).not.toBeRequired()
    await user.click(screen.getByRole('button', { name: 'ანგარიშის შექმნა' }))
    await waitFor(() => expect(create).toHaveBeenCalledOnce())
    expect(create).toHaveBeenCalledWith({
      data: {
        code: 'worker-01',
        name: 'ანა მაისურაძე',
        contactEmail: '',
        role: 'employee',
        jobTitle: '',
        phone: '',
        workingWeek: null,
      },
    })
    expect(onCode).toHaveBeenCalledWith(secret)
    expect(success).toHaveBeenCalledExactlyOnceWith(
      'თანამშრომლის ანგარიში შექმნილია.',
    )
    expect(
      screen.getByRole('textbox', { name: 'მომხმარებლის სახელი' }),
    ).toHaveValue('')
  })

  it('rejects malformed optional email before requesting account creation', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ProvisionAccountForm onCode={vi.fn()} canAssignRoles={false} />
      </QueryClientProvider>,
    )
    await user.type(
      screen.getByRole('textbox', { name: 'მომხმარებლის სახელი' }),
      'worker-02',
    )
    await user.type(
      screen.getByRole('textbox', { name: 'სახელი და გვარი' }),
      'ანა მაისურაძე',
    )
    await user.type(screen.getByRole('textbox', { name: 'ელფოსტა' }), 'invalid')
    await user.click(screen.getByRole('button', { name: 'ანგარიშის შექმნა' }))
    expect(await screen.findByText('ელფოსტა არასწორია.')).toBeVisible()
    expect(create).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('requires a name and employee code without exposing creation codes on failure', async () => {
    const user = userEvent.setup()
    const onCode = vi.fn()
    create.mockResolvedValue({
      ok: false,
      message: 'მომხმარებლის სახელი უკვე გამოიყენება.',
    })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ProvisionAccountForm onCode={onCode} canAssignRoles={false} />
      </QueryClientProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'ანგარიშის შექმნა' }))
    expect(await screen.findByText('მიუთითეთ სახელი და გვარი.')).toBeVisible()
    expect(create).not.toHaveBeenCalled()
    await user.type(
      screen.getByRole('textbox', { name: 'სახელი და გვარი' }),
      'ანა მაისურაძე',
    )
    await user.type(
      screen.getByRole('textbox', { name: 'მომხმარებლის სახელი' }),
      'worker-01',
    )
    await user.click(screen.getByRole('button', { name: 'ანგარიშის შექმნა' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'მომხმარებლის სახელი უკვე გამოიყენება.',
    )
    expect(onCode).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledExactlyOnceWith(
      'მომხმარებლის სახელი უკვე გამოიყენება.',
    )
    expect(success).not.toHaveBeenCalled()
  })
})
