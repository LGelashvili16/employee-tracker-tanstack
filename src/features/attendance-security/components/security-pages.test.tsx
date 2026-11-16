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
  requestAttendanceDevice: vi.fn(),
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
      passkeyRequired: false,
      timezone: 'Asia/Tbilisi',
    },
  })
  calls.policy.mockResolvedValue({
    ok: true,
    value: {
      revision: 0,
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

it('opens employee security settings and device registration', async () => {
  render(<SecurityPage />)
  expect(await screen.findByLabelText('მოწყობილობის სახელი')).toBeVisible()
  expect(calls.own).toHaveBeenCalledWith({
    data: { page: 1, q: '', state: 'all', sort: 'newest' },
  })
})

it('opens the admin security policy settings', async () => {
  render(<SecuritySettingsPage />)
  expect(
    await screen.findByRole('switch', {
      name: 'შესვლისა და გასვლის დამატებითი დადასტურება (Passkey)',
    }),
  ).not.toBeChecked()
  expect(calls.policy).toHaveBeenCalledOnce()
})

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
it('switches to active devices and resets pagination through URL search', async () => {
  render(<DeviceReviewPage />)
  await userEvent.setup().click(screen.getByRole('tab', { name: 'აქტიური' }))
  expect(calls.navigate).toHaveBeenCalledWith({
    search: { page: 1, q: '', state: 'approved', sort: 'newest' },
  })
})
