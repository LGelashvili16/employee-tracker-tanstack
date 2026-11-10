import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { AnnouncementFilters } from './announcement-filters'

it('debounces search, resets pagination, and restores text after external URL navigation', async () => {
  const user = userEvent.setup()
  const change = vi.fn()
  const search = {
    page: 3,
    q: '',
    status: 'all' as const,
    sort: 'newest' as const,
  }
  const { rerender } = render(
    <AnnouncementFilters search={search} onChange={change} />,
  )
  await user.type(
    screen.getByRole('textbox', { name: 'განცხადების ძიება' }),
    'სიახლე',
  )
  expect(change).not.toHaveBeenCalled()
  await waitFor(() =>
    expect(change).toHaveBeenCalledWith(
      { ...search, q: 'სიახლე', page: 1, announcementId: undefined },
      true,
    ),
  )
  expect(change).toHaveBeenCalledOnce()
  rerender(
    <AnnouncementFilters search={{ ...search, q: 'სხვა' }} onChange={change} />,
  )
  expect(
    screen.getByRole('textbox', { name: 'განცხადების ძიება' }),
  ).toHaveValue('სხვა')
})
