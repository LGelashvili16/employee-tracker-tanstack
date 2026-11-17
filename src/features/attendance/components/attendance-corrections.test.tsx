import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import { AttendanceCorrections } from './attendance-corrections'

const calls = vi.hoisted(() => ({ read: vi.fn() }))
vi.mock('../attendance.functions', () => ({
  readMyAttendanceCorrections: calls.read,
}))
const item = {
  id: 'change',
  actorName: 'ნინო',
  workDate: '2026-11-04',
  timezone: 'Asia/Tbilisi',
  reason: 'გასვლის დრო შესწორდა',
  createdAt: '2026-11-05T09:00:00.000Z',
  before: { startedAt: '2026-11-04T06:05:13.000Z', endedAt: null },
  after: {
    startedAt: '2026-11-04T06:00:00.000Z',
    endedAt: '2026-11-04T15:00:00.000Z',
  },
}
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  function History() {
    const [page, setPage] = useState(0)
    return (
      <AttendanceCorrections
        actorId="employee"
        page={page}
        onPageChange={setPage}
      />
    )
  }
  render(
    <QueryClientProvider client={client}>
      <History />
    </QueryClientProvider>,
  )
  return client
}
beforeEach(() => vi.clearAllMocks())

it('shows the employee exact old and new times, missing checkout, author, reason and paginated older changes', async () => {
  calls.read.mockImplementation(({ data }: { data: { page: number } }) =>
    Promise.resolve({
      ok: true,
      value: {
        items: data.page
          ? [{ ...item, id: 'older', reason: 'ძველი შესწორება' }]
          : [item],
        hasMore: data.page === 0,
      },
    }),
  )
  mount()
  expect(await screen.findByText('მიზეზი: გასვლის დრო შესწორდა')).toBeVisible()
  expect(screen.getByText(/ნინო/)).toBeVisible()
  expect(screen.getByText(/10:05:13/)).toBeVisible()
  expect(screen.getByText(/10:00:00/)).toBeVisible()
  expect(screen.getByText(/19:00:00/)).toBeVisible()
  expect(screen.getByText(/არ იყო აღრიცხული/)).toBeVisible()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'შემდეგი გვერდი' }))
  expect(await screen.findByText('მიზეზი: ძველი შესწორება')).toBeVisible()
  expect(calls.read).toHaveBeenLastCalledWith({ data: { page: 1 } })
  expect(screen.getByRole('button', { name: 'შემდეგი გვერდი' })).toBeDisabled()
})

it('shows safe Georgian failure feedback without exposing audit data', async () => {
  calls.read.mockRejectedValue(new Error('private database detail'))
  mount()
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'შესწორებების ისტორია ვერ ჩაიტვირთა.',
  )
  expect(screen.queryByText('private database detail')).not.toBeInTheDocument()
})
