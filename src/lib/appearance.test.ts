import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ACCENT_INIT_SCRIPT,
  ACCENT_STORAGE_KEY,
  accentPalettes,
  accentStyles,
  accentControlStyles,
} from './appearance'
import { accentIdSchema } from '#/features/account/appearance.schemas'

function luminance(hex: string) {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  return rgb
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0)
}

function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  delete document.documentElement.dataset.accent
})

describe('accent registry and startup restoration', () => {
  it.each(accentPalettes)(
    'restores $id before hydration and validates the same IDs',
    ({ id }) => {
      localStorage.setItem(ACCENT_STORAGE_KEY, id)
      window.eval(ACCENT_INIT_SCRIPT)
      expect(document.documentElement.dataset.accent).toBe(id)
      expect(accentIdSchema.parse(id)).toBe(id)
    },
  )

  it('falls back to the unchanged neutral theme for unknown or unavailable storage', () => {
    localStorage.setItem(ACCENT_STORAGE_KEY, 'removed-color')
    window.eval(ACCENT_INIT_SCRIPT)
    expect(document.documentElement.dataset.accent).toBe('neutral')
    expect(accentIdSchema.safeParse('removed-color').success).toBe(false)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    window.eval(ACCENT_INIT_SCRIPT)
    expect(document.documentElement.dataset.accent).toBe('neutral')
    expect(accentStyles).not.toContain("data-accent='neutral'")
  })

  it('keeps text and focus indicators readable for every palette in both themes', () => {
    for (const palette of accentPalettes) {
      for (const [mode, tokens] of [
        ['light', palette.light],
        ['dark', palette.dark],
      ] as const) {
        if (!tokens) continue
        const background = mode === 'light' ? '#f7f7f7' : '#141414'
        expect(
          contrast(tokens.primary, tokens.primaryForeground),
          `${palette.id} ${mode} button`,
        ).toBeGreaterThanOrEqual(4.5)
        expect(
          contrast(tokens.primaryHover, tokens.primaryForeground),
          `${palette.id} ${mode} button hover`,
        ).toBeGreaterThanOrEqual(4.5)
        expect(
          contrast(tokens.primary, mode === 'light' ? '#dedede' : '#404040'),
          `${palette.id} ${mode} checked control against unchecked track`,
        ).toBeGreaterThanOrEqual(3)
        expect(
          contrast(tokens.accent, tokens.accentForeground),
          `${palette.id} ${mode} selection`,
        ).toBeGreaterThanOrEqual(4.5)
        expect(
          contrast(tokens.primary, background),
          `${palette.id} ${mode} link`,
        ).toBeGreaterThanOrEqual(4.5)
        expect(
          contrast(tokens.ring, background),
          `${palette.id} ${mode} focus`,
        ).toBeGreaterThanOrEqual(3)
      }
      if (palette.light)
        expect(contrast(palette.swatch, '#ffffff')).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('has unique stable IDs and keeps all requested base colors exactly', () => {
    expect(new Set(accentPalettes.map(({ id }) => id)).size).toBe(
      accentPalettes.length,
    )
    expect(accentPalettes.length).toBeGreaterThanOrEqual(14)
    expect(accentPalettes.map(({ swatch }) => swatch)).toEqual(
      expect.arrayContaining([
        '#28705F',
        '#4B6658',
        '#166534',
        '#743C51',
        '#82702F',
        '#263F66',
        '#4338CA',
        '#2563EB',
        '#C2410C',
        '#4D5B26',
      ]),
    )
  })

  it('applies control tokens through CSS alone in both modes and clears them for neutral', () => {
    const style = document.createElement('style')
    style.textContent = accentStyles + accentControlStyles
    document.head.append(style)
    const root = document.documentElement
    try {
      for (const palette of accentPalettes) {
        root.dataset.accent = palette.id
        for (const [dark, tokens] of [
          [false, palette.light],
          [true, palette.dark],
        ] as const) {
          root.classList.toggle('dark', dark)
          const css = getComputedStyle(root)
          expect(css.getPropertyValue('--switch-checked')).toBe(
            tokens?.primary ?? '',
          )
          expect(css.getPropertyValue('--switch-checked-foreground')).toBe(
            tokens?.primaryForeground ?? '',
          )
          expect(css.getPropertyValue('--calendar-range-background')).toBe(
            tokens?.accent ?? '',
          )
          expect(css.getPropertyValue('--badge-green')).toBe('')
        }
      }
      root.dataset.accent = 'neutral'
      expect(getComputedStyle(root).getPropertyValue('--switch-checked')).toBe(
        '',
      )
    } finally {
      style.remove()
      root.classList.remove('dark')
    }
  })

  it('tints selected popup choices under the document root without tinting ordinary choices', () => {
    const style = document.createElement('style')
    style.textContent = accentControlStyles
    document.head.append(style)
    const popup = document.createElement('div')
    // Portals mount outside the page content, directly beneath the document body.
    document.body.append(popup)
    const selectedRules = (item: Element) =>
      Array.from(style.sheet!.cssRules)
        .filter(
          (rule): rule is CSSStyleRule =>
            rule instanceof CSSStyleRule && item.matches(rule.selectorText),
        )
        .filter(
          (rule) =>
            rule.style.getPropertyValue('background') === 'var(--accent)',
        )
    try {
      document.documentElement.dataset.accent = 'sapphire'
      for (const [slot, state] of [
        ['select-item', 'data-selected'],
        ['dropdown-menu-checkbox-item', 'data-checked'],
        ['dropdown-menu-radio-item', 'data-checked'],
      ]) {
        const item = document.createElement('div')
        item.dataset.slot = slot
        popup.append(item)
        expect(selectedRules(item)).toHaveLength(0)
        item.setAttribute(state, '')
        expect(selectedRules(item)).toHaveLength(1)
        expect(selectedRules(item)[0].style.getPropertyValue('color')).toBe(
          'var(--accent-foreground)',
        )
        document.documentElement.dataset.accent = 'neutral'
        expect(selectedRules(item)).toHaveLength(0)
        document.documentElement.dataset.accent = 'sapphire'
        item.remove()
      }
    } finally {
      popup.remove()
      style.remove()
    }
  })
})
