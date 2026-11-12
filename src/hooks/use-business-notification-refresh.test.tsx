import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { RealtimeContext } from '#/contexts/realtime-context'
import { useBusinessNotificationRefresh } from './use-business-notification-refresh'

vi.mock('#/features/leave/leave.queries', () => ({ leaveKey: ['leave'] }))
vi.mock('#/features/scheduling/scheduling.queries', () => ({
  ownScheduleOptions: (id: string) => ({ queryKey: ['own-schedule', id] }),
}))
vi.mock('#/features/attendance/attendance.queries', () => ({
  attendanceKey: (id: string) => ['my-attendance', id],
}))
it('refreshes actor-scoped destination records and reconciles missed changes on reconnect', () => {
  const client = new QueryClient()
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  let receive: (data: unknown) => void = () => undefined
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <RealtimeContext
          value={(_topic, callback) => {
            receive = callback
            return () => undefined
          }}
        >
          {children}
        </RealtimeContext>
      </QueryClientProvider>
    )
  }
  renderHook(() => useBusinessNotificationRefresh('worker'), { wrapper })
  act(() => receive({ recipientId: 'other', changed: false }))
  act(() => receive({ recipientId: 'worker', changed: 'no' }))
  expect(invalidate).not.toHaveBeenCalled()
  act(() =>
    receive({
      recipientId: 'worker',
      changed: true,
      notification: {
        id: '019aac01-0000-7000-8000-000000000001',
        title: 'განახლდა',
        destination: { kind: 'schedule' },
      },
    }),
  )
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ['own-schedule', 'worker'],
  })
  expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['leave', 'worker'] })
  invalidate.mockClear()
  act(() =>
    receive({
      recipientId: 'worker',
      changed: true,
      notification: {
        id: '019aac01-0000-7000-8000-000000000001',
        title: 'განახლდა',
        liveToast: false,
        destination: {
          kind: 'attendance',
          userId: 'other',
          workDate: '2026-11-11',
        },
      },
    }),
  )
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ['company-attendance-users', 'worker'],
  })
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ['company-attendance-user', 'worker'],
  })
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ['my-attendance-corrections', 'worker'],
  })
  invalidate.mockClear()
  act(() => receive({ recipientId: 'worker', changed: false }))
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ['my-attendance-corrections', 'worker'],
  })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['leave', 'worker'] })
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ['my-attendance', 'worker'],
  })
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ['company-timesheets', 'worker'],
  })
})
