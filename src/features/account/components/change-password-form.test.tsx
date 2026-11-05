import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChangePasswordForm } from './change-password-form'

const { changePassword } = vi.hoisted(() => ({ changePassword: vi.fn() }))
vi.mock('#/lib/auth/auth-client', () => ({ authClient: { changePassword } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

async function fill(current: string, next: string, confirm: string) {
  const user = userEvent.setup()
  render(<ChangePasswordForm />)
  await user.type(screen.getByLabelText('მიმდინარე პაროლი'), current)
  await user.type(screen.getByLabelText('ახალი პაროლი'), next)
  await user.type(screen.getByLabelText('ახალი პაროლის გამეორება'), confirm)
  await user.click(screen.getByRole('button', { name: 'პაროლის შეცვლა' }))
}

describe('change password form', () => {
  beforeEach(() => changePassword.mockReset())

  it('rejects a short or unconfirmed password without calling the server', async () => {
    await fill('old-password-1', 'short', 'different')
    expect(
      await screen.findByText('პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს.'),
    ).toBeVisible()
    expect(screen.getByText('პაროლები ერთმანეთს არ ემთხვევა.')).toBeVisible()
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('changes the password and signs out other devices', async () => {
    changePassword.mockResolvedValue({ data: {}, error: null })
    await fill('old-password-1', 'new-password-2', 'new-password-2')
    await vi.waitFor(() =>
      expect(changePassword).toHaveBeenCalledExactlyOnceWith({
        currentPassword: 'old-password-1',
        newPassword: 'new-password-2',
        revokeOtherSessions: true,
      }),
    )
  })

  it('explains a wrong current password in Georgian', async () => {
    changePassword.mockResolvedValue({
      data: null,
      error: { status: 400, code: 'INVALID_PASSWORD' },
    })
    await fill('wrong-password', 'new-password-2', 'new-password-2')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'მიმდინარე პაროლი არასწორია.',
    )
  })
})
