import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import {
  DayOffSettingsCard,
  EmployeeDayOffBalanceCard,
} from './day-off-allowance-card'

const { settings, balance, saveSettings, saveBalance, success, error } =
  vi.hoisted(() => ({
    settings: vi.fn(),
    balance: vi.fn(),
    saveSettings: vi.fn(),
    saveBalance: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  }))
vi.mock('../day-off-allowance.functions', () => ({
  getDayOffSettings: settings,
  getEmployeeDayOffBalance: balance,
  updateDayOffSettings: saveSettings,
  updateEmployeeDayOffBalance: saveBalance,
}))
vi.mock('sonner', () => ({ toast: { success, error } }))
beforeEach(() => {
  vi.clearAllMocks()
  settings.mockResolvedValue({
    ok: true,
    value: { defaultDays: 4, resetYearly: true, revision: 0 },
  })
  balance.mockResolvedValue({
    ok: true,
    value: {
      annualDays: 4,
      vacationAnnualDays: 24,
      vacationRemainingDays: 24,
      remainingDays: 2,
      revision: 0,
      year: 2026,
      resetYearly: true,
    },
  })
  saveSettings.mockResolvedValue({ ok: true, value: {} })
  saveBalance.mockResolvedValue({ ok: true, value: {} })
})
it('validates policy changes, submits the reset toggle and confirms success', async () => {
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <DayOffSettingsCard canEdit />
    </QueryClientProvider>,
  )
  const reset = await screen.findByRole('switch', {
    name: 'ბალანსის წლიური განახლება 1 იანვარს',
  })
  expect(reset).toBeChecked()
  await user.click(reset)
  await user.click(screen.getByRole('button', { name: 'წესის შენახვა' }))
  expect(saveSettings).not.toHaveBeenCalled()
  expect(
    await screen.findByText('მიუთითეთ მინიმუმ 5 სიმბოლო.'),
  ).toBeInTheDocument()
  await user.type(
    screen.getByRole('textbox', { name: 'ცვლილების მიზეზი' }),
    'წლიური განახლების გამორთვა',
  )
  await user.click(screen.getByRole('button', { name: 'წესის შენახვა' }))
  await waitFor(() =>
    expect(saveSettings).toHaveBeenCalledWith({
      data: expect.objectContaining({
        defaultDays: 4,
        resetYearly: false,
        revision: 0,
      }),
    }),
  )
  await waitFor(() => expect(success).toHaveBeenCalledOnce())
})
it('edits an employee balance and surfaces a stale-balance error without closing', async () => {
  const user = userEvent.setup()
  saveBalance.mockResolvedValue({
    ok: false,
    message: 'ბალანსი შეიცვალა. განაახლეთ მონაცემები.',
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <EmployeeDayOffBalanceCard actorId="hr" userId="employee" canEdit />
    </QueryClientProvider>,
  )
  await user.click(
    await screen.findByRole('button', { name: 'ბალანსის შეცვლა' }),
  )
  const remaining = screen.getByRole('spinbutton', { name: 'დარჩენილი დღეები' })
  await user.clear(remaining)
  await user.type(remaining, '3')
  await user.type(
    screen.getByRole('textbox', { name: 'ცვლილების მიზეზი' }),
    'ბალანსის გაზრდა',
  )
  await user.click(screen.getByRole('button', { name: 'ბალანსის შენახვა' }))
  await waitFor(() =>
    expect(saveBalance).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'employee',
        remainingDays: 3,
        annualDays: 4,
        revision: 0,
        year: 2026,
      }),
    }),
  )
  expect(error).toHaveBeenCalledOnce()
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})
