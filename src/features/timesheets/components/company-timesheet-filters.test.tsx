import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CompanyTimesheetFilters } from './company-timesheet-filters'

afterEach(() => vi.useRealTimers())
describe('timesheet list filters', () => {
  it('debounces a draft once and keeps focus when its own URL state arrives', async () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    const view = render(
      <CompanyTimesheetFilters search={{}} onChange={onChange} />,
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
      { page: 0, q: 'ანა', status: undefined },
      true,
    )
    view.rerender(
      <CompanyTimesheetFilters
        search={{ q: 'ანა', page: 0 }}
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
      <CompanyTimesheetFilters search={{ q: 'ანა' }} onChange={onChange} />,
    )
    const input = screen.getByLabelText('თანამშრომლის ძიება')
    fireEvent.change(input, { target: { value: 'ანა ახალი' } })
    view.rerender(
      <CompanyTimesheetFilters
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
