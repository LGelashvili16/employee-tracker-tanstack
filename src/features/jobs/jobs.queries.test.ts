import { QueryClient } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'
import { jobsQueryOptions } from './jobs.queries'
import { jobSearchSchema } from './jobs.schemas'

const request = vi.hoisted(() => vi.fn())
vi.mock('./jobs.functions', () => ({
  readJobs: request,
  readJob: vi.fn(),
  findJobLocations: vi.fn(),
  suggestJobAddress: vi.fn(),
}))

it('keeps cached job results separate for each selected date range', async () => {
  request.mockImplementation(({ data }: { data: { from: string } }) =>
    Promise.resolve({
      ok: true,
      value: {
        total: data.from === '2026-10-01' ? 2 : 5,
        items: [],
        markers: [],
        unmappedTotal: 0,
        mapTruncated: false,
      },
    }),
  )
  const client = new QueryClient()
  const october = jobsQueryOptions(
    'actor',
    jobSearchSchema.parse({ from: '2026-10-01', to: '2026-10-31' }),
  )
  const november = jobsQueryOptions(
    'actor',
    jobSearchSchema.parse({ from: '2026-11-01', to: '2026-11-30' }),
  )
  expect((await client.fetchQuery(october)).total).toBe(2)
  expect((await client.fetchQuery(november)).total).toBe(5)
  expect((await client.fetchQuery(october)).total).toBe(2)
  expect(request).toHaveBeenCalledTimes(2)
  client.clear()
})
