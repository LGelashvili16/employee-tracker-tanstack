import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { TeamMemberPicker } from './team-member-picker'
import { readCandidates } from '../teams.functions'

vi.mock('../teams.functions', () => ({ readCandidates: vi.fn() }))
let reachEnd: (() => void) | undefined
const person = (index: number) => ({
  userId: `worker-${index}`,
  name: `სპეციალისტი ${index}`,
  jobTitle: 'მემონტაჟე',
  teamId: null,
  teamName: null,
})
beforeEach(() => {
  vi.resetAllMocks()
  reachEnd = undefined
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(
        callback: (entries: Array<{ isIntersecting: boolean }>) => void,
      ) {
        reachEnd = () => callback([{ isIntersecting: true }])
      }
      observe = vi.fn()
      disconnect = vi.fn()
    },
  )
})
afterEach(() => vi.unstubAllGlobals())
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <TeamMemberPicker
        actorId="manager"
        selected={[]}
        disabled={false}
        onAdd={vi.fn()}
      />
    </QueryClientProvider>,
  )
}
it('loads 20 immediately and fetches the next page when the list end becomes visible', async () => {
  vi.mocked(readCandidates).mockImplementation(async ({ data }) => ({
    ok: true,
    value: {
      items:
        data.page === 1
          ? Array.from({ length: 20 }, (_, index) => person(index))
          : [person(20)],
      total: 21,
    },
  }))
  mount()
  await screen.findByText('ნაჩვენებია 20 / 21')
  expect(readCandidates).toHaveBeenCalledTimes(1)
  expect(screen.queryByText('სპეციალისტი 20')).not.toBeInTheDocument()
  await waitFor(() => expect(reachEnd).toBeDefined())
  act(() => reachEnd?.())
  await screen.findByText('სპეციალისტი 20')
  expect(screen.getByText('ნაჩვენებია 21 / 21')).toBeVisible()
  expect(readCandidates).toHaveBeenLastCalledWith(
    expect.objectContaining({
      data: { q: '', jobTitle: '', roles: ['production_specialist'], page: 2 },
    }),
  )
  expect(
    screen.queryByRole('button', { name: 'მეტის ჩატვირთვა' }),
  ).not.toBeInTheDocument()
})
it('restarts at page one after debounced name and job-title filters', async () => {
  vi.mocked(readCandidates).mockResolvedValue({
    ok: true,
    value: { items: [person(0)], total: 1 },
  })
  mount()
  await screen.findByText('სპეციალისტი 0')
  const user = userEvent.setup()
  await user.type(
    screen.getByRole('textbox', { name: 'თანამშრომლის ძიება' }),
    'ანა',
  )
  await waitFor(() =>
    expect(readCandidates).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: {
          q: 'ანა',
          jobTitle: '',
          roles: ['production_specialist'],
          page: 1,
        },
      }),
    ),
  )
  await user.type(
    screen.getByRole('textbox', { name: 'თანამდებობით გაფილტვრა' }),
    'მემონტაჟე',
  )
  await waitFor(() =>
    expect(readCandidates).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: {
          q: 'ანა',
          jobTitle: 'მემონტაჟე',
          roles: ['production_specialist'],
          page: 1,
        },
      }),
    ),
  )
})
it('keeps loaded employees when the next page fails and offers a retry', async () => {
  vi.mocked(readCandidates).mockImplementation(async ({ data }) => {
    if (data.page === 2) throw new Error('network failure')
    return {
      ok: true,
      value: {
        items: Array.from({ length: 20 }, (_, index) => person(index)),
        total: 21,
      },
    }
  })
  mount()
  await screen.findByText('ნაჩვენებია 20 / 21')
  await waitFor(() => expect(reachEnd).toBeDefined())
  act(() => reachEnd?.())
  await screen.findByText(
    'დარჩენილი თანამშრომლები ვერ ჩაიტვირთა. უკვე ჩატვირთული სია შენარჩუნებულია.',
  )
  expect(screen.getByText('სპეციალისტი 0')).toBeVisible()
  expect(screen.getByRole('button', { name: 'ხელახლა ცდა' })).toBeVisible()
  expect(readCandidates).toHaveBeenCalledTimes(2)
})

it('defaults to specialists and allows selecting other operational roles', async () => {
  vi.mocked(readCandidates).mockResolvedValue({
    ok: true,
    value: { items: [], total: 0 },
  })
  mount()
  const user = userEvent.setup()
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  await user.click(
    screen.getByRole('button', { name: 'როლების ფილტრი, არჩეულია 1' }),
  )
  expect(
    screen.getByRole('checkbox', { name: 'წარმოების სპეციალისტი' }),
  ).toBeChecked()
  expect(
    screen.getByRole('checkbox', { name: 'თანამშრომელი' }),
  ).not.toBeChecked()
  expect(screen.queryByRole('checkbox', { name: 'HR' })).not.toBeInTheDocument()
  expect(
    screen.queryByRole('checkbox', { name: 'ადმინისტრატორი' }),
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole('checkbox', { name: 'თანამშრომელი' }))
  await waitFor(() =>
    expect(readCandidates).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: {
          q: '',
          jobTitle: '',
          roles: ['production_specialist', 'employee'],
          page: 1,
        },
      }),
    ),
  )
})

it('closes the filter popup and clears text filters with their inline controls', async () => {
  vi.mocked(readCandidates).mockResolvedValue({
    ok: true,
    value: { items: [], total: 0 },
  })
  mount()
  const user = userEvent.setup()
  await user.click(
    screen.getByRole('button', { name: 'როლების ფილტრი, არჩეულია 1' }),
  )
  await user.click(screen.getByRole('button', { name: 'მზადაა' }))
  await waitFor(() =>
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument(),
  )
  await user.type(
    screen.getByRole('textbox', { name: 'თანამშრომლის ძიება' }),
    'ანა',
  )
  await user.type(
    screen.getByRole('textbox', { name: 'თანამდებობით გაფილტვრა' }),
    'მემონტაჟე',
  )
  await user.click(screen.getByRole('button', { name: 'ძიების გასუფთავება' }))
  await user.click(
    screen.getByRole('button', { name: 'თანამდებობის ფილტრის გასუფთავება' }),
  )
  expect(
    screen.getByRole('textbox', { name: 'თანამშრომლის ძიება' }),
  ).toHaveValue('')
  expect(
    screen.getByRole('textbox', { name: 'თანამდებობით გაფილტვრა' }),
  ).toHaveValue('')
})
