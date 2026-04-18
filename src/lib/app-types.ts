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

export interface FeedAuthorSnapshot {
  id: string
  name: string
  handle: string
  avatar: string
  level: number
  isMe?: boolean
}

export interface FeedMediaSnapshot {
  id: string
  url: string
  mimeType: string
  width: number | null
  height: number | null
  originalName: string
}

export interface FeedCommentSnapshot {
  id: string
  content: string
  timestamp: string
  likes: number
  isLikedByMe: boolean
  author: FeedAuthorSnapshot
  replies: FeedCommentSnapshot[]
}

export interface FeedPostSnapshot {
  id: string
  content: string
  timestamp: string
  likes: number
  commentsCount: number
  isLikedByMe: boolean
  author: FeedAuthorSnapshot
  media: FeedMediaSnapshot[]
  comments: FeedCommentSnapshot[]
}

export interface FeedSnapshot {
  posts: FeedPostSnapshot[]
}

export interface GameRoomSnapshot {
  id: string
  name: string
  description: string
  tableMode?: 'classic-hearts' | 'custom-table'
  tableModeLabel?: string
  inviteCode?: string | null
  host: {
    name: string
    avatar: string
    level: number
  }
  players: number
  maxPlayers: number
  type: 'public' | 'private'
  mode: 'normal' | 'ranked' | 'tournament'
  pointsRequired: number
  isRanked: boolean
  voiceEnabled: boolean
  isMember: boolean
  isHost: boolean
  isReadyByMe: boolean
  readyCount: number
  humanPlayers: number
  canLaunch: boolean
  requiresInvite: boolean
  canViewInternals: boolean
  status: 'waiting' | 'starting' | 'full'
  bots?: number
  activityLabel: string
  seats: Array<{
    id: string
    name: string
    avatar: string
    isHost?: boolean
    isReady?: boolean
  }>
  recentMessages: ChatMessageSnapshot[]
}

export interface LobbySnapshot {
  rooms: GameRoomSnapshot[]
}

export interface GameCardSnapshot {
  id: string
  suit?: 'crowns' | 'diamonds' | 'clubs' | 'spades'
  element?: 'fire' | 'water' | 'earth' | 'air' | 'lightning' | 'shadow' | 'light'
  moduleId?: string
  type?: 'standard' | 'elemental' | 'special' | 'event' | 'unique'
  rank: number
  label: string
  name?: string
  themeColor?: string
  accentColor?: string
  isBlocked?: boolean
  resolvedVisual?: CardVisualOverrideSnapshot
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
  position: 'top' | 'left' | 'right' | 'bottom' | 'dynamic'
  angleDegrees?: number
  statusLabel?: string
  blockedCards?: number
  protectedPoints?: number
}

export interface GameEventSnapshot {
  id: string
  type: string
  summary: string
  createdAt: string
}

export interface GameEffectHistorySnapshot {
  id: string
  type: 'draw-card' | 'block-card' | 'shift-turn' | 'protect-points' | 'score'
  effectId: string
  effectName: string
  cardId: string
  actorSeat: number
  targetSeat?: number
  summary: string
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
  tableMode?: 'classic-hearts' | 'custom-table'
  tableModeLabel?: string
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
  ruleHint: string
  scoring?: {
    id: string
    mode: 'hearts-classic' | 'points' | 'trick-based' | 'custom'
    pointPolarity?: 'high-score-wins' | 'low-score-wins'
    pointsLabel?: string
    summary?: string
    protectionRule?: string
  }
  playerEffects?: {
    blockedCardIds: string[]
    blockedCards: number
    protectedPoints: number
  }
  hand: GameCardSnapshot[]
  playableCardIds: string[]
  tableCards: GameTableCardSnapshot[]
  tableMessages: ChatMessageSnapshot[]
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
  effectHistory?: GameEffectHistorySnapshot[]
  controls: GameControlsSnapshot
  deck?: {
    totalCards: number
    cardsPerPlayer: number
    leftoverCount: number
    modules: Array<{
      id: string
      name: string
      type: string
      themeColor: string
      cards: number
      effects?: Array<{
        id: string
        name: string
        description: string
        trigger: 'on-score' | 'on-win-trick' | 'on-lead' | 'passive'
        scoreModifier?: number
        actions?: Array<{
          type: 'draw-card' | 'block-card' | 'shift-turn' | 'protect-points'
          target: 'self' | 'next-player' | 'winner' | 'table'
          value?: number
          label: string
        }>
        priority: number
      }>
    }>
  }
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
  ownedQuantity: number
  canSend: boolean
  helperText: string
}

export interface LiveSnapshot {
  activeStreamId: string | null
  streams: StreamSnapshot[]
  chatMessages: LiveChatEntrySnapshot[]
  gifts: LiveGiftSnapshot[]
  clips: CreatorClipSnapshot[]
  creator: LiveCreatorSnapshot | null
  giftOptions: LiveGiftOptionSnapshot[]
  wallet: {
    coins: string
    gems: string
  }
}

export interface LiveCallParticipantSnapshot {
  id: string
  userId: string
  displayName: string
  handle: string
  avatar: string
  isMe?: boolean
  isHost?: boolean
  microphoneEnabled: boolean
  cameraEnabled: boolean
  joinedAt: string
  stateLabel: string
}

export interface LiveCallSignalSnapshot {
  id: string
  fromParticipantId: string
  toParticipantId: string
  type: 'offer' | 'answer' | 'ice'
  payload: unknown
  createdAt: string
}

export interface LiveCallStateSnapshot {
  streamId: string
  streamTitle: string
  rtcEnabled: boolean
  note: string | null
  myParticipantId: string | null
  participants: LiveCallParticipantSnapshot[]
}

export interface LiveCallIceServerSnapshot {
  urls: string[]
  username?: string
  credential?: string
}

export interface LiveCallConfigSnapshot {
  rtcEnabled: boolean
  mode: 'disabled' | 'stun-only' | 'turn+stun'
  hasTurnServer: boolean
  note: string
  iceServers: LiveCallIceServerSnapshot[]
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

export interface CardVisualOverrideSnapshot {
  templateId: string | null
  templateName: string | null
  sourceScope: 'base' | 'deck' | 'card' | 'suit' | 'module' | 'element'
  sourceTarget: string | null
  appliedTemplateIds: string[]
  styleId: string | null
  styleName: string
  colors: string | null
  artwork: CardArtworkSnapshot | null
  zoom: number
  rotation: number
  offsetX: number
  offsetY: number
}

export interface DeckTemplateSnapshot {
  id: string
  name: string
  styleId: string | null
  styleName: string
  scope: 'deck' | 'card' | 'suit' | 'module' | 'element'
  targetCard: string | null
  targetSuit: string | null
  targetModule: string | null
  targetElement: string | null
  zoom: number
  rotation: number
  offsetX: number
  offsetY: number
  isEquipped: boolean
  artwork: CardArtworkSnapshot | null
  updatedAt: string
}

export interface CardVisualOverrideEntrySnapshot extends DeckTemplateSnapshot {
  deckKey: string
  sourceTemplateId: string | null
  sourceTemplateName: string | null
}

export interface CardCreatorCardSnapshot {
  displayName: string
  username: string
  roleLine: string
  initials: string
  followers: string
  level: string
  templatesCount: number
  artworksCount: number
  activeTemplateName: string
  equippedStyleName: string
  focusLabel: string
  activityLabel: string
}

export interface CardDeckKeySnapshot {
  key: string
  name: string
  styleId: string | null
  isDefault?: boolean
  isEquipped?: boolean
}

export interface CardCustomizationSnapshot {
  coins: string
  gems: string
  activeDeckKey: string
  deckOptions: CardDeckKeySnapshot[]
  deckComparisons: Array<{
    deckKey: string
    deckName: string
    isActive: boolean
    isDefault?: boolean
    overrides: CardVisualOverrideEntrySnapshot[]
  }>
  styles: DeckStyleSnapshot[]
  templates: DeckTemplateSnapshot[]
  visualOverrides: CardVisualOverrideEntrySnapshot[]
  artworks: CardArtworkSnapshot[]
  deckModules: Array<{
    id: string
    name: string
    type: string
    element?: string
    themeColor: string
    cards: number
    previewCards: GameCardSnapshot[]
    effects: Array<{
      id: string
      name: string
      description: string
      trigger: 'on-score' | 'on-win-trick' | 'on-lead' | 'passive'
      scoreModifier?: number
      actions?: Array<{
        type: 'draw-card' | 'block-card' | 'shift-turn' | 'protect-points'
        target: 'self' | 'next-player' | 'winner' | 'table'
        value?: number
        label: string
      }>
      priority: number
    }>
  }>
  creatorCard: CardCreatorCardSnapshot
  editor: {
    activeTemplateId: string | null
    templateName: string
    styleId: string | null
    artworkId: string | null
    scope: 'deck' | 'card' | 'suit' | 'module' | 'element'
    targetCard: string | null
    targetSuit: string | null
    targetModule: string | null
    targetElement: string | null
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

export type ShellSnapshot = Pick<AppSnapshot, 'currentUser' | 'presence' | 'dashboard' | 'profile'>

export interface CreateRoomPayload {
  name: string
  mode: 'normal' | 'ranked' | 'tournament'
  isPublic: boolean
  botCount: number
  tableMode?: 'classic-hearts' | 'custom-table'
  targetPlayers?: number
}
