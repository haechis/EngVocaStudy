// 주소(#/...)에 따라 화면을 고르는 라우터
// GitHub Pages는 파일만 내려주는 서버라 /c/c1 같은 실제 경로 대신 #/c/c1 형태를 씀.
// 뒤로 가기, 새로고침, 주소 공유가 모두 그대로 동작함.
const table = [];
let current = null;   // 지금 보고 있는 경로
let leaveGuard = null; // 화면을 떠나기 전에 물어볼 함수 (시험 중 등)
let handler = null;

// kind: 'app'(로그인+이름 필요) | 'session'(로그인만 필요) | 'public'(로그인 전 화면)
export function route(pattern, view, kind = 'app') {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:([a-z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
  table.push({ pattern, re, keys, view, kind });
}

export function match(path) {
  for (const r of table) {
    const m = path.match(r.re);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      return { ...r, params };
    }
  }
  return null;
}

export const path = () => (location.hash.startsWith('#/') ? location.hash.slice(1).split('?')[0] : '/');
export const here = () => current;

export function go(to, { replace = false } = {}) {
  if ('#' + to === location.hash) { run(); return; }
  if (replace) location.replace('#' + to); else location.hash = to;
}

export function setLeaveGuard(fn) { leaveGuard = fn; }

async function run() {
  const p = path();
  if (leaveGuard && current && p !== current) {
    if (!leaveGuard(p)) { history.replaceState(null, '', '#' + current); return; }
    leaveGuard = null;
  }
  current = p;
  await handler(p);
}

export function start(fn) {
  handler = fn;
  window.addEventListener('hashchange', run);
  return run();
}
