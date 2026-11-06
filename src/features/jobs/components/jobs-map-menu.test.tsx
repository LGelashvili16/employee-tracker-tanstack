import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import { JobsMapMenu } from './jobs-map-menu'

afterEach(() => vi.useRealTimers())

it('offers creation after holding the canvas for one second', async () => {
  const onCreate = vi.fn()
  const onControl = vi.fn()
  render(
    <JobsMapMenu
      position={{ longitude: 44.8, latitude: 41.7 }}
      onCreate={onCreate}
    >
      <canvas aria-label="სატესტო რუკა" />
      <Button onClick={onControl}>რუკის პარამეტრები</Button>
    </JobsMapMenu>,
  )
  const canvas = screen.getByLabelText('სატესტო რუკა')
  vi.useFakeTimers()
  fireEvent.touchStart(canvas, {
    touches: [{ identifier: 1, target: canvas, clientX: 50, clientY: 80 }],
  })
  await act(() => vi.advanceTimersByTime(999))
  fireEvent.contextMenu(canvas, { clientX: 50, clientY: 80 })
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  await act(() => vi.advanceTimersByTime(1))
  vi.useRealTimers()
  await userEvent.click(
    await screen.findByRole('menuitem', { name: 'აზომვის დამატება' }),
  )
  expect(onCreate).toHaveBeenCalledExactlyOnceWith({
    longitude: 44.8,
    latitude: 41.7,
    kind: 'measurement',
  })
  await userEvent.click(
    screen.getByRole('button', { name: 'რუკის პარამეტრები' }),
  )
  expect(onControl).toHaveBeenCalledOnce()
})
it.each(['move', 'end', 'cancel', 'multitouch'])(
  'cancels canvas holds on %s',
  async (reason) => {
    render(
      <JobsMapMenu
        position={{ longitude: 44.8, latitude: 41.7 }}
        onCreate={vi.fn()}
      >
        <canvas aria-label="სატესტო რუკა" />
      </JobsMapMenu>,
    )
    const canvas = screen.getByLabelText('სატესტო რუკა')
    const touch = { identifier: 1, target: canvas, clientX: 50, clientY: 80 }
    vi.useFakeTimers()
    fireEvent.touchStart(canvas, { touches: [touch] })
    if (reason === 'move')
      fireEvent.touchMove(canvas, { touches: [{ ...touch, clientX: 75 }] })
    else if (reason === 'end') fireEvent.touchEnd(canvas, { touches: [] })
    else if (reason === 'cancel') fireEvent.touchCancel(canvas, { touches: [] })
    else
      fireEvent.touchStart(canvas, {
        touches: [touch, { ...touch, identifier: 2 }],
      })
    await act(() => vi.advanceTimersByTime(1200))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  },
)

it.each([
  { kind: 'installation', label: 'მონტაჟის დამატება' },
  { kind: 'measurement', label: 'აზომვის დამატება' },
  { kind: 'other', label: 'სხვა სამუშაოს დამატება' },
])(
  'offers $kind creation at the selected Georgian coordinate',
  async ({ kind, label }) => {
    const onCreate = vi.fn()
    const position = { longitude: 44.8, latitude: 41.7 }
    render(
      <JobsMapMenu position={position} onCreate={onCreate}>
        <canvas aria-label="სატესტო რუკა" />
      </JobsMapMenu>,
    )
    fireEvent.contextMenu(screen.getByLabelText('სატესტო რუკა'), {
      clientX: 40,
      clientY: 60,
    })
    await userEvent.click(await screen.findByRole('menuitem', { name: label }))
    expect(onCreate).toHaveBeenCalledWith({ ...position, kind })
  },
)
it('disables creation outside Georgia', async () => {
  const onCreate = vi.fn()
  render(
    <JobsMapMenu
      position={{ longitude: 44.681, latitude: 43.024 }}
      onCreate={onCreate}
    >
      <canvas aria-label="სატესტო რუკა" />
    </JobsMapMenu>,
  )
  fireEvent.contextMenu(screen.getByLabelText('სატესტო რუკა'), {
    clientX: 40,
    clientY: 60,
  })
  const item = await screen.findByRole('menuitem', {
    name: 'მონტაჟის დამატება',
  })
  expect(item).toHaveAttribute('aria-disabled', 'true')
  expect(
    screen.getByRole('menuitem', { name: 'სხვა სამუშაოს დამატება' }),
  ).toHaveAttribute('aria-disabled', 'true')
  await userEvent.click(item)
  expect(onCreate).not.toHaveBeenCalled()
})
it('never opens a stale-position creation menu from a long press on search controls', async () => {
  render(
    <JobsMapMenu
      position={{ longitude: 44.8, latitude: 41.7 }}
      onCreate={vi.fn()}
    >
      <Input aria-label="რუკის ძიება" />
    </JobsMapMenu>,
  )
  const input = screen.getByRole('textbox', { name: 'რუკის ძიება' })
  fireEvent.touchStart(input, {
    touches: [{ identifier: 1, target: input, clientX: 40, clientY: 60 }],
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 600))
  })
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
})
