import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { format } from 'date-fns'
import { ka } from 'date-fns/locale'
import { GpsPage } from './gps-page'
import { GpsHistoryPage } from './gps-history-page'
import { gpsSearchSchema } from '../gps.schemas'
import type { ComponentProps, ReactNode } from 'react'

const { getHistory, getWorkspace, saveDevice } = vi.hoisted(() => ({
  getHistory: vi.fn(),
  getWorkspace: vi.fn(),
  saveDevice: vi.fn(),
}))
vi.mock('../gps.functions', () => ({
  getGpsDiagnostics: async () => [
    { kind: 'heartbeat', receivedAt: tracker.lastContactAt },
    {
      kind: 'decode_error',
      receivedAt: tracker.lastContactAt,
      errorCode: 'invalid_checksum',
    },
  ],
  getGpsHistory: getHistory,
  getGpsWorkspace: getWorkspace,
  updateGpsDevice: saveDevice,
}))
vi.mock('../components/gps-history-map', () => ({
  GpsHistoryMap: () => <div aria-label="მარშრუტის რუკა" />,
}))
vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    search,
    params,
    ...props
  }: ComponentProps<'a'> & {
    to: string
    search?: { page?: number }
    params?: { deviceId: string }
  }) => (
    <a
      {...props}
      href={`${params ? to.replace('$deviceId', params.deviceId) : to}${search?.page ? `?page=${search.page}` : ''}`}
    />
  ),
}))
vi.mock('#/components/ui/map', () => ({
  Map: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  MapMarker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  MapControls: () => null,
}))

const tracker = {
  id: '019abb95-5882-78b2-94c1-83d1093b44ca',
  name: 'სატესტო ტრეკერი',
  reportedId: '009590038494',
  enabled: true,
  version: 1,
  lastContactAt: new Date('2026-11-21T09:02:00Z'),
  position: {
    latitude: 41.71853,
    longitude: 44.74087,
    fixAt: new Date('2026-11-21T09:00:00Z'),
    speedKmh: 0,
  },
}
function showPage(canManage: boolean, q = '') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <GpsPage
        actorId="gps-test"
        canManage={canManage}
        search={gpsSearchSchema.parse({ q })}
        onSearch={vi.fn()}
      />
    </QueryClientProvider>,
  )
}

it.each([
  ['', 'GPS მოწყობილობები ჯერ არ არის დამატებული.'],
  ['ტრეკერი', 'ძიების შედეგები ვერ მოიძებნა.'],
])(
  'shows a placeholder when the successful GPS query has no results (%s)',
  async (q, heading) => {
    getWorkspace.mockResolvedValue({ rows: [], total: 0 })
    showPage(false, q)
    expect(await screen.findByRole('heading', { name: heading })).toBeVisible()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  },
)

it('shows the load error when the query fails', async () => {
  getWorkspace.mockRejectedValue(new Error('Database unavailable'))
  showPage(false)
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'მოწყობილობები ვერ ჩაიტვირთა.',
  )
  expect(
    screen.queryByRole('heading', {
      name: 'GPS მოწყობილობები ჯერ არ არის დამატებული.',
    }),
  ).toBeNull()
})

it('shows the latest fix on the map and in the table for a read-only viewer', async () => {
  getWorkspace.mockResolvedValue({ rows: [tracker], total: 1 })
  showPage(false)
  const map = await screen.findByRole('region', {
    name: 'ამ გვერდზე ნაჩვენები მოწყობილობების მდებარეობები',
  })
  expect(within(map).getByText(tracker.name)).toBeVisible()
  expect(screen.getByRole('link', { name: tracker.name })).toHaveAttribute(
    'href',
    `/manage/gps/${tracker.id}`,
  )
  expect(screen.getByText('41.71853, 44.74087')).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'მოწყობილობის დამატება' }),
  ).toBeNull()
  expect(screen.queryByRole('button', { name: /რედაქტირება/ })).toBeNull()
})

it('shows recorded history and submits a two-day calendar selection', async () => {
  const fix = {
    ...tracker.position,
    valid: true,
    id: 'fix',
    receivedAt: tracker.lastContactAt,
    altitude: 410,
    course: 0,
  }
  getHistory.mockResolvedValue({
    device: tracker,
    latestFix: fix,
    battery: { percent: 63, fixAt: fix.fixAt },
    rows: [fix],
    track: [fix],
    trackLimit: 2000,
    total: 21,
    page: 1,
  })
  const onRangeChange = vi.fn()
  const user = userEvent.setup()
  const client = new QueryClient()
  render(
    <QueryClientProvider client={client}>
      <GpsHistoryPage
        actorId="gps-test"
        deviceId={tracker.id}
        search={{ from: '2026-11-21', to: '2026-11-21', page: 1 }}
        onRangeChange={onRangeChange}
      />
    </QueryClientProvider>,
  )
  expect(
    await screen.findByRole('heading', { name: tracker.name }),
  ).toBeVisible()
  const table = screen.getByRole('table', {
    name: 'GPS მდებარეობის ჩანაწერები',
  })
  expect(within(table).getByText('ვალიდური')).toBeVisible()
  expect(within(table).getByText('41.718530, 44.740870')).toBeVisible()
  expect(screen.getByText('63%')).toBeVisible()
  expect(await screen.findByText('ბოლო საკონტროლო სიგნალი')).toBeVisible()
  await user.click(
    await screen.findByRole('button', { name: 'შეცდომის ნახვა' }),
  )
  const errorSheet = await screen.findByRole('dialog', {
    name: 'ბოლო დეკოდირების შეცდომა',
  })
  expect(
    within(errorSheet).getByText('პაკეტის საკონტროლო ჯამი არ ემთხვევა.'),
  ).toBeVisible()
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: 'ბოლო 7 დღე' }))
  const [period] = onRangeChange.mock.calls[0]
  expect(Date.parse(period.to) - Date.parse(period.from)).toBe(6 * 86_400_000)
  expect(screen.getByRole('link', { name: 'გვერდი 2' })).toHaveAttribute(
    'href',
    `/manage/gps/${tracker.id}?page=2`,
  )
  await user.click(
    screen.getByRole('button', {
      name: format(new Date(2026, 10, 21), 'd MMMM, yyyy', { locale: ka }),
    }),
  )
  for (const day of [20, 22]) {
    await user.click(
      screen.getByRole('button', {
        name: format(new Date(2026, 10, day), 'd MMMM yyyy', { locale: ka }),
      }),
    )
  }
  await user.click(screen.getByRole('button', { name: 'პერიოდის გამოყენება' }))
  expect(onRangeChange).toHaveBeenCalledWith({
    from: '2026-11-20',
    to: '2026-11-22',
  })
})

it('registers a named tracker with its leading zeroes and refreshes the directory', async () => {
  getWorkspace.mockResolvedValue({ rows: [], total: 0 })
  saveDevice.mockImplementation(async () => {
    getWorkspace.mockResolvedValue({ rows: [tracker], total: 1 })
    return true
  })
  const user = userEvent.setup()
  showPage(true)
  await user.click(
    screen.getByRole('button', { name: 'მოწყობილობის დამატება' }),
  )
  const editor = await screen.findByRole('dialog', {
    name: 'მოწყობილობის დამატება',
  })
  await user.type(
    within(editor).getByRole('textbox', { name: 'სახელი' }),
    tracker.name,
  )
  await user.type(
    within(editor).getByRole('textbox', {
      name: 'GPS მოწყობილობის იდენტიფიკატორი',
    }),
    tracker.reportedId,
  )
  await user.click(within(editor).getByRole('button', { name: 'შენახვა' }))
  expect(await screen.findByRole('cell', { name: tracker.name })).toBeVisible()
  expect(saveDevice).toHaveBeenCalledWith({
    data: {
      id: null,
      version: null,
      enabled: true,
      name: tracker.name,
      reportedId: tracker.reportedId,
    },
  })
})
