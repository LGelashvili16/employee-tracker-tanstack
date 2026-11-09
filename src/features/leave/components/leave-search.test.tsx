import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LeaveSearch } from './leave-search'

describe('vacation URL filter behavior', () => {
  it('debounces search, resets pagination, and preserves focus when the applied URL arrives', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const view = render(
      <LeaveSearch
        search={{ page: 3, status: 'pending' }}
        onChange={onChange}
      />,
    )
    const input = screen.getByLabelText('მოთხოვნების ძიება')
    await user.type(input, 'ანა')
    expect(onChange).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledExactlyOnceWith(
        { page: 1, q: 'ანა', status: 'pending', sort: 'newest' },
        true,
      ),
    )
    view.rerender(
      <LeaveSearch
        search={{ page: 1, q: 'ანა', status: 'pending', sort: 'newest' }}
        onChange={onChange}
      />,
    )
    expect(input).toHaveFocus()
    expect(input).toHaveValue('ანა')
  })
  it('cancels a stale draft when Back/Forward restores another URL', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const view = render(
      <LeaveSearch search={{ q: 'ანა' }} onChange={onChange} />,
    )
    await user.type(screen.getByLabelText('მოთხოვნების ძიება'), 'ბ')
    view.rerender(
      <LeaveSearch search={{ q: 'ბექა', page: 2 }} onChange={onChange} />,
    )
    await waitFor(() =>
      expect(screen.getByLabelText('მოთხოვნების ძიება')).toHaveValue('ბექა'),
    )
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350))
    })
    expect(onChange).not.toHaveBeenCalled()
  })
  it('commits explicit status changes immediately while preserving sorting', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <LeaveSearch search={{ page: 4, sort: 'oldest' }} onChange={onChange} />,
    )
    await user.click(
      screen.getByRole('combobox', { name: 'მოთხოვნის სტატუსი' }),
    )
    await user.click(screen.getByRole('option', { name: 'მოლოდინში' }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith(
      { page: 1, q: '', status: 'pending', sort: 'oldest' },
      false,
    )
  })
})
