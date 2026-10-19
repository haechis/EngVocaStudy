// #/c/:id/result — 오늘 시험 결과
import { esc } from '../util.js';
import { course, word } from '../data.js';
import { S, todayRecord } from '../store.js';
import { go } from '../router.js';
import { mount, topbar } from './layout.js';
import { prepare, doAdvance } from './course.js';
import { rowHTML } from './ui.js';
import { practiceResult } from './test.js';

export async function resultView({ id }) {
  const m = course(id);
  const crumbs = m ? [[m.title, `#/c/${id}`], ['결과']] : [];
  if (!(await prepare(id, crumbs))) return;
  const c = S.courses[id];
  const official = todayRecord(id);
  const practice = official && practiceResult && practiceResult.id === id ? practiceResult : null;
  const r = practice || official;
  if (!r) { go(`/c/${id}`, { replace: true }); return; }

  const x = r.t ? r.c / r.t : 0;
  const msg = x === 1 ? '전부 맞혔어요.' : x >= 0.8 ? '거의 다 외웠어요.' : x >= 0.5 ? '틀린 단어는 다음 날 다시 나와요.' : '오늘 단어를 한 번 더 보고 다시 풀어보세요.';
  const last = !c.done && c.day >= m.days;
  const nextLabel = c.done ? '다음 복습' : last ? '완주' : `Day ${c.day + 1}`;
  const wrong = (r.wrong || []).map(word).filter(Boolean);

  mount(`${topbar(crumbs)}
    <div class="score"><div class="num">${r.c}<span> / ${r.t}</span></div><p>${msg}</p></div>
    ${wrong.length ? `<div class="sectionlabel">틀린 단어</div><div class="list">${wrong.map((w, i) => rowHTML(w, i + 1)).join('')}</div>` : ''}
    ${practice && official ? `<div class="note">연습 시험이에요. 기록은 오늘 첫 시험 결과(${official.c} / ${official.t})로 남아 있어요.</div>` : ''}
    <div class="note">${last ? `${esc(m.title)} 마지막 Day예요. 완주하면 이 과정 단어는 복습으로 계속 나와요.` : `${nextLabel}은 내일 열려요. 다른 과정도 오늘 공부할 수 있어요.`}</div>
    <div class="actions">
      <button class="primary" data-act="advance">${last ? '완주하기' : `기다리지 않고 ${nextLabel} 시작`}</button>
      <a class="secondary" href="#/c/${id}">오늘 단어 다시 보기</a>
      <a class="secondary" href="#/c/${id}/test">다시 시험 보기 (연습)</a>
      <a class="secondary" href="#/">다른 과정 고르기</a>
    </div>`, { advance: () => doAdvance(id) });
}
