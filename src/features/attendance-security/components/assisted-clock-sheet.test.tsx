import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { AssistedClockSheet } from './assisted-clock-sheet'

vi.mock('#/features/attendance/components/manual-attendance-form', () => ({
  ManualAttendanceForm: () => <p>თანამშრომლის ნაცვლად აღრიცხვა</p>,
}))
it('keeps the assisted form behind a sheet and restores focus after Escape', async () => {
  const user = userEvent.setup()
  render(
    <AssistedClockSheet
      userId="employee"
      employeeName="ანა"
      timezone="Asia/Tbilisi"
      serverNow="2026-11-17T08:00:00Z"
    />,
  )
  expect(
    screen.queryByText('თანამშრომლის ნაცვლად აღრიცხვა'),
  ).not.toBeInTheDocument()
  const trigger = screen.getByRole('button', { name: 'დასწრების აღრიცხვა' })
  await user.click(trigger)
  expect(
    await screen.findByRole('dialog', { name: 'დასწრების აღრიცხვა' }),
  ).toBeInTheDocument()
  expect(screen.getByText('თანამშრომლის ნაცვლად აღრიცხვა')).toBeVisible()
  await user.keyboard('{Escape}')
  expect(trigger).toHaveFocus()
})
