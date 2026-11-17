import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { AppearanceSettings } from './appearance-settings'
import { ACCENT_STORAGE_KEY, accentPalettes } from '#/lib/appearance'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  localStorage.clear()
  delete document.documentElement.dataset.accent
})

describe('appearance settings', () => {
  it('places neighboring hues together in visible and keyboard navigation order', () => {
    render(<AppearanceSettings />)
    const expected = [
      'neutral',
      'sapphire',
      'navy',
      'cobalt',
      'iris',
      'indigo',
      'wine',
      'burnt-orange',
      'copper',
      'antique-gold',
      'olive',
      'forest',
      'eucalyptus',
      'jade',
    ].map((id) =>
      screen.getByRole('radio', {
        name: accentPalettes.find((palette) => palette.id === id)!.label,
      }),
    )
    for (let i = 1; i < expected.length; i++) {
      expect(
        expected[i - 1].compareDocumentPosition(expected[i]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).not.toBe(0)
    }
  })

  it('restores the selected option, saves a new palette and can return to neutral', async () => {
    document.documentElement.dataset.accent = 'iris'
    render(<AppearanceSettings />)
    expect(screen.getByRole('radio', { name: 'ზამბახისფერი' })).toBeChecked()
    const user = userEvent.setup()
    await user.click(screen.getByRole('radio', { name: 'სპილენძისფერი' }))
    expect(document.documentElement.dataset.accent).toBe('copper')
    expect(localStorage.getItem(ACCENT_STORAGE_KEY)).toBe('copper')
    expect(toast.success).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('radio', { name: 'ნეიტრალური' }))
    expect(document.documentElement.dataset.accent).toBe('neutral')
  })

  it('keeps the applied choice when persistence fails and reports one error', async () => {
    render(<AppearanceSettings />)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    await userEvent
      .setup()
      .click(screen.getByRole('radio', { name: 'საფირონის ლურჯი' }))
    expect(screen.getByRole('radio', { name: 'ნეიტრალური' })).toBeChecked()
    expect(document.documentElement.dataset.accent).toBeUndefined()
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('handles preference removal in another tab', () => {
    document.documentElement.dataset.accent = 'copper'
    render(<AppearanceSettings />)
    fireEvent(
      window,
      new StorageEvent('storage', { key: ACCENT_STORAGE_KEY, newValue: null }),
    )
    expect(screen.getByRole('radio', { name: 'ნეიტრალური' })).toBeChecked()
  })
})
