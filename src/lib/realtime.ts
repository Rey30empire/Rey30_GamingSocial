export type RealtimeEventType =
  | 'connected'
  | 'pulse'
  | 'feed-updated'
  | 'message-created'
  | 'room-created'
  | 'room-updated'
  | 'presence-updated'
  | 'match-updated'
  | 'stream-updated'
  | 'live-call-updated'
  | 'inventory-updated'
  | 'customize-updated'

export interface RealtimeEvent {
  id: string
  type: RealtimeEventType
  timestamp: string
  roomId?: string
  streamId?: string
  screen?: string
  onlineUsers?: number
  note?: string
}

type RealtimeListener = (event: RealtimeEvent) => void

const globalForRealtime = globalThis as typeof globalThis & {
  __rey30Realtime__?: {
    listeners: Map<string, RealtimeListener>
  }
}

function getRealtimeStore() {
  if (!globalForRealtime.__rey30Realtime__) {
    globalForRealtime.__rey30Realtime__ = {
      listeners: new Map<string, RealtimeListener>(),
    }
  }

  return globalForRealtime.__rey30Realtime__
}

export function getRealtimeSubscriberCount() {
  return getRealtimeStore().listeners.size
}

export function subscribeRealtime(listener: RealtimeListener) {
  const store = getRealtimeStore()
  const id = crypto.randomUUID()
  store.listeners.set(id, listener)

  return () => {
    store.listeners.delete(id)
  }
}

export function createRealtimeEvent(
  payload: Omit<RealtimeEvent, 'id' | 'timestamp'> & Partial<Pick<RealtimeEvent, 'id' | 'timestamp'>>
) {
  return {
    id: payload.id ?? crypto.randomUUID(),
    timestamp: payload.timestamp ?? new Date().toISOString(),
    ...payload,
  }
}

export function publishRealtimeEvent(
  payload: Omit<RealtimeEvent, 'id' | 'timestamp'> & Partial<Pick<RealtimeEvent, 'id' | 'timestamp'>>
) {
  const store = getRealtimeStore()
  const event = createRealtimeEvent(payload)

  for (const listener of store.listeners.values()) {
    listener(event)
  }

  return event
}
