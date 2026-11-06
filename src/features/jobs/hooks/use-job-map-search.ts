import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import { jobLocationsQueryOptions, jobsQueryOptions } from '../jobs.queries'
import { jobMapSearchSchema } from '../jobs.schemas'
import type { ResolvedLocation } from '../job-locations.types'
import type { JobSearch, JobSummary } from '../jobs.types'

export type MapSearchItem =
  | { type: 'location'; key: string; label: string; location: ResolvedLocation }
  | { type: 'job'; key: string; label: string; job: JobSummary }

export function useJobMapSearch(
  actorId: string,
  search: JobSearch,
  onQueryChange: (q: string) => void,
) {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [settledQuery, setSettledQuery] = useState(search.q)
  const applied = useRef(search.q)
  const pending = useRef(new Set<string>())
  const form = useForm({
    defaultValues: { q: search.q },
    validators: { onChange: jobMapSearchSchema, onSubmit: jobMapSearchSchema },
  })
  const value = useStore(form.store, (state) => state.values.q)
  const query = value.trim()
  const valid = jobMapSearchSchema.safeParse({ q: query }).success
  const commit = useEffectEvent(() => {
    setSettledQuery(query)
    if (!valid || query === search.q || pending.current.has(query)) return
    pending.current.add(query)
    onQueryChange(query)
  })
  // Synchronize the input with the debounce timer; Query owns requests and discards obsolete query results.
  useEffect(() => {
    const timer = setTimeout(commit, 500)
    return () => clearTimeout(timer)
  }, [query, search.q])
  // Back/Forward navigation is external to the input. Preserve our own pending commits and restore external URL changes.
  useEffect(() => {
    if (search.q === applied.current) return
    applied.current = search.q
    if (pending.current.delete(search.q)) return
    pending.current.clear()
    form.reset({ q: search.q })
    setSettledQuery(search.q)
  }, [search.q, form])
  const ready = open && !minimized && valid && settledQuery === query
  const addresses = useQuery({
    ...jobLocationsQueryOptions(actorId, settledQuery),
    enabled: ready && settledQuery.length >= 3,
  })
  const jobs = useQuery({
    ...jobsQueryOptions(actorId, { ...search, q: settledQuery, page: 1 }),
    enabled: ready && settledQuery.length >= 2,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  })
  const locations: Array<MapSearchItem> = []
  const labels = new Set<string>()
  if (ready && query.length >= 3)
    for (const location of addresses.data ?? []) {
      const label = location.labelKa ?? location.labelEn ?? ''
      // OSM often splits a street into several ways with identical display names.
      if (!label || labels.has(label)) continue
      labels.add(label)
      locations.push({
        type: 'location',
        key: location.sourceId,
        label,
        location,
      })
    }
  const work: Array<MapSearchItem> =
    ready && query.length >= 2
      ? (jobs.data?.items ?? [])
          .slice(0, 5)
          .map((job) => ({ type: 'job', key: job.id, label: job.title, job }))
      : []
  return {
    form,
    value,
    query,
    valid,
    open,
    setOpen,
    minimized,
    setMinimized,
    locations,
    work,
    items: [...locations, ...work],
    addressLoading: query.length >= 3 && (!ready || addresses.isFetching),
    jobsLoading: query.length >= 2 && (!ready || jobs.isFetching),
    addressError: ready && query.length >= 3 && addresses.isError,
    jobsError: ready && query.length >= 2 && jobs.isError,
    jobsTotal: ready && query.length >= 2 ? (jobs.data?.total ?? 0) : 0,
  }
}
export type JobMapSearchModel = ReturnType<typeof useJobMapSearch>
