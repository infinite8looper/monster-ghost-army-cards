# Missing Cards Tracking

## Overview
Date: 2026-01-01
**Status: RESOLVED** - All 96 original cards now extracted and in cards.json

### Problem
Original cards.json contained made-up card names (like "Balloon Beast", "Battery Bot")
that didn't match the actual hand-drawn cards.

### Solution
1. Used agents to analyze all 96 original images
2. Extracted actual card names, attacks, defenses, and abilities
3. Created new cards.json with correct data
4. Started image generation for 65 new cards (~20 min)

## Cards Already in Database (from user's list)
- [x] light combined demons (id: light_combined_demons)
- [x] uber-candle (id: uber_candle)
- [x] extreme ultra spike hurler (id: extreme_ultra_spike_hurler)
- [x] elemental trio fire starter (id: elemental_trio_fire_starter)
- [x] orange slice juice-spitter (id: orange_slice_juice_spitter)

## Cards To Add (truly missing)
Status: pending | in_progress | extracted | added | generated

| # | Card Name | Status | Image File | Notes |
|---|-----------|--------|------------|-------|
| 1 | dreidel-of-doom | pending | | |
| 2 | sparkler foe | pending | | |
| 3 | music dude | pending | | |
| 4 | guac gobbler | pending | | |
| 5 | universe spike wall | pending | | |
| 6 | water spike wall | pending | | |
| 7 | lego wall | pending | | |
| 8 | fire spike wall | pending | | |
| 9 | sweet pea shooter | pending | | |
| 10 | snail trail | pending | | |
| 11 | plant spike wall | pending | | |
| 12 | earth spike wall | pending | | |
| 13 | galaxy black hole | pending | | |
| 14 | H13253312 | pending | | weird name - verify |
| 15 | inner core monster | pending | | |
| 16 | deadly top hat | pending | | |
| 17 | sumerween trickster | pending | | |
| 18 | miniature mini | pending | | |
| 19 | 2 combined infinite | pending | | |
| 20 | rainbow dazzle | pending | | different from rainbow_dash |
| 21 | stink flower | pending | | |
| 22 | poison shooter | pending | | |
| 23 | black hole tornado | pending | | |
| 24 | ultra fog lurker | pending | | |
| 25 | beaked ghost 2.0 | pending | | |
| 26 | universe elemental | pending | | |
| 27 | ultra fire fog lurker | pending | | |
| 28 | pacifier shooter | pending | | |
| 29 | upside-down rainbow ghost | pending | | |
| 30 | kaya-rey-z (crazy) eyes | pending | | |
| 31 | catadorable monster | pending | | |
| 32 | elemental trio water lurker | pending | | |
| 33 | rude dude | pending | | |
| 34 | fog slurper | pending | | |
| 35 | grumpy brow squiggle mouth | pending | | |
| 36 | ribboner | pending | | |
| 37 | elemental trio earth shaker | pending | | |
| 38 | razor clam boss | pending | | |
| 39 | dixie whistler | pending | | |
| 40 | syrup guzzler | pending | | |
| 41 | cactus monster | pending | | |
| 42 | ultra bouncy ball | pending | | |
| 43 | brain blaster | pending | | |
| 44 | technology demons | pending | | |
| 45 | squelcher | pending | | |
| 46 | Toucan-like Toucan Monster | pending | | |
| 47 | Chamoghost | pending | | |
| 48 | slurping earthquake | pending | | |
| 49 | frozenly frigid | pending | | |
| 50 | banana man | pending | | |
| 51 | pooper dooper | pending | | |
| 52 | monstah thump | pending | | |
| 53 | sslithering ssnake poissson | pending | | |
| 54 | solar-powered earwig ghost | pending | | |
| 55 | ghost dodger | pending | | |

## Image Quality Issues to Fix
| Card | Issue | Status |
|------|-------|--------|
| rainbow_dash | Too cartoony, looks like My Little Pony | pending |
| ice_cream_flinger | Looks like ice cream cone, not a monster | pending |

## Process
1. Use Gemini to analyze all 96 original images
2. Extract card names and powers from each image
3. Match to user's missing list
4. Add missing cards to cards.json
5. Generate images for new cards
6. Regenerate problem images

## Progress Log
- 2026-01-01: Created tracking document
- 2026-01-01: Extracted all 96 cards from original images using 4 parallel agents
- 2026-01-01: Created new cards.json with correct card data
- 2026-01-01: Started image generation for 65 new cards (running in background)
- Log file: /tmp/sd_generate_new.log
- Check progress: `grep -E "^\[|SUCCESS|ERROR" /tmp/sd_generate_new.log | tail -30`
- Check count: `ls assets/images/generated/*.png | wc -l`

## Key Cards Verified
All 55+ cards from user's list are now in cards.json:
- dreidel-of-doom ✓
- sparkler foe ✓
- music dude ✓
- guac gobbler ✓
- spike walls (universe, water, lego, fire, plant, earth) ✓
- sweet pea shooter ✓
- snail trail ✓
- galaxy black hole ✓
- innercore monster ✓
- deadly top hat ✓
- sumerween trickster ✓
- 2 combined infinite ✓
- stink flower ✓
- poison shooter ✓
- ultra fog lurker ✓
- beaked ghost 2.0 ✓
- universe elemental ✓
- ultra fire fog lurker ✓
- pacifier shooter ✓
- upside-down rainbow ghost ✓
- kaya-rey-z eyes ✓
- catadorable monster ✓
- elemental trio (water lurker, earth shaker, fire starter) ✓
- rude dude ✓
- fog slurper ✓
- grumpy brow squiggle mouth ✓
- ribboner ✓
- razor clam boss ✓
- dixie whistler ✓
- syrup guzzler ✓
- cactus monster ✓
- ultra bouncy ball (as Ultra Bounce) ✓
- brain blaster ✓
- technology demons ✓
- squelcher ✓
- toucan monster ✓
- chamoghost ✓
- frozenly frigid ✓
- banana man ✓
- pooper dooper ✓
- monstah thump ✓
- sslithering snake poison ✓
- solar-powered earwig ghost ✓
- ghost dodger ✓
- extreme ultra spike hurler ✓
- orange slice juice-spitter ✓
