import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProfilePage } from './profile-page'

vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({
    useRouteContext: () => ({
      actor: {
        id: 'u1',
        name: 'ანა მაისურაძე',
        email: null,
        emailVerified: false,
        roles: ['employee'],
      },
    }),
  }),
}))
vi.mock('../account.functions', () => ({
  getOwnProfile: () =>
    Promise.resolve({ code: 'ana', jobTitle: 'დიზაინერი', phone: null }),
  updateOwnProfilePhone: vi.fn(),
}))

describe('profile page', () => {
  it('provides its own query cache and lets the employee edit the phone number', async () => {
    render(<ProfilePage />)
    expect(await screen.findByLabelText('ტელეფონის ნომერი')).toBeVisible()
    expect(screen.getByText('ana')).toBeVisible()
    expect(screen.getByText('დიზაინერი')).toBeVisible()
  })
})
