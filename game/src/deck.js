// deck.js — seeded randomness and deck building.
// One mulberry32 stream per game, seeded at creation, so a seed always deals
// the same duel (and the screenshot modes render identically every time).

export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(ids, rng) {
  const out = [...ids];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// The duel deck list: two copies of most cards, one of the biggest Spirits —
// 24 cards, so a long game reaches fatigue.
export const DECK_LIST = [
  'emberimp', 'emberimp', 'cinderfox', 'cinderfox', 'magmahulk', 'phoenixchick',
  'frostsprite', 'frostsprite', 'glacierbear', 'rimewitch', 'avalanche',
  'thornpup', 'thornpup', 'briargolem', 'mosssage', 'eldertreant',
  'sparrowvolt', 'sparrowvolt', 'stormdjinn', 'tempestknight', 'cloudwhale',
  'firebolt', 'wildfire', 'deepfreeze', 'secondwinter', 'healingrain',
  'overgrowth', 'chainlightning', 'stormcall',
];

export function buildDeck(rng) {
  return shuffle(DECK_LIST, rng);
}
