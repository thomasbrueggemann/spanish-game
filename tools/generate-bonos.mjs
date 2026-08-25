#!/usr/bin/env node
// Regenerates data/bonos.json from data/conectores.json.
//
// The deck is PRE-GENERATED on purpose: data/bonos.json is the file the game
// actually reads, so you can hand-edit any card there without touching this
// script. Only re-run this if you changed the connector bank and want a fresh
// deck:  node tools/generate-bonos.mjs
//
// Selection matches the original design: card i takes connectors
// i, i+53 and i+107 (mod bank size), which spreads the 160 connectors evenly
// across the 150 cards without repeating one inside a card.

import {readFileSync, writeFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, join} from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bank = JSON.parse(readFileSync(join(root, 'data/conectores.json'), 'utf8'))
const CARDS = 150
const OFFSETS = [0, 53, 107]
const n = bank.length

const deck = Array.from({length: CARDS}, (_, i) =>
  OFFSETS.map(o => bank[(i + o) % n])
)

writeFileSync(
  join(root, 'data/bonos.json'),
  JSON.stringify(deck, null, 2)
    // one connector per line, one card per block
    .replace(/\{\n\s+/g, '{ ')
    .replace(/,\n\s+"tipo"/g, ', "tipo"')
    .replace(/"\n\s+\}/g, '" }') + '\n'
)

const sameTipo = deck.filter(c => new Set(c.map(x => x.tipo)).size < 3).length
const used = new Set(deck.flat().map(c => c.frase)).size
console.log(`bonos.json: ${deck.length} cards, ${used}/${n} connectors used, ${sameTipo} cards with a repeated tipo`)
