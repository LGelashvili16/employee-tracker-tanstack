import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, it, vi } from 'vitest'
import { SecurityPolicy } from './security-policy-form'

vi.mock('#/db', async () => ({
  db: (await import('drizzle-orm/node-postgres')).drizzle.mock(),
}))

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
  browserApprovalRequired: true,
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
      name: 'დამატებითი გადამოწმება (Passkey)',
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
    await screen.findByRole('switch', {
      name: 'დამატებითი გადამოწმება (Passkey)',
    }),
  ).not.toBeChecked()
  expect(
    screen.getByRole('switch', { name: 'ტოკენით გადამოწმება' }),
  ).toBeChecked()
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
it('saves automatic browser approval independently of IP restrictions and passkeys', async () => {
  calls.read.mockResolvedValue({
    ok: true,
    value: { ...policy, passkeyRequired: false },
  })
  mount()
  const user = userEvent.setup()
  await user.click(
    await screen.findByRole('switch', { name: 'ტოკენით გადამოწმება' }),
  )
  await user.click(screen.getByRole('button', { name: 'წესების შენახვა' }))
  await waitFor(() =>
    expect(calls.save).toHaveBeenCalledWith({
      data: {
        ...policy,
        browserApprovalRequired: false,
        passkeyRequired: false,
      },
    }),
  )
})
it('requires token verification before enabling the additional Passkey switch', async () => {
  calls.read.mockResolvedValue({
    ok: true,
    value: {
      ...policy,
      browserApprovalRequired: false,
      passkeyRequired: false,
    },
  })
  mount()
  const user = userEvent.setup()
  const passkey = await screen.findByRole('switch', {
    name: 'დამატებითი გადამოწმება (Passkey)',
  })
  expect(passkey).toHaveAttribute('aria-disabled', 'true')
  await user.click(screen.getByRole('switch', { name: 'ტოკენით გადამოწმება' }))
  expect(passkey).not.toHaveAttribute('aria-disabled', 'true')
  await user.click(passkey)
  await user.click(screen.getByRole('button', { name: 'წესების შენახვა' }))
  await waitFor(() => expect(calls.save).toHaveBeenCalledWith({ data: policy }))
})
it('preserves a saved disabled policy until an admin changes the switches', async () => {
  const disabled = {
    ...policy,
    browserApprovalRequired: false,
    passkeyRequired: false,
  }
  calls.read.mockResolvedValue({ ok: true, value: disabled })
  mount()
  expect(
    await screen.findByRole('switch', { name: 'ტოკენით გადამოწმება' }),
  ).not.toBeChecked()
  expect(
    screen.getByRole('switch', { name: 'დამატებითი გადამოწმება (Passkey)' }),
  ).toHaveAttribute('aria-disabled', 'true')
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: 'წესების შენახვა' }))
  await waitFor(() =>
    expect(calls.save).toHaveBeenCalledWith({ data: disabled }),
  )
})
it('turns off Passkey when token verification is disabled and keeps it off when token verification is restored', async () => {
  mount()
  const user = userEvent.setup()
  const token = await screen.findByRole('switch', {
    name: 'ტოკენით გადამოწმება',
  })
  const passkey = screen.getByRole('switch', {
    name: 'დამატებითი გადამოწმება (Passkey)',
  })
  expect(passkey).toBeChecked()
  await user.click(token)
  expect(passkey).not.toBeChecked()
  expect(passkey).toHaveAttribute('aria-disabled', 'true')
  await user.click(screen.getByRole('button', { name: 'წესების შენახვა' }))
  await waitFor(() =>
    expect(calls.save).toHaveBeenCalledWith({
      data: {
        ...policy,
        browserApprovalRequired: false,
        passkeyRequired: false,
      },
    }),
  )
  await user.click(token)
  expect(passkey).not.toHaveAttribute('aria-disabled', 'true')
  expect(passkey).not.toBeChecked()
})
