import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { AdminAccountsTable } from './admin-accounts-table'
import type { AdminAccount } from '../admin-access.types'
import type { AnchorHTMLAttributes } from 'react'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    search: _search,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string
    search?: unknown
  }) => <a href={to} {...props} />,
}))
const base: AdminAccount = {
  userId: 'other',
  name: 'სხვა ადმინისტრატორი',
  username: 'other',
  roles: 'admin',
  permissionOverrides: { allow: [], deny: [] },
  state: 'active',
  employmentStatus: null,
}
it('protects owner and self controls while allowing an administrator to manage another administrator', async () => {
  const user = userEvent.setup()
  const onAction = vi.fn()
  render(
    <AdminAccountsTable
      items={[
        { ...base, userId: 'owner', name: 'დაცული მფლობელი', roles: 'owner' },
        { ...base, userId: 'self', name: 'ჩემი ანგარიში' },
        base,
      ]}
      actor={{
        id: 'self',
        name: 'ჩემი ანგარიში',
        email: null,
        emailVerified: false,
        roles: ['admin'],
      }}
      search={{}}
      onAction={onAction}
    />,
  )
  const rows = screen.getAllByRole('row').slice(1)
  for (const row of rows.slice(0, 2))
    expect(within(row).getByRole('button')).toBeDisabled()
  expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
  await user.click(
    within(rows[2]).getByRole('button', {
      name: 'სხვა ადმინისტრატორი: მოქმედებები',
    }),
  )
  expect(
    await screen.findByRole('menuitem', { name: 'წვდომის შეჩერება' }),
  ).toBeVisible()
  expect(
    screen.getByRole('menuitem', { name: 'სესიების გაუქმება' }),
  ).toBeVisible()
  await user.click(screen.getByRole('menuitem', { name: 'როლები და უფლებები' }))
  expect(onAction).toHaveBeenCalledWith(base, 'authorization')
})
