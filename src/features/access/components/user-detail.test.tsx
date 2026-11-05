import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { UserDetail } from './user-detail'
import type { Actor } from '#/lib/authorization/actor'
import type { EmployeeAccountRecord } from '../access.types'

const { getEmployeeAccount } = vi.hoisted(() => ({
  getEmployeeAccount: vi.fn(),
}))
vi.mock('../access.functions', () => ({
  getEmployeeAccount,
  updateEmployeeAccount: vi.fn(),
  updateEmployeeDetails: vi.fn(),
}))
vi.mock('#/features/scheduling/scheduling.functions', () => ({
  getScheduleSettings: vi.fn().mockResolvedValue({ ok: false, message: '' }),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    ...props
  }: {
    to: string
    children: React.ReactNode
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

const actor: Actor = {
  id: 'administrator',
  name: 'ადმინისტრატორი',
  email: null,
  emailVerified: false,
  roles: ['admin'],
}
const record: EmployeeAccountRecord = {
  userId: 'employee',
  name: 'ანა მაისურაძე',
  code: 'worker-01',
  contactEmail: 'ana@example.com',
  jobTitle: 'დიზაინერი',
  phone: '+995 555 12 34 56',
  roles: 'employee',
  state: 'active',
  employmentStatus: 'active',
  workingWeek: null,
}
const companyWeek = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  weekday,
  hours: weekday < 6 ? { start: '10:00', end: '19:00' } : null,
}))

function renderDetail(
  overrides: Partial<EmployeeAccountRecord> = {},
  currentActor = actor,
) {
  getEmployeeAccount.mockResolvedValue({
    ok: true,
    value: { record: { ...record, ...overrides }, companyWeek },
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <UserDetail userId="employee" actor={currentActor} />
    </QueryClientProvider>,
  )
}

describe('single account page', () => {
  it('shows personal data, the inherited working week and management actions', async () => {
    renderDetail()
    expect(
      await screen.findByRole('heading', { name: 'ანა მაისურაძე' }),
    ).toBeVisible()
    expect(screen.getByText('ana@example.com')).toBeVisible()
    expect(screen.getByText('დიზაინერი')).toBeVisible()
    expect(screen.getByText('კომპანიის განრიგი')).toBeVisible()
    expect(
      screen.getByText('ორშაბათი: 10:00-დან 19:00-მდე'),
    ).toBeInTheDocument()
    expect(screen.getByText('აღდგენის კოდის გაცემა')).toBeVisible()
    expect(screen.getByRole('button', { name: 'რედაქტირება' })).toBeVisible()
  })

  it('opens the confirmation dialog for an action', async () => {
    const user = userEvent.setup()
    renderDetail()
    await user.click(await screen.findByRole('button', { name: 'შეჩერება' }))
    expect(
      await screen.findByRole('dialog', { name: 'წვდომის შეჩერება' }),
    ).toBeVisible()
  })

  it('hides editing and actions for the administrator themselves', async () => {
    renderDetail({ userId: 'administrator' })
    await screen.findByRole('heading', { name: 'ანა მაისურაძე' })
    expect(screen.queryByRole('button', { name: 'რედაქტირება' })).toBeNull()
    expect(
      screen.getByText('ამ ანგარიშზე ამჟამად ხელმისაწვდომი მოქმედება არ არის.'),
    ).toBeVisible()
  })

  it('reports a missing account', async () => {
    getEmployeeAccount.mockResolvedValue({ ok: true, value: null })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <UserDetail userId="missing" actor={actor} />
      </QueryClientProvider>,
    )
    expect(
      await screen.findByText('თანამშრომლის ანგარიში ვერ მოიძებნა.'),
    ).toBeVisible()
  })
})
