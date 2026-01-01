# monster-ghost-army-cards
Join an epic clash monster/ghost armies with this deck building game! Supports 2--8 players.

# Rules
1. Each player selects 10 cards from the deck. Players take turns, over 10 rounds (random player order is drawn independently for each round); players can pick one available card during their selection turn, removing it from the pool. After selection, each player has constructed their army!
2. Turns proceed in rounds (order is randomized at the start and then continues in the same order for every subsequent round)
3. During each turn, a player selects one of their (remaining) cards as the attacker, and any card from any other player as the target.  This may affect the target, attacker's, or other cards' available health.
4. When a card's health reaches 0 (or below), it is removed from the game and returned to the deck.
5. When a player runs out of cards, they are out of the game.
6. The last remaining player wins.

# Cards
1. Some cards support multiple attacks or special moves; others have just a single option.
2. Each card comes with a built-in amount of hit points (average: 1M).
3. Each card comprises:
 - The name of the monster or ghost
 - Icons depecting which element(s) that card has (air, water, fire, earth, universe, plant, mecha, magic). Cards can contain either a single element or two complementary elements.
 - A fantasy-style image of the monster or ghost
 - A brief (1--2 sentences) fantasy-style "biography" of the monster or ghost, or a fantasty style "quote" about the monster or ghost, written as though it came from an ancient mystical tome. Some silliness/humor should be used (exploding kittens style).
 - A hit point bar, displaying the current hit point count as a proportion of the starting hit point count (mortal kombat style)
 - Turn the card over to reveal its available attack and defense moves, along with any other special properties. Each attack has an associated element, drawn from the one or more elements associated with the card.
 - The back of the card shows (in the background) another fantasty style image of that card's entity "in battle"

# Attacks
1. Each attack has a "base" amount of damage that it inflicts on the target (average: 200K; range: 100 -- 500K)
2. Each attack is associated with one or more elements
3. Damage may be modulated by:
 - Special properties of the attacker and/or target (e.g., fire attacks are blunted by water-based entities and vice versa). Same-elements (e.g., attack a card with element X using a element X attack) cause the base amount of damage. Opposite card/attack matches *reduce* the amount of damage by 50%. Complementary (but not matching) card/attack pairings *increase* the amount of damage by 50%. Pairings:
   - Opposites: Air/earth, Water/fire, mecha/universe, plant/magic
   - Complements: Air/universe, water/plant, magic/fire, mecha/earth
 - Defense moves and/or deflections
4. Very powerful attacks (e.g., black hole, summon ghost army) can only be used a limited number (number of players - 2) times each, and then are removed from that card's abilities for the rest of the game.

# Defense moves and deflections
1. Some cards have defense moves. Each defense has an element (drawn from the set of the that card's elements). 
2. Each defense has a base protection amount (average: 100K; range: 50 -- 250K). These work *opposite* to how attacks work: same-element pairings defend by the base amount. Oppose attack/defense pairings *increase* damage by 25%. Complementary (but not matching) attack/defense pairings *reduce* the amount of damage by 25%.
3. Special defense moves may entirely block damage, regardless of elements:
  - Bounce back turns the attack back on the attacker, causing to the attacker 75% of the damage it would have otherwise caused to the defender. This can be used twice and then is removed (no longer selectable) from the card's abilities for the rest of the game.
  - Black hole attacks can *not* be bounced back
  - Summon ghost army attacks
4. Teleporting dodges an attack entirely. This can be used once and then is removed (no longer selectable) from the card's abilities for the rest of the game.
5. Some cards have special moves like covering spikes with slime; this is especially effective against mecha attacks. It blunts the attack AND reduces that attack's efficacy by 75% from then on in the game.

# Other design decisions
- There are 96 cards in all, based on a set of hand-drawn cards in the images/orig/ folder.
- Cards vary in power. There should be at least 8 "highly powerful" cards that have excellent health AND attack strength. There are a few "weak" cards (e.g., "Spikey Box") that don't do much (they're primarily a gag, but sometimes a player might be stuck needing to include a weak card)
- As each player takes their turn, images of their cards appear at the bottom of the screen (large, interactive), and all other player's cards are organized conveniently for selection.
- The background of the "board" should be a neat looking (but partially transparent to keep it subtle and clean) fantasy image showing powerful cards' "heros" of each element type engaged in combat
- Use fantasty fonts
- Powerful attacks and defenses have cool sound effects
- Subtle sound effects for clicking on cards, pressing buttons in the interface, and so on
- Click any card to bring up a zoomed in view and/or interact with it.
- Everything needs to run through a site hosted on github pages.
