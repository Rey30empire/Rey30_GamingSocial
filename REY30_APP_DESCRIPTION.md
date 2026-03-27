# REY30VERSE - Plataforma Social Gaming

## Overview

**REY30VERSE** es una plataforma social gaming que combina comunidad, streaming, salas competitivas y personalizacion de cartas en una sola experiencia premium.

---

## Style Guide

- **Theme**: Dark mode with neon purple and blue gradients
- **Aesthetic**: Cyberpunk / Futuristic
- **Elements**: Glowing effects, high detail, modern UI/UX
- **Layout**: Clean but dynamic, premium look
- **Colors**:
  - Primary: Deep purples and blues (navy, indigo, violet)
  - Accent: Bright neon pink/magenta and cyan
  - Background: Almost black (#0a0a0a) with subtle gradients
  - Text: White and light gray for contrast
  - Interactive elements: Purple buttons and cyan highlights

---

## Main Features

### 1. SOCIAL FEED
- Infinite scroll feed like TikTok/Instagram
- Live streams with viewer count
- Posts with videos, photos, reactions, comments, share
- Profile cards with followers, stats, and badges

### 2. CHAT SYSTEM
- Global chat
- Private chat
- Group chat
- Game room chat
- Voice and video call UI
- Emoji drag and drop reactions

### 3. GAMING SYSTEM
- Online matchmaking system
- Create room / Join room UI
- Invite friends system
- Offline mode vs bots
- Bot difficulty selector (1-3 bots, mixed with humans)

### 4. CARD GAME INTERFACE
- Custom card game inspired by Crown Clash
- Crowns = 1 point each
- Queen of Spades = 13 points
- Table with 4 players
- Player hand visible with responsive layout
- Drag & drop cards / double click play
- Voice chat inside game
- Emoji reactions during gameplay

### 5. CARD CUSTOMIZATION
- Card editor UI
- Upload image to replace card design
- Crop and adjust image
- Apply to single card or entire deck
- 10 different card styles (neon, anime, minimal, cosmic, etc.)

### 6. MARKETPLACE
- Store for card decks and addons
- Gift system (pulses, diamonds, crowns, animated gifts)
- Send gifts during live streams or games

### 7. LIVE & STREAMING
- Live video interface
- Real-time chat overlay
- Gifts animation popping on screen

---

## UI Details

- Responsive layout (mobile + desktop)
- Adjustable game table (zoom, resize cards)
- Floating menus and smooth transitions
- Icons glowing neon style
- Multi-column layout with overlapping elements
- Central focus on primary content
- Sidebars for secondary information
- Modular components that can be rearranged

---

## Visual Elements

- Multiple screens in one view (dashboard, chat, game table, editor)
- Attractive streamers with headset
- Clean typography
- High resolution, ultra detailed
- Dark background with neon accents
- Gaming-specific symbols (cards, dice, controllers)
- User avatars with circular frames
- Animated elements suggesting interactivity
- Gradient effects on buttons and cards

---

## Technical Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 with shadcn/ui
- **Database**: Prisma ORM (SQLite)
- **Real-time**: SSE event stream for chat and game synchronization
- **State Management**: Zustand for client state

---

## Navigation Structure

1. **Home/Feed** - Main social feed with posts and live streams
2. **Chat** - Global, private, and group messaging
3. **Games** - Game lobby, matchmaking, and active games
4. **Marketplace** - Card decks, gifts, and addons
5. **Profile** - User stats, achievements, and customization

---

*REY30VERSE - Donde el juego se vuelve comunidad*
