# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Monster Ghost Army Cards is a 2-8 player deck-building game featuring 96 hand-drawn cards. The project will be a web application hosted on GitHub Pages.

## Current State

This repository is in the design/planning phase. It contains:
- Game rules and card specifications in README.md
- 96 original hand-drawn card images in `images/orig/`

No code has been written yet.

## Game Mechanics Summary

**Card Elements:** air, water, fire, earth, universe, plant, mecha, magic (single or dual-element cards)

**Element Interactions:**
- Opposites (50% damage reduction): air/earth, water/fire, mecha/universe, plant/magic
- Complements (50% damage increase): air/universe, water/plant, magic/fire, mecha/earth

**Defense Interactions (reversed from attacks):**
- Opposite attack/defense: +25% damage
- Complementary attack/defense: -25% damage

**Special Moves (limited use):**
- Powerful attacks (black hole, summon ghost army): usable (num_players - 2) times
- Bounce back: usable twice, reflects 75% damage (cannot reflect black hole or summon ghost army)
- Teleport: usable once, dodges attack entirely

## Implementation Requirements

- GitHub Pages deployment (static site)
- Fantasy fonts and styling
- Sound effects for attacks, defenses, and UI interactions
- Card zoom/interaction on click
- Semi-transparent fantasy battle background

## Asset Reference

Card images follow Pixel camera naming: `PXL_YYYYMMDD_HHMMSS*.jpg`
