// rules.js — the laws of the duel: drawing (with fatigue), playing cards,
// Bond triggers, charm effects, combat and death.
import { BOND_TEXT, cardDef, needsTarget } from './cards.js';
import { HAND_LIMIT, BOARD_LIMIT, logLine, newSpiritUid, otherSide } from './state.js';

export function drawCards(state, side, count) {
  const hero = state.heroes[side];
  for (let i = 0; i < count; i++) {
    if (state.winner) return;
    if (hero.deck.length === 0) {
      hero.fatigue += 1;
      damageHero(state, side, hero.fatigue, 'fatigue');
      logLine(state, `${hero.name} ${side === 'player' ? 'draw from' : 'draws from'} an empty deck — fatigue ${hero.fatigue}!`);
      continue;
    }
    const id = hero.deck.pop();
    if (hero.hand.length >= HAND_LIMIT) {
      logLine(state, `${hero.name} ${side === 'player' ? 'have' : 'has'} a full hand; a card burns away.`);
    } else {
      hero.hand.push(id);
    }
  }
}

export function damageHero(state, side, amount, source) {
  const hero = state.heroes[side];
  hero.life -= amount;
  state.lastEvent = { type: 'hero-hit', side, source };
  if (hero.life <= 0 && !state.winner) {
    hero.life = 0;
    state.winner = otherSide(side);
  }
}

export function healHero(state, side, amount) {
  const hero = state.heroes[side];
  hero.life = Math.min(hero.maxLife, hero.life + amount);
}

export function damageSpirit(state, side, spirit, amount) {
  spirit.hp -= amount;
  state.lastEvent = { type: 'spirit-hit', side, uid: spirit.uid };
}

export function sweepDeaths(state) {
  for (const side of ['player', 'warden']) {
    const hero = state.heroes[side];
    for (const spirit of [...hero.board]) {
      if (spirit.hp <= 0) {
        hero.board = hero.board.filter((s) => s.uid !== spirit.uid);
        logLine(state, `${spirit.name} falls.`);
      }
    }
  }
}

export function canPlay(state, side, handIndex) {
  const hero = state.heroes[side];
  const id = hero.hand[handIndex];
  if (!id || state.winner) return false;
  const def = cardDef(id);
  if (def.cost > hero.ember) return false;
  if (def.kind === 'spirit' && hero.board.length >= BOARD_LIMIT) return false;
  if (def.kind === 'charm' && def.effect === 'buff' && hero.board.length === 0) return false;
  if (def.kind === 'charm' && def.effect === 'blast' && state.heroes[otherSide(side)].board.length === 0) return false;
  return true;
}

// target: null, or {side, uid} for a Spirit, or {side, hero:true} for a hero.
export function playCard(state, side, handIndex, target) {
  if (!canPlay(state, side, handIndex)) return false;
  const hero = state.heroes[side];
  const foeSide = otherSide(side);
  const id = hero.hand[handIndex];
  const def = cardDef(id);
  hero.hand.splice(handIndex, 1);
  hero.ember -= def.cost;
  logLine(state, `${hero.name} ${side === 'player' ? 'play' : 'plays'} ${def.name}.`);
  state.lastEvent = { type: 'play', side };

  if (def.kind === 'spirit') {
    hero.board.push({
      uid: newSpiritUid(), cardId: id, name: def.name, suit: def.suit,
      atk: def.atk, hp: def.hp, maxHp: def.hp, canAttack: false,
    });
  } else {
    applyCharm(state, side, def, target);
  }

  // Bond: the played card's suit matches the previously played card's suit.
  const bonded = hero.lastSuit === def.suit;
  hero.lastSuit = def.suit;
  if (bonded && !state.winner) applyBond(state, side, def);
  sweepDeaths(state);
  return true;
}

function applyBond(state, side, def) {
  const hero = state.heroes[side];
  const foeSide = otherSide(side);
  logLine(state, `Bond! ${def.name} resonates with ${def.suit} — ${BOND_TEXT[def.bond]}.`);
  state.lastEvent = { type: 'bond', side };
  switch (def.bond) {
    case 'grow': {
      const mine = hero.board[hero.board.length - 1];
      if (mine && def.kind === 'spirit') { mine.atk += 1; mine.hp += 1; mine.maxHp += 1; }
      else if (hero.board.length) {
        const biggest = [...hero.board].sort((a, b) => b.atk - a.atk)[0];
        biggest.atk += 1; biggest.hp += 1; biggest.maxHp += 1;
      }
      break;
    }
    case 'draw': drawCards(state, side, 1); break;
    case 'spark': damageHero(state, foeSide, 1, 'bond'); break;
    case 'mend': healHero(state, side, 2); break;
    case 'surge': hero.ember = Math.min(10, hero.ember + 1); break;
  }
}

function findSpirit(state, side, uid) {
  return state.heroes[side].board.find((s) => s.uid === uid) ?? null;
}

function applyCharm(state, side, def, target) {
  const foeSide = otherSide(side);
  if (def.effect === 'draw') { drawCards(state, side, def.amount); return; }
  if (def.effect === 'blast') {
    for (const spirit of [...state.heroes[foeSide].board]) damageSpirit(state, foeSide, spirit, def.amount);
    logLine(state, `${def.name} scorches the whole enemy line.`);
    return;
  }
  if (!target) return;
  if (def.effect === 'bolt') {
    if (target.hero) damageHero(state, target.side, def.amount, 'charm');
    else { const s = findSpirit(state, target.side, target.uid); if (s) damageSpirit(state, target.side, s, def.amount); }
  } else if (def.effect === 'heal') {
    if (target.hero) healHero(state, target.side, def.amount);
    else { const s = findSpirit(state, target.side, target.uid); if (s) s.hp = Math.min(s.maxHp, s.hp + def.amount); }
  } else if (def.effect === 'buff') {
    const s = findSpirit(state, side, target.uid);
    if (s) { s.atk += def.amount; s.hp += def.amount; s.maxHp += def.amount; logLine(state, `${s.name} grows +${def.amount}/+${def.amount}.`); }
  }
}

// A ready Spirit attacks a Spirit or a hero. Both Spirits deal damage.
export function attack(state, side, attackerUid, target) {
  const hero = state.heroes[side];
  const foeSide = otherSide(side);
  const foe = state.heroes[foeSide];
  const attacker = hero.board.find((s) => s.uid === attackerUid);
  if (!attacker || !attacker.canAttack || state.winner) return false;
  attacker.canAttack = false;
  state.lastEvent = { type: 'attack', side, uid: attackerUid };
  if (target.hero) {
    damageHero(state, foeSide, attacker.atk, 'attack');
    logLine(state, `${attacker.name} strikes ${foe.name} for ${attacker.atk}.`);
  } else {
    const defender = foe.board.find((s) => s.uid === target.uid);
    if (!defender) return false;
    damageSpirit(state, foeSide, defender, attacker.atk);
    damageSpirit(state, side, attacker, defender.atk);
    logLine(state, `${attacker.name} clashes with ${defender.name} (${attacker.atk} vs ${defender.atk}).`);
  }
  sweepDeaths(state);
  return true;
}

export function spiritNeedsTargetFirst() {
  return needsTarget;
}
