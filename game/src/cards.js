// cards.js — the Emberfall Duel card catalogue: suits, Spirits and Charms.
// Every card has a suit; playing a card whose suit matches the suit of the last
// card that player played triggers the card's Bond bonus (see rules.js).

// Suit shapes are hand-drawn SVG paths (viewBox 0 0 24 24), one shape and one
// colour per suit, so a suit reads by shape alone, never by colour alone.
export const SUITS = {
  flame: {
    name: 'Flame', color: '#ff7847', dark: '#8f2d12',
    path: 'M12 1.8c1.6 3.4-.6 4.9-1.9 7.2-1 1.9.4 3.4 2 3.4 1.9 0 2.9-1.8 2.7-3.7 2.4 2 3.9 4.6 3.9 7.3 0 3.9-3 6.8-6.7 6.8S5.3 19.7 5.3 15.8c0-2.4 1.1-4.4 2.6-6.2C9.6 7.6 11.4 5.4 12 1.8z',
    fill: true,
  },
  frost: {
    name: 'Frost', color: '#5ec8ff', dark: '#144d73',
    path: 'M12 2v20M3.2 7l17.6 10M20.8 7L3.2 17M12 2l-3.2 3M12 2l3.2 3M12 22l-3.2-3M12 22l3.2-3M3.2 7l4.2.6M3.2 7l.6 4.2M20.8 17l-4.2-.6M20.8 17l-.6-4.2M20.8 7l-4.2.6M20.8 7l-.6 4.2M3.2 17l4.2-.6M3.2 17l.6-4.2',
    fill: false,
  },
  thorn: {
    name: 'Thorn', color: '#7ddc6a', dark: '#1f5c1e',
    path: 'M20.5 3.5C11 3.5 4.5 10 4.5 20.5 14.5 20 20.5 13 20.5 3.5z M4.5 20.5C6.5 14 10.5 9.5 17.5 6',
    fill: false,
  },
  storm: {
    name: 'Storm', color: '#c99aff', dark: '#4b2380',
    path: 'M13.2 1.8L4.4 14.2h5.7l-1.3 8L18.4 10h-5.9z',
    fill: true,
  },
};

export const SUIT_KEYS = Object.keys(SUITS);

// Bond kinds: grow = this Spirit +1/+1 · draw = draw a card ·
// spark = deal 1 damage to the enemy hero · mend = heal your hero 2 ·
// surge = gain 1 Ember this turn.
export const BOND_TEXT = {
  grow: 'Bond: +1/+1',
  draw: 'Bond: draw a card',
  spark: 'Bond: 1 dmg to enemy hero',
  mend: 'Bond: heal your hero 2',
  surge: 'Bond: +1 Ember this turn',
};

// kind 'spirit': atk/hp on the table. kind 'charm': instant effect —
// effect 'bolt' (damage a target), 'heal' (heal hero or Spirit), 'draw',
// 'buff' (+Attack/+Health to one of your Spirits), 'blast' (damage all enemy Spirits).
export const CARDS = [
  { id: 'emberimp', name: 'Ember Imp', kind: 'spirit', suit: 'flame', cost: 1, atk: 2, hp: 1, bond: 'spark', text: 'A grin made of cinders.' },
  { id: 'cinderfox', name: 'Cinder Fox', kind: 'spirit', suit: 'flame', cost: 2, atk: 3, hp: 2, bond: 'grow', text: 'It hunts by firelight.' },
  { id: 'magmahulk', name: 'Magma Hulk', kind: 'spirit', suit: 'flame', cost: 5, atk: 5, hp: 5, bond: 'grow', text: 'Slow, warm, unstoppable.' },
  { id: 'phoenixchick', name: 'Phoenix Chick', kind: 'spirit', suit: 'flame', cost: 3, atk: 3, hp: 3, bond: 'mend', text: 'Small wings, old soul.' },
  { id: 'frostsprite', name: 'Frost Sprite', kind: 'spirit', suit: 'frost', cost: 1, atk: 1, hp: 3, bond: 'draw', text: 'It whispers in rime.' },
  { id: 'glacierbear', name: 'Glacier Bear', kind: 'spirit', suit: 'frost', cost: 4, atk: 4, hp: 5, bond: 'grow', text: 'Winter, walking.' },
  { id: 'rimewitch', name: 'Rime Witch', kind: 'spirit', suit: 'frost', cost: 3, atk: 2, hp: 4, bond: 'draw', text: 'She counts snowflakes backwards.' },
  { id: 'avalanche', name: 'Avalanche Yeti', kind: 'spirit', suit: 'frost', cost: 6, atk: 6, hp: 6, bond: 'spark', text: 'You hear it before you see it.' },
  { id: 'thornpup', name: 'Thorn Pup', kind: 'spirit', suit: 'thorn', cost: 1, atk: 1, hp: 2, bond: 'mend', text: 'Barks at brambles. Is brambles.' },
  { id: 'briargolem', name: 'Briar Golem', kind: 'spirit', suit: 'thorn', cost: 4, atk: 3, hp: 6, bond: 'grow', text: 'A hedge with opinions.' },
  { id: 'mosssage', name: 'Moss Sage', kind: 'spirit', suit: 'thorn', cost: 2, atk: 1, hp: 4, bond: 'draw', text: 'Older than the path.' },
  { id: 'eldertreant', name: 'Elder Treant', kind: 'spirit', suit: 'thorn', cost: 6, atk: 5, hp: 8, bond: 'mend', text: 'It remembers every axe.' },
  { id: 'sparrowvolt', name: 'Volt Sparrow', kind: 'spirit', suit: 'storm', cost: 1, atk: 2, hp: 1, bond: 'draw', text: 'Never lands twice.' },
  { id: 'stormdjinn', name: 'Storm Djinn', kind: 'spirit', suit: 'storm', cost: 3, atk: 4, hp: 2, bond: 'spark', text: 'Every wish: lightning.' },
  { id: 'tempestknight', name: 'Tempest Knight', kind: 'spirit', suit: 'storm', cost: 5, atk: 4, hp: 6, bond: 'grow', text: 'His armour is the weather.' },
  { id: 'cloudwhale', name: 'Cloud Whale', kind: 'spirit', suit: 'storm', cost: 7, atk: 7, hp: 7, bond: 'surge', text: 'The sky, singing low.' },
  { id: 'firebolt', name: 'Firebolt', kind: 'charm', suit: 'flame', cost: 2, effect: 'bolt', amount: 3, bond: 'spark', text: 'Charm: deal 3 damage to any target.' },
  { id: 'wildfire', name: 'Wildfire', kind: 'charm', suit: 'flame', cost: 4, effect: 'blast', amount: 2, bond: 'grow', text: 'Charm: deal 2 damage to all enemy Spirits.' },
  { id: 'deepfreeze', name: 'Deep Freeze', kind: 'charm', suit: 'frost', cost: 3, effect: 'bolt', amount: 2, bond: 'draw', text: 'Charm: deal 2 damage to any target.' },
  { id: 'secondwinter', name: 'Second Winter', kind: 'charm', suit: 'frost', cost: 2, effect: 'draw', amount: 2, bond: 'mend', text: 'Charm: draw 2 cards.' },
  { id: 'healingrain', name: 'Healing Rain', kind: 'charm', suit: 'thorn', cost: 2, effect: 'heal', amount: 4, bond: 'mend', text: 'Charm: restore 4 Life to your hero or a Spirit.' },
  { id: 'overgrowth', name: 'Overgrowth', kind: 'charm', suit: 'thorn', cost: 2, effect: 'buff', amount: 2, bond: 'grow', text: 'Charm: give one of your Spirits +2/+2.' },
  { id: 'chainlightning', name: 'Chain Lightning', kind: 'charm', suit: 'storm', cost: 3, effect: 'bolt', amount: 2, bond: 'spark', text: 'Charm: deal 2 damage to any target.' },
  { id: 'stormcall', name: 'Stormcall', kind: 'charm', suit: 'storm', cost: 1, effect: 'draw', amount: 1, bond: 'surge', text: 'Charm: draw a card.' },
];

export const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));

export function cardDef(id) {
  return CARD_BY_ID[id];
}

export function needsTarget(def) {
  return def.kind === 'charm' && (def.effect === 'bolt' || def.effect === 'heal' || def.effect === 'buff');
}
