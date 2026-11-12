import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnchorHTMLAttributes } from 'react'
import { CompanyAttendancePage } from './company-attendance-page'
import { CompanyAttendanceUserPage } from './company-attendance-user-page'
import type { z } from 'zod'
import type { companyAttendanceUserSearchSchema } from '../company-attendance.schemas'
import type { Role, PermissionOverrides } from '#/lib/authorization/permissions'

const calls = vi.hoisted(() => {
  const detailSearch: z.input<typeof companyAttendanceUserSearchSchema> = {
    date: undefined,
  }
  const permissionOverrides: PermissionOverrides = { allow: [], deny: [] }
  return {
    users: vi.fn(),
    detail: vi.fn(),
    navigate: vi.fn(),
    hours: vi.fn(),
    detailSearch,
    roles: ['admin'] as Array<Role>,
    permissionOverrides,
  }
})
vi.mock('#/features/timesheets/timesheets.functions', () => ({
  getCompanyTimesheets: calls.hours,
}))
vi.mock('../attendance.functions', () => ({
  readCompanyAttendanceUsers: calls.users,
  readCompanyUserAttendance: calls.detail,
}))
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => calls.navigate,
  getRouteApi: (id: string) => ({
    useRouteContext: () => ({
      actor: {
        id: 'admin',
        roles: calls.roles,
        permissionOverrides: calls.permissionOverrides,
      },
    }),
    useSearch: () =>
      id.endsWith('$userId')
        ? calls.detailSearch
        : { page: 2, q: 'ანა', sort: 'name-asc' },
    useParams: () => ({ userId: 'worker' }),
    useNavigate: () => calls.navigate,
  }),
  useLocation: ({
    select,
  }: {
    select: (value: { pathname: string }) => unknown
  }) => select({ pathname: '/manage/attendance' }),
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
  calls.roles = ['admin']
  calls.permissionOverrides = { allow: [], deny: [] }
  calls.detailSearch = {}
  calls.hours.mockResolvedValue({
    ok: true,
    value: {
      month: '2026-11',
      total: 0,
      pageSize: 50,
      rows: [],
      totals: {
        records: 0,
        days: 0,
        seconds: 0,
        approvedOutsideSeconds: 0,
        open: 0,
        pending: 0,
        rejected: 0,
      },
    },
  })
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
      date: '2026-11-05',
      today: '2026-11-05',
      companyTimezone: 'Asia/Tbilisi',
      serverNow: '2026-11-05T10:00:00Z',
      sessions: [
        row,
        {
          ...row,
          id: 'two',
          startedAt: '2026-11-05T08:00:00Z',
          endedAt: '2026-11-05T09:00:00Z',
        },
      ],
    },
  })
})
describe('company attendance navigation', () => {
  it('opens the dynamic employee route from non-link row content', async () => {
    const user = userEvent.setup()
    mount('users')
    await user.click(await screen.findByText('worker-1'))
    expect(calls.navigate).toHaveBeenCalledExactlyOnceWith({
      to: '/manage/attendance/$userId',
      params: { userId: 'worker' },
    })
  })
  it('preserves modified clicks, text selection and the native employee link', async () => {
    mount('users')
    const cell = await screen.findByText('worker-1')
    for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey']) {
      fireEvent.click(cell, { [modifier]: true })
    }
    fireEvent.click(cell, { button: 1 })
    const selection = vi
      .spyOn(window, 'getSelection')
      .mockReturnValue({ toString: () => 'worker' } as Selection)
    fireEvent.click(cell)
    selection.mockRestore()
    const link = screen.getByRole('link', { name: 'ანა' })
    expect(link).toHaveAttribute('href', '/manage/attendance/worker')
    link.addEventListener('click', (event) => event.preventDefault(), {
      once: true,
    })
    fireEvent.click(link)
    expect(calls.navigate).not.toHaveBeenCalled()
  })
  it.each(['admin', 'supervisor'] as const)(
    'omits the rules shortcut from attendance for %s',
    async (role) => {
      calls.roles = [role]
      mount('users')
      await screen.findByRole('table')
      expect(
        screen.queryByRole('link', { name: 'დასწრების წესები' }),
      ).not.toBeInTheDocument()
    },
  )
  it('opens the employee timesheet while retaining the selected attendance date', async () => {
    calls.detailSearch = {
      date: '2026-11-04',
      view: 'timesheet',
      month: '2026-11',
      hoursPage: 0,
      hoursSort: 'seconds-desc',
      hoursStatus: 'approved',
    }
    mount('detail')
    expect(
      await screen.findByRole('tab', { name: 'სამუშაო საათები' }),
    ).toHaveAttribute('aria-selected', 'true')
    expect(
      await screen.findByRole('heading', {
        name: 'შესაბამისი ჩანაწერები ვერ მოიძებნა',
      }),
    ).toBeVisible()
    expect(calls.hours).toHaveBeenCalledWith({
      data: {
        userId: 'worker',
        month: '2026-11',
        page: 0,
        sort: 'seconds-desc',
        status: 'approved',
      },
    })
    expect(calls.detail).toHaveBeenCalledWith({
      data: { userId: 'worker', date: '2026-11-04', period: 'week' },
    })
    expect(
      screen.queryByRole('textbox', { name: 'თანამშრომლის ძიება' }),
    ).not.toBeInTheDocument()
    const attendance = screen
      .getByRole('tab', { name: 'დასწრებები' })
      .getAttribute('href')
    expect(attendance).toContain('/manage/attendance/worker?')
    expect(attendance).toContain('view=attendance')
    expect(attendance).toContain('date=2026-11-04')
  })
  it('lists empty accounts, opens the dynamic user URL and preserves URL search and sort when paginating', async () => {
    mount('users')
    expect(
      await screen.findByRole('link', { name: 'სესიების ნახვა: ანა' }),
    ).toHaveAttribute('href', '/manage/attendance/worker')
    expect(screen.getByRole('cell', { name: '0' })).toBeVisible()
    expect(
      screen.queryByRole('link', { name: 'დასწრების წესები' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
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
  it('shows a full week in one table and navigates complete weeks through URL state', async () => {
    const user = userEvent.setup()
    mount('detail')
    expect(await screen.findByRole('heading', { name: 'ანა' })).toBeVisible()
    expect(screen.getAllByRole('table')).toHaveLength(1)
    expect(
      screen.getByRole('button', { name: 'სამუშაო კვირის არჩევა' }),
    ).toHaveTextContent('2 ნოემბერი 2026 - 8 ნოემბერი 2026')
    expect(screen.getByRole('button', { name: 'შემდეგი კვირა' })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'მიმდინარე კვირა' }),
    ).toBeDisabled()
    expect(calls.detail).toHaveBeenCalledWith({
      data: { userId: 'worker', period: 'week' },
    })
    expect(
      screen.queryByRole('link', { name: 'ჯერ ძველი' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'გვერდები' }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'წინა კვირა' }))
    expect(calls.navigate).toHaveBeenCalledWith({
      search: { date: '2026-10-26' },
    })
  })
  it('does not imply absence when the selected day has no sessions', async () => {
    calls.detail.mockResolvedValue({
      ok: true,
      value: {
        subject: { userId: 'worker', name: 'ანა' },
        date: '2026-11-04',
        today: '2026-11-05',
        companyTimezone: 'Asia/Tbilisi',
        serverNow: '2026-11-05T10:00:00Z',
        sessions: [],
      },
    })
    mount('detail')
    expect(
      await screen.findByText('არჩეულ კვირაში დასწრების ჩანაწერები არ არის.'),
    ).toBeVisible()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'სამუშაო კვირის არჩევა' }),
    ).toHaveTextContent('2 ნოემბერი 2026 - 8 ნოემბერი 2026')
  })
})
