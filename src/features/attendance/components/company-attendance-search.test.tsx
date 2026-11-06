import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CompanyAttendanceSearch } from './company-attendance-search'

afterEach(() => vi.useRealTimers())
describe('attendance list filters', () => {
  it('debounces a draft once and keeps focus when its own URL state arrives', async () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    const view = render(
      <CompanyAttendanceSearch search={{}} onChange={onChange} />,
    )
    const input = screen.getByLabelText('თანამშრომლის ძიება')
    act(() => input.focus())
    fireEvent.change(input, { target: { value: 'ანა' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(299)
    })
    expect(onChange).not.toHaveBeenCalled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(onChange).toHaveBeenCalledExactlyOnceWith(
      { page: 1, q: 'ანა', state: undefined },
      true,
    )
    view.rerender(
      <CompanyAttendanceSearch
        search={{ q: 'ანა', page: 1 }}
        onChange={onChange}
      />,
    )
    expect(input).toHaveFocus()
    expect(input).toHaveValue('ანა')
  })
  it('cancels a pending draft on external navigation and on unmount', async () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    const view = render(
      <CompanyAttendanceSearch search={{ q: 'ანა' }} onChange={onChange} />,
    )
    const input = screen.getByLabelText('თანამშრომლის ძიება')
    fireEvent.change(input, { target: { value: 'ანა ახალი' } })
    view.rerender(
      <CompanyAttendanceSearch
        search={{ q: 'ბექა', page: 2 }}
        onChange={onChange}
      />,
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })
    expect(input).toHaveValue('ბექა')
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: 'ბექა ტექსტი' } })
    view.unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })
    expect(onChange).not.toHaveBeenCalled()
  })
})
