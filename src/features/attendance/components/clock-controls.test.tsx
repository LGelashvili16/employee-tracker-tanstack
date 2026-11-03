import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ClockControls } from './clock-controls'

describe('attendance foundation', () => {
  it('does not offer live clock mutations before persistence is implemented', () => {
    render(<ClockControls />)
    expect(
      screen.getByText('დროის აღრიცხვა ჯერ არ არის გააქტიურებული.'),
    ).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'სამუშაოს დაწყება' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'სამუშაოს დასრულება' }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: 'შესვენება' })).toBeDisabled()
  })
})
