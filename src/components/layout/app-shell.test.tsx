import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import type { AnchorHTMLAttributes } from 'react'
import { AppShell } from './app-shell'

const mocks = vi.hoisted(() => ({
  path: '/manage/schedule',
  signOut: vi.fn(),
  router: { clearCache: vi.fn(), navigate: vi.fn(), invalidate: vi.fn() },
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock('#/features/announcements/components/login-announcement', () => ({
  LoginAnnouncement: () => null,
}))
vi.mock('#/hooks/use-mobile', () => ({ useIsMobile: () => false }))
vi.mock('#/components/ThemeToggle', () => ({ default: () => null }))
vi.mock('#/components/common/pwa-install-button', () => ({
  PwaInstallButton: () => null,
}))
vi.mock('#/lib/auth/auth-client', () => ({
  authClient: { signOut: mocks.signOut },
}))
vi.mock('sonner', () => ({
  toast: { success: mocks.success, error: mocks.error },
}))
vi.mock('@tanstack/react-router', () => ({
  useLocation: () => mocks.path,
  useRouter: () => mocks.router,
  Outlet: () => <div>გვერდის შიგთავსი</div>,
  Link: ({
    to,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props} />
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.path = '/manage/schedule'
  mocks.signOut.mockResolvedValue({})
})
it('uses the attendance section breadcrumb on an employee detail page', () => {
  mocks.path = '/manage/attendance/worker'
  render(<AppShell actor={actor} />)
  expect(
    screen.getByRole('navigation', { name: 'გვერდის მდებარეობა' }),
  ).toHaveTextContent('დასწრებები')
})
const actor = {
  id: 'admin',
  name: 'ტესტი',
  email: null,
  emailVerified: false,
  roles: ['admin'] as Array<'admin'>,
}

it('uses management navigation, the breadcrumb, and the account menu on attendance rules', () => {
  const { container } = render(<AppShell actor={actor} />)
  expect(container.querySelector('[data-slot="sidebar"]')).toHaveAttribute(
    'data-variant',
    'inset',
  )
  expect(screen.getByRole('link', { name: 'დასწრება' })).toHaveAttribute(
    'href',
    '/attendance',
  )
  expect(
    within(
      container.querySelector<HTMLElement>('[data-slot="sidebar"]') ??
        container,
    ).getByRole('link', { name: 'სამუშაო განრიგი' }),
  ).toHaveAttribute('data-active')
  expect(
    screen.getByRole('navigation', { name: 'გვერდის მდებარეობა' }),
  ).toHaveTextContent('სამუშაო განრიგი')
  expect(
    screen.getByRole('button', { name: 'ანგარიშის მენიუ' }),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('link', { name: 'სამუშაო სივრცეში დაბრუნება' }),
  ).not.toBeInTheDocument()
  expect(screen.getByText('მართვა')).toBeInTheDocument()
  expect(screen.getByText('ადმინისტრირება')).toBeInTheDocument()
  expect(
    screen.queryByRole('button', {
      name: 'ანგარიშიდან გამოსვლა',
    }),
  ).not.toBeInTheDocument()
})

it('keeps sign-out accessible from the shared account menu', async () => {
  const user = userEvent.setup()
  render(<AppShell actor={actor} />)
  await user.click(screen.getByRole('button', { name: 'ანგარიშის მენიუ' }))
  await user.click(await screen.findByRole('menuitem', { name: 'გამოსვლა' }))
  await waitFor(() =>
    expect(mocks.router.navigate).toHaveBeenCalledWith({ to: '/auth/login' }),
  )
  expect(mocks.router.clearCache).toHaveBeenCalledOnce()
  expect(mocks.signOut).toHaveBeenCalledOnce()
  expect(mocks.success).toHaveBeenCalledExactlyOnceWith(
    'ანგარიშიდან გამოხვედით.',
  )
})
