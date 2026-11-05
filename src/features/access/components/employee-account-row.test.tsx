import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EmployeeAccountRow } from './employee-account-row'
import type { Actor } from '#/lib/authorization/actor'
import type { EmployeeAccountRecord } from '../access.types'

vi.mock('../access.functions', () => ({ updateEmployeeAccount: vi.fn() }))
const actor: Actor = {
  id: 'administrator',
  name: 'ადმინისტრატორი',
  email: null,
  emailVerified: false,
  roles: ['admin'],
}
const employee: EmployeeAccountRecord = {
  userId: 'employee',
  name: 'ანა მაისურაძე',
  code: 'worker-01',
  contactEmail: null,
  jobTitle: null,
  phone: null,
  roles: 'employee',
  state: 'invited',
  employmentStatus: 'active',
}

function renderRow(record: EmployeeAccountRecord, currentActor = actor) {
  const onAction = vi.fn()
  render(
    <ul>
      <EmployeeAccountRow
        record={record}
        actor={currentActor}
        onAction={onAction}
      />
    </ul>,
  )
  return onAction
}

describe('employee account actions', () => {
  it('offers activation and suspension for an invited employee', async () => {
    const user = userEvent.setup()
    const onAction = renderRow(employee)
    expect(screen.getByText('გასააქტიურებელი')).toBeVisible()
    await user.click(
      screen.getByRole('button', { name: 'ანა მაისურაძე: მოქმედებები' }),
    )
    expect(
      screen.queryByRole('menuitem', { name: 'აღდგენის კოდის გაცემა' }),
    ).not.toBeInTheDocument()
    await user.click(
      await screen.findByRole('menuitem', {
        name: 'გააქტიურების კოდის გაცემა',
      }),
    )
    expect(onAction).toHaveBeenCalledExactlyOnceWith('issue_activation')
  })

  it.each([
    { ...employee, userId: actor.id },
    { ...employee, roles: 'owner' },
    { ...employee, roles: 'admin' },
  ])(
    'hides actions for self or privileged account $userId / $roles',
    (record) => {
      renderRow(record)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    },
  )

  it('does not offer restoration when employment is inactive', () => {
    renderRow({
      ...employee,
      state: 'suspended',
      employmentStatus: 'terminated',
    })
    expect(screen.getByText('დასაქმება შეჩერებულია')).toBeVisible()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('lets an owner open the restoration action for another privileged account', async () => {
    const user = userEvent.setup()
    const onAction = renderRow(
      { ...employee, roles: 'admin', state: 'suspended' },
      { ...actor, roles: ['owner'] },
    )
    await user.click(
      screen.getByRole('button', { name: 'ანა მაისურაძე: მოქმედებები' }),
    )
    await user.click(
      await screen.findByRole('menuitem', { name: 'წვდომის აღდგენა' }),
    )
    expect(onAction).toHaveBeenCalledExactlyOnceWith('restore')
  })
})
