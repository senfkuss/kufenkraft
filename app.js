// Kufenkraft – alle Daten liegen ausschließlich im lokalen Speicher dieses Geräts.
const KEY = 'kufenkraft-v1';
const app = document.querySelector('#app');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const iso = d => d.toLocaleDateString('sv');
const today = () => iso(new Date());
const D = ds => new Date(ds + 'T12:00');
const addDays = (ds, n) => { const d = D(ds); d.setDate(d.getDate() + n); return iso(d); };
const monday = ds => addDays(ds, -((D(ds).getDay() + 6) % 7));
const fmt = (ds, o = { weekday: 'short', day: 'numeric', month: 'short' }) => D(ds).toLocaleDateString('de-DE', o);
const mmss = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

function load() {
  const def = { sessions: [], levels: {}, got: {}, next: 'A', seasonStart: today(), seasonEnd: '2027-03-15' };
  try { return Object.assign(def, JSON.parse(localStorage.getItem(KEY)) || {}); } catch { return def; }
}
let S = load();
let P = null; // laufende Einheit
try { P = JSON.parse(localStorage.getItem(KEY + '-p')); } catch {}
const save = () => {
  localStorage.setItem(KEY, JSON.stringify(S));
  P ? localStorage.setItem(KEY + '-p', JSON.stringify(P)) : localStorage.removeItem(KEY + '-p');
};
save();

let view = location.hash.slice(1) || 'heute';
let fresh = null; // zuletzt gespeicherte Einheit, deren Linienstück gezeichnet wird
let F = { kind: FREE_KINDS[0], effort: 3 };

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
const lvl = id => Math.min(S.levels[id] || 0, EX[id].levels.length - 1);
const target = (id, l = lvl(id)) => {
  const e = EX[id], L = e.levels[l];
  return `${e.sets} × ${L.min}–${L.max} ${e.unit === 's' ? 'Sek.' : 'Wdh.'}${e.side ? ' je Seite' : ''}`;
};
function figs(id, l) {
  let k = l;
  while (k > 0 && !EX[id].levels[k].fig) k--;
  const f = EX[id].levels[k].fig;
  return `<div class="figs ${f.length === 1 ? 'one' : ''}">${f.map((p, i) => `<figure>${Fig.render(p)}${p.label || (i ? 'Ende' : 'Start')}</figure>`).join('')}</div>${k < l ? '<p class="muted">Die Grafik zeigt die Grundform. Die Hinweise unten beschreiben deine aktuelle Stufe.</p>' : ''}`;
}
// Vintage-Plakette mit Eisstern; nicht erreichte Abzeichen erscheinen blass.
function BADGE(got, i) {
  const rim = got ? (i % 2 ? '#8fc8c1' : '#f5b754') : '#efe9dc', rib = got ? (i % 2 ? '#f5b754' : '#8fc8c1') : '#efe9dc', ink = got ? '#2e4a49' : '#c3bcae';
  const pts = Array.from({ length: 40 }, (_, k) => { const a = k * Math.PI / 20, r = k % 2 ? 27.5 : 31; return (Math.cos(a) * r).toFixed(1) + ',' + (Math.sin(a) * r).toFixed(1); }).join(' ');
  return `<svg viewBox="-36 -34 72 86" aria-hidden="true"><path d="M-17 20L-23 47L-12 41L-6 49L-2 24ZM17 20L23 47L12 41L6 49L2 24Z" fill="${rib}" stroke="${ink}" stroke-width="1.3" stroke-linejoin="round"/>
    <polygon points="${pts}" fill="${rim}" stroke="${ink}" stroke-width="1.3" stroke-linejoin="round"/><circle r="22.5" fill="${got ? '#fbf6ee' : '#fffdf8'}" stroke="${ink}" stroke-width="1.3"/><circle r="18.8" fill="none" stroke="${ink}" stroke-width=".9" stroke-dasharray="1.2 2.6" stroke-linecap="round"/>
    <path transform="scale(1.45)" d="M0-9V9M-7.8-4.5L7.8 4.5M-7.8 4.5L7.8-4.5M-2.5-7L0-4.8L2.5-7M-2.5 7L0 4.8L2.5 7M-7.3-1.3L-4.2-2.4L-4.8-5.7M7.3 1.3L4.2 2.4L4.8 5.7M-7.3 1.3L-4.2 2.4L-4.8 5.7M7.3-1.3L4.2-2.4L4.8-5.7" fill="none" stroke="${ink}" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
const STAR = (x, y, title) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${title ? `<title>${title}</title>` : ''}<circle r="8.5" fill="#fff" opacity=".6"/><circle r="6.8" fill="#f5b754"/><path d="M0-4.6V4.6M-4-2.3L4 2.3M-4 2.3L4-2.3" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></g>`;
function rink() {
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hash = s => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);
  // Eine einzige Kufenlinie: jede Einheit setzt dort an, wo die vorige aufgehört hat.
  let x = 56, y = 392, h = -0.9;
  const segs = S.sessions.map(s => {
    const r = rng(hash(s.id)), pts = [[x, y]];
    let sign = r() < .5 ? -1 : 1;
    for (let a = 0, arcs = s.type === 'plan' ? 3 : 2; a < arcs; a++) {
      const steps = 16 + (r() * 16 | 0), k = (0.03 + r() * 0.085) * sign;
      for (let i = 0; i < steps; i++) {
        h += k;
        if (x < 26 || x > 274 || y < 26 || y > 414) { const d = ((Math.atan2(220 - y, 150 - x) - h + 9.4248) % 6.2832) - 3.1416; h += d * 0.22; }
        x += Math.cos(h) * 4; y += Math.sin(h) * 4; pts.push([x, y]);
      }
      if (r() > .3) sign = -sign;
    }
    return { id: s.id, pts };
  });
  const line = pts => pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const old = segs.filter(g => g.id !== fresh).length === segs.length ? segs : segs.slice(0, segs.findIndex(g => g.id === fresh));
  const newSeg = segs.find(g => g.id === fresh), after = newSeg ? segs.slice(segs.indexOf(newSeg) + 1) : [];
  const white = part => part.length ? `<polyline points="${line(part.flatMap(g => g.pts))}" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>` : '';
  const stars = Object.entries(S.got).map(([name, sid]) => ({ name, g: segs.find(g => g.id === sid) })).filter(o => o.g)
    .map((o, i, all) => { const n = all.slice(0, i).filter(q => q.g === o.g).length, p = o.g.pts[Math.max(0, o.g.pts.length - 1 - n * 7)]; return STAR(p[0], p[1], o.name); }).join('');
  const snow = rng(7), dots = Array.from({ length: 34 }, () => `<circle cx="${(8 + snow() * 284).toFixed(0)}" cy="${(8 + snow() * 424).toFixed(0)}" r="${(0.8 + snow() * 1.6).toFixed(1)}" fill="#fff" opacity=".85"/>`).join('');
  return `<svg class="rink" viewBox="0 0 300 440" role="img" aria-label="Deine Eisfläche mit ${S.sessions.length} Einheiten auf einer Kufenlinie">
    <defs><linearGradient id="ice" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c6ece9"/><stop offset="1" stop-color="#a5d6d0"/></linearGradient></defs>
    <rect width="300" height="440" fill="url(#ice)"/>${dots}
    ${white(old)}${white(after)}
    ${newSeg ? `<polyline class="new" pathLength="1" points="${line(newSeg.pts)}" fill="none" stroke="#f5b754" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
    ${stars}${segs.length ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#2e4a49" stroke="#fff" stroke-width="1.5"/>` : '<text x="150" y="210" text-anchor="middle" font-size="14" fill="#2e4a49">Noch unberührtes Eis</text>'}</svg>`;
}
const nav = () => `<nav>${[['heute', 'Heute'], ['eis', 'Eisfläche'], ['verlauf', 'Verlauf'], ['mehr', 'Mehr']].map(([v, t]) =>
  `<button data-a="nav" data-v="${v}" class="${view === v ? 'on' : ''}">${t}</button>`).join('')}</nav>`;

// ---------- Ansichten ----------
const V = {
  heute() {
    const st = stats(), w = WORKOUTS[S.next];
    const msg = st.cur >= 2 ? 'Gold-Woche geschafft.' : st.cur === 1 ? 'Woche geschafft. Eine weitere Einheit macht sie zur Gold-Woche.' : 'Eine Einheit, und diese Woche zählt.';
    return `<p class="muted date">${fmt(today(), { weekday: 'long', day: 'numeric', month: 'long' })}</p><h1 class="brand">Kufenkraft</h1>
    <div class="card"><div class="row"><div class="dots"><div class="dot ${st.cur >= 1 ? 'on' : ''} ${st.cur >= 2 ? 'gold' : ''}"></div><div class="dot ${st.cur >= 2 ? 'on gold' : ''}"></div></div>
      <div class="grow"><h3>Diese Woche: ${st.cur} ${st.cur === 1 ? 'Einheit' : 'Einheiten'}</h3><p class="muted">${msg}</p></div></div>
      <div class="row" style="margin-top:14px"><div class="stat"><b>${st.streak}</b><span>Wochen Serie</span></div><div class="stat"><b>${st.jok}</b><span>Joker</span></div><div class="stat"><b>${Object.keys(S.got).length}</b><span>Abzeichen</span></div></div></div>
    <div class="card">${P ? `<span class="chip acc">Läuft gerade</span>` : `<span class="chip">Als Nächstes</span>`}
      <h2 style="margin:8px 0 0">${w.name}</h2><p class="muted">${w.sub} · ca. 30 Minuten</p>
      <ul class="exlist">${w.ex.map(id => `<li><div class="grow">${EX[id].levels[lvl(id)].n}<small>${target(id)}</small></div><span class="chip">${EX[id].block}</span></li>`).join('')}</ul>
      <button class="btn" data-a="${P ? 'resume' : 'start'}">${P ? 'Einheit fortsetzen' : 'Einheit starten'}</button>
      ${P ? '' : `<button class="btn ghost" data-a="swap">Lieber ${WORKOUTS[S.next === 'A' ? 'B' : 'A'].name}</button>`}</div>
    <button class="btn sec" data-a="nav" data-v="frei">Freies Training eintragen</button>${nav()}`;
  },
  eis() {
    const st = stats(), wk = Math.min(st.weeks.length, st.total);
    return `<h1>Deine Eisfläche</h1><p class="muted">Saison bis ${fmt(S.seasonEnd, { day: 'numeric', month: 'long', year: 'numeric' })} · Woche ${wk} von ${st.total} · ${st.n} ${st.n === 1 ? 'Einheit' : 'Einheiten'} · ${Object.keys(S.got).length} von ${BADGES.length} Abzeichen</p>
    <div class="prog"><i style="width:${Math.round(wk / st.total * 100)}%"></i></div>
    <div style="margin:12px 0">${rink()}</div>
    ${BADGES.map(([n, d], i) => fresh && S.got[n] === fresh ? `<div class="card newstar">${BADGE(true, i)}<div><span class="chip gold">Neues Abzeichen</span><h3 style="margin-top:6px">${n}</h3><p class="muted">${d}</p></div></div>` : '').join('')}
    <p class="muted">Jede Einheit verlängert deine Kufenlinie, Plan-Einheiten etwas mehr als freies Training. Ein Eisstern markiert die Stelle, an der du ein Abzeichen verdient hast.</p>
    <h2>Abzeichen</h2><div class="badges">${BADGES.map(([n, d], i) => `<div class="badge ${S.got[n] ? 'got' : ''}">${BADGE(!!S.got[n], i)}<b>${n}</b>${d}</div>`).join('')}</div>${nav()}`;
  },
  verlauf() {
    const st = stats(), lab = { gold: ['Gold-Woche', 'gold'], ok: ['Geschafft', ''], joker: ['Joker eingesetzt', ''], miss: ['Ausgelassen', ''], open: ['Läuft', ''] };
    const by = {};
    S.sessions.forEach(s => (by[monday(s.date)] ||= []).push(s));
    const weeks = [...new Set([...st.weeks.map(x => x.w), ...Object.keys(by)])].sort().reverse();
    return `<h1>Verlauf</h1>${weeks.map(w => {
      const info = st.weeks.find(x => x.w === w), [t, c] = lab[info ? info.st : (by[w].length >= 2 ? 'gold' : 'ok')];
      return `<div class="card"><div class="row"><h3 class="grow">Woche ab ${fmt(w, { day: 'numeric', month: 'short' })}</h3><span class="chip ${c}">${t}</span></div>
        <ul class="exlist">${(by[w] || []).sort((a, b) => b.date.localeCompare(a.date)).map(s => `<li><div class="grow">${esc(s.kind)}<small>${fmt(s.date)} · ${s.minutes} Min.${s.effort ? ' · Anstrengung ' + s.effort + '/5' : ''}${s.note ? ' · ' + esc(s.note) : ''}</small></div><button class="del" data-a="del" data-id="${s.id}" aria-label="Eintrag löschen">✕</button></li>`).join('') || '<li class="muted">Keine Einheit</li>'}</ul></div>`;
    }).join('')}
    <h2>Deine Übungsstufen</h2><div class="card"><ul class="exlist">${Object.keys(EX).map(id => `<li><div class="grow">${EX[id].name}<small>${EX[id].levels[lvl(id)].n}</small></div><span class="chip">Stufe ${lvl(id) + 1}/${EX[id].levels.length}</span></li>`).join('')}</ul></div>${nav()}`;
  },
  mehr() {
    return `<h1>Mehr</h1>
    <div class="card"><h3>Übungskatalog</h3><p class="muted">Alle Übungen mit Grafik, Hinweisen und Stufen.</p><button class="btn sec" data-a="nav" data-v="katalog">Katalog öffnen</button></div>
    <div class="card"><h3>Saison</h3><label for="se">Saisonende</label><input id="se" type="date" value="${S.seasonEnd}" data-c="season"></div>
    <div class="card"><h3>Datensicherung</h3><p class="muted">Deine Daten liegen nur auf diesem Gerät. Sichere sie ab und zu als Datei.</p>
      <button class="btn sec" data-a="export">Daten als Datei sichern</button>
      <label for="imp">Sicherung einspielen</label><input id="imp" type="file" accept="application/json,.json" data-c="import"></div>${nav()}`;
  },
  katalog() {
    return `<div class="top"><button data-a="nav" data-v="mehr">‹ Zurück</button></div><h1>Übungskatalog</h1>${Object.keys(EX).map(id => {
      const e = EX[id];
      return `<div class="card"><span class="chip">${e.block}</span><h2 style="margin:8px 0 0">${e.name}</h2><p class="muted">${e.muscles}</p>${figs(id, 0)}
      <ul class="cues">${e.levels[0].cue.map(c => `<li>${c}</li>`).join('')}</ul>
      <ul class="exlist" style="margin-top:12px">${e.levels.map((L, i) => `<li><div class="grow">${L.n}<small>${target(id, i)}</small></div><span class="chip ${i === lvl(id) ? 'acc' : ''}">Stufe ${i + 1}</span></li>`).join('')}</ul></div>`;
    }).join('')}`;
  },
  frei() {
    return `<div class="top"><button data-a="nav" data-v="heute">‹ Zurück</button></div><h1>Freies Training</h1>
    <div class="card"><label>Art</label><select id="fk">${FREE_KINDS.map(k => `<option ${k === F.kind ? 'selected' : ''}>${k}</option>`).join('')}</select>
      <label for="fd">Datum</label><input id="fd" type="date" value="${today()}" max="${today()}">
      <label for="fm">Dauer in Minuten</label><input id="fm" type="number" inputmode="numeric" min="1" max="600" value="30">
      <label>Anstrengung</label><div class="seg">${[1, 2, 3, 4, 5].map(n => `<button data-a="effort" data-n="${n}" class="${F.effort === n ? 'on' : ''}">${n}</button>`).join('')}</div>
      <p class="muted">1 = locker, 5 = sehr anstrengend</p>
      <label for="fn">Notiz (z. B. Name des Videos)</label><input id="fn" type="text" maxlength="120">
      <button class="btn" data-a="freisave">Eintragen</button></div>`;
  },
  session() {
    const st = P.steps[P.i], pct = Math.round(P.i / (P.steps.length - 1) * 100);
    let body;
    if (st.t === 'warm' || st.t === 'cool') {
      const list = st.t === 'warm' ? WARMUP : COOLDOWN, cur = P.seq ?? -1;
      body = `<h1>${st.t === 'warm' ? 'Aufwärmen' : 'Ausklang'}</h1><p class="muted">Der Timer führt dich durch alle Schritte und gibt bei jedem Wechsel ein Signal.</p>
      <div class="card"><ul class="seq">${list.map((x, i) => `<li class="${i === cur ? 'cur' : i < cur ? 'past' : ''}"><span>${x.n}</span><span>${x.s} s</span></li>`).join('')}</ul>
      ${T ? '' : `<button class="btn sec" data-a="seq">${cur >= list.length ? 'Noch einmal' : 'Timer starten'}</button>`}</div>
      <button class="btn" data-a="pnext">Weiter</button>`;
    } else if (st.t === 'ex') {
      const id = st.id, e = EX[id], l = lvl(id), L = e.levels[l], sets = P.sets[id];
      body = `<span class="chip">${e.block} · Stufe ${l + 1}/${e.levels.length}</span><h1>${L.n}</h1><p class="muted">${e.muscles} · Ziel ${target(id)}</p>
      ${figs(id, l)}<ul class="cues">${L.cue.map(c => `<li>${c}</li>`).join('')}</ul>
      <div class="card">${sets.map((s, i) => `<div class="set"><span class="lab">Satz ${i + 1}</span>
        <button class="step" data-a="adj" data-i="${i}" data-d="-1" aria-label="weniger">−</button><span class="val">${s.v} <small>${e.unit === 's' ? 'Sek.' : 'Wdh.'}</small></span><button class="step" data-a="adj" data-i="${i}" data-d="1" aria-label="mehr">+</button>
        ${e.unit === 's' && !s.done ? `<button class="play" data-a="hold" data-i="${i}" aria-label="Timer starten">▶</button>` : ''}
        <button class="ok ${s.done ? 'done' : ''}" data-a="done" data-i="${i}" aria-label="Satz abhaken">✓</button></div>`).join('')}</div>
      <button class="btn" data-a="pnext">${sets.every(s => s.done) ? 'Weiter' : 'Überspringen'}</button>`;
    } else {
      const ups = P.steps.filter(x => x.t === 'ex').map(x => x.id).filter(id => {
        const L = EX[id].levels[lvl(id)];
        return lvl(id) < EX[id].levels.length - 1 && P.sets[id].every(s => s.done && s.v >= L.max);
      });
      const doneSets = Object.values(P.sets).flat().filter(s => s.done).length;
      body = `<h1>Geschafft</h1><p class="muted">${doneSets} Sätze in ${Math.max(1, Math.round((Date.now() - P.start) / 6e4))} Minuten.</p>
      ${ups.length ? `<div class="card"><h3>Bereit für die nächste Stufe</h3><p class="muted">Du hast überall das obere Ziel erreicht. Tippe an, wo du aufsteigen möchtest.</p>
        <ul class="exlist">${ups.map(id => `<li><div class="grow">${EX[id].name}<small>Neu: ${EX[id].levels[lvl(id) + 1].n}</small></div><button class="ok ${P.ups[id] ? 'done' : ''}" data-a="up" data-id="${id}" aria-label="Aufsteigen">↑</button></li>`).join('')}</ul></div>` : ''}
      <button class="btn" data-a="finish">Speichern und Linie weiterziehen</button>`;
    }
    return `<div class="top"><button data-a="pprev">${P.i ? '‹ Zurück' : ''}</button><div class="grow"><div class="prog"><i style="width:${pct}%"></i></div></div><button data-a="quit" style="text-align:right">Beenden</button></div>
    ${body}${T ? `<div class="timer"><b id="tm">${mmss(Math.max(0, Math.ceil((T.end - Date.now()) / 1000)))}</b><span>${esc(T.label)}</span><button data-a="tskip">Weiter</button></div>` : ''}`;
  },
};

// ---------- Timer ----------
let T = null, tick = null, wake = null, actx = null;
function beep() {
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.frequency.value = 880; o.connect(g); g.connect(actx.destination);
    g.gain.setValueAtTime(.25, actx.currentTime); g.gain.exponentialRampToValueAtTime(.001, actx.currentTime + .5);
    o.start(); o.stop(actx.currentTime + .5);
  } catch {}
  navigator.vibrate?.([200, 100, 200]);
}
function timer(sec, label, onDone) {
  T = { end: Date.now() + sec * 1000, label, onDone };
  clearInterval(tick);
  tick = setInterval(() => {
    if (!T) return;
    const left = Math.ceil((T.end - Date.now()) / 1000), el = document.querySelector('#tm');
    if (el) el.textContent = mmss(Math.max(0, left));
    if (left <= 0) { beep(); endTimer(); }
  }, 200);
  render();
}
function endTimer() { const f = T?.onDone; T = null; clearInterval(tick); f && f(); render(); }
function runSeq(list, i) {
  P.seq = i; save();
  if (i < list.length) timer(list[i].s, list[i].n, () => runSeq(list, i + 1));
}
async function keepAwake(on) {
  try { if (on) wake = await navigator.wakeLock?.request('screen'); else { await wake?.release(); wake = null; } } catch {}
}

// ---------- Aktionen ----------
const curEx = () => P.steps[P.i].id;
const A = {
  nav(d) { view = d.v; fresh = null; scrollTo(0, 0); },
  swap() { S.next = S.next === 'A' ? 'B' : 'A'; },
  start() {
    const ex = WORKOUTS[S.next].ex, sets = {};
    ex.forEach(id => {
      const l = lvl(id), last = [...S.sessions].reverse().find(s => s.sets?.[id] && s.lv?.[id] === l);
      sets[id] = Array.from({ length: EX[id].sets }, (_, i) => ({ v: last?.sets[id][i] || EX[id].levels[l].min, done: false }));
    });
    P = { w: S.next, i: 0, start: Date.now(), sets, ups: {}, steps: [{ t: 'warm' }, ...ex.map(id => ({ t: 'ex', id })), { t: 'cool' }, { t: 'end' }] };
    A.resume();
  },
  resume() { view = 'session'; keepAwake(true); scrollTo(0, 0); },
  pnext() { T = null; clearInterval(tick); P.seq = undefined; P.i = Math.min(P.i + 1, P.steps.length - 1); scrollTo(0, 0); },
  pprev() { if (P.i) { T = null; clearInterval(tick); P.seq = undefined; P.i--; scrollTo(0, 0); } },
  quit() {
    if (!confirm('Einheit abbrechen? Die bisherigen Sätze werden nicht gespeichert.')) return;
    T = null; clearInterval(tick); P = null; view = 'heute'; keepAwake(false);
  },
  adj(d) { const e = EX[curEx()], s = P.sets[curEx()][d.i]; s.v = Math.max(1, s.v + d.d * (e.unit === 's' ? 5 : 1)); },
  done(d) {
    const sets = P.sets[curEx()], s = sets[d.i]; s.done = !s.done;
    if (s.done && !sets.every(x => x.done)) { save(); timer(REST, 'Pause', null); }
  },
  hold(d) { const id = curEx(), i = d.i; timer(P.sets[id][i].v, 'Halten', () => { P.sets[id][i].done = true; save(); if (!P.sets[id].every(x => x.done)) setTimeout(() => timer(REST, 'Pause', null)); }); },
  seq() { runSeq(P.steps[P.i].t === 'warm' ? WARMUP : COOLDOWN, 0); },
  tskip() { endTimer(); },
  up(d) { P.ups[d.id] = !P.ups[d.id]; },
  finish() {
    const sets = {}, lv = {};
    Object.keys(P.sets).forEach(id => { sets[id] = P.sets[id].map(s => (s.done ? s.v : 0)); lv[id] = lvl(id); });
    const s = { id: Date.now().toString(36), date: today(), type: 'plan', workout: P.w, kind: WORKOUTS[P.w].name, minutes: Math.max(1, Math.round((Date.now() - P.start) / 6e4)), sets, lv };
    Object.keys(P.ups).forEach(id => { if (P.ups[id]) S.levels[id] = lvl(id) + 1; });
    S.sessions.push(s); award(s.id); S.next = P.w === 'A' ? 'B' : 'A'; P = null; fresh = s.id; view = 'eis'; keepAwake(false); scrollTo(0, 0);
  },
  effort(d) { F.effort = +d.n; F.keep = { fk: val('#fk'), fd: val('#fd'), fm: val('#fm'), fn: val('#fn') }; },
  freisave() {
    const minutes = Math.round(+val('#fm')), date = val('#fd') || today();
    if (!(minutes > 0) || date > today()) return alert('Bitte eine Dauer und ein Datum bis heute angeben.');
    const s = { id: Date.now().toString(36), date, type: 'frei', kind: val('#fk'), minutes, effort: F.effort, note: val('#fn').trim() };
    S.sessions.push(s); S.sessions.sort((a, b) => a.date.localeCompare(b.date));
    if (date < S.seasonStart) S.seasonStart = date;
    award(s.id);
    F = { kind: FREE_KINDS[0], effort: 3 }; fresh = s.id; view = 'eis'; scrollTo(0, 0);
  },
  del(d) {
    const s = S.sessions.find(x => x.id === d.id);
    if (s && confirm(`„${s.kind}“ vom ${fmt(s.date)} löschen? Das lässt sich nicht rückgängig machen.`)) { S.sessions = S.sessions.filter(x => x !== s); award(S.sessions.at(-1)?.id); }
  },
  export() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }));
    a.download = `kufenkraft-sicherung-${today()}.json`; a.click();
  },
};
const val = q => document.querySelector(q)?.value ?? '';

function render() {
  if (view === 'session' && !P) view = 'heute';
  app.innerHTML = (V[view] || V.heute)();
  if (view === 'frei' && F.keep) { Object.entries(F.keep).forEach(([k, v]) => { const el = document.querySelector('#' + k); if (el) el.value = v; }); F.keep = null; }
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el) return;
  const before = T;
  A[el.dataset.a]?.({ ...el.dataset, i: +el.dataset.i, d: +el.dataset.d });
  save();
  if (T === before || !T) render();
});
document.addEventListener('change', e => {
  const c = e.target.dataset.c;
  if (c === 'season' && e.target.value > today()) { S.seasonEnd = e.target.value; save(); }
  if (c === 'import' && e.target.files[0]) {
    e.target.files[0].text().then(t => {
      const d = JSON.parse(t);
      if (!Array.isArray(d.sessions)) throw 0;
      if (confirm(`Sicherung mit ${d.sessions.length} Einheiten einspielen? Die aktuellen Daten auf diesem Gerät werden ersetzt.`)) { S = Object.assign(load(), d); award(); save(); view = 'heute'; render(); }
    }).catch(() => alert('Diese Datei ist keine gültige Kufenkraft-Sicherung.'));
  }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && P && view === 'session') keepAwake(true); });
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js');
render();
