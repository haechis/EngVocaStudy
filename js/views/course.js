// #/c/:id        — 과정의 오늘 단어
// #/c/:id/day/:n — 지난 Day 단어 다시 보기
import { course, loadWords, dayWords, word } from '../data.js';
import { S, courseState, refresh, newIds, save, setLast, step, todayRecord } from '../store.js';
import { counts } from '../srs.js';
import { go } from '../router.js';
import { mount, topbar, loading, errorView } from './layout.js';
import { rowHTML } from './ui.js';

let hide = false;

export async function prepare(id, crumbs) {
  const m = course(id);
  if (!m || !m.ready) { go('/', { replace: true }); return null; }
  loading(crumbs || [[m.title]]);
  try { await loadWords(id); }
  catch (e) { errorView([[m.title]], '단어 파일을 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.'); return null; }
  if (refresh(id)) save(); else courseState(id);
  setLast(id);
  return m;
}

function grid(id, m, c) {
  const cells = [];
  for (let d = 1; d <= m.days; d++) {
    const r = c.history[d];
    let cls = 'cell';
    if (r) { const x = r.c / r.t; cls += x >= 0.9 ? ' s3' : x >= 0.7 ? ' s2' : x >= 0.5 ? ' s1' : ' s0'; }
    if (d === c.day && !c.done) cls += ' now';
    const title = `Day ${d}${r ? ` ${r.c}/${r.t}` : ''}`;
    cells.push(d < c.day || (c.done && d <= m.days)
      ? `<a class="${cls}" href="#/c/${id}/day/${d}" title="${title} 단어 보기" aria-label="${title} 단어 보기"></a>`
      : d === c.day ? `<a class="${cls}" href="#/c/${id}" title="${title} (오늘)" aria-label="${title} 오늘"></a>`
      : `<span class="${cls}" title="${title}"></span>`);
  }
  return `<div class="grid">${cells.join('')}</div>`;
}

function listBlock(words, start, opts = {}) {
  let n = start;
  return `<div class="list">${words.map(w => rowHTML(w, ++n, opts.tagFor ? { tag: opts.tagFor(w), review: opts.review } : opts)).join('')}</div>`;
}

const hideToggle = () => `<button class="toggle" data-act="hide" aria-pressed="${hide}">뜻 가리기</button>`;
const hideHint = () => hide ? '<p class="empty" style="font-size:13px;padding:12px 0 0">단어를 누르면 뜻이 보여요</p>' : '';

export async function courseView({ id }) {
  if (await prepare(id)) renderCourse(id);
}

function renderCourse(id, keepScroll = false) {
  const m = course(id);
  const c = S.courses[id];
  const nw = newIds(id).map(word).filter(Boolean);
  const rv = c.review.map(word).filter(Boolean);
  const cnt = counts(S.cards, id);
  const rec = todayRecord(id);
  const testedToday = c.status === 'tested';
  const nextLabel = c.done ? '다음 복습' : c.day >= m.days ? '완주' : `Day ${c.day + 1}`;

  const head = `${topbar([[m.title]])}
    <div class="daynum">${c.done ? '복습' : `Day ${c.day}<small>/ ${m.days}</small>`}</div>
    ${grid(id, m, c)}
    <div class="legend"><span>외운 단어 ${cnt.mastered}개</span><span>익히는 중 ${cnt.learning}개</span></div>`;

  const doneNote = testedToday && rec ? `<div class="note done-note">오늘 시험을 마쳤어요. <strong>${rec.c} / ${rec.t}</strong><br>${nextLabel === '완주' ? '마지막 Day예요.' : `${nextLabel}은 내일 열려요.`}
      <div class="row2"><a class="secondary" href="#/c/${id}/result">결과 보기</a><button class="secondary" data-act="advance">${nextLabel === '완주' ? '완주하기' : `${nextLabel} 바로 시작`}</button></div></div>` : '';

  if (!nw.length && !rv.length) {
    mount(`${head}${doneNote}<div class="note">오늘은 복습할 단어가 없어요. 내일 다시 오거나 다른 과정을 공부해 보세요.</div>
      <a class="secondary" href="#/">다른 과정 고르기</a>`, { advance: () => doAdvance(id) }, { keepScroll });
    return;
  }

  const sub = [nw.length ? `새 단어 ${nw.length}개` : '', rv.length ? `복습 ${rv.length}개` : ''].filter(Boolean).join(', ');
  const tagFor = w => { const k = S.cards[w.id]; return k ? (k.lv === 0 ? '<span class="tag">지난번에 틀림</span>' : `<span class="tag ok">${k.lv}단계 복습</span>`) : ''; };
  const html = `${head}${doneNote}
    <div class="bar"><div><h2>오늘 외울 단어</h2><div class="sub">${sub}</div></div>${hideToggle()}</div>
    <div class="${hide ? 'hidden' : ''}">
      ${nw.length ? listBlock(nw, 0) : ''}
      ${rv.length ? `<div class="sectionlabel">다시 볼 단어</div>${listBlock(rv, nw.length, { tagFor, review: true })}` : ''}
    </div>${hideHint()}
    <div class="dock"><div class="in"><a class="primary" href="#/c/${id}/test">${testedToday ? '다시 시험 보기 (연습)' : '다 외웠어요, 시험 보기'}</a></div></div>`;
  mount(html, {
    hide: () => { hide = !hide; renderCourse(id, true); },
    advance: () => doAdvance(id),
  }, { keepScroll });
}

export function doAdvance(id) {
  step(id); save(true);
  go(`/c/${id}`);
}

export async function dayView({ id, n }) {
  const m = course(id);
  const crumbs = m ? [[m.title, `#/c/${id}`], [`Day ${+n}`]] : [];
  if (!(await prepare(id, crumbs))) return;
  renderDay(id, +n, crumbs);
}

function renderDay(id, d, crumbs, keepScroll = false) {
  const m = course(id);
  const c = S.courses[id];
  if (!(d >= 1 && d <= m.days) || (!c.done && d > c.day)) { go(`/c/${id}`, { replace: true }); return; }
  if (!c.done && d === c.day) { go(`/c/${id}`, { replace: true }); return; }
  const words = dayWords(id, d);
  const r = c.history[d];
  mount(`${topbar(crumbs)}
    <div class="daynum">Day ${d}<small>/ ${m.days}</small></div>
    <p class="lead">${r ? `${r.date} 시험 ${r.c} / ${r.t}` : '시험 기록 없음'}</p>
    <div class="bar"><div><h2>Day ${d} 단어</h2><div class="sub">${words.length}개</div></div>${hideToggle()}</div>
    <div class="${hide ? 'hidden' : ''}">${listBlock(words, 0)}</div>${hideHint()}
    <div class="actions"><a class="secondary" href="#/c/${id}">오늘 단어로</a></div>`,
  { hide: () => { hide = !hide; renderDay(id, d, crumbs, true); } }, { keepScroll });
}
