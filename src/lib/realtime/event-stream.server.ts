import '@tanstack/react-start/server-only'
import { subscribeRealtime } from './postgres-events.server'
import type { RealtimeSignal } from './realtime.schemas'

type Event = { event: string; data: unknown; id?: string }

/** Owns framing, serialized work, keepalive, slow-client limits, and disconnect cleanup. */
export function eventStreamResponse(
  request: Request,
  options: {
    authorized: () => Promise<boolean>
    accepts?: (signal: RealtimeSignal) => boolean
    snapshot: () => Promise<Event>
    changed: (signal: RealtimeSignal) => Promise<Event | null>
  },
) {
  const encoder = new TextEncoder()
  let stop = (_close = true) => {}
  const body = new ReadableStream<Uint8Array>(
    {
      start(controller) {
        let closed = false
        let queued = 0
        let work = Promise.resolve()
        let unsubscribe = () => {}
        const heartbeat = setInterval(
          () =>
            schedule(async () => {
              send(': keepalive\n\n')
              return null
            }),
          25000,
        )
        const abort = () => stop()
        stop = (close = true) => {
          if (closed) return
          closed = true
          clearInterval(heartbeat)
          unsubscribe()
          request.signal.removeEventListener('abort', abort)
          if (close) controller.close()
        }
        function send(text: string) {
          if (closed) return
          if ((controller.desiredSize ?? 0) <= 0) return stop()
          controller.enqueue(encoder.encode(text))
        }
        function schedule(read: () => Promise<Event | null>) {
          if (closed) return
          if (++queued > 32) return stop()
          work = work
            .then(async () => {
              if (closed) return
              if (!(await options.authorized())) {
                send('event: session-ended\ndata: {}\n\n')
                return stop()
              }
              const value = await read()
              if (value)
                send(
                  `${value.id ? `id: ${value.id}\n` : ''}event: ${value.event}\ndata: ${JSON.stringify(value.data)}\n\n`,
                )
            })
            .catch(() => stop())
            .finally(() => {
              queued--
            })
        }
        request.signal.addEventListener('abort', abort, { once: true })
        if (request.signal.aborted) return stop()
        send('retry: 3000\n\n')
        unsubscribe = subscribeRealtime({
          signal: (signal) => {
            if (!options.accepts || options.accepts(signal))
              schedule(() => options.changed(signal))
          },
          // Also reconciles publications missed while the database listener was reconnecting.
          connected: () => schedule(options.snapshot),
        })
        schedule(options.snapshot)
      },
      cancel() {
        stop(false)
      },
    },
    { highWaterMark: 65536, size: (chunk) => chunk.byteLength },
  )
  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'private, no-store, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
