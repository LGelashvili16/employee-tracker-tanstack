import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { format } from 'date-fns'
import { ka } from 'date-fns/locale'
import { LeaveRequestForm } from './leave-request-form'
import { LeaveReviewForm } from './leave-review-form'
import type { LeaveItem } from '../leave.types'

vi.mock('../day-off-allowance.functions', () => ({
  getOwnDayOffBalance: vi.fn().mockResolvedValue({
    ok: true,
    value: { annualDays: 4, remainingDays: 4, resetYearly: true },
  }),
}))

const mocks = vi.hoisted(() => ({
  submit: vi.fn(),
  decide: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }))
vi.mock('../leave.functions', () => ({
  submitLeave: mocks.submit,
  decideLeave: mocks.decide,
}))
vi.mock('sonner', () => ({
  toast: { success: mocks.success, error: mocks.error },
}))
afterEach(() => {
  vi.resetAllMocks()
  vi.useRealTimers()
})
function renderForm(component: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>{component}</QueryClientProvider>,
  )
}
const item: LeaveItem = {
  id: '019a5e78-e000-7000-8000-000000000001',
  requesterId: 'worker',
  image: null,
  name: 'ანა',
  kind: 'vacation',
  startDate: '2026-11-09',
  endDate: '2026-11-12',
  note: 'პირადი საქმე',
  status: 'pending',
  canCancel: false,
  revision: 2,
  reviewReason: '',
  reviewerName: null,
  createdAt: '2026-11-01T12:00:00Z',
}

describe('vacation request and review forms', () => {
  it('shows one Georgian error for each empty date without sending a request', async () => {
    const user = userEvent.setup()
    renderForm(<LeaveRequestForm onSaved={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'მოთხოვნის გაგზავნა' }))
    expect(await screen.findAllByText('მიუთითეთ სწორი თარიღი.')).toHaveLength(1)
    expect(
      screen.queryByText('თარიღი უნდა იყოს 2000 წლიდან 2100 წლამდე.'),
    ).not.toBeInTheDocument()
    expect(mocks.submit).not.toHaveBeenCalled()
  })
  it.each(['day_off', 'vacation', 'sick_leave'] as const)(
    'selects dates for %s with the Georgian calendar and reports confirmed submission once',
    async (kind) => {
      const today = new Date()
      const date = format(today, 'yyyy-MM-dd')
      const user = userEvent.setup()
      const onSaved = vi.fn()
      mocks.submit.mockResolvedValue({ ok: true, value: { id: item.id } })
      renderForm(<LeaveRequestForm onSaved={onSaved} />)
      if (kind !== 'day_off') {
        await user.click(
          screen.getByRole('combobox', { name: 'მოთხოვნის ტიპი' }),
        )
        await user.click(
          await screen.findByRole('option', {
            name: kind === 'sick_leave' ? 'ბიულეტენი' : 'შვებულება',
          }),
        )
      } else
        expect(
          screen.queryByRole('button', { name: 'დასრულება' }),
        ).not.toBeInTheDocument()
      for (const label of kind === 'day_off'
        ? ['თარიღი']
        : kind === 'sick_leave'
          ? ['დაწყება']
          : ['დაწყება', 'დასრულება']) {
        await user.click(screen.getByRole('button', { name: label }))
        expect(screen.getByRole('button', { name: label })).toHaveAttribute(
          'aria-expanded',
          'true',
        )
        const day = format(today, 'EEEE, d MMMM yyyy', { locale: ka })
        await user.click(await screen.findByRole('button', { name: day }))
        expect(screen.getByRole('button', { name: label })).toHaveTextContent(
          format(today, 'd MMMM yyyy', { locale: ka }),
        )
      }
      await user.type(screen.getByLabelText('კომენტარი'), 'პირადი საქმე')
      await user.click(
        screen.getByRole('button', { name: 'მოთხოვნის გაგზავნა' }),
      )
      await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
      expect(mocks.submit).toHaveBeenCalledExactlyOnceWith({
        data: {
          kind,
          startDate: date,
          endDate: kind === 'sick_leave' ? null : date,
          note: 'პირადი საქმე',
        },
      })
      expect(mocks.success).toHaveBeenCalledOnce()
    },
  )
  it('collapses a vacation range to one date when switching to a day off', async () => {
    const user = userEvent.setup()
    const today = new Date()
    mocks.submit.mockResolvedValue({ ok: true, value: { id: item.id } })
    renderForm(<LeaveRequestForm onSaved={vi.fn()} />)
    await user.click(screen.getByRole('combobox', { name: 'მოთხოვნის ტიპი' }))
    await user.click(await screen.findByRole('option', { name: 'შვებულება' }))
    await user.click(screen.getByRole('button', { name: 'დაწყება' }))
    await user.click(
      await screen.findByRole('button', {
        name: format(today, 'EEEE, d MMMM yyyy', { locale: ka }),
      }),
    )
    await user.click(screen.getByRole('combobox', { name: 'მოთხოვნის ტიპი' }))
    await user.click(
      await screen.findByRole('option', { name: 'დასვენების დღე' }),
    )
    expect(screen.getByRole('button', { name: 'თარიღი' })).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'დასრულება' }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'მოთხოვნის გაგზავნა' }))
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledOnce())
    expect(mocks.submit.mock.calls[0][0].data).toMatchObject({
      kind: 'day_off',
      startDate: format(today, 'yyyy-MM-dd'),
      endDate: format(today, 'yyyy-MM-dd'),
    })
  })
  it('uses a single calendar for reviewer changes to a day off', async () => {
    const user = userEvent.setup()
    mocks.decide.mockResolvedValue({ ok: true, value: { id: item.id } })
    renderForm(
      <LeaveReviewForm
        item={{ ...item, kind: 'day_off', endDate: item.startDate }}
        onSaved={vi.fn()}
      />,
    )
    expect(
      screen.queryByRole('button', { name: 'დასრულება' }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'თარიღი' }))
    await user.click(
      await screen.findByRole('button', {
        name: format(new Date('2026-11-10T12:00:00'), 'EEEE, d MMMM yyyy', {
          locale: ka,
        }),
      }),
    )
    await user.type(
      screen.getByRole('textbox', { name: 'აღწერა' }),
      'თარიღის შეცვლა',
    )
    await user.click(screen.getByRole('button', { name: 'განხილვის შენახვა' }))
    await waitFor(() => expect(mocks.decide).toHaveBeenCalledOnce())
    expect(mocks.decide.mock.calls[0][0].data).toMatchObject({
      startDate: '2026-11-10',
      endDate: '2026-11-10',
    })
  })
  it('retains an optional description after a failed review and disables duplicate submissions while pending', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    let finish: (result: { ok: false; message: string }) => void = () => {}
    mocks.decide.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    renderForm(<LeaveReviewForm item={item} onSaved={onSaved} />)
    await user.type(
      screen.getByRole('textbox', { name: 'აღწერა' }),
      'დასაშვები პერიოდი',
    )
    await user.click(screen.getByRole('button', { name: 'განხილვის შენახვა' }))
    expect(
      screen.getByRole('button', { name: 'განხილვის შენახვა' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'განხილვის შენახვა' }),
    ).toHaveAttribute('aria-busy', 'true')
    finish({ ok: false, message: 'მოთხოვნა შეიცვალა. განაახლეთ სია.' })
    expect(
      await screen.findByText('მოთხოვნა შეიცვალა. განაახლეთ სია.'),
    ).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'აღწერა' })).toHaveValue(
      'დასაშვები პერიოდი',
    )
    expect(onSaved).not.toHaveBeenCalled()
    expect(mocks.error).toHaveBeenCalledOnce()
    expect(mocks.success).not.toHaveBeenCalled()
    expect(mocks.decide).toHaveBeenCalledExactlyOnceWith({
      data: {
        id: item.id,
        revision: 2,
        startDate: item.startDate,
        endDate: item.endDate,
        action: 'approved',
        reason: 'დასაშვები პერიოდი',
      },
    })
  })
  it('submits a review without a description', async () => {
    const user = userEvent.setup()
    mocks.decide.mockResolvedValue({ ok: true, value: { id: item.id } })
    const onSaved = vi.fn()
    renderForm(<LeaveReviewForm item={item} onSaved={onSaved} />)
    expect(screen.getByRole('textbox', { name: 'აღწერა' })).not.toBeRequired()
    await user.click(screen.getByRole('button', { name: 'განხილვის შენახვა' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
    expect(mocks.decide.mock.calls[0][0].data.reason).toBe('')
  })
})
