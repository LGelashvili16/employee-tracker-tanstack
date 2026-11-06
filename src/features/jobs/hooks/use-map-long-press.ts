import { useEffect, useRef } from 'react'
import type { ComponentProps } from 'react'
import type { ContextMenuTrigger } from '#/components/ui/context-menu'

type TriggerProps = ComponentProps<typeof ContextMenuTrigger>

/** Adapt Base UI's fixed short delay to a deliberate one-second map hold. */
export function useMapLongPress() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const opened = useRef(false)
  const pressedTarget = useRef<Element | null>(null)
  const gesture = useRef<AbortController | null>(null)
  function cancel() {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
    start.current = null
    gesture.current?.abort()
    gesture.current = null
  }
  useEffect(() => cancel, [])
  const handlers: Pick<
    TriggerProps,
    | 'onTouchStart'
    | 'onTouchMove'
    | 'onTouchEnd'
    | 'onTouchCancel'
    | 'onContextMenuCapture'
    | 'onClickCapture'
    | 'onKeyDown'
  > = {
    onTouchStart(event) {
      event.preventBaseUIHandler()
      event.stopPropagation()
      cancel()
      opened.current = false
      if (event.touches.length !== 1) return
      const touch = event.touches[0]
      const target = event.target
      if (!(target instanceof Element)) return
      pressedTarget.current = target
      const point = { x: touch.clientX, y: touch.clientY }
      start.current = point
      const controller = new AbortController()
      gesture.current = controller
      // A second finger can land outside this marker or even on an overlay.
      event.currentTarget.ownerDocument.addEventListener(
        'touchstart',
        (next) => {
          if (next.touches.length !== 1) cancel()
        },
        { capture: true, passive: true, signal: controller.signal },
      )
      timer.current = setTimeout(() => {
        timer.current = null
        opened.current = true
        target.dispatchEvent(
          new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            clientX: point.x,
            clientY: point.y,
          }),
        )
      }, 1000)
    },
    onTouchMove(event) {
      const touch = event.touches[0]
      if (
        event.touches.length !== 1 ||
        (start.current &&
          (Math.abs(touch.clientX - start.current.x) > 10 ||
            Math.abs(touch.clientY - start.current.y) > 10))
      )
        cancel()
    },
    onTouchEnd: cancel,
    onTouchCancel: cancel,
    onContextMenuCapture(event) {
      // Ignore an OS-generated context menu before the intended hold has completed.
      if (start.current && !opened.current) {
        event.preventDefault()
        event.stopPropagation()
      }
    },
    onClickCapture(event) {
      if (
        !opened.current ||
        !(event.target instanceof Node) ||
        !pressedTarget.current?.contains(event.target)
      )
        return
      opened.current = false
      event.preventDefault()
      event.stopPropagation()
    },
    onKeyDown(event) {
      if (
        event.key !== 'ContextMenu' &&
        !(event.shiftKey && event.key === 'F10')
      )
        return
      event.preventDefault()
      const bounds = event.currentTarget.getBoundingClientRect()
      event.currentTarget.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: bounds.x + bounds.width / 2,
          clientY: bounds.y + bounds.height / 2,
        }),
      )
    },
  }
  return handlers
}
