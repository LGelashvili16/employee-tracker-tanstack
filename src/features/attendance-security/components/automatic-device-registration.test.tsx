import { act, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { AppShellSkeleton } from '#/components/layout/app-shell-skeleton'
import { AutomaticDeviceRegistration } from './automatic-device-registration'

vi.mock('#/hooks/use-mobile', () => ({ useIsMobile: () => false }))
const fallback = (
  <AppShellSkeleton>
    <div />
  </AppShellSkeleton>
)

const register = vi.hoisted(() => vi.fn())
vi.mock('../attendance-security.functions', () => ({
  registerAutomaticAttendanceDevice: register,
}))
afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

it('registers once in Strict Mode before mounting pages that read the device cookie', async () => {
  let finish: ((value: unknown) => void) | undefined
  register.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  render(
    <StrictMode>
      <AutomaticDeviceRegistration fallback={fallback}>
        <h1>სამუშაო სივრცე</h1>
      </AutomaticDeviceRegistration>
    </StrictMode>,
  )
  expect(register).toHaveBeenCalledOnce()
  expect(screen.getByRole('status')).toHaveAccessibleName(
    'სამუშაო სივრცე იტვირთება',
  )
  expect(document.querySelector('[data-slot=sidebar-inset]')).toHaveClass(
    'm-2',
    'rounded-xl',
  )
  expect(document.querySelector('[data-slot=sidebar]')).toHaveAttribute(
    'data-variant',
    'inset',
  )
  expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  await act(async () => finish?.({ ok: true, value: {} }))
  expect(
    await screen.findByRole('heading', { name: 'სამუშაო სივრცე' }),
  ).toBeVisible()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
it('allows account access if browser registration fails', async () => {
  register.mockRejectedValue(new Error('offline'))
  render(
    <AutomaticDeviceRegistration fallback={fallback}>
      <h1>სამუშაო სივრცე</h1>
    </AutomaticDeviceRegistration>,
  )
  expect(
    await screen.findByRole('heading', { name: 'სამუშაო სივრცე' }),
  ).toBeVisible()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
it('does not keep the entire account locked behind an unresponsive registration request', async () => {
  vi.useFakeTimers()
  register.mockImplementation(() => new Promise(() => {}))
  render(
    <AutomaticDeviceRegistration fallback={fallback}>
      <h1>სამუშაო სივრცე</h1>
    </AutomaticDeviceRegistration>,
  )
  await act(async () => {
    vi.advanceTimersByTime(10000)
  })
  expect(screen.getByRole('heading', { name: 'სამუშაო სივრცე' })).toBeVisible()
})
