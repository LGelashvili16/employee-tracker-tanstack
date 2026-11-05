import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnchorHTMLAttributes } from 'react'
import { RegisterPage } from './register-page'

const submit = vi.hoisted(() => vi.fn())
vi.mock('#/lib/auth/auth-client', () => ({ authClient: { $fetch: submit } }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props} />
  ),
}))
beforeEach(() => submit.mockReset())

describe('employee account activation', () => {
  it('requires an issued code and matching passwords without collecting email', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)
    expect(screen.queryByLabelText('ელფოსტა')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('ერთჯერადი კოდი'), 'invalid')
    await user.type(
      screen.getByLabelText('ახალი პაროლი'),
      'example-password-123',
    )
    await user.type(
      screen.getByLabelText('პაროლის გამეორება'),
      'different-password',
    )
    await user.click(
      screen.getByRole('button', { name: 'ანგარიშის გააქტიურება' }),
    )
    expect(
      await screen.findByText(
        'მიუთითეთ ადმინისტრატორისგან მიღებული ერთჯერადი კოდი.',
      ),
    ).toBeVisible()
    expect(
      await screen.findByText('პაროლები ერთმანეთს არ ემთხვევა.'),
    ).toBeVisible()
    expect(submit).not.toHaveBeenCalled()
  })

  it('submits to the supported auth endpoint and reports success only after confirmation', async () => {
    submit.mockResolvedValue({ data: { status: true }, error: null })
    const user = userEvent.setup()
    render(<RegisterPage />)
    await user.type(screen.getByLabelText('ერთჯერადი კოდი'), 'A'.repeat(12))
    await user.type(
      screen.getByLabelText('ახალი პაროლი'),
      'example-password-123',
    )
    await user.type(
      screen.getByLabelText('პაროლის გამეორება'),
      'example-password-123',
    )
    await user.click(
      screen.getByRole('button', { name: 'ანგარიშის გააქტიურება' }),
    )
    expect(submit).toHaveBeenCalledWith('/employee-activate', {
      method: 'POST',
      body: { code: 'A'.repeat(12), newPassword: 'example-password-123' },
    })
    expect(await screen.findByRole('status')).toHaveTextContent(
      'პაროლი შენახულია',
    )
    expect(screen.queryByLabelText('ერთჯერადი კოდი')).not.toBeInTheDocument()
  })

  it('prevents repeat submission while pending and maps invalid codes to Georgian', async () => {
    let resolve: (value: { error: { status: number } }) => void = () => {}
    submit.mockReturnValue(
      new Promise((complete) => {
        resolve = complete
      }),
    )
    const user = userEvent.setup()
    render(<RegisterPage />)
    await user.type(screen.getByLabelText('ერთჯერადი კოდი'), 'A'.repeat(12))
    await user.type(
      screen.getByLabelText('ახალი პაროლი'),
      'example-password-123',
    )
    await user.type(
      screen.getByLabelText('პაროლის გამეორება'),
      'example-password-123',
    )
    await user.click(
      screen.getByRole('button', { name: 'ანგარიშის გააქტიურება' }),
    )
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'ანგარიშის გააქტიურება' }),
      ).toBeDisabled(),
    )
    resolve({ error: { status: 400 } })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'კოდი არასწორია, ვადაგასულია ან უკვე გამოყენებულია',
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
