import { render, screen, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CurrentDayWidget } from './current-day-widget'

describe('company-local current day widget', () => {
  it.each(['Asia/Tbilisi', 'Pacific/Kiritimati', 'America/Los_Angeles'])(
    'shows the provided date in %s without using the host date',
    (timezone) => {
      render(<CurrentDayWidget date="2026-11-05" timezone={timezone} />)
      expect(
        screen.getByLabelText('ხუთშაბათი, 5 ნოემბერი 2026'),
      ).toHaveAttribute('datetime', '2026-11-05')
      expect(screen.getByText('ხუთშაბათი')).toBeVisible()
      expect(screen.queryByText(timezone)).not.toBeInTheDocument()
      const calendar = screen.getByRole('grid', { name: 'ნოემბერი 2026' })
      expect(
        within(calendar).getByRole('gridcell', {
          name: 'ხუთშაბათი, 5 ნოემბერი 2026, დღეს',
        }),
      ).toHaveAttribute('data-today', 'true')
      expect(
        within(calendar).getAllByRole('columnheader', { hidden: true })[0],
      ).toHaveAttribute('aria-label', 'ორშაბათი')
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    },
  )
  it('updates the day and month from a new server date, including year rollover', () => {
    const { rerender } = render(
      <CurrentDayWidget date="2026-12-31" timezone="Asia/Tbilisi" />,
    )
    expect(screen.getByRole('grid', { name: 'დეკემბერი 2026' })).toBeVisible()
    rerender(<CurrentDayWidget date="2027-01-01" timezone="Asia/Tbilisi" />)
    expect(screen.getByRole('grid', { name: 'იანვარი 2027' })).toBeVisible()
    expect(
      screen.getByRole('gridcell', { name: 'პარასკევი, 1 იანვარი 2027, დღეს' }),
    ).toHaveAttribute('data-today', 'true')
  })
  it('renders the same supplied calendar date during SSR', () => {
    const html = renderToString(
      <CurrentDayWidget date="2026-11-05" timezone="Asia/Tbilisi" />,
    )
    expect(html).toContain('dateTime="2026-11-05"')
    expect(html).toContain('ხუთშაბათი')
    expect(html).not.toContain('Thursday')
  })
})
