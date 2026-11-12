import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { JobEditor } from './job-editor'
import { JobTransitionDialog } from './job-transition-dialog'
import type { JobDetail } from '../jobs.types'
import type { Actor } from '#/lib/authorization/actor'

const functions = vi.hoisted(() => ({
  createJob: vi.fn(),
  editJob: vi.fn(),
  changeJobStatus: vi.fn(),
  readJob: vi.fn(),
  readJobs: vi.fn(),
  suggestJobAddress: vi.fn(),
}))
vi.mock('../jobs.functions', () => functions)
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
const actor: Actor = {
  id: 'test-manager',
  roles: ['supervisor'],
  name: 'მენეჯერი',
  email: null,
  emailVerified: false,
}
const job: JobDetail = {
  id: '019a365d-37cc-7a5c-bfe1-1e0752235b68',
  title: 'მონტაჟი',
  notes: 'ინსტრუქციები',
  streetNameKa: null,
  streetNameEn: null,
  locationLabelKa: null,
  locationLabelEn: null,
  locationResolvedAt: null,
  address: 'ვაკე',
  kind: 'installation',
  deadline: null,
  status: 'pending',
  longitude: 44.8,
  latitude: 41.7,
  assigneeId: null,
  assigneeName: null,
  version: 1,
  createdAt: '2026-11-06T10:00:00Z',
  updatedAt: '2026-11-06T10:00:00Z',
  creatorName: 'მენეჯერი',
  history: [],
  hasMoreHistory: false,
}
function provider(children: React.ReactNode) {
  return render(
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
      {children}
    </QueryClientProvider>,
  )
}
describe('job forms and conflict recovery', () => {
  beforeEach(() => vi.resetAllMocks())
  it('creates a job with a calendar deadline without submitting when a date is selected', async () => {
    functions.createJob.mockResolvedValue({ ok: true, value: { id: job.id } })
    provider(
      <JobEditor actorId={actor.id} onClose={vi.fn()} onSaved={vi.fn()} />,
    )
    await userEvent.type(
      screen.getByRole('textbox', { name: 'სათაური' }),
      'აზომვის სამუშაო',
    )
    await userEvent.click(screen.getByRole('button', { name: 'ვადა' }))
    // Navigate through the visible year/month controls instead of depending on today's month.
    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: 'წელი' }),
      '2026',
    )
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'თვე' }),
      '10',
    )
    await userEvent.click(
      screen.getByRole('button', { name: '20 ნოემბერი 2026' }),
    )
    expect(
      screen.getByRole('button', { name: 'ვადა: 20 ნოემბერი, 2026' }),
    ).toBeInTheDocument()
    expect(functions.createJob).not.toHaveBeenCalled()
    await userEvent.click(
      screen.getByRole('button', { name: 'სამუშაოს დამატება' }),
    )
    await waitFor(() => expect(functions.createJob).toHaveBeenCalledOnce())
    expect(functions.createJob.mock.calls[0][0].data).toMatchObject({
      deadline: '2026-11-20',
    })
  })
  it('allows clearing a saved deadline explicitly when editing', async () => {
    functions.editJob.mockResolvedValue({ ok: true, value: { id: job.id } })
    provider(
      <JobEditor
        actorId={actor.id}
        job={{ ...job, deadline: '2026-11-20' }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'ვადა: 20 ნოემბერი, 2026' }),
    )
    await userEvent.click(
      await screen.findByRole('button', { name: 'ვადის გასუფთავება' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'შენახვა' }))
    await waitFor(() => expect(functions.editJob).toHaveBeenCalledOnce())
    expect(functions.editJob.mock.calls[0][0].data).toMatchObject({
      deadline: null,
    })
  })
  it('preselects and submits a generic job from the map menu', async () => {
    functions.createJob.mockResolvedValue({ ok: true, value: { id: job.id } })
    provider(
      <JobEditor
        actorId={actor.id}
        suggestedKind="other"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    expect(
      screen.getByRole('combobox', { name: 'სამუშაოს ტიპი' }),
    ).toHaveTextContent('სხვა სამუშაო')
    await userEvent.type(
      screen.getByRole('textbox', { name: 'სათაური' }),
      'სატესტო სხვა სამუშაო',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'სამუშაოს დამატება' }),
    )
    await waitFor(() => expect(functions.createJob).toHaveBeenCalledOnce())
    expect(functions.createJob.mock.calls[0][0].data).toMatchObject({
      kind: 'other',
      longitude: null,
      latitude: null,
    })
  })
  it('fills a new map-selected job address without validating untouched fields', async () => {
    functions.createJob.mockResolvedValue({ ok: true, value: { id: job.id } })
    functions.suggestJobAddress.mockResolvedValue({
      ok: true,
      value: 'უნივერსიტეტის ქუჩა, თბილისი',
    })
    provider(
      <JobEditor
        actorId={actor.id}
        position={{ longitude: 44.8, latitude: 41.7 }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'მისამართი' })).toHaveValue(
        'უნივერსიტეტის ქუჩა, თბილისი',
      ),
    )
    expect(functions.suggestJobAddress.mock.calls[0][0].data).toEqual({
      longitude: 44.8,
      latitude: 41.7,
    })
    expect(
      screen.queryByText('სათაური უნდა შეიცავდეს მინიმუმ 3 სიმბოლოს.'),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: 'განედი' })).toHaveValue(41.7)
    expect(
      screen.getByText(/მისამართი ავტომატურად შეივსო\./),
    ).toBeInTheDocument()
    await userEvent.type(
      screen.getByRole('textbox', { name: 'სათაური' }),
      'ახალი მონტაჟი',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'სამუშაოს დამატება' }),
    )
    await waitFor(() => expect(functions.createJob).toHaveBeenCalledOnce())
    expect(functions.createJob.mock.calls[0][0].data.address).toBe(
      'უნივერსიტეტის ქუჩა, თბილისი',
    )
  })
  it.each(['ხელით მითითებული მისამართი', ''])(
    'preserves manual address edits including intentional clearing: %s',
    async (value) => {
      let resolveLookup:
        ((result: { ok: true; value: string }) => void) | undefined
      functions.suggestJobAddress.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveLookup = resolve
          }),
      )
      provider(
        <JobEditor
          actorId={actor.id}
          position={{ longitude: 44.8, latitude: 41.7 }}
          onClose={vi.fn()}
          onSaved={vi.fn()}
        />,
      )
      await waitFor(() =>
        expect(functions.suggestJobAddress).toHaveBeenCalledOnce(),
      )
      const address = screen.getByRole('textbox', { name: 'მისამართი' })
      await userEvent.type(address, value || 'გასუფთავება')
      if (!value) await userEvent.clear(address)
      await act(async () => {
        resolveLookup?.({ ok: true, value: 'დაგვიანებული მისამართი' })
      })
      expect(address).toHaveValue(value)
      expect(
        screen.queryByText(/მისამართი ავტომატურად შეივსო\./),
      ).not.toBeInTheDocument()
    },
  )
  it('removes the review notice once an automatically filled address is edited', async () => {
    functions.suggestJobAddress.mockResolvedValue({
      ok: true,
      value: 'უნივერსიტეტის ქუჩა 12, თბილისი',
    })
    provider(
      <JobEditor
        actorId={actor.id}
        position={{ longitude: 44.8, latitude: 41.7 }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    await screen.findByText(/მისამართი ავტომატურად შეივსო\./)
    const address = screen.getByRole('textbox', { name: 'მისამართი' })
    await userEvent.clear(address)
    await userEvent.type(address, 'უნივერსიტეტის ქუჩა 12ა, თბილისი')
    expect(
      screen.queryByText(/მისამართი ავტომატურად შეივსო\./),
    ).not.toBeInTheDocument()
    expect(address).not.toHaveAttribute(
      'aria-describedby',
      'job-address-review',
    )
  })
  it('ignores a late suggestion after the location changes', async () => {
    let resolveLookup:
      ((result: { ok: true; value: string }) => void) | undefined
    functions.suggestJobAddress.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLookup = resolve
        }),
    )
    provider(
      <JobEditor
        actorId={actor.id}
        position={{ longitude: 44.8, latitude: 41.7 }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    await waitFor(() =>
      expect(functions.suggestJobAddress).toHaveBeenCalledOnce(),
    )
    await userEvent.clear(screen.getByRole('spinbutton', { name: 'განედი' }))
    await userEvent.type(
      screen.getByRole('spinbutton', { name: 'განედი' }),
      '41.72',
    )
    await act(async () => {
      resolveLookup?.({ ok: true, value: 'ძველი მდებარეობის მისამართი' })
    })
    expect(screen.getByRole('textbox', { name: 'მისამართი' })).toHaveValue('')
  })
  it('keeps manual entry and saving available when address lookup finds nothing', async () => {
    functions.suggestJobAddress.mockResolvedValue({ ok: true, value: null })
    functions.createJob.mockResolvedValue({ ok: true, value: { id: job.id } })
    provider(
      <JobEditor
        actorId={actor.id}
        position={{ longitude: 44.8, latitude: 41.7 }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    await screen.findByText('მისამართი ვერ მოიძებნა. შეგიძლიათ ხელით მიუთითოთ.')
    await userEvent.type(
      screen.getByRole('textbox', { name: 'მისამართი' }),
      'მომხმარებლის მისამართი',
    )
    await userEvent.type(
      screen.getByRole('textbox', { name: 'სათაური' }),
      'ახალი მონტაჟი',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'სამუშაოს დამატება' }),
    )
    await waitFor(() => expect(functions.createJob).toHaveBeenCalledOnce())
    expect(functions.createJob.mock.calls[0][0].data.address).toBe(
      'მომხმარებლის მისამართი',
    )
  })
  it('keeps addresses selected from search and existing job addresses without another lookup', () => {
    const view = provider(
      <JobEditor
        actorId={actor.id}
        position={{ longitude: 44.8, latitude: 41.7 }}
        suggestedAddress="ძიებიდან არჩეული მისამართი"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    expect(screen.getByRole('textbox', { name: 'მისამართი' })).toHaveValue(
      'ძიებიდან არჩეული მისამართი',
    )
    expect(
      screen.getByText(/მისამართი ავტომატურად შეივსო\./),
    ).toBeInTheDocument()
    view.unmount()
    provider(
      <JobEditor
        actorId={actor.id}
        job={job}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    expect(screen.getByRole('textbox', { name: 'მისამართი' })).toHaveValue(
      job.address,
    )
    expect(functions.suggestJobAddress).not.toHaveBeenCalled()
    expect(
      screen.queryByText(/მისამართი ავტომატურად შეივსო\./),
    ).not.toBeInTheDocument()
  })
  it('rejects manually entered foreign coordinates and retains the draft', async () => {
    provider(
      <JobEditor
        actorId={actor.id}
        job={job}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    const latitude = screen.getByRole('spinbutton', { name: 'განედი' })
    const longitude = screen.getByRole('spinbutton', { name: 'გრძედი' })
    await userEvent.clear(latitude)
    await userEvent.type(latitude, '43.024')
    await userEvent.clear(longitude)
    await userEvent.type(longitude, '44.681')
    await userEvent.click(screen.getByRole('button', { name: 'შენახვა' }))
    expect(
      await screen.findByText(
        'სამუშაოს მდებარეობა საქართველოს ტერიტორიაზე უნდა იყოს.',
        { selector: '[data-slot="field-error"]' },
      ),
    ).toBeInTheDocument()
    expect(functions.editJob).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox', { name: 'სათაური' })).toHaveValue(
      job.title,
    )
    expect(latitude).toHaveValue(43.024)
  })
  it('validates creation fields and retains data when persistence fails', async () => {
    functions.createJob.mockResolvedValue({
      ok: false,
      code: 'failed',
      message: 'შენახვა დროებით მიუწვდომელია.',
    })
    provider(
      <JobEditor actorId={actor.id} onClose={vi.fn()} onSaved={vi.fn()} />,
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'სამუშაოს დამატება' }),
    )
    expect(functions.createJob).not.toHaveBeenCalled()
    expect(
      screen.getByText('სათაური უნდა შეიცავდეს მინიმუმ 3 სიმბოლოს.'),
    ).toBeInTheDocument()
    await userEvent.type(
      screen.getByRole('textbox', { name: 'სათაური' }),
      'ახალი მონტაჟი',
    )
    await userEvent.click(
      screen.getByRole('switch', { name: 'ზუსტი მდებარეობა რუკაზე' }),
    )
    await userEvent.type(
      screen.getByRole('spinbutton', { name: 'განედი' }),
      '41.7',
    )
    await userEvent.type(
      screen.getByRole('spinbutton', { name: 'გრძედი' }),
      '44.8',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'სამუშაოს დამატება' }),
    )
    await screen.findByText('შენახვა დროებით მიუწვდომელია.')
    expect(screen.getByRole('textbox', { name: 'სათაური' })).toHaveValue(
      'ახალი მონტაჟი',
    )
  })
  it('creates a job without coordinates by default', async () => {
    functions.createJob.mockResolvedValue({ ok: true, value: { id: job.id } })
    const onSaved = vi.fn()
    provider(
      <JobEditor actorId={actor.id} onClose={vi.fn()} onSaved={onSaved} />,
    )
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    await userEvent.type(
      screen.getByRole('textbox', { name: 'სათაური' }),
      'ახალი აზომვა',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'სამუშაოს დამატება' }),
    )
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(job.id))
    expect(functions.createJob.mock.calls[0][0].data).toMatchObject({
      longitude: null,
      latitude: null,
    })
  })
  it('requires both coordinates only while the switch is on and clears them when disabled', async () => {
    functions.createJob.mockResolvedValue({ ok: true, value: { id: job.id } })
    provider(
      <JobEditor actorId={actor.id} onClose={vi.fn()} onSaved={vi.fn()} />,
    )
    await userEvent.type(
      screen.getByRole('textbox', { name: 'სათაური' }),
      'ახალი მონტაჟი',
    )
    const toggle = screen.getByRole('switch', {
      name: 'ზუსტი მდებარეობა რუკაზე',
    })
    await userEvent.click(toggle)
    await userEvent.click(
      screen.getByRole('button', { name: 'სამუშაოს დამატება' }),
    )
    expect(functions.createJob).not.toHaveBeenCalled()
    expect(screen.getByText('მიუთითეთ განედი.')).toBeInTheDocument()
    await userEvent.type(
      screen.getByRole('spinbutton', { name: 'განედი' }),
      '41.7',
    )
    await userEvent.type(
      screen.getByRole('spinbutton', { name: 'გრძედი' }),
      '44.8',
    )
    await userEvent.click(toggle)
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'სამუშაოს დამატება' }),
    )
    await waitFor(() => expect(functions.createJob).toHaveBeenCalledOnce())
    expect(functions.createJob.mock.calls[0][0].data).toMatchObject({
      longitude: null,
      latitude: null,
    })
  })
  it('keeps an edit draft and requires reviewing the latest job before retrying', async () => {
    functions.editJob
      .mockResolvedValueOnce({
        ok: false,
        code: 'conflict',
        message: 'სამუშაო უკვე შეიცვალა.',
      })
      .mockResolvedValueOnce({ ok: true, value: { id: job.id } })
    functions.readJob.mockResolvedValue({
      ok: true,
      value: { ...job, title: 'სხვა მომხმარებლის ცვლილება', version: 2 },
    })
    const onSaved = vi.fn()
    provider(
      <JobEditor
        actorId={actor.id}
        job={job}
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    )
    const title = screen.getByRole('textbox', { name: 'სათაური' })
    await userEvent.clear(title)
    await userEvent.type(title, 'ჩემი შენარჩუნებული სათაური')
    await userEvent.click(screen.getByRole('button', { name: 'შენახვა' }))
    await screen.findByText('სამუშაო სხვა მომხმარებელმა შეცვალა')
    expect(screen.getByRole('button', { name: 'შენახვა' })).toBeDisabled()
    await userEvent.click(
      screen.getByRole('button', { name: 'მიმდინარე ინფორმაციის ჩატვირთვა' }),
    )
    await screen.findByText('სხვა მომხმარებლის ცვლილება')
    expect(title).toHaveValue('ჩემი შენარჩუნებული სათაური')
    await userEvent.click(
      screen.getByRole('button', {
        name: 'გადავხედე, ჩემი ცვლილებებით გაგრძელება',
      }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'შენახვა' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(job.id))
    expect(functions.editJob.mock.calls[1][0].data).toMatchObject({
      title: 'ჩემი შენარჩუნებული სათაური',
      version: 2,
    })
  })
  it('retains a rejection reason across a conflict and prevents an invalid new action', async () => {
    functions.changeJobStatus.mockResolvedValue({
      ok: false,
      code: 'conflict',
      message: 'სამუშაო უკვე შეიცვალა.',
    })
    functions.readJob.mockResolvedValue({
      ok: true,
      value: { ...job, status: 'completed', version: 4 },
    })
    provider(
      <JobTransitionDialog
        actor={actor}
        job={job}
        status="rejected"
        onClose={vi.fn()}
      />,
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'სამუშაოს უარყოფა' }),
    )
    expect(functions.changeJobStatus).not.toHaveBeenCalled()
    await userEvent.type(
      screen.getByRole('textbox', { name: 'მიზეზი' }),
      'ობიექტი დაკეტილია',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'სამუშაოს უარყოფა' }),
    )
    await screen.findByText('სამუშაო სხვა მომხმარებელმა შეცვალა')
    await userEvent.click(
      screen.getByRole('button', { name: 'მიმდინარე ინფორმაციის ჩატვირთვა' }),
    )
    await screen.findByText(
      'ეს მოქმედება მიმდინარე სტატუსისთვის აღარ არის ხელმისაწვდომი. დაბრუნდით სამუშაოს დეტალებზე.',
    )
    expect(screen.getByRole('textbox', { name: 'მიზეზი' })).toHaveValue(
      'ობიექტი დაკეტილია',
    )
    expect(
      screen.queryByRole('button', {
        name: 'გადავხედე, ჩემი ცვლილებებით გაგრძელება',
      }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'სამუშაოს უარყოფა' }),
    ).toBeDisabled()
  })
})
