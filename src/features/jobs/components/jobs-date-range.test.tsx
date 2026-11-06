import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JobsFilters } from './jobs-filters'
import { JobsDateRange } from './jobs-date-range'
import { jobSearchSchema } from '../jobs.schemas'

vi.mock('#/hooks/use-mobile', () => ({ useIsMobile: () => false }))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-06T10:00:00Z'))
})
afterEach(() => vi.useRealTimers())
it('keeps the portalled calendar submission separate from the filter form', async () => {
  const onChange = vi.fn()
  const onOuterSubmit = vi.fn((event: React.SubmitEvent) =>
    event.preventDefault(),
  )
  render(
    <form onSubmit={onOuterSubmit}>
      <JobsDateRange
        value={{ from: '2026-11-01', to: '2026-11-30' }}
        onChange={onChange}
      />
    </form>,
  )
  await userEvent.click(
    screen.getByRole('button', { name: /სამუშაოების შექმნის პერიოდი/ }),
  )
  await userEvent.click(screen.getByRole('button', { name: 'გამოყენება' }))
  expect(onChange).toHaveBeenCalledExactlyOnceWith({
    from: '2026-11-01',
    to: '2026-11-30',
  })
  expect(onOuterSubmit).not.toHaveBeenCalled()
})
it('selects the current month initially and applies last month with pagination reset', async () => {
  const search = jobSearchSchema.parse({
    page: 4,
    pin: '019a365d-37cc-7a5c-bfe1-1e0752235b68',
  })
  const onChange = vi.fn()
  render(<JobsFilters search={search} onChange={onChange} />)
  await userEvent.click(
    screen.getByRole('button', {
      name: 'სამუშაოების შექმნის პერიოდი: 01.11.2026 - 30.11.2026',
    }),
  )
  await userEvent.click(screen.getByRole('button', { name: 'წინა თვე' }))
  expect(onChange).toHaveBeenCalledWith(
    {
      ...search,
      from: '2026-10-01',
      to: '2026-10-31',
      page: 1,
      pin: undefined,
    },
    false,
  )
})
it('applies a custom range only after confirmation and restores external URL ranges', async () => {
  const onChange = vi.fn()
  const search = jobSearchSchema.parse({})
  const view = render(<JobsFilters search={search} onChange={onChange} />)
  await userEvent.click(
    screen.getByRole('button', { name: /სამუშაოების შექმნის პერიოდი/ }),
  )
  await userEvent.click(
    screen.getByRole('button', { name: '10 ნოემბერი 2026' }),
  )
  await userEvent.click(
    screen.getByRole('button', { name: '14 ნოემბერი 2026' }),
  )
  expect(onChange).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'გამოყენება' }))
  expect(onChange).toHaveBeenCalledWith(
    {
      ...search,
      from: '2026-11-10',
      to: '2026-11-14',
      page: 1,
      pin: undefined,
    },
    false,
  )
  const restored = jobSearchSchema.parse({
    from: '2026-09-01',
    to: '2026-09-30',
  })
  await userEvent.click(
    screen.getByRole('button', { name: /სამუშაოების შექმნის პერიოდი/ }),
  )
  view.rerender(<JobsFilters search={restored} onChange={onChange} />)
  expect(
    screen.queryByRole('button', { name: 'გამოყენება' }),
  ).not.toBeInTheDocument()
  expect(
    screen.getByRole('button', {
      name: 'სამუშაოების შექმნის პერიოდი: 01.09.2026 - 30.09.2026',
    }),
  ).toBeInTheDocument()
})
