import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnchorHTMLAttributes } from 'react'
import { CompanyAttendancePage } from './company-attendance-page'
import { CompanyAttendanceUserPage } from './company-attendance-user-page'

const calls = vi.hoisted(() => ({
  users: vi.fn(),
  detail: vi.fn(),
  navigate: vi.fn(),
}))
vi.mock('../attendance.functions', () => ({
  readCompanyAttendanceUsers: calls.users,
  readCompanyUserAttendance: calls.detail,
}))
vi.mock('@tanstack/react-router', () => ({
  getRouteApi: (id: string) => ({
    useRouteContext: () => ({ actor: { id: 'admin', roles: ['admin'] } }),
    useSearch: () =>
      id.endsWith('$userId')
        ? { page: 1, sort: 'date-desc' }
        : { page: 2, q: 'ანა', sort: 'name-asc' },
    useParams: () => ({ userId: 'worker' }),
    useNavigate: () => calls.navigate,
  }),
  useLocation: ({
    select,
  }: {
    select: (value: { pathname: string }) => unknown
  }) => select({ pathname: '/admin/attendance' }),
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

function mount(page: 'users' | 'detail') {
  render(
    <QueryClientProvider client={new QueryClient()}>
      {page === 'users' ? (
        <CompanyAttendancePage />
      ) : (
        <CompanyAttendanceUserPage />
      )}
    </QueryClientProvider>,
  )
}
function linkSearch(name: string) {
  const href = screen.getByRole('link', { name }).getAttribute('href')
  return new URL(href ?? '', 'http://localhost').searchParams
}
beforeEach(() => {
  vi.clearAllMocks()
  calls.users.mockResolvedValue({
    ok: true,
    value: {
      items: [
        {
          userId: 'worker',
          name: 'ანა',
          username: 'worker-1',
          state: 'active',
          sessionCount: 0,
        },
      ],
      total: 41,
      page: 2,
      pageSize: 20,
    },
  })
  const row = {
    id: 'one',
    date: '2026-11-05',
    timezone: 'Asia/Tbilisi',
    startedAt: '2026-11-05T06:00:00Z',
    endedAt: '2026-11-05T07:00:00Z',
    expectedStartAt: '2026-11-05T06:00:00Z',
    expectedEndAt: '2026-11-05T15:00:00Z',
    reviewState: 'pending',
  }
  calls.detail.mockResolvedValue({
    ok: true,
    value: {
      subject: {
        userId: 'worker',
        employeeId: 'employee',
        name: 'ანა',
        username: 'worker-1',
      },
      days: ['2026-11-05', '2026-11-04'],
      totalDays: 11,
      page: 1,
      pageSize: 10,
      serverNow: '2026-11-05T10:00:00Z',
      sessions: [
        row,
        {
          ...row,
          id: 'two',
          startedAt: '2026-11-05T08:00:00Z',
          endedAt: '2026-11-05T09:00:00Z',
        },
        { ...row, id: 'three', date: '2026-11-04' },
      ],
    },
  })
})
describe('company attendance navigation', () => {
  it('lists empty accounts, opens the dynamic user URL and preserves URL search and sort when paginating', async () => {
    mount('users')
    expect(
      await screen.findByRole('link', { name: 'სესიების ნახვა: ანა' }),
    ).toHaveAttribute('href', '/admin/attendance/worker')
    expect(screen.getByRole('cell', { name: '0' })).toBeVisible()
    expect(calls.users).toHaveBeenCalledWith({
      data: { page: 2, q: 'ანა', sort: 'name-asc' },
    })
    expect(screen.getByRole('navigation', { name: 'გვერდები' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'გვერდი 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(linkSearch('შემდეგი გვერდი').get('page')).toBe('3')
    expect(linkSearch('შემდეგი გვერდი').get('q')).toBe('ანა')
    expect(linkSearch('შემდეგი გვერდი').get('sort')).toBe('name-asc')
    expect(linkSearch('მომხმარებლის სახელი').get('sort')).toBe('username-asc')
    expect(linkSearch('მომხმარებლის სახელი').get('page')).toBe('1')
  })
  it('validates search and resets pagination for a new query', async () => {
    const user = userEvent.setup()
    mount('users')
    await screen.findByRole('table')
    const input = screen.getByLabelText('თანამშრომლის ძიება')
    await user.clear(input)
    await user.type(input, 'ბექა')
    await user.keyboard('{Enter}')
    expect(calls.navigate).toHaveBeenCalledWith({
      search: { page: 1, q: 'ბექა', state: undefined, sort: 'name-asc' },
      replace: false,
    })
    calls.navigate.mockClear()
    await user.clear(input)
    await user.type(input, 'ა'.repeat(101))
    await user.keyboard('{Enter}')
    expect(
      await screen.findByText('ძიება მაქსიმუმ 100 სიმბოლოს უნდა შეიცავდეს.'),
    ).toBeVisible()
    expect(calls.navigate).not.toHaveBeenCalled()
  })
  it('groups sessions by day and offers day pagination and URL sort links', async () => {
    mount('detail')
    expect(await screen.findByRole('heading', { name: 'ანა' })).toBeVisible()
    expect(screen.getByText('სამუშაო დღე: 2026-11-05')).toBeVisible()
    expect(screen.getByText('სამუშაო დღე: 2026-11-04')).toBeVisible()
    expect(screen.getAllByRole('table')).toHaveLength(2)
    expect(calls.detail).toHaveBeenCalledWith({
      data: { userId: 'worker', page: 1, sort: 'date-desc' },
    })
    expect(linkSearch('შემდეგი გვერდი').get('page')).toBe('2')
    expect(linkSearch('შემდეგი გვერდი').get('sort')).toBe('date-desc')
    expect(linkSearch('ჯერ ძველი').get('page')).toBe('1')
    expect(linkSearch('ჯერ ძველი').get('sort')).toBe('date-asc')
    expect(
      screen.queryByRole('button', { name: 'შესწორება' }),
    ).not.toBeInTheDocument()
  })
})
