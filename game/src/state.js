// state.js — game state shape and turn flow (who acts, Ember growth, draws).
import { buildDeck, makeRng } from './deck.js';

export const START_LIFE = 20;
export const START_EMBER_MAX = 3;
export const EMBER_CAP = 10;
export const OPENING_HAND = 4;
export const BOARD_LIMIT = 5;
export const HAND_LIMIT = 7;

let nextUid = 1;

export function makeHero(name, isPlayer) {
  return {
    name, isPlayer,
    life: START_LIFE, maxLife: START_LIFE,
    ember: 0, emberMax: 0,
    deck: [], hand: [], board: [],
    fatigue: 0, lastSuit: null,
  };
}

export function createGame(seed) {
  nextUid = 1;
  const rng = makeRng(seed);
  const state = {
    seed, rng,
    turn: 0,
    active: 'player', // 'player' | 'warden'
    winner: null, // 'player' | 'warden' | null
    log: [],
    lastEvent: null, // {type, side, uid} — render.js animates from this
    heroes: {
      player: makeHero('You', true),
      warden: makeHero('The Ash Warden', false),
    },
  };
  for (const side of ['player', 'warden']) {
    const hero = state.heroes[side];
    hero.deck = buildDeck(rng);
    for (let i = 0; i < OPENING_HAND; i++) hero.hand.push(hero.deck.pop());
  }
  logLine(state, 'The duel begins. The Ash Warden bows, politely, like a fire.');
  return state;
}

export function otherSide(side) {
  return side === 'player' ? 'warden' : 'player';
}

export function logLine(state, text) {
  state.log.push(text);
  if (state.log.length > 60) state.log.shift();
}

export function newSpiritUid() {
  return nextUid++;
}

// Begin a side's turn: grow and refill Ember, wake its Spirits, draw a card
// (fatigue when the deck is empty — handled in rules.js drawCards).
// Ember curve: a hero's first turn starts at START_EMBER_MAX, then +1 on each
// of their own turns, capped at EMBER_CAP — identical for both heroes.
export function beginTurn(state, side, drawCardsFn) {
  state.active = side;
  if (side === 'player') state.turn += 1;
  const hero = state.heroes[side];
  hero.turnsTaken = (hero.turnsTaken ?? 0) + 1;
  hero.emberMax = Math.min(EMBER_CAP, START_EMBER_MAX + hero.turnsTaken - 1);
  hero.ember = hero.emberMax;
  for (const spirit of hero.board) spirit.canAttack = true;
  drawCardsFn(state, side, 1);
}
