// Kufenkraft – alle Daten liegen ausschließlich im lokalen Speicher dieses Geräts.
const KEY = 'kufenkraft-v1';
const $ = q => document.querySelector(q);
const app = $('#app'), live = $('#live'), toastEl = $('#toast'), dlg = $('#dlg');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const iso = d => d.toLocaleDateString('sv');
const today = () => iso(new Date());
const D = ds => new Date(ds + 'T12:00');
const addDays = (ds, n) => { const d = D(ds); d.setDate(d.getDate() + n); return iso(d); };
const monday = ds => addDays(ds, -((D(ds).getDay() + 6) % 7));
const fmt = (ds, o = { weekday: 'short', day: 'numeric', month: 'short' }) => D(ds).toLocaleDateString('de-DE', o);
const mmss = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function load() {
  const def = { sessions: [], levels: {}, got: {}, next: 'A', seasonStart: today(), seasonEnd: '2027-03-15', seen: false };
  try { return Object.assign(def, JSON.parse(localStorage.getItem(KEY)) || {}); } catch { return def; }
}
let S = load();
let P = null; // laufende Einheit
try { P = JSON.parse(localStorage.getItem(KEY + '-p')); } catch {}
// Laufender Timer als reine Daten, damit er ein Neuladen übersteht: { k: 'rest'|'hold'|'switch'|'seq', end, i, id, side }
let T = P?.t && P.t.end > Date.now() ? P.t : null;
let tick = null, wake = null, actx = null;
const save = () => {
  localStorage.setItem(KEY, JSON.stringify(S));
  if (P) { P.t = T; localStorage.setItem(KEY + '-p', JSON.stringify(P)); } else localStorage.removeItem(KEY + '-p');
};
save();

const NAV = ['heute', 'eis', 'verlauf', 'mehr'];
// Eine Einheit, die vor weniger als drei Stunden begonnen wurde, öffnet sich direkt wieder.
let view = P && Date.now() - P.start < 3 * 36e5 ? 'session' : location.hash.slice(1) || 'heute';
let from = 'mehr';   // Ansicht, zu der „Zurück“ aus einer Unteransicht führt
let fresh = null;    // zuletzt gespeicherte Einheit, deren Linienstück gezeichnet wird
let openEx = null;   // Übung, die im Katalog aufgeklappt geöffnet wird
let pend = null;     // eingelesene Sicherung, die auf Bestätigung wartet
let undo = null, toastT = null, seasonErr = '';
let F = { kind: FREE_KINDS[0], effort: 3, err: {} };

// ---------- Auswertung ----------
function stats() {
  const wc = {};
  S.sessions.forEach(s => { const m = monday(s.date); wc[m] = (wc[m] || 0) + 1; });
  const cur = monday(today());
  let w = monday(S.seasonStart), streak = 0, best = 0, jok = 1, done = 0, gold = 0;
  const weeks = [];
  while (w <= cur) {
    const c = wc[w] || 0; let st;
    if (c >= 1) { streak++; done++; if (c >= 2) gold++; if (done % 4 === 0) jok = Math.min(2, jok + 1); st = c >= 2 ? 'gold' : 'ok'; }
    else if (w === cur) st = 'open';
    else if (jok > 0) { jok--; st = 'joker'; }
    else { streak = 0; st = 'miss'; }
    best = Math.max(best, streak);
    weeks.push({ w, c, st }); w = addDays(w, 7);
  }
  const total = Math.max(weeks.length, Math.round((D(monday(S.seasonEnd)) - D(monday(S.seasonStart))) / 6048e5) + 1);
  return { streak, best, jok, gold, weeks, total, cur: wc[cur] || 0, n: S.sessions.length, ups: Object.values(S.levels).reduce((a, b) => a + b, 0) };
}
const BADGES = [
  ['Erster Schritt aufs Eis', 'Die erste Einheit ist eingetragen', s => s.n >= 1],
  ['Fünf Einheiten', '5 Einheiten auf deiner Linie', s => s.n >= 5],
  ['Zehn Einheiten', '10 Einheiten auf deiner Linie', s => s.n >= 10],
  ['Fünfundzwanzig Einheiten', '25 Einheiten auf deiner Linie', s => s.n >= 25],
  ['Gold-Woche', 'Zwei Einheiten in einer Woche', s => s.gold >= 1],
  ['Vier am Stück', '4 Wochen Serie', s => s.best >= 4],
  ['Acht am Stück', '8 Wochen Serie', s => s.best >= 8],
  ['Aufsteigerin', 'Erste höhere Übungsstufe erreicht', s => s.ups >= 1],
  ['Dreifach gestiegen', 'Drei Stufenaufstiege', s => s.ups >= 3],
  ['Blindes Vertrauen', 'Gleithaltung mit geschlossenen Augen', () => (S.levels.gleit || 0) >= 2],
  ['Eiszeit', 'Erste Eiszeit eingetragen', () => S.sessions.some(x => x.kind === 'Eiszeit')],
  ['Eigene Wege', 'Drei freie Trainings eingetragen', () => S.sessions.filter(x => x.type === 'frei').length >= 3],
];

function award(sid) {
  const ids = new Set(S.sessions.map(s => s.id)), st = stats();
  Object.keys(S.got).forEach(n => { if (!ids.has(S.got[n])) delete S.got[n]; });
  if (sid) BADGES.forEach(([n, , f]) => { if (!S.got[n] && f(st)) S.got[n] = sid; });
}

// ---------- Bausteine ----------
const IC = d => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
const I = {
  check: IC('M5 12.5l4.5 4.5L19 7.5'), x: IC('M6 6l12 12M18 6L6 18'), up: IC('M12 19V5M6 11l6-6 6 6'),
  back: IC('M15 5l-7 7 7 7'), fwd: IC('M9 5l7 7-7 7'), minus: IC('M5 12h14'), plus: IC('M12 5v14M5 12h14'),
};
const lvl = id => Math.min(S.levels[id] || 0, EX[id].levels.length - 1);
const target = (id, l = lvl(id)) => {
  const e = EX[id], L = e.levels[l];
  return `${e.sets} × ${L.min}–${L.max} ${e.unit === 's' ? 'Sek.' : 'Wdh.'}${e.side ? ' je Seite' : ''}`;
};
function figs(id, l) {
  let k = l;
  while (k > 0 && !EX[id].levels[k].fig) k--;
  const f = EX[id].levels[k].fig, name = esc(EX[id].levels[k].n);
  return `<div class="figs ${f.length === 1 ? 'one' : ''}">${f.map((p, i) => {
    const cap = p.label || (i ? 'Ende' : 'Start');
    return `<figure>${Fig.render(p).replace('role="img"', `role="img" aria-label="${name}, ${cap}"`)}<figcaption>${cap}</figcaption></figure>`;
  }).join('')}</div>${k < l ? '<p class="note">Die Grafik zeigt die Grundform aus Stufe 1. Für deine Stufe gelten die Hinweise darunter.</p>' : ''}`;
}
// Vintage-Plakette mit Eisstern; nicht erreichte Abzeichen erscheinen blass.
function BADGE(got, i) {
  const rim = got ? (i % 2 ? '#8fc8c1' : '#f5b754') : '#e3eeec', rib = got ? (i % 2 ? '#f5b754' : '#8fc8c1') : '#e3eeec', ink = got ? '#2e4a49' : '#7d8f8d';
  const pts = Array.from({ length: 40 }, (_, k) => { const a = k * Math.PI / 20, r = k % 2 ? 27.5 : 31; return (Math.cos(a) * r).toFixed(1) + ',' + (Math.sin(a) * r).toFixed(1); }).join(' ');
  return `<svg viewBox="-36 -34 72 86" aria-hidden="true"><path d="M-17 20L-23 47L-12 41L-6 49L-2 24ZM17 20L23 47L12 41L6 49L2 24Z" fill="${rib}" stroke="${ink}" stroke-width="1.3" stroke-linejoin="round"/>
    <polygon points="${pts}" fill="${rim}" stroke="${ink}" stroke-width="1.3" stroke-linejoin="round"/><circle r="22.5" fill="${got ? '#f0f7f6' : '#fcfefe'}" stroke="${ink}" stroke-width="1.3"/><circle r="18.8" fill="none" stroke="${ink}" stroke-width=".9" stroke-dasharray="1.2 2.6" stroke-linecap="round"/>
    <path transform="scale(1.45)" d="M0-9V9M-7.8-4.5L7.8 4.5M-7.8 4.5L7.8-4.5M-2.5-7L0-4.8L2.5-7M-2.5 7L0 4.8L2.5 7M-7.3-1.3L-4.2-2.4L-4.8-5.7M7.3 1.3L4.2 2.4L4.8 5.7M-7.3 1.3L-4.2 2.4L-4.8 5.7M7.3-1.3L4.2-2.4L4.8-5.7" fill="none" stroke="${ink}" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
const STAR = (x, y, title, late) => `<g class="${late ? 'late' : ''}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${title ? `<title>${title}</title>` : ''}<circle r="7.2" fill="#f5b754" stroke="#2e4a49" stroke-width="1.3"/><path d="M0-4.2V4.2M-3.6-2.1L3.6 2.1M-3.6 2.1L3.6-2.1" stroke="#2e4a49" stroke-width="1.3" stroke-linecap="round"/></g>`;

// ---------- Eisfläche ----------
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hash = s => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);
const steer = (x, y, h) => x < 26 || x > 274 || y < 26 || y > 414 ? h + (((Math.atan2(220 - y, 150 - x) - h + 9.4248) % 6.2832) - 3.1416) * 0.22 : h;
// Eine einzige Kufenlinie: jede Einheit setzt dort an, wo die vorige aufgehört hat.
function trace() {
  let x = 56, y = 392, h = -0.9;
  const segs = S.sessions.map(s => {
    const r = rng(hash(s.id)), pts = [[x, y]];
    let sign = r() < .5 ? -1 : 1;
    for (let a = 0, arcs = s.type === 'plan' ? 3 : 2; a < arcs; a++) {
      const steps = 16 + (r() * 16 | 0), k = (0.03 + r() * 0.085) * sign;
      for (let i = 0; i < steps; i++) { h = steer(x, y, h + k); x += Math.cos(h) * 4; y += Math.sin(h) * 4; pts.push([x, y]); }
      if (r() > .3) sign = -sign;
    }
    return { id: s.id, pts };
  });
  return { segs, x, y, h };
}
const pl = pts => pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
const LINE = 'fill="none" stroke-linecap="round" stroke-linejoin="round"';
// Die Spur: dunkler Schnitt im Eis mit weißem Kern, damit sie auf hellem Eis erkennbar bleibt.
const cut = segs => segs.length ? `<polyline points="${pl(segs.flatMap(g => g.pts))}" ${LINE} stroke="#3a7770" stroke-width="3.4"/><polyline points="${pl(segs.flatMap(g => g.pts))}" ${LINE} stroke="#fff" stroke-width="1.5"/>` : '';
const ice = id => {
  const snow = rng(7), dots = Array.from({ length: 34 }, () => `<circle cx="${(8 + snow() * 284).toFixed(0)}" cy="${(8 + snow() * 424).toFixed(0)}" r="${(0.8 + snow() * 1.6).toFixed(1)}" fill="#fff" opacity=".85"/>`).join('');
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c6ece9"/><stop offset="1" stop-color="#a5d6d0"/></linearGradient></defs><rect width="300" height="440" fill="url(#${id})"/>${dots}`;
};
const TIP = (x, y, late) => `<circle class="${late ? 'late' : ''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#2e4a49" stroke="#fff" stroke-width="1.5"/>`;
function rink() {
  const { segs, x, y } = trace();
  const idx = segs.findIndex(g => g.id === fresh), newSeg = segs[idx];
  const old = idx < 0 ? segs : segs.slice(0, idx), after = idx < 0 ? [] : segs.slice(idx + 1);
  const stars = Object.entries(S.got).map(([name, sid]) => ({ name, g: segs.find(g => g.id === sid) })).filter(o => o.g)
    .map((o, i, all) => { const n = all.slice(0, i).filter(q => q.g === o.g).length, p = o.g.pts[Math.max(0, o.g.pts.length - 6 - n * 7)]; return STAR(p[0], p[1], o.name, o.g === newSeg); }).join('');
  return `<svg class="rink" viewBox="0 0 300 440" role="img" aria-label="Deine Eisfläche mit ${plural(S.sessions.length, 'Einheit', 'Einheiten')} auf einer Kufenlinie">
    ${ice('ice')}${cut(old)}${cut(after)}
    ${newSeg ? `<polyline class="new" pathLength="1" points="${pl(newSeg.pts)}" ${LINE} stroke="#2e4a49" stroke-width="5.4"/><polyline class="new" pathLength="1" points="${pl(newSeg.pts)}" ${LINE} stroke="#f5b754" stroke-width="3"/>` : ''}
    ${stars}${segs.length ? TIP(x, y, newSeg && !after.length) : '<text x="150" y="210" text-anchor="middle" font-size="14" fill="#2e4a49">Noch unberührtes Eis</text>'}</svg>`;
}
// Ausschnitt der Eisfläche um das Ende der Spur, mit dem nächsten Stück als gepunktete Einladung.
function peek() {
  const { segs, x, y, h } = trace(), inv = [[x, y]];
  let ix = x, iy = y, ih = h;
  for (let i = 0; i < 12; i++) { ih = steer(ix, iy, ih + 0.07); ix += Math.cos(ih) * 4; iy += Math.sin(ih) * 4; inv.push([ix, iy]); }
  const top = Math.max(0, Math.min(352, (y + iy) / 2 - 44));
  return `<svg viewBox="0 ${top.toFixed(0)} 300 88" aria-hidden="true">${ice('icep')}${cut(segs)}
    <polyline points="${pl(inv)}" ${LINE} stroke="#2e4a49" stroke-width="2.6" stroke-dasharray=".1 6"/>
    <circle cx="${ix.toFixed(1)}" cy="${iy.toFixed(1)}" r="5" fill="#f5b754" stroke="#2e4a49" stroke-width="1.5"/>${TIP(x, y)}</svg>`;
}
const nav = () => `<nav aria-label="Hauptnavigation">${[['heute', 'Heute'], ['eis', 'Eisfläche'], ['verlauf', 'Verlauf'], ['mehr', 'Mehr']].map(([v, t]) =>
  `<button data-a="nav" data-v="${v}" class="${view === v ? 'on' : ''}" ${view === v ? 'aria-current="page"' : ''}>${t}</button>`).join('')}</nav>`;
const backBtn = () => `<div class="top"><button data-a="back">${I.back}Zurück</button></div>`;

// ---------- Ansichten ----------
const V = {
  heute() {
    const st = stats(), w = WORKOUTS[S.next], got = Object.keys(S.got).length;
    const msg = st.cur >= 2 ? 'Gold-Woche geschafft.' : st.cur === 1 ? 'Woche geschafft. Eine weitere Einheit macht sie zur Gold-Woche.' : 'Eine Einheit, und diese Woche zählt.';
    const first = !S.seen && !S.sessions.length;
    const week = `<section class="card week">
      <button class="peek" data-a="nav" data-v="eis" aria-label="Deine Kufenlinie mit ${plural(st.n, 'Einheit', 'Einheiten')}. Eisfläche öffnen">${peek()}</button>
      <div class="weekrow"><div class="dots" aria-hidden="true"><div class="dot ${st.cur >= 1 ? 'on' : ''} ${st.cur >= 2 ? 'gold' : ''}"></div><div class="dot ${st.cur >= 2 ? 'on gold' : ''}"></div></div>
        <div class="grow"><h2 class="t3">Diese Woche: ${plural(st.cur, 'Einheit', 'Einheiten')}</h2><p class="muted">${msg}</p></div></div>
      <button class="more" data-a="nav" data-v="hilfe"><span>${plural(st.streak, 'Woche', 'Wochen')} Serie · ${st.jok} Joker · ${got} Abzeichen<span class="sr">. So wird gezählt</span></span>${I.fwd}</button>
    </section>`;
    return `<h1 class="brand">Kufenkraft</h1><p class="muted date">${fmt(today(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
    ${!first ? '' : `<section class="card intro"><h2 class="t3">So funktioniert Kufenkraft</h2>
      <ul class="cues"><li>Zwei Einheiten, A und B, im Wechsel. Jede dauert etwa 30 Minuten.</li><li>Du brauchst ein Teraband, einen Stuhl und eine Wand.</li><li>Eine Einheit pro Woche hält deine Serie. Zwei machen eine Gold-Woche.</li></ul>
      <div class="two"><button class="btn sec" data-a="seen">Verstanden</button><button class="btn ghost" data-a="nav" data-v="hilfe">Mehr dazu</button></div></section>`}
    ${first ? '' : week}
    <section class="card"><div class="row"><h2 class="hd grow">${w.name}</h2><span class="chip ${P ? 'acc' : ''}">${P ? 'Läuft gerade' : 'Als Nächstes'}</span></div>
      <p class="muted">${w.sub}&nbsp;· ca.&nbsp;30&nbsp;Minuten</p>
      <button class="btn" data-a="${P ? 'resume' : 'start'}">${P ? 'Einheit fortsetzen' : 'Einheit starten'}</button>
      <ul class="exlist">${w.ex.map(id => `<li class="tap"><button class="exrow" data-a="ex" data-id="${id}"><span class="grow">${EX[id].levels[lvl(id)].n}<small>${target(id)}</small></span><span class="chip">${EX[id].block}</span>${I.fwd}</button></li>`).join('')}</ul>
      ${P ? '' : `<button class="btn ghost" data-a="swap">Lieber ${WORKOUTS[S.next === 'A' ? 'B' : 'A'].name}</button>`}</section>
    ${first ? week : ''}
    <button class="btn sec" data-a="nav" data-v="frei">Freies Training eintragen</button>`;
  },
  eis() {
    const st = stats(), wk = Math.min(st.weeks.length, st.total), got = Object.keys(S.got).length, pct = Math.round(wk / st.total * 100);
    return `<h1>Deine Eisfläche</h1><p class="muted">Saison bis ${fmt(S.seasonEnd, { day: 'numeric', month: 'long', year: 'numeric' })} · Woche ${wk} von ${st.total} · ${plural(st.n, 'Einheit', 'Einheiten')} · ${got} von ${BADGES.length} Abzeichen</p>
    <div class="prog" role="progressbar" aria-label="Fortschritt der Saison" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>
    <div class="rinkwrap">${rink()}</div>
    <p class="muted">Jede Einheit verlängert deine Kufenlinie, Plan-Einheiten etwas mehr als freies Training. Ein Eisstern markiert die Stelle, an der du ein Abzeichen verdient hast.</p>
    ${BADGES.map(([n, d], i) => fresh && S.got[n] === fresh ? `<div class="card newstar">${BADGE(true, i)}<div><h2 class="t3">${n}</h2><p class="muted">${d}</p><span class="chip gold">Neues Abzeichen</span></div></div>` : '').join('')}
    <h2>Abzeichen</h2><ul class="badges">${BADGES.map(([n, d], i) => `<li class="badge ${S.got[n] ? 'got' : ''}">${BADGE(!!S.got[n], i)}<b>${n}</b>${d}<span class="sr">. ${S.got[n] ? 'Erreicht' : 'Noch offen'}</span></li>`).join('')}</ul>`;
  },
  verlauf() {
    const st = stats(), lab = { gold: ['Gold-Woche', 'gold'], ok: ['Geschafft', ''], joker: ['Joker eingesetzt', ''], miss: ['Ausgelassen', ''], open: ['Läuft', ''] };
    const by = {};
    S.sessions.forEach(s => (by[monday(s.date)] ||= []).push(s));
    const weeks = [...new Set([...st.weeks.map(x => x.w), ...Object.keys(by)])].sort().reverse();
    return `<h1>Verlauf</h1>${S.sessions.length ? '' : '<p class="muted">Hier sammeln sich deine Wochen, sobald die erste Einheit eingetragen ist.</p>'}${weeks.map(w => {
      const info = st.weeks.find(x => x.w === w), [t, c] = lab[info ? info.st : (by[w].length >= 2 ? 'gold' : 'ok')];
      return `<section class="card"><div class="row"><h2 class="t3 grow">Woche ab ${fmt(w, { day: 'numeric', month: 'short' })}</h2><span class="chip ${c}">${t}</span></div>
        <ul class="exlist">${(by[w] || []).sort((a, b) => b.date.localeCompare(a.date)).map(s => `<li><div class="grow">${esc(s.kind)}<small>${fmt(s.date)} · ${s.minutes} Min.${s.effort ? ' · Anstrengung ' + s.effort + '/5' : ''}${s.note ? ' · ' + esc(s.note) : ''}</small></div><button class="del" data-a="del" data-id="${s.id}" aria-label="${esc(s.kind)} vom ${fmt(s.date)} löschen">${I.x}</button></li>`).join('') || '<li class="muted">Keine Einheit</li>'}</ul></section>`;
    }).join('')}
    <h2>Deine Übungsstufen</h2><div class="card"><ul class="exlist">${Object.keys(EX).map(id => { const n = EX[id].levels[lvl(id)].n; return `<li><div class="grow">${EX[id].name}${n === EX[id].name ? '' : `<small>${n}</small>`}</div><span class="chip">Stufe ${lvl(id) + 1}/${EX[id].levels.length}</span></li>`; }).join('')}</ul></div>`;
  },
  mehr() {
    return `<h1>Mehr</h1>
    <section class="card"><h2 class="t3">So funktioniert's</h2><p class="muted">Was du brauchst, wie eine Woche zählt und woher der Plan stammt.</p><button class="btn sec" data-a="nav" data-v="hilfe">Erklärung öffnen</button></section>
    <section class="card"><h2 class="t3">Übungskatalog</h2><p class="muted">Alle Übungen mit Grafik, Hinweisen und Stufen.</p><button class="btn sec" data-a="nav" data-v="katalog">Katalog öffnen</button></section>
    <section class="card"><h2 class="t3">Saison</h2><p class="muted">Die Eisfläche zeigt, wie weit die Saison ist. Danach läuft die App einfach weiter.</p>
      <label for="se">Saisonende</label><input id="se" type="date" value="${S.seasonEnd}" min="${addDays(today(), 1)}" data-c="season" ${seasonErr ? 'aria-invalid="true" aria-describedby="se-e"' : ''}>${seasonErr ? `<p class="err" id="se-e" role="alert">${seasonErr}</p>` : ''}</section>
    <section class="card"><h2 class="t3">Datensicherung</h2><p class="muted">Deine Daten liegen nur auf diesem Gerät. Sichere sie ab und zu als Datei.</p>
      <button class="btn sec" data-a="export">Daten als Datei sichern</button>
      <label for="imp">Sicherung einspielen</label><input id="imp" type="file" accept="application/json,.json" data-c="import"></section>`;
  },
  hilfe() {
    return `${backBtn()}<h1>So funktioniert's</h1>
    <section class="card"><h2 class="t3">Was du brauchst</h2><p>Ein Teraband, einen Stuhl und eine Wand. Für eine höhere Stufe beim Wadenheben kommt eine Treppenstufe dazu.</p></section>
    <section class="card"><h2 class="t3">Die Einheiten</h2><p>Einheit A und B wechseln sich ab. Jede dauert etwa 30 Minuten: Aufwärmen, vier Kraftübungen, zwei Eislauf-Übungen, Ausklang. Freies Training wie Eiszeit oder Yoga kannst du zusätzlich eintragen.</p></section>
    <section class="card"><h2 class="t3">So zählt eine Woche</h2><p>Eine Einheit pro Woche hält deine Serie. Mit zwei Einheiten wird sie zur Gold-Woche. Die beiden Kreise auf der Startseite stehen für diese zwei Einheiten.</p>
      <p>Ein Joker überbrückt eine ausgelassene Woche, damit die Serie nicht abreißt. Du startest mit einem Joker und bekommst nach je vier geschafften Wochen einen dazu, höchstens zwei.</p></section>
    <section class="card"><h2 class="t3">Übungsstufen</h2><p>Jede Übung hat drei oder vier Stufen. Erreichst du in allen Sätzen das obere Ziel, bietet dir die App am Ende der Einheit den Aufstieg an. Du entscheidest, ob du ihn annimmst.</p></section>
    <section class="card"><h2 class="t3">Die Eisfläche</h2><p>Jede Einheit verlängert deine Kufenlinie. Ein Eisstern markiert die Stelle, an der du ein Abzeichen verdient hast.</p></section>
    <section class="card"><h2 class="t3">Deine Daten</h2><p>Alles liegt nur auf diesem Gerät. Es gibt kein Konto und keinen Server. Unter „Mehr“ kannst du deine Daten als Datei sichern und auf einem anderen Gerät einspielen.</p></section>
    <section class="card"><h2 class="t3">Woher der Plan stammt</h2><p>Der Plan wurde mit Claude, einer KI, zusammengestellt. Er stammt nicht von einer Trainerin oder einem Verein und ist nicht fachlich geprüft. Brich eine Übung ab, wenn sie schmerzt.</p></section>`;
  },
  katalog() {
    return `${backBtn()}<h1>Übungskatalog</h1><p class="muted">Tippe eine Übung an, um Grafik, Hinweise und Stufen zu sehen.</p>${Object.keys(EX).map(id => {
      const e = EX[id];
      return `<details class="card ex" id="ex-${id}" ${id === openEx ? 'open' : ''}><summary><span class="grow"><b>${e.name}</b><small>${e.muscles}</small></span><span class="chip">${e.block}</span>${I.fwd}</summary>
      <div class="in">${figs(id, 0)}<ul class="cues">${e.levels[0].cue.map(c => `<li>${c}</li>`).join('')}</ul>
      <ul class="exlist levels">${e.levels.map((L, i) => `<li><div class="grow">${L.n}<small>${target(id, i)}</small></div><span class="chip ${i === lvl(id) ? 'acc' : ''}">Stufe ${i + 1}${i === lvl(id) ? '<span class="sr">, deine Stufe</span>' : ''}</span></li>`).join('')}</ul></div></details>`;
    }).join('')}`;
  },
  frei() {
    const e = F.err, bad = (k, id) => e[k] ? `aria-invalid="true" aria-describedby="${id}-e"` : '', msg = (k, id) => e[k] ? `<p class="err" id="${id}-e" role="alert">${e[k]}</p>` : '';
    return `${backBtn()}<h1>Freies Training</h1>
    <div class="card"><label for="fk">Art</label><select id="fk">${FREE_KINDS.map(k => `<option ${k === F.kind ? 'selected' : ''}>${k}</option>`).join('')}</select>
      <label for="fd">Datum</label><input id="fd" type="date" value="${today()}" max="${today()}" ${bad('fd', 'fd')}>${msg('fd', 'fd')}
      <label for="fm">Dauer in Minuten</label><input id="fm" type="number" inputmode="numeric" min="1" max="600" value="30" ${bad('fm', 'fm')}>${msg('fm', 'fm')}
      <span class="lbl" id="fe-l">Anstrengung</span><div class="seg" role="group" aria-labelledby="fe-l" aria-describedby="fe-h">${[1, 2, 3, 4, 5].map(n => `<button data-a="effort" data-n="${n}" class="${F.effort === n ? 'on' : ''}" aria-pressed="${F.effort === n}">${n}</button>`).join('')}</div>
      <p class="muted" id="fe-h">1 = locker, 5 = sehr anstrengend</p>
      <label for="fn">Notiz (z. B. Name des Videos)</label><input id="fn" type="text" maxlength="120">
      <button class="btn" data-a="freisave">Eintragen</button></div>`;
  },
  session() {
    const st = P.steps[P.i], pct = Math.round(P.i / (P.steps.length - 1) * 100);
    const nextLabel = { ex: st.t === 'warm' ? 'Zur ersten Übung' : 'Nächste Übung', cool: 'Zum Ausklang', end: 'Abschließen' }[P.steps[P.i + 1]?.t];
    let body;
    if (st.t === 'warm' || st.t === 'cool') {
      const list = seqList(), cur = P.seq ?? -1, fin = cur >= list.length, name = st.t === 'warm' ? 'Aufwärmen' : 'Ausklang';
      body = `<h1>${name}</h1><p class="muted">Der Timer führt dich durch alle Schritte und gibt bei jedem Wechsel ein Signal.</p>
      <div class="card"><ol class="seq">${list.map((x, i) => `<li class="${i === cur ? 'cur' : i < cur ? 'past' : ''}"><span>${x.n}${i < cur ? '<span class="sr"> (erledigt)</span>' : ''}</span><span class="t">${x.s} Sek.</span></li>`).join('')}</ol></div>
      ${fin ? `<button class="btn" data-a="pnext">${nextLabel}</button><button class="btn ghost" data-a="seq">Noch einmal mit Timer</button>`
        : `<button class="btn" data-a="seq">${cur > 0 ? 'Timer fortsetzen' : 'Timer starten'}</button><button class="btn ghost" data-a="pnext">${name} überspringen</button>`}`;
    } else if (st.t === 'ex') {
      const id = st.id, e = EX[id], l = lvl(id), L = e.levels[l], sets = P.sets[id], nx = sets.findIndex(s => !s.done), u = e.unit === 's' ? 'Sek.' : 'Wdh.';
      body = `<h1>${L.n}</h1><p class="meta"><span class="chip">${e.block}</span><span class="chip">Stufe ${l + 1}/${e.levels.length}</span></p><p class="muted">${e.muscles} · Ziel ${target(id)}</p>
      ${figs(id, l)}<ul class="cues">${L.cue.map(c => `<li>${c}</li>`).join('')}</ul>
      <div class="card sets">${sets.map((s, i) => `<div class="set" role="group" aria-label="Satz ${i + 1}"><span class="lab" aria-hidden="true"><span class="w">Satz </span>${i + 1}</span>
        <button class="step" data-a="adj" data-i="${i}" data-d="-1" aria-label="Satz ${i + 1}: weniger">${I.minus}</button><span class="val">${s.v} <small>${u}</small></span><button class="step" data-a="adj" data-i="${i}" data-d="1" aria-label="Satz ${i + 1}: mehr">${I.plus}</button>
        <button class="ok ${s.done ? 'done' : ''}" data-a="done" data-i="${i}" aria-pressed="${s.done}" aria-label="Satz ${i + 1} erledigt">${s.done ? I.check : ''}</button></div>`).join('')}
        ${e.side ? '<p class="muted">Ein Satz zählt, wenn beide Seiten fertig sind.</p>' : ''}</div>
      ${nx < 0 ? `<button class="btn" data-a="pnext">${nextLabel}</button>`
        : `<button class="btn" data-a="setgo">${e.unit === 's' ? `Satz ${nx + 1} starten · ${sets[nx].v} Sek.` : `Satz ${nx + 1} von ${sets.length} fertig`}</button><button class="btn ghost" data-a="pnext">Übung überspringen</button>`}`;
    } else {
      const ups = P.steps.filter(x => x.t === 'ex').map(x => x.id).filter(id => {
        const L = EX[id].levels[lvl(id)];
        return lvl(id) < EX[id].levels.length - 1 && P.sets[id].every(s => s.done && s.v >= L.max);
      });
      const [done, all] = setCount();
      body = !done ? `<h1>Noch kein Satz abgehakt</h1><p class="muted">Eine Einheit zählt ab dem ersten abgehakten Satz.</p>
        <button class="btn" data-a="pfirst">Zurück zu den Übungen</button><button class="btn ghost" data-a="quit">Einheit verwerfen</button>`
        : `<h1>Geschafft</h1><p class="muted">${done} von ${all} Sätzen in ${plural(mins(), 'Minute', 'Minuten')}.</p>
      ${ups.length ? `<div class="card"><h2 class="t3">Bereit für die nächste Stufe</h2><p class="muted">Du hast überall das obere Ziel erreicht. Tippe an, wo du aufsteigen möchtest.</p>
        <ul class="exlist">${ups.map(id => `<li><div class="grow">${EX[id].name}<small>Neu: ${EX[id].levels[lvl(id) + 1].n}</small></div><button class="ok ${P.ups[id] ? 'done' : ''}" data-a="up" data-id="${id}" aria-pressed="${!!P.ups[id]}" aria-label="${EX[id].name}: aufsteigen">${P.ups[id] ? I.check : I.up}</button></li>`).join('')}</ul></div>` : ''}
      <button class="btn" data-a="finish">Speichern und Linie weiterziehen</button>`;
    }
    return `<div class="under" ${T ? 'inert' : ''}><div class="top">${P.i ? `<button data-a="pprev">${I.back}Zurück</button>` : '<span class="sp"></span>'}<div class="grow"><div class="prog" role="progressbar" aria-label="Fortschritt der Einheit" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div></div><button data-a="quit">Beenden</button></div>
    ${body}</div>${T ? timerHtml() : ''}`;
  },
};

// ---------- Timer ----------
const seqList = () => P.steps[P.i].t === 'warm' ? WARMUP : COOLDOWN;
const setCount = () => { const a = Object.values(P.sets).flat(); return [a.filter(s => s.done).length, a.length]; };
const mins = () => Math.max(1, Math.round((Date.now() - P.start) / 6e4));
const say = msg => { live.textContent = msg; };
function timerText() {
  if (T.k === 'seq') { const list = seqList(), nx = list[T.i + 1]; return [list[T.i].n, `Schritt ${T.i + 1} von ${list.length}` + (nx ? ` · Danach: ${nx.n}` : ''), nx ? 'Nächster Schritt' : 'Fertig']; }
  const sets = P.sets[T.id];
  if (T.k === 'rest') return ['Pause', `Danach Satz ${sets.findIndex(s => !s.done) + 1} von ${sets.length}`, 'Pause überspringen'];
  if (T.k === 'switch') return ['Seite wechseln', 'Gleich geht es mit der zweiten Seite weiter', 'Weiter'];
  return [T.side ? `Halten, ${T.side === 1 ? 'erste' : 'zweite'} Seite` : 'Halten', `Satz ${T.i + 1} von ${sets.length}`, 'Halten beenden'];
}
function timerHtml() {
  const [label, sub, skip] = timerText();
  return `<div class="timer" role="dialog" aria-modal="true" aria-label="Timer: ${esc(label)}"><p class="tl">${esc(label)}</p><b id="tm" aria-hidden="true">${mmss(Math.max(0, Math.ceil((T.end - Date.now()) / 1000)))}</b><p class="ts">${esc(sub)}</p><button class="btn" data-a="tskip">${skip}</button></div>`;
}
function prime() { // Ton im Moment eines Tippens freischalten, sonst bleibt er auf dem iPhone stumm.
  try { actx ||= new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch {}
}
function beep() {
  try {
    prime();
    [[880, 0], [1175, .22]].forEach(([f, at]) => {
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + at;
      o.frequency.value = f; o.connect(g); g.connect(actx.destination);
      g.gain.setValueAtTime(.3, t); g.gain.exponentialRampToValueAtTime(.001, t + .4);
      o.start(t); o.stop(t + .4);
    });
  } catch {}
  navigator.vibrate?.([200, 100, 200]);
}
function flash() { // Sichtbares Signal, falls Ton und Vibration ausbleiben.
  const f = document.createElement('div'); f.className = 'flash'; document.body.append(f); setTimeout(() => f.remove(), 700);
}
function startTimer(k, sec, o = {}) {
  T = { k, end: Date.now() + sec * 1000, ...o };
  say(`${timerText()[0]}, ${sec} Sekunden`);
  tick ||= setInterval(onTick, 200);
}
function onTick() {
  if (!T) { clearInterval(tick); tick = null; return; }
  const left = Math.ceil((T.end - Date.now()) / 1000), el = $('#tm');
  if (el) el.textContent = mmss(Math.max(0, left));
  if (left <= 0) { timerDone(); save(); render(); }
}
function timerDone(skipped) {
  const t = T; T = null;
  if (!skipped) { beep(); flash(); }
  if (!P) return;
  if (t.k === 'seq') {
    const list = seqList(); P.seq = t.i + 1;
    if (P.seq < list.length) startTimer('seq', list[P.seq].s, { i: P.seq }); else say('Alle Schritte geschafft.');
  } else if (t.k === 'switch') startTimer('hold', P.sets[t.id][t.i].v, { i: t.i, id: t.id, side: 2 });
  else if (t.k === 'hold') {
    if (t.side === 1) return startTimer('switch', 5, { i: t.i, id: t.id });
    const sets = P.sets[t.id]; sets[t.i].done = true;
    if (sets.every(s => s.done)) say('Alle Sätze geschafft.'); else startTimer('rest', REST, { id: t.id });
  } else { const sets = P.sets[t.id]; say(`Pause vorbei. Satz ${sets.findIndex(s => !s.done) + 1} von ${sets.length}.`); }
}
async function keepAwake(on) {
  try { if (on) wake = await navigator.wakeLock?.request('screen'); else { await wake?.release(); wake = null; } } catch {}
}

// ---------- Rückmeldungen ----------
function toast(msg, fn) {
  undo = fn || null;
  toastEl.innerHTML = `<span>${esc(msg)}</span>${fn ? '<button data-a="undo">Rückgängig</button>' : ''}`;
  toastEl.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => { toastEl.hidden = true; undo = null; }, fn ? 8000 : 4000);
}
function ask(title, text, btns) {
  dlg.innerHTML = `<h2 class="t3">${title}</h2><p>${text}</p>${btns.map(([t, a, c]) => `<button class="btn ${c || ''}" data-a="${a}">${t}</button>`).join('')}`;
  dlg.showModal();
}

// ---------- Aktionen ----------
const curEx = () => P.steps[P.i].id;
const val = q => $(q)?.value ?? '';
const A = {
  nav(d) { if (!NAV.includes(d.v) && NAV.includes(view)) from = view; view = d.v; fresh = null; seasonErr = ''; scrollTo(0, 0); },
  back() { view = from; scrollTo(0, 0); },
  ex(d) { from = view; openEx = d.id; view = 'katalog'; },
  seen() { S.seen = true; },
  noop() {},
  swap() { S.next = S.next === 'A' ? 'B' : 'A'; },
  start() {
    const ex = WORKOUTS[S.next].ex, sets = {};
    ex.forEach(id => {
      const l = lvl(id), last = [...S.sessions].reverse().find(s => s.sets?.[id] && s.lv?.[id] === l);
      sets[id] = Array.from({ length: EX[id].sets }, (_, i) => ({ v: last?.sets[id][i] || EX[id].levels[l].min, done: false }));
    });
    T = null;
    P = { w: S.next, i: 0, start: Date.now(), sets, ups: {}, steps: [{ t: 'warm' }, ...ex.map(id => ({ t: 'ex', id })), { t: 'cool' }, { t: 'end' }] };
    S.seen = true;
    A.resume();
  },
  resume() { view = 'session'; keepAwake(true); scrollTo(0, 0); },
  pnext() { T = null; P.seq = undefined; P.i = Math.min(P.i + 1, P.steps.length - 1); scrollTo(0, 0); },
  pprev() { if (P.i) { T = null; P.seq = undefined; P.i--; scrollTo(0, 0); } },
  pfirst() { P.i = 1; scrollTo(0, 0); },
  quit() {
    const [done, all] = setCount();
    ask('Einheit beenden?', done ? `Du hast ${done} von ${all} Sätzen abgehakt.` : 'Du hast noch keinen Satz abgehakt.',
      done ? [['Bis hierher speichern', 'finish'], ['Weitermachen', 'noop', 'sec'], ['Verwerfen', 'qdrop', 'ghost']] : [['Weitermachen', 'noop'], ['Verwerfen', 'qdrop', 'ghost']]);
  },
  qdrop() {
    T = null;
    const keep = JSON.stringify(P);
    P = null; view = 'heute'; keepAwake(false); scrollTo(0, 0);
    toast('Einheit verworfen.', () => { P = JSON.parse(keep); T = null; A.resume(); });
  },
  adj(d) { const e = EX[curEx()], s = P.sets[curEx()][d.i]; s.v = Math.max(1, s.v + d.d * (e.unit === 's' ? 5 : 1)); },
  done(d) {
    const id = curEx(), sets = P.sets[id], s = sets[d.i]; s.done = !s.done;
    if (sets.every(x => x.done)) T = null; else if (s.done) startTimer('rest', REST, { id });
  },
  setgo() { // Der große Knopf: nächsten Satz abhaken oder, bei Halteübungen, dessen Timer starten.
    const id = curEx(), e = EX[id], sets = P.sets[id], i = sets.findIndex(s => !s.done);
    if (i < 0) return;
    if (e.unit === 's') startTimer('hold', sets[i].v, { i, id, side: e.side ? 1 : 0 }); else A.done({ i });
  },
  seq() { const list = seqList(), cur = P.seq ?? -1, i = cur > 0 && cur < list.length ? cur : 0; P.seq = i; startTimer('seq', list[i].s, { i }); },
  tskip() { timerDone(true); },
  up(d) { P.ups[d.id] = !P.ups[d.id]; },
  finish() {
    if (!setCount()[0]) return;
    const sets = {}, lv = {};
    Object.keys(P.sets).forEach(id => { sets[id] = P.sets[id].map(s => (s.done ? s.v : 0)); lv[id] = lvl(id); });
    const s = { id: Date.now().toString(36), date: today(), type: 'plan', workout: P.w, kind: WORKOUTS[P.w].name, minutes: mins(), sets, lv };
    Object.keys(P.ups).forEach(id => { if (P.ups[id]) S.levels[id] = lvl(id) + 1; });
    T = null;
    S.sessions.push(s); award(s.id); S.next = P.w === 'A' ? 'B' : 'A'; P = null; fresh = s.id; view = 'eis'; keepAwake(false); scrollTo(0, 0);
  },
  effort(d) { F.effort = +d.n; F.keep = { fk: val('#fk'), fd: val('#fd'), fm: val('#fm'), fn: val('#fn') }; },
  freisave() {
    const minutes = Math.round(+val('#fm')), date = val('#fd');
    F.err = {};
    if (!(minutes > 0 && minutes <= 600)) F.err.fm = 'Gib eine Dauer zwischen 1 und 600 Minuten an.';
    if (!date || date > today()) F.err.fd = 'Wähle ein Datum bis heute.';
    if (F.err.fm || F.err.fd) { F.keep = { fk: val('#fk'), fd: date, fm: val('#fm'), fn: val('#fn') }; return; }
    const s = { id: Date.now().toString(36), date, type: 'frei', kind: val('#fk'), minutes, effort: F.effort, note: val('#fn').trim() };
    S.sessions.push(s); S.sessions.sort((a, b) => a.date.localeCompare(b.date));
    if (date < S.seasonStart) S.seasonStart = date;
    S.seen = true;
    award(s.id);
    F = { kind: FREE_KINDS[0], effort: 3, err: {} }; fresh = s.id; view = 'eis'; scrollTo(0, 0);
  },
  del(d) {
    const s = S.sessions.find(x => x.id === d.id);
    if (!s) return;
    const keep = JSON.stringify(S);
    S.sessions = S.sessions.filter(x => x !== s); award(S.sessions.at(-1)?.id);
    toast(`„${s.kind}“ vom ${fmt(s.date)} gelöscht.`, () => { S = JSON.parse(keep); });
  },
  undo() { undo?.(); undo = null; clearTimeout(toastT); toastEl.hidden = true; },
  export() {
    const a = document.createElement('a'), name = `kufenkraft-sicherung-${today()}.json`;
    a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`Sicherung erstellt: ${name}`);
  },
  impok() {
    if (!pend) return;
    const keep = JSON.stringify(S), n = pend.sessions.length;
    S = Object.assign(load(), pend); pend = null; award(); view = 'heute'; scrollTo(0, 0);
    toast(`Sicherung mit ${plural(n, 'Einheit', 'Einheiten')} eingespielt.`, () => { S = JSON.parse(keep); });
  },
};

// ---------- Darstellung ----------
// Nach jedem Neuaufbau landet der Fokus wieder auf demselben Bedienelement oder, bei neuer Ansicht, auf der Überschrift.
const sig = el => el.id ? '#' + el.id : el.dataset?.a ? ['a', 'v', 'i', 'd', 'id', 'n'].map(k => el.dataset[k] ?? '').join('|') : null;
let lastKey = null, hadTimer = false;
function render() {
  if (view === 'session' && !P) view = 'heute';
  if (!V[view]) view = 'heute';
  const act = document.activeElement, keep = app.contains(act) ? sig(act) : null, key = view + (view === 'session' ? P.i : ''), timing = !!T && view === 'session';
  app.innerHTML = `<main>${V[view]()}</main>${NAV.includes(view) ? nav() : ''}`;
  if (view === 'frei' && F.keep) { Object.entries(F.keep).forEach(([k, v]) => { const el = $('#' + k); if (el) el.value = v; }); F.keep = null; }
  let f = null;
  if (timing) f = $('.timer .btn');
  else if (lastKey !== null && key !== lastKey) { f = $('#app h1'); if (f) f.tabIndex = -1; }
  else if (hadTimer) f = $('main .btn');
  else if (keep) f = [...app.querySelectorAll('[data-a], [id]')].find(el => sig(el) === keep);
  if (view === 'frei' && (F.err.fd || F.err.fm)) f = $(F.err.fd ? '#fd' : '#fm');
  lastKey = key; hadTimer = timing;
  f?.focus({ preventScroll: true });
  if (openEx && view === 'katalog') { $('#ex-' + openEx)?.scrollIntoView(); openEx = null; }
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el) return;
  if (dlg.open) { dlg.close(); dlg.innerHTML = ''; }
  if (view === 'session' || el.dataset.a === 'start' || el.dataset.a === 'resume') prime();
  A[el.dataset.a]?.({ ...el.dataset, i: +el.dataset.i, d: +el.dataset.d });
  save();
  render();
});
document.addEventListener('change', e => {
  const c = e.target.dataset.c;
  if (c === 'season') {
    if (e.target.value > today()) { S.seasonEnd = e.target.value; seasonErr = ''; save(); toast('Saisonende gespeichert.'); }
    else seasonErr = 'Das Saisonende muss nach dem heutigen Tag liegen. Der bisherige Wert bleibt bestehen.';
    render();
  }
  if (c === 'import' && e.target.files[0]) {
    e.target.files[0].text().then(t => {
      const d = JSON.parse(t);
      if (!Array.isArray(d.sessions)) throw 0;
      pend = d;
      ask('Sicherung einspielen?', `Die Sicherung enthält ${plural(d.sessions.length, 'Einheit', 'Einheiten')}. Sie ersetzt die Daten auf diesem Gerät.`, [['Einspielen', 'impok'], ['Abbrechen', 'noop', 'sec']]);
    }).catch(() => toast('Diese Datei ist keine Kufenkraft-Sicherung. Wähle eine Datei, die mit „Daten als Datei sichern“ erstellt wurde.'))
      .finally(() => { e.target.value = ''; });
  }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && P && view === 'session') keepAwake(true); });
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js');
if (T) tick = setInterval(onTick, 200);
if (view === 'session' && P) keepAwake(true);
render();
