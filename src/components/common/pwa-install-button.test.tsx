import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PwaContext } from '#/lib/pwa/pwa-context'
import { PwaInstallButton } from './pwa-install-button'
import { usePwaBrowser } from '#/hooks/use-pwa-browser'
import { APP_NAME } from '#/lib/app'

function InstallHarness() {
  return (
    <PwaContext value={usePwaBrowser()}>
      <PwaInstallButton />
    </PwaContext>
  )
}

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
})
afterEach(() => vi.unstubAllGlobals())

describe('PWA installation', () => {
  it('hides the desktop install button until the browser offers installation', () => {
    render(<InstallHarness />)
    expect(
      screen.queryByRole('button', { name: 'აპის დაყენება' }),
    ).not.toBeInTheDocument()
  })

  it('keeps Georgian manual installation instructions available on iOS', async () => {
    const user = userEvent.setup()
    render(
      <PwaContext
        value={{
          online: true,
          installed: false,
          ios: true,
          requestInstall: null,
        }}
      >
        <PwaInstallButton />
      </PwaContext>,
    )
    await user.click(screen.getByRole('button', { name: 'აპის დაყენება' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent(
      `${APP_NAME} თქვენს მოწყობილობაზე`,
    )
    expect(screen.getByRole('button', { name: 'დახურვა' })).toBeInTheDocument()
    expect(screen.queryByText('Close')).not.toBeInTheDocument()
  })

  it('opens the native prompt only on click and prevents duplicate submissions', async () => {
    const user = userEvent.setup()
    const prompt = vi.fn().mockResolvedValue(undefined)
    let resolveChoice: (value: {
      outcome: 'dismissed'
      platform: string
    }) => void = () => {}
    const choice = new Promise<{
      outcome: 'dismissed'
      platform: string
    }>((resolve) => {
      resolveChoice = resolve
    })
    render(<InstallHarness />)
    act(() => {
      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
          prompt,
          userChoice: choice,
        }),
      )
    })
    expect(prompt).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'აპის დაყენება' }))
    expect(prompt).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'აპის დაყენება' })).toBeDisabled()
    await act(async () =>
      resolveChoice({ outcome: 'dismissed', platform: 'web' }),
    )
    expect(
      screen.queryByRole('button', { name: 'აპის დაყენება' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(prompt).toHaveBeenCalledOnce()
  })

  it('hides installation controls after the browser reports installation', () => {
    render(<InstallHarness />)
    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })
    expect(
      screen.queryByRole('button', { name: 'აპის დაყენება' }),
    ).not.toBeInTheDocument()
  })

  it('maps native prompt failures to Georgian guidance', async () => {
    const user = userEvent.setup()
    render(<InstallHarness />)
    act(() => {
      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), {
          prompt: vi.fn().mockRejectedValue(new Error('Browser failure')),
          userChoice: Promise.resolve({
            outcome: 'dismissed',
            platform: 'web',
          }),
        }),
      )
    })
    await user.click(screen.getByRole('button', { name: 'აპის დაყენება' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'დაყენების ფანჯარა ვერ გაიხსნა',
    )
    expect(screen.queryByText('Browser failure')).not.toBeInTheDocument()
  })
})
