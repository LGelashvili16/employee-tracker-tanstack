import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Link } from '@tanstack/react-router'
import { TimesheetsWorkspace } from './timesheets-workspace'
import type { Actor } from '#/lib/authorization/actor'
import type { AnchorHTMLAttributes } from 'react'

const api = vi.hoisted(() => ({
  self: vi.fn(),
}))
vi.mock('../timesheets.functions', () => ({
  getOwnTimesheets: api.self,
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params: _params,
    search,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string
    params?: unknown
    search?: Record<string, unknown>
  }) => {
    const query = new URLSearchParams(
      Object.entries(search ?? {})
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)]),
    )
    return <a href={`${to}?${query}`} {...props} />
  },
}))
const actor: Actor = {
  id: 'manager',
  name: 'ანა',
  email: null,
  emailVerified: false,
  roles: ['supervisor'],
}
function response() {
  return {
    ok: true,
    value: {
      month: '2026-11',
      totals: {
        seconds: 3600,
        days: 1,
        pending: 1,
        rejected: 0,
        open: 0,
        approvedOutsideSeconds: 0,
      },
      hasMore: false,
      total: 1,
      pageSize: 50,
      rows: [
        {
          employeeId: 'employee',
          userId: 'worker',
          employeeName: 'ბექა',
          date: '2026-11-05',
          timezone: 'Asia/Tbilisi',
          firstIn: '2026-11-05T06:00:00Z',
          lastOut: '2026-11-05T07:00:00Z',
          seconds: 3600,
          pending: 1,
          rejected: 0,
          open: 0,
          approvedOutsideSeconds: 0,
        },
      ],
    },
  }
}
beforeEach(() => {
  vi.clearAllMocks()
  api.self.mockResolvedValue(response())
})
describe('timesheet views', () => {
  it('uses the self-service endpoint for personal timesheets', async () => {
    render(
      <TimesheetsWorkspace
        actor={actor}
        search={{ month: '2026-11' }}
        onSearchChange={vi.fn()}
        renderLink={(search) => <Link to="/timesheets" search={search} />}
      />,
    )
    await screen.findByRole('table')
    expect(api.self).toHaveBeenCalled()
  })
  it('preserves personal filters in server reads, sorting, and pagination links', async () => {
    const data = response()
    data.value.total = 101
    api.self.mockResolvedValue(data)
    render(
      <TimesheetsWorkspace
        actor={actor}
        search={{ month: '2026-11', status: 'pending', sort: 'date-desc' }}
        onSearchChange={vi.fn()}
        renderLink={(search) => <Link to="/timesheets" search={search} />}
      />,
    )
    await screen.findByRole('table')
    expect(api.self).toHaveBeenCalledWith({
      data: { month: '2026-11', status: 'pending', sort: 'date-desc', page: 0 },
    })
    expect(
      screen.queryByRole('columnheader', { name: 'თანამშრომელი' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'თვის არჩევა' }),
    ).toHaveTextContent('ნოემბერი 2026')
    const next = new URL(
      screen
        .getByRole('link', { name: 'შემდეგი გვერდი' })
        .getAttribute('href') ?? '',
      'http://localhost',
    )
    expect(next.searchParams.get('page')).toBe('1')
    expect(next.searchParams.get('status')).toBe('pending')
    expect(next.searchParams.get('month')).toBe('2026-11')
    const sort = new URL(
      screen.getByRole('link', { name: 'სამუშაო დღე' }).getAttribute('href') ??
        '',
      'http://localhost',
    )
    expect(sort.searchParams.get('sort')).toBe('date-asc')
    expect(sort.searchParams.get('status')).toBe('pending')
    expect(sort.searchParams.get('page')).toBe('0')
  })
  it('retains the departure date for overnight records in the compact table', async () => {
    const data = response()
    data.value.rows[0].lastOut = '2026-11-06T03:00:00Z'
    api.self.mockResolvedValue(data)
    render(
      <TimesheetsWorkspace
        actor={actor}
        search={{ month: '2026-11' }}
        onSearchChange={vi.fn()}
        renderLink={(search) => <Link to="/timesheets" search={search} />}
      />,
    )
    const table = await screen.findByRole('table')
    expect(table).toHaveTextContent('5 ნოე')
    expect(table).toHaveTextContent('6 ნოე')
    expect(table).toHaveTextContent('07:00')
  })
  it('keeps a failed read distinct from an empty month', async () => {
    api.self.mockResolvedValue({ ok: false, message: 'შეცდომა' })
    render(
      <TimesheetsWorkspace
        actor={actor}
        search={{ month: '2026-11' }}
        onSearchChange={vi.fn()}
        renderLink={(search) => <Link to="/timesheets" search={search} />}
      />,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'სამუშაო საათები ვერ ჩაიტვირთა.',
    )
    await waitFor(() =>
      expect(screen.queryByRole('table')).not.toBeInTheDocument(),
    )
  })
})
