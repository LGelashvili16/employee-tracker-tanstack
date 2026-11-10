import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { JobMarker } from './job-marker'
import { JobsMapMenu } from './jobs-map-menu'
import { JobDetails } from './job-details'
import type { JobDetail } from '../jobs.types'
import type { Actor } from '#/lib/authorization/actor'

const api = vi.hoisted(() => ({
  readJob: vi.fn(),
  changeJobStatus: vi.fn(),
  editJob: vi.fn(),
  suggestJobAddress: vi.fn(),
}))
vi.mock('../jobs.functions', () => api)
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
const manager: Actor = {
  id: 'manager',
  roles: ['supervisor'],
  name: 'მენეჯერი',
  email: null,
  emailVerified: false,
}
const employee: Actor = {
  ...manager,
  id: 'worker',
  roles: ['production_specialist'],
}
const job: JobDetail = {
  id: '019a365d-37cc-7a5c-bfe1-1e0752235b68',
  title: 'ბინის აზომვა',
  kind: 'measurement',
  deadline: '2026-11-20',
  status: 'pending',
  address: 'უნივერსიტეტის ქუჩა 2',
  notes: 'წინასწარ დარეკეთ',
  longitude: 44.8,
  latitude: 41.7,
  assigneeId: null,
  assigneeName: null,
  version: 4,
  createdAt: '2026-11-07T10:00:00Z',
  updatedAt: '2026-11-07T10:00:00Z',
  streetNameKa: 'უნივერსიტეტის ქუჩა',
  streetNameEn: 'University Street',
  locationLabelKa: null,
  locationLabelEn: null,
  locationResolvedAt: null,
  creatorName: 'მენეჯერი',
  history: [],
  hasMoreHistory: false,
}
function setup(actor = manager, value = job) {
  api.readJob.mockResolvedValue({ ok: true, value })
  const onSelect = vi.fn()
  render(
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
      <JobsMapMenu
        position={{ longitude: 44.8, latitude: 41.7 }}
        onCreate={vi.fn()}
      >
        <canvas aria-label="სატესტო რუკა" />
        <JobMarker
          pin={{ ...job, longitude: 44.8, latitude: 41.7 }}
          actor={actor}
          selected={false}
          onSelect={onSelect}
        />
      </JobsMapMenu>
    </QueryClientProvider>,
  )
  return {
    marker: screen.getByRole('button', {
      name: 'ბინის აზომვა, აზომვა, დაგეგმილი',
    }),
    onSelect,
  }
}
beforeEach(() => vi.resetAllMocks())
afterEach(() => vi.useRealTimers())

it('loads the selected job on demand and confirms a worker claim before any write', async () => {
  const user = userEvent.setup()
  const { marker } = setup(employee)
  expect(api.readJob).not.toHaveBeenCalled()
  fireEvent.contextMenu(marker, { clientX: 50, clientY: 80 })
  expect(await screen.findByText('უნივერსიტეტის ქუჩა 2')).toBeInTheDocument()
  expect(screen.getByText('მენეჯერი')).toBeInTheDocument()
  expect(screen.getByText('20.11.2026')).toHaveAttribute(
    'datetime',
    '2026-11-20',
  )
  expect(
    screen.queryByRole('menuitem', { name: 'რედაქტირება' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('menuitem', { name: 'სამუშაოს უარყოფა' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('menuitem', { name: 'მონტაჟის დამატება' }),
  ).not.toBeInTheDocument()
  await user.click(
    await screen.findByRole('menuitem', { name: 'მივდივარ ობიექტზე' }),
  )
  expect(
    await screen.findByRole('dialog', { name: 'მივდივარ ობიექტზე' }),
  ).toBeInTheDocument()
  expect(api.changeJobStatus).not.toHaveBeenCalled()
  api.changeJobStatus.mockResolvedValue({ ok: true, value: { id: job.id } })
  await user.click(screen.getByRole('button', { name: 'მივდივარ ობიექტზე' }))
  await waitFor(() =>
    expect(api.changeJobStatus).toHaveBeenCalledExactlyOnceWith({
      data: { id: job.id, version: 4, status: 'en_route', note: '' },
    }),
  )
})
it('opens the editor from a manager menu without saving automatically', async () => {
  const { marker } = setup()
  fireEvent.contextMenu(marker)
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'რედაქტირება' }),
  )
  expect(
    await screen.findByRole('dialog', { name: 'სამუშაოს რედაქტირება' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'სათაური' })).toHaveValue(
    job.title,
  )
  expect(api.editJob).not.toHaveBeenCalled()
})
it('hides claiming from a production lead in both the marker menu and details', async () => {
  const { marker } = setup()
  fireEvent.contextMenu(marker)
  expect(
    await screen.findByRole('menuitem', { name: 'რედაქტირება' }),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('menuitem', { name: 'მივდივარ ობიექტზე' }),
  ).not.toBeInTheDocument()
  await userEvent.keyboard('{Escape}')
  render(<JobDetails actor={manager} job={job} />)
  expect(
    screen.queryByRole('button', { name: 'მივდივარ ობიექტზე' }),
  ).not.toBeInTheDocument()
})
it('does not offer edits or progress actions for another worker’s assigned job', async () => {
  const { marker } = setup(employee, {
    ...job,
    status: 'on_site',
    assigneeId: 'other',
    assigneeName: 'სხვა თანამშრომელი',
  })
  fireEvent.contextMenu(marker)
  expect(await screen.findByText('სხვა თანამშრომელი')).toBeInTheDocument()
  expect(screen.getAllByRole('menuitem')).toHaveLength(1)
  expect(
    screen.getByRole('menuitem', { name: 'სამუშაოს დეტალები' }),
  ).toBeInTheDocument()
})
it('shows a concise address and notes while keeping history available on request', async () => {
  render(
    <JobDetails
      actor={employee}
      job={{
        ...job,
        history: [
          {
            id: 'event',
            action: 'created',
            status: 'pending',
            note: '',
            actorName: 'ისტორიის ავტორი',
            createdAt: job.createdAt,
          },
        ],
      }}
    />,
  )
  expect(screen.getByText(job.address)).toBeInTheDocument()
  expect(screen.getByText(job.notes)).toBeInTheDocument()
  expect(screen.queryByText('University Street')).not.toBeInTheDocument()
  expect(screen.queryByText(/OpenStreetMap/)).not.toBeInTheDocument()
  expect(screen.getByText('ბოლო ცვლილება')).toBeInTheDocument()
  expect(screen.getByText('ისტორიის ავტორი')).toBeVisible()
  await userEvent.click(
    screen.getByRole('button', { name: 'ცვლილებების ისტორია' }),
  )
  expect(screen.getAllByText('ისტორიის ავტორი')).toHaveLength(2)
})
it('opens a marker menu after a one-second hold and suppresses the release click', async () => {
  const { marker, onSelect } = setup()
  vi.useFakeTimers()
  fireEvent.touchStart(marker, {
    touches: [{ identifier: 1, target: marker, clientX: 50, clientY: 80 }],
  })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(999)
  })
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2)
  })
  vi.useRealTimers()
  expect(
    await screen.findByRole('menuitem', { name: 'რედაქტირება' }),
  ).toBeInTheDocument()
  fireEvent.touchEnd(marker, { touches: [] })
  fireEvent.click(marker)
  expect(onSelect).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('menuitem', { name: 'რედაქტირება' }))
  expect(await screen.findByRole('dialog')).toBeInTheDocument()
})
it('cancels a marker hold when a second finger lands elsewhere on the map', async () => {
  const { marker } = setup()
  const canvas = screen.getByLabelText('სატესტო რუკა')
  const first = { identifier: 1, target: marker, clientX: 50, clientY: 80 }
  vi.useFakeTimers()
  fireEvent.touchStart(marker, { touches: [first] })
  fireEvent.touchStart(canvas, {
    touches: [
      first,
      { identifier: 2, target: canvas, clientX: 100, clientY: 100 },
    ],
  })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1200)
  })
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  expect(api.readJob).not.toHaveBeenCalled()
})
