# Online Multiplayer System Design Proposal

## Overview

This proposal outlines the architecture and implementation strategy for adding online multiplayer support to Monster Ghost Army Cards. The game currently supports 2-8 players in local play and needs a robust online system that maintains game integrity while providing a smooth user experience.

## Game Requirements Analysis

Before evaluating architectures, we need to understand the specific requirements:

### Core Game Mechanics
- **Turn-based gameplay**: Players take sequential turns (not real-time)
- **Draft phase**: 10 rounds of card selection from shared pool
- **Battle phase**: Attack/defense sequences with element-based damage calculations
- **Special abilities**: Limited-use moves that need tracking (black hole, summon ghost army, bounce back, teleport)
- **2-8 players**: Variable player count affects ability usage limits

### Technical Requirements
- **GitHub Pages hosting**: Static site only - no server-side code on the main deployment
- **State synchronization**: All players must see consistent game state
- **Reconnection support**: Players should be able to rejoin after disconnection
- **Anti-cheat measures**: Card draws, damage calculations must be verifiable
- **Mobile support**: Responsive design with touch-friendly UI

---

## Architecture Options

### Option A: Peer-to-Peer with WebRTC

**Description**: Players connect directly to each other using WebRTC data channels. One player acts as the "host" who manages game state.

**How it works**:
1. Host creates a room and gets a shareable code (via a signaling server)
2. Other players join using the code
3. Host's browser maintains authoritative game state
4. State changes broadcast to all peers via data channels

**Pros**:
- No ongoing server costs after initial connection
- Low latency for established connections
- Works well for small groups (2-8 players is ideal for P2P)
- Data stays between players (privacy)

**Cons**:
- NAT traversal issues (may need TURN server fallback)
- Host has cheat potential (they control game state)
- Host disconnection ends the game for everyone
- Complex to implement reliable mesh networking
- Requires a signaling server for initial connection (though can be lightweight)

**Complexity**: HIGH (WebRTC is notoriously complex)
**Cost**: LOW (signaling server can be free tier; TURN server ~$5-20/month if needed)
**Scalability**: LOW (each game is isolated, but concurrent games limited by signaling server)

**Best for**: Tech-savvy users who want maximum privacy and can tolerate occasional connection issues

---

### Option B: Centralized Server (Node.js + Socket.io)

**Description**: A dedicated game server handles all game logic and state. Clients connect via WebSockets.

**How it works**:
1. Server creates game rooms and manages matchmaking
2. All game actions sent to server for validation
3. Server broadcasts state updates to all players
4. Server is the single source of truth

**Pros**:
- Authoritative server prevents most cheating
- Reliable connections (no P2P NAT issues)
- Host migration not needed (server is always "up")
- Easier to implement spectator mode, replays
- Can add matchmaking, rankings, persistence

**Cons**:
- Requires hosting and maintenance
- Ongoing server costs (scales with usage)
- Single point of failure (server outage = no games)
- Latency to server (though turn-based games are forgiving)
- Cannot run on GitHub Pages alone

**Complexity**: MEDIUM (Socket.io is well-documented)
**Cost**: MEDIUM ($5-50/month depending on scale, free tiers available)
  - Render.com free tier: Good for development
  - Railway.app: ~$5/month for small apps
  - DigitalOcean: ~$12/month for basic droplet
  - Heroku: $5-7/month for eco dynos
**Scalability**: HIGH (can scale horizontally with Redis pub/sub)

**Best for**: Production-quality multiplayer with anti-cheat priorities

---

### Option C: Serverless (Firebase Realtime Database)

**Description**: Use Firebase's Realtime Database or Firestore as the shared state store. Security rules validate moves.

**How it works**:
1. Game room created as a Firebase document
2. Players subscribe to real-time updates
3. Firebase Security Rules validate move legality
4. Client-side code reads and writes game state

**Pros**:
- No server code to maintain
- Firebase handles scaling automatically
- Real-time sync out of the box
- Security Rules can validate basic game logic
- Works seamlessly with GitHub Pages (client-side only)
- Free tier is generous (50K reads, 20K writes/day)

**Cons**:
- Security Rules have limitations (complex game logic may not fit)
- Firebase vendor lock-in
- Costs can spike with high usage
- Limited ability to run complex validation logic
- No server-side random number generation (draft order, etc.)

**Complexity**: LOW-MEDIUM
**Cost**: LOW (free tier likely sufficient for moderate use)
  - Spark (free): 50K reads, 20K writes, 1GB storage/day
  - Blaze (pay-as-go): ~$0.06/100K reads, $0.18/100K writes
**Scalability**: HIGH (Firebase handles this)

**Best for**: Quick MVP, moderate anti-cheat needs, GitHub Pages compatibility

---

### Option D: Turn-Based with Simple REST API

**Description**: Treat the game as purely turn-based with polling or long-polling to a REST API. State stored in a simple database.

**How it works**:
1. REST API (serverless functions) handles game actions
2. Clients poll for state changes (or use server-sent events)
3. Each turn is a discrete API call
4. Simple database (e.g., MongoDB Atlas, Supabase) stores game state

**Pros**:
- Simple to understand and debug
- Works with serverless functions (Vercel, Netlify, Cloudflare Workers)
- Can be very cheap or free
- Easy to add features (save games, replay, async play)
- Supabase offers Postgres + Realtime subscriptions

**Cons**:
- Polling adds latency (or complexity with SSE/WebSockets)
- More round trips than WebSocket approach
- Need to handle race conditions carefully
- Less "live" feeling than real-time solutions

**Complexity**: LOW
**Cost**: LOW-FREE (Supabase free tier: 500MB DB, unlimited API calls)
**Scalability**: MEDIUM-HIGH (depends on backend choice)

**Best for**: MVP development, async/casual play style, budget-conscious deployment

---

## Recommendation: Hybrid Approach (Option C + Option D)

Given the project constraints (GitHub Pages hosting, 2-8 players, turn-based gameplay), I recommend a **hybrid approach** combining Firebase Realtime Database for synchronization with Supabase or Cloudflare Workers for complex game logic validation.

### Recommended Architecture

```
+------------------+     +-------------------+     +------------------+
|   GitHub Pages   |     |    Firebase RT    |     |  Cloudflare      |
|   (Static Site)  |<--->|    Database       |<--->|  Workers         |
+------------------+     +-------------------+     +------------------+
        |                        |                        |
        |  1. Load game UI       |  2. Real-time sync     |  3. Validate
        |                        |     game state         |     complex moves
        |                        |                        |
        v                        v                        v
+------------------------------------------------------------------------+
|                           Player Browsers                               |
+------------------------------------------------------------------------+
```

### Why This Architecture

1. **Firebase Realtime DB** handles:
   - Room creation and joining
   - Real-time state synchronization
   - Basic Security Rules for turn enforcement
   - Presence detection (who's online)

2. **Cloudflare Workers** (or similar) handles:
   - Secure random number generation (draft order)
   - Complex damage calculations (server-validated)
   - Anti-cheat validation for special moves
   - Optional: game history/replays

3. **GitHub Pages** serves:
   - All static assets
   - Game UI and client logic
   - Card data and images

### Cost Estimate (Monthly)
- Firebase: $0 (free tier sufficient for ~100 daily games)
- Cloudflare Workers: $0 (free tier: 100K requests/day)
- GitHub Pages: $0
- **Total: $0 for moderate usage**

---

## Implementation Phases

### Phase 1: Core Multiplayer Foundation (2-3 weeks)
- [ ] Firebase project setup and configuration
- [ ] Room creation and join with codes
- [ ] Basic state synchronization
- [ ] Player presence detection
- [ ] Simple lobby UI

### Phase 2: Draft Phase Online (1-2 weeks)
- [ ] Synchronized card pool display
- [ ] Turn-based card selection
- [ ] Server-validated random draft order
- [ ] Disconnection handling during draft

### Phase 3: Battle Phase Online (2-3 weeks)
- [ ] Real-time attack/defense selection
- [ ] Server-validated damage calculations
- [ ] Special ability tracking across players
- [ ] Victory/defeat conditions

### Phase 4: Polish and Anti-Cheat (1-2 weeks)
- [ ] Reconnection support
- [ ] Game state recovery
- [ ] Input validation
- [ ] Rate limiting
- [ ] Cheat detection logging

### Phase 5: Enhanced Features (Optional, 2+ weeks)
- [ ] Matchmaking queue
- [ ] Player rankings/ELO
- [ ] Friend lists
- [ ] Spectator mode
- [ ] Game replays

---

## Technical Requirements

### Frontend Changes
- WebSocket/Firebase SDK integration
- State management refactoring for remote sync
- Loading states and connection indicators
- Error handling for network issues
- Mobile-responsive multiplayer UI

### Backend Services
- Firebase Realtime Database (or Firestore)
- Firebase Authentication (anonymous or social login)
- Cloudflare Workers for game logic validation
- (Optional) Firebase Cloud Functions for complex operations

### Security Considerations
- Firebase Security Rules to enforce turn order
- Server-side validation for all game-critical operations
- Rate limiting on API calls
- Input sanitization
- Prevent state manipulation via browser DevTools

### Data Model (Firebase)

```javascript
{
  "games": {
    "ROOM_CODE": {
      "status": "lobby|drafting|battle|finished",
      "players": {
        "player_uid": {
          "name": "Player 1",
          "cards": [...],
          "connected": true,
          "lastSeen": timestamp
        }
      },
      "currentTurn": "player_uid",
      "turnOrder": ["uid1", "uid2", ...],
      "cardPool": [...],  // During draft
      "battleState": {
        "attacker": null,
        "defender": null,
        "pendingDefense": false
      },
      "gameLog": [...],
      "createdAt": timestamp,
      "settings": {
        "maxPlayers": 4,
        "turnTimeLimit": 60
      }
    }
  }
}
```

---

## Open Questions

1. **Authentication**: Anonymous play only, or require accounts?
   - Anonymous is simpler but can't persist stats
   - Accounts enable rankings but add friction

2. **Turn timers**: Should turns have time limits?
   - Prevents stalling but may frustrate players
   - Could be a room setting (casual vs. competitive)

3. **Spectator mode**: Priority for initial release?
   - Adds complexity but great for content creators
   - Could be Phase 5 feature

4. **Private vs. public games**: Both, or just private codes?
   - Public requires matchmaking logic
   - Private codes are simpler and may be sufficient initially

5. **Mobile app**: Should we plan for React Native wrapper?
   - Web-first is simpler
   - PWA could provide app-like experience

6. **Persistence**: Save incomplete games for later?
   - Requires database storage beyond real-time sync
   - Good for async play but adds complexity

---

## Estimated Complexity

| Component | Effort | Risk |
|-----------|--------|------|
| Firebase setup | Low | Low |
| Room management | Medium | Low |
| Draft sync | Medium | Medium |
| Battle sync | High | Medium |
| Anti-cheat | High | High |
| Reconnection | Medium | Medium |
| Mobile support | Low | Low |
| **Total** | **6-10 weeks** | **Medium** |

---

## Next Steps

1. Create Firebase project and configure for web
2. Implement basic room creation/joining
3. Build lobby UI with player list
4. Test synchronization with 2 players
5. Iterate on remaining phases

---

## References

- [Firebase Realtime Database Docs](https://firebase.google.com/docs/database)
- [Firebase Security Rules](https://firebase.google.com/docs/database/security)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Socket.io (alternative)](https://socket.io/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
