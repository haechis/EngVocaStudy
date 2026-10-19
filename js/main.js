// 앱 시작점: 데이터·계정 준비 → 주소별 화면 연결
import { $app } from './util.js';
import { loadCourses } from './data.js';
import { load, loadedFor, unload, flush, push } from './store.js';
import { configured, init, restore, client, me, logout } from './auth.js';
import { route, match, start, go, path } from './router.js';
import { act, hasAct, mount } from './views/layout.js';
import { speak } from './views/ui.js';
import { homeView } from './views/home.js';
import { courseView, dayView } from './views/course.js';
import { testView } from './views/test.js';
import { resultView } from './views/result.js';
import { settingsView } from './views/settings.js';
import { loginView, emailView, codeView, profileView, configView } from './views/account.js';

/* ---------- 로그인 / 로그아웃 후 이동 ---------- */
async function onSignedIn() {
  await load(client, me);
  go('/', { replace: true });
}
async function onLogout() {
  await push();
  await logout();
  unload();
  go('/login', { replace: true });
}

/* ---------- 주소 → 화면 ---------- */
//  #/                     과정 고르기 (첫 화면)
//  #/c/:id                과정의 오늘 단어
//  #/c/:id/test           시험
//  #/c/:id/result         결과
//  #/c/:id/day/:n         지난 Day 단어
//  #/settings             설정
route('/', homeView);
route('/c/:id', courseView);
route('/c/:id/test', testView);
route('/c/:id/result', resultView);
route('/c/:id/day/:n', dayView);
route('/settings', () => settingsView({ onLogout }));
route('/login', () => loginView({ onSignedIn }), 'public');
route('/signup', () => emailView({ mode: 'signup' }), 'public');
route('/signup/code', () => codeView({ mode: 'signup', onSignedIn }), 'public');
route('/signup/profile', () => profileView({ mode: 'signup', onSignedIn }), 'session');
route('/reset', () => emailView({ mode: 'reset' }), 'public');
route('/reset/code', () => codeView({ mode: 'reset', onSignedIn }), 'public');
route('/reset/password', () => profileView({ mode: 'reset', onSignedIn }), 'session');

async function dispatch(p) {
  const r = match(p);
  if (!r) return go('/', { replace: true });
  const named = me && me.name;
  if (r.kind === 'app' && !named) return go(me ? '/signup/profile' : '/login', { replace: true });
  if (r.kind === 'session' && !me) return go('/login', { replace: true });
  if (r.kind === 'session' && named && p === '/signup/profile') return go('/', { replace: true });
  if (r.kind === 'public' && named) return go('/', { replace: true });
  if (r.kind === 'app' && !loadedFor(me.id)) await load(client, me);
  await r.view(r.params);
}

/* ---------- 화면 안의 버튼·폼·키보드 ---------- */
$app.addEventListener('click', e => {
  const say = e.target.closest('[data-say]');
  if (say) { speak(say.dataset.say, say.dataset.lang); return; }
  const a = e.target.closest('[data-act]');
  if (a) { e.preventDefault(); act(a.dataset.act, a, e); return; }
  const row = e.target.closest('.hidden .row');
  if (row) row.classList.toggle('show');
});
$app.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target.closest('form[data-form]');
  if (f) act(f.dataset.form, f);
});
document.addEventListener('keydown', e => {
  if (e.target.matches('input,textarea')) return;
  if (hasAct('key')) act('key', e);
});

// 다른 앱으로 넘어가거나 창을 닫을 때 저장 안 된 기록을 바로 보냄,
// 다시 돌아왔을 때 날짜가 바뀌었으면 화면을 새로 계산
document.addEventListener('visibilitychange', () => {
  if (document.hidden) flush();
  else if (me && me.name && /^\/(c\/[^/]+)?$/.test(path())) dispatch(path());
});
window.addEventListener('pagehide', flush);

/* ---------- 시작 ---------- */
(async () => {
  mount('<div class="empty" style="margin-top:40vh">불러오는 중</div>');
  try { await loadCourses(); }
  catch (e) { mount('<div class="note err" style="margin-top:30vh">단어 목록(data/courses.json)을 불러오지 못했어요. 새로고침해 주세요.</div>'); return; }
  if (!configured()) { configView(); return; }
  init(() => { unload(); go('/login', { replace: true }); });
  await restore();                 // 저장된 로그인, 또는 메일 링크로 돌아온 경우 여기서 처리됨
  if (me && me.name) await load(client, me);
  if (!location.hash.startsWith('#/')) {
    // 처음 열었거나 메일 링크에서 돌아온 경우(주소 뒤 인증 정보는 지움)
    const to = !me ? '/login' : !me.name ? '/signup/profile' : '/';
    history.replaceState(null, '', location.pathname + location.search + '#' + to);
  }
  await start(dispatch);
})();
