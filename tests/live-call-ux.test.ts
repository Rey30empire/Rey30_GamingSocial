import assert from 'node:assert/strict'
import test from 'node:test'
import type { LiveCallStateSnapshot } from '@/lib/app-types'
import {
  buildMediaDeviceConstraint,
  deriveConnectionHealth,
  derivePermissionState,
  formatMediaDeviceLabel,
  getMediaPermissionFeedback,
} from '@/lib/live-call-ux'

function buildCallState(myParticipantId: string | null, remoteParticipantCount = 0): LiveCallStateSnapshot {
  return {
    streamId: 'stream-1',
    streamTitle: 'Live test',
    rtcEnabled: true,
    note: null,
    myParticipantId,
    participants: [
      ...(myParticipantId
        ? [
            {
              id: myParticipantId,
              userId: 'user-me',
              displayName: 'AlexRey30',
              handle: 'alexrey30',
              avatar: 'alex',
              isMe: true,
              isHost: true,
              microphoneEnabled: true,
              cameraEnabled: true,
              joinedAt: new Date().toISOString(),
              stateLabel: 'Conectado',
            },
          ]
        : []),
      ...Array.from({ length: remoteParticipantCount }, (_, index) => ({
        id: `remote-${index + 1}`,
        userId: `user-${index + 1}`,
        displayName: `Guest ${index + 1}`,
        handle: `guest${index + 1}`,
        avatar: `guest-${index + 1}`,
        microphoneEnabled: true,
        cameraEnabled: true,
        joinedAt: new Date().toISOString(),
        stateLabel: 'Conectado',
      })),
    ],
  }
}

test('formatMediaDeviceLabel usa fallback cuando el label viene vacío', () => {
  assert.equal(formatMediaDeviceLabel('', 'Micrófono', 0), 'Micrófono 1')
  assert.equal(formatMediaDeviceLabel('  Cámara USB  ', 'Cámara', 1), 'Cámara USB')
})

test('getMediaPermissionFeedback clasifica errores de permisos y dispositivos', () => {
  const blockedError = Object.assign(new Error('denied'), { name: 'NotAllowedError' })
  const busyError = Object.assign(new Error('busy'), { name: 'NotReadableError' })

  assert.deepEqual(getMediaPermissionFeedback(blockedError), {
    message: 'El navegador bloqueó la cámara o el micrófono. Revisa los permisos del sitio y vuelve a intentar.',
    permissionState: 'blocked',
  })
  assert.deepEqual(getMediaPermissionFeedback(busyError), {
    message: 'La cámara o el micrófono están ocupados por otra app. Cierra esa app e inténtalo otra vez.',
    permissionState: 'limited',
  })
})

test('derivePermissionState refleja permisos listos, bloqueados y modo limitado', () => {
  assert.equal(
    derivePermissionState({
      microphonePermission: 'blocked',
      cameraPermission: 'granted',
      audioInputCount: 1,
      videoInputCount: 1,
    }),
    'blocked'
  )

  assert.equal(
    derivePermissionState({
      microphonePermission: 'idle',
      cameraPermission: 'idle',
      audioInputCount: 1,
      videoInputCount: 1,
      hasActiveAudioTrack: true,
      hasActiveVideoTrack: true,
    }),
    'granted'
  )

  assert.equal(
    derivePermissionState({
      microphonePermission: 'idle',
      cameraPermission: 'idle',
      audioInputCount: 1,
      videoInputCount: 0,
    }),
    'limited'
  )
})

test('deriveConnectionHealth resume el estado del call para waiting, connected, degraded y disconnected', () => {
  const idle = deriveConnectionHealth(buildCallState(null), [])
  const waiting = deriveConnectionHealth(buildCallState('me', 0), [])
  const connecting = deriveConnectionHealth(buildCallState('me', 1), ['new'])
  const connected = deriveConnectionHealth(buildCallState('me', 1), ['connected'])
  const degraded = deriveConnectionHealth(buildCallState('me', 1), ['disconnected'])
  const disconnected = deriveConnectionHealth(buildCallState('me', 1), ['failed'])

  assert.equal(idle.health, 'idle')
  assert.match(idle.detail, /Configura tus dispositivos/)
  assert.equal(waiting.health, 'waiting')
  assert.match(waiting.detail, /Esperando a que entre otra persona/)
  assert.equal(connecting.health, 'connecting')
  assert.match(connecting.detail, /Preparando enlaces|negociando/i)
  assert.equal(connected.health, 'connected')
  assert.match(connected.detail, /Audio y video sincronizados/)
  assert.equal(degraded.health, 'degraded')
  assert.match(degraded.detail, /inestable/i)
  assert.equal(disconnected.health, 'disconnected')
  assert.match(disconnected.detail, /falló/i)
})

test('buildMediaDeviceConstraint usa true cuando no hay selección y exact cuando sí', () => {
  assert.equal(buildMediaDeviceConstraint(''), true)
  assert.deepEqual(buildMediaDeviceConstraint('camera-1'), {
    deviceId: {
      exact: 'camera-1',
    },
  })
})
