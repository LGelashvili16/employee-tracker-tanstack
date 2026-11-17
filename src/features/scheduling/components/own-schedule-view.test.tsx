import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { OwnScheduleView } from './own-schedule-view'

const { getOwnSchedule } = vi.hoisted(() => ({ getOwnSchedule: vi.fn() }))
vi.mock('../scheduling.functions', () => ({
  getOwnSchedule,
  getScheduleSettings: vi.fn(),
}))

const week = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  weekday,
  hours: weekday < 6 ? { start: '09:00', end: '17:30' } : null,
}))

function renderView() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <OwnScheduleView actorId="employee" />
    </QueryClientProvider>,
  )
}

describe('own schedule', () => {
  it('shows the week, totals and highlights today in the company timezone', async () => {
    // 5 November 2026 is a Thursday.
    getOwnSchedule.mockResolvedValue({
      ok: true,
      value: {
        source: 'company',
        week,
        timezone: 'Asia/Tbilisi',
        today: '2026-11-05',
      },
    })
    renderView()
    expect(await screen.findByText('კომპანიის განრიგი')).toBeVisible()
    expect(screen.getByText('5')).toBeVisible()
    expect(screen.getByText('42 სთ 30 წთ')).toBeVisible()
    const thursday = screen.getByText('ხუთშაბათი').closest('li')
    expect(thursday).toHaveAttribute('aria-current', 'date')
    expect(thursday).toHaveTextContent('დღეს')
    expect(screen.getAllByText('09:00 - 17:30')).toHaveLength(5)
    expect(screen.getAllByText('დასვენების დღე')).toHaveLength(2)
  })

  it('labels an individually assigned week', async () => {
    getOwnSchedule.mockResolvedValue({
      ok: true,
      value: {
        source: 'individual',
        week,
        timezone: 'Asia/Tbilisi',
        today: '2026-11-07',
      },
    })
    renderView()
    expect(await screen.findByText('ინდივიდუალური განრიგი')).toBeVisible()
  })

  it('explains when no schedule is defined yet', async () => {
    getOwnSchedule.mockResolvedValue({
      ok: true,
      value: {
        source: 'none',
        week: null,
        timezone: 'Asia/Tbilisi',
        today: '2026-11-05',
      },
    })
    renderView()
    expect(
      await screen.findByText(/სამუშაო განრიგი ჯერ არ არის განსაზღვრული/),
    ).toBeVisible()
  })
})
