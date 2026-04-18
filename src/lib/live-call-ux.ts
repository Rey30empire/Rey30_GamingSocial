import type { LiveCallStateSnapshot } from '@/lib/app-types'

export interface MediaInputDeviceOption {
  id: string
  label: string
}

export type CallConnectionHealth =
  | 'idle'
  | 'preparing'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'degraded'
  | 'disconnected'

export type DevicePermissionState = 'idle' | 'requesting' | 'granted' | 'limited' | 'blocked'

export interface MediaPermissionFeedback {
  message: string
  permissionState: DevicePermissionState
}

export interface DerivedConnectionHealth {
  health: CallConnectionHealth
  detail: string
}

export function formatMediaDeviceLabel(label: string, fallback: string, index: number) {
  return label.trim() || `${fallback} ${index + 1}`
}

export function getMediaPermissionFeedback(error: unknown): MediaPermissionFeedback {
  const fallbackMessage = 'No se pudo abrir la cámara o el micrófono seleccionados.'

  if (!(error instanceof Error)) {
    return {
      message: fallbackMessage,
      permissionState: 'limited',
    }
  }

  if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
    return {
      message: 'El navegador bloqueó la cámara o el micrófono. Revisa los permisos del sitio y vuelve a intentar.',
      permissionState: 'blocked',
    }
  }

  if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
    return {
      message: 'No encontramos el micrófono o la cámara solicitados en este equipo.',
      permissionState: 'limited',
    }
  }

  if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
    return {
      message: 'La cámara o el micrófono están ocupados por otra app. Cierra esa app e inténtalo otra vez.',
      permissionState: 'limited',
    }
  }

  if (error.name === 'OverconstrainedError') {
    return {
      message: 'El dispositivo elegido ya no está disponible. Selecciona otro y vuelve a conectar.',
      permissionState: 'limited',
    }
  }

  return {
    message: error.message || fallbackMessage,
    permissionState: 'limited',
  }
}

export function derivePermissionState(options: {
  microphonePermission: DevicePermissionState
  cameraPermission: DevicePermissionState
  audioInputCount: number
  videoInputCount: number
  hasActiveAudioTrack?: boolean
  hasActiveVideoTrack?: boolean
}) {
  const hasAudio = options.audioInputCount > 0 || Boolean(options.hasActiveAudioTrack)
  const hasVideo = options.videoInputCount > 0 || Boolean(options.hasActiveVideoTrack)

  if (options.microphonePermission === 'blocked' || options.cameraPermission === 'blocked') {
    return 'blocked'
  }

  if (
    (options.microphonePermission === 'granted' || options.hasActiveAudioTrack) &&
    (options.cameraPermission === 'granted' || options.hasActiveVideoTrack)
  ) {
    return 'granted'
  }

  if (!hasAudio || !hasVideo) {
    return 'limited'
  }

  return 'idle'
}

export function deriveConnectionHealth(
  state: LiveCallStateSnapshot | null | undefined,
  peerStates: RTCPeerConnectionState[]
): DerivedConnectionHealth {
  if (!state?.myParticipantId) {
    return {
      health: 'idle',
      detail: 'Configura tus dispositivos antes de entrar al call.',
    }
  }

  const remoteParticipantCount = state.participants.filter((participant) => !participant.isMe).length

  if (remoteParticipantCount === 0) {
    return {
      health: 'waiting',
      detail: 'Tu feed ya está listo. Esperando a que entre otra persona al call.',
    }
  }

  if (!peerStates.length || peerStates.every((peerState) => peerState === 'new')) {
    return {
      health: 'connecting',
      detail: 'Preparando enlaces WebRTC con el resto de participantes.',
    }
  }

  if (peerStates.some((peerState) => peerState === 'failed')) {
    return {
      health: 'disconnected',
      detail: 'Uno de los enlaces falló. Usa reconectar para renegociar sin salir del stream.',
    }
  }

  if (peerStates.some((peerState) => peerState === 'disconnected')) {
    return {
      health: 'degraded',
      detail: 'La conexión está inestable. Si no se recupera sola, fuerza una reconexión.',
    }
  }

  if (peerStates.some((peerState) => peerState === 'connecting' || peerState === 'new')) {
    return {
      health: 'connecting',
      detail: 'Todavía estamos negociando audio y video con otros participantes.',
    }
  }

  if (peerStates.some((peerState) => peerState === 'connected')) {
    return {
      health: 'connected',
      detail: `Audio y video sincronizados con ${remoteParticipantCount} participante${remoteParticipantCount === 1 ? '' : 's'}.`,
    }
  }

  return {
    health: 'degraded',
    detail: 'El estado de la llamada cambió y estamos limpiando conexiones anteriores.',
  }
}

export function buildMediaDeviceConstraint(deviceId: string) {
  if (!deviceId) {
    return true
  }

  return {
    deviceId: {
      exact: deviceId,
    },
  }
}
