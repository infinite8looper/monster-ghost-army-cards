# Session Notes: Turn Order Randomization Fix

## Date: 2026-01-03

## Problem
The drafting order randomization was increasing disparities between players by re-randomizing the turn order for each draft round.

## Solution Implemented
Established a single randomized turn order at game start that is used consistently for:
1. ALL drafting rounds (round-robin style)
2. ALL battle rounds

## Changes Made

### 1. js/setup.js
- Added `turnOrder` property to `setupState`
- Added `shuffleArray()` function (Fisher-Yates algorithm)
- Modified `handleStartGame()` to:
  - Generate randomized turn order ONCE after player configuration
  - Include `turnOrder` in the `gameSetupComplete` event detail

### 2. js/game.js
- Modified `handleGameSetupComplete()` to:
  - Accept `turnOrder` from event detail
  - Store it in `gameState.turnOrder`
  - Pass it to `startDraftingPhase()`
  - Log the turn order
- Modified `handleDraftingComplete()` to:
  - Use the already-established `gameState.turnOrder` instead of re-randomizing
  - Log that battle uses the same turn order as drafting

### 3. js/drafting.js
- Added `turnOrder` property to `draftingState`
- Modified `startDraftingPhase()` to:
  - Accept optional `turnOrder` parameter
  - Store the fixed turn order
  - Call new `setRoundOrderFromTurnOrder()` instead of `generateRoundOrder()`
- Added new function `setRoundOrderFromTurnOrder()`:
  - Maps turn order indices to player objects
  - Used for ALL rounds
- Modified `advanceTurn()` to:
  - NOT re-randomize at end of each round
  - Simply reset `currentPlayerIndex` to 0 for next round

### 4. how-to-play.html
- Updated Drafting Phase section:
  - Changed "Random Order" to "Turn Order Established"
  - Explains turn order is generated ONCE and used for all rounds
- Updated Battle Phase section:
  - Explains turn order carries over from drafting

## Key Design Decisions
- Turn order is an array of indices into the players array
- Same order is used everywhere for consistency
- Round-robin style ensures fairness across all rounds
- Backwards-compatible: if no turnOrder provided, generates one as fallback

## Status: COMPLETE
All tasks completed successfully. Changes are ready for testing and commit.
