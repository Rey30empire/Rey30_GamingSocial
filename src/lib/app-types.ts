export type SectionId = 'home' | 'chat' | 'games' | 'live' | 'market' | 'customize' | 'profile'

export type AccentTone = 'cyan' | 'fuchsia' | 'violet' | 'amber' | 'emerald'

export interface CurrentUserSnapshot {
  id: string
  displayName: string
  initials: string
  avatarSeed: string
  level: number
  points: string
  elo: string
  rank: string
}

export interface PresenceSnapshot {
  state: 'online' | 'away' | 'offline'
  label: string
  onlineUsers: string
  latencyMs: number | null
  currentScreen?: string | null
}

export interface DashboardStory {
  name: string
  accent: string
}

export interface DashboardLiveChat {
  id: string
  room: string
  note: string
  accent: string
  badge: string
}

export interface DashboardMetric {
  label: string
  value: string
  hint: string
}

export interface DashboardRoom {
  id: string
  name: string
  players: string
  cta: string
}

export interface DashboardChatFeedEntry {
  id: string
  user: string
  text: string
}

export interface FeaturedStreamSnapshot {
  id: string
  hostName: string
  hostInitials: string
  title: string
  subtitle: string
  viewers: string
  comments: string
  reactions: string
  highlightCards: string[]
}

export interface DashboardProfileSnapshot {
  displayName: string
  username: string
  bio: string
  following: string
  followers: string
  loves: string
  statusItems: string[]
}

export interface TableSeatSnapshot {
  name: string
  initials: string
  scoreLabel: string
  statusLabel?: string
}

export interface HomeTableSnapshot {
  roomName: string
  top: TableSeatSnapshot
  left: TableSeatSnapshot
  right: TableSeatSnapshot
  bottom: TableSeatSnapshot
  centerCards: string[]
  handCards: string[]
  zoom: string
  cardSize: string
  darkMode: string
}

export interface DashboardSnapshot {
  traction: {
    sessions: string
    delta: string
  }
  timeline: string[]
  storytellers: DashboardStory[]
  liveChats: DashboardLiveChat[]
  topMetrics: DashboardMetric[]
  activeRooms: DashboardRoom[]
  chatFeed: DashboardChatFeedEntry[]
  deckStyles: string[]
  featuredStream: FeaturedStreamSnapshot
  profile: DashboardProfileSnapshot
  table: HomeTableSnapshot
}

export interface ChatRoomSnapshot {
  id: string
  name: string
  type: 'global' | 'private' | 'group' | 'game'
  avatar?: string
  lastMessage: string
  unread: number
  online?: number
}

export interface ChatMessageSnapshot {
  id: string
  roomId: string
  user: {
    name: string
    avatar: string
    isMe?: boolean
  }
  content: string
  timestamp: string
  reactions?: string[]
}

export interface ChatSnapshot {
  activeRoomId: string
  rooms: ChatRoomSnapshot[]
  messages: ChatMessageSnapshot[]
}

export interface GameRoomSnapshot {
  id: string
  name: string
  host: {
    name: string
    avatar: string
    level: number
  }
  players: number
  maxPlayers: number
  type: 'public' | 'private'
  status: 'waiting' | 'starting' | 'full'
  bots?: number
}

export interface LobbySnapshot {
  rooms: GameRoomSnapshot[]
}

export interface GameCardSnapshot {
  id: string
  suit: 'crowns' | 'diamonds' | 'clubs' | 'spades'
  rank: number
  label: string
}

export interface GameTableCardSnapshot {
  seat: number
  playerName: string
  card: GameCardSnapshot
}

export interface GameSeatSnapshot {
  seat: number
  name: string
  avatar: string
  score: number
  roundPoints: number
  tricksWon: number
  cardsRemaining: number
  isBot: boolean
  isMe?: boolean
  isConnected?: boolean
  isTurn?: boolean
  position: 'top' | 'left' | 'right' | 'bottom'
  statusLabel?: string
}

export interface GameEventSnapshot {
  id: string
  type: string
  summary: string
  createdAt: string
}

export interface GameControlsSnapshot {
  voiceEnabled: boolean
  soundEnabled: boolean
  tableChatEnabled: boolean
  darkMode: boolean
  tableZoom: number
  cardScale: number
}

export interface GameSnapshot {
  matchId: string
  roomId: string
  roomName: string
  status: 'waiting' | 'active' | 'finished'
  roundNumber: number
  trickNumber: number
  crownsReleased: boolean
  leadSuit?: string | null
  currentTurnSeat: number
  currentTurnLabel: string
  summary: string
  hand: GameCardSnapshot[]
  tableCards: GameTableCardSnapshot[]
  seats: GameSeatSnapshot[]
  standings: Array<{
    seat: number
    name: string
    score: number
    roundPoints: number
    tricksWon: number
    isMe?: boolean
  }>
  recentEvents: GameEventSnapshot[]
  controls: GameControlsSnapshot
}

export interface StreamSnapshot {
  id: string
  streamer: {
    name: string
    avatar: string
    level: number
    followers: number
    isVerified?: boolean
  }
  title: string
  game: string
  viewers: number
  likes: number
  comments: number
  thumbnail: string
  isLive: boolean
  tags: string[]
  roomName?: string | null
  statusLine?: string
}

export interface LiveChatEntrySnapshot {
  id: string
  user: string
  message: string
  color: string
  timestamp: string
  isMe?: boolean
}

export interface LiveGiftSnapshot {
  id: string
  senderName: string
  itemName: string
  image: string
  quantity: number
  valueLabel: string
  createdAt: string
}

export interface CreatorClipSnapshot {
  id: string
  title: string
  duration: string
  viewsLabel: string
  accent: string
}

export interface LiveCreatorSnapshot {
  displayName: string
  username: string
  roleLine: string
  followers: string
  level: string
  goalLabel: string
  goalProgress: string
  highlightNote: string
}

export interface LiveGiftOptionSnapshot {
  id: string
  name: string
  price: number
  currency: 'coins' | 'gems'
  image: string
}

export interface LiveSnapshot {
  activeStreamId: string | null
  streams: StreamSnapshot[]
  chatMessages: LiveChatEntrySnapshot[]
  gifts: LiveGiftSnapshot[]
  clips: CreatorClipSnapshot[]
  creator: LiveCreatorSnapshot | null
  giftOptions: LiveGiftOptionSnapshot[]
}

export interface ShopItemSnapshot {
  id: string
  name: string
  description: string
  price: number
  currency: 'coins' | 'gems'
  image: string
  type: 'deck' | 'gift' | 'badge' | 'theme'
  rarity?: 'common' | 'rare' | 'epic' | 'legendary'
  popular?: boolean
  new?: boolean
  ownedQuantity?: number
  equipped?: boolean
  canEquip?: boolean
}

export interface DeckStyleSnapshot {
  id: string
  name: string
  colors: string
}

export interface InventoryEntrySnapshot {
  id: string
  name: string
  type: 'deck' | 'gift' | 'badge' | 'theme'
  quantity: number
  equipped?: boolean
  image: string
}

export interface MarketplaceSnapshot {
  coins: string
  gems: string
  items: ShopItemSnapshot[]
  deckStyles: DeckStyleSnapshot[]
  inventory: InventoryEntrySnapshot[]
}

export interface CardArtworkSnapshot {
  id: string
  name: string
  url: string
  provider?: 'local' | 's3'
  width: number | null
  height: number | null
}

export interface DeckTemplateSnapshot {
  id: string
  name: string
  styleId: string | null
  styleName: string
  scope: 'deck' | 'card' | 'suit'
  targetCard: string | null
  targetSuit: string | null
  zoom: number
  rotation: number
  offsetX: number
  offsetY: number
  isEquipped: boolean
  artwork: CardArtworkSnapshot | null
  updatedAt: string
}

export interface CardCustomizationSnapshot {
  coins: string
  gems: string
  styles: DeckStyleSnapshot[]
  templates: DeckTemplateSnapshot[]
  artworks: CardArtworkSnapshot[]
  editor: {
    activeTemplateId: string | null
    templateName: string
    styleId: string | null
    artworkId: string | null
    scope: 'deck' | 'card' | 'suit'
    targetCard: string | null
    targetSuit: string | null
    zoom: number
    rotation: number
    offsetX: number
    offsetY: number
  }
  inventoryDecks: ShopItemSnapshot[]
}

export interface ProfileSnapshot {
  displayName: string
  username: string
  roleLine: string
  bio: string
  level: string
  wins: string
  followers: string
  points: string
  initials: string
  achievements: string[]
  collection: string[]
  roadmap: string[]
}

export interface AppSnapshot {
  currentUser: CurrentUserSnapshot
  presence: PresenceSnapshot
  dashboard: DashboardSnapshot
  chat: ChatSnapshot
  lobby: LobbySnapshot
  game?: GameSnapshot
  live: LiveSnapshot
  market: MarketplaceSnapshot
  customize: CardCustomizationSnapshot
  profile: ProfileSnapshot
}

export interface CreateRoomPayload {
  name: string
  mode: 'normal' | 'ranked' | 'tournament'
  isPublic: boolean
  botCount: number
}
