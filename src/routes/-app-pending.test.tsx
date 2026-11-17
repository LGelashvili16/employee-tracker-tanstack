import { render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { AppPending } from './-app-pending'

const state = vi.hoisted(() => ({
  matches: [{ routeId: '/_authenticated' }],
  location: { pathname: '/dashboard' },
}))
vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({ select }: { select: (value: typeof state) => unknown }) =>
    select(state),
}))
vi.mock('#/hooks/use-mobile', () => ({ useIsMobile: () => false }))
beforeEach(() => {
  state.matches = [{ routeId: '/_authenticated' }]
  state.location.pathname = '/dashboard'
})
it('reserves the private sidebar and inset while announcing loading once', () => {
  const { container } = render(<AppPending />)
  expect(screen.getAllByRole('status')).toHaveLength(1)
  expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
  expect(container.querySelector('[data-slot="sidebar"]')).toHaveAttribute(
    'data-variant',
    'inset',
  )
  expect(container.querySelector('[data-slot="sidebar-inset"]')).toHaveClass(
    'm-2',
    'rounded-xl',
  )
  expect(container.querySelector('.xl\\:grid-cols-4')).toBeInTheDocument()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
it('keeps public route loading outside the private shell', () => {
  state.matches = [{ routeId: '/auth/login' }]
  state.location.pathname = '/auth/login'
  const { container } = render(<AppPending />)
  expect(
    container.querySelector('[data-slot="sidebar"]'),
  ).not.toBeInTheDocument()
  expect(screen.getAllByRole('status')).toHaveLength(1)
})
it('does not nest loading announcements on other private pages', () => {
  state.location.pathname = '/attendance'
  render(<AppPending />)
  expect(screen.getAllByRole('status')).toHaveLength(1)
})
