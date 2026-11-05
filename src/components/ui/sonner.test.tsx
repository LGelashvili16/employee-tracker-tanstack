import { act, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { toast } from 'sonner'
import { Toaster } from './sonner'

afterEach(() => {
  toast.dismiss()
})

it('displays Sonner notifications with Georgian dismissal text', async () => {
  render(<Toaster />)
  act(() => {
    toast.success('განრიგი შენახულია.')
  })
  expect(await screen.findByText('განრიგი შენახულია.')).toBeVisible()
  expect(
    screen.getByRole('button', { name: 'შეტყობინების დახურვა' }),
  ).toBeVisible()
})
