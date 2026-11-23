// main.js — boot, screens, mouse + keyboard input, and the deterministic
// screenshot modes (?shot=title|duel|win|loss&seed=N).
import { cardDef, needsTarget } from './cards.js';
import { createGame, beginTurn, logLine } from './state.js';
import { attack, canPlay, drawCards, playCard } from './rules.js';
import { aiStep } from './ai.js';
import { isMuted, sfx, toggleMute } from './audio.js';
import { renderDuel, renderEnd, renderTitle } from './render.js';

const root = document.getElementById('app');
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) document.body.classList.add('shot'); // freeze animations for stable renders
const seed = Number(params.get('seed') ?? '7') || 7;

let state = null;
const ui = {
  screen: 'title',
  selectedHand: null,
  selectedAttacker: null,
  pendingCard: null, // hand index waiting for a target
  hint: 'Your move.',
  muted: isMuted(),
  flashUid: null,
  flashSide: null,
};

function refresh() {
  if (ui.screen === 'title') renderTitle(root, handlers);
  else if (ui.screen === 'end' || (state && state.winner)) renderEnd(root, state, handlers);
  else renderDuel(root, state, ui, handlers);
}

function flashFromEvent() {
  ui.flashUid = null; ui.flashSide = null;
  const ev = state && state.lastEvent;
  if (!ev) return;
  if (ev.type === 'spirit-hit') ui.flashUid = ev.uid;
  if (ev.type === 'hero-hit') ui.flashSide = ev.side;
  if (ev.type === 'bond') sfx.bond();
}

function afterAction(sound) {
  flashFromEvent();
  if (sound) sound();
  if (state.winner) {
    ui.screen = 'end';
    if (state.winner === 'player') sfx.win(); else sfx.lose();
  }
  refresh();
}

function startDuel(newSeed) {
  state = createGame(newSeed ?? (Math.floor(Math.random() * 90000) + 10));
  ui.screen = 'duel';
  ui.selectedHand = null; ui.selectedAttacker = null; ui.pendingCard = null;
  ui.hint = 'Play a Spirit, or attack with a ready one.';
  beginTurn(state, 'player', drawCards);
  logLine(state, 'Your opening hand is dealt. The Warden waits above.');
  refresh();
}

function endPlayerTurn() {
  if (!state || state.active !== 'player' || state.winner) return;
  ui.selectedHand = null; ui.selectedAttacker = null; ui.pendingCard = null;
  ui.hint = 'The Ash Warden is thinking…';
  sfx.turn();
  beginTurn(state, 'warden', drawCards);
  refresh();
  const step = () => {
    if (state.winner) { afterAction(null); return; }
    const acted = aiStep(state);
    flashFromEvent();
    refresh();
    if (acted) { setTimeout(step, 620); return; }
    if (!state.winner) {
      beginTurn(state, 'player', drawCards);
      ui.hint = 'Your turn. A fresh Ember burns.';
      sfx.draw();
    }
    afterAction(null);
  };
  setTimeout(step, 650);
}

const handlers = {
  onStart: () => startDuel(seed),
  onRestart: () => startDuel(seed + 1),
  onMute: () => { ui.muted = toggleMute(); refresh(); },
  onEndTurn: () => endPlayerTurn(),
  canPlayAt: (i) => !!state && state.active === 'player' && canPlay(state, 'player', i),

  onHandCard: (i) => {
    if (!state || state.active !== 'player' || state.winner) return;
    const id = state.heroes.player.hand[i];
    if (!id) return;
    const def = cardDef(id);
    if (!canPlay(state, 'player', i)) {
      ui.hint = def.cost > state.heroes.player.ember ? `Not enough Ember for ${def.name} (needs ${def.cost}).` : `${def.name} cannot be played now.`;
      refresh(); return;
    }
    if (needsTarget(def)) {
      ui.selectedHand = i; ui.pendingCard = i; ui.selectedAttacker = null;
      ui.hint = def.effect === 'buff' ? `Choose one of your Spirits for ${def.name}.`
        : def.effect === 'heal' ? `Choose a hero or Spirit to heal with ${def.name}.`
        : `Choose a target for ${def.name}.`;
      refresh(); return;
    }
    ui.selectedHand = null;
    playCard(state, 'player', i, null);
    ui.hint = `${def.name} played.`;
    afterAction(() => sfx.play());
  },

  onSpirit: (side, uid) => {
    if (!state || state.winner) return;
    // A pending charm takes this Spirit as its target.
    if (ui.pendingCard !== null && state.active === 'player') {
      const i = ui.pendingCard;
      const def = cardDef(state.heroes.player.hand[i]);
      const okSide = def.effect === 'buff' ? side === 'player' : true;
      if (okSide) {
        playCard(state, 'player', i, { side, uid });
        ui.pendingCard = null; ui.selectedHand = null;
        ui.hint = `${def.name} resolves.`;
        afterAction(() => sfx.play());
      }
      return;
    }
    if (state.active !== 'player') return;
    if (side === 'player') {
      const spirit = state.heroes.player.board.find((s) => s.uid === uid);
      if (spirit && spirit.canAttack) {
        ui.selectedAttacker = ui.selectedAttacker === uid ? null : uid;
        ui.hint = ui.selectedAttacker ? `${spirit.name} is ready — click an enemy Spirit or the Warden.` : 'Attack cancelled.';
      } else if (spirit) {
        ui.hint = `${spirit.name} is drowsy this turn; it can attack next turn.`;
      }
      refresh(); return;
    }
    // Enemy Spirit clicked: attack it with the selected attacker.
    if (ui.selectedAttacker !== null) {
      const atk = state.heroes.player.board.find((s) => s.uid === ui.selectedAttacker);
      attack(state, 'player', ui.selectedAttacker, { uid });
      ui.hint = atk ? `${atk.name} attacks!` : '';
      ui.selectedAttacker = null;
      afterAction(() => sfx.attack());
    }
  },

  onHero: (side) => {
    if (!state || state.winner) return;
    if (ui.pendingCard !== null && state.active === 'player') {
      const i = ui.pendingCard;
      const def = cardDef(state.heroes.player.hand[i]);
      if (def.effect === 'bolt' || def.effect === 'heal') {
        playCard(state, 'player', i, { side, hero: true });
        ui.pendingCard = null; ui.selectedHand = null;
        ui.hint = `${def.name} resolves.`;
        afterAction(() => sfx.play());
      }
      return;
    }
    if (side === 'warden' && ui.selectedAttacker !== null && state.active === 'player') {
      const atk = state.heroes.player.board.find((s) => s.uid === ui.selectedAttacker);
      attack(state, 'player', ui.selectedAttacker, { hero: true });
      ui.hint = atk ? `${atk.name} strikes the Warden!` : '';
      ui.selectedAttacker = null;
      afterAction(() => sfx.attack());
    }
  },

  isTargetable: (side, uid) => {
    if (!state || state.active !== 'player') return false;
    if (ui.pendingCard !== null) {
      const def = cardDef(state.heroes.player.hand[ui.pendingCard]);
      if (def.effect === 'buff') return side === 'player';
      return true;
    }
    return side === 'warden' && ui.selectedAttacker !== null;
  },
  isHeroTargetable: (side) => {
    if (!state || state.active !== 'player') return false;
    if (ui.pendingCard !== null) {
      const def = cardDef(state.heroes.player.hand[ui.pendingCard]);
      return def.effect === 'bolt' || def.effect === 'heal';
    }
    return side === 'warden' && ui.selectedAttacker !== null;
  },
};

document.addEventListener('keydown', (ev) => {
  if (ui.screen === 'title') { if (ev.key === 'Enter' || ev.key === ' ') handlers.onStart(); return; }
  if (ui.screen === 'end' || (state && state.winner)) { if (ev.key === 'Enter' || ev.key === ' ') handlers.onRestart(); return; }
  if (!state || state.active !== 'player') return;
  if (ev.key === 'Escape') {
    ui.selectedHand = null; ui.selectedAttacker = null; ui.pendingCard = null;
    ui.hint = 'Selection cancelled.'; refresh(); return;
  }
  if (ev.key === 'e' || ev.key === 'E') { endPlayerTurn(); return; }
  const n = Number(ev.key);
  if (n >= 1 && n <= 7) handlers.onHandCard(n - 1);
});

// ---------- deterministic screenshot modes ----------
let shotUid = 100;
function spiritOn(stateObj, side, cardId, atk, hp, canAttackFlag) {
  const def = cardDef(cardId);
  shotUid += 1;
  stateObj.heroes[side].board.push({
    uid: shotUid,
    cardId, name: def.name, suit: def.suit,
    atk: atk ?? def.atk, hp: hp ?? def.hp, maxHp: def.hp, canAttack: !!canAttackFlag,
  });
}

function buildShotDuel() {
  state = createGame(seed);
  const p = state.heroes.player; const w = state.heroes.warden;
  p.life = 14; w.life = 9;
  p.emberMax = 6; p.ember = 4; w.emberMax = 6; w.ember = 0;
  p.hand = ['magmahulk', 'firebolt', 'frostsprite', 'overgrowth', 'stormdjinn'];
  w.hand = ['cinderfox', 'deepfreeze', 'thornpup', 'avalanche'];
  p.deck = p.deck.slice(0, 11); w.deck = w.deck.slice(0, 9);
  p.board = []; w.board = [];
  spiritOn(state, 'player', 'glacierbear', 4, 5, true);
  spiritOn(state, 'player', 'cinderfox', 4, 3, true); // Bond-grown: 3/2 became 4/3
  spiritOn(state, 'player', 'thornpup', 1, 2, false);
  spiritOn(state, 'warden', 'briargolem', 3, 4, false);
  spiritOn(state, 'warden', 'stormdjinn', 4, 2, false);
  p.lastSuit = 'flame'; w.lastSuit = 'storm';
  state.turn = 5; state.active = 'player';
  state.log = [
    'The duel begins. The Ash Warden bows, politely, like a fire.',
    'You play Glacier Bear.',
    'The Warden plays Briar Golem.',
    'You play Cinder Fox.',
    'Bond! Cinder Fox resonates with flame — Bond: +1/+1.',
    'The Warden\'s intent: burn down Glacier Bear, your biggest threat.',
    'The Warden plays Storm Djinn. Your turn — round 5.',
  ];
  ui.screen = 'duel';
  ui.hint = 'Bond just triggered: Cinder Fox grew to 4/3. Your move.';
  refresh();
}

function buildShotEnd(won) {
  buildShotDuel();
  state.winner = won ? 'player' : 'warden';
  if (won) { state.heroes.warden.life = 0; logLine(state, 'Magma Hulk strikes The Ash Warden for 5 — the Warden falls.'); }
  else { state.heroes.player.life = 0; logLine(state, 'Avalanche Yeti strikes You for 6 — your ember fades.'); }
  ui.screen = 'end';
  refresh();
}

if (shot === 'duel') buildShotDuel();
else if (shot === 'win') buildShotEnd(true);
else if (shot === 'loss') buildShotEnd(false);
else if (shot === 'title') { ui.screen = 'title'; refresh(); }
else { ui.screen = 'title'; refresh(); }
