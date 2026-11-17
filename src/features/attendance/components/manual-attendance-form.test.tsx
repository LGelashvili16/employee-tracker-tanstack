import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import { ManualAttendanceForm } from './manual-attendance-form'

const call = vi.hoisted(() => vi.fn())
vi.mock('../attendance.functions', () => ({ recordManualAttendance: call }))
vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }))
beforeEach(() =>
  call.mockReset().mockResolvedValue({ ok: true, value: { id: 'created' } }),
)
function mount() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ManualAttendanceForm
        userId="worker"
        employeeName="ანა"
        timezone="Asia/Tbilisi"
        serverNow="2026-11-17T08:00:00Z"
        onPending={vi.fn()}
        close={vi.fn()}
      />
    </QueryClientProvider>,
  )
}
it('creates an open record with checkout off and no mandatory note', async () => {
  const user = userEvent.setup()
  mount()
  expect(
    screen.getByRole('switch', { name: 'გასვლის დამატება' }),
  ).not.toBeChecked()
  expect(screen.queryByLabelText(/^გასვლის დრო/)).not.toBeInTheDocument()
  await user.clear(screen.getByLabelText(/^შესვლის დრო/))
  await user.type(screen.getByLabelText(/^შესვლის დრო/), '10:00')
  await user.click(screen.getByRole('button', { name: 'ჩანაწერის შენახვა' }))
  await waitFor(() =>
    expect(call).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'worker',
        start: '2026-11-17T10:00',
        includeEnd: false,
        end: '',
        reason: '',
      }),
    }),
  )
})
it('requires a later checkout only when the switch is enabled', async () => {
  const user = userEvent.setup()
  mount()
  await user.click(screen.getByRole('switch', { name: 'გასვლის დამატება' }))
  await user.click(screen.getByRole('button', { name: 'ჩანაწერის შენახვა' }))
  expect(
    await screen.findByText('დასრულება უნდა იყოს დაწყების შემდეგ.'),
  ).toBeVisible()
  expect(call).not.toHaveBeenCalled()
  await user.clear(screen.getByLabelText(/^შესვლის დრო/))
  await user.type(screen.getByLabelText(/^შესვლის დრო/), '10:00')
  await user.click(screen.getByRole('button', { name: 'ჩანაწერის შენახვა' }))
  await waitFor(() =>
    expect(call).toHaveBeenCalledWith({
      data: expect.objectContaining({
        start: '2026-11-17T10:00',
        includeEnd: true,
        end: '2026-11-17T12:00',
      }),
    }),
  )
})
