// 단어 한 줄, 예문 강조, 발음 등 여러 화면이 같이 쓰는 표시 부품
import { esc } from '../util.js';

export const POS = { n: '명사', v: '동사', a: '형용사', ad: '부사', prep: '전치사', na: 'な형용사', num: '숫자', ex: '인사·표현' };

export const SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';

export function speak(text, lang) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === 'ja' ? 'ja-JP' : 'en-US';
  u.rate = 0.9;
  speechSynthesis.speak(u);
}

// 예문 안에서 해당 단어(형태가 바뀐 것 포함)를 굵게
const IRREG = { sing: 'sang', win: 'won', tooth: 'teeth', become: 'became', lay: 'laid', hide: 'hid', lose: 'lost', feed: 'fed', fly: 'flew', lead: 'led' };
function markEn(w, s) {
  const forms = [w, IRREG[w], w.replace(/e$/, ''), w.replace(/y$/, 'i')].filter(Boolean).map(f => f.replace(/[^a-z']/gi, ''));
  for (const f of forms) {
    const m = s.match(new RegExp('\\b(' + f + '\\w*)', 'i'));
    if (m) return esc(s.slice(0, m.index)) + '<b>' + esc(m[1]) + '</b>' + esc(s.slice(m.index + m[1].length));
  }
  return esc(s);
}
function markJa(w, r, s) {
  const forms = [w, r, w.length > 1 ? w.slice(0, -1) : '', r && r.length > 1 ? r.slice(0, -1) : ''].filter(Boolean);
  for (const f of forms) {
    const k = s.indexOf(f);
    if (k >= 0) return esc(s.slice(0, k)) + '<b>' + esc(f) + '</b>' + esc(s.slice(k + f.length));
  }
  return esc(s);
}
export function exampleHTML(w) {
  if (!w.example) return '';
  return w.lang === 'ja' ? markJa(w.word, w.reading, w.example) : markEn(w.word, w.example);
}

// 한자 단어는 위에 읽는 법(후리가나)
export function wordHTML(w, { reading = true } = {}) {
  return w.lang === 'ja' && w.reading && reading ? `<ruby>${esc(w.word)}<rt>${esc(w.reading)}</rt></ruby>` : esc(w.word);
}

export function rowHTML(w, n, { tag = '', review = false } = {}) {
  const ja = w.lang === 'ja', lang = ja ? ' data-lang="ja"' : '';
  return `<div class="row${review ? ' review' : ''}" data-id="${esc(w.id)}">
    <div class="n">${n}</div>
    <div class="body"><span class="word${ja ? ' ja' : ''}">${wordHTML(w)}</span><span class="pos">${POS[w.pos] || ''}</span>${tag}
      <div class="mean">${esc(w.meaning)}</div>
      ${w.example ? `<button class="ex${ja ? ' ja' : ''}" data-say="${esc(w.example)}"${lang} aria-label="예문 듣기">${exampleHTML(w)}</button>` : ''}
      ${w.exampleKo ? `<div class="exko">${esc(w.exampleKo)}</div>` : ''}</div>
    <button class="say" data-say="${esc(ja && w.reading ? w.reading : w.word)}"${lang} aria-label="${esc(w.word)} 발음 듣기">${SPEAKER}</button>
  </div>`;
}
