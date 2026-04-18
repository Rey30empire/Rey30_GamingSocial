'use client'

import { startTransition, useEffect, useEffectEvent, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type {
  LiveCallConfigSnapshot,
  LiveCallParticipantSnapshot,
  LiveCallStateSnapshot,
  LiveGiftOptionSnapshot,
  LiveSnapshot,
  StreamSnapshot,
} from '@/lib/app-types'
import {
  buildMediaDeviceConstraint,
  deriveConnectionHealth,
  derivePermissionState,
  formatMediaDeviceLabel,
  getMediaPermissionFeedback,
  type CallConnectionHealth,
  type DevicePermissionState,
  type MediaInputDeviceOption,
} from '@/lib/live-call-ux'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertTriangle,
  Clapperboard,
  Crown,
  Diamond,
  Eye,
  Flame,
  Gift,
  Mic,
  MicOff,
  Maximize,
  MessageCircle,
  PhoneOff,
  Play,
  Radio,
  RefreshCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from 'lucide-react'

interface LiveStreamingProps {
  data?: LiveSnapshot
}

interface RemoteCallStream {
  participantId: string
  stream: MediaStream
}

function getConnectionHealthMeta(state: CallConnectionHealth) {
  switch (state) {
    case 'preparing':
      return {
        label: 'Preparando',
        className: 'bg-cyan-500/15 text-cyan-100',
      }
    case 'waiting':
      return {
        label: 'Esperando gente',
        className: 'bg-violet-500/15 text-violet-100',
      }
    case 'connecting':
      return {
        label: 'Negociando',
        className: 'bg-amber-500/15 text-amber-100',
      }
    case 'connected':
      return {
        label: 'Conectada',
        className: 'bg-emerald-500/15 text-emerald-100',
      }
    case 'degraded':
      return {
        label: 'Inestable',
        className: 'bg-amber-500/15 text-amber-100',
      }
    case 'disconnected':
      return {
        label: 'Cortada',
        className: 'bg-rose-500/15 text-rose-100',
      }
    default:
      return {
        label: 'Lista',
        className: 'bg-white/[0.08] text-zinc-100',
      }
  }
}

function getPermissionStateMeta(state: DevicePermissionState) {
  switch (state) {
    case 'requesting':
      return {
        label: 'Pidiendo permisos',
        className: 'bg-cyan-500/15 text-cyan-100',
        icon: AlertTriangle,
      }
    case 'granted':
      return {
        label: 'Permisos listos',
        className: 'bg-emerald-500/15 text-emerald-100',
        icon: ShieldCheck,
      }
    case 'limited':
      return {
        label: 'Modo limitado',
        className: 'bg-amber-500/15 text-amber-100',
        icon: AlertTriangle,
      }
    case 'blocked':
      return {
        label: 'Permisos bloqueados',
        className: 'bg-rose-500/15 text-rose-100',
        icon: ShieldAlert,
      }
    default:
      return {
        label: 'Permisos pendientes',
        className: 'bg-white/[0.08] text-zinc-100',
        icon: ShieldAlert,
      }
  }
}

function GiftGlyph({ image }: { image: string }) {
  const Icon =
    image === 'pulse'
      ? Sparkles
      : image === 'diamond'
        ? Diamond
        : image === 'crown'
          ? Crown
          : image === 'trophy'
            ? Crown
            : Gift

  const className =
    image === 'pulse'
      ? 'text-fuchsia-300'
      : image === 'diamond'
        ? 'text-cyan-300'
        : image === 'crown'
          ? 'text-amber-300'
          : 'text-zinc-200'

  return <Icon className={cn('h-4 w-4', className)} />
}

function StreamCard({
  stream,
  isActive,
  onSelect,
}: {
  stream: StreamSnapshot
  isActive: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'surface-panel rounded-[1.45rem] p-4 text-left transition hover:border-violet-400/30 hover:bg-violet-500/[0.08]',
        isActive && 'border-violet-400/30 bg-violet-500/[0.08]'
      )}
    >
      <div className="relative overflow-hidden rounded-[1.2rem] border border-violet-400/10 bg-gradient-to-br from-violet-500/20 via-fuchsia-500/14 to-cyan-500/14 p-4">
        <div className="absolute right-3 top-3 flex items-center gap-2">
          {stream.isLive ? (
            <Badge className="border-0 bg-red-500 text-white">
              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-white" />
              EN VIVO
            </Badge>
          ) : null}
          <Badge className="border-0 bg-black/30 text-zinc-100">
            <Eye className="mr-1 h-3 w-3" />
            {stream.viewers.toLocaleString()}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border border-violet-400/20">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${stream.streamer.avatar}`} />
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
              {stream.streamer.name[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold text-white">{stream.streamer.name}</p>
              {stream.streamer.isVerified ? <Star className="h-4 w-4 fill-amber-300 text-amber-300" /> : null}
            </div>
            <p className="truncate text-sm text-zinc-300">{stream.title}</p>
            <p className="text-xs text-zinc-500">{stream.statusLine}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3 text-zinc-400">
          <span className="flex items-center gap-1">
            <Sparkles className="h-4 w-4 text-fuchsia-300" />
            {stream.likes.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-4 w-4 text-cyan-300" />
            {stream.comments.toLocaleString()}
          </span>
        </div>
        <span className="rounded-full border border-violet-400/15 bg-white/[0.04] px-3 py-1 text-xs text-zinc-200">
          {stream.game}
        </span>
      </div>
    </button>
  )
}

function ParticipantVideoTile({
  participant,
  stream,
  muted = false,
}: {
  participant: LiveCallParticipantSnapshot
  stream: MediaStream | null
  muted?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const element = videoRef.current

    if (!element) {
      return
    }

    element.srcObject = stream

    return () => {
      if (element.srcObject === stream) {
        element.srcObject = null
      }
    }
  }, [stream])

  const showVideo = Boolean(stream && participant.cameraEnabled)

  return (
    <div className="relative overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-black/30">
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="h-56 w-full object-cover md:h-64"
        />
      ) : (
        <div className="flex h-56 w-full items-center justify-center bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(180deg,rgba(139,92,246,0.18),rgba(7,10,18,0.88))] md:h-64">
          <div className="text-center">
            <Avatar className="mx-auto h-20 w-20 border border-violet-400/25">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.avatar}`} />
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                {participant.displayName[0]}
              </AvatarFallback>
            </Avatar>
            <p className="mt-4 text-sm font-medium text-white">{participant.displayName}</p>
            <p className="mt-1 text-xs text-zinc-400">
              {participant.cameraEnabled ? 'Esperando video...' : 'Cámara pausada'}
            </p>
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white">{participant.displayName}</p>
            {participant.isHost ? (
              <Badge className="border-0 bg-amber-500/20 text-amber-100">Host</Badge>
            ) : null}
            {participant.isMe ? (
              <Badge className="border-0 bg-emerald-500/20 text-emerald-100">Tú</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-zinc-300">@{participant.handle}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-black/50 p-2 text-zinc-100">
            {participant.microphoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-rose-300" />}
          </span>
          <span className="rounded-full bg-black/50 p-2 text-zinc-100">
            {participant.cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4 text-rose-300" />}
          </span>
        </div>
      </div>
    </div>
  )
}

export function LiveStreaming({ data }: LiveStreamingProps) {
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(data ?? null)
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(data?.activeStreamId ?? null)
  const [callConfig, setCallConfig] = useState<LiveCallConfigSnapshot | null>(null)
  const [callSnapshot, setCallSnapshot] = useState<LiveCallStateSnapshot | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<RemoteCallStream[]>([])
  const [localPreviewStream, setLocalPreviewStream] = useState<MediaStream | null>(null)
  const [chatMessage, setChatMessage] = useState('')
  const [muted, setMuted] = useState(false)
  const [callMicEnabled, setCallMicEnabled] = useState(true)
  const [callCameraEnabled, setCallCameraEnabled] = useState(true)
  const [callMicAvailable, setCallMicAvailable] = useState(true)
  const [callCameraAvailable, setCallCameraAvailable] = useState(true)
  const [audioInputDevices, setAudioInputDevices] = useState<MediaInputDeviceOption[]>([])
  const [videoInputDevices, setVideoInputDevices] = useState<MediaInputDeviceOption[]>([])
  const [selectedAudioInputId, setSelectedAudioInputId] = useState('')
  const [selectedVideoInputId, setSelectedVideoInputId] = useState('')
  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false)
  const [isSwitchingDevices, setIsSwitchingDevices] = useState(false)
  const [permissionState, setPermissionState] = useState<DevicePermissionState>('idle')
  const [connectionHealth, setConnectionHealth] = useState<CallConnectionHealth>('idle')
  const [connectionDetail, setConnectionDetail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(!data)
  const [isSendingChat, setIsSendingChat] = useState(false)
  const [isJoiningCall, setIsJoiningCall] = useState(false)
  const [isLeavingCall, setIsLeavingCall] = useState(false)
  const [pendingGiftId, setPendingGiftId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [callStatus, setCallStatus] = useState<string | null>(null)
  const [callError, setCallError] = useState<string | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const peerConnectionStatesRef = useRef<Map<string, RTCPeerConnectionState>>(new Map())
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map())
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  const joinedStreamIdRef = useRef<string | null>(null)
  const participantIdRef = useRef<string | null>(null)
  const activeStreamIdRef = useRef<string | null>(data?.activeStreamId ?? null)
  const callConfigRef = useRef<LiveCallConfigSnapshot | null>(null)

  useEffect(() => {
    if (!data) {
      return
    }

    setSnapshot(data)
    setSelectedStreamId((current) => current ?? data.activeStreamId ?? data.streams[0]?.id ?? null)
  }, [data])

  useEffect(() => {
    callConfigRef.current = callConfig
  }, [callConfig])

  const refreshAvailableDevicesFromEffect = useEffectEvent(async () => {
    await refreshMediaDevices()
  })

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return
    }

    void refreshAvailableDevicesFromEffect()

    const handleDeviceChange = () => {
      void refreshAvailableDevicesFromEffect()
    }

    navigator.mediaDevices.addEventListener?.('devicechange', handleDeviceChange)

    return () => {
      navigator.mediaDevices.removeEventListener?.('devicechange', handleDeviceChange)
    }
  }, [refreshAvailableDevicesFromEffect])

  const syncConnectionHealth = (state?: LiveCallStateSnapshot | null) => {
    const derivedState = deriveConnectionHealth(state ?? callSnapshot, Array.from(peerConnectionStatesRef.current.values()))
    setConnectionHealth(derivedState.health)
    setConnectionDetail(derivedState.detail)
  }

  const queryPermissionState = async (name: 'camera' | 'microphone'): Promise<DevicePermissionState> => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
      return 'idle'
    }

    try {
      const result = await navigator.permissions.query({
        name: name as PermissionName,
      })

      if (result.state === 'granted') {
        return 'granted'
      }

      if (result.state === 'denied') {
        return 'blocked'
      }

      return 'idle'
    } catch {
      return 'idle'
    }
  }

  const refreshMediaDevices = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return
    }

    setIsRefreshingDevices(true)

    try {
      const [devices, microphonePermission, cameraPermission] = await Promise.all([
        navigator.mediaDevices.enumerateDevices(),
        queryPermissionState('microphone'),
        queryPermissionState('camera'),
      ])

      const nextAudioInputDevices = devices
        .filter((device) => device.kind === 'audioinput')
        .map((device, index) => ({
          id: device.deviceId,
          label: formatMediaDeviceLabel(device.label, 'Micrófono', index),
        }))
      const nextVideoInputDevices = devices
        .filter((device) => device.kind === 'videoinput')
        .map((device, index) => ({
          id: device.deviceId,
          label: formatMediaDeviceLabel(device.label, 'Cámara', index),
        }))

      setAudioInputDevices(nextAudioInputDevices)
      setVideoInputDevices(nextVideoInputDevices)
      setSelectedAudioInputId((current) =>
        current && nextAudioInputDevices.some((device) => device.id === current) ? current : nextAudioInputDevices[0]?.id ?? ''
      )
      setSelectedVideoInputId((current) =>
        current && nextVideoInputDevices.some((device) => device.id === current) ? current : nextVideoInputDevices[0]?.id ?? ''
      )
      setCallMicAvailable(
        nextAudioInputDevices.length > 0 || Boolean(localStreamRef.current?.getAudioTracks().length)
      )
      setCallCameraAvailable(
        nextVideoInputDevices.length > 0 || Boolean(localStreamRef.current?.getVideoTracks().length)
      )

      setPermissionState(
        derivePermissionState({
          microphonePermission,
          cameraPermission,
          audioInputCount: nextAudioInputDevices.length,
          videoInputCount: nextVideoInputDevices.length,
          hasActiveAudioTrack: Boolean(localStreamRef.current?.getAudioTracks().length),
          hasActiveVideoTrack: Boolean(localStreamRef.current?.getVideoTracks().length),
        })
      )
    } catch (caughtError) {
      const feedback = getMediaPermissionFeedback(caughtError)
      setPermissionState(feedback.permissionState)
      setCallError(feedback.message)
    } finally {
      setIsRefreshingDevices(false)
    }
  }

  const loadSnapshot = async (streamId?: string | null, showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    }

    try {
      const query = streamId ? `?streamId=${streamId}` : ''
      const response = await fetch(`/api/live/state${query}`, {
        cache: 'no-store',
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo cargar el modulo en vivo.')
      }

      startTransition(() => {
        setSnapshot(payload as LiveSnapshot)
        setSelectedStreamId(payload.activeStreamId ?? payload.streams[0]?.id ?? null)
      })
      setError(null)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo cargar el modulo en vivo.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadCallConfig = async () => {
    try {
      const response = await fetch('/api/live/call/config', {
        cache: 'no-store',
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo cargar la configuración WebRTC.')
      }

      const nextConfig = payload as LiveCallConfigSnapshot
      setCallConfig(nextConfig)
      callConfigRef.current = nextConfig
      return nextConfig
    } catch (caughtError) {
      setCallError(
        caughtError instanceof Error ? caughtError.message : 'No se pudo cargar la configuración WebRTC.'
      )
      return null
    }
  }

  const syncRemoteStreams = () => {
    startTransition(() => {
      setRemoteStreams(
        Array.from(remoteStreamsRef.current.entries()).map(([participantId, stream]) => ({
          participantId,
          stream,
        }))
      )
    })
  }

  const clearPeerConnection = (participantId: string) => {
    const existingConnection = peerConnectionsRef.current.get(participantId)

    if (existingConnection) {
      existingConnection.onicecandidate = null
      existingConnection.ontrack = null
      existingConnection.onconnectionstatechange = null
      existingConnection.close()
      peerConnectionsRef.current.delete(participantId)
    }

    peerConnectionStatesRef.current.delete(participantId)
    pendingIceCandidatesRef.current.delete(participantId)
    remoteStreamsRef.current.delete(participantId)
    syncRemoteStreams()
    syncConnectionHealth()
  }

  const cleanupCallRuntime = async (notifyServer: boolean, statusMessage?: string | null) => {
    const streamId = joinedStreamIdRef.current
    const participantId = participantIdRef.current

    if (notifyServer && streamId && participantId) {
      try {
        await fetch('/api/live/call', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            streamId,
            participantId,
          }),
        })
      } catch {
        // El teardown local igual debe continuar aunque falle el cierre remoto.
      }
    }

    for (const remoteParticipantId of peerConnectionsRef.current.keys()) {
      clearPeerConnection(remoteParticipantId)
    }

    peerConnectionsRef.current.clear()
    peerConnectionStatesRef.current.clear()
    remoteStreamsRef.current.clear()
    pendingIceCandidatesRef.current.clear()
    setRemoteStreams([])

    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        track.stop()
      }
    }

    localStreamRef.current = null
    setLocalPreviewStream(null)
    joinedStreamIdRef.current = null
    participantIdRef.current = null
    setConnectionHealth('idle')
    setConnectionDetail('Configura tus dispositivos antes de entrar al call.')
    setCallSnapshot((current) =>
      current
        ? {
            ...current,
            myParticipantId: null,
            participants: current.participants.filter((participant) => !participant.isMe),
          }
        : null
    )

    if (statusMessage !== undefined) {
      setCallStatus(statusMessage)
    }
  }

  const sendCallSignal = async (
    toParticipantId: string,
    type: 'offer' | 'answer' | 'ice',
    signal: Record<string, unknown> | RTCIceCandidateInit
  ) => {
      if (!joinedStreamIdRef.current || !participantIdRef.current) {
        return
      }

      const response = await fetch('/api/live/call/signals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamId: joinedStreamIdRef.current,
          participantId: participantIdRef.current,
          toParticipantId,
          type,
          signal,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo enviar la señal WebRTC.')
      }
    }


  const drainPendingIceCandidates = async (participantId: string, connection: RTCPeerConnection) => {
    const queuedCandidates = pendingIceCandidatesRef.current.get(participantId) ?? []

    if (!queuedCandidates.length) {
      return
    }

    for (const candidate of queuedCandidates) {
      await connection.addIceCandidate(candidate)
    }

    pendingIceCandidatesRef.current.delete(participantId)
  }

  const ensurePeerConnection = (participantId: string) => {
    const existingConnection = peerConnectionsRef.current.get(participantId)

    if (existingConnection) {
      return existingConnection
    }

    const connection = new RTCPeerConnection({
      iceServers: (callConfigRef.current?.iceServers ?? []).map((server) =>
        server.username && server.credential
          ? {
              urls: server.urls,
              username: server.username,
              credential: server.credential,
            }
          : {
              urls: server.urls,
            }
      ),
    })

    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        connection.addTrack(track, localStreamRef.current)
      }
    }

    connection.onicecandidate = (event) => {
      const candidate = event.candidate?.toJSON()

      if (!candidate) {
        return
      }

      void sendCallSignal(participantId, 'ice', candidate)
    }

    connection.ontrack = (event) => {
      const nextStream = event.streams[0] ?? new MediaStream([event.track])
      remoteStreamsRef.current.set(participantId, nextStream)
      syncRemoteStreams()
      syncConnectionHealth()
    }

    connection.onconnectionstatechange = () => {
      peerConnectionStatesRef.current.set(participantId, connection.connectionState)
      syncConnectionHealth()

      if (connection.connectionState === 'disconnected') {
        setCallStatus('La llamada quedó inestable. Si no mejora sola, usa reconectar.')
      }

      if (connection.connectionState === 'closed' || connection.connectionState === 'failed') {
        clearPeerConnection(participantId)
      }
    }

    peerConnectionsRef.current.set(participantId, connection)
    return connection
  }

  const applyIncomingSignal = async (signal: { fromParticipantId: string; type: 'offer' | 'answer' | 'ice'; payload: unknown }) => {
    const connection = ensurePeerConnection(signal.fromParticipantId)

    if (signal.type === 'offer') {
      const offer = signal.payload as RTCSessionDescriptionInit

      if (connection.signalingState !== 'stable') {
        try {
          await connection.setLocalDescription({ type: 'rollback' })
        } catch {
          // Algunos navegadores pueden no aceptar rollback; seguimos con la oferta recibida.
        }
      }

      await connection.setRemoteDescription(offer)
      await drainPendingIceCandidates(signal.fromParticipantId, connection)

      const answer = await connection.createAnswer()
      await connection.setLocalDescription(answer)
      await sendCallSignal(signal.fromParticipantId, 'answer', {
        type: answer.type,
        sdp: answer.sdp ?? '',
      })
      return
    }

    if (signal.type === 'answer') {
      const answer = signal.payload as RTCSessionDescriptionInit

      if (!connection.currentRemoteDescription) {
        await connection.setRemoteDescription(answer)
        await drainPendingIceCandidates(signal.fromParticipantId, connection)
      }

      return
    }

    const iceCandidate = signal.payload as RTCIceCandidateInit

    if (connection.remoteDescription) {
      await connection.addIceCandidate(iceCandidate)
      return
    }

    const queuedCandidates = pendingIceCandidatesRef.current.get(signal.fromParticipantId) ?? []
    queuedCandidates.push(iceCandidate)
    pendingIceCandidatesRef.current.set(signal.fromParticipantId, queuedCandidates)
  }

  const loadCallSignals = async () => {
    if (!joinedStreamIdRef.current || !participantIdRef.current) {
      return
    }

    try {
      const response = await fetch(
        `/api/live/call/signals?streamId=${joinedStreamIdRef.current}&participantId=${participantIdRef.current}`,
        {
          cache: 'no-store',
        }
      )
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudieron cargar las señales WebRTC.')
      }

      for (const signal of payload.signals ?? []) {
        await applyIncomingSignal(signal)
      }
    } catch (caughtError) {
      setCallError(caughtError instanceof Error ? caughtError.message : 'No se pudieron cargar las señales WebRTC.')
    }
  }

  const reconcileCallPeers = async (state: LiveCallStateSnapshot) => {
    if (!state.myParticipantId) {
      return
    }

    const remoteParticipants = state.participants.filter((participant) => participant.id !== state.myParticipantId)
    const remoteParticipantIds = new Set(remoteParticipants.map((participant) => participant.id))

    for (const existingParticipantId of peerConnectionsRef.current.keys()) {
      if (!remoteParticipantIds.has(existingParticipantId)) {
        clearPeerConnection(existingParticipantId)
      }
    }

    for (const remoteParticipant of remoteParticipants) {
      const connection = ensurePeerConnection(remoteParticipant.id)

      if (
        state.myParticipantId < remoteParticipant.id &&
        !connection.currentLocalDescription &&
        !connection.pendingLocalDescription
      ) {
        const offer = await connection.createOffer()
        await connection.setLocalDescription(offer)
        await sendCallSignal(remoteParticipant.id, 'offer', {
          type: offer.type,
          sdp: offer.sdp ?? '',
        })
      }
    }
  }

  const loadCallState = async (streamId?: string | null) => {
    if (!streamId) {
      setCallSnapshot(null)
      return
    }

    try {
      const response = await fetch(`/api/live/call?streamId=${streamId}`, {
        cache: 'no-store',
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo cargar la videollamada.')
      }

      const nextState = payload as LiveCallStateSnapshot
      setCallSnapshot(nextState)

      if (!nextState.rtcEnabled) {
        setCallStatus(nextState.note)
        setConnectionHealth('idle')
        setConnectionDetail(nextState.note)
      }

      if (joinedStreamIdRef.current === streamId && !nextState.myParticipantId) {
        await cleanupCallRuntime(false, 'La videollamada se cerró o tu sesión quedó inactiva.')
        return
      }

      if (nextState.myParticipantId) {
        participantIdRef.current = nextState.myParticipantId
      }

      await reconcileCallPeers(nextState)
      syncConnectionHealth(nextState)
    } catch (caughtError) {
      setCallError(caughtError instanceof Error ? caughtError.message : 'No se pudo cargar la videollamada.')
      setConnectionHealth('disconnected')
      setConnectionDetail('No pudimos refrescar el estado del call. Reintenta cuando el stream vuelva a responder.')
    }
  }

  const refreshLiveSnapshot = useEffectEvent(async (streamId?: string | null, showLoader = false) => {
    await loadSnapshot(streamId, showLoader)
  })

  const refreshCallState = useEffectEvent(async (streamId?: string | null) => {
    await loadCallState(streamId)
  })

  const refreshCallSignals = useEffectEvent(async () => {
    await loadCallSignals()
  })

  const refreshCallConfig = useEffectEvent(async () => {
    await loadCallConfig()
  })

  const refreshCallPeers = useEffectEvent(async (state: LiveCallStateSnapshot) => {
    await reconcileCallPeers(state)
  })

  const teardownCallFromEffect = useEffectEvent(async (notifyServer: boolean, statusMessage?: string | null) => {
    await cleanupCallRuntime(notifyServer, statusMessage)
  })

  useEffect(() => {
    if (!snapshot) {
      void refreshLiveSnapshot(selectedStreamId, true)
    }
  }, [snapshot, selectedStreamId, refreshLiveSnapshot])

  useEffect(() => {
    if (!selectedStreamId || !snapshot || selectedStreamId === snapshot.activeStreamId) {
      return
    }

    void refreshLiveSnapshot(selectedStreamId)
  }, [selectedStreamId, snapshot, refreshLiveSnapshot])

  const activeStreamId = selectedStreamId ?? snapshot?.activeStreamId ?? snapshot?.streams[0]?.id ?? null
  const activeStream = snapshot?.streams.find((stream) => stream.id === activeStreamId) ?? snapshot?.streams[0] ?? null
  activeStreamIdRef.current = activeStreamId

  useEffect(() => {
    const syncCallState = async () => {
      if (!activeStream?.id) {
        setCallSnapshot(null)
        return
      }

      if (joinedStreamIdRef.current && joinedStreamIdRef.current !== activeStream.id) {
        await teardownCallFromEffect(true, null)
      }

      await refreshCallConfig()
      await refreshCallState(activeStream.id)
    }

    void syncCallState()
  }, [activeStream?.id, refreshCallConfig, refreshCallState, teardownCallFromEffect])

  useEffect(() => {
    const eventSource = new EventSource('/api/realtime/stream')

    const handleRealtime = (event: Event) => {
      const targetStreamId = activeStreamIdRef.current

      try {
        const payload = JSON.parse((event as MessageEvent).data) as { streamId?: string }

        if (payload.streamId && payload.streamId !== targetStreamId) {
          return
        }

        if (event.type === 'live-call-updated') {
          void refreshCallState(targetStreamId)
          void refreshCallSignals()
          return
        }

        void refreshLiveSnapshot(targetStreamId)
      } catch {
        void refreshLiveSnapshot(targetStreamId)
      }
    }

    eventSource.addEventListener('stream-updated', handleRealtime as EventListener)
    eventSource.addEventListener('inventory-updated', handleRealtime as EventListener)
    eventSource.addEventListener('live-call-updated', handleRealtime as EventListener)

    return () => {
      eventSource.close()
    }
  }, [refreshLiveSnapshot, refreshCallSignals, refreshCallState])

  useEffect(() => {
    if (!callSnapshot?.myParticipantId || !activeStream?.id) {
      return
    }

    const interval = setInterval(() => {
      void fetch('/api/live/call/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamId: activeStream.id,
          participantId: callSnapshot.myParticipantId,
          microphoneEnabled: callMicEnabled,
          cameraEnabled: callCameraEnabled,
        }),
      })
        .then(async (response) => {
          const payload = await response.json()

          if (!response.ok) {
            throw new Error(payload?.error ?? 'No se pudo mantener la videollamada.')
          }

          const nextState = payload.state as LiveCallStateSnapshot
          setCallSnapshot(nextState)
          participantIdRef.current = nextState.myParticipantId
          await refreshCallPeers(nextState)
          syncConnectionHealth(nextState)
        })
        .catch((caughtError) => {
          setCallError(
            caughtError instanceof Error ? caughtError.message : 'No se pudo mantener la videollamada.'
          )
          setConnectionHealth('degraded')
        })
    }, 12_000)

    return () => {
      clearInterval(interval)
    }
  }, [activeStream?.id, callCameraEnabled, callMicEnabled, callSnapshot?.myParticipantId, refreshCallPeers])

  useEffect(() => {
    if (!callSnapshot?.myParticipantId) {
      return
    }

    const interval = setInterval(() => {
      void refreshCallSignals()
    }, 1_500)

    return () => {
      clearInterval(interval)
    }
  }, [callSnapshot?.myParticipantId, refreshCallSignals])

  useEffect(() => {
    if (isJoiningCall || isLeavingCall) {
      return
    }

    if (callSnapshot?.myParticipantId) {
      syncConnectionHealth(callSnapshot)
      return
    }

    setConnectionHealth('idle')
    setConnectionDetail(
      callConfig?.rtcEnabled === false
        ? callConfig.note
        : 'Configura tus dispositivos y entra al call cuando quieras probar audio y video reales.'
    )
  }, [callConfig?.note, callConfig?.rtcEnabled, callSnapshot, isJoiningCall, isLeavingCall])

  useEffect(() => {
    return () => {
      const streamId = joinedStreamIdRef.current
      const participantId = participantIdRef.current

      if (streamId && participantId) {
        void fetch('/api/live/call', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            streamId,
            participantId,
          }),
          keepalive: true,
        }).catch(() => undefined)
      }

      for (const connection of peerConnectionsRef.current.values()) {
        connection.close()
      }
      peerConnectionStatesRef.current.clear()

      if (localStreamRef.current) {
        for (const track of localStreamRef.current.getTracks()) {
          track.stop()
        }
      }
    }
  }, [])

  const requestLocalMedia = async () => {
    setPermissionState('requesting')
    setConnectionHealth('preparing')
    setConnectionDetail('Solicitando permisos y preparando los dispositivos que elegiste.')

    const attempts = [
      {
        audio: buildMediaDeviceConstraint(selectedAudioInputId),
        video: buildMediaDeviceConstraint(selectedVideoInputId),
        note: null as string | null,
      },
      {
        audio: true,
        video: true,
        note:
          selectedAudioInputId || selectedVideoInputId
            ? 'Usamos tus dispositivos por defecto porque el seleccionado no respondió.'
            : null,
      },
      { audio: true, video: false, note: 'Entraste en modo audio porque la cámara no respondió.' },
      { audio: false, video: true, note: 'Entraste en modo solo video porque el micrófono no respondió.' },
    ]
    let lastError: Error | null = null

    for (const attempt of attempts) {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: attempt.audio,
          video: attempt.video,
        })
        const hasAudioTrack = mediaStream.getAudioTracks().length > 0
        const hasVideoTrack = mediaStream.getVideoTracks().length > 0
        const nextMicEnabled = hasAudioTrack ? callMicEnabled : false
        const nextCameraEnabled = hasVideoTrack ? callCameraEnabled : false

        for (const track of mediaStream.getAudioTracks()) {
          track.enabled = nextMicEnabled
        }

        for (const track of mediaStream.getVideoTracks()) {
          track.enabled = nextCameraEnabled
        }

        setCallMicAvailable(hasAudioTrack)
        setCallCameraAvailable(hasVideoTrack)
        setCallMicEnabled(nextMicEnabled)
        setCallCameraEnabled(nextCameraEnabled)
        setPermissionState(hasAudioTrack && hasVideoTrack ? 'granted' : 'limited')
        await refreshMediaDevices()

        return {
          mediaStream,
          note: attempt.note,
        }
      } catch (caughtError) {
        lastError =
          caughtError instanceof Error ? caughtError : new Error('No se pudo abrir cámara ni micrófono.')
      }
    }

    const feedback = getMediaPermissionFeedback(lastError)
    setPermissionState(feedback.permissionState)
    throw new Error(feedback.message)
  }

  const replaceLocalTrack = async (kind: 'audio' | 'video', deviceId: string) => {
    if (!localStreamRef.current) {
      return
    }

    const responseStream = await navigator.mediaDevices.getUserMedia({
      audio: kind === 'audio' ? (deviceId ? { deviceId: { exact: deviceId } } : true) : false,
      video: kind === 'video' ? (deviceId ? { deviceId: { exact: deviceId } } : true) : false,
    })
    const nextTrack = kind === 'audio' ? responseStream.getAudioTracks()[0] : responseStream.getVideoTracks()[0]

    if (!nextTrack) {
      throw new Error(kind === 'audio' ? 'No se pudo activar el micrófono elegido.' : 'No se pudo activar la cámara elegida.')
    }

    nextTrack.enabled = kind === 'audio' ? callMicEnabled : callCameraEnabled

    const currentStream = localStreamRef.current
    const previousTracks = kind === 'audio' ? currentStream.getAudioTracks() : currentStream.getVideoTracks()

    for (const track of previousTracks) {
      currentStream.removeTrack(track)
      track.stop()
    }

    currentStream.addTrack(nextTrack)

    for (const connection of peerConnectionsRef.current.values()) {
      const sender = connection.getSenders().find((candidate) => candidate.track?.kind === kind)

      if (sender) {
        await sender.replaceTrack(nextTrack)
      } else {
        connection.addTrack(nextTrack, currentStream)
      }
    }

    for (const track of responseStream.getTracks()) {
      if (track !== nextTrack) {
        track.stop()
      }
    }

    localStreamRef.current = currentStream
    setLocalPreviewStream(new MediaStream(currentStream.getTracks()))

    if (kind === 'audio') {
      setCallMicAvailable(true)
    } else {
      setCallCameraAvailable(true)
    }

    setPermissionState(
      derivePermissionState({
        microphonePermission: 'granted',
        cameraPermission: 'granted',
        audioInputCount: audioInputDevices.length,
        videoInputCount: videoInputDevices.length,
        hasActiveAudioTrack: currentStream.getAudioTracks().length > 0,
        hasActiveVideoTrack: currentStream.getVideoTracks().length > 0,
      })
    )
    await refreshMediaDevices()
  }

  const handleAudioInputChange = async (deviceId: string) => {
    setSelectedAudioInputId(deviceId)

    if (!isInCall || !localStreamRef.current) {
      return
    }

    setIsSwitchingDevices(true)
    setCallStatus('Cambiando micrófono en vivo...')
    setCallError(null)

    try {
      await replaceLocalTrack('audio', deviceId)
      await submitCallHeartbeat(callMicEnabled, callCameraEnabled)
      setCallStatus('Micrófono actualizado sin salir del stream.')
    } catch (caughtError) {
      const feedback = getMediaPermissionFeedback(caughtError)
      setPermissionState(feedback.permissionState)
      setCallError(feedback.message)
    } finally {
      setIsSwitchingDevices(false)
    }
  }

  const handleVideoInputChange = async (deviceId: string) => {
    setSelectedVideoInputId(deviceId)

    if (!isInCall || !localStreamRef.current) {
      return
    }

    setIsSwitchingDevices(true)
    setCallStatus('Cambiando cámara en vivo...')
    setCallError(null)

    try {
      await replaceLocalTrack('video', deviceId)
      await submitCallHeartbeat(callMicEnabled, callCameraEnabled)
      setCallStatus('Cámara actualizada sin salir del stream.')
    } catch (caughtError) {
      const feedback = getMediaPermissionFeedback(caughtError)
      setPermissionState(feedback.permissionState)
      setCallError(feedback.message)
    } finally {
      setIsSwitchingDevices(false)
    }
  }

  const joinCall = async () => {
    if (!activeStream) {
      return
    }

    setIsJoiningCall(true)
    setCallError(null)
    setCallStatus(null)
    setConnectionHealth('preparing')
    setConnectionDetail('Levantando cámara, micrófono y sesión WebRTC para este stream.')

    try {
      const rtcConfig = callConfigRef.current ?? (await loadCallConfig())

      if (!rtcConfig?.rtcEnabled) {
        throw new Error(rtcConfig?.note ?? 'La configuración WebRTC no está disponible todavía.')
      }

      const { mediaStream, note } = await requestLocalMedia()
      localStreamRef.current = mediaStream
      setLocalPreviewStream(mediaStream)

      const response = await fetch('/api/live/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamId: activeStream.id,
          microphoneEnabled: callMicEnabled,
          cameraEnabled: callCameraEnabled,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo entrar a la videollamada.')
      }

      const nextState = payload.state as LiveCallStateSnapshot
      setCallSnapshot(nextState)
      joinedStreamIdRef.current = activeStream.id
      participantIdRef.current = nextState.myParticipantId
      await reconcileCallPeers(nextState)
      await loadCallSignals()
      syncConnectionHealth(nextState)
      setCallStatus(note ?? 'Videollamada conectada. Comparte cámara y micrófono en tiempo real.')
    } catch (caughtError) {
      await cleanupCallRuntime(false, null)
      const feedback = getMediaPermissionFeedback(caughtError)
      setPermissionState(feedback.permissionState)
      setCallError(feedback.message)
      setConnectionHealth('disconnected')
      setConnectionDetail('La entrada al call falló. Ajusta dispositivos o reintenta la conexión.')
    } finally {
      setIsJoiningCall(false)
    }
  }

  const reconnectCall = async () => {
    if (!activeStream) {
      return
    }

    setCallError(null)
    setCallStatus('Reconectando la videollamada con tus dispositivos actuales...')
    setConnectionHealth('preparing')
    setConnectionDetail('Cerrando enlaces viejos para renegociar WebRTC de forma limpia.')

    if (isInCall) {
      await cleanupCallRuntime(true, null)
    }

    await refreshMediaDevices()
    await joinCall()
  }

  const leaveCall = async () => {
    setIsLeavingCall(true)
    setCallError(null)

    try {
      await cleanupCallRuntime(true, 'Saliste de la videollamada.')
    } catch (caughtError) {
      setCallError(caughtError instanceof Error ? caughtError.message : 'No se pudo salir de la videollamada.')
    } finally {
      setIsLeavingCall(false)
    }
  }

  const submitCallHeartbeat = async (nextMicEnabled: boolean, nextCameraEnabled: boolean) => {
    if (!joinedStreamIdRef.current || !participantIdRef.current) {
      return
    }

    try {
      const response = await fetch('/api/live/call/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamId: joinedStreamIdRef.current,
          participantId: participantIdRef.current,
          microphoneEnabled: nextMicEnabled,
          cameraEnabled: nextCameraEnabled,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo actualizar la videollamada.')
      }

      const nextState = payload.state as LiveCallStateSnapshot
      setCallSnapshot(nextState)
      participantIdRef.current = nextState.myParticipantId
      await reconcileCallPeers(nextState)
      syncConnectionHealth(nextState)
    } catch (caughtError) {
      setCallError(caughtError instanceof Error ? caughtError.message : 'No se pudo actualizar la videollamada.')
      setConnectionHealth('degraded')
    }
  }

  const toggleMicrophone = async () => {
    if (!callMicAvailable) {
      return
    }

    const nextMicEnabled = !callMicEnabled
    setCallMicEnabled(nextMicEnabled)

    if (!isInCall) {
      setCallStatus(nextMicEnabled ? 'Entrarás con el micrófono listo.' : 'Entrarás con el micrófono silenciado.')
      return
    }

    for (const track of localStreamRef.current?.getAudioTracks() ?? []) {
      track.enabled = nextMicEnabled
    }

    await submitCallHeartbeat(nextMicEnabled, callCameraEnabled)
  }

  const toggleCamera = async () => {
    if (!callCameraAvailable) {
      return
    }

    const nextCameraEnabled = !callCameraEnabled
    setCallCameraEnabled(nextCameraEnabled)

    if (!isInCall) {
      setCallStatus(nextCameraEnabled ? 'Entrarás con la cámara lista.' : 'Entrarás con la cámara apagada.')
      return
    }

    for (const track of localStreamRef.current?.getVideoTracks() ?? []) {
      track.enabled = nextCameraEnabled
    }

    await submitCallHeartbeat(callMicEnabled, nextCameraEnabled)
  }

  const submitChat = async () => {
    if (!activeStream || !chatMessage.trim()) {
      return
    }

    setIsSendingChat(true)
    setStatus(null)
    setError(null)

    try {
      const response = await fetch('/api/live/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamId: activeStream.id,
          content: chatMessage,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo enviar el mensaje.')
      }

      setChatMessage('')
      await loadSnapshot(activeStream.id)
      setStatus('Mensaje enviado al chat del directo.')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo enviar el mensaje.')
    } finally {
      setIsSendingChat(false)
    }
  }

  const sendGift = async (gift: LiveGiftOptionSnapshot) => {
    if (!activeStream || !gift.canSend) {
      return
    }

    setPendingGiftId(gift.id)
    setStatus(null)
    setError(null)

    try {
      const response = await fetch('/api/live/gifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamId: activeStream.id,
          itemId: gift.id,
          quantity: 1,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo enviar el regalo.')
      }

      await loadSnapshot(activeStream.id)
      setStatus(`${gift.name} enviado al directo.`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo enviar el regalo.')
    } finally {
      setPendingGiftId(null)
    }
  }

  const activeCallParticipants = callSnapshot && callSnapshot.streamId === activeStream?.id ? callSnapshot.participants : []
  const localCallParticipant = activeCallParticipants.find((participant) => participant.isMe) ?? null
  const remoteCallParticipants = activeCallParticipants.filter((participant) => !participant.isMe)
  const isInCall = Boolean(localCallParticipant)
  const connectedRemoteParticipants = remoteCallParticipants.filter((participant) =>
    remoteStreams.some((entry) => entry.participantId === participant.id)
  ).length
  const liveCallNote = callSnapshot?.note ?? callConfig?.note ?? 'Únete a la videollamada del stream para compartir cámara y micrófono reales en local.'
  const connectionMeta = getConnectionHealthMeta(connectionHealth)
  const permissionMeta = getPermissionStateMeta(permissionState)
  const PermissionIcon = permissionMeta.icon

  if (isLoading && !snapshot) {
    return (
      <section className="surface-panel rounded-[1.8rem] p-6 lg:p-8">
        <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">REY30VERSE LIVE CORE</p>
        <h3 className="mt-3 text-3xl font-semibold text-white">Levantando streaming y comunidad</h3>
        <p className="mt-2 text-zinc-400">Sincronizando streams, chat, clips y regalos desde Prisma.</p>
      </section>
    )
  }

  if (!activeStream || !snapshot) {
    return (
      <section className="surface-panel rounded-[1.8rem] p-6 lg:p-8">
        <h3 className="text-3xl font-semibold text-white">Modulo en vivo no disponible</h3>
        <p className="mt-2 text-zinc-400">{error ?? 'Aun no hay streams activos para mostrar.'}</p>
        <Button
          onClick={() => void loadSnapshot(undefined, true)}
          className="mt-5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 text-white hover:opacity-90"
        >
          Reintentar
        </Button>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.34fr_0.94fr]">
        <section className="surface-panel rounded-[1.8rem] p-4 sm:p-5 lg:p-6">
          <div className="relative overflow-hidden rounded-[1.7rem] border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.14] via-fuchsia-500/[0.16] to-cyan-500/[0.12] p-4 sm:p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(255,255,255,0.15),transparent_28%),linear-gradient(135deg,rgba(10,8,22,0.65),rgba(7,17,30,0.88))]" />
            <div className="relative z-10 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge className="border-0 bg-red-500 text-white">
                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-white" />
                    EN VIVO
                  </Badge>
                  <Badge className="border-0 bg-black/25 text-zinc-100">
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    {activeStream.viewers.toLocaleString()}
                  </Badge>
                  <Badge className="border-0 bg-black/25 text-zinc-100">
                    <Sparkles className="mr-1 h-3.5 w-3.5 text-fuchsia-300" />
                    {activeStream.likes.toLocaleString()}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMuted((current) => !current)}
                    className="rounded-full border border-white/10 bg-white/[0.08] text-zinc-100 hover:bg-white/[0.12]"
                  >
                    {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full border border-white/10 bg-white/[0.08] text-zinc-100 hover:bg-white/[0.12]"
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[1.5rem] border border-white/[0.08] bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(180deg,rgba(255,83,217,0.12),rgba(12,10,24,0.3))] p-3">
                  {isInCall && localCallParticipant ? (
                    <div className={cn('grid gap-3', remoteCallParticipants.length ? 'xl:grid-cols-2' : 'grid-cols-1')}>
                      <ParticipantVideoTile participant={localCallParticipant} stream={localPreviewStream} muted />
                      {remoteCallParticipants.map((participant) => (
                        <ParticipantVideoTile
                          key={participant.id}
                          participant={participant}
                          stream={remoteStreams.find((entry) => entry.participantId === participant.id)?.stream ?? null}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex min-h-[18rem] items-center justify-center p-6 md:min-h-[24rem]">
                      <div className="text-center">
                        <Avatar className="mx-auto h-24 w-24 border-4 border-violet-400/25">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activeStream.streamer.avatar}`} />
                          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-3xl text-white">
                            {activeStream.streamer.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <p className="mt-4 text-2xl font-semibold text-white">{activeStream.streamer.name}</p>
                        <p className="mt-2 max-w-xl text-zinc-300">{activeStream.title}</p>
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                          {activeStream.tags.map((tag) => (
                            <Badge key={tag} className="border-0 bg-white/[0.08] text-zinc-100">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-[1.35rem] border border-cyan-400/15 bg-black/25 p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/70">WebRTC live call</p>
                      <h4 className="mt-2 text-xl font-semibold text-white">
                        {activeCallParticipants.length} participante{activeCallParticipants.length === 1 ? '' : 's'}
                      </h4>
                      <p className="mt-1 text-sm text-zinc-300">{liveCallNote}</p>
                      <p className="mt-2 text-sm text-zinc-400">{connectionDetail ?? 'Listo para conectar audio y video.'}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {callConfig ? (
                        <Badge
                          className={cn(
                            'border-0',
                            callConfig.hasTurnServer ? 'bg-emerald-500/15 text-emerald-100' : 'bg-amber-500/15 text-amber-100'
                          )}
                        >
                          {callConfig.hasTurnServer ? 'TURN + STUN' : 'Solo STUN'}
                        </Badge>
                      ) : null}
                      <Badge className={cn('border-0', connectionMeta.className)}>{connectionMeta.label}</Badge>
                      <Badge className={cn('border-0', permissionMeta.className)}>
                        <PermissionIcon className="mr-1.5 h-3.5 w-3.5" />
                        {permissionMeta.label}
                      </Badge>
                      {!isInCall ? (
                        <>
                          <Button
                            variant="ghost"
                            onClick={() => void toggleMicrophone()}
                            disabled={!callMicAvailable}
                            className="rounded-full border border-white/10 bg-white/[0.08] text-zinc-100 hover:bg-white/[0.12] disabled:opacity-50"
                          >
                            {callMicEnabled ? <Mic className="mr-2 h-4 w-4" /> : <MicOff className="mr-2 h-4 w-4" />}
                            {callMicEnabled ? 'Entrar con mic' : 'Entrar muteado'}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => void toggleCamera()}
                            disabled={!callCameraAvailable}
                            className="rounded-full border border-white/10 bg-white/[0.08] text-zinc-100 hover:bg-white/[0.12] disabled:opacity-50"
                          >
                            {callCameraEnabled ? <Video className="mr-2 h-4 w-4" /> : <VideoOff className="mr-2 h-4 w-4" />}
                            {callCameraEnabled ? 'Entrar con cámara' : 'Entrar sin cámara'}
                          </Button>
                          <Button
                            onClick={() => void joinCall()}
                            disabled={isJoiningCall || callConfig?.rtcEnabled === false}
                            className="rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 text-white hover:opacity-90"
                          >
                            <Radio className="mr-2 h-4 w-4" />
                            {isJoiningCall ? 'Conectando...' : 'Entrar a videollamada'}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            onClick={() => void toggleMicrophone()}
                            disabled={!callMicAvailable}
                            className="rounded-full border border-white/10 bg-white/[0.08] text-zinc-100 hover:bg-white/[0.12] disabled:opacity-50"
                          >
                            {callMicEnabled ? <Mic className="mr-2 h-4 w-4" /> : <MicOff className="mr-2 h-4 w-4" />}
                            {callMicEnabled ? 'Mic encendido' : 'Mic apagado'}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => void toggleCamera()}
                            disabled={!callCameraAvailable}
                            className="rounded-full border border-white/10 bg-white/[0.08] text-zinc-100 hover:bg-white/[0.12] disabled:opacity-50"
                          >
                            {callCameraEnabled ? <Video className="mr-2 h-4 w-4" /> : <VideoOff className="mr-2 h-4 w-4" />}
                            {callCameraEnabled ? 'Cam activa' : 'Cam apagada'}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => void reconnectCall()}
                            disabled={isJoiningCall || isLeavingCall || isSwitchingDevices}
                            className="rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15 disabled:opacity-50"
                          >
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Reconectar
                          </Button>
                          <Button
                            onClick={() => void leaveCall()}
                            disabled={isLeavingCall}
                            className="rounded-full bg-rose-500/90 text-white hover:bg-rose-500"
                          >
                            <PhoneOff className="mr-2 h-4 w-4" />
                            {isLeavingCall ? 'Saliendo...' : 'Salir'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_1fr_auto]">
                    <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Micrófono</p>
                        <Badge className={cn('border-0', callMicAvailable ? 'bg-emerald-500/15 text-emerald-100' : 'bg-rose-500/15 text-rose-100')}>
                          {callMicAvailable ? `${audioInputDevices.length || 1} listo${audioInputDevices.length === 1 ? '' : 's'}` : 'No detectado'}
                        </Badge>
                      </div>
                      <Select
                        value={selectedAudioInputId || undefined}
                        onValueChange={(value) => void handleAudioInputChange(value)}
                        disabled={!audioInputDevices.length || isJoiningCall || isSwitchingDevices}
                      >
                        <SelectTrigger className="mt-3 w-full rounded-xl border-white/10 bg-black/20 text-zinc-100">
                          <SelectValue placeholder="Selecciona un micrófono" />
                        </SelectTrigger>
                        <SelectContent className="border-white/10 bg-[#120f1d] text-zinc-100">
                          {audioInputDevices.map((device) => (
                            <SelectItem key={device.id} value={device.id}>
                              {device.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="mt-2 text-xs text-zinc-500">
                        {isInCall
                          ? 'Cambiar el micrófono aquí reemplaza el sender WebRTC sin salir del stream.'
                          : 'El micrófono que elijas se usará cuando entres al call.'}
                      </p>
                    </div>

                    <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Cámara</p>
                        <Badge className={cn('border-0', callCameraAvailable ? 'bg-emerald-500/15 text-emerald-100' : 'bg-rose-500/15 text-rose-100')}>
                          {callCameraAvailable ? `${videoInputDevices.length || 1} lista${videoInputDevices.length === 1 ? '' : 's'}` : 'No detectada'}
                        </Badge>
                      </div>
                      <Select
                        value={selectedVideoInputId || undefined}
                        onValueChange={(value) => void handleVideoInputChange(value)}
                        disabled={!videoInputDevices.length || isJoiningCall || isSwitchingDevices}
                      >
                        <SelectTrigger className="mt-3 w-full rounded-xl border-white/10 bg-black/20 text-zinc-100">
                          <SelectValue placeholder="Selecciona una cámara" />
                        </SelectTrigger>
                        <SelectContent className="border-white/10 bg-[#120f1d] text-zinc-100">
                          {videoInputDevices.map((device) => (
                            <SelectItem key={device.id} value={device.id}>
                              {device.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="mt-2 text-xs text-zinc-500">
                        {isInCall
                          ? 'La cámara puede cambiarse en caliente mientras mantienes esta misma sesión.'
                          : 'La cámara elegida se prepara antes de crear la sesión WebRTC.'}
                      </p>
                    </div>

                    <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] p-3 xl:min-w-[13rem]">
                      <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Herramientas</p>
                      <div className="mt-3 space-y-2">
                        <Button
                          variant="ghost"
                          onClick={() => void refreshMediaDevices()}
                          disabled={isRefreshingDevices || isJoiningCall || isSwitchingDevices}
                          className="w-full justify-start rounded-xl border border-white/10 bg-white/[0.06] text-zinc-100 hover:bg-white/[0.1] disabled:opacity-50"
                        >
                          <RefreshCcw className="mr-2 h-4 w-4" />
                          {isRefreshingDevices ? 'Buscando dispositivos...' : 'Revisar dispositivos'}
                        </Button>
                        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-300">
                          {isInCall
                            ? `${connectedRemoteParticipants}/${remoteCallParticipants.length} enlace${remoteCallParticipants.length === 1 ? '' : 's'} remoto${remoteCallParticipants.length === 1 ? '' : 's'} con media activa`
                            : 'Prepara audio y video antes de entrar al call.'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {activeCallParticipants.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {activeCallParticipants.map((participant) => (
                        <Badge key={participant.id} className="border-0 bg-white/[0.08] text-zinc-100">
                          {participant.displayName}
                          {' · '}
                          {participant.stateLabel}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  {callStatus ? <p className="mt-3 text-sm text-emerald-300">{callStatus}</p> : null}
                  {callError ? <p className="mt-3 text-sm text-rose-300">{callError}</p> : null}
                </div>
              </div>

              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-violet-400/20">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activeStream.streamer.avatar}`} />
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                      {activeStream.streamer.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{activeStream.streamer.name}</p>
                      {activeStream.streamer.isVerified ? <Star className="h-4 w-4 fill-amber-300 text-amber-300" /> : null}
                    </div>
                    <p className="text-sm text-zinc-400">{activeStream.statusLine}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => void loadSnapshot(activeStream.id)}
                    className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Refrescar stream
                  </Button>
                  <Badge className="border-0 bg-violet-500/12 px-4 py-2 text-violet-100">
                    <Users className="mr-2 h-4 w-4" />
                    {activeStream.streamer.followers.toLocaleString()} seguidores
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
            <Card className="border-white/[0.08] bg-white/[0.04] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Creator panel</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">{snapshot.creator?.displayName ?? activeStream.streamer.name}</h3>
                </div>
                <Radio className="h-5 w-5 text-fuchsia-300" />
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/20 p-4">
                  <p className="text-sm text-violet-200">{snapshot.creator?.username}</p>
                  <p className="mt-1 text-sm text-zinc-300">{snapshot.creator?.roleLine}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[1.2rem] border border-white/[0.08] bg-white/[0.04] p-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.24em] text-zinc-500">Seguidores</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{snapshot.creator?.followers ?? activeStream.streamer.followers.toLocaleString()}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/[0.08] bg-white/[0.04] p-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.24em] text-zinc-500">Nivel</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{snapshot.creator?.level ?? `Nv. ${activeStream.streamer.level}`}</p>
                  </div>
                </div>
                <div className="rounded-[1.2rem] border border-fuchsia-400/15 bg-fuchsia-500/[0.08] p-4">
                  <p className="text-sm font-medium text-white">{snapshot.creator?.goalLabel}</p>
                  <p className="mt-1 text-sm text-fuchsia-200">{snapshot.creator?.goalProgress}</p>
                  <div className="mt-3 h-2 rounded-full bg-white/[0.08]">
                    <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
                  </div>
                  <p className="mt-3 text-sm text-zinc-300">{snapshot.creator?.highlightNote}</p>
                </div>
              </div>
            </Card>

            <Card className="border-white/[0.08] bg-white/[0.04] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Clips</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">Momentos del creador</h3>
                </div>
                <Clapperboard className="h-5 w-5 text-cyan-300" />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {snapshot.clips.length ? (
                  snapshot.clips.map((clip) => (
                    <div
                      key={clip.id}
                      className={cn(
                        'rounded-[1.3rem] border border-white/[0.08] bg-gradient-to-br p-4',
                        clip.accent
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <Badge className="border-0 bg-black/25 text-zinc-100">{clip.duration}</Badge>
                        <span className="text-xs text-zinc-300">{clip.viewsLabel}</span>
                      </div>
                      <p className="mt-8 text-base font-semibold text-white">{clip.title}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.2rem] border border-dashed border-white/[0.08] p-5 text-sm text-zinc-400 sm:col-span-2">
                    Este creador todavía no tiene clips destacados en la base local.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="surface-panel rounded-[1.75rem] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Chat overlay</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Comunidad en vivo</h3>
              </div>
              <Badge className="border-0 bg-cyan-500/20 text-cyan-100">
                {activeStream.comments.toLocaleString()} msgs
              </Badge>
            </div>

            <ScrollArea className="mt-4 h-[20rem] rounded-[1.2rem] border border-white/[0.08] bg-black/20 p-4">
              <div className="space-y-3">
                {snapshot.chatMessages.length ? (
                  snapshot.chatMessages.map((message) => (
                    <div key={message.id} className="rounded-[1rem] border border-white/[0.06] bg-white/[0.04] px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className={cn('text-sm font-medium', message.color)}>{message.user}</span>
                        <span className="text-xs text-zinc-500">{message.timestamp}</span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-200">{message.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1rem] border border-dashed border-white/[0.08] px-4 py-6 text-sm text-zinc-400">
                    El chat del directo aún está vacío.
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="mt-4 flex gap-2">
              <Input
                value={chatMessage}
                onChange={(event) => setChatMessage(event.target.value)}
                placeholder="Escribe para el chat del stream..."
                className="h-11 rounded-full border-violet-400/10 bg-black/20 text-white placeholder:text-zinc-500"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void submitChat()
                  }
                }}
              />
              <Button
                onClick={() => void submitChat()}
                disabled={isSendingChat || !chatMessage.trim()}
                className="h-11 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 text-white hover:opacity-90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {status ? <p className="mt-3 text-sm text-emerald-300">{status}</p> : null}
            {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
          </section>

          <section className="surface-panel rounded-[1.75rem] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Gifts</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Impulsar directo</h3>
              </div>
              <Flame className="h-5 w-5 text-amber-300" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[1rem] border border-amber-400/15 bg-amber-500/10 px-4 py-3">
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-amber-200/80">Coins</p>
                <p className="mt-2 text-xl font-semibold text-white">{snapshot.wallet.coins}</p>
              </div>
              <div className="rounded-[1rem] border border-cyan-400/15 bg-cyan-500/10 px-4 py-3">
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-cyan-100/80">Gems</p>
                <p className="mt-2 text-xl font-semibold text-white">{snapshot.wallet.gems}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {snapshot.giftOptions.map((gift) => (
                <button
                  key={gift.id}
                  onClick={() => void sendGift(gift)}
                  disabled={pendingGiftId !== null || !gift.canSend}
                  className={cn(
                    'rounded-[1.2rem] border p-4 text-left transition disabled:opacity-60',
                    gift.canSend
                      ? 'border-white/[0.08] bg-white/[0.04] hover:border-violet-400/30 hover:bg-violet-500/[0.08]'
                      : 'border-rose-400/15 bg-rose-500/[0.06]'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <GiftGlyph image={gift.image} />
                    <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      {gift.currency}
                    </span>
                  </div>
                  <p className="mt-4 font-semibold text-white">{gift.name}</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {gift.price} {gift.currency}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">{gift.helperText}</p>
                  {pendingGiftId === gift.id ? (
                    <p className="mt-2 text-xs text-violet-200">Enviando...</p>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {snapshot.gifts.length ? (
                snapshot.gifts.map((gift) => (
                  <div key={gift.id} className="rounded-[1rem] border border-white/[0.08] bg-black/20 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06]">
                          <GiftGlyph image={gift.image} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {gift.senderName} envió {gift.itemName}
                          </p>
                          <p className="text-xs text-zinc-500">
                            x{gift.quantity} • {gift.valueLabel}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-500">{gift.createdAt}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1rem] border border-dashed border-white/[0.08] px-4 py-6 text-sm text-zinc-400">
                  Todavía no hay regalos enviados en este directo.
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      <section className="surface-panel rounded-[1.8rem] p-5 lg:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Descubrir</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Streams activos</h3>
          </div>
          <Badge className="border-0 bg-red-500/15 text-red-200">
            {snapshot.streams.filter((stream) => stream.isLive).length} activos
          </Badge>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          {snapshot.streams.map((stream) => (
            <StreamCard
              key={stream.id}
              stream={stream}
              isActive={stream.id === activeStream.id}
              onSelect={() => setSelectedStreamId(stream.id)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
