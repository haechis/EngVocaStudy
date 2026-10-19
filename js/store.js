// 학습 기록: 기기(localStorage)와 서버(Supabase progress 테이블)에 함께 저장
//
// 기록 구조 (v3)
// {
//   v: 3,
//   last: 'c1',                       // 마지막으로 연 과정
//   reviewMax: 10,                    // 하루 복습 최대 개수
//   cards: { 'c1:12': {lv, due, n} },  // 단어별 복습 단계
//   courses: {
//     c1: { day, g, gDate, status:'study'|'tested', testedDate, attempted,
//           review:[ids], history:{ [day]: {c, t, date, wrong:[ids]} }, done, lastReview }
//   },
//   updatedAt
// }
import { today, ls } from './util.js';
import { course } from './data.js';
import { grade, dueIds } from './srs.js';

export let S = fresh();
export const sync = { saveErr: '', loadErr: '' };

let client = null, user = null, timer = null;
const key = () => 'vocab.v3.' + (user ? user.id : 'anon');

export function fresh() {
  return { v: 3, last: null, reviewMax: 10, cards: {}, courses: {}, updatedAt: 0 };
}

/* ---------- 예전 버전(v2, 한 파일짜리) 기록 옮기기 ---------- */
export function migrate(o) {
  if (!o || typeof o !== 'object') return null;
  if (o.v === 3) return Object.assign(fresh(), o);
  const s = fresh();
  s.cards = o.cards || {};
  s.reviewMax = o.reviewMax || 10;
  s.updatedAt = o.updatedAt || 0;
  s.last = o.course || null;
  const ids = new Set([
    ...Object.keys(o.pos || {}), ...Object.keys(o.history || {}), ...(o.done || []), ...(o.course ? [o.course] : []),
  ]);
  for (const cid of ids) {
    const c = {
      day: 1, g: o.g || 1, gDate: o.gDate || null, status: 'study', testedDate: null, attempted: false,
      review: [], history: (o.history || {})[cid] || {}, done: (o.done || []).includes(cid), lastReview: null,
    };
    let src = null;
    if (cid === o.course) src = { day: o.day, status: o.status, testedDate: o.testedDate, attempted: o.attempted, review: o.review };
    else if (o.pos && o.pos[cid] != null) src = typeof o.pos[cid] === 'number' ? { day: o.pos[cid] } : o.pos[cid];
    if (src) {
      c.day = src.day || 1;
      c.status = src.status === 'tested' ? 'tested' : 'study';
      c.testedDate = src.testedDate || null;
      c.attempted = !!src.attempted;
      c.review = (src.review || []).filter(id => id.startsWith(cid + ':'));
    }
    s.courses[cid] = c;
  }
  return s;
}

/* ---------- 불러오기 / 저장 ---------- */
export async function load(sbClient, me) {
  client = sbClient; user = me;
  const local = migrate(ls.get(key())) || migrate(ls.get('vocab.v2.' + me.id));
  let remote = null;
  sync.loadErr = '';
  try {
    const { data, error } = await client.from('progress').select('state').eq('user_id', me.id).maybeSingle();
    if (error) sync.loadErr = error.message;
    else if (data) remote = migrate(data.state);
  } catch (e) { sync.loadErr = String(e && e.message || e); }
  S = (remote && (!local || (remote.updatedAt || 0) >= (local.updatedAt || 0))) ? remote : (local || fresh());
  ls.set(key(), S);
  if (local && (!remote || (local.updatedAt || 0) > (remote.updatedAt || 0))) push();
}

// 지금 메모리에 있는 기록이 이 사용자 것인지 (다른 사람 기록이나 빈 기록으로 서버를 덮어쓰지 않기 위함)
export const loadedFor = id => !!user && user.id === id;

export function unload() { clearTimeout(timer); timer = null; S = fresh(); user = null; }

// now=true면 바로 서버로, 아니면 0.5초 모았다가 한 번에
export function save(now = false) {
  S.updatedAt = Date.now();
  ls.set(key(), S);
  clearTimeout(timer);
  if (now) return push();
  timer = setTimeout(push, 500);
}

// 창을 닫거나 다른 앱으로 넘어갈 때 아직 안 보낸 기록을 바로 보냄
export function flush() { if (timer) push(); }

export async function push() {
  clearTimeout(timer); timer = null;
  if (!client || !user) return;
  try {
    const { error } = await client.from('progress').upsert({
      user_id: user.id, name: user.name, state: S, updated_at: new Date(S.updatedAt || Date.now()).toISOString(),
    });
    sync.saveErr = error ? error.message : '';
  } catch (e) { sync.saveErr = String(e && e.message || e); }
  banner();
}

function banner() {
  let el = document.getElementById('saveerr');
  if (sync.saveErr && !el) {
    el = document.createElement('div'); el.id = 'saveerr'; el.className = 'saveerr'; el.setAttribute('role', 'alert');
    document.body.appendChild(el);
  }
  if (el) { if (sync.saveErr) el.textContent = '서버 저장 실패: ' + sync.saveErr; else el.remove(); }
}

/* ---------- 과정별 진도 ---------- */
export function courseState(cid) {
  if (!S.courses[cid]) {
    S.courses[cid] = { day: 1, g: 1, gDate: today(), status: 'study', testedDate: null, attempted: false, review: [], history: {}, done: false, lastReview: null };
    S.courses[cid].review = pickReview(cid);
  }
  return S.courses[cid];
}

export function newIds(cid) {
  const c = S.courses[cid], m = course(cid);
  if (!c || !m || c.done) return [];
  const start = (c.day - 1) * m.perDay;
  const out = [];
  for (let i = start; i < start + m.perDay && i < m.count; i++) out.push(cid + ':' + i);
  return out;
}

export function pickReview(cid) {
  const c = S.courses[cid];
  return dueIds(S.cards, cid, c.g, S.reviewMax || 10, new Set(newIds(cid)));
}

// 과정 화면을 열 때마다 호출: 날짜가 바뀌었으면 다음 Day로
export function refresh(cid) {
  const c = courseState(cid);
  if (c.done) {
    if (c.gDate !== today()) { c.g++; c.gDate = today(); c.status = 'study'; c.attempted = false; c.testedDate = null; c.review = pickReview(cid); return true; }
    return false;
  }
  if (c.status === 'tested' && c.testedDate && today() > c.testedDate) { step(cid); return true; }
  if (c.status === 'study' && !c.attempted && !c.review.length) c.review = pickReview(cid);
  return false;
}

// 다음 Day로 (기다리지 않고 시작도 여기로)
export function step(cid) {
  const c = courseState(cid), m = course(cid);
  c.g++; c.gDate = today();
  if (!c.done) { if (c.day >= m.days) c.done = true; else c.day++; }
  c.status = 'study'; c.attempted = false; c.testedDate = null;
  c.review = pickReview(cid);
}

// 첫 시험 결과만 기록에 반영 (다시 보는 시험은 연습)
export function recordTest(cid, results) {
  const c = courseState(cid);
  for (const r of results) S.cards[r.id] = grade(S.cards[r.id], r.ok, c.g);
  const rec = { c: results.filter(r => r.ok).length, t: results.length, date: today(), wrong: results.filter(r => !r.ok).map(r => r.id) };
  if (c.done) c.lastReview = rec; else c.history[c.day] = rec;
  c.status = 'tested'; c.testedDate = today(); c.attempted = true;
  return rec;
}

export function todayRecord(cid) {
  const c = S.courses[cid];
  if (!c || !c.attempted) return null;
  return c.done ? c.lastReview : c.history[c.day];
}

export function setLast(cid) { if (S.last !== cid) { S.last = cid; save(); } }
export function setReviewMax(n) { S.reviewMax = n; save(); }
export function resetAll() { const keep = S.reviewMax; S = fresh(); S.reviewMax = keep; return save(true); }
