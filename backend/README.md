# Adventurer's Ledger - Backend

Backend API server for the D&D hex map and character management application.

## Tech Stack

- **Node.js** with **Express** and **TypeScript**
- **PostgreSQL** database with **Prisma** ORM
- **Socket.io** for real-time hex revelation
- **Google OAuth 2.0** for authentication
- **JWT** for session management

## Setup

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+
- Google OAuth credentials

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure `.env` with your credentials:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/adventurers_ledger"
JWT_SECRET="your-secret-key"
SESSION_SECRET="your-session-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3001/auth/google/callback"
FRONTEND_URL="http://localhost:5173"
```

4. Generate Prisma client and run migrations:
```bash
npm run prisma:generate
npm run prisma:migrate
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3001/auth/google/callback`
5. Copy Client ID and Client Secret to `.env`

## Development

Start the development server:
```bash
npm run dev
```

Server runs on `http://localhost:3001`

## API Endpoints

### Authentication
- `GET /auth/google` - Start Google OAuth flow
- `GET /auth/google/callback` - OAuth callback
- `GET /auth/me` - Get current user (requires Bearer token)
- `POST /auth/logout` - Logout

### Sessions
- `POST /api/sessions` - Create new session (DM only)
- `GET /api/sessions/campaign/:campaignId` - Get all campaign sessions
- `GET /api/sessions/campaign/:campaignId/active` - Get active session
- `GET /api/sessions/:sessionId` - Get session details
- `POST /api/sessions/:sessionId/start` - Start session (DM only)
- `POST /api/sessions/:sessionId/end` - End session (DM only)
- `POST /api/sessions/:sessionId/attendance` - Add player to session
- `DELETE /api/sessions/:sessionId/attendance/:playerId` - Remove player

## Socket.io Events

### Client → Server
- `join:session` - Join a session room
- `leave:session` - Leave session room
- `party:move` - Move party (DM only), reveals hexes

### Server → Client
- `session:state` - Current session state on join
- `player:joined` - Player joined session
- `player:left` - Player left session
- `hexes:revealed` - New hexes revealed
- `error` - Error message

## Database Schema

Key models:
- **User** - Players and DMs
- **Campaign** - Game campaigns
- **Character** - Player characters
- **Session** - Game sessions
- **SessionAttendance** - Track who attends each session
- **PlayerRevealedHex** - Per-player hex visibility
- **Map** - Hex maps with terrain data
- **PartyPosition** - Current party location

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio GUI

## Architecture

### Session-Based Hex Revelation

1. DM creates session and starts it
2. Players join session (tracked in `SessionAttendance`)
3. DM moves party → Server calculates visible hexes
4. Only **players present in session** get hex reveals via Socket.io
5. Each player's `PlayerRevealedHex` records persist their knowledge
6. Players who miss a session don't see those hexes (unless revisited)

### Real-Time Communication

- Socket.io manages campaign "rooms" (one per active session)
- When DM moves party, all connected players instantly see reveals
- Attendance tracking ensures offline players don't get updates
- Reconnecting players sync current session state
