#!/usr/bin/env python3
"""
Script to clean up card names, biographies, and attack/defense names in cards.json
"""

import json
import os

# Path to cards.json
CARDS_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'cards.json')

# Load cards
with open(CARDS_FILE, 'r') as f:
    cards = json.load(f)

# Track all changes
all_changes = []

# Biography templates based on card ID
BIOGRAPHY_MAP = {
    'wall_trio': 'Three elemental guardians united in defense: a crystal tree, a brick golem, and a solar beast.',
    'box': 'A mysterious spiky creature trapped within a magical teal container, waiting to be unleashed.',
    'light_combined_demons': 'Three infernal spirits bound together by dark magic, their combined flames burn with unholy intensity.',
    'fog_trio': 'A trinity of mist spirits that work in perfect harmony to blanket the battlefield in confusion.',
    'uber_candle': 'Seven enchanted candles that burn with eternal flames, each color representing a different magical power.',
    'spike_wall': 'A legendary mechanical fortress that crushes all who dare approach its electrified spikes.',
    'dreidel_of_doom': 'An ancient spinning artifact imbued with mystical Hebrew letters, each spin deciding the fate of its enemies.',
    'sparkler_foe': 'A dazzling display of cosmic sparks that blinds enemies with its brilliant starlight.',
    'music_dude': 'A melodic spirit whose haunting songs can either soothe or shatter the minds of those who listen.',
    'electric_spike_wall': 'A living fortress of crackling lightning and razor-sharp spikes that guards the cosmic gates.',
    'guac_globber': 'An amorphous blob of magical guacamole that smothers its enemies in creamy doom.',
    'universe_spike_wall': 'A cosmic defender whose spikes are forged from the very fabric of space-time.',
    'water_spike_wall': 'An aquatic fortress that combines crushing waves with piercing spikes.',
    'lego_wall': 'A colorful construction of interlocking magical bricks that builds itself higher with each battle.',
    'fire_spike_wall': 'A blazing barrier of molten metal and searing flames that incinerates all attackers.',
    'sweet_pea_shooter': 'Four adorable pea siblings who weaponize their cuteness while launching explosive seed pods.',
    'snail_trail': 'A psychedelic snail that leaves trails of disorienting slime and blinding neon spirals.',
    'plant_spike_wall': 'A living fortress of thorny vines and mechanical gears that grows stronger with each sunrise.',
    'earth_spike_wall': 'A mountain of mechanical might, with rocky spikes that can trigger devastating earthquakes.',
    'galaxy_black_hole': 'An all-consuming cosmic horror that devours stars and bends reality to its will.',
    'innercore_monster': 'A chaotic entity from the depths of a dying star, wielding the power to warp time itself.',
    'deadly_top_hat': 'A mischievous creature hiding within an oversized hat, its laughter driving enemies to madness.',
    'the_summerween_trickster': 'A festive fiend that punishes those who disrespect the sacred candy holiday.',
    'miniature_mini': 'A bizarre amalgamation of colorful creatures fused into one unpredictable being.',
    'earthquake': 'A seismic titan that shakes the very foundations of reality with its thunderous movements.',
    'stink_flower': 'A beautiful yet foul-smelling blossom that weaponizes its noxious perfume.',
    'poison_shooter': 'A venomous reptilian creature with multiple eyes that never misses its toxic target.',
    'shield_attack': 'A rainbow-armored ghost whose defense is its greatest offense.',
    'ultra_fog_lurker': 'A shadowy predator that lurks within dense fog, waiting to strike with devastating force.',
    'ultra_fire_fog_lurker': 'A molten phantom that drifts through ash and smoke, leaving destruction in its wake.',
    'pacifier_shooter': 'A mechanical beast that silences enemies with its pacifying projectiles.',
    'upside_down_rainbow_ghost': 'An inverted spirit of prismatic flames whose disorienting appearance confuses all who see it.',
    'universe_elemental': 'Twin cosmic spirits that hold the power of the stars within their connected forms.',
    'rude_dude': 'Three gassy cloud creatures whose offensive odors and crude behavior repel all enemies.',
    'grumpy_brow_squiggle_mouth': 'A perpetually annoyed face whose withering glare can stop enemies in their tracks.',
    'ribboner': 'An ethereal creature made of flowing magical ribbons that entangle and confuse its prey.',
    'elemental_trio_water_lurker': 'An ancient water elemental that rules the deepest ocean trenches with tidal fury.',
    'elemental_trio_earth_shaker': 'A primordial mountain spirit whose footsteps trigger devastating earthquakes.',
    'razor_clam_boss': 'A razor-sharp shellfish warrior that slices through enemies with surgical precision.',
    'dixie_whistler': 'A musical vessel that shoots superheated steam while playing tunes that stick in your head forever.',
    'syrup_guzzler': 'An insatiable container that drinks all syrup in existence, creating sticky black holes.',
    'cactus_monster': 'A prickly desert guardian whose spines fly with deadly accuracy.',
    'muddie_puddle': 'A sentient mud pool that can trap enemies in its endless murky depths.',
    'ultra_bounce': 'A cluster of bouncing spheres whose chaotic movements drive enemies to temporary insanity.',
    'brain_blaster': 'A floating brain of pure psychic energy that overloads the minds of its enemies.',
    'technology_demons': 'Possessed electronic devices that distract and electrocute their victims.',
    'squelcher': 'A soggy sponge creature that absorbs attacks and returns them with a satisfying squelch.',
    'toucan_like_toucan_monster': 'A tropical bird spirit with a crushing beak and an annoying squawk.',
    'chomoghost': 'A spectral slug that phases through defenses while spitting ectoplasmic chunks.',
    'slurping': 'A spiky hedgehog creature that shakes the earth with every step.',
    'frozenly_frigid': 'Jagged shards of living ice that freeze and shatter all they touch.',
    'banana_man': 'A slippery fruit warrior whose peels have toppled empires.',
    'pooper_dooper': 'A stinky but strangely powerful creature that weaponizes its grossness.',
    'monstah_thump': 'Pure seismic energy given form, its vibrations can level mountains.',
    'sslithering_snake_poison': 'A venomous serpent whose hypnotic movements hide deadly intentions.',
    'solar_powered_earwig_ghost': 'A spectral insect that draws power from the sun to fuel its painful pinches.',
    'ghost_dodger': 'An elusive spirit that dances between dimensions, impossible to hit.',
    'thunder_storm': 'A tempestuous creature of wind and lightning that brings chaos wherever it flies.',
    'wonka_wacka_doodle_monster': 'A chaotic scribble creature that confuses enemies with its nonsensical patterns.',
    'ice_cream_flinger': 'A delicious yet deadly dessert monster that hurls frozen treats with precision.',
    'shofario': 'A mystical horn that summons ghostly armies with its ancient call.',
    'robo_jolt': 'A colorful robot whose electric hugs are shockingly powerful.',
    'lightning': 'A storm elemental that channels the raw fury of thunderclouds.',
    'super_gardener': 'A humble farmer whose connection to the earth grants supernatural gardening powers.',
    'double_duty_unlimited': 'Twin monster heads that share thoughts and squeeze enemies from both sides.',
    'cyclopian': 'A one-eyed creature whose many legs carry it faster than the eye can follow.',
    'sucking_vacuum_ghost': 'A hollow spirit that inhales dirt and spits it back with explosive force.',
    'flanneler': 'A cozy fabric creature whose overwhelming fashion sense stuns all who behold it.',
    'rainbow_lightning': 'A colorful bolt of living electricity that paints targets before striking.',
    'slippery_slope_soap_ghost': 'A slick spectral soap that makes everything impossibly slippery.',
    'laser_eyes': 'Twin hypnotic eyes connected by a beam of pure destructive energy.',
    'confusion': 'A mind-bending creature that injects chaos directly into enemy thoughts.',
    'extreme_ultra_spike_hurler': 'A spiny plant creature that launches needle-sharp projectiles at supersonic speeds.',
    'blinding_sunshine_monster': 'A solar entity whose brilliant light can vaporize shadows and blind enemies.',
    'foglurker': 'A dark mist creature that lurks at the edge of visibility, waiting to strike.',
    'elemental_trio_fire_starter': 'A primordial flame spirit that ignites all it touches with eternal fire.',
    'orange_slice_juice_spitter': 'A citrus warrior that weaponizes its tangy juices and sticky residue.',
    'shapeshifter': 'An ever-changing mass of energy that takes on countless terrifying forms.',
    'doublespike': 'Twin spiked orbs of cosmic metal that orbit each other with destructive force.',
    'the_fierce_scribbler': 'A colorful creature whose raw artistic energy manifests as physical attacks.',
    'fierce_cow': 'An enraged bovine whose thunderous moo can shake mountains.',
    'the_scribbler': 'A loosely drawn bird spirit whose unpredictable lines confuse and entrap enemies.',
    'dirty_diaper': 'A truly foul weapon of last resort that defeats enemies through sheer disgust.',
    'beaked_ghost_2_0': 'An evolved spirit that commands lesser ghosts from its perch, striking with spectral precision.',
    'kaya_rey_z_eyes': 'Floating eyes that pierce the mind with hypnotic spirals, turning allies into enemies.',
    'catadorable_monster': 'An irresistibly cute cat whose adorable appearance disarms even the fiercest foes.',
    'confusion_injector': 'A maze-like creature that injects pure confusion into the minds of its enemies.',
    '2_combined_infinite': 'A legendary fusion of rainbow ghost and cosmic brain, wielding infinite arcane power.',
    'b_unc_e_back': 'A powerful cosmic entity that deflects attacks back to their source with devastating force.',
    'double_duty_unlimited_teleportation': 'Twin-headed cosmic entity that harnesses the power of space-time to create devastating vortexes.',
    'h13253312': 'An ever-shifting creature of living flame that morphs between shapes.',
    'fog_slurper': 'A misty creature that inhales fog to fuel its attacks, leaving enemies blind and confused.',
    'poison_shooter_2': 'A ghostly elephant that spreads toxic spores from the plants growing on its back.',
    'spike_wall_2': 'A living barrier of colorful spirits that blocks all who dare approach.',
    'saba_nap': 'A jolly sleeping face whose thunderous snores can shake the cosmos.',
    'unnamed_creature_93': 'A mechanical dinosaur construct that carries mysterious cargo in its hanging bucket.',
}

# Name changes
NAME_CHANGES = {
    'ultra_fog_lurker': 'Fog Devastator',  # Was "10000000 Damage"
    'b_unc_e_back': 'Bounce Back',  # Was "B*unc E Back"
    'double_duty_unlimited_teleportation': 'Cosmic Vortex',  # Was extremely long name
    '2_combined_infinite': 'Infinite Duo',  # Was "2 Combined Infinite"
    'h13253312': 'Flame Shifter',  # Was random characters
    'fog_slurper': 'Fog Slurper',  # Was "Fog Sluuuuuuuuuurp"
    'beaked_ghost_2_0': 'Spectral Raven',  # Was "Beaked Ghost 2.0"
    'kaya_rey_z_eyes': 'Hypnotic Gaze',  # Was "Kaya-Rey-Z Eyes"
    'poison_shooter_2': 'Venomous Pachyderm',  # Was duplicate "Poison Shooter"
    'spike_wall_2': 'Prismatic Barrier',  # Was duplicate "Spike Wall"
    'saba_nap': 'Grandpa Snore',  # Was "Saba Nap"
    'unnamed_creature_93': 'Bucket Mech',  # Was "Unnamed Creature 93"
    'sslithering_snake_poison': 'Slithering Serpent',  # Cleaner name
}

# Attack name changes
ATTACK_CHANGES = {
    'ultra_fog_lurker': {
        'Googleplex 10000 Space': ('Void Strike', 'Channels the power of infinite space into a single devastating blow')
    },
    '2_combined_infinite': {
        '1000000000000000000 Damage (crossed out)': ('Infinity Burst', 'Unleashes a blast of infinite energy')
    },
    'kaya_rey_z_eyes': {
        'Confuddle and Compoodle Any Enemy to Attack Its Friends': ('Mind Control', 'Forces an enemy to attack its own allies'),
        'Cry Loudly (Im Damage to Ears)': ('Sonic Wail', 'A piercing cry that damages all who hear it')
    },
    'saba_nap': {
        'Sabababababa Ba Baba Baba Bababa': ('Dream Babble', 'Confuses enemies with nonsensical dream-speak')
    },
    'innercore_monster': {
        'Turn Any Monster Card Into Any Other Monster Card': ('Transmogrify', 'Transforms any creature into another form')
    }
}

# Defense name changes
DEFENSE_CHANGES = {
    'beaked_ghost_2_0': {
        'Bounce Back #5 PG': ('Spectral Deflection', 'Redirects attacks through the spirit realm')
    }
}

# Process each card
for card in cards:
    card_id = card['id']
    card_changes = []

    # Update name if needed
    if card_id in NAME_CHANGES:
        old_name = card['name']
        new_name = NAME_CHANGES[card_id]
        if old_name != new_name:
            card['name'] = new_name
            card_changes.append(f"Name: '{old_name}' -> '{new_name}'")

    # Update biography if needed
    if card_id in BIOGRAPHY_MAP:
        old_bio = card['biography']
        new_bio = BIOGRAPHY_MAP[card_id]
        if old_bio != new_bio:
            card['biography'] = new_bio
            card_changes.append(f"Biography updated")

    # Update attacks if needed
    if card_id in ATTACK_CHANGES:
        for attack in card.get('attacks', []):
            if attack['name'] in ATTACK_CHANGES[card_id]:
                old_name = attack['name']
                new_name, new_desc = ATTACK_CHANGES[card_id][old_name]
                attack['name'] = new_name
                attack['description'] = new_desc
                card_changes.append(f"Attack: '{old_name}' -> '{new_name}'")

    # Update defenses if needed
    if card_id in DEFENSE_CHANGES:
        for defense in card.get('defenses', []):
            if defense['name'] in DEFENSE_CHANGES[card_id]:
                old_name = defense['name']
                new_name, new_desc = DEFENSE_CHANGES[card_id][old_name]
                defense['name'] = new_name
                defense['description'] = new_desc
                card_changes.append(f"Defense: '{old_name}' -> '{new_name}'")

    # Record changes
    if card_changes:
        all_changes.append({
            'id': card_id,
            'name': card['name'],
            'changes': card_changes
        })

# Save the updated cards
with open(CARDS_FILE, 'w') as f:
    json.dump(cards, f, indent=2)

# Print summary
print("=" * 60)
print("CARD CLEANUP SUMMARY")
print("=" * 60)
print(f"\nTotal cards modified: {len(all_changes)}")
print()

for change in all_changes:
    print(f"\n{change['name']} (id: {change['id']}):")
    for c in change['changes']:
        print(f"  - {c}")

print("\n" + "=" * 60)
print("Cards.json has been updated successfully!")
print("=" * 60)
