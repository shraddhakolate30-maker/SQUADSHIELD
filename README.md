# SQUADSHIELD

**Protect the Player. Preserve the Gameplay.**

SQUADSHIELD is a gaming squad communication safety platform built for the **Nexconn Build Challenge 2026 (Gaming & Live Streams)**. It integrates the official `@nexconn/chat` Web SDK with real-time toxicity/spam detection and uninterrupted **Tactical Communication** so temporarily restricted players can keep coordinating match objectives (`Enemy Spotted`, `Need Backup`, `Move to B`, `Regroup`, `Defend Position`, `Healing Needed`) without permanent automated bans.

---

## Core Capabilities

1. **Landing Overview (`/src/screens/LandingScreen.tsx`)** — Product overview, interactive Tactical Restriction preview, and quick entry into the workspace.
2. **Gamer Dashboard (`/src/screens/DashboardScreen.tsx`)** — Player profile, presence toggle, active squad roster (`Vanguard Echo`), safety standing, and activity feed.
3. **Squad Chat & Tactical Communication (`/src/screens/SquadChatScreen.tsx`)** — Group chat powered by `@nexconn/chat` (with Local Demo fallback when disconnected/unconfigured), clear `Nexconn Live` vs `Local Demo` message attribution, and 6 always-enabled tactical callout buttons that bypass free-text restrictions and player mutes.
4. **Smart Moderation (`/src/screens/SmartModerationScreen.tsx`)** — Real-time rule analyzer checking configurable restricted terms, repeated spam, character flooding, and message burst thresholds with human-readable explanations.
5. **Moderator Queue (`/src/screens/ModeratorScreen.tsx`)** — Review flagged messages (`Approve`, `Dismiss`, or `Restrict Free-Text`), manage active temporary restrictions, review player appeals, and search moderation history. When connected to Nexconn, approving a held outgoing message dispatches it to the live group channel.
6. **Player Safety & Appeals (`/src/screens/SafetyScreen.tsx`)** — Per-player mute/block toggles, incident reporting, and moderation appeals workflow.

---

## Architecture

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Vite 8, Lucide React
- **Real-Time Messaging SDK:** `@nexconn/chat` (`^26.2.1`) via `NexconnChatAdapter` (`/src/services/nexconnAdapter.ts`)
- **Backend Server:** Express (`/server.ts`) executing on Node.js `>=22.12.0`
  - `GET /api/nexconn/status` — Safe configuration diagnostics (returns public App Key, area code, channel ID, and missing env var names; never exposes `NEXCONN_APP_SECRET`)
  - `POST /api/nexconn/token` — Server-side `SHA1(AppSecret + Nonce + Timestamp)` signing against Nexconn Platform API v4 (`/v4/auth/access-token/issue`)
  - `POST /api/nexconn/squad/ensure` — Creates/joins the `squad_vanguard_echo` group channel (`/v4/group-channel/create` & `/v4/group-channel/join`)

---

## Implementation Scope & Hackathon MVP Limitations

SQUADSHIELD clearly distinguishes live Nexconn functionality from client-side demo workflows:

### Live Backend + Nexconn SDK
- Server-side Nexconn access token issuance (`/api/nexconn/token`) and squad channel provisioning (`/api/nexconn/squad/ensure`) against `https://api.sg-light-api.com` (`SG` area code).
- Live group chat connection (`NCEngine.initialize`, `NCEngine.connect`), channel message sending (`GroupChannel.sendMessage`), incoming message reception (`MessageHandler.onMessageReceived`), and channel history retrieval (`BaseChannel.createMessagesQuery`).

### Client-Side Demo / MVP Limitations (Important)
1. **MVP Roster Allowlist Authentication:** `/api/nexconn/token` and `/api/nexconn/squad/ensure` do not use user login sessions or JWT authentication yet. Instead, this hackathon MVP restricts token issuance to a strict squad roster allowlist (`player_kael`, `player_nyx`, `player_vex`, `player_ryder`) and enforces per-IP rate limiting (15 requests/minute). Production deployments must verify an authenticated user session before minting Nexconn tokens.
2. **Client-Side Moderation & Restriction State:** Smart Moderation rules, temporary `Free-Text Restricted` cooldowns, mute/block filters, flagged queues, reports, and appeals are stored in browser React memory (`SquadShieldContext`) and are **not** server-enforced or persisted to a database. Refreshing the browser resets demo state.
3. **Test Player Identity Selector:** The Squad Chat screen includes a temporary test identity selector for the allowlisted demo players (`player_kael`, `player_nyx`, `player_vex`, and `player_ryder`). This selector is intended for hackathon testing only and is not a production authentication system.
---

## Environment Variables

Copy `.env.example` to `.env` and fill in your Nexconn credentials (never commit `.env`):

```env
# Host URL (optional, injected automatically in Cloud Run / AI Studio)
APP_URL="http://localhost:3000"

# Nexconn Web Chat SDK (Public Client Config - Safe for Browser)
VITE_NEXCONN_APP_KEY="YOUR_NEXCONN_APP_KEY"
VITE_NEXCONN_AREA_CODE="SG"
VITE_NEXCONN_SQUAD_CHANNEL_ID="squad_vanguard_echo"

# Nexconn Server API (Backend Only - NEVER expose NEXCONN_APP_SECRET to frontend)
NEXCONN_APP_KEY="YOUR_NEXCONN_APP_KEY"
NEXCONN_APP_SECRET="YOUR_NEXCONN_APP_SECRET"
NEXCONN_API_BASE_URL="https://api.sg-light-api.com"
NEXCONN_SQUAD_CHANNEL_ID="squad_vanguard_echo"
```

---

## Local Setup & Production Run

**Prerequisites:** Node.js `>=22.12.0` (required for native TypeScript execution in `node server.ts`).

```bash
# Install dependencies
npm install

# Run TypeScript type check
npm run lint

# Start development server (Express + Vite middleware on port 3000)
npm run dev

# Build frontend for production and run production server
npm run build
NODE_ENV=production npm start
```

---

## License

Licensed under the [Apache License 2.0](./LICENSE).
