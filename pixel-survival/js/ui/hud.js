// ═══ رابط کاربری: HUD، منو، نوتیفیکیشن ═══
import { $, fa } from '../core/engine.js';
import { G, ERA_COST, CATALOG, ERAS, countOf, canAfford, fmtCost, fmtRes, eraUp, buy } from '../core/state.js';
import { placeBuilding } from '../world/buildings.js';
import { addParticles, addFloatingText } from '../world/effects.js';
import { people, syncPopulation } from '../world/people.js';

export function refreshHUD() {
  const era = ERAS[G.era];
  $('#eraName').textContent = era.name;
  $('#dayCount').textContent = `روز ${fa(G.day)}`;
  
  const resEl = $('#resources');
  resEl.innerHTML = '';
  const order = ['food', 'wood', 'stone', 'fiber', 'metal', 'gold', 'science'];
  for (const k of order) {
    if (G.res[k] !== undefined) {
      const v = G.res[k];
      const cap = k === 'food' ? `/${fa(G.caps.food)}` : '';
      const warn = k === 'food' && v < G.pop * 5;
      const div = document.createElement('div');
      div.className = `res-item${warn ? ' warning' : ''}`;
      div.innerHTML = `${fmtRes(k, v)}${cap}`;
      div.title = `${k}: ${fa(Math.floor(v))}${cap}`;
      resEl.appendChild(div);
    }
  }
  
  // دکمه فلز
  const metalBtn = $('#metalBtn');
  if (metalBtn) metalBtn.hidden = G.era < 2;
  
  // لیست ساختمان‌ها
  renderBuildList();
  
  // دکمه پیشرفت
  updateAdvanceBtn();
}

function renderBuildList() {
  const list = $('#buildList');
  list.innerHTML = '';
  
  const available = CATALOG.filter(b => b.era <= G.era);
  for (const b of available) {
    const n = countOf(b.id);
    const maxed = n >= b.max;
    const affordable = canAfford(b.cost);
    
    const div = document.createElement('div');
    div.className = `build-item${maxed ? ' locked' : ''}${!affordable && !maxed ? ' locked' : ''}`;
    div.innerHTML = `
      <div class="build-info">
        <div class="build-name">${b.icon} ${b.name}</div>
        <div class="build-cost">${fmtCost(b.cost)}</div>
      </div>
      <div class="build-count">${fa(n)}/${b.max === 99 ? '∞' : fa(b.max)}</div>
    `;
    div.title = b.desc;
    if (!maxed && affordable) {
      div.addEventListener('click', () => {
        if (buy(b.id)) {
          placeBuilding(b.id);
          addParticles(innerWidth / 2, innerHeight / 2, 'build', 8);
          addFloatingText(innerWidth / 2, innerHeight / 2 - 30, `+۱ ${b.name}`, '#4ecdc4');
          refreshHUD();
          toast(`ساخته شد: ${b.name}`);
        }
      });
    }
    list.appendChild(div);
  }
}

function updateAdvanceBtn() {
  const btn = $('#advanceBtn');
  if (G.era >= ERAS.length - 1) {
    btn.innerHTML = '✦ <span>به اوج رسیده!</span>';
    btn.disabled = true;
    return;
  }
  
  const cost = ERA_COST[G.era];
  const affordable = canAfford(cost);
  btn.innerHTML = `✦ <span>پیشرفت به ${ERAS[G.era + 1].name}</span><br><small>${fmtCost(cost)}</small>`;
  btn.disabled = !affordable;
  
  btn.onclick = () => {
    if (eraUp()) {
      G.day++;
      addParticles(innerWidth / 2, innerHeight / 2, 'levelup', 20);
      addFloatingText(innerWidth / 2, innerHeight / 2 - 50, `✦ ${ERAS[G.era].name} ✦`, ERAS[G.era].color, 24);
      toast(`🎉 به ${ERAS[G.era].name} رسیدی!`);
      refreshHUD();
    }
  };
}

export function bindEraUp() {
  $('#advanceBtn').onclick = () => {
    const cost = ERA_COST[G.era];
    if (canAfford(cost)) {
      if (eraUp()) {
        G.day++;
        addParticles(innerWidth / 2, innerHeight / 2, 'levelup', 20);
        addFloatingText(innerWidth / 2, innerHeight / 2 - 50, `✦ ${ERAS[G.era].name} ✦`, ERAS[G.era].color, 24);
        toast(`🎉 به ${ERAS[G.era].name} رسیدی!`);
        refreshHUD();
      }
    } else {
      toast('منابع کافی نیست!', '#ff4757');
    }
  };
  
  $('#researchBtn').onclick = () => {
    G.res.science += 10 + G.pop * 2;
    addParticles(innerWidth / 2, innerHeight / 2, 'research', 10);
    addFloatingText(innerWidth / 2, innerHeight / 2 - 30, '+ علم', '#a29bfe');
    toast(`📚 پژوهش انجام شد! علم: +${10 + G.pop * 2}`);
    refreshHUD();
  };
  
  // جمع‌آوری منابع
  document.querySelectorAll('[data-action="gather"]').forEach(btn => {
    btn.onclick = () => {
      const type = btn.dataset.type;
      const amounts = { food: 3, wood: 3, stone: 2, fiber: 2, metal: 2 };
      const gain = amounts[type] || 1;
      G.res[type] = Math.min(type === 'food' ? G.caps.food : 99999, (G.res[type] || 0) + gain);
      addParticles(innerWidth / 2, innerHeight / 2, 'gather', 5);
      addFloatingText(innerWidth / 2, innerHeight / 2 - 30, `+${gain} ${type}`, '#4ecdc4');
      refreshHUD();
    };
  });
}

let toastTimeout = null;
export function toast(msg, color = '#ffd76a') {
  const el = $('#toast');
  el.textContent = msg;
  el.style.borderColor = color;
  el.style.color = color;
  el.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.remove('show'), 3000);
}

export function logEvent(msg) {
  const log = $('#eventLog');
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<span>[${fa(G.day)}]</span> ${msg}`;
  log.insertBefore(entry, log.firstChild);
  // محدود کردن تعداد
  while (log.children.length > 50) log.lastChild.remove();
}