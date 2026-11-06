import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CompanyTimesheetsPage } from './company-timesheets-page'
import type { AnchorHTMLAttributes } from 'react'
import type { TimesheetSearch } from '../timesheets.types'

const calls = vi.hoisted(() => ({
  read: vi.fn(),
  navigate: vi.fn(),
  search: {
    month: '2026-11',
    page: 1,
    q: 'ანა',
    status: 'pending',
    sort: 'date-desc',
  } satisfies TimesheetSearch,
}))
vi.mock('../timesheets.functions', () => ({ getCompanyTimesheets: calls.read }))
vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({
    useRouteContext: () => ({ actor: { id: 'admin' } }),
    useSearch: () => calls.search,
    useNavigate: () => calls.navigate,
  }),
  useLocation: ({
    select,
  }: {
    select: (value: { pathname: string }) => unknown
  }) => select({ pathname: '/admin/timesheets' }),
  Link: ({
    to,
    params,
    search,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string
    params?: Record<string, string>
    search?: Record<string, unknown>
  }) => {
    const path = to.replace(
      /\$([A-Za-z]+)/g,
      (_, key: string) => params?.[key] ?? key,
    )
    const query = new URLSearchParams(
      Object.entries(search ?? {})
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)]),
    )
    return <a href={`${path}${query.size ? `?${query}` : ''}`} {...props} />
  },
}))
function response(rows = true) {
  return {
    ok: true,
    value: {
      month: '2026-11',
      total: rows ? 101 : 0,
      pageSize: 50,
      totals: {
        records: rows ? 101 : 0,
        days: rows ? 101 : 0,
        seconds: 3600,
        approvedOutsideSeconds: 0,
        open: 0,
        pending: 1,
        rejected: 0,
      },
      rows: rows
        ? [
            {
              employeeId: 'employee',
              userId: 'worker',
              employeeName: 'ანა',
              date: '2026-11-05',
              timezone: 'Asia/Tbilisi',
              firstIn: '2026-11-05T06:00:00Z',
              lastOut: '2026-11-05T07:00:00Z',
              seconds: 3600,
              approvedOutsideSeconds: 0,
              open: 0,
              pending: 1,
              rejected: 0,
            },
          ]
        : [],
    },
  }
}
beforeEach(() => {
  vi.clearAllMocks()
  calls.read.mockResolvedValue(response())
})
function linkSearch(name: string) {
  return new URL(
    screen.getByRole('link', { name }).getAttribute('href') ?? '',
    'http://localhost',
  ).searchParams
}

describe('company timesheets page', () => {
  it('loads server filters and preserves them in pagination, sort, and month navigation', async () => {
    const user = userEvent.setup()
    render(<CompanyTimesheetsPage />)
    await screen.findByRole('table')
    expect(
      screen.getByRole('heading', { name: 'თანამშრომლების სამუშაო საათები' }),
    ).toBeVisible()
    expect(
      screen.getByRole('tab', { name: 'სამუშაო საათები' }),
    ).toHaveAttribute('aria-selected', 'true')
    expect(calls.read).toHaveBeenCalledWith({ data: calls.search })
    expect(
      screen.queryByRole('button', { name: 'განახლება' }),
    ).not.toBeInTheDocument()
    expect(linkSearch('შემდეგი გვერდი').get('page')).toBe('2')
    expect(linkSearch('შემდეგი გვერდი').get('q')).toBe('ანა')
    expect(linkSearch('შემდეგი გვერდი').get('status')).toBe('pending')
    expect(linkSearch('სამუშაო დღე').get('sort')).toBe('date-asc')
    expect(linkSearch('სამუშაო დღე').get('page')).toBe('0')
    await user.click(screen.getByRole('button', { name: 'თვის არჩევა' }))
    await user.click(screen.getByRole('button', { name: 'შემდეგი თვე' }))
    expect(calls.navigate).not.toHaveBeenCalled()
    await user.click(
      screen.getByRole('button', { name: 'შაბათი, 5 დეკემბერი 2026' }),
    )
    expect(calls.navigate).toHaveBeenCalledWith({
      search: { ...calls.search, month: '2026-12', page: 0 },
      replace: false,
    })
  })
  it('distinguishes no matches from an empty month and offers URL filter reset', async () => {
    calls.read.mockResolvedValue(response(false))
    render(<CompanyTimesheetsPage />)
    expect(
      await screen.findByRole('heading', {
        name: 'შესაბამისი ჩანაწერები ვერ მოიძებნა',
      }),
    ).toBeVisible()
    const reset = linkSearch('ფილტრების გასუფთავება')
    expect(reset.has('q')).toBe(false)
    expect(reset.has('status')).toBe(false)
    expect(reset.get('month')).toBe('2026-11')
  })
  it('keeps a failed request distinct from an empty result and supports retry', async () => {
    calls.read.mockResolvedValueOnce({ ok: false, message: 'შეცდომა' })
    render(<CompanyTimesheetsPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'სამუშაო საათები ვერ ჩაიტვირთა.',
    )
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'ხელახლა ცდა' }))
    await waitFor(() => expect(screen.getByRole('table')).toBeVisible())
  })
})
