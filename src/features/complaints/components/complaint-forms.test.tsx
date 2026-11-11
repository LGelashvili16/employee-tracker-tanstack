import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { ComplaintCreateForm } from './complaint-create-form'
import { ComplaintDetailView } from './complaint-detail-view'
import {
  ComplaintReplyForm,
  ComplaintReviewForm,
} from './complaint-action-forms'
import type { ComplaintDetail } from '../complaints.queries'

const mocks = vi.hoisted(() => ({
  submit: vi.fn(),
  reply: vi.fn(),
  decide: vi.fn(),
  assign: vi.fn(),
  reviewers: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  load: vi.fn(),
}))
vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }))
vi.mock('#/features/notifications/notifications.functions', () => ({
  getOwnNotifications: vi.fn(),
}))
vi.mock('../complaints.functions', () => ({
  submitComplaint: mocks.submit,
  sendComplaintReply: mocks.reply,
  decideComplaint: mocks.decide,
  setComplaintAssignee: mocks.assign,
  getComplaintReviewers: mocks.reviewers,
  getComplaint: mocks.load,
  getComplaints: vi.fn(),
}))
vi.mock('sonner', () => ({
  toast: { success: mocks.success, error: mocks.error },
}))
beforeEach(() => {
  vi.clearAllMocks()
  mocks.reviewers.mockResolvedValue({ ok: true, value: [] })
})
function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {children}
    </QueryClientProvider>
  )
}
const detail: ComplaintDetail = {
  id: '019aac01-0000-7000-8000-000000000001',
  title: 'სატესტო თემა',
  description: 'აღწერა',
  category: 'other',
  visibility: 'standard',
  status: 'new',
  revision: 0,
  assigneeId: null,
  requesterName: 'ანა',
  assigneeName: null,
  createdAt: '2026-11-11T10:00:00Z',
  canManage: true,
  canAssign: true,
  activity: { items: [], total: 0, pageSize: 20 },
}
it('validates required Georgian fields before submission', async () => {
  const user = userEvent.setup()
  render(<ComplaintCreateForm onSaved={vi.fn()} onPendingChange={vi.fn()} />)
  await user.click(screen.getByRole('button', { name: 'საჩივრის გაგზავნა' }))
  expect(await screen.findAllByText('შეავსეთ ველი.')).toHaveLength(2)
  expect(mocks.submit).not.toHaveBeenCalled()
  expect(
    screen.queryByRole('combobox', { name: /ვის შეუძლია ნახვა/ }),
  ).not.toBeInTheDocument()
})
it('retains input and the retry identity after failure, and reports confirmed success once', async () => {
  const user = userEvent.setup()
  const onSaved = vi.fn()
  mocks.submit
    .mockResolvedValueOnce({ ok: false, message: 'სცადეთ ხელახლა.' })
    .mockResolvedValueOnce({ ok: true, value: { id: detail.id } })
  render(<ComplaintCreateForm onSaved={onSaved} onPendingChange={vi.fn()} />)
  await user.type(screen.getByLabelText(/თემა/), 'სატესტო თემა')
  await user.type(screen.getByLabelText(/აღწერა/), 'სატესტო აღწერა')
  await user.click(screen.getByRole('button', { name: 'საჩივრის გაგზავნა' }))
  await waitFor(() => expect(mocks.error).toHaveBeenCalledOnce())
  expect(screen.getByLabelText(/აღწერა/)).toHaveValue('სატესტო აღწერა')
  await user.click(screen.getByRole('button', { name: 'საჩივრის გაგზავნა' }))
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(detail.id))
  expect(mocks.submit.mock.calls[0][0].data.submissionId).toBe(
    mocks.submit.mock.calls[1][0].data.submissionId,
  )
  expect(mocks.success).toHaveBeenCalledOnce()
  expect(mocks.submit.mock.calls[1][0].data).not.toHaveProperty('visibility')
})
it('disables repeat reply submission while the request is pending', async () => {
  const user = userEvent.setup()
  let finish: (value: unknown) => void = () => {}
  mocks.reply.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  render(<ComplaintReplyForm item={detail} actorId="worker" />, { wrapper })
  await user.type(screen.getByLabelText(/კომენტარი/), 'დამატებითი ინფორმაცია')
  await user.click(screen.getByRole('button', { name: 'კომენტარის დამატება' }))
  expect(
    screen.getByRole('button', { name: 'კომენტარის დამატება' }),
  ).toBeDisabled()
  expect(
    screen.getByRole('button', { name: 'კომენტარის დამატება' }),
  ).toHaveAttribute('aria-busy', 'true')
  await act(async () => finish({ ok: true, value: { id: detail.id } }))
  await waitFor(() =>
    expect(screen.getByLabelText(/კომენტარი/)).toHaveValue(''),
  )
  expect(mocks.reply).toHaveBeenCalledOnce()
})
it('preserves a reviewer draft when a live update changes the revision', async () => {
  const user = userEvent.setup()
  const { rerender } = render(
    <ComplaintReviewForm item={detail} actorId="hr" />,
    { wrapper },
  )
  await user.type(screen.getByLabelText(/კომენტარი/), 'მიმდინარე ჩანაწერი')
  rerender(
    <ComplaintReviewForm item={{ ...detail, revision: 1 }} actorId="hr" />,
  )
  expect(screen.getByLabelText(/კომენტარი/)).toHaveValue('მიმდინარე ჩანაწერი')
  expect(screen.getByRole('button', { name: 'შენახვა' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'განხილვის განახლება' }))
  expect(screen.getByRole('button', { name: 'შენახვა' })).toBeEnabled()
})

it('updates the next status choice after a confirmed review and live refetch', async () => {
  const user = userEvent.setup()
  mocks.decide.mockResolvedValue({ ok: true, value: { id: detail.id } })
  const { rerender } = render(
    <ComplaintReviewForm item={detail} actorId="hr" />,
    { wrapper },
  )
  await user.type(screen.getByLabelText(/კომენტარი/), 'განხილვის დაწყება')
  await user.click(screen.getByRole('combobox', { name: 'სტატუსი' }))
  await user.click(await screen.findByRole('option', { name: 'განხილვაში' }))
  await user.click(screen.getByRole('button', { name: 'შენახვა' }))
  await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce())
  rerender(
    <ComplaintReviewForm
      item={{ ...detail, revision: 1, status: 'in_review' }}
      actorId="hr"
    />,
  )
  expect(screen.getByRole('combobox', { name: /სტატუსი/ })).toHaveTextContent(
    'განხილვაში',
  )
})

it('keeps review to one status and one comment, and saves an unchanged status as a reply', async () => {
  const user = userEvent.setup()
  mocks.reply.mockResolvedValue({ ok: true, value: { id: detail.id } })
  render(<ComplaintReviewForm item={detail} actorId="hr" />, { wrapper })
  expect(screen.getAllByRole('textbox')).toHaveLength(1)
  expect(screen.getAllByRole('combobox')).toHaveLength(1)
  expect(screen.queryByLabelText('მოქმედება')).not.toBeInTheDocument()
  expect(screen.queryByLabelText(/პასუხისმგებელი/)).not.toBeInTheDocument()
  await user.type(
    screen.getByLabelText(/კომენტარი/),
    'განვიხილავთ თქვენს საჩივარს',
  )
  await user.click(screen.getByRole('button', { name: 'შენახვა' }))
  await waitFor(() => expect(mocks.reply).toHaveBeenCalledOnce())
  expect(mocks.reply.mock.calls[0][0].data).toMatchObject({
    id: detail.id,
    body: 'განვიხილავთ თქვენს საჩივარს',
  })
  expect(mocks.decide).not.toHaveBeenCalled()
})

it.each([true, false])(
  'shows a single comment composer in the complaint detail (reviewer=%s)',
  async (canManage) => {
    mocks.load.mockResolvedValue({ ok: true, value: { ...detail, canManage } })
    render(
      <ComplaintDetailView
        actorId={canManage ? 'hr' : 'worker'}
        id={detail.id}
        search={{ complaintId: detail.id }}
        review={canManage}
      />,
      { wrapper },
    )
    await screen.findByRole('heading', { name: detail.title })
    const details = screen.getByRole('region', { name: 'საჩივრის დეტალები' })
    const conversation = screen.getByRole('region', {
      name: 'კომენტარები და განხილვა',
    })
    expect(
      within(details).getByRole('heading', { name: detail.title }),
    ).toBeInTheDocument()
    expect(within(details).getByText(detail.description)).toBeInTheDocument()
    expect(
      within(conversation).getByRole('textbox', { name: /კომენტარი/ }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(screen.queryByText('ხილვადობა')).not.toBeInTheDocument()
    expect(screen.queryByText('პასუხისმგებელი')).not.toBeInTheDocument()
    expect(screen.getByText('11 ნოემბერი 2026, 14:00')).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'კომენტარები და განხილვა' }),
    ).toBeInTheDocument()
  },
)

it.each([true, false])(
  'does not flash a conflict for its own save (live update arrives first=%s)',
  async (liveFirst) => {
    const user = userEvent.setup()
    let finish: (value: unknown) => void = () => {}
    mocks.decide.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const { rerender } = render(
      <ComplaintReviewForm item={detail} actorId="hr" />,
      { wrapper },
    )
    await user.type(screen.getByLabelText(/კომენტარი/), 'განხილვის დაწყება')
    await user.click(screen.getByRole('combobox', { name: 'სტატუსი' }))
    await user.click(await screen.findByRole('option', { name: 'განხილვაში' }))
    await user.click(screen.getByRole('button', { name: 'შენახვა' }))
    if (liveFirst)
      rerender(
        <ComplaintReviewForm
          item={{ ...detail, revision: 1, status: 'in_review' }}
          actorId="hr"
        />,
      )
    expect(
      screen.queryByText(
        'საჩივარი შეიცვალა. გადაამოწმეთ ახალი მონაცემები შენახვამდე.',
      ),
    ).not.toBeInTheDocument()
    await act(async () => finish({ ok: true, value: { id: detail.id } }))
    await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce())
    expect(
      screen.queryByText(
        'საჩივარი შეიცვალა. გადაამოწმეთ ახალი მონაცემები შენახვამდე.',
      ),
    ).not.toBeInTheDocument()
    if (!liveFirst)
      expect(screen.getByRole('button', { name: 'შენახვა' })).toBeDisabled()
    rerender(
      <ComplaintReviewForm
        item={{ ...detail, revision: 1, status: 'in_review' }}
        actorId="hr"
      />,
    )
    expect(screen.getByRole('button', { name: 'შენახვა' })).toBeEnabled()
  },
)
