// ═══ رابط کاربری: نوار منابع، منوی ساخت، مودال عصر، توست ═══
'use strict';
import { $, fa } from '../core/engine.js';
import { G, ERAS, CATALOG, ERA_COST, eraItems, countOf, canAfford, fmtCost, eraUp } from '../core/state.js';
import { placeBuilding, rebuildAll } from '../world/buildings.js';
import { celebrate } from '../world/effects.js';
import * as THREE from 'three';

export const toast = msg => { const t = document.createElement('div'); t.className = 't'; t.textContent = msg; $('toast').appendChild(t); setTimeout(() => t.remove(), 2600); };

const RES_KEYS = { food: 'v_food', wood: 'v_wood', stone: 'v_stone', sci: 'v_sci', gold: 'v_gold' };
export function refreshHUD() {
  for (const [k, id] of Object.entries(RES_KEYS)) $(id).textContent = ({ food: '🍖', wood: '🪵', stone: '🪨', sci: '📜', gold: '🪙' })[k] + ' ' + fa(Math.floor(G.res[k]));
  $('v_pop').textContent = `👥 ${fa(G.pop)}/${fa(G.popMax)}`;
  $('eraName').textContent = `${ERAS[G.era].icon} ${ERAS[G.era].name}`;
  $('eraBar').firstElementChild.style.width = (G.era / (ERAS.length - 1) * 100) + '%';
  const up = $('eraUp');
  if (G.era >= ERAS.length - 1) { up.disabled = true; up.textContent = '🏆 تمدن شما به اوج رسید!'; }
  else {
    const c = ERA_COST[G.era];
    up.disabled = !canAfford(c);
    up.textContent = `⬆️ ${ERAS[G.era + 1].icon} ${ERAS[G.era + 1].name} — ${fmtCost(c)}`;
  }
  renderMenu();
}

function renderMenu() {
  const m = $('menu'); m.innerHTML = '';
  for (const b of eraItems()) {
    const n = countOf(b.id), full = n >= b.max, ok = canAfford(b.cost) && !full;
    const d = document.createElement('div');
    d.className = 'b' + (ok ? '' : ' off') + (full && b.max <= 5 ? ' maxed' : '');
    d.innerHTML = `<span class="ic">${b.icon}</span><b>${b.name}${b.max < 99 ? ` (${fa(n)}/${fa(b.max)})` : ''}</b><small>${b.desc}</small><small>${fmtCost(b.cost)}</small>`;
    if (ok) d.onclick = () => {
      if (placeBuilding(b.id)) { import('../core/state.js').then(s => { s.buy(b.id); refreshHUD(); toast(`${b.icon} ${b.name} ساخته شد!`); }); }
    };
    m.appendChild(d);
  }
}

export function bindEraUp() {
  $('eraUp').onclick = () => {
    if (!eraUp()) return;
    rebuildAll();
    const e = ERAS[G.era];
    $('emTitle').textContent = `${e.icon} ${e.name}`;
    $('emDesc').textContent = e.desc;
    $('eraModal').classList.add('on');
    celebrate(new THREE.Vector3(0, 3, 0));
    refreshHUD();
  };
  $('emOk').onclick = () => $('eraModal').classList.remove('on');
}
