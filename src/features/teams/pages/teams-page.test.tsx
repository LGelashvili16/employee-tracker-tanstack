import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { TeamsPage } from './teams-page'
import { teamSearchSchema } from '../teams.schemas'
import {
  saveTeam,
  deleteTeam,
  readCandidates,
  readTeams,
} from '../teams.functions'

vi.mock('../teams.functions', () => ({
  saveTeam: vi.fn(),
  deleteTeam: vi.fn(),
  restoreTeam: vi.fn(),
  readTeams: vi.fn(),
  readCandidates: vi.fn(),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: React.ReactNode }) => (
    <a href="/manage/teams">{children}</a>
  ),
}))
const onSearch = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(readTeams).mockResolvedValue({
    ok: true,
    value: { items: [], total: 0, selected: null },
  })
  vi.mocked(readCandidates).mockResolvedValue({
    ok: true,
    value: { items: [], total: 0 },
  })
})
function mount(search = teamSearchSchema.parse({})) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <TeamsPage actorId="manager" search={search} onSearch={onSearch} />
    </QueryClientProvider>,
  )
}
it('validates the team name and opens the saved team only after confirmed creation', async () => {
  vi.mocked(saveTeam).mockResolvedValue({ ok: true, value: 'team-created' })
  mount()
  const user = userEvent.setup()
  await screen.findByText('ამ სიაში გუნდები ჯერ არ არის.')
  await user.click(screen.getByRole('button', { name: 'გუნდის შექმნა' }))
  const name = screen.getByRole('textbox', { name: 'გუნდის სახელი' })
  await user.type(name, 'ა')
  await user.click(screen.getByRole('button', { name: 'შენახვა' }))
  expect(saveTeam).not.toHaveBeenCalled()
  await user.type(name, 'ლფა')
  await user.click(screen.getByRole('button', { name: 'შენახვა' }))
  await waitFor(() =>
    expect(saveTeam).toHaveBeenCalledWith({
      data: {
        name: 'ალფა',
        id: null,
        version: null,
        members: [],
        leaderId: null,
        active: true,
      },
    }),
  )
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
it('keeps the entered name and displays a safe Georgian error after a network failure', async () => {
  vi.mocked(saveTeam).mockRejectedValue(new Error('Failed to fetch'))
  mount()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'გუნდის შექმნა' }))
  await user.type(
    screen.getByRole('textbox', { name: 'გუნდის სახელი' }),
    'ალფა',
  )
  await user.click(screen.getByRole('button', { name: 'შენახვა' }))
  expect(
    await screen.findByText(
      'შენახვა ვერ მოხერხდა. გადაამოწმეთ კავშირი და წვდომა.',
    ),
  ).toBeVisible()
  expect(screen.getByRole('textbox', { name: 'გუნდის სახელი' })).toHaveValue(
    'ალფა',
  )
  expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument()
  expect(onSearch).not.toHaveBeenCalled()
})

it('confirms transfers inside the same sheet without opening a second dialog', async () => {
  const id = '00000000-0000-4000-8000-000000000001'
  const fromTeamId = '00000000-0000-4000-8000-000000000002'
  vi.mocked(readTeams).mockResolvedValue({
    ok: true,
    value: {
      items: [],
      total: 0,
      selected: {
        id,
        name: 'ალფა',
        active: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [],
        history: [],
      },
    },
  })
  vi.mocked(readCandidates).mockResolvedValue({
    ok: true,
    value: {
      items: [
        {
          userId: 'specialist',
          name: 'ანა',
          jobTitle: null,
          teamId: fromTeamId,
          teamName: 'ბეტა',
        },
      ],
      total: 1,
    },
  })
  vi.mocked(saveTeam).mockResolvedValue({ ok: true, value: id })
  mount(teamSearchSchema.parse({ team: id }))
  const user = userEvent.setup()
  await user.click(
    await screen.findByRole('button', { name: 'გადმოყვანის დამატება' }),
  )
  expect(screen.getAllByRole('dialog')).toHaveLength(1)
  expect(saveTeam).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'ხელმძღვანელად არჩევა' }))
  expect(saveTeam).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'შენახვა' }))
  await waitFor(() =>
    expect(saveTeam).toHaveBeenCalledWith({
      data: {
        id,
        version: 1,
        name: 'ალფა',
        active: true,
        members: [{ userId: 'specialist', fromTeamId }],
        leaderId: 'specialist',
      },
    }),
  )
})

it('discards a new team draft when cancelled', async () => {
  mount()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'გუნდის შექმნა' }))
  await user.type(
    screen.getByRole('textbox', { name: 'გუნდის სახელი' }),
    'დრაფტი',
  )
  await user.click(screen.getByRole('button', { name: 'გაუქმება' }))
  expect(saveTeam).not.toHaveBeenCalled()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('selects members and a leader before the first and only creation request', async () => {
  vi.mocked(readCandidates).mockResolvedValue({
    ok: true,
    value: {
      items: [
        {
          userId: 'solo',
          name: 'ანა',
          jobTitle: null,
          teamId: null,
          teamName: null,
        },
      ],
      total: 1,
    },
  })
  vi.mocked(saveTeam).mockResolvedValue({ ok: true, value: 'saved' })
  mount()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'გუნდის შექმნა' }))
  await user.type(
    screen.getByRole('textbox', { name: 'გუნდის სახელი' }),
    'ახალი გუნდი',
  )
  await user.click(await screen.findByRole('button', { name: 'დამატება' }))
  await user.click(screen.getByRole('button', { name: 'ხელმძღვანელად არჩევა' }))
  expect(saveTeam).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'შენახვა' }))
  await waitFor(() =>
    expect(saveTeam).toHaveBeenCalledExactlyOnceWith({
      data: {
        id: null,
        version: null,
        name: 'ახალი გუნდი',
        active: true,
        members: [{ userId: 'solo', fromTeamId: null }],
        leaderId: 'solo',
      },
    }),
  )
})

it('opens the selected team from its edit action while preserving directory filters', async () => {
  const id = '00000000-0000-4000-8000-000000000001'
  vi.mocked(readTeams).mockResolvedValue({
    ok: true,
    value: {
      items: [
        {
          id,
          name: 'ალფა',
          active: true,
          version: 1,
          memberCount: 2,
          leaderName: 'ანა',
          createdAt: new Date('2026-11-17T10:00:00Z'),
          updatedAt: new Date('2026-11-17T10:00:00Z'),
        },
      ],
      total: 1,
      selected: null,
    },
  })
  const search = teamSearchSchema.parse({ q: 'ალფა', sort: 'newest' })
  mount(search)
  const user = userEvent.setup()
  expect(await screen.findByText('ანა')).toBeVisible()
  expect(screen.getByRole('cell', { name: '2' })).toBeVisible()
  await user.click(
    await screen.findByRole('button', { name: 'ალფა: რედაქტირება' }),
  )
  expect(onSearch).toHaveBeenCalledWith({ ...search, team: id })
})

it('keeps the directory visible while the selected team loads', async () => {
  const id = '00000000-0000-4000-8000-000000000001'
  const item = {
    id,
    name: 'ალფა',
    active: true,
    version: 1,
    memberCount: 0,
    leaderName: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  let finish:
    ((value: Awaited<ReturnType<typeof readTeams>>) => void) | undefined
  const detail = new Promise<Awaited<ReturnType<typeof readTeams>>>(
    (resolve) => {
      finish = resolve
    },
  )
  vi.mocked(readTeams).mockImplementation(({ data }) =>
    data.team
      ? detail
      : Promise.resolve({
          ok: true,
          value: { items: [item], total: 1, selected: null },
        }),
  )
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const initialSearch = teamSearchSchema.parse({})
  const { rerender } = render(
    <QueryClientProvider client={client}>
      <TeamsPage actorId="manager" search={initialSearch} onSearch={onSearch} />
    </QueryClientProvider>,
  )
  await screen.findByRole('button', { name: 'ალფა: რედაქტირება' })
  rerender(
    <QueryClientProvider client={client}>
      <TeamsPage
        actorId="manager"
        search={{ ...initialSearch, team: id }}
        onSearch={onSearch}
      />
    </QueryClientProvider>,
  )
  expect(screen.getByRole('table', { hidden: true })).toBeInTheDocument()
  expect(screen.queryByText('გუნდები იტვირთება')).not.toBeInTheDocument()
  finish?.({
    ok: true,
    value: {
      items: [item],
      total: 1,
      selected: { ...item, members: [], history: [] },
    },
  })
  await screen.findByRole('dialog', { name: 'ალფა' })
})

it('requires confirmation before permanently deleting a team', async () => {
  const id = '00000000-0000-4000-8000-000000000001'
  vi.mocked(readTeams).mockResolvedValue({
    ok: true,
    value: {
      items: [],
      total: 0,
      selected: {
        id,
        name: 'ალფა',
        active: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [],
        history: [],
      },
    },
  })
  vi.mocked(deleteTeam).mockResolvedValue({ ok: true, value: id })
  mount(teamSearchSchema.parse({ team: id }))
  const user = userEvent.setup()
  await user.click(
    await screen.findByRole('button', { name: 'გუნდის სამუდამოდ წაშლა' }),
  )
  expect(deleteTeam).not.toHaveBeenCalled()
  expect(screen.getByText(/მოქმედების გაუქმება შეუძლებელია/)).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'წაშლა' }))
  await waitFor(() =>
    expect(deleteTeam).toHaveBeenCalledWith({ data: { id, version: 1 } }),
  )
})
