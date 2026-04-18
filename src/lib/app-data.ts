import {
  CurrencyType,
  DeckApplyScope,
  ItemRarity,
  MarketplaceItemType,
  PresenceState,
  RoomStatus,
  RoomType,
  RoomVisibility,
  StreamStatus,
} from '@prisma/client'
import { AuthRequiredError, requireAuthSession } from '@/lib/auth'
import { resolveCardVisualOverride } from '@/lib/card-style-resolver'
import { db } from '@/lib/db'
import { deckModules } from '@/lib/game-engine'
import { getRoomGameMode } from '@/lib/game-mode-utils'
import { hashPassword } from '@/lib/passwords'
import { deleteStoredAsset, persistCardLabAsset, persistFeedAsset } from '@/lib/storage'
import type {
  AppSnapshot,
  CardCustomizationSnapshot,
  CardVisualOverrideEntrySnapshot,
  ChatMessageSnapshot,
  ChatSnapshot,
  CreateRoomPayload,
  DashboardSnapshot,
  DashboardStory,
  FeedCommentSnapshot,
  FeedMediaSnapshot,
  FeedPostSnapshot,
  FeedSnapshot,
  GameCardSnapshot,
  GameRoomSnapshot,
  LiveSnapshot,
  LobbySnapshot,
  MarketplaceSnapshot,
  ProfileSnapshot,
  ShellSnapshot,
} from '@/lib/app-types'
import { randomInt } from 'node:crypto'
import { basename, extname } from 'node:path'
import sharp from 'sharp'
import { isRuntimeSeedEnabled } from '@/lib/runtime-config'

const CURRENT_USER_HANDLE = 'alexrey30'
const DEMO_PASSWORD = 'rey30demo'
const ACTIVE_PRESENCE_WINDOW_MS = 75_000
const DATABASE_SCHEMA = process.env.REY30_DATABASE_SCHEMA?.trim() || 'rey30verse'
const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const SEED_USER_ID_PREFIX = 'seed-user-'

const STORY_ACCENTS = [
  'from-fuchsia-500 to-violet-500',
  'from-cyan-500 to-sky-500',
  'from-pink-500 to-rose-500',
  'from-violet-500 to-indigo-500',
  'from-amber-400 to-orange-500',
]

const CHAT_ACCENTS = [
  'text-cyan-300',
  'text-fuchsia-300',
  'text-violet-300',
  'text-amber-300',
  'text-cyan-300',
]

const LIVE_CHAT_COLORS = [
  'text-cyan-400',
  'text-pink-400',
  'text-purple-400',
  'text-yellow-400',
  'text-green-400',
  'text-orange-400',
]

const LIVE_CLIP_ACCENTS = [
  'from-violet-500/30 to-fuchsia-500/20',
  'from-cyan-500/30 to-sky-500/20',
  'from-amber-400/30 to-orange-500/20',
  'from-emerald-500/30 to-cyan-500/20',
]

const userSeeds = [
  {
    key: 'alex',
    email: 'alex@rey30verse.gg',
    handle: 'alexrey30',
    name: 'AlexRey30',
    avatarSeed: 'alexrey30',
    profile: {
      displayName: 'AlexRey30',
      username: 'rey30verse',
      roleLine: 'Founder • Streamer • Designer',
      bio: 'Construyendo una red social gaming modular con enfoque en cartas, streaming competitivo y experiencias premium.',
      tagline: 'Donde el juego se vuelve comunidad.',
      level: 42,
      wins: 1248,
      followers: 25800,
      following: 1200,
      loves: 345000,
      points: 12450,
      gems: 250,
      elo: 2350,
      rankLabel: 'Top 12',
      currentStatus: 'estado premium',
      highlightLabel: 'Sesion destacada',
      highlightCopy: 'Roadmap visual en progreso',
      achievements: ['🏆', '⭐', '💎', '🔥', '👑', '🎮', '💜', '🎯'],
      collection: [
        { symbol: '♠', label: 'Spades' },
        { symbol: '♥', label: 'Corazones' },
        { symbol: '♦', label: 'Diamonds' },
        { symbol: '♣', label: 'Clubs' },
      ],
      roadmap: [
        'Lanzar multiplayer en tiempo real.',
        'Integrar gifts animados dentro del stream.',
        'Publicar card editor con persistencia en backend.',
      ],
    },
  },
  {
    key: 'mia',
    email: 'mia@rey30verse.gg',
    handle: 'miagamer',
    name: 'MiaGamer',
    avatarSeed: 'miagamer',
    profile: {
      displayName: 'MiaGamer',
      username: 'miagamer',
      roleLine: 'Streamer • Shotcaller',
      bio: 'Compitiendo en mesas premium y activando la comunidad en vivo.',
      tagline: 'Siempre lista para el siguiente clutch.',
      level: 39,
      wins: 968,
      followers: 18400,
      following: 540,
      loves: 221000,
      points: 9800,
      gems: 140,
      elo: 2190,
      rankLabel: 'Top 40',
      currentStatus: 'streaming now',
      highlightLabel: 'Live focus',
      highlightCopy: 'Top del torneo en progreso',
      achievements: ['🔥', '🎮', '💜'],
      collection: [
        { symbol: 'Q', label: 'Queen' },
        { symbol: 'J', label: 'Jack' },
      ],
      roadmap: ['Cerrar torneo del finde.', 'Subir highlights a la portada.'],
    },
  },
  {
    key: 'luna',
    email: 'luna@rey30verse.gg',
    handle: 'lunagamer',
    name: 'LunaGamer',
    avatarSeed: 'lunagamer',
    profile: {
      displayName: 'LunaGamer',
      username: 'lunagamer',
      roleLine: 'Caster • Creator',
      bio: 'Narrando cada ronda y llevando el chat al maximo.',
      tagline: 'En vivo casi todos los dias.',
      level: 58,
      wins: 1420,
      followers: 12500,
      following: 320,
      loves: 187000,
      points: 10300,
      gems: 160,
      elo: 2288,
      rankLabel: 'Top 20',
      currentStatus: 'gran final activa',
      highlightLabel: 'Stream principal',
      highlightCopy: 'Gran final en progreso',
      achievements: ['🎙️', '⭐', '💜'],
      collection: [{ symbol: 'A', label: 'Ace' }],
      roadmap: ['Producir directo semanal.'],
    },
  },
  {
    key: 'charlie',
    email: 'charlie@rey30verse.gg',
    handle: 'charlie',
    name: 'Charlie',
    avatarSeed: 'charlie',
    profile: {
      displayName: 'Charlie',
      username: 'charlie',
      roleLine: 'Jugador de sala',
      bio: 'Siempre listo para entrar a una mesa nueva.',
      tagline: 'Buena suerte a todos.',
      level: 27,
      wins: 344,
      followers: 3200,
      following: 290,
      loves: 12000,
      points: 4100,
      gems: 40,
      elo: 1820,
      rankLabel: 'Top 200',
      currentStatus: 'en sala',
      highlightLabel: 'Mesa abierta',
      highlightCopy: 'Entrando en 5 minutos',
      achievements: ['🎯'],
      collection: [{ symbol: '10', label: 'Ten' }],
      roadmap: ['Practicar ranked.'],
    },
  },
  {
    key: 'samurai',
    email: 'samurai@rey30verse.gg',
    handle: 'samuraiq',
    name: 'SamuraiQ',
    avatarSeed: 'samuraiq',
    profile: {
      displayName: 'SamuraiQ',
      username: 'samuraiq',
      roleLine: 'Competidor tactico',
      bio: 'Especialista en control de mesa y cierres limpios.',
      tagline: 'No regalo turnos.',
      level: 44,
      wins: 1118,
      followers: 8700,
      following: 210,
      loves: 54000,
      points: 8700,
      gems: 120,
      elo: 2330,
      rankLabel: 'Top 30',
      currentStatus: 'duelo activo',
      highlightLabel: 'Ranked sprint',
      highlightCopy: 'Subiendo elo',
      achievements: ['⚔️', '🔥'],
      collection: [{ symbol: 'K', label: 'King' }],
      roadmap: ['Mantener racha de victorias.'],
    },
  },
  {
    key: 'cyber',
    email: 'cyber@rey30verse.gg',
    handle: 'cyberqueen',
    name: 'CyberQueen',
    avatarSeed: 'cyberqueen',
    profile: {
      displayName: 'CyberQueen',
      username: 'cyberqueen',
      roleLine: 'Tournament host',
      bio: 'Liderando brackets y torneos especiales.',
      tagline: 'Nos vemos en la final.',
      level: 67,
      wins: 1822,
      followers: 45000,
      following: 160,
      loves: 402000,
      points: 18800,
      gems: 420,
      elo: 2490,
      rankLabel: 'Top 8',
      currentStatus: 'torneo abierto',
      highlightLabel: 'Bracket update',
      highlightCopy: 'Semifinales confirmadas',
      achievements: ['👑', '🏆'],
      collection: [{ symbol: 'A', label: 'Ace' }],
      roadmap: ['Abrir clasificatoria nueva.'],
    },
  },
  {
    key: 'dark',
    email: 'dark@rey30verse.gg',
    handle: 'darkknightx',
    name: 'DarkKnight_X',
    avatarSeed: 'darkknightx',
    profile: {
      displayName: 'DarkKnight_X',
      username: 'darkknightx',
      roleLine: 'Ranked grinder',
      bio: 'Subiendo en ladder y revisando cada jugada.',
      tagline: 'GG y siguiente.',
      level: 42,
      wins: 980,
      followers: 8900,
      following: 410,
      loves: 84000,
      points: 9300,
      gems: 130,
      elo: 2250,
      rankLabel: 'Top 45',
      currentStatus: 'ranked activa',
      highlightLabel: 'Meta report',
      highlightCopy: 'Subiendo a master',
      achievements: ['🛡️', '🔥'],
      collection: [{ symbol: 'Q', label: 'Queen' }],
      roadmap: ['Cerrar sesion de ranked.'],
    },
  },
  {
    key: 'neon',
    email: 'neon@rey30verse.gg',
    handle: 'neonplayer',
    name: 'NeonPlayer',
    avatarSeed: 'neonplayer',
    profile: {
      displayName: 'NeonPlayer',
      username: 'neonplayer',
      roleLine: 'New wave creator',
      bio: 'Explorando estilos nuevos de baraja y tutoriales.',
      tagline: 'Siempre probando algo nuevo.',
      level: 35,
      wins: 610,
      followers: 3200,
      following: 620,
      loves: 24000,
      points: 5600,
      gems: 80,
      elo: 1970,
      rankLabel: 'Top 130',
      currentStatus: 'tutorial en vivo',
      highlightLabel: 'Creator push',
      highlightCopy: 'Nuevo deck drop',
      achievements: ['✨'],
      collection: [{ symbol: '9', label: 'Nine' }],
      roadmap: ['Publicar nuevo tutorial.'],
    },
  },
  {
    key: 'ace',
    email: 'ace@rey30verse.gg',
    handle: 'aceplayer',
    name: 'AcePlayer',
    avatarSeed: 'aceplayer',
    profile: {
      displayName: 'AcePlayer',
      username: 'aceplayer',
      roleLine: 'Ranked specialist',
      bio: 'Siempre en la parte alta de la tabla.',
      tagline: 'Meta first.',
      level: 89,
      wins: 3012,
      followers: 52000,
      following: 130,
      loves: 480000,
      points: 24000,
      gems: 510,
      elo: 2710,
      rankLabel: 'Top 3',
      currentStatus: 'ranked locked',
      highlightLabel: 'Top ladder',
      highlightCopy: 'Defendiendo puesto',
      achievements: ['🥇', '👑'],
      collection: [{ symbol: 'A', label: 'Ace' }],
      roadmap: ['Mantener top 3.'],
    },
  },
  {
    key: 'rex',
    email: 'rex@rey30verse.gg',
    handle: 'rex',
    name: 'Rex',
    avatarSeed: 'rex',
    profile: {
      displayName: 'Rex',
      username: 'rex',
      roleLine: 'Social squad',
      bio: 'Impulsando grupos y salas casuales.',
      tagline: 'Siempre hay gente para jugar.',
      level: 25,
      wins: 220,
      followers: 1800,
      following: 450,
      loves: 9000,
      points: 2800,
      gems: 20,
      elo: 1540,
      rankLabel: 'Top 500',
      currentStatus: 'social hub',
      highlightLabel: 'Group pulse',
      highlightCopy: 'Sala abierta',
      achievements: ['💬'],
      collection: [{ symbol: '7', label: 'Seven' }],
      roadmap: ['Activar grupo nuevo.'],
    },
  },
  {
    key: 'nova',
    email: 'nova@rey30verse.gg',
    handle: 'nova',
    name: 'Nova',
    avatarSeed: 'nova',
    profile: {
      displayName: 'Nova',
      username: 'nova',
      roleLine: 'Visual curator',
      bio: 'Curando decks y estilos para la comunidad.',
      tagline: 'Todo entra por los ojos.',
      level: 31,
      wins: 410,
      followers: 4200,
      following: 280,
      loves: 19000,
      points: 4600,
      gems: 66,
      elo: 1710,
      rankLabel: 'Top 260',
      currentStatus: 'card lab',
      highlightLabel: 'Style drop',
      highlightCopy: 'Nuevos templates',
      achievements: ['🎨'],
      collection: [{ symbol: 'J', label: 'Jack' }],
      roadmap: ['Publicar set aurora.'],
    },
  },
  {
    key: 'kira',
    email: 'kira@rey30verse.gg',
    handle: 'kira',
    name: 'Kira',
    avatarSeed: 'kira',
    profile: {
      displayName: 'Kira',
      username: 'kira',
      roleLine: 'Night lobby',
      bio: 'Moviendo salas nocturnas y grupos cerrados.',
      tagline: 'La noche empieza en el hub.',
      level: 29,
      wins: 350,
      followers: 2600,
      following: 350,
      loves: 14000,
      points: 3900,
      gems: 50,
      elo: 1625,
      rankLabel: 'Top 340',
      currentStatus: 'night squad',
      highlightLabel: 'Night room',
      highlightCopy: 'Sala online',
      achievements: ['🌙'],
      collection: [{ symbol: '8', label: 'Eight' }],
      roadmap: ['Escalar salas privadas.'],
    },
  },
  {
    key: 'axel',
    email: 'axel@rey30verse.gg',
    handle: 'axel',
    name: 'Axel',
    avatarSeed: 'axel',
    profile: {
      displayName: 'Axel',
      username: 'axel',
      roleLine: 'Addons scout',
      bio: 'Siempre cazando nuevas mejoras visuales.',
      tagline: 'Addon nuevo, lobby nuevo.',
      level: 33,
      wins: 470,
      followers: 3100,
      following: 180,
      loves: 15000,
      points: 5100,
      gems: 72,
      elo: 1760,
      rankLabel: 'Top 240',
      currentStatus: 'addons listos',
      highlightLabel: 'Addon radar',
      highlightCopy: 'Paquete premium detectado',
      achievements: ['⚙️'],
      collection: [{ symbol: 'K', label: 'King' }],
      roadmap: ['Publicar pack arcade.'],
    },
  },
] as const

const timelineSeeds = [
  'Completar lobby competitivo',
  'Pulir chat y regalos en vivo',
  'Cerrar editor de cartas',
] as const

const deckStyleSeeds = [
  { key: 'neon', name: 'Neon', gradientFrom: 'from-purple-500', gradientTo: 'to-cyan-500', featured: true },
  { key: 'anime', name: 'Anime', gradientFrom: 'from-pink-500', gradientTo: 'to-purple-500', featured: false },
  { key: 'cosmic', name: 'Cosmico', gradientFrom: 'from-blue-500', gradientTo: 'to-purple-500', featured: true },
  { key: 'minimal', name: 'Minimal', gradientFrom: 'from-zinc-600', gradientTo: 'to-zinc-400', featured: false },
  { key: 'cyber', name: 'Cyber', gradientFrom: 'from-cyan-400', gradientTo: 'to-green-400', featured: true },
  { key: 'fire', name: 'Fuego', gradientFrom: 'from-orange-500', gradientTo: 'to-red-500', featured: false },
  { key: 'ice', name: 'Hielo', gradientFrom: 'from-blue-300', gradientTo: 'to-cyan-300', featured: false },
  { key: 'gold', name: 'Dorado', gradientFrom: 'from-yellow-400', gradientTo: 'to-orange-400', featured: true },
  { key: 'shadow', name: 'Sombras', gradientFrom: 'from-zinc-800', gradientTo: 'to-zinc-600', featured: false },
  { key: 'rainbow', name: 'Arcoiris', gradientFrom: 'from-red-500', gradientTo: 'to-blue-500', featured: false },
] as const

const marketplaceSeeds = [
  {
    name: 'Baraja Neon',
    description: 'Cartas con efecto neon brillante',
    price: 500,
    currency: CurrencyType.COINS,
    imageKey: 'neon',
    type: MarketplaceItemType.DECK,
    rarity: ItemRarity.RARE,
    isPopular: true,
    isNew: false,
    isFeatured: false,
  },
  {
    name: 'Baraja Anime',
    description: 'Estilo anime con personajes',
    price: 750,
    currency: CurrencyType.COINS,
    imageKey: 'anime',
    type: MarketplaceItemType.DECK,
    rarity: ItemRarity.EPIC,
    isPopular: false,
    isNew: true,
    isFeatured: false,
  },
  {
    name: 'Baraja Cosmica',
    description: 'Diseno galactico con estrellas',
    price: 1200,
    currency: CurrencyType.GEMS,
    imageKey: 'cosmic',
    type: MarketplaceItemType.DECK,
    rarity: ItemRarity.LEGENDARY,
    isPopular: false,
    isNew: false,
    isFeatured: true,
  },
  {
    name: 'Pulso Dorado',
    description: 'Impulso premium para apoyar al creador en vivo',
    price: 50,
    currency: CurrencyType.COINS,
    imageKey: 'pulse',
    type: MarketplaceItemType.GIFT,
    rarity: ItemRarity.COMMON,
    isPopular: true,
    isNew: false,
    isFeatured: false,
  },
  {
    name: 'Diamante',
    description: 'Regalo premium',
    price: 100,
    currency: CurrencyType.GEMS,
    imageKey: 'diamond',
    type: MarketplaceItemType.GIFT,
    rarity: ItemRarity.EPIC,
    isPopular: false,
    isNew: false,
    isFeatured: false,
  },
  {
    name: 'Trofeo Campeon',
    description: 'Para el mejor jugador',
    price: 200,
    currency: CurrencyType.GEMS,
    imageKey: 'trophy',
    type: MarketplaceItemType.GIFT,
    rarity: ItemRarity.LEGENDARY,
    isPopular: false,
    isNew: false,
    isFeatured: false,
  },
  {
    name: 'Baraja Minimal',
    description: 'Diseno limpio y elegante',
    price: 300,
    currency: CurrencyType.COINS,
    imageKey: 'minimal',
    type: MarketplaceItemType.DECK,
    rarity: ItemRarity.COMMON,
    isPopular: false,
    isNew: false,
    isFeatured: false,
  },
  {
    name: 'Corona Real',
    description: 'Badge exclusivo',
    price: 500,
    currency: CurrencyType.GEMS,
    imageKey: 'crown',
    type: MarketplaceItemType.BADGE,
    rarity: ItemRarity.LEGENDARY,
    isPopular: false,
    isNew: true,
    isFeatured: false,
  },
] as const

function getInitials(name: string) {
  if (name.toLowerCase().includes('rey30')) {
    return 'R3'
  }

  const parts = name.replace(/_/g, ' ').split(' ').filter(Boolean)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function formatCount(value: number, compactThreshold = 10000) {
  if (value >= compactThreshold) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: value >= 100000 ? 0 : 1,
    }).format(value)
  }

  return new Intl.NumberFormat('en-US').format(value)
}

function formatClock(date: Date) {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeInviteCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

function getSeedUserId(key: string) {
  return `${SEED_USER_ID_PREFIX}${key}`
}

function createInviteCodeCandidate() {
  return Array.from({ length: 6 }, () => INVITE_CODE_ALPHABET[randomInt(0, INVITE_CODE_ALPHABET.length)]).join('')
}

async function generateUniqueInviteCode() {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const inviteCode = createInviteCodeCandidate()
    const existingRoom = await db.room.findUnique({
      where: {
        inviteCode,
      },
      select: {
        id: true,
      },
    })

    if (!existingRoom) {
      return inviteCode
    }
  }

  throw new Error('No se pudo generar un codigo privado unico. Intenta de nuevo.')
}

function normalizeGameLabel(value: string) {
  return value
    .replace(/Crown Clash/gi, 'Mesa Clasica 13')
    .replace(/Crowns/gi, 'Clasica')
    .replace(/coronas/gi, 'corazones')
    .replace(/corona/gi, 'corazon')
}

function mapRoomTypeToChatType(type: RoomType): 'global' | 'private' | 'group' | 'game' {
  if (type === RoomType.GLOBAL) return 'global'
  if (type === RoomType.PRIVATE) return 'private'
  if (type === RoomType.GAME) return 'game'
  return 'group'
}

function mapRoomStatus(status: RoomStatus): 'waiting' | 'starting' | 'full' {
  if (status === RoomStatus.STARTING) return 'starting'
  if (status === RoomStatus.FULL) return 'full'
  return 'waiting'
}

function mapRoomMode(mode: string): 'normal' | 'ranked' | 'tournament' {
  if (mode === 'ranked' || mode === 'tournament') {
    return mode
  }

  return 'normal'
}

function getRoomTableModeLabel(room: { maxPlayers: number; gameMode?: string | null }) {
  return getRoomGameMode(room) === 'custom-table' ? 'Custom 5-10' : 'Clasica 4'
}

function getPresenceWindowStart() {
  return new Date(Date.now() - ACTIVE_PRESENCE_WINDOW_MS)
}

function mapPresenceState(
  presence: { state: PresenceState; lastSeenAt: Date } | null | undefined
): 'online' | 'away' | 'offline' {
  if (!presence || presence.lastSeenAt < getPresenceWindowStart() || presence.state === PresenceState.OFFLINE) {
    return 'offline'
  }

  if (presence.state === PresenceState.AWAY) {
    return 'away'
  }

  return 'online'
}

function mapPresenceLabel(state: 'online' | 'away' | 'offline') {
  if (state === 'away') {
    return 'Ausente'
  }

  if (state === 'offline') {
    return 'Offline'
  }

  return 'Online ahora'
}

function resolveStoredAssetUrl(asset: { publicUrl: string | null; filePath: string }) {
  return asset.publicUrl ?? asset.filePath
}

function resolveArtworkUrl(artwork: { publicUrl: string | null; filePath: string }) {
  return resolveStoredAssetUrl(artwork)
}

async function countActivePresences() {
  return db.presence.count({
    where: {
      state: {
        not: PresenceState.OFFLINE,
      },
      lastSeenAt: {
        gte: getPresenceWindowStart(),
      },
    },
  })
}

async function getCurrentUserRecord() {
  const session = await requireAuthSession()
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      presence: true,
      profile: {
        include: {
          achievements: { orderBy: { order: 'asc' } },
          collectionCards: { orderBy: { order: 'asc' } },
          roadmapItems: { orderBy: { order: 'asc' } },
        },
      },
    },
  })

  if (!user) {
    throw new AuthRequiredError()
  }

  if (!user.profile) {
    throw new Error('No se encontro el perfil principal de REY30VERSE.')
  }

  return user
}

async function ensurePrivateRoomInviteCodes() {
  const privateRoomsWithoutCode = await db.room.findMany({
    where: {
      visibility: RoomVisibility.PRIVATE,
      inviteCode: null,
    },
    select: {
      id: true,
    },
  })

  for (const room of privateRoomsWithoutCode) {
    await db.room.update({
      where: {
        id: room.id,
      },
      data: {
        inviteCode: await generateUniqueInviteCode(),
      },
    })
  }
}

export async function ensureSeedData(options?: { force?: boolean; reset?: boolean }) {
  if (!options?.force && !isRuntimeSeedEnabled()) {
    return
  }

  const [
    existingUsers,
    existingRooms,
    existingStreams,
    existingDeckStyles,
    existingMarketplaceItems,
    existingTimelineTasks,
    existingLiveChats,
    existingLiveGifts,
    existingCreatorClips,
    existingFeedPosts,
    existingFeedMedia,
    existingFeedComments,
    existingFeedCommentReactions,
    existingFeedReactions,
  ] =
    await Promise.all([
      db.user.count(),
      db.room.count(),
      db.liveSession.count(),
      db.deckStyle.count(),
      db.marketplaceItem.count(),
      db.timelineTask.count(),
      db.liveChatMessage.count(),
      db.liveGiftEvent.count(),
      db.creatorClip.count(),
      db.feedPost.count(),
      db.feedPostMedia.count(),
      db.feedPostComment.count(),
      db.feedPostCommentReaction.count(),
      db.feedPostReaction.count(),
    ])

  const hasCompleteSeed =
    existingUsers > 0 &&
    existingRooms > 0 &&
    existingStreams > 0 &&
    existingDeckStyles > 0 &&
    existingMarketplaceItems > 0 &&
    existingTimelineTasks > 0 &&
    existingLiveChats > 0 &&
    existingLiveGifts > 0 &&
    existingCreatorClips > 0 &&
    existingFeedPosts > 0 &&
    existingFeedComments > 0 &&
    existingFeedCommentReactions > 0 &&
    existingFeedReactions > 0

  const hasAnySeed =
    existingUsers > 0 ||
    existingRooms > 0 ||
    existingStreams > 0 ||
    existingDeckStyles > 0 ||
    existingMarketplaceItems > 0 ||
    existingTimelineTasks > 0 ||
    existingLiveChats > 0 ||
    existingLiveGifts > 0 ||
    existingCreatorClips > 0 ||
    existingFeedPosts > 0 ||
    existingFeedMedia > 0 ||
    existingFeedComments > 0 ||
    existingFeedCommentReactions > 0 ||
    existingFeedReactions > 0

  const clearSeedData = async () => {
    const tableNames = [
      'LiveCallSignal',
      'LiveCallParticipant',
      'FeedPostCommentReaction',
      'FeedPostReaction',
      'FeedPostMedia',
      'FeedPostComment',
      'FeedPost',
      'LiveGiftEvent',
      'LiveChatMessage',
      'CreatorClip',
      'GameMatchEvent',
      'GameMatch',
      'Presence',
      'Message',
      'RoomMembership',
      'LiveSession',
      'Room',
      'UserInventoryItem',
      'CardVisualOverride',
      'CardDeckProfile',
      'DeckTemplate',
      'CardArtwork',
      'MarketplaceItem',
      'DeckStyle',
      'TimelineTask',
      'Achievement',
      'CollectionCard',
      'RoadmapItem',
      'Profile',
      'User',
    ]

    await db.$executeRawUnsafe(
      `TRUNCATE TABLE ${tableNames
        .map((tableName) => `"${DATABASE_SCHEMA}"."${tableName}"`)
        .join(', ')} CASCADE`
    )
  }

  if (options?.reset && hasAnySeed) {
    await clearSeedData()
  } else if (hasCompleteSeed) {
    await ensurePrivateRoomInviteCodes()
    await ensurePresenceSeedData()
    await ensureFeedExperienceSeedData()
    await ensurePhaseSevenSeedData()
    await ensureAuthSeedData()
    return
  } else if (hasAnySeed) {
    await clearSeedData()
  }

  const createdUsers = new Map<string, string>()

  for (const seed of userSeeds) {
    const created = await db.user.create({
      data: {
        id: getSeedUserId(seed.key),
        email: seed.email,
        handle: seed.handle,
        name: seed.name,
        avatarSeed: seed.avatarSeed,
        passwordHash: hashPassword(DEMO_PASSWORD),
        profile: {
          create: {
            displayName: seed.profile.displayName,
            username: seed.profile.username,
            roleLine: seed.profile.roleLine,
            bio: seed.profile.bio,
            tagline: seed.profile.tagline,
            level: seed.profile.level,
            wins: seed.profile.wins,
            followers: seed.profile.followers,
            following: seed.profile.following,
            loves: seed.profile.loves,
            points: seed.profile.points,
            gems: seed.profile.gems,
            elo: seed.profile.elo,
            rankLabel: seed.profile.rankLabel,
            currentStatus: seed.profile.currentStatus,
            highlightLabel: seed.profile.highlightLabel,
            highlightCopy: seed.profile.highlightCopy,
            achievements: {
              create: seed.profile.achievements.map((emoji, index) => ({
                emoji,
                label: `achievement-${index + 1}`,
                order: index,
              })),
            },
            collectionCards: {
              create: seed.profile.collection.map((card, index) => ({
                symbol: card.symbol,
                label: card.label,
                order: index,
              })),
            },
            roadmapItems: {
              create: seed.profile.roadmap.map((label, index) => ({
                label,
                order: index,
              })),
            },
          },
        },
      },
    })

    createdUsers.set(seed.key, created.id)
  }

  for (const [index, label] of timelineSeeds.entries()) {
    await db.timelineTask.create({
      data: {
        label,
        order: index,
      },
    })
  }

  for (const [index, style] of deckStyleSeeds.entries()) {
    await db.deckStyle.create({
      data: {
        key: style.key,
        name: style.name,
        gradientFrom: style.gradientFrom,
        gradientTo: style.gradientTo,
        order: index,
        featured: style.featured,
      },
    })
  }

  for (const item of marketplaceSeeds) {
    await db.marketplaceItem.create({
      data: item,
    })
  }

  const roomSeeds = [
    {
      key: 'chat-global',
      slug: 'chat-global',
      name: 'Chat Global',
      description: 'Canal principal de la comunidad.',
      type: RoomType.GLOBAL,
      visibility: RoomVisibility.PUBLIC,
      status: RoomStatus.LIVE,
      mode: 'hub',
      hostUserId: createdUsers.get('alex')!,
      currentPlayers: 342,
      maxPlayers: 500,
      onlineCount: 342,
      unreadCount: 12,
      featured: true,
      isVoiceEnabled: false,
      isRanked: false,
      lastMessagePreview: '¡Hola a todos!',
      pointsRequired: 0,
      bots: 0,
    },
    {
      key: 'luna-directo',
      slug: 'luna-directo',
      name: 'LunaGamer',
      description: 'DM premium con Luna.',
      type: RoomType.PRIVATE,
      visibility: RoomVisibility.PRIVATE,
      status: RoomStatus.WAITING,
      mode: 'direct',
      hostUserId: createdUsers.get('luna')!,
      currentPlayers: 2,
      maxPlayers: 2,
      onlineCount: 1,
      unreadCount: 2,
      featured: false,
      isVoiceEnabled: false,
      isRanked: false,
      lastMessagePreview: '¿Jugamos?',
      pointsRequired: 0,
      bots: 0,
    },
    {
      key: 'team-vikings',
      slug: 'team-vikings',
      name: 'Team Vikings',
      description: 'Grupo social para coordinar torneos.',
      type: RoomType.GROUP,
      visibility: RoomVisibility.PUBLIC,
      status: RoomStatus.WAITING,
      mode: 'group',
      hostUserId: createdUsers.get('cyber')!,
      currentPlayers: 8,
      maxPlayers: 16,
      onlineCount: 8,
      unreadCount: 5,
      featured: false,
      isVoiceEnabled: true,
      isRanked: false,
      lastMessagePreview: '¡Inicia en 5 min!',
      pointsRequired: 0,
      bots: 0,
    },
    {
      key: 'sala-42',
      slug: 'sala-42',
      name: 'Sala #42',
      description: 'Sala privada de juego.',
      type: RoomType.GAME,
      visibility: RoomVisibility.PRIVATE,
      status: RoomStatus.WAITING,
      mode: 'normal',
      hostUserId: createdUsers.get('neon')!,
      currentPlayers: 2,
      maxPlayers: 4,
      onlineCount: 2,
      unreadCount: 1,
      featured: false,
      isVoiceEnabled: true,
      isRanked: false,
      lastMessagePreview: '¡Mi turno!',
      pointsRequired: 0,
      bots: 0,
    },
    {
      key: 'dark-directo',
      slug: 'dark-directo',
      name: 'DarkKnight_X',
      description: 'Chat privado con DarkKnight_X.',
      type: RoomType.PRIVATE,
      visibility: RoomVisibility.PRIVATE,
      status: RoomStatus.WAITING,
      mode: 'direct',
      hostUserId: createdUsers.get('dark')!,
      currentPlayers: 2,
      maxPlayers: 2,
      onlineCount: 1,
      unreadCount: 0,
      featured: false,
      isVoiceEnabled: false,
      isRanked: false,
      lastMessagePreview: 'GG 👍',
      pointsRequired: 0,
      bots: 0,
    },
    {
      key: 'sala-voz',
      slug: 'sala-voz',
      name: 'Sala de Voz',
      description: 'Llamada de voz para coordinar partidas.',
      type: RoomType.GROUP,
      visibility: RoomVisibility.PUBLIC,
      status: RoomStatus.LIVE,
      mode: 'voice',
      hostUserId: createdUsers.get('charlie')!,
      currentPlayers: 5,
      maxPlayers: 8,
      onlineCount: 5,
      unreadCount: 1,
      featured: false,
      isVoiceEnabled: true,
      isRanked: false,
      lastMessagePreview: '5 personas conectadas',
      pointsRequired: 0,
      bots: 0,
    },
    {
      key: 'card-masters',
      slug: 'card-masters',
      name: 'Card Masters',
      description: 'Hub para regalos y deck drops.',
      type: RoomType.GROUP,
      visibility: RoomVisibility.PUBLIC,
      status: RoomStatus.WAITING,
      mode: 'group',
      hostUserId: createdUsers.get('nova')!,
      currentPlayers: 12,
      maxPlayers: 24,
      onlineCount: 12,
      unreadCount: 12,
      featured: false,
      isVoiceEnabled: false,
      isRanked: false,
      lastMessagePreview: 'Nuevo regalo recibido',
      pointsRequired: 0,
      bots: 0,
    },
    {
      key: 'torneo-pro-crowns',
      slug: 'torneo-pro-crowns',
      name: 'Torneo Clasico Pro',
      description: 'Bracket premium con mesa final.',
      type: RoomType.GAME,
      visibility: RoomVisibility.PUBLIC,
      status: RoomStatus.WAITING,
      mode: 'tournament',
      hostUserId: createdUsers.get('cyber')!,
      currentPlayers: 3,
      maxPlayers: 4,
      onlineCount: 3,
      unreadCount: 0,
      featured: true,
      isVoiceEnabled: true,
      isRanked: true,
      lastMessagePreview: 'Esperando al cuarto jugador.',
      pointsRequired: 120,
      bots: 0,
    },
    {
      key: 'partida-casual',
      slug: 'partida-casual',
      name: 'Partida Casual',
      description: 'Mesa relajada para jugar sin presion.',
      type: RoomType.GAME,
      visibility: RoomVisibility.PUBLIC,
      status: RoomStatus.FULL,
      mode: 'normal',
      hostUserId: createdUsers.get('luna')!,
      currentPlayers: 4,
      maxPlayers: 4,
      onlineCount: 4,
      unreadCount: 0,
      featured: false,
      isVoiceEnabled: false,
      isRanked: false,
      lastMessagePreview: 'Mesa completa.',
      pointsRequired: 0,
      bots: 0,
    },
    {
      key: 'solo-bots',
      slug: 'solo-bots',
      name: 'Solo Bots',
      description: 'Practica contra bots configurables.',
      type: RoomType.GAME,
      visibility: RoomVisibility.PUBLIC,
      status: RoomStatus.WAITING,
      mode: 'normal',
      hostUserId: createdUsers.get('dark')!,
      currentPlayers: 1,
      maxPlayers: 4,
      onlineCount: 1,
      unreadCount: 0,
      featured: false,
      isVoiceEnabled: false,
      isRanked: false,
      lastMessagePreview: 'Bots listos para entrar.',
      pointsRequired: 0,
      bots: 3,
    },
    {
      key: 'ranked-match',
      slug: 'ranked-match',
      name: 'Ranked Match',
      description: 'Sube elo en una mesa competitiva.',
      type: RoomType.GAME,
      visibility: RoomVisibility.PUBLIC,
      status: RoomStatus.STARTING,
      mode: 'ranked',
      hostUserId: createdUsers.get('ace')!,
      currentPlayers: 4,
      maxPlayers: 4,
      onlineCount: 4,
      unreadCount: 0,
      featured: true,
      isVoiceEnabled: true,
      isRanked: true,
      lastMessagePreview: 'Cuenta regresiva activa.',
      pointsRequired: 150,
      bots: 0,
    },
    {
      key: 'sala-alexking',
      slug: 'sala-alexking',
      name: 'Sala de AlexKing',
      description: 'Mesa central destacada de la portada.',
      type: RoomType.GAME,
      visibility: RoomVisibility.PUBLIC,
      status: RoomStatus.WAITING,
      mode: 'normal',
      hostUserId: createdUsers.get('alex')!,
      currentPlayers: 3,
      maxPlayers: 4,
      onlineCount: 3,
      unreadCount: 0,
      featured: true,
      isVoiceEnabled: true,
      isRanked: false,
      lastMessagePreview: 'Tu turno en 5 segundos',
      pointsRequired: 0,
      bots: 0,
    },
  ] as const

  const createdRooms = new Map<string, string>()

  for (const room of roomSeeds) {
    const { key, ...roomData } = room
    const created = await db.room.create({ data: roomData })
    createdRooms.set(key, created.id)
  }

  await ensurePrivateRoomInviteCodes()

  const membershipSeeds: Array<{
    roomKey: string
    userKey: string
    isHost: boolean
    isReady?: boolean
    seatOrder: number
    seatLabel: string | null
  }> = [
    { roomKey: 'chat-global', userKey: 'alex', isHost: true, seatOrder: 0, seatLabel: null },
    { roomKey: 'luna-directo', userKey: 'luna', isHost: true, seatOrder: 0, seatLabel: null },
    { roomKey: 'luna-directo', userKey: 'alex', isHost: false, seatOrder: 1, seatLabel: null },
    { roomKey: 'team-vikings', userKey: 'cyber', isHost: true, seatOrder: 0, seatLabel: null },
    { roomKey: 'dark-directo', userKey: 'dark', isHost: true, seatOrder: 0, seatLabel: null },
    { roomKey: 'dark-directo', userKey: 'alex', isHost: false, seatOrder: 1, seatLabel: null },
    { roomKey: 'sala-alexking', userKey: 'mia', isHost: false, isReady: true, seatOrder: 0, seatLabel: '5/13' },
    { roomKey: 'sala-alexking', userKey: 'charlie', isHost: false, isReady: false, seatOrder: 1, seatLabel: '5/13' },
    { roomKey: 'sala-alexking', userKey: 'samurai', isHost: false, isReady: true, seatOrder: 2, seatLabel: '6/13' },
    { roomKey: 'sala-alexking', userKey: 'alex', isHost: true, isReady: true, seatOrder: 3, seatLabel: 'Tu turno' },
  ]

  for (const membership of membershipSeeds) {
    await db.roomMembership.create({
      data: {
        roomId: createdRooms.get(membership.roomKey)!,
        userId: createdUsers.get(membership.userKey)!,
        isHost: membership.isHost,
        isReady: membership.isReady ?? false,
        seatOrder: membership.seatOrder,
        seatLabel: membership.seatLabel,
      },
    })
  }

  const messageSeeds = [
    { roomKey: 'chat-global', userKey: 'luna', content: '¡Hola a todos! 👋' },
    { roomKey: 'chat-global', userKey: 'dark', content: '¿Alguien para una partida de Mesa Clasica 13?' },
    { roomKey: 'chat-global', userKey: 'alex', content: '¡Yo me apunto! 🎮' },
    { roomKey: 'chat-global', userKey: 'cyber', content: 'Yo tambien quiero jugar' },
    { roomKey: 'chat-global', userKey: 'neon', content: 'Vamos a crear la sala!' },
    { roomKey: 'chat-global', userKey: 'alex', content: 'Perfecto, creo la sala #42' },
    { roomKey: 'luna-directo', userKey: 'luna', content: '¿Jugamos?' },
    { roomKey: 'luna-directo', userKey: 'alex', content: 'Dame 10 min y entro.' },
    { roomKey: 'team-vikings', userKey: 'cyber', content: 'Torneo esta noche, revisen horarios.' },
    { roomKey: 'sala-42', userKey: 'neon', content: '¡Mi turno!' },
    { roomKey: 'sala-42', userKey: 'alex', content: 'Te cubro la siguiente mano.' },
    { roomKey: 'dark-directo', userKey: 'dark', content: 'GG 👍' },
    { roomKey: 'card-masters', userKey: 'nova', content: 'Nuevo regalo recibido 🎁' },
    { roomKey: 'sala-alexking', userKey: 'charlie', content: 'Buena suerte a todos' },
    { roomKey: 'sala-alexking', userKey: 'mia', content: 'La reina cae esta ronda' },
    { roomKey: 'sala-alexking', userKey: 'alex', content: 'Tu turno en 5 segundos' },
    { roomKey: 'sala-alexking', userKey: 'samurai', content: 'Voy por ese combo' },
  ] as const

  for (const [index, message] of messageSeeds.entries()) {
    await db.message.create({
      data: {
        roomId: createdRooms.get(message.roomKey)!,
        userId: createdUsers.get(message.userKey)!,
        content: message.content,
        createdAt: new Date(Date.now() - (messageSeeds.length - index) * 60000),
      },
    })
  }

  const liveSeeds = [
    {
      hostUserId: createdUsers.get('luna')!,
      roomId: createdRooms.get('torneo-pro-crowns')!,
      title: '¡Torneo de Mesa Clasica 13 en vivo! Gran final',
      game: 'Mesa Clasica 13',
      viewers: 3420,
      likeCount: 342,
      commentCount: 78,
      thumbnailSeed: 'stream1',
      status: StreamStatus.LIVE,
      isFeatured: true,
      isVerified: true,
      tags: 'Torneo,Español',
    },
    {
      hostUserId: createdUsers.get('dark')!,
      roomId: createdRooms.get('ranked-match')!,
      title: 'Ranked grind hasta Master',
      game: 'Mesa Clasica 13',
      viewers: 1250,
      likeCount: 118,
      commentCount: 41,
      thumbnailSeed: 'stream2',
      status: StreamStatus.LIVE,
      isFeatured: false,
      isVerified: false,
      tags: 'Ranked,Competitivo',
    },
    {
      hostUserId: createdUsers.get('cyber')!,
      roomId: null,
      title: 'Baraja nueva - Especial suscriptores',
      game: 'Mesa Clasica 13',
      viewers: 8900,
      likeCount: 420,
      commentCount: 96,
      thumbnailSeed: 'stream3',
      status: StreamStatus.LIVE,
      isFeatured: false,
      isVerified: true,
      tags: 'Especial,Sorteo',
    },
    {
      hostUserId: createdUsers.get('neon')!,
      roomId: null,
      title: 'Aprendiendo a jugar - Tutorial',
      game: 'Mesa Clasica 13',
      viewers: 450,
      likeCount: 38,
      commentCount: 11,
      thumbnailSeed: 'stream4',
      status: StreamStatus.LIVE,
      isFeatured: false,
      isVerified: false,
      tags: 'Tutorial,Nuevo',
    },
  ] as const

  const createdLiveSessions = new Map<string, string>()

  for (const [index, live] of liveSeeds.entries()) {
    const created = await db.liveSession.create({ data: live })
    createdLiveSessions.set(`stream-${index + 1}`, created.id)
  }

  const liveChatSeeds = [
    { streamKey: 'stream-1', userKey: 'alex', content: 'La mesa se puso intensa 🔥' },
    { streamKey: 'stream-1', userKey: 'mia', content: 'Ese cierre fue limpísimo.' },
    { streamKey: 'stream-1', userKey: 'cyber', content: 'Ojo con la reina negra en la siguiente baza.' },
    { streamKey: 'stream-1', userKey: 'nova', content: 'El overlay premium quedó brutal.' },
    { streamKey: 'stream-1', userKey: 'dark', content: 'Voy all-in con ese push.' },
    { streamKey: 'stream-1', userKey: 'luna', content: 'Chat, prepárense para el cierre final.' },
    { streamKey: 'stream-2', userKey: 'alex', content: 'Ese ranked está durísimo.' },
    { streamKey: 'stream-3', userKey: 'kira', content: 'Quiero ese deck para esta noche.' },
    { streamKey: 'stream-4', userKey: 'axel', content: 'Buen tutorial para entrar al meta.' },
  ] as const

  for (const [index, message] of liveChatSeeds.entries()) {
    await db.liveChatMessage.create({
      data: {
        liveSessionId: createdLiveSessions.get(message.streamKey)!,
        userId: createdUsers.get(message.userKey)!,
        content: message.content,
        createdAt: new Date(Date.now() - (liveChatSeeds.length - index) * 45000),
      },
    })
  }

  const liveGiftSeeds = [
    { streamKey: 'stream-1', userKey: 'alex', imageKey: 'pulse', itemName: 'Pulso Dorado', quantity: 2, totalValue: 100, currency: CurrencyType.COINS },
    { streamKey: 'stream-1', userKey: 'mia', imageKey: 'diamond', itemName: 'Diamante', quantity: 1, totalValue: 100, currency: CurrencyType.GEMS },
    { streamKey: 'stream-1', userKey: 'cyber', imageKey: 'trophy', itemName: 'Trofeo Campeon', quantity: 1, totalValue: 200, currency: CurrencyType.GEMS },
    { streamKey: 'stream-2', userKey: 'nova', imageKey: 'pulse', itemName: 'Pulso Dorado', quantity: 1, totalValue: 50, currency: CurrencyType.COINS },
  ] as const

  for (const [index, gift] of liveGiftSeeds.entries()) {
    const item = await db.marketplaceItem.findFirst({
      where: {
        imageKey: gift.imageKey,
      },
    })

    await db.liveGiftEvent.create({
      data: {
        liveSessionId: createdLiveSessions.get(gift.streamKey)!,
        senderUserId: createdUsers.get(gift.userKey)!,
        marketplaceItemId: item?.id ?? null,
        itemName: gift.itemName,
        imageKey: gift.imageKey,
        quantity: gift.quantity,
        totalValue: gift.totalValue,
        currency: gift.currency,
        createdAt: new Date(Date.now() - (liveGiftSeeds.length - index) * 60000),
      },
    })
  }

  const clipSeeds = [
    { streamKey: 'stream-1', userKey: 'luna', title: 'Final clutch con mesa invertida', durationLabel: '00:42', views: 1240, accentTone: 'violet' },
    { streamKey: 'stream-1', userKey: 'luna', title: 'Lectura perfecta del cierre', durationLabel: '01:08', views: 980, accentTone: 'cyan' },
    { streamKey: 'stream-2', userKey: 'dark', title: 'Push ranked sin margen', durationLabel: '00:36', views: 620, accentTone: 'amber' },
    { streamKey: 'stream-3', userKey: 'cyber', title: 'Reveal del deck premium', durationLabel: '00:54', views: 2140, accentTone: 'emerald' },
  ] as const

  for (const clip of clipSeeds) {
    await db.creatorClip.create({
      data: {
        hostUserId: createdUsers.get(clip.userKey)!,
        liveSessionId: createdLiveSessions.get(clip.streamKey)!,
        title: clip.title,
        durationLabel: clip.durationLabel,
        views: clip.views,
        accentTone: clip.accentTone,
      },
    })
  }

  const feedSeeds = [
    {
      authorKey: 'alex',
      content: 'Movimos el desarrollo a PostgreSQL local y el hub ya responde sobre datos reales. Ahora sí podemos iterar producto de verdad.',
      mediaTitle: 'Roadmap conectado',
      mediaAccent: '#8b5cf6',
      reactionUserKeys: ['luna', 'cyber', 'samurai', 'nova'],
      comments: [
        {
          authorKey: 'luna',
          content: 'Se siente mucho mejor probar el producto sin depender de hosts externos.',
          replies: [
            {
              authorKey: 'alex',
              content: 'Sí, ahora ya podemos iterar feed, chat y lobby sobre el mismo runtime local.',
            },
          ],
        },
        { authorKey: 'samurai', content: 'Perfecto para empezar ranked y lobby con estados consistentes.' },
      ],
    },
    {
      authorKey: 'cyber',
      content: 'Abrí mesa nueva para torneo rápido. Si quieren probar matchmaking real, entren al lobby y levanten una sala.',
      reactionUserKeys: ['alex', 'mia', 'dark'],
      comments: [
        { authorKey: 'mia', content: 'Entro cuando termine el directo principal.' },
      ],
    },
    {
      authorKey: 'nova',
      content: 'Card Lab ya está persistiendo templates y assets. Lo siguiente es conectar mejor el feed con las creaciones destacadas.',
      mediaTitle: 'Card Lab conectado',
      mediaAccent: '#22d3ee',
      reactionUserKeys: ['alex', 'luna'],
      comments: [
        { authorKey: 'alex', content: 'Cuando terminemos el feed, estas publicaciones van a vivir acá mismo.' },
        { authorKey: 'dark', content: 'Necesitamos exponer también equipados y rareza.' },
      ],
    },
    {
      authorKey: 'dark',
      content: 'Chat y salas ya no deberían vivir sobre mocks. Hoy quiero dejar mensajes y rooms pegados a la DB local.',
      reactionUserKeys: ['alex', 'charlie', 'ace'],
      comments: [],
    },
  ] as const

  for (const [index, seed] of feedSeeds.entries()) {
    const createdPost = await db.feedPost.create({
      data: {
        authorId: createdUsers.get(seed.authorKey)!,
        content: seed.content,
        createdAt: new Date(Date.now() - (feedSeeds.length - index) * 60 * 60 * 1000),
      },
    })

    if ('mediaTitle' in seed && 'mediaAccent' in seed && seed.mediaTitle && seed.mediaAccent) {
      const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720">
        <defs>
          <linearGradient id="bg" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stop-color="${seed.mediaAccent}" />
            <stop offset="100%" stop-color="#111827" />
          </linearGradient>
        </defs>
        <rect width="1200" height="720" rx="48" fill="url(#bg)" />
        <circle cx="980" cy="150" r="110" fill="rgba(255,255,255,0.18)" />
        <circle cx="220" cy="560" r="150" fill="rgba(255,255,255,0.10)" />
        <text x="90" y="190" fill="#ffffff" font-size="54" font-family="Arial, sans-serif" font-weight="700">${seed.mediaTitle}</text>
        <text x="90" y="280" fill="rgba(255,255,255,0.82)" font-size="30" font-family="Arial, sans-serif">REY30VERSE local product build</text>
      </svg>`
      const optimized = await optimizeImageUpload(Buffer.from(svgMarkup), 1600)
      const outputName = `${Date.now()}-${slugify(seed.mediaTitle)}.webp`
      const storedAsset = await persistFeedAsset({
        fileName: outputName,
        contentType: 'image/webp',
        buffer: optimized.optimizedBuffer,
      })

      await db.feedPostMedia.create({
        data: {
          userId: createdUsers.get(seed.authorKey)!,
          postId: createdPost.id,
          originalName: `${slugify(seed.mediaTitle)}.svg`,
          filePath: storedAsset.publicUrl,
          storageProvider: storedAsset.driver,
          storageKey: storedAsset.key,
          publicUrl: storedAsset.publicUrl,
          mimeType: 'image/webp',
          width: optimized.width,
          height: optimized.height,
        },
      })
    }

    for (const [commentIndex, comment] of seed.comments.entries()) {
      const createdComment = await db.feedPostComment.create({
        data: {
          postId: createdPost.id,
          authorId: createdUsers.get(comment.authorKey)!,
          content: comment.content,
          createdAt: new Date(Date.now() - (feedSeeds.length - index) * 60 * 60 * 1000 + (commentIndex + 1) * 120000),
        },
      })

      if ('replies' in comment && comment.replies?.length) {
        for (const [replyIndex, reply] of comment.replies.entries()) {
          await db.feedPostComment.create({
            data: {
              postId: createdPost.id,
              authorId: createdUsers.get(reply.authorKey)!,
              parentCommentId: createdComment.id,
              content: reply.content,
              createdAt: new Date(
                Date.now() - (feedSeeds.length - index) * 60 * 60 * 1000 + (commentIndex + 1) * 120000 + (replyIndex + 1) * 45000
              ),
            },
          })
        }
      }
    }

    for (const userKey of seed.reactionUserKeys) {
      await db.feedPostReaction.create({
        data: {
          postId: createdPost.id,
          userId: createdUsers.get(userKey)!,
        },
      })
    }
  }

  await ensurePresenceSeedData()
  await ensureFeedExperienceSeedData()
  await ensurePhaseSevenSeedData()
  await ensureAuthSeedData()
}

async function ensurePresenceSeedData() {
  const users = await db.user.findMany({
    where: {
      handle: {
        in: ['alexrey30', 'miagamer', 'lunagamer', 'cyberqueen', 'darkknightx', 'nova'],
      },
    },
    select: {
      id: true,
      handle: true,
    },
  })

  if (!users.length) {
    return
  }

  const existingPresenceUserIds = new Set(
    (
      await db.presence.findMany({
        select: {
          userId: true,
        },
      })
    ).map((presence) => presence.userId)
  )

  const now = Date.now()
  const seeds = [
    { handle: 'alexrey30', state: PresenceState.ONLINE, currentScreen: 'home', latencyMs: 28, offsetMs: 3_000 },
    { handle: 'miagamer', state: PresenceState.ONLINE, currentScreen: 'live', latencyMs: 34, offsetMs: 8_000 },
    { handle: 'lunagamer', state: PresenceState.ONLINE, currentScreen: 'live', latencyMs: 31, offsetMs: 11_000 },
    { handle: 'cyberqueen', state: PresenceState.ONLINE, currentScreen: 'games', latencyMs: 42, offsetMs: 18_000 },
    { handle: 'darkknightx', state: PresenceState.AWAY, currentScreen: 'games', latencyMs: 54, offsetMs: 49_000 },
    { handle: 'nova', state: PresenceState.ONLINE, currentScreen: 'customize', latencyMs: 26, offsetMs: 9_000 },
  ] as const

  for (const seed of seeds) {
    const user = users.find((entry) => entry.handle === seed.handle)

    if (!user || existingPresenceUserIds.has(user.id)) {
      continue
    }

    await db.presence.create({
      data: {
        userId: user.id,
        state: seed.state,
        currentScreen: seed.currentScreen,
        latencyMs: seed.latencyMs,
        lastSeenAt: new Date(now - seed.offsetMs),
      },
    })
  }
}

async function ensureFeedExperienceSeedData() {
  const posts = await db.feedPost.findMany({
    orderBy: {
      createdAt: 'asc',
    },
    take: 2,
    include: {
      author: true,
      media: {
        orderBy: {
          createdAt: 'asc',
        },
      },
      comments: {
        orderBy: {
          createdAt: 'asc',
        },
        include: {
          reactions: true,
        },
      },
    },
  })

  if (!posts.length) {
    return
  }

  const mediaPresets = [
    { title: 'Roadmap conectado', accent: '#8b5cf6' },
    { title: 'Card Lab conectado', accent: '#22d3ee' },
  ] as const

  for (const [index, post] of posts.entries()) {
    if (post.media.length > 0) {
      continue
    }

    const preset = mediaPresets[index] ?? mediaPresets[0]
    const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720">
      <defs>
        <linearGradient id="bg" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="${preset.accent}" />
          <stop offset="100%" stop-color="#111827" />
        </linearGradient>
      </defs>
      <rect width="1200" height="720" rx="48" fill="url(#bg)" />
      <circle cx="980" cy="150" r="110" fill="rgba(255,255,255,0.18)" />
      <circle cx="220" cy="560" r="150" fill="rgba(255,255,255,0.10)" />
      <text x="90" y="190" fill="#ffffff" font-size="54" font-family="Arial, sans-serif" font-weight="700">${preset.title}</text>
      <text x="90" y="280" fill="rgba(255,255,255,0.82)" font-size="30" font-family="Arial, sans-serif">REY30VERSE local product build</text>
    </svg>`
    const optimized = await optimizeImageUpload(Buffer.from(svgMarkup), 1600)
    const outputName = `${Date.now()}-${slugify(preset.title)}.webp`
    const storedAsset = await persistFeedAsset({
      fileName: outputName,
      contentType: 'image/webp',
      buffer: optimized.optimizedBuffer,
    })

    await db.feedPostMedia.create({
      data: {
        userId: post.authorId,
        postId: post.id,
        originalName: `${slugify(preset.title)}.svg`,
        filePath: storedAsset.publicUrl,
        storageProvider: storedAsset.driver,
        storageKey: storedAsset.key,
        publicUrl: storedAsset.publicUrl,
        mimeType: 'image/webp',
        width: optimized.width,
        height: optimized.height,
      },
    })
  }

  const threadedPost = posts[0]
  const firstComment = threadedPost?.comments[0]

  if (threadedPost && firstComment && !threadedPost.comments.some((comment) => comment.parentCommentId !== null)) {
    await db.feedPostComment.create({
      data: {
        postId: threadedPost.id,
        authorId: threadedPost.authorId,
        parentCommentId: firstComment.id,
        content: 'Sí, ahora el hilo también soporta respuestas reales persistidas.',
        createdAt: new Date(firstComment.createdAt.getTime() + 45_000),
      },
    })
  }

  const currentUser = await db.user.findUnique({
    where: {
      handle: CURRENT_USER_HANDLE,
    },
    select: {
      id: true,
    },
  })

  if (currentUser && firstComment && firstComment.reactions.length === 0) {
    await db.feedPostCommentReaction.create({
      data: {
        commentId: firstComment.id,
        userId: currentUser.id,
      },
    })
  }
}

async function ensurePhaseSevenSeedData() {
  const currentUser = await db.user.findUnique({
    where: {
      handle: CURRENT_USER_HANDLE,
    },
    include: {
      profile: true,
    },
  })

  if (!currentUser || !currentUser.profile) {
    return
  }

  const [existingInventory, existingTemplates] = await Promise.all([
    db.userInventoryItem.count({
      where: {
        userId: currentUser.id,
      },
    }),
    db.deckTemplate.count({
      where: {
        userId: currentUser.id,
      },
    }),
  ])

  if (existingInventory === 0) {
    const starterItems = await db.marketplaceItem.findMany({
      where: {
        imageKey: {
          in: ['neon', 'minimal', 'pulse', 'crown'],
        },
      },
    })

    for (const item of starterItems) {
      await db.userInventoryItem.create({
        data: {
          userId: currentUser.id,
          marketplaceItemId: item.id,
          quantity: item.imageKey === 'pulse' ? 3 : 1,
          isEquipped: item.imageKey === 'neon' || item.imageKey === 'crown',
        },
      })
    }
  }

  if (existingTemplates === 0) {
    await db.deckTemplate.createMany({
      data: [
        {
          userId: currentUser.id,
          name: 'Neon Prime',
          styleKey: 'neon',
          scope: DeckApplyScope.DECK,
          zoom: 100,
          rotation: 0,
          offsetX: 0,
          offsetY: 0,
          isEquipped: true,
        },
        {
          userId: currentUser.id,
          name: 'Focus Spade',
          styleKey: 'minimal',
          scope: DeckApplyScope.CARD,
          targetCard: 'Q-spades',
          zoom: 108,
          rotation: -6,
          offsetX: 8,
          offsetY: -4,
          isEquipped: false,
        },
      ],
    })
  }
}

async function ensureAuthSeedData() {
  for (const seed of userSeeds) {
    const user = await db.user.findUnique({
      where: {
        handle: seed.handle,
      },
      select: {
        id: true,
        passwordHash: true,
      },
    })

    if (!user || user.passwordHash) {
      continue
    }

    await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash: hashPassword(DEMO_PASSWORD),
      },
    })
  }
}

export async function touchCurrentUserPresence(payload?: {
  state?: 'online' | 'away' | 'offline'
  screen?: string | null
  latencyMs?: number | null
}) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const nextState =
    payload?.state === 'away'
      ? PresenceState.AWAY
      : payload?.state === 'offline'
        ? PresenceState.OFFLINE
        : PresenceState.ONLINE

  const presence = await db.presence.upsert({
    where: {
      userId: currentUser.id,
    },
    update: {
      state: nextState,
      currentScreen: payload?.screen ?? currentUser.presence?.currentScreen ?? 'home',
      latencyMs: payload?.latencyMs ?? currentUser.presence?.latencyMs ?? null,
      lastSeenAt: new Date(),
    },
    create: {
      userId: currentUser.id,
      state: nextState,
      currentScreen: payload?.screen ?? 'home',
      latencyMs: payload?.latencyMs ?? null,
      lastSeenAt: new Date(),
    },
  })

  const onlineUsersCount = await countActivePresences()
  const displayState = mapPresenceState(presence)

  return {
    state: displayState,
    label: mapPresenceLabel(displayState),
    onlineUsersCount,
    onlineUsersLabel: formatCount(onlineUsersCount, 100000),
    latencyMs: presence.latencyMs,
    currentScreen: presence.currentScreen,
  }
}

async function fetchLiveSessions() {
  return db.liveSession.findMany({
    include: {
      hostUser: {
        include: {
          profile: true,
        },
      },
      room: true,
    },
    orderBy: [{ isFeatured: 'desc' }, { viewers: 'desc' }],
  })
}

async function fetchMarketplaceItems() {
  return db.marketplaceItem.findMany({ orderBy: [{ isFeatured: 'desc' }, { createdAt: 'asc' }] })
}

type CurrentUserRecord = Awaited<ReturnType<typeof getCurrentUserRecord>>
type LiveSessionRecord = Awaited<ReturnType<typeof fetchLiveSessions>>[number]
type MarketplaceItemRecord = Awaited<ReturnType<typeof fetchMarketplaceItems>>[number]

function mapGiftCurrency(currency: CurrencyType) {
  return currency === CurrencyType.GEMS ? 'gems' : 'coins'
}

async function buildLiveSnapshot(params: {
  currentUser: CurrentUserRecord
  liveSessions: LiveSessionRecord[]
  marketplaceItems: MarketplaceItemRecord[]
  streamId?: string | null
}): Promise<LiveSnapshot> {
  const activeStream =
    params.liveSessions.find((stream) => stream.id === params.streamId) ??
    params.liveSessions.find((stream) => stream.isFeatured) ??
    params.liveSessions[0] ??
    null

  if (!activeStream) {
    return {
      activeStreamId: null,
      streams: [],
      chatMessages: [],
      gifts: [],
      clips: [],
      creator: null,
      giftOptions: [],
      wallet: {
        coins: formatCount(params.currentUser.profile!.points),
        gems: formatCount(params.currentUser.profile!.gems, 100000),
      },
    }
  }

  const [chatMessages, giftEvents, clips, giftInventoryItems] = await Promise.all([
    db.liveChatMessage.findMany({
      where: {
        liveSessionId: activeStream.id,
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 18,
    }),
    db.liveGiftEvent.findMany({
      where: {
        liveSessionId: activeStream.id,
      },
      include: {
        senderUser: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 8,
    }),
    db.creatorClip.findMany({
      where: {
        OR: [
          { liveSessionId: activeStream.id },
          { hostUserId: activeStream.hostUserId },
        ],
      },
      orderBy: [{ views: 'desc' }, { createdAt: 'desc' }],
      take: 4,
    }),
    db.userInventoryItem.findMany({
      where: {
        userId: params.currentUser.id,
        marketplaceItem: {
          type: MarketplaceItemType.GIFT,
        },
      },
      include: {
        marketplaceItem: true,
      },
    }),
  ])

  const creatorProfile = activeStream.hostUser.profile
  const supportTotal = giftEvents.reduce((total, gift) => total + gift.totalValue, 0)
  const goalTarget = 2500
  const currentCoins = params.currentUser.profile?.points ?? 0
  const currentGems = params.currentUser.profile?.gems ?? 0
  const inventoryGiftMap = new Map(giftInventoryItems.map((item) => [item.marketplaceItemId, item]))

  return {
    activeStreamId: activeStream.id,
    streams: params.liveSessions.map((stream) => ({
      id: stream.id,
      streamer: {
        name: stream.hostUser.name,
        avatar: stream.hostUser.avatarSeed,
        level: stream.hostUser.profile?.level ?? 1,
        followers: stream.hostUser.profile?.followers ?? 0,
        isVerified: stream.isVerified,
      },
      title: normalizeGameLabel(stream.title),
      game: normalizeGameLabel(stream.game),
      viewers: stream.viewers,
      likes: stream.likeCount,
      comments: stream.commentCount,
      thumbnail: stream.thumbnailSeed,
      isLive: stream.status === StreamStatus.LIVE,
      tags: stream.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      roomName: stream.room ? normalizeGameLabel(stream.room.name) : null,
      statusLine:
        stream.room?.name ??
        `${formatCount(stream.viewers, 100000)} personas viendo ahora`,
    })),
    chatMessages: [...chatMessages]
      .reverse()
      .map((message, index) => ({
        id: message.id,
        user: message.userId === params.currentUser.id ? 'Yo' : message.user.name,
        message: message.content,
        color: LIVE_CHAT_COLORS[index % LIVE_CHAT_COLORS.length],
        timestamp: formatClock(message.createdAt),
        isMe: message.userId === params.currentUser.id,
      })),
    gifts: giftEvents.map((gift) => ({
      id: gift.id,
      senderName: gift.senderUserId === params.currentUser.id ? 'Tú' : gift.senderUser.name,
      itemName: gift.itemName,
      image: gift.imageKey,
      quantity: gift.quantity,
      valueLabel: `${formatCount(gift.totalValue, 100000)} ${gift.currency === CurrencyType.GEMS ? 'gems' : 'coins'}`,
      createdAt: formatClock(gift.createdAt),
    })),
    clips: clips.map((clip, index) => ({
      id: clip.id,
      title: clip.title,
      duration: clip.durationLabel,
      viewsLabel: `${formatCount(clip.views, 100000)} vistas`,
      accent: LIVE_CLIP_ACCENTS[index % LIVE_CLIP_ACCENTS.length],
    })),
    creator: creatorProfile
      ? {
          displayName: creatorProfile.displayName,
          username: `@${creatorProfile.username}`,
          roleLine: creatorProfile.roleLine,
          followers: formatCount(creatorProfile.followers),
          level: `Nv. ${formatCount(creatorProfile.level, 100000)}`,
          goalLabel: 'Meta de apoyo del directo',
          goalProgress: `${formatCount(supportTotal, 100000)}/${formatCount(goalTarget, 100000)}`,
          highlightNote: normalizeGameLabel(clips[0]?.title ?? activeStream.title),
        }
      : null,
    giftOptions: params.marketplaceItems
      .filter((item) => item.type === MarketplaceItemType.GIFT)
      .slice(0, 4)
      .map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        currency: mapGiftCurrency(item.currency),
        image: item.imageKey,
        ownedQuantity: inventoryGiftMap.get(item.id)?.quantity ?? 0,
        canSend:
          (inventoryGiftMap.get(item.id)?.quantity ?? 0) > 0 ||
          (item.currency === CurrencyType.GEMS ? currentGems >= item.price : currentCoins >= item.price),
        helperText:
          (inventoryGiftMap.get(item.id)?.quantity ?? 0) > 0
            ? `Inventario: x${inventoryGiftMap.get(item.id)?.quantity ?? 0}`
            : item.currency === CurrencyType.GEMS
              ? `${formatCount(item.price, 100000)} gems`
              : `${formatCount(item.price, 100000)} coins`,
      })),
    wallet: {
      coins: formatCount(currentCoins),
      gems: formatCount(currentGems, 100000),
    },
  }
}

function mapMarketplaceType(type: MarketplaceItemType): 'deck' | 'gift' | 'badge' | 'theme' {
  return type.toLowerCase() as 'deck' | 'gift' | 'badge' | 'theme'
}

function mapItemRarity(rarity: ItemRarity): 'common' | 'rare' | 'epic' | 'legendary' {
  return rarity.toLowerCase() as 'common' | 'rare' | 'epic' | 'legendary'
}

function mapDeckScope(scope: DeckApplyScope): 'deck' | 'card' | 'suit' | 'module' | 'element' {
  return scope.toLowerCase() as 'deck' | 'card' | 'suit' | 'module' | 'element'
}

async function ensureDefaultCardDeckProfile(userId: string) {
  const existingDefault = await db.cardDeckProfile.findUnique({
    where: {
      userId_deckKey: {
        userId,
        deckKey: 'default',
      },
    },
  })

  if (existingDefault) {
    return existingDefault
  }

  return db.cardDeckProfile.create({
    data: {
      userId,
      deckKey: 'default',
      name: 'Mazo principal',
      isDefault: true,
      isActive: true,
    },
  })
}

function buildCardDeckOptions(
  profiles: Array<{
    deckKey: string
    name: string
    isDefault: boolean
    isActive: boolean
  }>
) {
  const sortedProfiles = [...profiles].sort((left, right) => {
    if (left.isDefault !== right.isDefault) return left.isDefault ? -1 : 1
    if (left.isActive !== right.isActive) return left.isActive ? -1 : 1
    return left.name.localeCompare(right.name)
  })

  return sortedProfiles.map((profile) => ({
    key: profile.deckKey,
    name: profile.name,
    styleId: null,
    isDefault: profile.isDefault,
    isEquipped: profile.isActive,
  }))
}

function resolveCardDeckKey(
  requestedDeckKey: string | null | undefined,
  deckOptions: Array<{ key: string; isEquipped?: boolean }>
) {
  const safeDeckKey = requestedDeckKey?.trim() || deckOptions.find((option) => option.isEquipped)?.key || 'default'
  return deckOptions.some((option) => option.key === safeDeckKey) ? safeDeckKey : 'default'
}

function formatStamp(date: Date) {
  return new Intl.DateTimeFormat('es-ES', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatFeedTimestamp(date: Date) {
  const minutesAgo = Math.floor((Date.now() - date.getTime()) / 60000)

  if (minutesAgo < 1) {
    return 'Ahora'
  }

  if (minutesAgo < 60) {
    return `${minutesAgo} min`
  }

  const hoursAgo = Math.floor(minutesAgo / 60)

  if (hoursAgo < 24) {
    return `${hoursAgo} h`
  }

  return formatStamp(date)
}

function formatRoomActivity(date: Date) {
  const minutesAgo = Math.floor((Date.now() - date.getTime()) / 60000)

  if (minutesAgo < 1) {
    return 'Actividad hace unos segundos'
  }

  if (minutesAgo < 60) {
    return `Actividad hace ${minutesAgo} min`
  }

  const hoursAgo = Math.floor(minutesAgo / 60)

  if (hoursAgo < 24) {
    return `Actividad hace ${hoursAgo} h`
  }

  return `Actividad ${formatStamp(date)}`
}

function describeDeckScope(scope: DeckApplyScope, targetCard?: string | null, targetSuit?: string | null) {
  if (scope === DeckApplyScope.CARD) {
    return targetCard ? `Carta ${targetCard.replace('-', ' ')}` : 'Carta puntual'
  }

  if (scope === DeckApplyScope.SUIT) {
    return targetSuit ? `Palo ${targetSuit}` : 'Palo personalizado'
  }

  if (scope === DeckApplyScope.MODULE) {
    return targetSuit ? `Modulo ${targetSuit}` : 'Modulo elemental'
  }

  if (scope === DeckApplyScope.ELEMENT) {
    return targetSuit ? `Elemento ${targetSuit}` : 'Elemento'
  }

  return 'Baraja completa'
}

function buildFeedCommentTree(
  comments: Array<{
    id: string
    content: string
    createdAt: Date
    authorId: string
    parentCommentId: string | null
    reactions: Array<{
      userId: string
    }>
    author: {
      id: string
      name: string
      handle: string
      avatarSeed: string
      profile: {
        level: number
      } | null
    }
  }>,
  currentUserId: string,
  parentCommentId: string | null = null
): FeedCommentSnapshot[] {
  return comments
    .filter((comment) => comment.parentCommentId === parentCommentId)
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
    .map((comment) => ({
      id: comment.id,
      content: normalizeGameLabel(comment.content),
      timestamp: formatFeedTimestamp(comment.createdAt),
      likes: comment.reactions.length,
      isLikedByMe: comment.reactions.some((reaction) => reaction.userId === currentUserId),
      author: {
        id: comment.author.id,
        name: comment.author.name,
        handle: comment.author.handle,
        avatar: comment.author.avatarSeed,
        level: comment.author.profile?.level ?? 1,
        isMe: comment.authorId === currentUserId,
      },
      replies: buildFeedCommentTree(comments, currentUserId, comment.id),
    }))
}

function buildFeedMediaSnapshot(media: {
  id: string
  originalName: string
  filePath: string
  publicUrl: string | null
  mimeType: string
  width: number | null
  height: number | null
}): FeedMediaSnapshot {
  return {
    id: media.id,
    url: resolveStoredAssetUrl(media),
    mimeType: media.mimeType,
    width: media.width,
    height: media.height,
    originalName: media.originalName,
  }
}

function buildFeedPostSnapshot(
  post: {
    id: string
    content: string
    createdAt: Date
    authorId: string
    author: {
      id: string
      name: string
      handle: string
      avatarSeed: string
      profile: {
        level: number
      } | null
    }
    media: Array<{
      id: string
      originalName: string
      filePath: string
      publicUrl: string | null
      mimeType: string
      width: number | null
      height: number | null
    }>
    comments: Array<{
      id: string
      content: string
      createdAt: Date
      authorId: string
      parentCommentId: string | null
      reactions: Array<{
        userId: string
      }>
      author: {
        id: string
        name: string
        handle: string
        avatarSeed: string
        profile: {
          level: number
        } | null
      }
    }>
    reactions: Array<{
      userId: string
    }>
  },
  currentUserId: string
): FeedPostSnapshot {
  return {
    id: post.id,
    content: normalizeGameLabel(post.content),
    timestamp: formatFeedTimestamp(post.createdAt),
    likes: post.reactions.length,
    commentsCount: post.comments.length,
    isLikedByMe: post.reactions.some((reaction) => reaction.userId === currentUserId),
    author: {
      id: post.author.id,
      name: post.author.name,
      handle: post.author.handle,
      avatar: post.author.avatarSeed,
      level: post.author.profile?.level ?? 1,
      isMe: post.authorId === currentUserId,
    },
    media: post.media.map((media) => buildFeedMediaSnapshot(media)),
    comments: buildFeedCommentTree(post.comments, currentUserId),
  }
}

export async function getMarketplaceSnapshot(): Promise<MarketplaceSnapshot> {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const [marketplaceItems, deckStyles, inventoryItems] = await Promise.all([
    fetchMarketplaceItems(),
    db.deckStyle.findMany({ orderBy: { order: 'asc' } }),
    db.userInventoryItem.findMany({
      where: {
        userId: currentUser.id,
      },
      include: {
        marketplaceItem: true,
      },
      orderBy: [{ isEquipped: 'desc' }, { updatedAt: 'desc' }],
    }),
  ])

  const inventoryMap = new Map(inventoryItems.map((entry) => [entry.marketplaceItemId, entry]))

  return {
    coins: formatCount(currentUser.profile!.points),
    gems: formatCount(currentUser.profile!.gems, 100000),
    items: marketplaceItems.map((item) => {
      const owned = inventoryMap.get(item.id)
      return {
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        currency: item.currency === CurrencyType.GEMS ? 'gems' : 'coins',
        image: item.imageKey,
        type: mapMarketplaceType(item.type),
        rarity: mapItemRarity(item.rarity),
        popular: item.isPopular,
        new: item.isNew,
        ownedQuantity: owned?.quantity ?? 0,
        equipped: owned?.isEquipped ?? false,
        canEquip: item.type !== MarketplaceItemType.GIFT,
      }
    }),
    deckStyles: deckStyles.map((style) => ({
      id: style.key,
      name: style.name,
      colors: `${style.gradientFrom} ${style.gradientTo}`,
    })),
    inventory: inventoryItems
      .filter((entry) => entry.quantity > 0)
      .map((entry) => ({
        id: entry.marketplaceItemId,
        name: entry.marketplaceItem.name,
        type: mapMarketplaceType(entry.marketplaceItem.type),
        quantity: entry.quantity,
        equipped: entry.isEquipped,
        image: entry.marketplaceItem.imageKey,
      })),
  }
}

export async function getCardCustomizationSnapshot(options: { deckKey?: string | null } = {}): Promise<CardCustomizationSnapshot> {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  await ensureDefaultCardDeckProfile(currentUser.id)
  const [styles, templates, deckProfiles, artworks, inventoryItems] = await Promise.all([
    db.deckStyle.findMany({ orderBy: { order: 'asc' } }),
    db.deckTemplate.findMany({
      where: {
        userId: currentUser.id,
      },
      include: {
        deckStyle: true,
        artwork: true,
      },
      orderBy: [{ isEquipped: 'desc' }, { updatedAt: 'desc' }],
    }),
    db.cardDeckProfile.findMany({
      where: {
        userId: currentUser.id,
      },
      orderBy: [{ isDefault: 'desc' }, { isActive: 'desc' }, { updatedAt: 'desc' }],
    }),
    db.cardArtwork.findMany({
      where: {
        userId: currentUser.id,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    }),
    db.userInventoryItem.findMany({
      where: {
        userId: currentUser.id,
        marketplaceItem: {
          type: MarketplaceItemType.DECK,
        },
      },
      include: {
        marketplaceItem: true,
      },
      orderBy: [{ isEquipped: 'desc' }, { updatedAt: 'desc' }],
    }),
  ])
  const baseDeckOptions = buildCardDeckOptions(deckProfiles)
  const activeDeckKey = resolveCardDeckKey(options.deckKey, baseDeckOptions)
  const deckOptions = baseDeckOptions.map((deckOption) => ({
    ...deckOption,
    isEquipped: deckOption.key === activeDeckKey,
  }))
  const allDeckVisualOverrides = await db.cardVisualOverride.findMany({
    where: {
      userId: currentUser.id,
      deckKey: {
        in: deckOptions.map((deckOption) => deckOption.key),
      },
      isActive: true,
    },
    include: {
      deckStyle: true,
      artwork: true,
    },
    orderBy: [{ updatedAt: 'desc' }],
  })

  const activeTemplate = templates.find((template) => template.isEquipped) ?? templates[0] ?? null
  const currentProfile = currentUser.profile!
  const activeStyleName =
    activeTemplate?.deckStyle?.name ??
    styles.find((style) => style.key === activeTemplate?.styleKey)?.name ??
    'Base'
  const styleSnapshots = styles.map((style) => ({
    id: style.key,
    name: style.name,
    colors: `${style.gradientFrom} ${style.gradientTo}`,
  }))
  const templateSnapshots = templates.map((template) => ({
    id: template.id,
    name: template.name,
    styleId: template.styleKey ?? null,
    styleName: template.deckStyle?.name ?? 'Custom',
    scope: mapDeckScope(template.scope),
    targetCard: template.targetCard,
    targetSuit: template.targetSuit,
    targetModule: template.targetModule,
    targetElement: template.targetElement,
    zoom: template.zoom,
    rotation: template.rotation,
    offsetX: template.offsetX,
    offsetY: template.offsetY,
    isEquipped: template.isEquipped,
    artwork: template.artwork
      ? {
          id: template.artwork.id,
          name: template.artwork.originalName,
          url: resolveArtworkUrl(template.artwork),
          width: template.artwork.width,
          height: template.artwork.height,
        }
      : null,
    updatedAt: formatStamp(template.updatedAt),
  }))
  const templateById = new Map(templates.map((template) => [template.id, template]))
  const allVisualOverrideSnapshots: CardVisualOverrideEntrySnapshot[] = allDeckVisualOverrides.map((override) => {
    const sourceTemplate = override.sourceTemplateId ? templateById.get(override.sourceTemplateId) ?? null : null
    const targetLabel = describeDeckScope(
      override.scope,
      override.targetCard,
      override.targetSuit ?? override.targetModule ?? override.targetElement
    )

    return {
      id: override.id,
      deckKey: override.deckKey,
      sourceTemplateId: override.sourceTemplateId,
      sourceTemplateName: sourceTemplate?.name ?? null,
      name: sourceTemplate?.name ?? `Override ${targetLabel}`,
      styleId: override.styleKey ?? null,
      styleName: override.deckStyle?.name ?? 'Custom',
      scope: mapDeckScope(override.scope),
      targetCard: override.targetCard,
      targetSuit: override.targetSuit,
      targetModule: override.targetModule,
      targetElement: override.targetElement,
      zoom: override.zoom,
      rotation: override.rotation,
      offsetX: override.offsetX,
      offsetY: override.offsetY,
      isEquipped: override.isActive,
      artwork: override.artwork
        ? {
            id: override.artwork.id,
            name: override.artwork.originalName,
            url: resolveArtworkUrl(override.artwork),
            width: override.artwork.width,
            height: override.artwork.height,
          }
        : null,
      updatedAt: formatStamp(override.updatedAt),
    }
  })
  const visualOverrideSnapshots = allVisualOverrideSnapshots.filter((override) => override.deckKey === activeDeckKey)
  const deckComparisons = deckOptions.map((deckOption) => ({
    deckKey: deckOption.key,
    deckName: deckOption.name,
    isActive: deckOption.key === activeDeckKey,
    isDefault: deckOption.isDefault,
    overrides: allVisualOverrideSnapshots.filter((override) => override.deckKey === deckOption.key),
  }))
  const visualResolverTemplates =
    visualOverrideSnapshots.length > 0
      ? visualOverrideSnapshots
      : templateSnapshots.filter((template) => template.isEquipped)

  return {
    coins: formatCount(currentProfile.points),
    gems: formatCount(currentProfile.gems, 100000),
    activeDeckKey,
    deckOptions,
    deckComparisons,
    styles: styleSnapshots,
    templates: templateSnapshots,
    visualOverrides: visualOverrideSnapshots,
    artworks: artworks.map((artwork) => ({
      id: artwork.id,
      name: artwork.originalName,
      url: resolveArtworkUrl(artwork),
      provider: artwork.storageProvider === 's3' ? 's3' : 'local',
      width: artwork.width,
      height: artwork.height,
    })),
    deckModules: deckModules.map((module) => ({
      id: module.id,
      name: module.name,
      type: module.type,
      element: module.cards.find((card) => card.element)?.element,
      themeColor: module.themeColor,
      cards: module.cards.length,
      previewCards: module.cards.map((card) => {
        const cardSnapshot: GameCardSnapshot = {
          id: card.id,
          suit: card.suit as GameCardSnapshot['suit'],
          element: card.element,
          moduleId: card.moduleId,
          type: card.type,
          rank: card.rank ?? card.value ?? 0,
          label: card.label,
          name: card.name,
          themeColor: card.visual.themeColor,
          accentColor: card.visual.accentColor,
        }

        return {
          ...cardSnapshot,
          resolvedVisual: resolveCardVisualOverride({
            card: cardSnapshot,
            templates: visualResolverTemplates,
            styles: styleSnapshots,
            defaultStyleId: activeTemplate?.styleKey ?? styles[0]?.key ?? null,
          }),
        }
      }),
      effects: module.effects,
    })),
    creatorCard: {
      displayName: currentProfile.displayName,
      username: `@${currentProfile.username}`,
      roleLine: currentProfile.roleLine,
      initials: getInitials(currentProfile.displayName),
      followers: formatCount(currentProfile.followers),
      level: `Nv. ${formatCount(currentProfile.level, 100000)}`,
      templatesCount: templates.length,
      artworksCount: artworks.length,
      activeTemplateName: activeTemplate?.name ?? 'Sin template activo',
      equippedStyleName: activeStyleName,
      focusLabel: activeTemplate
        ? describeDeckScope(
            activeTemplate.scope,
            activeTemplate.targetCard,
            activeTemplate.targetSuit ?? activeTemplate.targetModule ?? activeTemplate.targetElement
          )
        : 'Prepara tu primer template',
      activityLabel: activeTemplate
        ? `Ultima edicion ${formatStamp(activeTemplate.updatedAt)}`
        : 'Sube arte, ajusta la carta y guarda tu primera variante.',
    },
    editor: {
      activeTemplateId: activeTemplate?.id ?? null,
      templateName: activeTemplate?.name ?? 'Nuevo Template',
      styleId: activeTemplate?.styleKey ?? styles[0]?.key ?? null,
      artworkId: activeTemplate?.artworkId ?? null,
      scope: activeTemplate ? mapDeckScope(activeTemplate.scope) : 'deck',
      targetCard: activeTemplate?.targetCard ?? null,
      targetSuit: activeTemplate?.targetSuit ?? null,
      targetModule: activeTemplate?.targetModule ?? null,
      targetElement: activeTemplate?.targetElement ?? null,
      zoom: activeTemplate?.zoom ?? 100,
      rotation: activeTemplate?.rotation ?? 0,
      offsetX: activeTemplate?.offsetX ?? 0,
      offsetY: activeTemplate?.offsetY ?? 0,
    },
    inventoryDecks: inventoryItems.map((entry) => ({
      id: entry.marketplaceItemId,
      name: entry.marketplaceItem.name,
      description: entry.marketplaceItem.description,
      price: entry.marketplaceItem.price,
      currency: entry.marketplaceItem.currency === CurrencyType.GEMS ? 'gems' : 'coins',
      image: entry.marketplaceItem.imageKey,
      type: 'deck',
      rarity: mapItemRarity(entry.marketplaceItem.rarity),
      ownedQuantity: entry.quantity,
      equipped: entry.isEquipped,
      canEquip: true,
    })),
  }
}

async function fetchRoomsForShell() {
  return db.room.findMany({
    include: {
      hostUser: {
        include: {
          profile: true,
        },
      },
      messages: {
        include: {
          user: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
      memberships: {
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: {
          seatOrder: 'asc',
        },
      },
    },
    orderBy: [{ featured: 'desc' }, { lastActivityAt: 'desc' }],
  })
}

async function fetchStoryUsersForShell() {
  return db.user.findMany({
    where: {
      handle: {
        in: ['miagamer', 'rex', 'nova', 'kira', 'axel'],
      },
    },
    include: {
      profile: true,
    },
  })
}

function buildChatSnapshot({
  currentUser,
  rooms,
}: {
  currentUser: Awaited<ReturnType<typeof getCurrentUserRecord>>
  rooms: Awaited<ReturnType<typeof fetchRoomsForShell>>
}): ChatSnapshot {
  const chatRooms = rooms.filter((room) =>
    ['chat-global', 'luna-directo', 'team-vikings', 'sala-42', 'dark-directo'].includes(room.slug)
  )
  const chatRoomIds = new Set(chatRooms.map((room) => room.id))

  const messages: ChatMessageSnapshot[] = rooms
    .flatMap((room) =>
      room.messages
        .filter(() => chatRoomIds.has(room.id))
        .map((message, index) => ({
          id: message.id,
          roomId: room.id,
          user: {
            name: message.user.id === currentUser.id ? 'Yo' : message.user.name,
            avatar: message.user.avatarSeed,
            isMe: message.userId === currentUser.id,
          },
          content: normalizeGameLabel(message.content),
          timestamp: formatClock(message.createdAt),
          reactions: room.slug === 'chat-global' && index === 0 ? ['❤️', '🔥'] : undefined,
        }))
    )
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp))

  return {
    activeRoomId: chatRooms[0]?.id ?? '',
    rooms: chatRooms.map((room) => ({
      id: room.id,
      name: normalizeGameLabel(room.name),
      type: mapRoomTypeToChatType(room.type),
      avatar: room.type === RoomType.GLOBAL ? undefined : room.hostUser.avatarSeed,
      lastMessage: normalizeGameLabel(room.lastMessagePreview),
      unread: room.unreadCount,
      online: room.onlineCount || undefined,
    })),
    messages,
  }
}

function buildLobbySnapshot({
  currentUser,
  rooms,
}: {
  currentUser: Awaited<ReturnType<typeof getCurrentUserRecord>>
  rooms: Awaited<ReturnType<typeof fetchRoomsForShell>>
}): LobbySnapshot {
  const gameRooms = rooms.filter((room) => room.type === RoomType.GAME)

  return {
    rooms: gameRooms.map((room) => {
      const isMember = room.memberships.some((membership) => membership.userId === currentUser.id)
      const isHost = room.hostUserId === currentUser.id
      const canViewInternals = room.visibility === RoomVisibility.PUBLIC || isMember

      return {
        id: room.id,
        name: normalizeGameLabel(room.name),
        description: normalizeGameLabel(room.description),
        tableMode: getRoomGameMode(room),
        tableModeLabel: getRoomTableModeLabel(room),
        inviteCode: room.visibility === RoomVisibility.PRIVATE && isMember ? room.inviteCode : null,
        host: {
          name: room.hostUser.name,
          avatar: room.hostUser.avatarSeed,
          level: room.hostUser.profile?.level ?? 1,
        },
        players: room.currentPlayers,
        maxPlayers: room.maxPlayers,
        type: room.visibility === RoomVisibility.PUBLIC ? 'public' : 'private',
        mode: mapRoomMode(room.mode),
        pointsRequired: room.pointsRequired,
        isRanked: room.isRanked,
        voiceEnabled: room.isVoiceEnabled,
        isMember,
        isHost,
        isReadyByMe: room.memberships.find((membership) => membership.userId === currentUser.id)?.isReady ?? false,
        readyCount: room.memberships.filter((membership) => membership.isReady).length,
        humanPlayers: room.memberships.length,
        canLaunch:
          room.memberships.length > 0 &&
          room.memberships.every((membership) => membership.isReady) &&
          (getRoomGameMode(room) === 'custom-table'
            ? room.memberships.length + room.bots >= 5
            : room.memberships.length >= 2 || room.bots > 0),
        requiresInvite: room.visibility === RoomVisibility.PRIVATE && !isMember,
        canViewInternals,
        status: mapRoomStatus(room.status),
        bots: room.bots || undefined,
        activityLabel: formatRoomActivity(room.lastActivityAt),
        seats: canViewInternals
          ? room.memberships.slice(0, Math.min(room.maxPlayers, 10)).map((membership) => ({
              id: membership.userId,
              name: membership.user.name,
              avatar: membership.user.avatarSeed,
              isHost: membership.isHost,
              isReady: membership.isReady,
            }))
          : [],
        recentMessages: canViewInternals
          ? room.messages.slice(-8).map((message) => ({
              id: message.id,
              roomId: room.id,
              user: {
                name: message.user.id === currentUser.id ? 'Yo' : message.user.name,
                avatar: message.user.avatarSeed,
                isMe: message.userId === currentUser.id,
              },
              content: normalizeGameLabel(message.content),
              timestamp: formatClock(message.createdAt),
            }))
          : [],
      }
    }),
  }
}

function buildShellSnapshot({
  currentUser,
  timelineTasks,
  rooms,
  liveSessions,
  deckStyles,
  storyUsers,
  onlineUsersCount,
  live,
}: {
  currentUser: Awaited<ReturnType<typeof getCurrentUserRecord>>
  timelineTasks: Awaited<ReturnType<typeof db.timelineTask.findMany>>
  rooms: Awaited<ReturnType<typeof fetchRoomsForShell>>
  liveSessions: Awaited<ReturnType<typeof fetchLiveSessions>>
  deckStyles: Awaited<ReturnType<typeof db.deckStyle.findMany>>
  storyUsers: Awaited<ReturnType<typeof fetchStoryUsersForShell>>
  onlineUsersCount: number
  live: LiveSnapshot
}): ShellSnapshot {
  const currentProfile = currentUser.profile!
  const currentPresenceState = mapPresenceState(currentUser.presence)
  const featuredGameRoom =
    rooms.find((room) => room.slug === 'sala-alexking') ?? rooms.find((room) => room.type === RoomType.GAME)
  const featuredStream = live.streams.find((stream) => stream.id === live.activeStreamId) ?? live.streams[0]
  const storyMap = new Map(storyUsers.map((user) => [user.handle, user]))
  const dashboardStories: DashboardStory[] = ['miagamer', 'rex', 'nova', 'kira', 'axel']
    .map((handle, index) => {
      const user = storyMap.get(handle)
      if (!user) {
        return null
      }

      return {
        name: user.name.replace('Gamer', ''),
        accent: STORY_ACCENTS[index % STORY_ACCENTS.length],
      }
    })
    .filter((story): story is DashboardStory => story !== null)

  const dashboardChatRooms = rooms
    .filter((room) => ['chat-global', 'team-vikings', 'luna-directo', 'sala-voz', 'card-masters'].includes(room.slug))
    .slice(0, 5)

  const featuredRoomMessages = (featuredGameRoom?.messages ?? []).slice(-4)
  const featuredRoomSeats = featuredGameRoom?.memberships ?? []
  const [topSeat, leftSeat, rightSeat, bottomSeat] = [0, 1, 2, 3].map((index) => featuredRoomSeats[index])
  const gameRooms = rooms.filter((room) => room.type === RoomType.GAME)

  const dashboard: DashboardSnapshot = {
    traction: {
      sessions: formatCount(
        (rooms.find((room) => room.slug === 'chat-global')?.onlineCount ?? 0) +
          liveSessions.reduce((total, stream) => total + stream.viewers, 0)
      ),
      delta: '+18%',
    },
    timeline: timelineTasks.map((task) => task.label),
    storytellers: dashboardStories,
    liveChats: dashboardChatRooms.map((room, index) => ({
      id: room.id,
      room: normalizeGameLabel(room.name),
      note:
        room.slug === 'chat-global'
          ? `${formatCount(room.onlineCount)} mensajes activos`
          : room.slug === 'team-vikings'
            ? 'Torneo esta noche'
            : room.slug === 'luna-directo'
              ? 'Invitacion a partida'
              : room.slug === 'sala-voz'
                ? `${room.onlineCount} personas conectadas`
                : 'Nuevo regalo recibido',
      accent: CHAT_ACCENTS[index % CHAT_ACCENTS.length],
      badge:
        room.slug === 'sala-voz'
          ? 'EN'
          : String(room.unreadCount || room.onlineCount || room.currentPlayers),
    })),
    topMetrics: [
      { label: 'Puntos', value: formatCount(currentProfile.points), hint: 'Cada corazon vale 1' },
      { label: 'Victorias', value: formatCount(currentProfile.wins), hint: 'Temporada actual' },
      { label: 'ELO', value: formatCount(currentProfile.elo), hint: 'Competitivo' },
    ],
    activeRooms: gameRooms.slice(0, 4).map((room) => ({
      id: room.id,
      name: normalizeGameLabel(room.name),
      players: `${room.currentPlayers}/${room.maxPlayers}`,
      cta: room.status === RoomStatus.WAITING ? 'Entrar' : 'Lleno',
    })),
    chatFeed: featuredRoomMessages.map((message) => ({
      id: message.id,
      user: message.user.name,
      text: normalizeGameLabel(message.content),
    })),
    deckStyles: deckStyles.slice(0, 6).map((style) => style.name),
    featuredStream: {
      id: featuredStream?.id ?? '',
      hostName: featuredStream?.streamer.name ?? 'LunaGamer',
      hostInitials: getInitials(featuredStream?.streamer.name ?? 'LunaGamer'),
      title: normalizeGameLabel(featuredStream?.title ?? '¡Torneo de Mesa Clasica 13 en vivo! Gran final'),
      subtitle: 'Evento: ronda clasica de corazones',
      viewers: formatCount(featuredStream?.viewers ?? 3420),
      comments: formatCount(featuredStream?.comments ?? 78, 100000),
      reactions: formatCount(featuredStream?.likes ?? 342, 100000),
      highlightCards: ['A♠', '10♥', 'K♣', 'Q♦'],
    },
    profile: {
      displayName: currentProfile.displayName,
      username: `@${currentProfile.username}`,
      bio: 'Gamer, streamer y creador del card lab.',
      following: formatCount(currentProfile.following),
      followers: formatCount(currentProfile.followers),
      loves: formatCount(currentProfile.loves),
      statusItems: currentProfile.roadmapItems.slice(0, 3).map((item) => item.label),
    },
    table: {
      roomName: normalizeGameLabel(featuredGameRoom?.name ?? 'Sala de AlexKing'),
      top: {
        name: topSeat?.user.name ?? 'MiaGamer',
        initials: getInitials(topSeat?.user.name ?? 'MiaGamer'),
        scoreLabel: topSeat?.seatLabel ?? '5/13',
      },
      left: {
        name: leftSeat?.user.name ?? 'Charlie',
        initials: getInitials(leftSeat?.user.name ?? 'Charlie'),
        scoreLabel: leftSeat?.seatLabel ?? '5/13',
      },
      right: {
        name: rightSeat?.user.name ?? 'SamuraiQ',
        initials: getInitials(rightSeat?.user.name ?? 'SamuraiQ'),
        scoreLabel: rightSeat?.seatLabel ?? '6/13',
      },
      bottom: {
        name: bottomSeat?.user.name ?? currentProfile.displayName,
        initials: getInitials(bottomSeat?.user.name ?? currentProfile.displayName),
        scoreLabel: bottomSeat?.seatLabel ?? 'Tu turno',
        statusLabel: 'Tu turno',
      },
      centerCards: ['J♥', 'Q♠', '3♦'],
      handCards: ['A♥', '10♦', 'K♣', 'J♦', 'Q♠'],
      zoom: '72%',
      cardSize: '64%',
      darkMode: 'On',
    },
  }

  const profile: ProfileSnapshot = {
    displayName: currentProfile.displayName,
    username: currentProfile.username,
    roleLine: currentProfile.roleLine,
    bio: currentProfile.bio,
    level: formatCount(currentProfile.level, 100000),
    wins: formatCount(currentProfile.wins),
    followers: formatCount(currentProfile.followers),
    points: formatCount(currentProfile.points),
    initials: getInitials(currentProfile.displayName),
    achievements: currentProfile.achievements.map((achievement) => achievement.emoji),
    collection: currentProfile.collectionCards.map((card) => card.symbol),
    roadmap: currentProfile.roadmapItems.map((item) => item.label),
  }

  return {
    currentUser: {
      id: currentUser.id,
      displayName: currentProfile.displayName,
      initials: getInitials(currentProfile.displayName),
      avatarSeed: currentUser.avatarSeed,
      level: currentProfile.level,
      points: formatCount(currentProfile.points),
      elo: formatCount(currentProfile.elo),
      rank: currentProfile.rankLabel,
    },
    presence: {
      state: currentPresenceState,
      label: mapPresenceLabel(currentPresenceState),
      onlineUsers: formatCount(onlineUsersCount, 100000),
      latencyMs: currentUser.presence?.latencyMs ?? null,
      currentScreen: currentUser.presence?.currentScreen ?? 'home',
    },
    dashboard,
    profile,
  }
}

export async function getLiveSnapshot(streamId?: string): Promise<LiveSnapshot> {
  await ensureSeedData()

  const [currentUser, liveSessions, marketplaceItems] = await Promise.all([
    getCurrentUserRecord(),
    fetchLiveSessions(),
    fetchMarketplaceItems(),
  ])

  return buildLiveSnapshot({
    currentUser,
    liveSessions,
    marketplaceItems,
    streamId,
  })
}

export async function getAppSnapshot(): Promise<AppSnapshot> {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()

  const [timelineTasks, rooms, liveSessions, deckStyles, marketplaceItems, storyUsers, onlineUsersCount, market, customize] =
    await Promise.all([
      db.timelineTask.findMany({ orderBy: { order: 'asc' } }),
      fetchRoomsForShell(),
      fetchLiveSessions(),
      db.deckStyle.findMany({ orderBy: { order: 'asc' } }),
      fetchMarketplaceItems(),
      fetchStoryUsersForShell(),
      countActivePresences(),
      getMarketplaceSnapshot(),
      getCardCustomizationSnapshot(),
    ])

  const live = await buildLiveSnapshot({
    currentUser,
    liveSessions,
    marketplaceItems,
  })
  const shell = buildShellSnapshot({
    currentUser,
    timelineTasks,
    rooms,
    liveSessions,
    deckStyles,
    storyUsers,
    onlineUsersCount,
    live,
  })

  return {
    ...shell,
    chat: buildChatSnapshot({
      currentUser,
      rooms,
    }),
    lobby: buildLobbySnapshot({
      currentUser,
      rooms,
    }),
    live,
    market,
    customize,
  }
}

export async function getShellSnapshot(): Promise<ShellSnapshot> {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const [timelineTasks, rooms, liveSessions, deckStyles, marketplaceItems, storyUsers, onlineUsersCount] =
    await Promise.all([
      db.timelineTask.findMany({ orderBy: { order: 'asc' } }),
      fetchRoomsForShell(),
      fetchLiveSessions(),
      db.deckStyle.findMany({ orderBy: { order: 'asc' } }),
      fetchMarketplaceItems(),
      fetchStoryUsersForShell(),
      countActivePresences(),
    ])
  const live = await buildLiveSnapshot({
    currentUser,
    liveSessions,
    marketplaceItems,
  })

  return buildShellSnapshot({
    currentUser,
    timelineTasks,
    rooms,
    liveSessions,
    deckStyles,
    storyUsers,
    onlineUsersCount,
    live,
  })
}

export async function getChatSnapshot(): Promise<ChatSnapshot> {
  await ensureSeedData()

  const [currentUser, rooms] = await Promise.all([getCurrentUserRecord(), fetchRoomsForShell()])

  return buildChatSnapshot({
    currentUser,
    rooms,
  })
}

export async function getLobbySnapshot(): Promise<LobbySnapshot> {
  await ensureSeedData()

  const [currentUser, rooms] = await Promise.all([getCurrentUserRecord(), fetchRoomsForShell()])

  return buildLobbySnapshot({
    currentUser,
    rooms,
  })
}

async function getFeedPostRecord(postId: string) {
  return db.feedPost.findUnique({
    where: {
      id: postId,
    },
    include: {
      author: {
        include: {
          profile: true,
        },
      },
      comments: {
        orderBy: {
          createdAt: 'asc',
        },
        include: {
          reactions: true,
          author: {
            include: {
              profile: true,
            },
          },
        },
      },
      media: {
        orderBy: {
          createdAt: 'asc',
        },
      },
      reactions: true,
    },
  })
}

export async function getFeedSnapshot(): Promise<FeedSnapshot> {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const posts = await db.feedPost.findMany({
    include: {
      author: {
        include: {
          profile: true,
        },
      },
      comments: {
        orderBy: {
          createdAt: 'asc',
        },
        include: {
          reactions: true,
          author: {
            include: {
              profile: true,
            },
          },
        },
      },
      media: {
        orderBy: {
          createdAt: 'asc',
        },
      },
      reactions: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return {
    posts: posts.map((post) => buildFeedPostSnapshot(post, currentUser.id)),
  }
}

export async function createFeedPost(payload: { content: string; mediaAssetIds?: string[] }) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const trimmedContent = payload.content.trim()
  const mediaAssetIds = Array.from(
    new Set((payload.mediaAssetIds ?? []).filter((mediaAssetId): mediaAssetId is string => Boolean(mediaAssetId)))
  ).slice(0, 4)

  if (!trimmedContent && mediaAssetIds.length === 0) {
    throw new Error('La publicacion necesita texto o al menos una imagen.')
  }

  if (trimmedContent.length > 480) {
    throw new Error('La publicacion no puede superar los 480 caracteres.')
  }

  const attachedMediaCount = mediaAssetIds.length
    ? await db.feedPostMedia.count({
        where: {
          id: {
            in: mediaAssetIds,
          },
          userId: currentUser.id,
          postId: null,
        },
      })
    : 0

  if (attachedMediaCount !== mediaAssetIds.length) {
    throw new Error('Alguna imagen del post ya no esta disponible.')
  }

  const post = await db.$transaction(async (tx) => {
    const createdPost = await tx.feedPost.create({
      data: {
        authorId: currentUser.id,
        content: trimmedContent,
      },
    })

    if (mediaAssetIds.length) {
      await tx.feedPostMedia.updateMany({
        where: {
          id: {
            in: mediaAssetIds,
          },
          userId: currentUser.id,
          postId: null,
        },
        data: {
          postId: createdPost.id,
        },
      })
    }

    return createdPost
  })

  const snapshot = await getFeedPostRecord(post.id)

  if (!snapshot) {
    throw new Error('No se pudo reconstruir la publicacion creada.')
  }

  return buildFeedPostSnapshot(snapshot, currentUser.id)
}

export async function createFeedComment(postId: string, content: string, parentCommentId?: string | null) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const trimmedContent = content.trim()

  if (!trimmedContent) {
    throw new Error('El comentario no puede estar vacio.')
  }

  if (trimmedContent.length > 280) {
    throw new Error('El comentario no puede superar los 280 caracteres.')
  }

  const post = await db.feedPost.findUnique({
    where: {
      id: postId,
    },
    select: {
      id: true,
    },
  })

  if (!post) {
    throw new Error('La publicacion seleccionada ya no existe.')
  }

  let safeParentCommentId: string | null = null

  if (parentCommentId) {
    const parentComment = await db.feedPostComment.findFirst({
      where: {
        id: parentCommentId,
        postId,
      },
      select: {
        id: true,
      },
    })

    if (!parentComment) {
      throw new Error('El comentario al que intentas responder ya no existe.')
    }

    safeParentCommentId = parentComment.id
  }

  await db.feedPostComment.create({
    data: {
      postId,
      authorId: currentUser.id,
      parentCommentId: safeParentCommentId,
      content: trimmedContent,
    },
  })

  const snapshot = await getFeedPostRecord(postId)

  if (!snapshot) {
    throw new Error('No se pudo actualizar la publicacion comentada.')
  }

  return buildFeedPostSnapshot(snapshot, currentUser.id)
}

export async function toggleFeedPostReaction(postId: string) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const post = await db.feedPost.findUnique({
    where: {
      id: postId,
    },
    select: {
      id: true,
    },
  })

  if (!post) {
    throw new Error('La publicacion seleccionada ya no existe.')
  }

  const existingReaction = await db.feedPostReaction.findUnique({
    where: {
      postId_userId: {
        postId,
        userId: currentUser.id,
      },
    },
  })

  if (existingReaction) {
    await db.feedPostReaction.delete({
      where: {
        postId_userId: {
          postId,
          userId: currentUser.id,
        },
      },
    })
  } else {
    await db.feedPostReaction.create({
      data: {
        postId,
        userId: currentUser.id,
      },
    })
  }

  const snapshot = await getFeedPostRecord(postId)

  if (!snapshot) {
    throw new Error('No se pudo actualizar la reaccion de la publicacion.')
  }

  return buildFeedPostSnapshot(snapshot, currentUser.id)
}

export async function toggleFeedCommentReaction(commentId: string) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const comment = await db.feedPostComment.findUnique({
    where: {
      id: commentId,
    },
    select: {
      id: true,
      postId: true,
    },
  })

  if (!comment) {
    throw new Error('El comentario seleccionado ya no existe.')
  }

  const existingReaction = await db.feedPostCommentReaction.findUnique({
    where: {
      commentId_userId: {
        commentId,
        userId: currentUser.id,
      },
    },
  })

  if (existingReaction) {
    await db.feedPostCommentReaction.delete({
      where: {
        commentId_userId: {
          commentId,
          userId: currentUser.id,
        },
      },
    })
  } else {
    await db.feedPostCommentReaction.create({
      data: {
        commentId,
        userId: currentUser.id,
      },
    })
  }

  const snapshot = await getFeedPostRecord(comment.postId)

  if (!snapshot) {
    throw new Error('No se pudo actualizar la reaccion del comentario.')
  }

  return buildFeedPostSnapshot(snapshot, currentUser.id)
}

export async function createRoom(payload: CreateRoomPayload) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const tableMode = payload.tableMode === 'custom-table' ? 'custom-table' : 'classic-hearts'
  const targetPlayers =
    tableMode === 'custom-table' ? Math.max(5, Math.min(10, Math.round(payload.targetPlayers ?? 5))) : 4
  const botCount =
    tableMode === 'custom-table'
      ? Math.max(0, Math.min(targetPlayers - 1, payload.botCount))
      : Math.max(0, Math.min(3, payload.botCount))
  const trimmedName = payload.name.trim()
  const safeName =
    trimmedName ||
    `Sala ${new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  const slugBase = slugify(safeName)
  const existingCount = await db.room.count({
    where: {
      slug: {
        startsWith: slugBase,
      },
    },
  })

  const room = await db.room.create({
    data: {
      slug: existingCount > 0 ? `${slugBase}-${existingCount + 1}` : slugBase,
      name: safeName,
      description: `Sala creada por ${currentUser.profile!.displayName}.`,
      inviteCode: payload.isPublic ? null : await generateUniqueInviteCode(),
      type: RoomType.GAME,
      visibility: payload.isPublic ? RoomVisibility.PUBLIC : RoomVisibility.PRIVATE,
      status: RoomStatus.WAITING,
      mode: payload.mode,
      gameMode: tableMode,
      hostUserId: currentUser.id,
      currentPlayers: 1,
      maxPlayers: targetPlayers,
      onlineCount: 1,
      unreadCount: 0,
      pointsRequired: payload.mode === 'ranked' ? 120 : payload.mode === 'tournament' ? 200 : 0,
      featured: false,
      isVoiceEnabled: true,
      isRanked: payload.mode !== 'normal',
      bots: botCount,
      lastMessagePreview:
        tableMode === 'custom-table'
          ? `Mesa custom ${targetPlayers}P creada. Esperando jugadores.`
          : 'Sala creada. Esperando jugadores.',
    },
  })

  await db.roomMembership.create({
    data: {
      roomId: room.id,
      userId: currentUser.id,
      isHost: true,
      seatOrder: tableMode === 'custom-table' ? 0 : 3,
      seatLabel: 'Host',
    },
  })

  await db.message.create({
    data: {
      roomId: room.id,
      userId: currentUser.id,
      content:
        tableMode === 'custom-table'
          ? `Mesa custom ${targetPlayers}P creada. Mazo modular disponible.`
          : 'Sala creada. Esperando jugadores.',
    },
  })

  return room
}

export async function regenerateRoomInviteCode(roomId: string) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const room = await db.room.findFirst({
    where: {
      id: roomId,
      type: RoomType.GAME,
    },
  })

  if (!room) {
    throw new Error('No se encontro la sala privada.')
  }

  if (room.visibility !== RoomVisibility.PRIVATE) {
    throw new Error('Solo las salas privadas usan codigo de invitacion.')
  }

  if (room.hostUserId !== currentUser.id) {
    throw new Error('Solo el host puede regenerar el codigo de invitacion.')
  }

  const nextInviteCode = await generateUniqueInviteCode()
  const updatedRoom = await db.room.update({
    where: {
      id: room.id,
    },
    data: {
      inviteCode: nextInviteCode,
      lastActivityAt: new Date(),
      lastMessagePreview: `Codigo privado actualizado por ${currentUser.name}.`,
    },
  })

  await db.message.create({
    data: {
      roomId: room.id,
      userId: currentUser.id,
      content: `${currentUser.name} actualizo el codigo privado de la sala.`,
    },
  })

  return updatedRoom
}

export async function setRoomReadyState(roomId: string, ready?: boolean) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const membership = await db.roomMembership.findFirst({
    where: {
      roomId,
      userId: currentUser.id,
    },
    include: {
      room: true,
    },
  })

  if (!membership || membership.room.type !== RoomType.GAME) {
    throw new Error('Debes estar dentro de la sala para cambiar tu estado.')
  }

  const nextReadyState = typeof ready === 'boolean' ? ready : !membership.isReady

  await db.roomMembership.update({
    where: {
      id: membership.id,
    },
    data: {
      isReady: nextReadyState,
      seatLabel: membership.isHost ? (nextReadyState ? 'Host listo' : 'Host') : nextReadyState ? 'Listo' : 'Jugador',
    },
  })

  await db.room.update({
    where: {
      id: roomId,
    },
    data: {
      lastMessagePreview: nextReadyState ? `${currentUser.name} esta listo.` : `${currentUser.name} ya no esta listo.`,
      lastActivityAt: new Date(),
    },
  })

  await db.message.create({
    data: {
      roomId,
      userId: currentUser.id,
      content: nextReadyState ? `${currentUser.name} esta listo.` : `${currentUser.name} ya no esta listo.`,
    },
  })

  return {
    roomId,
    ready: nextReadyState,
  }
}

export async function launchReadyRoom(roomId: string) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const room = await db.room.findFirst({
    where: {
      id: roomId,
      type: RoomType.GAME,
    },
    include: {
      memberships: true,
    },
  })

  if (!room) {
    throw new Error('No se encontro la sala para lanzar la mesa.')
  }

  if (room.hostUserId !== currentUser.id) {
    throw new Error('Solo el host puede lanzar la mesa.')
  }

  if (!room.memberships.length) {
    throw new Error('La sala aun no tiene jugadores conectados.')
  }

  if (!room.memberships.every((membership) => membership.isReady) || (room.memberships.length < 2 && room.bots <= 0)) {
    throw new Error('Necesitas que todos los jugadores esten listos para lanzar la mesa.')
  }

  const updatedRoom = await db.room.update({
    where: {
      id: room.id,
    },
    data: {
      status: RoomStatus.STARTING,
      lastMessagePreview: `Mesa lanzada por ${currentUser.name}.`,
      lastActivityAt: new Date(),
    },
  })

  await db.message.create({
    data: {
      roomId: room.id,
      userId: currentUser.id,
      content: `${currentUser.name} lanzo la mesa.`,
    },
  })

  return updatedRoom
}

export async function createChatMessage(roomId: string, content: string) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const trimmedContent = content.trim()

  if (!trimmedContent) {
    throw new Error('El mensaje no puede estar vacio.')
  }

  const room = await db.room.findUnique({
    where: { id: roomId },
    include: {
      memberships: {
        select: {
          userId: true,
        },
      },
    },
  })

  if (!room) {
    throw new Error('No se encontro la sala del mensaje.')
  }

  if (room.type === RoomType.GAME && !room.memberships.some((membership) => membership.userId === currentUser.id)) {
    throw new Error('Debes estar dentro de la sala para chatear ahi.')
  }

  const message = await db.message.create({
    data: {
      roomId,
      userId: currentUser.id,
      content: trimmedContent,
    },
  })

  await db.room.update({
    where: { id: roomId },
    data: {
      lastMessagePreview: trimmedContent,
      lastActivityAt: new Date(),
    },
  })

  return message
}

export async function createLiveChatMessage(streamId: string, content: string) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const trimmedContent = content.trim()

  if (!trimmedContent) {
    throw new Error('El mensaje del stream no puede estar vacio.')
  }

  const stream = await db.liveSession.findUnique({
    where: {
      id: streamId,
    },
  })

  if (!stream) {
    throw new Error('No se encontro el stream seleccionado.')
  }

  const message = await db.liveChatMessage.create({
    data: {
      liveSessionId: streamId,
      userId: currentUser.id,
      content: trimmedContent,
    },
  })

  await db.liveSession.update({
    where: {
      id: streamId,
    },
    data: {
      commentCount: {
        increment: 1,
      },
    },
  })

  return message
}

export async function sendLiveGift(payload: {
  streamId: string
  itemId: string
  quantity?: number
}) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const quantity = Math.max(1, Math.min(10, Math.floor(payload.quantity ?? 1)))

  const [stream, item] = await Promise.all([
    db.liveSession.findUnique({
      where: {
        id: payload.streamId,
      },
    }),
    db.marketplaceItem.findUnique({
      where: {
        id: payload.itemId,
      },
    }),
  ])

  if (!stream) {
    throw new Error('No se encontro el stream seleccionado.')
  }

  if (!item || item.type !== MarketplaceItemType.GIFT) {
    throw new Error('El regalo solicitado no esta disponible.')
  }

  const totalValue = item.price * quantity
  const inventoryGift = await db.userInventoryItem.findUnique({
    where: {
      userId_marketplaceItemId: {
        userId: currentUser.id,
        marketplaceItemId: item.id,
      },
    },
  })

  const canUseInventory = (inventoryGift?.quantity ?? 0) >= quantity
  const updates =
    item.currency === CurrencyType.GEMS
      ? { gems: { decrement: totalValue } }
      : { points: { decrement: totalValue } }

  if (
    !canUseInventory &&
    ((item.currency === CurrencyType.GEMS && currentUser.profile!.gems < totalValue) ||
      (item.currency === CurrencyType.COINS && currentUser.profile!.points < totalValue))
  ) {
    throw new Error(
      item.currency === CurrencyType.GEMS
        ? 'No tienes gems suficientes para enviar este regalo.'
        : 'No tienes coins suficientes para enviar este regalo.'
    )
  }

  const giftEvent = await db.liveGiftEvent.create({
    data: {
      liveSessionId: stream.id,
      senderUserId: currentUser.id,
      marketplaceItemId: item.id,
      itemName: item.name,
      imageKey: item.imageKey,
      quantity,
      totalValue,
      currency: item.currency,
    },
  })

  await Promise.all([
    canUseInventory
      ? db.userInventoryItem.update({
          where: {
            userId_marketplaceItemId: {
              userId: currentUser.id,
              marketplaceItemId: item.id,
            },
          },
          data: {
            quantity: {
              decrement: quantity,
            },
          },
        })
      : db.profile.update({
          where: {
            id: currentUser.profile!.id,
          },
          data: updates,
        }),
    db.liveSession.update({
      where: {
        id: stream.id,
      },
      data: {
        likeCount: {
          increment: quantity * 3,
        },
      },
    }),
  ])

  return giftEvent
}

async function syncEquippedDeckInventory(userId: string, styleKey?: string | null) {
  await db.userInventoryItem.updateMany({
    where: {
      userId,
      marketplaceItem: {
        type: MarketplaceItemType.DECK,
      },
    },
    data: {
      isEquipped: false,
    },
  })

  if (!styleKey) {
    return
  }

  const matchingItem = await db.marketplaceItem.findFirst({
    where: {
      type: MarketplaceItemType.DECK,
      imageKey: styleKey,
    },
  })

  if (!matchingItem) {
    return
  }

  await db.userInventoryItem.updateMany({
    where: {
      userId,
      marketplaceItemId: matchingItem.id,
      quantity: {
        gt: 0,
      },
    },
    data: {
      isEquipped: true,
    },
  })
}

export async function purchaseMarketplaceItem(itemId: string) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const item = await db.marketplaceItem.findUnique({
    where: {
      id: itemId,
    },
  })

  if (!item) {
    throw new Error('No se encontro el item solicitado.')
  }

  if (
    (item.currency === CurrencyType.GEMS && currentUser.profile!.gems < item.price) ||
    (item.currency === CurrencyType.COINS && currentUser.profile!.points < item.price)
  ) {
    throw new Error(
      item.currency === CurrencyType.GEMS
        ? 'No tienes gems suficientes para completar la compra.'
        : 'No tienes coins suficientes para completar la compra.'
    )
  }

  await db.$transaction([
    db.profile.update({
      where: {
        id: currentUser.profile!.id,
      },
      data:
        item.currency === CurrencyType.GEMS
          ? { gems: { decrement: item.price } }
          : { points: { decrement: item.price } },
    }),
    db.userInventoryItem.upsert({
      where: {
        userId_marketplaceItemId: {
          userId: currentUser.id,
          marketplaceItemId: item.id,
        },
      },
      update: {
        quantity: {
          increment: 1,
        },
      },
      create: {
        userId: currentUser.id,
        marketplaceItemId: item.id,
        quantity: 1,
        isEquipped: false,
      },
    }),
  ])

  return item
}

export async function equipMarketplaceItem(itemId: string) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const inventoryItem = await db.userInventoryItem.findUnique({
    where: {
      userId_marketplaceItemId: {
        userId: currentUser.id,
        marketplaceItemId: itemId,
      },
    },
    include: {
      marketplaceItem: true,
    },
  })

  if (!inventoryItem || inventoryItem.quantity <= 0) {
    throw new Error('No tienes este item en tu inventario.')
  }

  if (inventoryItem.marketplaceItem.type === MarketplaceItemType.GIFT) {
    throw new Error('Los gifts consumibles no se equipan.')
  }

  await db.userInventoryItem.updateMany({
    where: {
      userId: currentUser.id,
      marketplaceItem: {
        type: inventoryItem.marketplaceItem.type,
      },
    },
    data: {
      isEquipped: false,
    },
  })

  await db.userInventoryItem.update({
    where: {
      userId_marketplaceItemId: {
        userId: currentUser.id,
        marketplaceItemId: itemId,
      },
    },
    data: {
      isEquipped: true,
    },
  })

  if (inventoryItem.marketplaceItem.type === MarketplaceItemType.DECK) {
    const existingTemplate = await db.deckTemplate.findFirst({
      where: {
        userId: currentUser.id,
        styleKey: inventoryItem.marketplaceItem.imageKey,
      },
    })

    await db.deckTemplate.updateMany({
      where: {
        userId: currentUser.id,
      },
      data: {
        isEquipped: false,
      },
    })

    if (existingTemplate) {
      await db.deckTemplate.update({
        where: {
          id: existingTemplate.id,
        },
        data: {
          isEquipped: true,
        },
      })
    } else {
      await db.deckTemplate.create({
        data: {
          userId: currentUser.id,
          name: inventoryItem.marketplaceItem.name,
          styleKey: inventoryItem.marketplaceItem.imageKey,
          scope: DeckApplyScope.DECK,
          isEquipped: true,
        },
      })
    }
  }

  return inventoryItem
}

async function optimizeImageUpload(buffer: Buffer, maxWidth = 1600) {
  const image = sharp(buffer)
  const optimizedBuffer = await image.resize({ width: maxWidth, withoutEnlargement: true }).webp({ quality: 92 }).toBuffer()
  const metadata = await sharp(optimizedBuffer).metadata()

  return {
    optimizedBuffer,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
  }
}

export async function saveFeedPostMedia(payload: {
  fileName: string
  mimeType: string
  buffer: Buffer
}) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const safeBase = slugify(basename(payload.fileName, extname(payload.fileName))) || 'feed-media'
  const outputName = `${Date.now()}-${safeBase}.webp`
  const optimized = await optimizeImageUpload(payload.buffer, 1600)
  const storedAsset = await persistFeedAsset({
    fileName: outputName,
    contentType: 'image/webp',
    buffer: optimized.optimizedBuffer,
  })

  return db.feedPostMedia.create({
    data: {
      userId: currentUser.id,
      originalName: payload.fileName,
      filePath: storedAsset.publicUrl,
      storageProvider: storedAsset.driver,
      storageKey: storedAsset.key,
      publicUrl: storedAsset.publicUrl,
      mimeType: 'image/webp',
      width: optimized.width,
      height: optimized.height,
    },
  })
}

export async function deleteFeedPostMedia(mediaId: string) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()

  if (!mediaId.trim()) {
    throw new Error('Debes indicar qué imagen temporal quieres eliminar.')
  }

  const media = await db.feedPostMedia.findFirst({
    where: {
      id: mediaId,
      userId: currentUser.id,
    },
    select: {
      id: true,
      postId: true,
      filePath: true,
      publicUrl: true,
      storageProvider: true,
      storageKey: true,
    },
  })

  if (!media) {
    throw new Error('La imagen temporal seleccionada ya no existe.')
  }

  if (media.postId) {
    throw new Error('La imagen ya está adjunta a una publicación y no se puede borrar desde el compositor.')
  }

  await deleteStoredAsset({
    driver: media.storageProvider,
    key: media.storageKey,
    publicUrl: media.publicUrl ?? media.filePath,
  })

  await db.feedPostMedia.delete({
    where: {
      id: media.id,
    },
  })

  return {
    id: media.id,
  }
}

export async function saveCardArtwork(payload: {
  fileName: string
  mimeType: string
  buffer: Buffer
}) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()

  const safeBase = slugify(basename(payload.fileName, extname(payload.fileName))) || 'card-art'
  const outputName = `${Date.now()}-${safeBase}.webp`
  const optimized = await optimizeImageUpload(payload.buffer, 1200)
  const storedAsset = await persistCardLabAsset({
    fileName: outputName,
    contentType: 'image/webp',
    buffer: optimized.optimizedBuffer,
  })

  const artwork = await db.cardArtwork.create({
    data: {
      userId: currentUser.id,
      originalName: payload.fileName,
      filePath: storedAsset.publicUrl,
      storageProvider: storedAsset.driver,
      storageKey: storedAsset.key,
      publicUrl: storedAsset.publicUrl,
      mimeType: 'image/webp',
      width: optimized.width,
      height: optimized.height,
    },
  })

  return artwork
}

async function syncActiveCardVisualOverride(params: {
  userId: string
  deckKey?: string | null
  template: {
    id: string
    styleKey: string | null
    artworkId: string | null
    scope: DeckApplyScope
    targetCard: string | null
    targetSuit: string | null
    targetModule: string | null
    targetElement: string | null
    zoom: number
    rotation: number
    offsetX: number
    offsetY: number
  }
}) {
  const target = {
    targetCard: params.template.scope === DeckApplyScope.CARD ? params.template.targetCard : null,
    targetSuit: params.template.scope === DeckApplyScope.SUIT ? params.template.targetSuit : null,
    targetModule: params.template.scope === DeckApplyScope.MODULE ? params.template.targetModule : null,
    targetElement: params.template.scope === DeckApplyScope.ELEMENT ? params.template.targetElement : null,
  }

  await db.cardVisualOverride.deleteMany({
    where: {
      userId: params.userId,
      deckKey: params.deckKey?.trim() || 'default',
      scope: params.template.scope,
      ...target,
    },
  })

  return db.cardVisualOverride.create({
    data: {
      userId: params.userId,
      deckKey: params.deckKey?.trim() || 'default',
      scope: params.template.scope,
      ...target,
      styleKey: params.template.styleKey,
      artworkId: params.template.artworkId,
      sourceTemplateId: params.template.id,
      zoom: params.template.zoom,
      rotation: params.template.rotation,
      offsetX: params.template.offsetX,
      offsetY: params.template.offsetY,
      isActive: true,
    },
  })
}

export async function activateCardVisualOverrideFromTemplate(templateId: string, deckKey?: string | null) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const template = await db.deckTemplate.findFirst({
    where: {
      id: templateId,
      userId: currentUser.id,
    },
  })

  if (!template) {
    throw new Error('No se encontro el template solicitado.')
  }

  return syncActiveCardVisualOverride({
    userId: currentUser.id,
    deckKey,
    template,
  })
}

export async function deactivateCardVisualOverride(overrideId: string) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const override = await db.cardVisualOverride.findFirst({
    where: {
      id: overrideId,
      userId: currentUser.id,
      isActive: true,
    },
  })

  if (!override) {
    throw new Error('No se encontro el override visual activo.')
  }

  return db.cardVisualOverride.update({
    where: {
      id: override.id,
    },
    data: {
      isActive: false,
    },
  })
}

async function createUniqueCardDeckKey(userId: string, name: string) {
  const baseSlug = slugify(name) || 'mazo'

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const suffix = attempt === 0 ? '' : `-${attempt + 1}`
    const deckKey = `deck-${baseSlug}${suffix}`
    const existing = await db.cardDeckProfile.findUnique({
      where: {
        userId_deckKey: {
          userId,
          deckKey,
        },
      },
      select: {
        id: true,
      },
    })

    if (!existing) {
      return deckKey
    }
  }

  return `deck-${baseSlug}-${Date.now()}`
}

export async function createCardDeckProfile(name: string) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  await ensureDefaultCardDeckProfile(currentUser.id)
  const safeName = name.trim() || `Mazo ${formatClock(new Date())}`
  const deckKey = await createUniqueCardDeckKey(currentUser.id, safeName)

  await db.cardDeckProfile.updateMany({
    where: {
      userId: currentUser.id,
    },
    data: {
      isActive: false,
    },
  })

  return db.cardDeckProfile.create({
    data: {
      userId: currentUser.id,
      deckKey,
      name: safeName,
      isDefault: false,
      isActive: true,
    },
  })
}

export async function activateCardDeckProfile(deckKey: string) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  await ensureDefaultCardDeckProfile(currentUser.id)
  const profile = await db.cardDeckProfile.findUnique({
    where: {
      userId_deckKey: {
        userId: currentUser.id,
        deckKey: deckKey.trim() || 'default',
      },
    },
  })

  if (!profile) {
    throw new Error('No se encontro el mazo guardado.')
  }

  await db.cardDeckProfile.updateMany({
    where: {
      userId: currentUser.id,
    },
    data: {
      isActive: false,
    },
  })

  return db.cardDeckProfile.update({
    where: {
      id: profile.id,
    },
    data: {
      isActive: true,
    },
  })
}

export async function renameCardDeckProfile(deckKey: string, name: string) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const safeName = name.trim()

  if (!safeName) {
    throw new Error('El mazo necesita un nombre valido.')
  }

  const profile = await db.cardDeckProfile.findUnique({
    where: {
      userId_deckKey: {
        userId: currentUser.id,
        deckKey: deckKey.trim() || 'default',
      },
    },
  })

  if (!profile) {
    throw new Error('No se encontro el mazo guardado.')
  }

  return db.cardDeckProfile.update({
    where: {
      id: profile.id,
    },
    data: {
      name: safeName,
    },
  })
}

export async function duplicateCardDeckProfile(deckKey: string, name?: string | null) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  await ensureDefaultCardDeckProfile(currentUser.id)
  const safeSourceDeckKey = deckKey.trim() || 'default'
  const sourceProfile = await db.cardDeckProfile.findUnique({
    where: {
      userId_deckKey: {
        userId: currentUser.id,
        deckKey: safeSourceDeckKey,
      },
    },
  })

  if (!sourceProfile) {
    throw new Error('No se encontro el mazo guardado para duplicar.')
  }

  const safeName = name?.trim() || `${sourceProfile.name} copia`
  const nextDeckKey = await createUniqueCardDeckKey(currentUser.id, safeName)
  const sourceOverrides = await db.cardVisualOverride.findMany({
    where: {
      userId: currentUser.id,
      deckKey: sourceProfile.deckKey,
      isActive: true,
    },
  })

  const nextProfile = await db.$transaction(async (transaction) => {
    await transaction.cardDeckProfile.updateMany({
      where: {
        userId: currentUser.id,
      },
      data: {
        isActive: false,
      },
    })

    const createdProfile = await transaction.cardDeckProfile.create({
      data: {
        userId: currentUser.id,
        deckKey: nextDeckKey,
        name: safeName,
        isDefault: false,
        isActive: true,
      },
    })

    if (sourceOverrides.length) {
      await transaction.cardVisualOverride.createMany({
        data: sourceOverrides.map((override) => ({
          userId: currentUser.id,
          deckKey: nextDeckKey,
          scope: override.scope,
          targetCard: override.targetCard,
          targetSuit: override.targetSuit,
          targetModule: override.targetModule,
          targetElement: override.targetElement,
          styleKey: override.styleKey,
          artworkId: override.artworkId,
          sourceTemplateId: override.sourceTemplateId,
          zoom: override.zoom,
          rotation: override.rotation,
          offsetX: override.offsetX,
          offsetY: override.offsetY,
          isActive: true,
        })),
      })
    }

    return createdProfile
  })

  return {
    profile: nextProfile,
    copiedOverrideCount: sourceOverrides.length,
  }
}

export async function deleteCardDeckProfile(deckKey: string) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const safeDeckKey = deckKey.trim()

  if (!safeDeckKey || safeDeckKey === 'default') {
    throw new Error('El mazo principal no se puede eliminar.')
  }

  const profile = await db.cardDeckProfile.findUnique({
    where: {
      userId_deckKey: {
        userId: currentUser.id,
        deckKey: safeDeckKey,
      },
    },
  })

  if (!profile) {
    throw new Error('No se encontro el mazo guardado.')
  }

  await db.$transaction([
    db.cardVisualOverride.deleteMany({
      where: {
        userId: currentUser.id,
        deckKey: safeDeckKey,
      },
    }),
    db.cardDeckProfile.delete({
      where: {
        id: profile.id,
      },
    }),
  ])

  if (profile.isActive) {
    await activateCardDeckProfile('default')
  }

  return profile
}

export async function saveDeckTemplate(payload: {
  templateId?: string | null
  deckKey?: string | null
  name: string
  styleId?: string | null
  artworkId?: string | null
  scope: 'deck' | 'card' | 'suit' | 'module' | 'element'
  targetCard?: string | null
  targetSuit?: string | null
  targetModule?: string | null
  targetElement?: string | null
  zoom: number
  rotation: number
  offsetX: number
  offsetY: number
  equip?: boolean
}) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const safeName = payload.name.trim() || `Template ${formatClock(new Date())}`
  const scope =
    payload.scope === 'card'
      ? DeckApplyScope.CARD
      : payload.scope === 'suit'
        ? DeckApplyScope.SUIT
        : payload.scope === 'module'
          ? DeckApplyScope.MODULE
          : payload.scope === 'element'
            ? DeckApplyScope.ELEMENT
            : DeckApplyScope.DECK

  if (payload.artworkId) {
    const artwork = await db.cardArtwork.findFirst({
      where: {
        id: payload.artworkId,
        userId: currentUser.id,
      },
    })

    if (!artwork) {
      throw new Error('La imagen seleccionada ya no esta disponible.')
    }
  }

  if (payload.styleId) {
    const ownedStyle = await db.userInventoryItem.findFirst({
      where: {
        userId: currentUser.id,
        quantity: {
          gt: 0,
        },
        marketplaceItem: {
          type: MarketplaceItemType.DECK,
          imageKey: payload.styleId,
        },
      },
    })

    if (!ownedStyle) {
      throw new Error('Primero necesitas desbloquear esa baraja en la tienda.')
    }
  }

  let existingTemplate:
    | Awaited<ReturnType<typeof db.deckTemplate.findFirst>>
    | null = null

  if (payload.templateId) {
    existingTemplate = await db.deckTemplate.findFirst({
      where: {
        id: payload.templateId,
        userId: currentUser.id,
      },
    })

    if (!existingTemplate) {
      throw new Error('El template solicitado ya no esta disponible.')
    }
  }

  const shouldEquip = Boolean(payload.equip || existingTemplate?.isEquipped)

  const data = {
    name: safeName,
    styleKey: payload.styleId ?? null,
    artworkId: payload.artworkId ?? null,
    scope,
    targetCard: scope === DeckApplyScope.CARD ? payload.targetCard ?? null : null,
    targetSuit: scope === DeckApplyScope.SUIT ? payload.targetSuit ?? null : null,
    targetModule: scope === DeckApplyScope.MODULE ? payload.targetModule ?? null : null,
    targetElement: scope === DeckApplyScope.ELEMENT ? payload.targetElement ?? null : null,
    zoom: Math.max(50, Math.min(180, Math.round(payload.zoom))),
    rotation: Math.max(-180, Math.min(180, Math.round(payload.rotation))),
    offsetX: Math.max(-100, Math.min(100, Math.round(payload.offsetX))),
    offsetY: Math.max(-100, Math.min(100, Math.round(payload.offsetY))),
    isEquipped: shouldEquip,
  }

  if (shouldEquip) {
    await db.deckTemplate.updateMany({
      where: {
        userId: currentUser.id,
      },
      data: {
        isEquipped: false,
      },
    })
  }

  const template = payload.templateId
    ? await db.deckTemplate.update({
        where: {
          id: payload.templateId,
        },
        data,
      })
    : await db.deckTemplate.create({
        data: {
          userId: currentUser.id,
          ...data,
        },
      })

  if (shouldEquip) {
    await syncEquippedDeckInventory(currentUser.id, template.styleKey)
    await syncActiveCardVisualOverride({
      userId: currentUser.id,
      deckKey: payload.deckKey,
      template,
    })
  }

  return template
}

export async function duplicateDeckTemplate(templateId: string, nextName?: string | null) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const template = await db.deckTemplate.findFirst({
    where: {
      id: templateId,
      userId: currentUser.id,
    },
  })

  if (!template) {
    throw new Error('No se encontro el template solicitado.')
  }

  const safeName = nextName?.trim() || `${template.name} copia`
  const duplicatedTemplate = await db.deckTemplate.create({
    data: {
      userId: currentUser.id,
      name: safeName,
      styleKey: template.styleKey,
      artworkId: template.artworkId,
      scope: template.scope,
      targetCard: template.targetCard,
      targetSuit: template.targetSuit,
      targetModule: template.targetModule,
      targetElement: template.targetElement,
      zoom: template.zoom,
      rotation: template.rotation,
      offsetX: template.offsetX,
      offsetY: template.offsetY,
      isEquipped: false,
    },
  })

  return duplicatedTemplate
}

export async function renameDeckTemplate(templateId: string, name: string) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const template = await db.deckTemplate.findFirst({
    where: {
      id: templateId,
      userId: currentUser.id,
    },
  })

  if (!template) {
    throw new Error('No se encontro el template solicitado.')
  }

  const safeName = name.trim()

  if (!safeName) {
    throw new Error('El template necesita un nombre valido.')
  }

  return db.deckTemplate.update({
    where: {
      id: template.id,
    },
    data: {
      name: safeName,
    },
  })
}

export async function equipDeckTemplate(templateId: string, deckKey?: string | null) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const template = await db.deckTemplate.findFirst({
    where: {
      id: templateId,
      userId: currentUser.id,
    },
  })

  if (!template) {
    throw new Error('No se encontro el template solicitado.')
  }

  await db.deckTemplate.updateMany({
    where: {
      userId: currentUser.id,
    },
    data: {
      isEquipped: false,
    },
  })

  const updatedTemplate = await db.deckTemplate.update({
    where: {
      id: template.id,
    },
    data: {
      isEquipped: true,
    },
  })

  await syncEquippedDeckInventory(currentUser.id, updatedTemplate.styleKey)
  await syncActiveCardVisualOverride({
    userId: currentUser.id,
    deckKey,
    template: updatedTemplate,
  })

  return updatedTemplate
}

export async function deleteDeckTemplate(templateId: string) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const template = await db.deckTemplate.findFirst({
    where: {
      id: templateId,
      userId: currentUser.id,
    },
  })

  if (!template) {
    throw new Error('No se encontro el template solicitado.')
  }

  await db.$transaction([
    db.cardVisualOverride.deleteMany({
      where: {
        userId: currentUser.id,
        sourceTemplateId: template.id,
      },
    }),
    db.deckTemplate.delete({
      where: {
        id: template.id,
      },
    }),
  ])

  if (template.isEquipped) {
    const fallbackTemplate = await db.deckTemplate.findFirst({
      where: {
        userId: currentUser.id,
      },
      orderBy: [{ updatedAt: 'desc' }],
    })

    if (fallbackTemplate) {
      const updatedFallbackTemplate = await db.deckTemplate.update({
        where: {
          id: fallbackTemplate.id,
        },
        data: {
          isEquipped: true,
        },
      })

      await syncEquippedDeckInventory(currentUser.id, fallbackTemplate.styleKey)
      await syncActiveCardVisualOverride({
        userId: currentUser.id,
        template: updatedFallbackTemplate,
      })
    } else {
      await syncEquippedDeckInventory(currentUser.id, null)
    }
  }

  return template
}

export async function deleteCardArtwork(artworkId: string) {
  await ensureSeedData()

  const currentUser = await getCurrentUserRecord()
  const artwork = await db.cardArtwork.findFirst({
    where: {
      id: artworkId,
      userId: currentUser.id,
    },
  })

  if (!artwork) {
    throw new Error('No se encontro la imagen seleccionada.')
  }

  await db.$transaction([
    db.deckTemplate.updateMany({
      where: {
        userId: currentUser.id,
        artworkId: artwork.id,
      },
      data: {
        artworkId: null,
      },
    }),
    db.cardVisualOverride.updateMany({
      where: {
        userId: currentUser.id,
        artworkId: artwork.id,
      },
      data: {
        artworkId: null,
      },
    }),
    db.cardArtwork.delete({
      where: {
        id: artwork.id,
      },
    }),
  ])

  await deleteStoredAsset({
    driver: artwork.storageProvider,
    key: artwork.storageKey,
    publicUrl: artwork.publicUrl ?? artwork.filePath,
  })

  return artwork
}
