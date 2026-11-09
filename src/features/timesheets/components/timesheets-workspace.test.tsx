import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TimesheetsWorkspace } from './timesheets-workspace'
import type { Actor } from '#/lib/authorization/actor'
import type { AnchorHTMLAttributes } from 'react'

const api = vi.hoisted(() => ({
  self: vi.fn(),
}))
vi.mock('../timesheets.functions', () => ({
  getOwnTimesheets: api.self,
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params: _params,
    search: _search,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string
    params?: unknown
    search?: unknown
  }) => <a href={to} {...props} />,
}))
const actor: Actor = {
  id: 'manager',
  name: 'ანა',
  email: null,
  emailVerified: false,
  roles: ['supervisor'],
}
beforeEach(() => {
  vi.clearAllMocks()
  const result = {
    ok: true,
    value: {
      month: '2026-11',
      totals: {
        seconds: 3600,
        days: 1,
        pending: 1,
        rejected: 0,
        open: 0,
        approvedOutsideSeconds: 0,
      },
      hasMore: false,
      rows: [
        {
          userId: 'worker',
          employeeName: 'ბექა',
          date: '2026-11-05',
          timezone: 'Asia/Tbilisi',
          firstIn: '2026-11-05T06:00:00Z',
          lastOut: '2026-11-05T07:00:00Z',
          seconds: 3600,
          pending: 1,
          rejected: 0,
          open: 0,
          approvedOutsideSeconds: 0,
        },
      ],
    },
  }
  api.self.mockResolvedValue(result)
})
describe('timesheet views', () => {
  it('uses the self-service endpoint for personal timesheets', async () => {
    render(
      <TimesheetsWorkspace
        actor={actor}
        search={{ month: '2026-11' }}
        onSearchChange={vi.fn()}
      />,
    )
    await screen.findByRole('table')
    expect(api.self).toHaveBeenCalled()
  })
  it('keeps a failed read distinct from an empty month', async () => {
    api.self.mockResolvedValue({ ok: false, message: 'შეცდომა' })
    render(
      <TimesheetsWorkspace
        actor={actor}
        search={{ month: '2026-11' }}
        onSearchChange={vi.fn()}
      />,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'სამუშაო საათები ვერ ჩაიტვირთა.',
    )
    await waitFor(() =>
      expect(screen.queryByRole('table')).not.toBeInTheDocument(),
    )
  })
})
