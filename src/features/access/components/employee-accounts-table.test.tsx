import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EmployeeAccountsTable } from './employee-accounts-table'
import type { EmployeeAccountSummary } from '../access.types'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
    ...props
  }: {
    to: string
    params: { employeeId: string }
    children?: React.ReactNode
  }) => (
    <a href={to.replace('$employeeId', params.employeeId)} {...props}>
      {children}
    </a>
  ),
}))

const records: Array<EmployeeAccountSummary> = [
  {
    userId: 'u1',
    name: 'ანა მაისურაძე',
    code: 'ana',
    jobTitle: null,
    roles: 'employee',
    state: 'active',
    employmentStatus: 'active',
  },
  {
    userId: 'u2',
    name: 'გიორგი ბერიძე',
    code: 'giorgi',
    jobTitle: null,
    roles: 'hr_manager',
    state: 'invited',
    employmentStatus: 'active',
  },
]

describe('employee accounts table', () => {
  it('lists one lean row per account with a link to its page', () => {
    render(<EmployeeAccountsTable records={records} actorId="u2" />)
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(
      within(rows[0]).getByRole('link', { name: 'ანა მაისურაძე' }),
    ).toHaveAttribute('href', '/manage/employees/u1')
    expect(within(rows[0]).getByText('აქტიური')).toBeVisible()
    expect(within(rows[1]).getByText('გასააქტიურებელი')).toBeVisible()
    expect(within(rows[1]).getByText('თქვენ')).toBeVisible()
    expect(
      within(rows[1]).getByRole('link', { name: 'გიორგი ბერიძე: დეტალები' }),
    ).toHaveAttribute('href', '/manage/employees/u2')
  })
})
