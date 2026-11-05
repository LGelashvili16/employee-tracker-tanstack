import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProvisionAccountForm } from './provision-account-form'

const create = vi.hoisted(() => vi.fn())
vi.mock('../access.functions', () => ({ createEmployeeAccount: create }))
beforeEach(() => create.mockReset())

describe('administrative account provisioning', () => {
  it('permits an empty contact email and shows a code only after successful provisioning', async () => {
    const user = userEvent.setup()
    const onCode = vi.fn()
    const secret = {
      code: 'A'.repeat(43),
      expiresAt: '2026-11-05T00:00:00Z',
      purpose: 'activation',
    }
    create.mockResolvedValue({ ok: true, value: secret })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ProvisionAccountForm onCode={onCode} canAssignRoles={false} />
      </QueryClientProvider>,
    )
    await user.type(
      screen.getByLabelText('თანამშრომლის კოდი და შესვლის სახელი'),
      'worker-01',
    )
    await user.type(screen.getByLabelText('სახელი და გვარი'), 'ანა მაისურაძე')
    await user.type(
      screen.getByLabelText('შექმნის მიზეზი'),
      'ახალი თანამშრომლის დამატება.',
    )
    await user.click(screen.getByRole('button', { name: 'ანგარიშის შექმნა' }))
    await waitFor(() => expect(create).toHaveBeenCalledOnce())
    expect(create).toHaveBeenCalledWith({
      data: {
        code: 'worker-01',
        name: 'ანა მაისურაძე',
        contactEmail: '',
        role: 'employee',
        reason: 'ახალი თანამშრომლის დამატება.',
      },
    })
    expect(onCode).toHaveBeenCalledWith(secret)
    expect(
      screen.getByLabelText('თანამშრომლის კოდი და შესვლის სახელი'),
    ).toHaveValue('')
  })

  it('requires a reason and rejects malformed optional email before requesting account creation', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ProvisionAccountForm onCode={vi.fn()} canAssignRoles={false} />
      </QueryClientProvider>,
    )
    await user.type(
      screen.getByLabelText('თანამშრომლის კოდი და შესვლის სახელი'),
      'worker-02',
    )
    await user.type(screen.getByLabelText('სახელი და გვარი'), 'ანა მაისურაძე')
    await user.type(
      screen.getByLabelText('საკონტაქტო ელფოსტა (არასავალდებულო)'),
      'invalid',
    )
    await user.click(screen.getByRole('button', { name: 'ანგარიშის შექმნა' }))
    expect(await screen.findByText('ელფოსტა არასწორია.')).toBeVisible()
    expect(
      await screen.findByText('მიუთითეთ მოქმედების მიზეზი, მინიმუმ 5 სიმბოლო.'),
    ).toBeVisible()
    expect(create).not.toHaveBeenCalled()
  })
})
