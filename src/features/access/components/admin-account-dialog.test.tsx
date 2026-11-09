import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminAccountDialog } from './admin-account-dialog'
import type { AdminAccount } from '../admin-access.types'

const api = vi.hoisted(() => ({
  save: vi.fn(),
  action: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock('../admin-access.functions', () => ({
  saveAccountAuthorization: api.save,
  performAdminAccountAction: api.action,
}))
vi.mock('sonner', () => ({ toast: { success: api.success, error: api.error } }))
const account: AdminAccount = {
  userId: 'target',
  name: 'ანა მაისურაძე',
  username: 'ana',
  roles: 'employee',
  permissionOverrides: { allow: [], deny: [] },
  state: 'active',
  employmentStatus: 'active',
}
function open(
  action: 'authorization' | 'suspend' | 'revoke_sessions' = 'authorization',
  subject = account,
) {
  const onClose = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AdminAccountDialog
        account={subject}
        action={action}
        owner={false}
        onClose={onClose}
      />
    </QueryClientProvider>,
  )
  return onClose
}
beforeEach(() => {
  vi.clearAllMocks()
  api.save.mockResolvedValue({ ok: true })
  api.action.mockResolvedValue({ ok: true })
})
describe('administrator account controls', () => {
  it('shows existing individual overrides immediately with Georgian labels', () => {
    open('authorization', {
      ...account,
      permissionOverrides: { allow: ['jobs.manage'], deny: [] },
    })
    expect(
      screen.getByRole('button', { name: 'ინდივიდუალური უფლებები (1)' }),
    ).toHaveAttribute('aria-expanded', 'true')
    expect(
      screen.getByRole('combobox', { name: 'სამუშაოების მართვა' }),
    ).toHaveTextContent('დაშვება')
  })
  it('saves role changes and an explicit permission denial with a reason and concurrency snapshot', async () => {
    const user = userEvent.setup()
    const onClose = open()
    expect(
      screen.getByRole('checkbox', { name: 'კომპანიის მფლობელი' }),
    ).toHaveAttribute('aria-disabled', 'true')
    await user.click(
      screen.getByRole('checkbox', { name: 'პერსონალის მენეჯერი' }),
    )
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'ინდივიდუალური უფლებები (0)' }),
    )
    expect(
      screen.getByRole('combobox', { name: 'სამუშაოების მართვა' }),
    ).toHaveTextContent('როლიდან: აკრძალულია')
    await user.click(
      screen.getByRole('combobox', { name: 'სამუშაოების მართვა' }),
    )
    await user.click(await screen.findByRole('option', { name: /^აკრძალვა$/ }))
    expect(
      screen.getByRole('combobox', { name: 'სამუშაოების მართვა' }),
    ).toHaveTextContent('აკრძალვა')
    await user.type(
      screen.getByRole('textbox', { name: /მიზეზი/ }),
      'დამტკიცებული წვდომის ცვლილება.',
    )
    await user.click(screen.getByRole('button', { name: 'დადასტურება' }))
    await waitFor(() =>
      expect(api.save).toHaveBeenCalledWith({
        data: {
          userId: 'target',
          roles: ['employee', 'hr_manager'],
          permissionOverrides: { allow: [], deny: ['jobs.manage'] },
          expectedRoles: 'employee',
          expectedOverrides: { allow: [], deny: [] },
          reason: 'დამტკიცებული წვდომის ცვლილება.',
        },
      }),
    )
    expect(api.success).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
  it('does not suspend an account without a valid reason and keeps failed input available', async () => {
    const user = userEvent.setup()
    const onClose = open('suspend')
    await user.click(screen.getByRole('button', { name: 'დადასტურება' }))
    expect(api.action).not.toHaveBeenCalled()
    expect(
      await screen.findByText('მიუთითეთ მოქმედების მიზეზი, მინიმუმ 5 სიმბოლო.'),
    ).toBeVisible()
    api.action.mockResolvedValue({
      ok: false,
      message: 'უფლებები შეიცვალა. განაახლეთ სია.',
    })
    await user.type(
      screen.getByRole('textbox', { name: /მიზეზი/ }),
      'უსაფრთხოების შემოწმების მიზეზი.',
    )
    await user.click(screen.getByRole('button', { name: 'დადასტურება' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'უფლებები შეიცვალა.',
    )
    expect(screen.getByRole('textbox', { name: /მიზეზი/ })).toHaveValue(
      'უსაფრთხოების შემოწმების მიზეზი.',
    )
    expect(api.error).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })
})
