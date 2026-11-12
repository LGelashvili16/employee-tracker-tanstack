import { act, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnchorHTMLAttributes } from 'react'
import type { NotificationItem } from '../notifications.types'
import { NotificationsPopover } from './notifications-popover'
import { NotificationsProvider } from './notifications-provider'

const api = vi.hoisted(() => ({
  read: vi.fn(),
  mark: vi.fn(),
  unseen: vi.fn(),
  all: vi.fn(),
}))
vi.mock('../notifications.functions', () => ({
  getOwnNotifications: api.read,
  markOwnNotifications: api.mark,
  markOwnNotificationsAsUnseen: api.unseen,
  markAllOwnNotifications: api.all,
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    search,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string
    search?: { announcementId?: string }
  }) => (
    <a
      href={
        search?.announcementId
          ? `${to}?announcementId=${search.announcementId}`
          : to
      }
      {...props}
    />
  ),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

let items: Array<NotificationItem>
function setup() {
  const user = userEvent.setup()
  render(
    <NotificationsProvider>
      <NotificationsPopover actorId="account-a" />
    </NotificationsProvider>,
  )
  return user
}
beforeEach(() => {
  vi.clearAllMocks()
  items = [
    {
      id: '019aac01-0000-7000-8000-000000000001',
      title: 'განრიგი განახლდა',
      body: 'თქვენი სამუშაო განრიგი შეიცვალა.',
      createdAt: '2026-11-05T08:00:00Z',
      seenAt: null,
    },
  ]
  api.read.mockImplementation(async () => ({
    ok: true,
    value: {
      items: [...items],
      unseenCount: items.filter((item) => !item.seenAt).length,
      hasMore: false,
    },
  }))
  api.all.mockImplementation(async () => {
    items = items.map((item) => ({ ...item, seenAt: '2026-11-05T09:00:00Z' }))
    return { ok: true, value: { updatedCount: items.length } }
  })
  api.mark.mockImplementation(
    async ({ data }: { data: { ids: Array<string> } }) => {
      items = items.map((item) =>
        data.ids.includes(item.id)
          ? { ...item, seenAt: '2026-11-05T09:00:00Z' }
          : item,
      )
      return { ok: true, value: { updatedCount: data.ids.length } }
    },
  )
  api.unseen.mockImplementation(
    async ({ data }: { data: { ids: Array<string> } }) => {
      items = items.map((item) =>
        data.ids.includes(item.id) ? { ...item, seenAt: null } : item,
      )
      return { ok: true, value: { updatedCount: data.ids.length } }
    },
  )
})

describe('notifications popover', () => {
  it('clears older unread notifications beyond the read preview', async () => {
    items = Array.from({ length: 7 }, (_, index) => ({
      ...items[0],
      id: `notice-${index}`,
      title: `განახლება ${index}`,
      seenAt: index < 5 ? '2026-11-05T09:00:00Z' : null,
    }))
    api.read.mockImplementation(async () => ({
      ok: true,
      value: {
        items: items.slice(0, 5),
        unseenCount: items.filter((item) => !item.seenAt).length,
        hasMore: true,
      },
    }))
    const user = setup()
    await user.click(
      await screen.findByRole('button', {
        name: 'შეტყობინებები, ახალი შეტყობინება',
      }),
    )
    await user.click(
      await screen.findByRole('button', {
        name: 'ყველა შეტყობინების ნანახად მონიშვნა',
      }),
    )
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: 'შეტყობინებები' })
          .querySelector('[data-slot="notification-unread-dot"]'),
      ).toBeNull(),
    )
    expect(api.all).toHaveBeenCalledWith({ data: {} })
    expect(items.every((item) => item.seenAt !== null)).toBe(true)
  })

  it('links announcement alerts to their full content and closes the bell popup', async () => {
    items = [
      {
        ...items[0],
        announcementId: '019aac01-0000-7000-8000-000000000002',
        title: 'ახალი განცხადება',
      },
    ]
    const user = setup()
    await user.click(screen.getByRole('button', { name: /შეტყობინებები/ }))
    const link = await screen.findByRole('link', { name: 'ახალი განცხადება' })
    expect(link).toHaveAttribute(
      'href',
      '/announcements?announcementId=019aac01-0000-7000-8000-000000000002',
    )
    await user.click(link)
    await waitFor(() =>
      expect(
        screen.queryByRole('link', { name: 'ახალი განცხადება' }),
      ).not.toBeInTheDocument(),
    )
  })
  it('restores the row and bell dots when a seen notification is marked unseen', async () => {
    items = items.map((item) => ({ ...item, seenAt: '2026-11-05T09:00:00Z' }))
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'შეტყობინებები' }))
    await user.click(
      await screen.findByRole('button', {
        name: 'წაუკითხავად მონიშვნა: განრიგი განახლდა',
      }),
    )
    const bell = await screen.findByRole('button', {
      name: 'შეტყობინებები, ახალი შეტყობინება',
    })
    expect(
      bell.querySelector('[data-slot="notification-unread-dot"]'),
    ).toBeInTheDocument()
    expect(
      screen
        .getByRole('list', { name: 'შეტყობინებების სია' })
        .querySelector('[data-slot="notification-item-unread-dot"]'),
    ).toBeInTheDocument()
    expect(api.unseen).toHaveBeenCalledWith({ data: { ids: [items[0].id] } })
    expect(
      screen
        .getByRole('list', { name: 'შეტყობინებების სია' })
        .querySelector(
          '[data-slot="notification-item-icon"] [data-slot="notification-item-unread-dot"]',
        ),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('button', {
        name: 'ნანახად მონიშვნა: განრიგი განახლდა',
      }),
    ).toBeVisible()
  })
  it('opens from the bell, persists an explicit acknowledgement and updates the unread count', async () => {
    const user = setup()
    await user.click(
      await screen.findByRole('button', {
        name: 'შეტყობინებები, ახალი შეტყობინება',
      }),
    )
    const bell = screen.getByRole('button', {
      name: 'შეტყობინებები, ახალი შეტყობინება',
    })
    expect(bell).toHaveTextContent('')
    expect(
      bell.querySelector('[data-slot="notification-unread-dot"]'),
    ).toHaveClass('bg-destructive')
    expect(await screen.findByText('განრიგი განახლდა')).toBeVisible()
    expect(screen.getByRole('link', { name: 'ყველას ნახვა' })).toHaveAttribute(
      'href',
      '/notifications',
    )
    expect(api.mark).not.toHaveBeenCalled()
    await user.click(
      screen.getByRole('button', {
        name: 'ნანახად მონიშვნა: განრიგი განახლდა',
      }),
    )
    expect(await screen.findByText('ნანახია')).toBeVisible()
    expect(api.mark).toHaveBeenCalledWith({ data: { ids: [items[0].id] } })
    expect(screen.getByRole('button', { name: 'შეტყობინებები' })).toBeVisible()
    expect(
      screen
        .getByRole('button', { name: 'შეტყობინებები' })
        .querySelector('[data-slot="notification-unread-dot"]'),
    ).toBeNull()
    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByText('განრიგი განახლდა')).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: 'შეტყობინებები' })).toHaveFocus()
  })

  it('shows the red dot without a numeric counter when a new notification arrives', async () => {
    const arrival = items[0]
    items = []
    const client = new QueryClient()
    render(
      <QueryClientProvider client={client}>
        <NotificationsPopover actorId="account-a" />
      </QueryClientProvider>,
    )
    await waitFor(() => expect(api.read).toHaveBeenCalledTimes(1))
    expect(
      screen
        .getByRole('button', { name: 'შეტყობინებები' })
        .querySelector('[data-slot="notification-unread-dot"]'),
    ).toBeNull()
    items = [arrival]
    await act(async () => {
      await client.refetchQueries({ queryKey: ['notifications', 'account-a'] })
    })
    const bell = await screen.findByRole('button', {
      name: 'შეტყობინებები, ახალი შეტყობინება',
    })
    expect(
      bell.querySelector('[data-slot="notification-unread-dot"]'),
    ).toHaveClass('bg-destructive')
    expect(bell.textContent).toBe('')
    client.clear()
  })

  it('shows an honest empty state and keeps the inbox link available', async () => {
    items = []
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'შეტყობინებები' }))
    expect(await screen.findByText('შეტყობინებები ჯერ არ გაქვთ')).toBeVisible()
    expect(
      screen.getByRole('button', {
        name: 'ყველა შეტყობინების ნანახად მონიშვნა',
      }),
    ).toBeDisabled()
    await user.click(screen.getByRole('link', { name: 'ყველას ნახვა' }))
    await waitFor(() =>
      expect(
        screen.queryByText('შეტყობინებები ჯერ არ გაქვთ'),
      ).not.toBeInTheDocument(),
    )
  })

  it('shows a safe error and supports retry', async () => {
    api.read.mockResolvedValue({ ok: false, message: 'შეცდომა' })
    const user = setup()
    await waitFor(() => expect(api.read).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: 'შეტყობინებები' }))
    expect(
      await screen.findByText('შეტყობინებები ვერ ჩაიტვირთა.'),
    ).toBeVisible()
    api.read.mockResolvedValue({
      ok: true,
      value: { items, unseenCount: 1, hasMore: false },
    })
    await user.click(screen.getByRole('button', { name: 'ხელახლა ცდა' }))
    expect(await screen.findByText('განრიგი განახლდა')).toBeVisible()
  })

  it('keeps unseen status after a failed write', async () => {
    api.all.mockResolvedValueOnce({ ok: false, message: 'შეცდომა' })
    const user = setup()
    await user.click(
      await screen.findByRole('button', {
        name: 'შეტყობინებები, ახალი შეტყობინება',
      }),
    )
    await user.click(
      await screen.findByRole('button', {
        name: 'ყველა შეტყობინების ნანახად მონიშვნა',
      }),
    )
    await waitFor(() => expect(api.all).toHaveBeenCalledTimes(1))
    expect(
      screen.getByRole('button', {
        name: 'ნანახად მონიშვნა: განრიგი განახლდა',
      }),
    ).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'შეტყობინებები, ახალი შეტყობინება' }),
    ).toBeVisible()
    expect(screen.queryByText('ნანახია')).not.toBeInTheDocument()
  })
})
