## Overview

This issue proposes adding online multiplayer support to Monster Ghost Army Cards, enabling players to battle remotely in real-time. The game currently supports 2-8 players in local play and needs a robust online system that maintains game integrity while providing a smooth user experience.

## Game Requirements

### Core Mechanics to Support Online
- **Turn-based gameplay**: Sequential turns (not real-time) - naturally tolerant of network latency
- **Draft phase**: 10 rounds of synchronized card selection from a shared pool
- **Battle phase**: Attack/defense sequences with element-based damage calculations
- **Special abilities**: Limited-use moves requiring state tracking across all clients
- **2-8 players**: Variable player count affecting ability usage limits

### Technical Constraints
- GitHub Pages hosting (static site only)
- State synchronization across all players
- Reconnection support after disconnection
- Anti-cheat validation for critical operations
- Mobile-responsive design

---

## Architecture Options Evaluated

### Option A: Peer-to-Peer (WebRTC)
| Aspect | Rating |
|--------|--------|
| Complexity | HIGH |
| Cost | LOW ($5-20/mo for TURN server) |
| Scalability | LOW |
| Anti-cheat | POOR (host controls state) |

**Verdict**: Too complex for benefits; NAT traversal issues; host has cheat potential.

### Option B: Centralized Server (Node.js + Socket.io)
| Aspect | Rating |
|--------|--------|
| Complexity | MEDIUM |
| Cost | MEDIUM ($5-50/mo) |
| Scalability | HIGH |
| Anti-cheat | EXCELLENT |

**Verdict**: Best for production quality, but requires server infrastructure.

### Option C: Serverless (Firebase Realtime Database)
| Aspect | Rating |
|--------|--------|
| Complexity | LOW-MEDIUM |
| Cost | LOW (generous free tier) |
| Scalability | HIGH |
| Anti-cheat | MODERATE (Security Rules limited) |

**Verdict**: Works with GitHub Pages; quick to implement; free for moderate usage.

### Option D: Turn-Based REST API (Supabase/Cloudflare Workers)
| Aspect | Rating |
|--------|--------|
| Complexity | LOW |
| Cost | FREE-LOW |
| Scalability | MEDIUM-HIGH |
| Anti-cheat | GOOD (server validates) |

**Verdict**: Simple and cheap; good for async play; less "live" feeling.

---

## Recommended Architecture: Hybrid (C + D)

A hybrid approach combining **Firebase Realtime Database** for synchronization with **Cloudflare Workers** for complex game logic validation.

```
+------------------+     +-------------------+     +------------------+
|   GitHub Pages   |<--->|   Firebase RT DB  |<--->| Cloudflare       |
|   (Static Site)  |     |   (Sync & State)  |     | Workers (Logic)  |
+------------------+     +-------------------+     +------------------+
```

### Why This Architecture

1. **Firebase Realtime DB** handles:
   - Room creation/joining with share codes
   - Real-time state synchronization
   - Basic Security Rules for turn enforcement
   - Presence detection (online status)

2. **Cloudflare Workers** handles:
   - Secure random number generation (draft order)
   - Complex damage calculations (server-validated)
   - Anti-cheat validation for special moves

3. **GitHub Pages** serves:
   - All static assets (HTML, CSS, JS)
   - Card data and images

### Monthly Cost: $0
- Firebase Spark (free): 50K reads, 20K writes/day
- Cloudflare Workers free: 100K requests/day
- GitHub Pages: Free

---

## Implementation Phases

### Phase 1: Core Foundation (2-3 weeks)
- [ ] Firebase project setup and SDK integration
- [ ] Room creation with shareable 6-character codes
- [ ] Join room by code functionality
- [ ] Player presence (online/offline detection)
- [ ] Basic lobby UI with player list
- [ ] Host controls (start game, kick player)

### Phase 2: Draft Phase Online (1-2 weeks)
- [ ] Synchronized card pool display
- [ ] Server-validated random draft order
- [ ] Turn-based card selection with turn indicator
- [ ] Card pool updates in real-time
- [ ] Disconnection handling (skip turn after timeout)

### Phase 3: Battle Phase Online (2-3 weeks)
- [ ] Turn order synchronization
- [ ] Attack selection and target picking
- [ ] Defense response handling
- [ ] Server-validated damage calculations
- [ ] Special ability tracking (bounce back, teleport, etc.)
- [ ] Card HP synchronization
- [ ] Player elimination detection
- [ ] Victory/defeat screens

### Phase 4: Polish and Anti-Cheat (1-2 weeks)
- [ ] Reconnection with state recovery
- [ ] Game state validation on rejoin
- [ ] Rate limiting API calls
- [ ] Input sanitization
- [ ] Cheat detection logging
- [ ] Connection quality indicator

### Phase 5: Enhanced Features (Optional)
- [ ] Matchmaking queue (find random opponents)
- [ ] Player rankings / ELO system
- [ ] Friend lists and invites
- [ ] Spectator mode
- [ ] Game replays / history
- [ ] Turn time limits (configurable per room)

---

## Technical Requirements

### Frontend Changes
```javascript
// New modules needed
js/
  multiplayer/
    firebase-config.js   // Firebase initialization
    room.js              // Room create/join/leave
    sync.js              // State synchronization
    presence.js          // Online status tracking
    validation.js        // Client-side validation
```

### Firebase Data Model
```javascript
{
  "games": {
    "ABC123": {
      "status": "lobby|drafting|battle|finished",
      "hostId": "player_uid",
      "players": {
        "uid1": { "name": "...", "cards": [...], "connected": true }
      },
      "currentTurn": "uid1",
      "turnOrder": ["uid1", "uid2", "uid3"],
      "cardPool": [...],
      "battleState": { "attacker": null, "defender": null },
      "settings": { "maxPlayers": 4, "turnTimeLimit": 60 }
    }
  }
}
```

### Security Rules (Firebase)
```javascript
{
  "rules": {
    "games": {
      "$roomId": {
        // Only current turn player can modify game state
        ".write": "auth != null && data.child('currentTurn').val() === auth.uid",
        // All authenticated users can read
        ".read": "auth != null"
      }
    }
  }
}
```

---

## Open Questions

1. **Authentication**: Anonymous play vs. accounts?
   - Anonymous: Lower friction, no persistent stats
   - Accounts: Rankings, friend lists, but more setup

2. **Turn timers**: Enforce time limits per turn?
   - Prevents stalling but may frustrate
   - Could be a room setting (casual vs. competitive)

3. **Spectator mode**: Priority for v1?
   - Great for streaming/content creation
   - Adds complexity; defer to Phase 5?

4. **Private vs. public games**:
   - Start with private room codes only?
   - Public matchmaking is more complex

5. **Mobile app wrapper**: Plan for PWA or native?
   - PWA gives app-like experience easily
   - React Native wrapper for later?

---

## Acceptance Criteria

- [ ] Players can create and join rooms via 6-character codes
- [ ] 2-8 players can complete a full game online
- [ ] Game state remains synchronized across all clients
- [ ] Disconnected players can rejoin and recover state
- [ ] No client can manipulate game state to cheat
- [ ] Works on mobile browsers (responsive)
- [ ] Latency < 500ms for state updates

---

## Estimated Effort

| Phase | Duration | Priority |
|-------|----------|----------|
| Phase 1: Foundation | 2-3 weeks | P0 |
| Phase 2: Draft | 1-2 weeks | P0 |
| Phase 3: Battle | 2-3 weeks | P0 |
| Phase 4: Polish | 1-2 weeks | P1 |
| Phase 5: Enhanced | 2+ weeks | P2 |
| **Total MVP** | **6-10 weeks** | |

---

## Related Resources

- [Firebase Realtime Database Docs](https://firebase.google.com/docs/database)
- [Firebase Security Rules Guide](https://firebase.google.com/docs/database/security)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- Detailed proposal: `notes/multiplayer-proposal.md`
