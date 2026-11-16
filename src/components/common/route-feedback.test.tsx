import { render, screen } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { RouteError } from './route-feedback'

afterEach(() => vi.restoreAllMocks())

it('offers a full reload of the failed URL and a dashboard link without exposing internal errors', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  const root = createRootRoute({
    component: Outlet,
    errorComponent: RouteError,
  })
  const failed = createRoute({
    getParentRoute: () => root,
    path: '/manage/devices',
    component: () => {
      throw new Error('private failure details')
    },
  })
  const dashboard = createRoute({
    getParentRoute: () => root,
    path: '/dashboard',
    component: () => null,
  })
  const url = '/manage/devices?page=1&q=&state=pending&sort=newest'
  const router = createRouter({
    routeTree: root.addChildren([failed, dashboard]),
    history: createMemoryHistory({ initialEntries: [url] }),
  })
  render(<RouterProvider router={router} />)
  expect(
    await screen.findByRole('heading', {
      name: 'გვერდის გახსნა ვერ მოხერხდა',
      level: 1,
    }),
  ).toBeVisible()
  expect(screen.getByRole('link', { name: 'ხელახლა ცდა' })).toHaveAttribute(
    'href',
    url,
  )
  expect(
    screen.getByRole('link', { name: 'მთავარ გვერდზე დაბრუნება' }),
  ).toHaveAttribute('href', '/dashboard')
  expect(screen.queryByText('private failure details')).not.toBeInTheDocument()
})
