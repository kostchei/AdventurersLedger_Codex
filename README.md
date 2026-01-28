# Adventurer's Ledger Codex

A D&D 5e campaign management and hex exploration application with unique per-player session-based fog of war.

## Features

### 🗺️ Session-Based Hex Exploration
- **Per-player fog of war** - Each player sees only hexes from sessions they attended
- **Persistent memory** - If you miss Session 5, you never see what was revealed
- **Real-time updates** - Connected players see map updates instantly via WebSocket
- **6-mile hex grid** - Configurable visibility based on terrain (1-3 hex range)

### ⚔️ D&D 5e Character Management
- Character creation wizard with race/class selection
- Auto-calculated stats, modifiers, and proficiencies
- Level-up assistant for ability increases and new features
- Full character sheet with inventory and spells

### 📜 Campaign & Session Management
- Create campaigns as DM or join as player
- Track session attendance automatically
- Session history with notes and attendance records
- Active session management with online player tracking

### ⚡ Real-Time Features
- Live hex revelation when DM moves party
- Online player status indicators
- Instant session updates via Socket.io

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Fast development and builds
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching and caching
- **Zustand** - Lightweight state management
- **Socket.io Client** - Real-time WebSocket
- **Tailwind CSS** - Utility-first styling

### Backend
- **Node.js** with Express and TypeScript
- **PostgreSQL** - Relational database
- **Prisma** - Type-safe ORM
- **Socket.io** - WebSocket server
- **Google OAuth 2.0** - Authentication
- **JWT** - Session tokens

## Project Structure

```
AdventurersLedger_Codex/
├── backend/                 # Node.js + Express API
│   ├── prisma/             # Database schema and migrations
│   │   └── schema.prisma   # Database models
│   ├── src/
│   │   ├── config/         # Configuration (DB, Passport, Socket.io)
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Auth middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript types
│   │   └── server.ts       # Entry point
│   └── package.json
│
├── frontend/               # React + TypeScript SPA
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── lib/            # API client
│   │   ├── store/          # Zustand stores
│   │   ├── hooks/          # Custom hooks
│   │   ├── types/          # TypeScript interfaces
│   │   └── App.tsx         # Root component
│   └── package.json
│
└── README.md              # This file
```

## Setup Instructions

### Prerequisites

- **Node.js 18+** and npm
- **PostgreSQL 15+**
- **Google OAuth credentials**

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd AdventurersLedger_Codex
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file (copy from `.env.example`):

```env
DATABASE_URL="postgresql://user:password@localhost:5432/adventurers_ledger"
PORT=3001
NODE_ENV=development

JWT_SECRET="your-super-secret-jwt-key"
SESSION_SECRET="your-super-secret-session-key"

GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="https://api.talekeeper.org/api/oauth2-redirect"

FRONTEND_URL="https://talekeeper.org"
```

Initialize database:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Start backend:

```bash
npm run dev
```

Backend runs on `http://localhost:3001`

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create `.env` file (copy from `.env.example`):

```env
VITE_API_URL=https://api.talekeeper.org
VITE_WS_URL=https://api.talekeeper.org
```

Start frontend:

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Navigate to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure:
   - Application type: **Web application**
   - Authorized redirect URIs: `https://api.talekeeper.org/api/oauth2-redirect`
6. Copy **Client ID** and **Client Secret** to backend `.env`

## Usage

### As a Dungeon Master

1. **Create Campaign** - Set up your adventure
2. **Create Session** - Start a new game session
3. **Invite Players** - Share campaign with your players
4. **Start Session** - Mark session as active
5. **Move Party** - Use map controls to move party token
6. **Reveal Hexes** - Hexes auto-reveal to attending players

### As a Player

1. **Join Campaign** - Accept DM's invitation
2. **Create Character** - Build your D&D 5e character
3. **Join Session** - Connect when game starts
4. **Explore Map** - See hexes revealed during sessions you attend
5. **Level Up** - Use wizard to level your character

## Key Database Models

### Session-Based Visibility System

```
Session → Created by DM for each game session
  ├─ SessionAttendance → Tracks which players are present
  └─ PlayerRevealedHex → Records hexes revealed to each player

When DM moves party:
  1. Calculate visible hexes (based on terrain)
  2. Get all attending players (SessionAttendance.isOnline = true)
  3. Create PlayerRevealedHex records for each player
  4. Broadcast via Socket.io to connected players
```

### Information Asymmetry

- Player A attends Sessions 1, 3, 5 → Sees hexes from those sessions
- Player B attends Sessions 2, 3, 4 → Sees different hexes
- Players who miss sessions have knowledge gaps

## API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - OAuth callback
- `GET /auth/me` - Get current user

### Sessions
- `POST /api/sessions` - Create session (DM only)
- `GET /api/sessions/campaign/:campaignId` - List sessions
- `GET /api/sessions/campaign/:campaignId/active` - Get active session
- `POST /api/sessions/:sessionId/start` - Start session (DM only)
- `POST /api/sessions/:sessionId/end` - End session (DM only)
- `POST /api/sessions/:sessionId/attendance` - Join session

### Socket.io Events
- `join:session` - Join session room
- `leave:session` - Leave session room
- `party:move` - Move party (DM only)
- `hexes:revealed` - New hexes revealed (broadcast)
- `player:joined` / `player:left` - Player connection updates

## Development Scripts

### Backend
```bash
npm run dev          # Development server with hot reload
npm run build        # Build for production
npm start            # Start production server
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open database GUI
```

### Frontend
```bash
npm run dev      # Development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Roadmap

- [x] Authentication with Google OAuth
- [x] Session management system
- [x] Per-player hex revelation tracking
- [x] Real-time Socket.io updates
- [x] Basic frontend structure
- [ ] Campaign CRUD operations
- [ ] Interactive hex map viewer
- [ ] Character creation wizard
- [ ] Level-up assistant
- [ ] Terrain-based visibility rules
- [ ] Mobile-responsive design
- [ ] PWA support

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.