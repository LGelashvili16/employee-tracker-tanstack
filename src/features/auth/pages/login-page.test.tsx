import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnchorHTMLAttributes } from 'react'
import { LoginPage } from './login-page'

const signIn = vi.hoisted(() => vi.fn())
vi.mock('#/lib/auth/auth-client', () => ({
  authClient: { signIn: { email: signIn } },
}))
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    clearCache: vi.fn(),
    invalidate: vi.fn(),
    navigate: vi.fn(),
  }),
  Link: ({
    to,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props} />
  ),
}))

describe('login interactions', () => {
  beforeEach(() => {
    signIn.mockReset()
  })
  it('links to registration and allows deliberate password visibility', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)
    expect(screen.getByRole('link', { name: 'რეგისტრაცია' })).toHaveAttribute(
      'href',
      '/auth/register',
    )
    const password = screen.getByLabelText('პაროლი', { exact: true })
    expect(password).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'პაროლის ჩვენება' }))
    expect(password).toHaveAttribute('type', 'text')
    expect(signIn).not.toHaveBeenCalled()
  })
  it('prevents repeated submissions and shows a spinner while signing in', async () => {
    signIn.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    render(<LoginPage />)
    await user.type(screen.getByLabelText('ელფოსტა'), 'test@example.com')
    await user.type(
      screen.getByLabelText('პაროლი', { exact: true }),
      'test-password',
    )
    await user.click(screen.getByRole('button', { name: 'შესვლა' }))
    const pending = await screen.findByRole('button', {
      name: 'მიმდინარეობს შესვლა…',
    })
    await waitFor(() => expect(pending).toBeDisabled())
    expect(pending).toHaveAttribute('aria-busy', 'true')
    expect(pending.querySelector('[data-slot="spinner"]')).not.toBeNull()
    expect(signIn).toHaveBeenCalledTimes(1)
  })
})
