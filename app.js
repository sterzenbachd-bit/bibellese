/* Bibellese: eine Datei, keine Abhängigkeiten. Zustand in localStorage, Bibeltext-Dateien in IndexedDB. */
(function () {
'use strict';

const VERSION = '1.0.0';
const KEY = 'bibellese.v1';
const SUP_DIG = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const SUP_LET = 'ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ';
const KNOWN = [
  { id: 'luther', name: 'Lutherbibel 2017', short: 'LUT' },
  { id: 'schlachter', name: 'Schlachter 2000', short: 'SLT' },
  { id: 'nl', name: 'Neues Leben', short: 'NLB' },
  { id: 'web', name: 'World English Bible', short: 'WEB' }
];
const UNIT_SRC = { id: 'unit', name: 'Aus der Einheit', short: 'Einheit' };
const TITLE_BOOKS = {
  'psalm': 'Ps', 'matthäus': 'Mt', 'markus': 'Mk', 'lukas': 'Lk', 'johannes': 'Joh', 'genesis': 'Gen', '1. mose': 'Gen',
  'exodus': 'Ex', '2. mose': 'Ex', 'deuteronomium': 'Dtn', '5. mose': 'Dtn', 'jesaja': 'Jes', 'römer': 'Röm',
  'galater': 'Gal', 'epheser': 'Eph', 'hesekiel': 'Hes', 'jona': 'Jon', 'klagelieder': 'Klgl', 'philipper': 'Phil',
  'kolosser': 'Kol', '1. korinther': '1 Kor', '2. korinther': '2 Kor', 'hebräer': 'Hebr', 'jakobus': 'Jak',
  '1. petrus': '1 Petr', '1. johannes': '1 Joh', 'offenbarung': 'Offb', 'apostelgeschichte': 'Apg'
};
const SEC = [
  ['bibeltext', /^Bibeltext/i], ['einstieg', /^Einstieg$/i], ['kontext', /^Kontextanalyse$/i],
  ['liturgie', /^Liturgischer Anklang$/i], ['auslegung', /^Theologische Auslegung$/i],
  ['anwendung', /^Pers(ö|oe)nliche Anwendung$/i], ['stille', /^Kontemplativer Zugang/i], ['gebet', /^Gebet$/i],
  ['lied', /^Liedstrophe$/i], ['wirkung', /^Wirkungsgeschichtliche Auslegung$/i], ['vorschau', /^Vorschau$/i],
  ['nachweise', /^Schriftnachweise$/i]
];
const LABELS = {
  einstieg: 'EINSTIEG', kontext: 'KONTEXT', liturgie: 'LITURGISCHER ANKLANG', auslegung: 'AUSLEGUNG',
  anwendung: 'PERSÖNLICHE ANWENDUNG', stille: 'STILLE', gebet: 'GEBET', lied: 'LIEDSTROPHE',
  wirkung: 'WIRKUNGSGESCHICHTE', vorschau: 'VORSCHAU'
};

/* ---------- Zustand ---------- */
function fresh() {
  return { units: {}, read: {}, sources: [], settings: { translation: 'unit', font: 'serif', size: 20, theme: 'system', stille: 3 } };
}
function load() {
  try {
    const o = JSON.parse(localStorage.getItem(KEY));
    if (o && o.units) {
      const f = fresh();
      return { units: o.units, read: o.read || {}, sources: o.sources || [], settings: Object.assign(f.settings, o.settings || {}) };
    }
  } catch (e) { /* leer oder gesperrt */ }
  return fresh();
}
let S = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* Speicher gesperrt */ } }

const SRC = {}; /* id -> Bibeltext-Datei (Objekt) */
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('bibellese', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('sources', { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbAll() {
  const db = await idb();
  return new Promise((res, rej) => { const q = db.transaction('sources').objectStore('sources').getAll(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
}
async function idbPut(o) {
  const db = await idb();
  return new Promise((res, rej) => { const t = db.transaction('sources', 'readwrite'); t.objectStore('sources').put(o); t.oncomplete = res; t.onerror = () => rej(t.error); });
}
async function idbDel(id) {
  const db = await idb();
  return new Promise((res, rej) => { const t = db.transaction('sources', 'readwrite'); t.objectStore('sources').delete(id); t.oncomplete = res; t.onerror = () => rej(t.error); });
}

/* ---------- Hilfen ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const app = $('#app'), layer = $('#layer');
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2800);
}
function go(h) { if (location.hash === h) route(); else location.hash = h; }
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
const ICON = {
  today: '<svg viewBox="0 0 24 24"><path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z"/><path d="M12 6v13.5"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  check: '<svg class="ic" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chev: '<svg class="ic" viewBox="0 0 24 24" style="stroke:var(--muted)"><path d="M9 5l7 7-7 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'
};

/* ---------- Einheiten lesen ---------- */
const HEAD = /^\s*(?:#{1,3}\s*)?\**\s*Einheit\s+(\d+)\s*[:\-–—]\s*(.+?)\s*\**\s*$/;
function splitUnits(text) {
  text = String(text).replace(/\r\n?/g, '\n').replace(/^﻿/, '');
  const out = []; let cur = null; let prevBlank = true;
  for (const ln of text.split('\n')) {
    const m = HEAD.exec(ln);
    const isHead = m && ((/^\s*#/.test(ln) || prevBlank) && m[2].length <= 90);
    if (isHead) {
      cur = { n: parseInt(m[1], 10), title: m[2].replace(/\*+/g, '').trim(), lines: [] };
      out.push(cur);
    } else if (cur) cur.lines.push(ln);
    prevBlank = !ln.trim();
  }
  return out.map((u) => ({ n: u.n, title: u.title, raw: '# Einheit ' + u.n + ': ' + u.title + '\n\n' + u.lines.join('\n').trim() }));
}
function secKey(line) {
  const m = /^\s*(?:#{1,4}\s*)?\**\s*(.+?)\s*\**\s*$/.exec(line);
  if (!m || m[1].length > 60) return null;
  for (const [k, re] of SEC) if (re.test(m[1])) return k;
  return null;
}
function parseUnit(u) {
  const lines = u.raw.split('\n').slice(1);
  const p = { n: u.n, title: u.title, lead: '', sec: {}, order: [] };
  let key = 'lead'; const buf = { lead: [] };
  for (const ln of lines) {
    const k = secKey(ln);
    if (k && !(k in buf)) { key = k; buf[k] = []; p.order.push(k); continue; }
    buf[key].push(ln);
  }
  p.lead = buf.lead.join('\n').trim();
  for (const k of p.order) p.sec[k] = buf[k].join('\n').trim();
  p.verses = []; p.heads = [];
  for (const raw of (p.sec.bibeltext || '').split('\n')) {
    const ln = raw.trim().replace(/^\*+|\*+$/g, '').trim();
    if (!ln) continue;
    const m = new RegExp('^([' + SUP_DIG + ']+)\\s*(.*)$').exec(ln);
    if (m) p.verses.push({ v: parseInt([...m[1]].map((c) => SUP_DIG.indexOf(c)).join(''), 10), t: m[2].trim() });
    else if (p.verses.length) p.verses[p.verses.length - 1].t += ' ' + ln;
    else p.heads.push(ln);
  }
  p.refs = {};
  let last = null;
  const lre = new RegExp('^\\s*([' + SUP_LET + '])\\s+([^:]+?):\\s*(.*)$');
  for (const ln of (p.sec.nachweise || '').split('\n')) {
    const m = lre.exec(ln);
    if (m) { last = { ref: m[2].trim(), text: m[3].trim() }; p.refs[m[1]] = last; }
    else if (ln.trim() && last) last.text += ' ' + ln.trim();
  }
  p.steps = [];
  const sre = /\**(Lectio|Meditatio|Oratio|Contemplatio)[^:\n]*?:\**\s*(.+)/g;
  let sm; const st = p.sec.stille || '';
  while ((sm = sre.exec(st))) p.steps.push({ name: sm[1], text: sm[2].trim().replace(/\*+/g, '') });
  p.stilleHead = st.split('\n').find((l) => l.trim() && !/^\**(Lectio|Meditatio|Oratio|Contemplatio)/.test(l.trim())) || '';
  return p;
}
function unitRef(p) {
  const m = /^((?:\d\.\s*)?[A-Za-zÄÖÜäöüß]+)\s+(\d+)(?:,(\d+)(?:\s*[–-]\s*(\d+))?)?/.exec(p.title);
  if (!m) return null;
  const book = TITLE_BOOKS[m[1].toLowerCase()]; if (!book) return null;
  let v1 = m[3] ? +m[3] : null, v2 = m[4] ? +m[4] : v1;
  if (v1 === null && p.verses.length) { v1 = Math.min(...p.verses.map((x) => x.v)); v2 = Math.max(...p.verses.map((x) => x.v)); }
  if (v1 === null) return null;
  return { book, ch: +m[2], v1, v2 };
}

/* ---------- Textquellen ---------- */
function translations() {
  const list = [UNIT_SRC].concat(KNOWN);
  for (const s of S.sources) if (!KNOWN.some((k) => k.id === s.id)) list.push({ id: s.id, name: s.name, short: s.short || s.id.toUpperCase() });
  return list;
}
function tInfo(id) { return translations().find((t) => t.id === id) || UNIT_SRC; }
function hasText(id) { return id === 'unit' || !!SRC[id]; }
function lookup(id, book, ch, v1, v2) {
  const src = SRC[id]; if (!src || !src.books) return null;
  const b = src.books[book] || src.books[book.replace(' ', '')]; if (!b || !b[ch]) return null;
  const out = [];
  for (let v = v1; v <= v2; v++) { const t = b[ch][v]; if (t == null) return null; out.push({ v, t }); }
  return out;
}
function bookKey(raw) { raw = raw.replace(/\./g, '').replace(/\s+/g, ' ').trim(); return /^\d\S/.test(raw) ? raw.replace(/^(\d)/, '$1 ') : raw; }

/* ---------- Textaufbereitung ---------- */
function inline(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>'); }
function prose(text, refs) {
  const re = new RegExp('[' + SUP_LET + ']', 'g');
  return text.split(/\n\s*\n/).filter((x) => x.trim()).map((par) =>
    '<p>' + inline(par.replace(/\n/g, ' ')).replace(re, (c) => refs[c] ? '<button class="ref" data-act="ref" data-v="' + c + '" aria-label="Verweis ' + c + ' öffnen">' + c + '</button>' : c) + '</p>').join('');
}
function plain(text) { return text.split(/\n\s*\n/).filter((x) => x.trim()).map((x) => '<p>' + inline(x.replace(/\n/g, ' ')) + '</p>').join(''); }
function lied(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const strophe = [], rest = [];
  for (const l of lines) (/^\*/.test(l) ? strophe : rest).push(l.replace(/^\*+|\*+$/g, ''));
  return '<p class="verse">' + strophe.map(esc).join('<br>') + '</p>' + (rest.length ? '<p class="small">' + rest.map(esc).join('<br>') + '</p>' : '');
}

/* ---------- Plan ---------- */
const PLAN = window.PLAN;
function phaseOf(n) { return PLAN.phases.findIndex((p) => p.from != null && n >= p.from && n <= p.to); }
const nums = () => Object.keys(S.units).map(Number).sort((a, b) => a - b);
function todayUnit() { return nums().find((n) => !S.read[n]) || null; }
function applySettings() {
  const r = document.documentElement, s = S.settings;
  r.dataset.theme = s.theme; r.dataset.font = s.font; r.style.setProperty('--fs', s.size + 'px');
}

/* ---------- Ansichten ---------- */
function tabs(on) {
  const t = (id, h, ic, l) => '<a href="' + h + '"' + (on === id ? ' class="on" aria-current="page"' : '') + '><span>' + ICON[ic] + '</span>' + l + '</a>';
  return '<nav class="tabs">' + t('heute', '#/heute', 'today', 'Heute') + t('reihe', '#/reihe', 'list', 'Reihe') + t('einstellungen', '#/einstellungen', 'gear', 'Einstellungen') + '</nav>';
}
function bar(title, back, right) {
  return '<div class="bar"><a class="iconbtn" href="' + back + '" aria-label="Zurück">' + ICON.back + '</a><div class="bar-title">' + esc(title) + '</div>' + (right || '') + '</div>';
}
function chipHtml() {
  const t = tInfo(S.settings.translation);
  return '<button class="chip" data-act="trans" aria-label="Übersetzung wählen">' + esc(t.short) + ' ' + ICON.down + '</button>';
}

function viewHeute() {
  const d = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  let h = '<div class="screen"><div class="top"><div class="date">' + esc(d) + '</div><h1>' + esc(PLAN.name) + '</h1></div>';
  const n = todayUnit();
  if (n) {
    const p = parseUnit(S.units[n]); const pi = phaseOf(n);
    const ph = pi >= 0 ? PLAN.phases[pi] : null;
    h += '<div class="card">' + (ph ? '<span class="eyebrow acc">PHASE ' + (pi + 1) + ' · ' + esc(ph.name.toUpperCase()) + '</span>' : '<span class="eyebrow acc">NÄCHSTE EINHEIT</span>') +
      '<div class="big">Einheit ' + n + '</div><div class="lead" style="font-size:20px;color:var(--ink)">' + esc(p.title) + '</div>' +
      (p.lead ? '<p class="quote">' + esc(p.lead.split(/(?<=[.!?])\s/)[0]) + '</p>' : '') +
      '<a class="btn primary" href="#/lesen/' + n + '">Lesen</a><div class="chiprow"><span class="small">Übersetzung</span>' + chipHtml() + '</div></div>';
    if (ph && ph.from != null) {
      const tot = ph.to - ph.from + 1; let r = 0;
      for (let i = ph.from; i <= ph.to; i++) if (S.read[i]) r++;
      h += '<div class="block"><div class="rowhead"><span class="eyebrow">FORTSCHRITT PHASE ' + (pi + 1) + '</span><span class="small">' + r + ' von ' + tot + '</span></div><div class="progress"><div style="width:' + Math.round(100 * r / tot) + '%"></div></div></div>';
    }
  } else {
    h += '<div class="card soft"><h2>' + (nums().length ? 'Alles gelesen' : 'Noch keine Einheit') + '</h2><p class="lead" style="color:inherit">' +
      (nums().length ? 'Füge die nächste Einheit ein, sobald du sie hast.' : 'Kopiere eine Einheit aus der Claude App und füge sie hier ein, oder wähle unter Einstellungen eine Sammeldatei.') + '</p></div>';
  }
  h += '<div class="block"><a class="btn" href="#/einfuegen" style="margin-top:0">Einheit einfügen</a></div></div>' + tabs('heute');
  app.innerHTML = h;
}

function viewLesen(arg) {
  const u = S.units[arg]; if (!u) return go('#/heute');
  const p = parseUnit(u); const sid = S.settings.translation; const ti = tInfo(sid); const refs = p.refs;
  let h = bar('Einheit ' + p.n, '#/heute', chipHtml()) + '<div class="reading"><span class="eyebrow acc">' + (phaseOf(p.n) >= 0 ? 'PHASE ' + (phaseOf(p.n) + 1) + ' · ' + esc(PLAN.phases[phaseOf(p.n)].name.toUpperCase()) : 'EINHEIT ' + p.n) + '</span><h1>' + esc(p.title) + '</h1>';
  if (p.lead) h += '<p class="intro">' + inline(p.lead.replace(/\n/g, ' ')) + '</p>';
  if (p.verses.length || p.heads.length) {
    let verses = null, note = '', shown = ti;
    if (sid !== 'unit') {
      const r = unitRef(p);
      verses = r && hasText(sid) ? lookup(sid, r.book, r.ch, r.v1, r.v2) : null;
      if (!verses) {
        note = hasText(sid) ? 'In der Datei „' + ti.name + '“ fehlt diese Stelle. Gezeigt wird der Text der Einheit.' : 'Für „' + ti.name + '“ ist noch kein Text importiert (Einstellungen). Gezeigt wird der Text der Einheit.';
        shown = UNIT_SRC;
      }
    }
    h += '<div class="sec"><div class="sechead"><span class="eyebrow">BIBELTEXT</span><span class="small">' + esc(sid === 'unit' || shown === UNIT_SRC ? 'Schlachter 2000, aus der Einheit' : ti.name) + '</span></div>';
    if (note) h += '<div class="note">' + esc(note) + '</div>';
    if (verses) h += verses.map((v) => '<p class="verse"><span class="vn">' + v.v + '</span> ' + esc(v.t) + '</p>').join('');
    else {
      h += p.heads.map((x) => '<p class="verse head">' + esc(x) + '</p>').join('');
      h += p.verses.map((v) => '<p class="verse"><span class="vn">' + v.v + '</span> ' + esc(v.t) + '</p>').join('');
    }
    h += '</div>';
  }
  for (const k of ['einstieg', 'kontext', 'liturgie', 'auslegung', 'anwendung']) {
    if (p.sec[k]) h += '<div class="sec"><span class="eyebrow">' + LABELS[k] + '</span><div class="prose">' + prose(p.sec[k], refs) + '</div></div>';
  }
  if (p.steps.length === 4) {
    h += '<div class="sec"><span class="eyebrow">' + LABELS.stille + '</span><div class="prose">' + plain(p.stilleHead) + '</div><a class="btn primary" href="#/stille/' + p.n + '">Stille beginnen</a></div>';
  } else if (p.sec.stille) h += '<div class="sec"><span class="eyebrow">STILLE</span><div class="prose">' + plain(p.sec.stille) + '</div></div>';
  if (p.sec.gebet) h += '<div class="sec"><span class="eyebrow">GEBET</span><div class="prose">' + plain(p.sec.gebet) + '</div></div>';
  if (p.sec.lied) h += '<div class="sec"><span class="eyebrow">LIEDSTROPHE</span><div class="prose">' + lied(p.sec.lied) + '</div></div>';
  for (const k of ['wirkung', 'vorschau']) if (p.sec[k]) h += '<div class="sec"><span class="eyebrow">' + LABELS[k] + '</span><div class="prose">' + plain(p.sec[k]) + '</div></div>';
  const rk = Object.keys(refs);
  if (rk.length) h += '<details class="nachweise"><summary>SCHRIFTNACHWEISE</summary>' + rk.map((c) => '<p><b style="color:var(--accent)">' + c + '</b> ' + esc(refs[c].ref) + ': ' + esc(refs[c].text) + '</p>').join('') + '</details>';
  const rd = !!S.read[p.n];
  h += '<div class="actions"><button class="btn' + (rd ? '' : ' primary') + '" data-act="read" data-v="' + p.n + '">' + (rd ? 'Als ungelesen markieren' : 'Als gelesen markieren') + '</button>' +
    '<button class="btn text" data-act="del" data-v="' + p.n + '">Einheit entfernen</button></div></div>';
  app.innerHTML = h;
}

let draft = '', replaceOld = false;
function foundHtml() {
  const us = splitUnits(draft);
  if (!draft.trim()) return '<span class="eyebrow">ERKANNT</span><p>Noch nichts eingefügt.</p>';
  if (!us.length) return '<span class="eyebrow">ERKANNT</span><p>Keine Einheit erkannt. Eine Einheit beginnt mit einer Zeile wie „Einheit 57: Psalm 126“.</p>';
  return '<span class="eyebrow">ERKANNT · ' + us.length + (us.length === 1 ? ' EINHEIT' : ' EINHEITEN') + '</span>' +
    us.map((u) => '<div class="li"><span>' + (S.units[u.n] ? (replaceOld ? 'ersetzt' : 'vorhanden') : 'neu') + '</span><span><b>Einheit ' + u.n + '</b> · ' + esc(u.title) + '</span></div>').join('');
}
function viewEinfuegen() {
  app.innerHTML = bar('Einheit einfügen', '#/heute') + '<div class="pad"><p class="lead" style="margin-top:0">Kopiere die Einheit in der Claude App und füge sie hier ein. Mehrere Einheiten hintereinander sind möglich.</p>' +
    '<textarea class="ta" id="draft" placeholder="Text hier einfügen" aria-label="Einheitentext">' + esc(draft) + '</textarea>' +
    '<button class="btn" data-act="clip" style="margin-top:10px">Aus der Zwischenablage einfügen</button>' +
    '<label class="btn filebtn" style="margin-top:10px">Sammeldatei wählen<input type="file" accept=".md,.txt,text/*" data-change="unitfile" hidden></label>' +
    '<div class="found" id="found">' + foundHtml() + '</div>' +
    '<label class="check"><input type="checkbox" data-change="replace"' + (replaceOld ? ' checked' : '') + '> Vorhandene Einheiten ersetzen</label>' +
    '<button class="btn primary" data-act="import">Übernehmen</button></div>';
}
function viewReihe() {
  let h = '<div class="screen"><div class="top"><h1>Reihe</h1></div><div class="group"><span class="eyebrow">PHASEN</span><div class="gcard">';
  PLAN.phases.forEach((ph, i) => {
    let sub;
    if (ph.done) sub = 'abgeschlossen';
    else if (ph.from != null) { let r = 0; for (let n = ph.from; n <= ph.to; n++) if (S.read[n]) r++; sub = r + ' von ' + (ph.to - ph.from + 1) + ' gelesen'; }
    else sub = 'Richtwert ' + ph.count + ' Einheiten';
    h += '<div class="setrow"><div class="l"><b>' + (i + 1) + ' · ' + esc(ph.name) + '</b><span>' + sub + '</span></div>' + (ph.done ? ICON.check : '') + '</div>';
  });
  h += '</div></div><div class="group"><span class="eyebrow">GESPEICHERTE EINHEITEN</span><div class="gcard list" style="padding:0 16px">';
  const ns = nums().reverse();
  if (!ns.length) h += '<div class="li"><span class="t"><small>Noch keine Einheit gespeichert.</small></span></div>';
  for (const n of ns) { const t = S.units[n].title; h += '<a href="#/lesen/' + n + '"><span class="t">Einheit ' + n + '<small>' + esc(t) + '</small></span>' + (S.read[n] ? ICON.check : ICON.chev) + '</a>'; }
  h += '</div><a class="btn" href="#/einfuegen">Einheit einfügen</a></div></div>' + tabs('reihe');
  app.innerHTML = h;
}
function viewEinstellungen() {
  const s = S.settings; const seg = (name, opts, cur) => '<div class="seg">' + opts.map((o) => '<button data-act="set" data-k="' + name + '" data-v="' + o[0] + '" class="' + (String(cur) === String(o[0]) ? 'on' : '') + '">' + o[1] + '</button>').join('') + '</div>';
  let h = '<div class="screen"><div class="top"><h1>Einstellungen</h1></div>';
  h += '<div class="group"><span class="eyebrow">ÜBERSETZUNG</span><div class="gcard"><button class="setrow" data-act="trans" style="width:100%;border:0;background:none;text-align:left;cursor:pointer"><div class="l"><b>' + esc(tInfo(s.translation).name) + '</b><span>Auch beim Lesen oben wechselbar</span></div>' + ICON.chev + '</button></div></div>';
  h += '<div class="group"><span class="eyebrow">TEXTQUELLEN</span><div class="gcard"><div class="setrow"><div class="l"><b>Aus der Einheit</b><span>Immer verfügbar</span></div><span class="v m">aktiv</span></div>';
  for (const src of S.sources) h += '<div class="setrow"><div class="l"><b>' + esc(src.name) + '</b><span>Datei importiert</span></div><button class="btn text small-btn" data-act="rmsrc" data-v="' + esc(src.id) + '">Entfernen</button></div>';
  h += '<div class="setrow"><div class="l"><b>Online-Quelle</b><span>Vorbereitet, noch nicht eingerichtet</span></div><span class="v m">aus</span></div>' +
    '<div class="stack"><label class="btn filebtn" style="margin-top:0">Bibeltext-Datei importieren<input type="file" accept=".json,application/json" data-change="srcfile" hidden></label></div></div></div>';
  h += '<div class="group"><span class="eyebrow">DARSTELLUNG</span><div class="gcard stack"><b>Schriftgröße</b><input type="range" min="16" max="26" step="1" value="' + s.size + '" data-input="size" aria-label="Schriftgröße">' +
    '<b>Schrift</b>' + seg('font', [['serif', 'Serif'], ['sans', 'Sans']], s.font) + '<b>Farbschema</b>' + seg('theme', [['light', 'Hell'], ['dark', 'Dunkel'], ['system', 'System']], s.theme) + '</div></div>';
  h += '<div class="group"><span class="eyebrow">STILLE</span><div class="gcard stack"><b>Dauer</b>' + seg('stille', [[1, '1 Minute'], [2, '2 Minuten'], [3, '3 Minuten']], s.stille) + '</div></div>';
  h += '<div class="group"><span class="eyebrow">SICHERUNG</span><div class="gcard stack"><button class="btn" data-act="backup" style="margin-top:0">Sicherung speichern</button>' +
    '<label class="btn filebtn">Sicherung wiederherstellen<input type="file" accept=".json,application/json" data-change="restore" hidden></label>' +
    '<p class="small" style="margin:12px 0 0">Gesichert werden Einheiten, Lesestand und Einstellungen. Importierte Bibeltext-Dateien bleiben deine eigenen Dateien.</p></div></div>';
  h += '<div class="group"><span class="eyebrow">INFO</span><div class="gcard"><div class="setrow"><div class="l"><b>Bibellese ' + VERSION + '</b><span>' + nums().length + ' Einheiten gespeichert</span></div></div></div></div></div>' + tabs('einstellungen');
  app.innerHTML = h;
}

/* ---------- Stille ---------- */
let ST = null, wake = null;
const STEP_LABEL = { Lectio: 'LESEN', Meditatio: 'BEDENKEN', Oratio: 'BETEN', Contemplatio: 'SCHWEIGEN UND SCHAUEN' };
function stopStille() {
  if (ST && ST.iv) clearInterval(ST.iv);
  ST = null;
  try { if (wake) { wake.release(); wake = null; } } catch (e) { /* egal */ }
}
function viewStille(arg) {
  const u = S.units[arg]; if (!u) return go('#/heute');
  const p = parseUnit(u);
  if (p.steps.length !== 4) { toast('Die Stille dieser Einheit ließ sich nicht lesen.'); return go('#/lesen/' + arg); }
  ST = { n: p.n, p, step: 0, total: S.settings.stille * 60, left: S.settings.stille * 60, running: false, iv: null, end: 0 };
  try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then((w) => { wake = w; }).catch(() => {}); } catch (e) { /* egal */ }
  drawStille();
}
function fmt(sec) { return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
function drawStille() {
  const s = ST, st = s.p.steps[s.step], last = s.step === 3;
  let big = st.text, sat = '';
  if (s.step === 0) { const m = /^(„[^“]*“(?:\s*\([^)]*\))?)\s*(.*)$/.exec(st.text); if (m) { big = m[1]; sat = m[2]; } }
  const bars = [0, 1, 2, 3].map((i) => '<i class="' + (i < s.step ? 'done' : i === s.step ? 'now' : '') + '"></i>').join('');
  const labels = s.p.steps.map((x, i) => '<span class="' + (i === s.step ? 'now' : '') + '">' + x.name + '</span>').join('');
  let foot;
  if (last) {
    const done = s.left <= 0;
    foot = '<div class="timer" id="tm" aria-live="off">' + fmt(Math.max(0, s.left)) + '</div><div class="row2"><button class="btn" data-act="sprev">Zurück</button>' +
      (done ? '<button class="btn primary" data-act="sdone">Fertig</button>' : '<button class="btn primary" data-act="stimer">' + (s.running ? 'Pause' : s.left < s.total ? 'Weiter' : 'Beginnen') + '</button>') + '</div>';
  } else {
    foot = '<div class="row2"><button class="btn" data-act="sprev"' + (s.step === 0 ? ' disabled' : '') + '>Zurück</button><button class="btn primary" data-act="snext">Weiter</button></div>';
  }
  app.innerHTML = '<div class="stille-screen"><header><a class="iconbtn" href="#/lesen/' + s.n + '" aria-label="Beenden">' + ICON.close + '</a><span class="small">Einheit ' + s.n + '</span></header>' +
    '<div class="bars">' + bars + '</div><div class="labels">' + labels + '</div>' +
    '<div class="center"><span class="eyebrow">' + st.name.toUpperCase() + ' · ' + STEP_LABEL[st.name] + '</span><p class="big">' + esc(big) + '</p>' + (sat ? '<p class="sat">' + esc(sat) + '</p>' : '') + '</div>' + foot + '</div>';
}
function tick() {
  const s = ST; if (!s) return;
  s.left = Math.ceil((s.end - Date.now()) / 1000);
  if (s.left <= 0) {
    s.left = 0; s.running = false; clearInterval(s.iv); s.iv = null;
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* egal */ }
    drawStille();
  } else { const t = $('#tm'); if (t) t.textContent = fmt(s.left); }
}

/* ---------- Blätter ---------- */
function closeLayer() { layer.innerHTML = ''; }
function sheet(html) { layer.innerHTML = '<button class="scrim" data-act="close" aria-label="Schließen"></button><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>' + html + '</div>'; }
function sheetTrans() {
  const cur = S.settings.translation;
  sheet('<div class="st">Übersetzung</div><div class="ss">Gilt für Bibeltext und Verweise</div>' + translations().map((t) =>
    '<button class="opt' + (t.id === cur ? ' on' : '') + '" data-act="pick" data-v="' + esc(t.id) + '"><div class="l"><b>' + esc(t.name) + '</b><span>' + (hasText(t.id) ? (t.id === 'unit' ? 'Schlachter 2000, wie in der Einheit' : 'Text vorhanden') : 'Text nicht importiert') + '</span></div>' + (t.id === cur ? ICON.check : '') + '</button>').join(''));
}
function sheetRef(c) {
  const n = $('.reading') && location.hash.match(/lesen\/(\d+)/);
  const u = n && S.units[n[1]]; if (!u) return;
  const r = parseUnit(u).refs[c];
  if (!r) return sheet('<div class="st">Kein Nachweis</div>');
  const sid = S.settings.translation; let text = r.text, from = 'aus der Einheit';
  if (sid !== 'unit' && hasText(sid)) {
    const m = /^((?:\d\s)?[A-Za-zÄÖÜäöü]+)\s+(\d+),(\d+)(?:[–-](\d+))?$/.exec(bookKey(r.ref));
    if (m) { const v = lookup(sid, m[1], +m[2], +m[3], m[4] ? +m[4] : +m[3]); if (v) { text = v.map((x) => x.t).join(' '); from = tInfo(sid).name; } }
  }
  sheet('<div class="vhead"><div class="badge">' + c + '</div><div class="ttl">' + esc(r.ref) + '</div></div><p class="vtext">' + esc(text) + '</p><div class="vfoot"><span>' + esc(from) + '</span><button data-act="trans">Übersetzung wechseln</button><button data-act="close">Schließen</button></div>');
}

/* ---------- Aktionen ---------- */
async function importUnits() {
  const us = splitUnits(draft);
  if (!us.length) return toast('Keine Einheit erkannt.');
  let add = 0, rep = 0, skip = 0;
  for (const u of us) {
    if (S.units[u.n]) { if (replaceOld) { S.units[u.n] = { n: u.n, title: u.title, raw: u.raw }; rep++; } else skip++; }
    else { S.units[u.n] = { n: u.n, title: u.title, raw: u.raw }; add++; }
  }
  save(); draft = '';
  toast([add && add + ' neu', rep && rep + ' ersetzt', skip && skip + ' übersprungen'].filter(Boolean).join(', '));
  go('#/heute');
}
async function importSource(file) {
  try {
    const o = JSON.parse(await file.text());
    if (!o || typeof o.id !== 'string' || !o.books || typeof o.books !== 'object') throw new Error('format');
    o.id = o.id.toLowerCase(); o.name = o.name || o.id;
    await idbPut(o); SRC[o.id] = o;
    S.sources = S.sources.filter((x) => x.id !== o.id); S.sources.push({ id: o.id, name: o.name, short: o.short || o.id.toUpperCase() });
    save(); toast('„' + o.name + '“ importiert.'); viewEinstellungen();
  } catch (e) { toast('Die Datei ist keine gültige Bibeltext-Datei.'); }
}
async function restore(file) {
  try {
    const o = JSON.parse(await file.text());
    if (!o || o.app !== 'bibellese' || !o.units) throw new Error('format');
    if (!confirm('Die Sicherung ersetzt die Einheiten, den Lesestand und die Einstellungen auf diesem Gerät. Fortfahren?')) return;
    S.units = o.units; S.read = o.read || {}; S.settings = Object.assign(fresh().settings, o.settings || {});
    save(); applySettings(); toast('Sicherung wiederhergestellt.'); go('#/heute');
  } catch (e) { toast('Die Datei ist keine Sicherung dieser App.'); }
}

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, v = el.dataset.v;
  if (a === 'trans') sheetTrans();
  else if (a === 'close') closeLayer();
  else if (a === 'pick') { S.settings.translation = v; save(); closeLayer(); route(true); }
  else if (a === 'ref') sheetRef(v);
  else if (a === 'read') { if (S.read[v]) delete S.read[v]; else S.read[v] = new Date().toISOString().slice(0, 10); save(); if (S.read[v]) { toast('Als gelesen markiert.'); go('#/heute'); } else route(true); }
  else if (a === 'del') { if (confirm('Einheit ' + v + ' von diesem Gerät entfernen?')) { delete S.units[v]; delete S.read[v]; save(); go('#/reihe'); } }
  else if (a === 'clip') { try { draft = await navigator.clipboard.readText(); $('#draft').value = draft; $('#found').innerHTML = foundHtml(); } catch (er) { toast('Die Zwischenablage ist nicht freigegeben. Füge den Text von Hand ein.'); } }
  else if (a === 'import') importUnits();
  else if (a === 'set') { const k = el.dataset.k; S.settings[k] = k === 'stille' ? +v : v; save(); applySettings(); viewEinstellungen(); }
  else if (a === 'rmsrc') { try { await idbDel(v); } catch (er) { /* egal */ } delete SRC[v]; S.sources = S.sources.filter((x) => x.id !== v); if (S.settings.translation === v) S.settings.translation = 'unit'; save(); viewEinstellungen(); }
  else if (a === 'backup') { download('bibellese-sicherung-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ app: 'bibellese', v: 1, units: S.units, read: S.read, settings: S.settings }), 'application/json'); toast('Sicherung gespeichert.'); }
  else if (a === 'sprev' && ST) { if (ST.step > 0) { if (ST.running) { clearInterval(ST.iv); ST.running = false; } ST.step--; drawStille(); } }
  else if (a === 'snext' && ST) { ST.step++; drawStille(); }
  else if (a === 'stimer' && ST) {
    if (ST.running) { clearInterval(ST.iv); ST.iv = null; ST.running = false; }
    else { ST.running = true; ST.end = Date.now() + ST.left * 1000; ST.iv = setInterval(tick, 250); }
    drawStille();
  }
  else if (a === 'sdone' && ST) go('#/lesen/' + ST.n);
});
document.addEventListener('change', async (e) => {
  const t = e.target, c = t.dataset.change; if (!c) return;
  if (c === 'replace') { replaceOld = t.checked; $('#found').innerHTML = foundHtml(); }
  else if (c === 'unitfile' && t.files[0]) { draft = await t.files[0].text(); viewEinfuegen(); }
  else if (c === 'srcfile' && t.files[0]) importSource(t.files[0]);
  else if (c === 'restore' && t.files[0]) restore(t.files[0]);
  t.value = '';
});
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'draft') { draft = t.value; $('#found').innerHTML = foundHtml(); }
  else if (t.dataset.input === 'size') { S.settings.size = +t.value; save(); applySettings(); }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLayer(); });

/* ---------- Routing ---------- */
const VIEWS = { heute: viewHeute, lesen: viewLesen, stille: viewStille, einfuegen: viewEinfuegen, reihe: viewReihe, einstellungen: viewEinstellungen };
function route(keepScroll) {
  stopStille(); closeLayer();
  const [name, arg] = location.hash.replace(/^#\/?/, '').split('/');
  document.body.classList.toggle('stille', name === 'stille');
  const y = window.scrollY;
  (VIEWS[name] || viewHeute)(arg);
  window.scrollTo(0, keepScroll === true ? y : 0);
}
window.addEventListener('hashchange', () => route());

async function start() {
  applySettings();
  try { for (const o of await idbAll()) SRC[o.id] = o; } catch (e) { /* ohne IndexedDB nur die Einheitstexte */ }
  route();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* egal */ }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
start();
})();
