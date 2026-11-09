import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { AttendanceDayPicker } from './attendance-day-picker'

it('uses the supplied company today and supports keyboard date selection', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(
    <AttendanceDayPicker
      date="2026-11-04"
      today="2026-11-05"
      onChange={onChange}
    />,
  )
  await user.click(screen.getByRole('button', { name: 'დღეს' }))
  await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('2026-11-05'))
  await user.click(screen.getByRole('button', { name: 'სამუშაო დღის არჩევა' }))
  const day = screen.getByRole('button', { name: 'სამშაბათი, 3 ნოემბერი 2026' })
  day.focus()
  await user.keyboard('{Enter}')
  await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('2026-11-03'))
})

it('restores an externally changed date without remounting the focused controls', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  const { rerender } = render(
    <AttendanceDayPicker
      date="2026-11-04"
      today="2026-11-05"
      onChange={onChange}
    />,
  )
  const previous = screen.getByRole('button', { name: 'წინა დღე' })
  await user.click(previous)
  await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('2026-11-03'))
  rerender(
    <AttendanceDayPicker
      date="2026-11-03"
      today="2026-11-05"
      onChange={onChange}
    />,
  )
  expect(previous).toHaveFocus()
  expect(
    screen.getByRole('button', { name: 'სამუშაო დღის არჩევა' }),
  ).toHaveTextContent('3 ნოემბერი 2026')
  await user.click(screen.getByRole('button', { name: 'შემდეგი დღე' }))
  await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('2026-11-04'))
})
