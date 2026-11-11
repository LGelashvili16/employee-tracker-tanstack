import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { AnchorHTMLAttributes } from 'react'
import { ComplaintTable } from './complaint-table'
import type { ComplaintItem } from '../complaints.queries'

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
const item: ComplaintItem = {
  id: '019aac01-0000-7000-8000-000000000001',
  title: 'სატესტო საჩივარი',
  category: 'conditions',
  visibility: 'standard',
  status: 'new',
  createdAt: '2026-11-11T10:00:00Z',
  requesterName: 'ანა მაისურაძე',
  requesterImage: null,
  assigneeName: null,
}
it.each([true, false])(
  'puts the complainant and avatar first while retaining the complaint link (review=%s)',
  (review) => {
    render(<ComplaintTable items={[item]} review={review} search={{}} />)
    expect(screen.getAllByRole('columnheader')[0]).toHaveTextContent(
      'თანამშრომელი',
    )
    const row = screen.getAllByRole('row')[1]
    const firstCell = within(row).getAllByRole('cell')[0]
    expect(firstCell).toHaveTextContent('ანა მაისურაძე')
    expect(firstCell).toHaveTextContent('ამ'.toLocaleUpperCase('ka'))
    expect(firstCell.querySelector('[data-slot="avatar"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
    expect(within(row).getByRole('link', { name: item.title })).toHaveAttribute(
      'href',
      review ? '/manage/complaints' : '/complaints',
    )
  },
)

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.restoreAllMocks())
it.each([true, false])(
  'opens the sheet from a non-link cell and preserves URL filters (review=%s)',
  (review) => {
    render(
      <ComplaintTable
        items={[item]}
        review={review}
        search={{ q: 'ანა', status: 'new', page: 2 }}
      />,
    )
    fireEvent.click(screen.getByText(item.requesterName))
    expect(navigate).toHaveBeenCalledExactlyOnceWith({
      to: review ? '/manage/complaints' : '/complaints',
      search: {
        q: 'ანა',
        status: 'new',
        page: 2,
        complaintId: item.id,
        activityPage: 1,
      },
    })
  },
)
it('leaves title links, modified clicks, and text selection to their native behavior', () => {
  render(<ComplaintTable items={[item]} review search={{}} />)
  const title = screen.getByRole('link', { name: item.title })
  title.addEventListener('click', (event) => event.preventDefault())
  fireEvent.click(title)
  fireEvent.click(screen.getByText(item.requesterName), { ctrlKey: true })
  fireEvent.click(screen.getByText(item.requesterName), { metaKey: true })
  const selection = window.getSelection()!
  const range = document.createRange()
  range.selectNodeContents(screen.getByText(item.requesterName))
  selection.addRange(range)
  fireEvent.click(screen.getByText(item.requesterName))
  selection.removeAllRanges()
  expect(navigate).not.toHaveBeenCalled()
})
