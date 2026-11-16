import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import { SecurityPolicy } from './security-policy-form'

const calls = vi.hoisted(() => ({
  read: vi.fn(),
  save: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock('../attendance-security.functions', () => ({
  readAttendanceSecurityPolicy: calls.read,
  updateAttendanceSecurityPolicy: calls.save,
}))
vi.mock('sonner', () => ({
  toast: { success: calls.success, error: calls.error },
}))
const policy = {
  revision: 2,
  passkeyRequired: true,
  ipRestrictionEnabled: true,
  allowedIps: ['192.0.2.10'],
  blockedIps: ['198.51.100.10'],
}
beforeEach(() => {
  vi.clearAllMocks()
  calls.read.mockResolvedValue({ ok: true, value: policy })
  calls.save.mockResolvedValue({ ok: true, value: { ...policy, revision: 3 } })
})
function mount() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <SecurityPolicy actorId="administrator" />
    </QueryClientProvider>,
  )
}

it('turns off only the extra passkey check and waits for the server before reporting success', async () => {
  let finish: ((value: unknown) => void) | undefined
  calls.save.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const user = userEvent.setup()
  mount()
  await user.click(
    await screen.findByRole('switch', {
      name: 'შესვლისა და გასვლის დამატებითი დადასტურება (Passkey)',
    }),
  )
  await user.click(screen.getByRole('button', { name: 'წესების შენახვა' }))
  await waitFor(() => expect(calls.save).toHaveBeenCalledOnce())
  expect(calls.save).toHaveBeenCalledWith({
    data: {
      ...policy,
      passkeyRequired: false,
    },
  })
  expect(calls.success).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'წესების შენახვა' })).toBeDisabled()
  finish?.({
    ok: true,
    value: { ...policy, revision: 3, passkeyRequired: false },
  })
  await waitFor(() =>
    expect(calls.success).toHaveBeenCalledExactlyOnceWith(
      'უსაფრთხოების წესები შენახულია.',
    ),
  )
})
it('keeps malformed addresses out of the request and shows Georgian field validation', async () => {
  const user = userEvent.setup()
  mount()
  const addresses = await screen.findByLabelText(
    'დასწრებისთვის დაშვებული IP მისამართები',
  )
  await user.clear(addresses)
  await user.type(addresses, '192.0.2.0/24')
  await user.click(screen.getByRole('button', { name: 'წესების შენახვა' }))
  expect(
    await screen.findByText(
      'მიუთითეთ მაქსიმუმ 100 ზუსტი IPv4 ან IPv6 მისამართი, თითო ახალ ხაზზე.',
    ),
  ).toBeVisible()
  expect(calls.save).not.toHaveBeenCalled()
})
it('shows the disabled initial policy and saves without a reason field', async () => {
  calls.read.mockResolvedValue({
    ok: true,
    value: { ...policy, passkeyRequired: false },
  })
  mount()
  expect(
    await screen.findByRole('switch', { name: /\(Passkey\)/ }),
  ).not.toBeChecked()
  expect(screen.queryByLabelText('ცვლილების მიზეზი')).not.toBeInTheDocument()
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: 'წესების შენახვა' }))
  await waitFor(() =>
    expect(calls.save).toHaveBeenCalledWith({
      data: { ...policy, passkeyRequired: false },
    }),
  )
})
