import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'
import type { AnchorHTMLAttributes } from 'react'
import { AnnouncementsPage } from './announcements-page'

const listTotal = vi.hoisted(() => ({ value: 1 }))
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: ({
    to,
    search: _search,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string
    search?: Record<string, string | number | undefined>
  }) => (
    <a
      href={`${to}?${new URLSearchParams(
        Object.entries(_search ?? {}).flatMap(([key, value]) =>
          value === undefined ? [] : [[key, String(value)]],
        ),
      )}`}
      {...props}
    />
  ),
}))

vi.mock('../announcements.functions', () => ({
  getAnnouncements: async () => ({
    ok: true,
    value: {
      total: listTotal.value,
      items: [
        {
          id: '019aac01-0000-7000-8000-000000000001',
          title: 'კომპანიის სიახლე',
          authorName: 'ანა მაისურაძე',
          publishedAt: '2026-11-10T09:00:00Z',
          showOnLogin: true,
          readAt: null,
        },
      ],
    },
  }),
  getAnnouncementDetail: vi.fn(),
  getPendingAnnouncement: vi.fn(),
  createAnnouncement: vi.fn(),
  markAnnouncement: vi.fn(),
}))
function page(
  manage: boolean,
  search = { page: 1, q: '', status: 'all' as const, sort: 'newest' as const },
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <AnnouncementsPage
        manage={manage}
        actorId="worker"
        search={search}
        onSearch={vi.fn()}
      />
    </QueryClientProvider>,
  )
}

it('renders the employee table without the delivery column', async () => {
  page(false)
  expect(
    await screen.findByRole('columnheader', { name: 'განცხადება' }),
  ).toBeVisible()
  expect(screen.getByRole('table')).toBeVisible()
  expect(screen.getByRole('link', { name: 'გვერდი 1' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  expect(screen.getByText('სულ: 1. გვერდი 1 / 1')).toBeVisible()
  expect(screen.getByRole('columnheader', { name: 'სტატუსი' })).toBeVisible()
  expect(
    screen.getByRole('heading', { level: 1, name: 'განცხადებები' }),
  ).toBeVisible()
  expect(
    screen.queryByRole('columnheader', { name: 'ტიპი' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'ახალი განცხადება' }),
  ).not.toBeInTheDocument()
})

it('keeps publishing and delivery details in the management table', async () => {
  page(true)
  expect(
    await screen.findByRole('columnheader', { name: 'ტიპი' }),
  ).toBeVisible()
  expect(screen.getByText('მოდალი')).toBeVisible()
  expect(screen.getByRole('columnheader', { name: 'ავტორი' })).toBeVisible()
  expect(screen.getByText('ანა მაისურაძე')).toBeVisible()
  expect(
    screen.queryByRole('columnheader', { name: 'სტატუსი' }),
  ).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'ახალი განცხადება' })).toBeVisible()
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
})

it('preserves announcement filters when navigating between pages', async () => {
  listTotal.value = 45
  try {
    page(false, { page: 1, q: 'news', status: 'all', sort: 'newest' })
    const next = await screen.findByRole('link', { name: 'გვერდი 2' })
    expect(next.getAttribute('href')).toContain('q=news')
    expect(next.getAttribute('href')).toContain('page=2')
    expect(next.getAttribute('href')).toContain('sort=newest')
    expect(next.getAttribute('href')).toContain('status=all')
  } finally {
    listTotal.value = 1
  }
})
