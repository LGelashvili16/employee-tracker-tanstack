import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { dayPeriodGreeting, TimeGreeting } from './time-greeting'

describe('company-time greeting', () => {
  it.each([
    ['00:59', 'ღამე მშვიდობისა'],
    ['01:00', 'დილა მშვიდობისა'],
    ['07:59', 'დილა მშვიდობისა'],
    ['08:00', 'დღე მშვიდობისა'],
    ['13:59', 'დღე მშვიდობისა'],
    ['14:00', 'საღამო მშვიდობისა'],
    ['17:59', 'საღამო მშვიდობისა'],
    ['18:00', 'ღამე მშვიდობისა'],
  ])('uses the company hour for %s UTC', (time, expected) => {
    expect(
      dayPeriodGreeting({
        instant: `2026-11-05T${time}:00Z`,
        timezone: 'Asia/Tbilisi',
      }),
    ).toBe(expected)
  })
  it('does not derive the greeting from the browser or host timezone', () => {
    const instant = '2026-11-05T06:00:00Z'
    expect(dayPeriodGreeting({ instant, timezone: 'Asia/Tbilisi' })).toBe(
      'დილა მშვიდობისა',
    )
    expect(
      dayPeriodGreeting({ instant, timezone: 'America/Los_Angeles' }),
    ).toBe('ღამე მშვიდობისა')
    expect(dayPeriodGreeting({ instant, timezone: 'Pacific/Kiritimati' })).toBe(
      'საღამო მშვიდობისა',
    )
  })
  it('renders the signed-in display name in a centered heading and updates when the server sample changes', () => {
    const { rerender } = render(
      <TimeGreeting
        name="ანა მაისურაძე"
        clock={{ instant: '2026-11-05T06:00:00Z', timezone: 'Asia/Tbilisi' }}
      />,
    )
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'დილა მშვიდობისა, ანა მაისურაძე',
      }),
    ).toBeVisible()
    rerender(
      <TimeGreeting
        name="ანა მაისურაძე"
        clock={{ instant: '2026-11-05T14:00:00Z', timezone: 'Asia/Tbilisi' }}
      />,
    )
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'საღამო მშვიდობისა, ანა მაისურაძე',
      }),
    ).toBeVisible()
  })
  it('uses an honest generic greeting while the server clock is unavailable', () => {
    render(<TimeGreeting name="ანა" />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'გამარჯობა, ანა' }),
    ).toBeVisible()
  })
  it('keeps SSR deterministic and renders names as text', () => {
    const html = renderToString(
      <TimeGreeting
        name="<script>name</script>"
        clock={{ instant: '2026-11-05T06:00:00Z', timezone: 'Asia/Tbilisi' }}
      />,
    )
    expect(html).toContain('დილა მშვიდობისა')
    expect(html).toContain('&lt;script&gt;name&lt;/script&gt;')
    expect(html).not.toContain('<script>')
  })
})
