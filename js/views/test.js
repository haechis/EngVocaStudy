// #/c/:id/test — 시험 (영→한 / 한→영 4지선다). 시험 중에는 소리를 내지 않음.
import { esc, shuffle } from '../util.js';
import { course, word, allWords } from '../data.js';
import { S, newIds, recordTest, save } from '../store.js';
import { go, setLeaveGuard } from '../router.js';
import { mount, topbar } from './layout.js';
import { prepare } from './course.js';
import { wordHTML, exampleHTML } from './ui.js';

let T = null;
export let practiceResult = null; // 연습 시험 결과 (기록에는 반영 안 함)

const parts = m => m.replace(/[()]/g, ',').split(',').map(s => s.trim()).filter(Boolean);
function clash(a, b) {
  if (a.word === b.word) return true;
  const pb = new Set(parts(b.meaning));
  return parts(a.meaning).some(x => pb.has(x));
}
function distractors(w) {
  const pool = allWords(w.id.split(':')[0]).filter(x => !clash(w, x));
  const cand = shuffle(pool.filter(x => x.pos === w.pos)).concat(shuffle(pool.filter(x => x.pos !== w.pos)));
  const out = [];
  for (const x of cand) { if (out.every(o => !clash(o, x))) out.push(x); if (out.length === 3) break; }
  return out;
}

export async function testView({ id }) {
  const m = course(id);
  const crumbs = m ? [[m.title, `#/c/${id}`], ['시험']] : [];
  if (!(await prepare(id, crumbs))) return;
  const c = S.courses[id];
  const ids = shuffle(newIds(id).concat(c.review)).filter(x => word(x));
  if (!ids.length) { go(`/c/${id}`, { replace: true }); return; }
  T = {
    id, crumbs, first: !c.attempted, k: 0,
    qs: ids.map(x => { const w = word(x); return { w, dir: Math.random() < 0.5 ? 'en' : 'ko', opts: shuffle([w, ...distractors(w)]), pick: null }; }),
  };
  setLeaveGuard(() => !T || confirm('시험을 그만둘까요? 지금까지 푼 답은 저장되지 않아요.'));
  renderQ();
}

function renderQ() {
  const q = T.qs[T.k], w = q.w, ja = w.lang === 'ja', answered = q.pick !== null;
  const asked = q.dir === 'en'
    ? (ja ? wordHTML(w, { reading: answered }) : esc(w.word)) // 한자 읽기는 답한 뒤에만
    : esc(w.meaning);
  const ask = q.dir === 'en' ? '알맞은 뜻을 고르세요' : ja ? '알맞은 일본어를 고르세요' : '알맞은 영단어를 고르세요';
  const opts = q.opts.map((o, j) => {
    let cls = 'opt' + (q.dir === 'ko' ? (ja ? ' ja' : ' en') : '');
    if (answered) { if (o === w) cls += ' right'; else if (o === q.pick) cls += ' wrong'; }
    return `<button class="${cls}" data-act="pick" data-i="${j}" ${answered ? 'disabled' : ''}><span class="k">${j + 1}</span>${q.dir === 'en' ? esc(o.meaning) : wordHTML(o)}</button>`;
  }).join('');
  const wrong = answered && q.pick !== w;
  mount(`${topbar(T.crumbs)}
    <div class="progress"><i style="width:${T.k / T.qs.length * 100}%"></i></div>
    <div class="qmeta"><span>${T.k + 1} / ${T.qs.length}</span><span>${T.first ? '' : '연습 시험'}</span></div>
    <div class="prompt"><div class="ask">${ask}</div><div class="big ${q.dir === 'ko' ? 'ko' : ja ? 'ja' : ''}">${asked}</div></div>
    <div class="opts">${opts}</div>
    ${wrong ? `<div class="note${ja ? ' ja' : ''}">${exampleHTML(w)}${w.exampleKo ? `<div class="exko">${esc(w.exampleKo)}</div>` : ''}</div>
      <div class="dock"><div class="in"><button class="primary" data-act="next">${T.k + 1 < T.qs.length ? '다음 문제' : '결과 보기'}</button></div></div>` : ''}
    <button class="linkbtn" data-act="quit">시험 그만두기</button>`, {
    pick: el => answer(+el.dataset.i),
    next: () => next(),
    quit: () => go(`/c/${T.id}`),
    key: e => {
      if (!T) return;
      const cq = T.qs[T.k];
      if (cq.pick === null && /^[1-4]$/.test(e.key)) answer(+e.key - 1);
      else if (cq.pick !== null && e.key === 'Enter') next();
    },
  });
}

function answer(j) {
  const q = T.qs[T.k];
  if (q.pick !== null) return;
  q.pick = q.opts[j];
  renderQ();
  if (q.pick === q.w) { const t = T; setTimeout(() => { if (T === t) next(); }, 650); }
}

function next() {
  if (!T) return;
  if (T.k + 1 < T.qs.length) { T.k++; renderQ(); return; }
  const results = T.qs.map(q => ({ id: q.w.id, ok: q.pick === q.w }));
  const id = T.id;
  if (T.first) { recordTest(id, results); save(true); practiceResult = null; }
  else practiceResult = { id, c: results.filter(r => r.ok).length, t: results.length, wrong: results.filter(r => !r.ok).map(r => r.id) };
  T = null;
  setLeaveGuard(null);
  go(`/c/${id}/result`, { replace: true });
}
