import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ComplaintSearch } from './complaint-search'

describe('complaint URL filter behavior', () => {
  it('debounces search, resets pagination, and preserves focus when the applied URL arrives', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const view = render(
      <ComplaintSearch
        search={{ page: 3, status: 'new' }}
        onChange={onChange}
      />,
    )
    const input = screen.getByLabelText('საჩივრების ძიება')
    await user.type(input, 'ანა')
    expect(onChange).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledExactlyOnceWith(
        { page: 1, q: 'ანა', status: 'new', sort: 'newest' },
        true,
      ),
    )
    view.rerender(
      <ComplaintSearch
        search={{ page: 1, q: 'ანა', status: 'new', sort: 'newest' }}
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
      <ComplaintSearch search={{ q: 'ანა' }} onChange={onChange} />,
    )
    await user.type(screen.getByLabelText('საჩივრების ძიება'), 'ბ')
    view.rerender(
      <ComplaintSearch search={{ q: 'ბექა', page: 2 }} onChange={onChange} />,
    )
    await waitFor(() =>
      expect(screen.getByLabelText('საჩივრების ძიება')).toHaveValue('ბექა'),
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
      <ComplaintSearch
        search={{ page: 4, sort: 'oldest' }}
        onChange={onChange}
      />,
    )
    await user.click(screen.getByRole('combobox', { name: 'საჩივრის სტატუსი' }))
    await user.click(await screen.findByRole('option', { name: 'ახალი' }))
    expect(onChange).toHaveBeenCalledExactlyOnceWith(
      { page: 1, q: '', status: 'new', sort: 'oldest' },
      false,
    )
  })
})
