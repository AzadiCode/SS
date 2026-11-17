// ═══ همگام‌سازی با وب‌سرویس Flask (با fallback به localStorage) ═══
'use strict';
import { G } from '../core/state.js';

const KEY = 'evo_pid';

export async function loadGame() {
  let pid = localStorage.getItem(KEY);
  try {
    const r = await fetch('/api/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pid }) });
    const j = await r.json();
    pid = j.pid; localStorage.setItem(KEY, pid);
    G.pid = pid;
    if (j.state) Object.assign(G, j.state);
  } catch (e) {
    G.pid = pid || 'local';
    try { Object.assign(G, JSON.parse(localStorage.evo_save || '{}')); } catch (_) {}
  }
  return G;
}

export async function saveGame() {
  const state = { era: G.era, res: G.res, caps: G.caps, pop: G.pop, popMax: G.popMax, built: G.built };
  try {
    await fetch('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pid: G.pid, state }) });
  } catch (e) {}
  try { localStorage.evo_save = JSON.stringify(state); } catch (_) {}
}
