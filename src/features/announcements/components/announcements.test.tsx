import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AnnouncementDialog } from './announcement-dialog'
import { PublishAnnouncementSheet } from './publish-announcement-sheet'
import { LoginAnnouncement } from './login-announcement'

const api = vi.hoisted(() => ({
  mark: vi.fn(),
  create: vi.fn(),
  pending: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  manualReader: false,
}))
vi.mock('../announcements.functions', () => ({
  markAnnouncement: api.mark,
  createAnnouncement: api.create,
  getPendingAnnouncement: api.pending,
  getAnnouncements: vi.fn(),
  getAnnouncementDetail: vi.fn(),
}))
vi.mock('@tanstack/react-router', () => ({
  useLocation: () => api.manualReader,
}))
vi.mock('sonner', () => ({ toast: { success: api.success, error: api.error } }))
const value = {
  id: '019aac01-0000-7000-8000-000000000001',
  title: 'კომპანიის განცხადება',
  body: 'განცხადების სრული ტექსტი',
  publishedAt: '2026-11-10T09:00:00Z',
  showOnLogin: true,
  readAt: null,
}
function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      {children}
    </QueryClientProvider>
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  api.manualReader = false
  api.mark.mockResolvedValue({ ok: true, value: { id: value.id } })
  api.create.mockResolvedValue({ ok: true, value: { id: value.id } })
  api.pending.mockResolvedValue({
    ok: true,
    value: { item: value, remaining: 1 },
  })
})
describe('announcement delivery', () => {
  it('checks again after signing back into the same account with a cached empty result', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const sharedWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    api.pending.mockResolvedValueOnce({
      ok: true,
      value: { item: null, remaining: 0 },
    })
    const firstMount = render(<LoginAnnouncement actorId="worker" />, {
      wrapper: sharedWrapper,
    })
    await waitFor(() =>
      expect(
        client.getQueryState(['announcements', 'worker', 'login'])?.status,
      ).toBe('success'),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    firstMount.unmount()
    render(<LoginAnnouncement actorId="worker" />, { wrapper: sharedWrapper })
    expect(await screen.findByRole('dialog')).toBeVisible()
    expect(api.pending).toHaveBeenCalledTimes(2)
    client.clear()
  })

  it('persists automatic dismissal before closing, without marking the announcement read', async () => {
    const user = userEvent.setup()
    const close = vi.fn()
    render(
      <AnnouncementDialog
        actorId="worker"
        value={value}
        automatic
        onClose={close}
      />,
      { wrapper },
    )
    await user.click(screen.getByRole('button', { name: 'დახურვა' }))
    await waitFor(() => expect(close).toHaveBeenCalledOnce())
    expect(api.mark).toHaveBeenCalledWith({
      data: { id: value.id, action: 'dismiss' },
    })
    expect(api.success).toHaveBeenCalledOnce()
  })
  it('queues live arrivals after the open modal and advances through all items once', async () => {
    const user = userEvent.setup()
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const second = {
      ...value,
      id: '019aac01-0000-7000-8000-000000000002',
      title: 'მეორე განცხადება',
    }
    const third = {
      ...value,
      id: '019aac01-0000-7000-8000-000000000003',
      title: 'მესამე განცხადება',
    }
    let items = [value, second]
    api.pending.mockImplementation(async () => ({
      ok: true,
      value: { item: items[0] ?? null, remaining: items.length },
    }))
    api.mark.mockImplementation(async ({ data }: { data: { id: string } }) => {
      items = items.filter((item) => item.id !== data.id)
      return { ok: true, value: { id: data.id } }
    })
    render(
      <QueryClientProvider client={client}>
        <LoginAnnouncement actorId="worker" />
      </QueryClientProvider>,
    )
    expect(
      await screen.findByRole('dialog', { name: value.title }),
    ).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('განცხადება 1 / 2')
    items.push(third)
    await client.invalidateQueries({ queryKey: ['announcements', 'worker'] })
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('განცხადება 1 / 3'),
    )
    expect(screen.getByRole('dialog', { name: value.title })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'დახურვა' }))
    expect(
      await screen.findByRole('dialog', { name: second.title }),
    ).toBeVisible()
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('განცხადება 2 / 3'),
    )
    await user.click(screen.getByRole('button', { name: 'წავიკითხე' }))
    expect(
      await screen.findByRole('dialog', { name: third.title }),
    ).toBeVisible()
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('განცხადება 3 / 3'),
    )
    await user.click(screen.getByRole('button', { name: 'დახურვა' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(api.mark).toHaveBeenCalledTimes(3)
    client.clear()
  })
  it('keeps the modal open if acknowledgement fails and permits a retry', async () => {
    const user = userEvent.setup()
    const close = vi.fn()
    api.mark.mockResolvedValueOnce({ ok: false, message: 'დროებითი შეფერხება' })
    render(
      <AnnouncementDialog
        actorId="worker"
        value={value}
        automatic
        onClose={close}
      />,
      { wrapper },
    )
    await user.click(screen.getByRole('button', { name: 'დახურვა' }))
    await waitFor(() => expect(api.error).toHaveBeenCalledOnce())
    expect(close).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: value.title })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'წავიკითხე' }))
    await waitFor(() => expect(close).toHaveBeenCalledOnce())
    expect(api.mark).toHaveBeenLastCalledWith({
      data: { id: value.id, action: 'read' },
    })
  })
  it('closing a voluntarily opened announcement does not claim an acknowledgement', async () => {
    const user = userEvent.setup()
    const close = vi.fn()
    render(
      <AnnouncementDialog actorId="worker" value={value} onClose={close} />,
      { wrapper },
    )
    await user.click(screen.getByRole('button', { name: 'დახურვა' }))
    expect(close).toHaveBeenCalledOnce()
    expect(api.mark).not.toHaveBeenCalled()
  })
  it('defers a delivered modal opened manually before resuming the automatic queue', async () => {
    const user = userEvent.setup()
    const close = vi.fn()
    render(
      <AnnouncementDialog
        actorId="worker"
        value={{ ...value, isRecipient: true }}
        onClose={close}
      />,
      { wrapper },
    )
    await user.click(screen.getByRole('button', { name: 'დახურვა' }))
    await waitFor(() => expect(close).toHaveBeenCalledOnce())
    expect(api.mark).toHaveBeenCalledWith({
      data: { id: value.id, action: 'dismiss' },
    })
  })
  it('waits while another announcement reader is open instead of stacking dialogs', () => {
    api.manualReader = true
    render(<LoginAnnouncement actorId="worker" />, { wrapper })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api.pending).not.toHaveBeenCalled()
  })
  it('uses the server-provided login announcement on the personal workspace', async () => {
    render(<LoginAnnouncement actorId="worker" />, { wrapper })
    expect(
      await screen.findByRole('dialog', { name: value.title }),
    ).toBeVisible()
    expect(screen.getByText(value.body)).toBeVisible()
  })
  it('validates required publication fields and sends the selected delivery mode', async () => {
    const user = userEvent.setup()
    const published = vi.fn()
    render(<PublishAnnouncementSheet actorId="hr" onPublished={published} />, {
      wrapper,
    })
    await user.click(screen.getByRole('button', { name: 'ახალი განცხადება' }))
    await user.click(screen.getByRole('button', { name: 'გამოქვეყნება' }))
    expect(await screen.findByText('მიუთითეთ სათაური.')).toBeVisible()
    expect(api.create).not.toHaveBeenCalled()
    await user.type(
      screen.getByRole('textbox', { name: 'სათაური' }),
      value.title,
    )
    await user.type(screen.getByRole('textbox', { name: 'ტექსტი' }), value.body)
    await user.click(screen.getByRole('switch', { name: 'ფანჯარაში ჩვენება' }))
    await user.click(screen.getByRole('button', { name: 'გამოქვეყნება' }))
    await waitFor(() => expect(published).toHaveBeenCalledOnce())
    expect(api.create).toHaveBeenCalledWith({
      data: {
        title: value.title,
        body: value.body,
        showOnLogin: true,
        requestId: expect.any(String),
      },
    })
    expect(api.success).toHaveBeenCalledOnce()
  })
})
