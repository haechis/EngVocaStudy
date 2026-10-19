// #/  — 첫 화면: 과정 고르기
import { esc, today } from '../util.js';
import { courses } from '../data.js';
import { S } from '../store.js';
import { counts } from '../srs.js';
import { me } from '../auth.js';
import { mount, topbar } from './layout.js';

function status(m) {
  const c = S.courses[m.id];
  if (!m.ready) return { text: '준비 중', cls: '' };
  if (!c) return { text: `${m.days}일, 단어 ${m.count}개`, cls: '' };
  if (c.done) return { text: '완주했어요. 복습 계속하기', cls: 'done' };
  const doneToday = c.status === 'tested' && c.testedDate === today();
  return { text: (S.last === m.id ? '이어서 하기 · ' : '') + `Day ${c.day} / ${m.days}` + (doneToday ? ' · 오늘 시험 완료' : ''), cls: '' };
}

export function homeView() {
  const all = counts(S.cards);
  const cards = [...courses()].map(m => {
    const st = status(m), cnt = counts(S.cards, m.id);
    const extra = S.courses[m.id] ? ` · 외운 단어 ${cnt.mastered}개` : '';
    const inner = `<span class="ct">${esc(m.title)}</span><span class="cd">${esc(m.desc || '')}</span><span class="cm ${st.cls}">${esc(st.text)}${extra}</span>`;
    return m.ready
      ? `<a class="course${S.last === m.id ? ' last' : ''}" href="#/c/${esc(m.id)}">${inner}</a>`
      : `<div class="course off" aria-disabled="true">${inner}</div>`;
  }).join('');
  mount(`${topbar()}
    <h1 class="title">과정 고르기</h1>
    <p class="lead">${esc(me.name)}님, 외운 단어 ${all.mastered}개 · 익히는 중 ${all.learning}개</p>
    <div class="courses">${cards}</div>`);
}
