import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { DeviceReviewPage } from './device-review-page'
import { SecurityPage } from '#/features/account/pages/security-page'
import { SecuritySettingsPage } from '#/features/access/pages/security-settings-page'

const calls = vi.hoisted(() => ({
  review: vi.fn(),
  own: vi.fn(),
  policy: vi.fn(),
  navigate: vi.fn(),
  decide: vi.fn(),
  request: vi.fn(),
  state: 'all',
}))
vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({
    useRouteContext: () => ({ actor: { id: 'reviewer' } }),
    useSearch: () => ({
      page: 1,
      q: '',
      state: calls.state,
      sort: 'newest',
      devicePage: 1,
      deviceQ: '',
      deviceState: 'all',
      deviceSort: 'newest',
    }),
    useNavigate: () => calls.navigate,
  }),
}))
vi.mock('../attendance-security.functions', () => ({
  readDeviceRequests: calls.review,
  readOwnDevices: calls.own,
  readAttendanceSecurityPolicy: calls.policy,
  readAttendanceEmployeeNetwork: vi.fn(),
  reviewAttendanceDevice: calls.decide,
  requestAttendanceDevice: calls.request,
  registerAutomaticAttendanceDevice: vi.fn(),
  registerAttendancePasskey: vi.fn(),
  verifyAttendanceRegistration: vi.fn(),
  updateAttendanceSecurityPolicy: vi.fn(),
}))
vi.mock('#/features/attendance/attendance.functions', () => ({
  readAssistedClockState: vi.fn(),
}))
vi.mock('#/features/account/components/change-password-form', () => ({
  ChangePasswordForm: () => null,
}))

beforeEach(() => {
  vi.clearAllMocks()
  calls.request.mockResolvedValue({ ok: true, value: {} })
  calls.state = 'all'
  calls.decide.mockResolvedValue({ ok: true, value: {} })
  calls.review.mockResolvedValue({
    ok: true,
    value: { items: [], total: 0, timezone: 'Asia/Tbilisi' },
  })
  calls.own.mockResolvedValue({
    ok: true,
    value: {
      items: [],
      total: 0,
      currentDeviceId: null,
      currentDevice: null,
      browserApprovalRequired: true,
      passkeyRequired: false,
      timezone: 'Asia/Tbilisi',
    },
  })
  calls.policy.mockResolvedValue({
    ok: true,
    value: {
      revision: 0,
      browserApprovalRequired: true,
      passkeyRequired: false,
      ipRestrictionEnabled: false,
      allowedIps: [],
      blockedIps: [],
    },
  })
})

// Render route entry points without a test-provided cache, as the app does.
it('opens the device review page with the pending URL filter', async () => {
  calls.state = 'pending'
  render(<DeviceReviewPage />)
  expect(
    await screen.findByText('შესაბამისი მოწყობილობები არ მოიძებნა.'),
  ).toBeVisible()
  expect(calls.review).toHaveBeenCalledWith({
    data: { page: 1, q: '', state: 'pending', sort: 'newest' },
  })
})

it('opens employee security settings without a manual device-name form', async () => {
  render(<SecurityPage />)
  expect(
    await screen.findByRole('region', {
      name: 'მიმდინარე მოწყობილობის უსაფრთხოება',
    }),
  ).toBeVisible()
  expect(screen.queryByLabelText('მოწყობილობის სახელი')).not.toBeInTheDocument()
  expect(calls.own).toHaveBeenCalledWith({
    data: { page: 1, q: '', state: 'all', sort: 'newest' },
  })
})

it('lets an employee request review of a revoked browser without entering a name or adding another key', async () => {
  calls.own.mockResolvedValue({
    ok: true,
    value: {
      items: [],
      total: 0,
      timezone: 'Asia/Tbilisi',
      browserApprovalRequired: true,
      passkeyRequired: true,
      currentDeviceId: '019a7500-0000-7000-8000-000000000001',
      currentDevice: {
        id: '019a7500-0000-7000-8000-000000000001',
        name: 'ბრაუზერი',
        state: 'revoked',
        hasPasskey: true,
      },
    },
  })
  render(<SecurityPage />)
  await userEvent.setup().click(
    await screen.findByRole('button', {
      name: 'ხელახალი დადასტურების მოთხოვნა',
    }),
  )
  await waitFor(() =>
    expect(calls.request).toHaveBeenCalledWith({ data: { name: 'ბრაუზერი' } }),
  )
  expect(screen.queryByLabelText('მოწყობილობის სახელი')).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Passkey-ის დამატება' }),
  ).not.toBeInTheDocument()
})
it('opens the admin security policy settings', async () => {
  render(<SecuritySettingsPage />)
  expect(
    await screen.findByRole('switch', {
      name: 'ტოკენით გადამოწმება',
    }),
  ).toBeChecked()
  expect(
    screen.getByRole('switch', { name: 'დამატებითი გადამოწმება (Passkey)' }),
  ).not.toBeChecked()
  expect(calls.policy).toHaveBeenCalledOnce()
})

it.each([true, false])(
  'exposes own-browser approval only with the server capability=%s',
  async (canApproveOwn) => {
    const id = '019a7500-0000-7000-8000-000000000001'
    calls.review.mockResolvedValue({
      ok: true,
      value: {
        canApproveOwn,
        browserApprovalRequired: true,
        passkeyRequired: false,
        timezone: 'Asia/Tbilisi',
        total: 1,
        items: [
          {
            id,
            userId: 'reviewer',
            userName: 'HR',
            name: 'ჩემი ბრაუზერი',
            state: 'pending',
            revision: 3,
            hasPasskey: false,
            backedUp: false,
            requestedIp: null,
            createdAt: '2026-11-17T06:00:00.000Z',
          },
        ],
      },
    })
    render(<DeviceReviewPage />)
    await screen.findByText('ჩემი ბრაუზერი')
    if (!canApproveOwn) {
      expect(
        screen.queryByRole('button', {
          name: 'საკუთარი მოწყობილობის დადასტურება',
        }),
      ).not.toBeInTheDocument()
      expect(screen.getByText('საკუთარი მოთხოვნა')).toBeVisible()
      return
    }
    const user = userEvent.setup()
    await user.click(
      screen.getByRole('button', { name: 'საკუთარი მოწყობილობის დადასტურება' }),
    )
    expect(
      screen.queryByRole('button', { name: 'უარყოფა' }),
    ).not.toBeInTheDocument()
    expect(calls.decide).not.toHaveBeenCalled()
    await user.click(
      screen.getByRole('button', { name: 'გადაწყვეტილების შენახვა' }),
    )
    await waitFor(() =>
      expect(calls.decide).toHaveBeenCalledExactlyOnceWith({
        data: { id, revision: 3, decision: 'approved' },
      }),
    )
  },
)
it.each(['approved', 'revoked'] as const)(
  'saves a device %s decision without a reason field',
  async (decision) => {
    const id = '019a7500-0000-7000-8000-000000000001'
    calls.review.mockResolvedValueOnce({
      ok: true,
      value: {
        items: [
          {
            id,
            userId: 'employee',
            userName: 'თანამშრომელი',
            name: 'დასწრების ბრაუზერი',
            state: decision === 'revoked' ? 'approved' : 'pending',
            revision: 0,
            hasPasskey: true,
            backedUp: false,
            requestedIp: null,
            createdAt: '2026-11-16T08:00:00.000Z',
          },
        ],
        total: 1,
        timezone: 'Asia/Tbilisi',
      },
    })
    const user = userEvent.setup()
    render(<DeviceReviewPage />)
    await user.click(
      await screen.findByRole('button', {
        name: decision === 'revoked' ? 'გაუქმება' : 'დადასტურება',
      }),
    )
    expect(
      screen.queryByRole('textbox', { name: /მიზეზი/ }),
    ).not.toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'გადაწყვეტილების შენახვა' }),
    )
    await waitFor(() =>
      expect(calls.decide).toHaveBeenCalledWith({
        data: { id, revision: 0, decision },
      }),
    )
    expect(
      await screen.findByText('შესაბამისი მოწყობილობები არ მოიძებნა.'),
    ).toBeVisible()
  },
)
it.each([
  {
    browserApprovalRequired: true,
    passkeyRequired: false,
    label: 'Token',
    variant: 'blue',
  },
  {
    browserApprovalRequired: true,
    passkeyRequired: true,
    label: 'Token + Passkey',
    variant: 'purple',
  },
  {
    browserApprovalRequired: false,
    passkeyRequired: false,
    label: 'გამორთულია',
    variant: 'secondary',
  },
])(
  'shows $label from the active policy independently of retained credentials',
  async ({ browserApprovalRequired, passkeyRequired, label, variant }) => {
    const base = {
      userId: 'employee',
      userName: 'თანამშრომელი',
      state: 'approved',
      revision: 1,
      backedUp: false,
      requestedIp: null,
      createdAt: '2026-11-16T08:00:00.000Z',
    }
    calls.review.mockResolvedValue({
      ok: true,
      value: {
        total: 2,
        browserApprovalRequired,
        passkeyRequired,
        timezone: 'Asia/Tbilisi',
        items: [
          {
            ...base,
            id: '019a7500-0000-7000-8000-000000000001',
            name: 'პირველი ბრაუზერი',
            hasPasskey: false,
          },
          {
            ...base,
            id: '019a7500-0000-7000-8000-000000000002',
            name: 'მეორე ბრაუზერი',
            hasPasskey: true,
          },
        ],
      },
    })
    render(<DeviceReviewPage />)
    expect(
      await screen.findByRole('columnheader', { name: 'ტიპი' }),
    ).toBeVisible()
    expect(screen.getAllByText(label, { exact: true })).toHaveLength(2)
    for (const badge of screen.getAllByText(label, { exact: true }))
      expect(badge).toHaveAttribute('data-variant', variant)
    expect(screen.getByText('დამატებულია', { exact: true })).toBeVisible()
    expect(
      screen.getByText('არ არის დამატებული', { exact: true }),
    ).toBeVisible()
  },
)
it('switches to active devices and resets pagination through URL search', async () => {
  render(<DeviceReviewPage />)
  await userEvent.setup().click(screen.getByRole('tab', { name: 'აქტიური' }))
  expect(calls.navigate).toHaveBeenCalledWith({
    search: { page: 1, q: '', state: 'approved', sort: 'newest' },
  })
})

it.each(['approved', 'rejected', 'revoked', 'pending'])(
  'shows the decision actor and time for a %s device without inventing pending attribution',
  async (state) => {
    calls.review.mockResolvedValue({
      ok: true,
      value: {
        total: 1,
        timezone: 'Asia/Tbilisi',
        browserApprovalRequired: true,
        passkeyRequired: false,
        items: [
          {
            id: 'device-review',
            userId: 'employee',
            userName: 'თანამშრომელი',
            name: 'ბრაუზერი',
            state,
            hasPasskey: false,
            backedUp: false,
            revision: 1,
            requestedIp: null,
            createdAt: '2026-11-16T08:00:00.000Z',
            reviewedByName:
              state === 'pending' ? null : 'გადაწყვეტილების ავტორი',
            reviewedAt: state === 'pending' ? null : '2026-11-17T09:12:00.000Z',
          },
        ],
      },
    })
    render(<DeviceReviewPage />)
    expect(
      await screen.findByRole('columnheader', { name: 'გადაწყვეტილება მიიღო' }),
    ).toBeVisible()
    if (state === 'pending') {
      expect(screen.getByText('გადაწყვეტილება მოლოდინშია')).toBeVisible()
      expect(
        screen.queryByText('გადაწყვეტილების ავტორი'),
      ).not.toBeInTheDocument()
    } else {
      expect(screen.getByText('გადაწყვეტილების ავტორი')).toBeVisible()
      expect(screen.getByText(/13:12/)).toBeVisible()
    }
  },
)
