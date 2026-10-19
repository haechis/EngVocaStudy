// 화면 틀: 맨 위 경로 표시(홈 › 과정 › ...)와 화면별 버튼 동작 연결
import { $app, esc } from '../util.js';

const HOME_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>';

let actions = {};

// crumbs: [['중학 기초 600', '#/c/c1'], ['시험']]  → 맨 앞 '홈'은 자동으로 붙음
export function topbar(crumbs = [], { settings = true } = {}) {
  const items = [['홈', '#/'], ...crumbs];
  const last = items.length - 1;
  const li = items.map(([text, href], i) => {
    const label = i === 0 ? HOME_ICON + esc(text) : esc(text);
    return `<li>${i < last && href ? `<a href="${href}">${label}</a>` : `<span aria-current="page">${label}</span>`}</li>`;
  }).join('');
  return `<nav class="topbar" aria-label="현재 위치"><ol class="crumbs">${li}</ol>${settings ? '<a class="toplink" href="#/settings">설정</a>' : ''}</nav>`;
}

export function mount(html, acts = {}, { keepScroll = false } = {}) {
  actions = acts;
  $app.innerHTML = html;
  if (!keepScroll) window.scrollTo(0, 0);
  const auto = $app.querySelector('[autofocus]');
  if (auto) auto.focus();
}

export function loading(crumbs) { mount(topbar(crumbs) + '<div class="empty" style="margin-top:30vh">불러오는 중</div>'); }

export function errorView(crumbs, msg) {
  mount(topbar(crumbs) + `<div class="note err">${esc(msg)}</div><a class="secondary" href="#/">과정 목록으로</a>`);
}

export const act = (name, ...args) => actions[name] && actions[name](...args);
export const hasAct = name => !!actions[name];
