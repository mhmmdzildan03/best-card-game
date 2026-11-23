// ai.js — the Ash Warden. It reads the board before it acts: it removes your
// biggest Spirit when a trade or a bolt allows it, heals when its Life is low,
// presses the attack when it is ahead, and says what it intends in the log.
import { cardDef } from './cards.js';
import { logLine } from './state.js';
import { attack, canPlay, playCard } from './rules.js';

const SIDE = 'warden';
const FOE = 'player';

function biggestSpirit(state, side) {
  const board = state.heroes[side].board;
  return board.length ? [...board].sort((a, b) => (b.atk - a.atk) || (b.hp - a.hp))[0] : null;
}

function weakestSpirit(state, side) {
  const board = state.heroes[side].board;
  return board.length ? [...board].sort((a, b) => (a.hp - b.hp) || (a.atk - b.atk))[0] : null;
}

// One deliberate action per call; returns false when the Warden is done.
export function aiStep(state) {
  if (state.winner) return false;
  const me = state.heroes[SIDE];
  const foe = state.heroes[FOE];

  // 1) Survival: heal when low and a healing charm is in hand.
  if (me.life <= 8) {
    const idx = me.hand.findIndex((id) => cardDef(id).effect === 'heal' && canPlay(state, SIDE, me.hand.indexOf(id)));
    if (idx >= 0) {
      logLine(state, 'The Warden\'s intent: mend its wounds before they widen.');
      return playCard(state, SIDE, idx, { side: SIDE, hero: true });
    }
  }

  // 2) Removal: bolt your biggest Spirit when a damage charm can finish it.
  const threat = biggestSpirit(state, FOE);
  if (threat) {
    const idx = me.hand.findIndex((id) => {
      const d = cardDef(id);
      return d.effect === 'bolt' && d.amount >= threat.hp && canPlay(state, SIDE, me.hand.indexOf(id));
    });
    if (idx >= 0) {
      logLine(state, `The Warden's intent: burn down ${threat.name}, your biggest threat.`);
      return playCard(state, SIDE, idx, { side: FOE, uid: threat.uid });
    }
    const blastIdx = me.hand.findIndex((id) => cardDef(id).effect === 'blast' && canPlay(state, SIDE, me.hand.indexOf(id)));
    if (blastIdx >= 0 && foe.board.length >= 2) {
      logLine(state, 'The Warden\'s intent: scorch your whole line at once.');
      return playCard(state, SIDE, blastIdx, null);
    }
  }

  // 3) Play the most expensive affordable card (Spirits first, buffs onto the biggest).
  let bestIdx = -1; let bestCost = -1;
  me.hand.forEach((id, i) => {
    const d = cardDef(id);
    if (canPlay(state, SIDE, i) && d.cost > bestCost && d.effect !== 'heal') { bestCost = d.cost; bestIdx = i; }
  });
  if (bestIdx >= 0) {
    const d = cardDef(me.hand[bestIdx]);
    let target = null;
    if (d.effect === 'buff') target = { side: SIDE, uid: biggestSpirit(state, SIDE).uid };
    if (d.effect === 'bolt') {
      const t = threat && threat.hp <= d.amount ? threat : weakestSpirit(state, FOE);
      target = t ? { side: FOE, uid: t.uid } : { side: FOE, hero: true };
    }
    return playCard(state, SIDE, bestIdx, target);
  }

  // 4) Attacks: kill a bigger Spirit on a surviving trade, else strike the hero
  //    when ahead on Life or when the hit is lethal.
  for (const spirit of [...me.board]) {
    if (!spirit.canAttack || state.winner) continue;
    const killable = foe.board
      .filter((s) => s.hp <= spirit.atk && s.atk >= spirit.atk)
      .sort((a, b) => b.atk - a.atk)[0];
    if (killable && spirit.hp > killable.atk) {
      logLine(state, `The Warden's intent: ${spirit.name} removes ${killable.name}.`);
      return attack(state, SIDE, spirit.uid, { uid: killable.uid });
    }
    const ahead = me.life >= foe.life || foe.life <= spirit.atk;
    const trade = foe.board.length === 0;
    if (ahead || trade) {
      return attack(state, SIDE, spirit.uid, { hero: true });
    }
    const chump = weakestSpirit(state, FOE);
    if (chump) return attack(state, SIDE, spirit.uid, { uid: chump.uid });
    return attack(state, SIDE, spirit.uid, { hero: true });
  }
  return false;
}
