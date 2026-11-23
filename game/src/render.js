// render.js — all DOM drawing: title screen, the duel table, end screens.
// Pure presentation: it reads state + ui and calls back through handlers.
import { BOND_TEXT, SUITS, cardDef } from './cards.js';

export function h(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

// Build an inline SVG element from markup text (parsed as HTML, so no
// namespace URI string ever appears in this file).
function svgFromMarkup(markup) {
  const holder = document.createElement('div');
  holder.innerHTML = markup.trim();
  return holder.firstElementChild;
}

export function suitSvg(suitKey, size = 22) {
  const suit = SUITS[suitKey];
  const paint = suit.fill
    ? `fill="${suit.color}" stroke="${suit.dark}" stroke-width="1"`
    : `fill="none" stroke="${suit.color}" stroke-width="2" stroke-linecap="round"`;
  return svgFromMarkup(
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="color:${suit.color}"><path d="${suit.path}" ${paint}></path></svg>`);
}

function heroPortrait(isWarden, size = 64) {
  // Hand-drawn SVG portraits: a hooded warden of ash vs a bright duelist.
  if (isWarden) {
    return svgFromMarkup(
      `<svg viewBox="0 0 64 64" width="${size}" height="${size}"><path d="M32 3 L50 22 L46 61 L18 61 L14 22 Z" fill="#3d2b52" stroke="#ff7847" stroke-width="2"></path><path d="M24 30 h6 M34 30 h6" stroke="#ffb347" stroke-width="3.4" stroke-linecap="round"></path></svg>`);
  }
  return svgFromMarkup(
    `<svg viewBox="0 0 64 64" width="${size}" height="${size}"><path d="M32 4 a13 13 0 1 1 -0.1 0 M14 61 C16 46 24 40 32 40 C40 40 48 46 50 61 Z" fill="#2e6d4e" stroke="#9fe870" stroke-width="2"></path></svg>`);
}

export function handCardEl(def, index, ui, handlers) {
  const suit = SUITS[def.suit];
  const e = h('div', 'card' + (def.kind === 'charm' ? ' charm' : ''));
  e.style.setProperty('--suit', suit.color);
  e.style.setProperty('--suit-dark', suit.dark);
  e.style.animationDelay = `${index * 70}ms`;
  const playable = handlers.canPlayAt(index);
  if (playable) e.classList.add('playable'); else e.classList.add('unaffordable');
  if (ui.selectedHand === index) e.classList.add('selected');
  e.appendChild(h('div', 'cost', String(def.cost)));
  e.appendChild(h('div', 'cname', def.name));
  const badge = h('div', 'suit-badge'); badge.appendChild(suitSvg(def.suit, 21)); e.appendChild(badge);
  const art = h('div', 'art'); art.appendChild(suitSvg(def.suit, def.kind === 'charm' ? 30 : 40)); e.appendChild(art);
  e.appendChild(h('div', 'ctext', def.text));
  e.appendChild(h('div', 'bond-line', BOND_TEXT[def.bond]));
  if (def.kind === 'spirit') {
    const stats = h('div', 'stats');
    stats.appendChild(h('span', 'atk', `⚔ ${def.atk}`.replace('⚔ ', 'ATK ')));
    stats.appendChild(h('span', 'hp', `HP ${def.hp}`));
    e.appendChild(stats);
  }
  e.title = `${def.name} — ${suit.name}, ${def.cost} Ember`;
  e.addEventListener('click', () => handlers.onHandCard(index));
  return e;
}

export function spiritEl(spirit, side, ui, handlers, state) {
  const suit = SUITS[spirit.suit];
  const e = h('div', 'spirit');
  e.style.setProperty('--suit', suit.color);
  e.style.setProperty('--suit-dark', suit.dark);
  if (spirit.hp < spirit.maxHp) e.classList.add('damaged');
  const mine = side === 'player';
  if (mine && spirit.canAttack && state.active === 'player' && !state.winner) e.classList.add('ready');
  if (!spirit.canAttack && mine) e.classList.add('drowsy');
  if (ui.selectedAttacker === spirit.uid && mine) e.classList.add('attacker');
  if (ui.flashUid === spirit.uid) e.classList.add('hit');
  if (handlers.isTargetable(side, spirit.uid)) e.classList.add('targetable');
  e.appendChild(h('div', 'sname', spirit.name));
  const badge = h('div', 'suit-badge'); badge.appendChild(suitSvg(spirit.suit, 17)); e.appendChild(badge);
  const art = h('div', 'art'); art.appendChild(suitSvg(spirit.suit, 30)); e.appendChild(art);
  const stats = h('div', 'stats');
  stats.appendChild(h('span', 'atk', `ATK ${spirit.atk}`));
  stats.appendChild(h('span', 'hp', `HP ${spirit.hp}`));
  e.appendChild(stats);
  e.addEventListener('click', () => handlers.onSpirit(side, spirit.uid));
  return e;
}

function heroPanel(state, side, ui, handlers) {
  // Compact portrait so the whole table fits a 1280x800 screen.
  const hero = state.heroes[side];
  const foe = side === 'warden';
  const panel = h('div', 'hero-panel ' + (foe ? 'foe' : 'me'));
  if (handlers.isHeroTargetable(side)) panel.classList.add('targetable');
  if (ui.flashSide === side) panel.classList.add('shake');
  const portrait = h('div', 'portrait'); portrait.appendChild(heroPortrait(foe, 40)); panel.appendChild(portrait);
  panel.appendChild(h('div', 'hero-name', hero.name));
  const life = h('div', 'life' + (hero.life > 8 ? ' good' : ''), `♥ ${hero.life} Life`);
  panel.appendChild(life);
  panel.appendChild(h('div', 'embers', '◆'.repeat(hero.ember) + '◇'.repeat(Math.max(0, hero.emberMax - hero.ember)) + ` ${hero.ember}/${hero.emberMax} Ember`));
  panel.appendChild(h('div', 'deck-note', `Deck ${hero.deck.length} · Hand ${hero.hand.length}`));
  panel.addEventListener('click', () => handlers.onHero(side));
  return panel;
}

function boardRow(state, side, ui, handlers) {
  const row = h('div', 'board-row');
  const board = state.heroes[side].board;
  if (!board.length) row.appendChild(h('div', 'empty-note', side === 'warden' ? 'The Warden\'s line is empty.' : 'Your line is empty — play a Spirit.'));
  for (const spirit of board) row.appendChild(spiritEl(spirit, side, ui, handlers, state));
  return row;
}

function logEl(state) {
  const log = h('div', 'log');
  for (const line of state.log.slice(-4)) {
    const cls = line.startsWith('Bond!') ? 'bond-line' : (line.includes('intent:') ? 'intent-line' : '');
    log.appendChild(h('div', cls, line));
  }
  log.scrollTop = log.scrollHeight;
  return log;
}

export function renderTitle(root, handlers) {
  root.innerHTML = '';
  const s = h('div', 'screen');
  const row = h('div', 'ember-row');
  for (const key of ['flame', 'frost', 'thorn', 'storm']) {
    const holder = h('span'); holder.style.color = SUITS[key].color; holder.appendChild(suitSvg(key, 44)); row.appendChild(holder);
  }
  s.appendChild(row);
  s.appendChild(h('h1', '', 'EMBERFALL DUEL'));
  s.appendChild(h('p', 'tagline', 'A card duel of suits and embers, against the Ash Warden.'));
  const how = h('div', 'howto');
  how.appendChild(h('h3', '', 'How to play'));
  const lines = [
    'You and the Ash Warden each have 20 Life. Reduce the Warden to 0 to win.',
    'Each turn your Ember grows (+1, up to 10) and refills. Click a card in your hand to play it; Charms that need a target light their targets up.',
    'Spirits wait a turn, then click one of yours, then an enemy Spirit — or the Warden\'s portrait — to attack.',
    'Bond: play a card whose suit matches your previous card\'s suit and its Bond bonus fires — growth, healing, sparks, extra cards.',
    'An empty deck is fatigue: every draw costs more Life than the last. Keys: 1–7 pick a card, E ends the turn, Esc cancels.',
  ];
  for (const line of lines) how.appendChild(h('p', '', line));
  s.appendChild(how);
  const start = h('button', 'big-btn', 'Start Duel');
  start.addEventListener('click', handlers.onStart);
  s.appendChild(start);
  root.appendChild(s);
}

export function renderDuel(root, state, ui, handlers) {
  root.innerHTML = '';
  const top = h('div', 'topbar');
  top.appendChild(h('div', 'game-name', 'EMBERFALL DUEL'));
  const banner = h('div', 'turn-banner',
    state.winner ? 'The duel is decided' : (state.active === 'player' ? `Your turn — round ${state.turn}` : 'The Ash Warden is thinking…'));
  top.appendChild(banner);
  const mute = h('button', 'icon-btn', ui.muted ? 'Sound: OFF' : 'Sound: ON');
  mute.addEventListener('click', handlers.onMute);
  top.appendChild(mute);
  root.appendChild(top);

  const table = h('div', 'table');
  // Warden zone: portrait panel + card backs + board
  const foeZone = h('div', 'zone');
  foeZone.appendChild(heroPanel(state, 'warden', ui, handlers));
  const foeHand = h('div', 'foe-hand');
  state.heroes.warden.hand.forEach((_, i) => {
    const back = h('div', 'card-back'); back.style.animationDelay = `${i * 60}ms`; foeHand.appendChild(back);
  });
  if (!state.heroes.warden.hand.length) foeHand.appendChild(h('div', 'empty-note', 'No cards in hand'));
  foeZone.appendChild(foeHand);
  foeZone.appendChild(h('div', 'empty-note', `Warden holds ${state.heroes.warden.hand.length} cards`));
  table.appendChild(foeZone);
  table.appendChild(boardRow(state, 'warden', ui, handlers));
  const mid = h('div', 'midline');
  mid.appendChild(h('div', 'rule')); mid.appendChild(h('div', 'vs', 'VS')); mid.appendChild(h('div', 'rule'));
  table.appendChild(mid);
  table.appendChild(boardRow(state, 'player', ui, handlers));

  const bottom = h('div', 'bottom-zone');
  const handArea = h('div', 'hand-area');
  const handRow = h('div', 'hand-row');
  state.heroes.player.hand.forEach((id, i) => handRow.appendChild(handCardEl(cardDef(id), i, ui, handlers)));
  if (!state.heroes.player.hand.length) handRow.appendChild(h('div', 'empty-note', 'Your hand is empty.'));
  handArea.appendChild(handRow);
  handArea.appendChild(h('div', 'hint', ui.hint));
  bottom.appendChild(handArea);
  const stack = h('div', 'side-stack');
  stack.appendChild(heroPanel(state, 'player', ui, handlers));
  const end = h('button', 'end-btn', 'End Turn (E)');
  end.disabled = state.active !== 'player' || !!state.winner;
  end.addEventListener('click', handlers.onEndTurn);
  stack.appendChild(end);
  bottom.appendChild(stack);
  table.appendChild(bottom);
  table.appendChild(logEl(state));
  root.appendChild(table);
}

export function renderEnd(root, state, handlers) {
  root.innerHTML = '';
  const won = state.winner === 'player';
  const s = h('div', 'screen');
  const flame = h('div', 'result-flame');
  flame.appendChild(suitSvg(won ? 'flame' : 'frost', 84));
  s.appendChild(flame);
  s.appendChild(h('h2', '', won ? 'THE WARDEN FALLS' : 'YOUR EMBER FADES'));
  s.appendChild(h('p', 'score-line', won
    ? `You win with ${state.heroes.player.life} Life to spare, on round ${state.turn}.`
    : `The Ash Warden stands at ${state.heroes.warden.life} Life. Your line fought to round ${state.turn}.`));
  const tail = state.log.slice(-3);
  const box = h('div', 'howto');
  box.appendChild(h('h3', '', 'Final moments'));
  for (const line of tail) box.appendChild(h('p', '', line));
  s.appendChild(box);
  const again = h('button', 'big-btn', 'Play Again');
  again.addEventListener('click', handlers.onRestart);
  s.appendChild(again);
  root.appendChild(s);
}
