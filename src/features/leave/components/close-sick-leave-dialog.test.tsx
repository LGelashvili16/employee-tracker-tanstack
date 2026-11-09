import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { format } from 'date-fns'
import { ka } from 'date-fns/locale'
import { CloseSickLeaveDialog } from './close-sick-leave-dialog'
import type { LeaveItem } from '../leave.types'

const mocks = vi.hoisted(() => ({
  close: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock('../leave.functions', () => ({ finishSickLeave: mocks.close }))
vi.mock('sonner', () => ({
  toast: { success: mocks.success, error: mocks.error },
}))
afterEach(() => vi.resetAllMocks())
const item: LeaveItem = {
  id: '019a5e78-e000-7000-8000-000000000001',
  requesterId: 'worker',
  image: null,
  name: 'ანა',
  kind: 'sick_leave',
  startDate: '2026-11-01',
  endDate: null,
  note: '',
  status: 'approved',
  canCancel: false,
  revision: 1,
  reviewReason: '',
  reviewerName: 'HR',
  createdAt: '2026-11-01T12:00:00Z',
}
function view() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CloseSickLeaveDialog item={item} />
    </QueryClientProvider>,
  )
}
it('validates a last sick day and closes only after confirmed server success', async () => {
  const user = userEvent.setup()
  mocks.close.mockResolvedValue({ ok: true, value: { id: item.id } })
  view()
  await user.click(screen.getByRole('button', { name: 'ბიულეტენის დახურვა' }))
  await user.click(screen.getByRole('button', { name: 'დასრულების შენახვა' }))
  expect(mocks.close).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'ბიულეტენის ბოლო დღე' }))
  await user.click(
    await screen.findByRole('button', {
      name: format(new Date(), 'EEEE, d MMMM yyyy', { locale: ka }),
    }),
  )
  await user.click(screen.getByRole('button', { name: 'დასრულების შენახვა' }))
  await waitFor(() =>
    expect(mocks.close).toHaveBeenCalledExactlyOnceWith({
      data: {
        id: item.id,
        revision: 1,
        endDate: format(new Date(), 'yyyy-MM-dd'),
      },
    }),
  )
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  )
  expect(mocks.success).toHaveBeenCalledExactlyOnceWith('ბიულეტენი დახურულია.')
})
it('does not close sick leave when the dialog is dismissed', async () => {
  const user = userEvent.setup()
  view()
  await user.click(screen.getByRole('button', { name: 'ბიულეტენის დახურვა' }))
  await user.keyboard('{Escape}')
  expect(mocks.close).not.toHaveBeenCalled()
})
