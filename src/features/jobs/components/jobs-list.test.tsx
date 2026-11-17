import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import type { AnchorHTMLAttributes } from 'react'
import { JobsList } from './jobs-list'
import { jobSearchSchema } from '../jobs.schemas'
import type { JobSummary } from '../jobs.types'

const navigate = vi.hoisted(() => vi.fn())
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  Link: ({
    to,
    search: _search,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string
    search?: unknown
  }) => <a href={to} {...props} />,
}))
const item: JobSummary = {
  id: '019aac01-0000-7000-8000-000000000001',
  title: 'სატესტო სამუშაო',
  address: 'თბილისი',
  kind: 'installation',
  deadline: null,
  status: 'pending',
  longitude: null,
  latitude: null,
  assigneeId: null,
  assigneeName: null,
  version: 1,
  createdAt: '2026-11-11T10:00:00Z',
  updatedAt: '2026-11-11T10:00:00Z',
}
const search = jobSearchSchema.parse({ view: 'list', page: 2 })

beforeEach(() => vi.clearAllMocks())

it('opens details from a row and preserves filters while retaining the keyboard-accessible link', () => {
  render(<JobsList items={[item]} search={search} />)
  expect(screen.getByRole('link', { name: /სატესტო სამუშაო/ })).toHaveAttribute(
    'href',
    '/jobs',
  )
  expect(
    screen.queryByRole('columnheader', { name: 'დეტალები' }),
  ).not.toBeInTheDocument()
  fireEvent.click(screen.getByText('თავისუფალია'))
  expect(navigate).toHaveBeenCalledExactlyOnceWith({
    to: '/jobs',
    search: { ...search, pin: item.id },
  })
})

it('preserves link behavior, modified clicks and text selection', () => {
  render(<JobsList items={[item]} search={search} />)
  const title = screen.getByRole('link', { name: /სატესტო სამუშაო/ })
  title.addEventListener('click', (event) => event.preventDefault())
  fireEvent.click(title)
  const cell = screen.getByText('თავისუფალია')
  fireEvent.click(cell, { ctrlKey: true })
  const selection = window.getSelection()!
  const range = document.createRange()
  range.selectNodeContents(cell)
  selection.addRange(range)
  fireEvent.click(cell)
  selection.removeAllRanges()
  expect(navigate).not.toHaveBeenCalled()
})
