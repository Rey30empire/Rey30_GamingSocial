import type { NextRequest } from 'next/server'
import { createRealtimeEvent, getRealtimeSubscriberCount, subscribeRealtime } from '@/lib/realtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function formatSseEvent(event: ReturnType<typeof createRealtimeEvent>) {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  let pulseInterval: ReturnType<typeof setInterval> | null = null
  let unsubscribe = () => {}
  let streamClosed = false

  const closeStream = (controller: ReadableStreamDefaultController<Uint8Array>) => {
    if (streamClosed) {
      return
    }

    streamClosed = true

    if (pulseInterval) {
      clearInterval(pulseInterval)
      pulseInterval = null
    }

    unsubscribe()

    try {
      controller.close()
    } catch {
      // Controller already closed by the runtime.
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: ReturnType<typeof createRealtimeEvent>) => {
        if (streamClosed) {
          return
        }

        try {
          controller.enqueue(encoder.encode(formatSseEvent(event)))
        } catch {
          closeStream(controller)
        }
      }

      unsubscribe = subscribeRealtime((event) => {
        send(event)
      })

      send(
        createRealtimeEvent({
          type: 'connected',
          note: `${getRealtimeSubscriberCount()} listeners activos`,
        })
      )

      pulseInterval = setInterval(() => {
        send(
          createRealtimeEvent({
            type: 'pulse',
            note: 'keepalive',
          })
        )
      }, 15_000)

      request.signal.addEventListener(
        'abort',
        () => {
          closeStream(controller)
        },
        { once: true }
      )
    },
    cancel() {
      if (pulseInterval) {
        clearInterval(pulseInterval)
        pulseInterval = null
      }

      unsubscribe()
      streamClosed = true
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
