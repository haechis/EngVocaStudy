// 로그인 전 화면들
//   #/login
//   #/signup → #/signup/code → #/signup/profile   (가입)
//   #/reset  → #/reset/code  → #/reset/password   (비밀번호 재설정)
import { $app, esc } from '../util.js';
import { me, login, sendCode, verifyCode, saveProfile, errKo } from '../auth.js';
import { go } from '../router.js';
import { mount } from './layout.js';

const flow = { email: '' };
const NAME_RE = /^[A-Za-z][A-Za-z .'-]{0,39}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const head = (back) => `<div class="authhead">${back ? `<a class="toplink" href="${back}">← 로그인으로</a>` : '단어장'}</div>`;
const msgBox = (m, ok) => m ? `<div class="note ${ok ? 'ok' : 'err'}">${esc(m)}</div>` : '';

// 폼 제출: 화면이 다시 그려지기 전에 입력값을 먼저 읽고, 처리 중엔 버튼을 잠금
function form(name, handler) {
  return {
    [name]: async (formEl) => {
      const data = Object.fromEntries(new FormData(formEl).entries());
      const btns = formEl.querySelectorAll('button');
      btns.forEach(b => { b.disabled = true; });
      const box = formEl.querySelector('.msg');
      try { await handler(data, (m, ok) => { box.innerHTML = msgBox(m, ok); }); }
      catch (e) { box.innerHTML = msgBox(errKo(e)); }
      finally { if (formEl.isConnected) btns.forEach(b => { b.disabled = false; }); }
    },
  };
}

export function loginView({ onSignedIn }) {
  mount(`${head()}
    <form class="form" data-form="login" novalidate>
      <h1 class="title">로그인</h1>
      <label class="field">이메일<input name="email" type="email" autocomplete="email" inputmode="email" value="${esc(flow.email)}" autofocus></label>
      <label class="field">비밀번호<input name="password" type="password" autocomplete="current-password"></label>
      <div class="msg"></div>
      <button class="primary" type="submit">로그인</button>
      <a class="secondary" href="#/signup">이메일로 가입하기</a>
      <a class="linkbtn" href="#/reset">비밀번호를 잊었어요</a>
    </form>`, form('login', async (d, say) => {
    const email = (d.email || '').trim(); flow.email = email;
    if (!EMAIL_RE.test(email) || !d.password) return say('이메일과 비밀번호를 입력해 주세요.');
    await login(email, d.password);
    if (!me.name) { go('/signup/profile', { replace: true }); return; }
    await onSignedIn();
  }));
}

export function emailView({ mode }) {
  const reset = mode === 'reset';
  mount(`${head('#/login')}
    <form class="form" data-form="send" novalidate>
      <h1 class="title">${reset ? '비밀번호 재설정' : '가입하기'}</h1>
      <p class="lead">이메일로 인증번호를 보내드려요.</p>
      <label class="field">이메일<input name="email" type="email" autocomplete="email" inputmode="email" value="${esc(flow.email)}" autofocus></label>
      <div class="msg"></div>
      <button class="primary" type="submit">인증번호 받기</button>
    </form>`, form('send', async (d, say) => {
    const email = (d.email || '').trim(); flow.email = email;
    if (!EMAIL_RE.test(email)) return say('이메일 주소를 확인해 주세요.');
    await sendCode(email);
    go(`/${mode}/code`);
  }));
}

export function codeView({ mode, onSignedIn }) {
  if (!flow.email) { go(`/${mode}`, { replace: true }); return; }
  mount(`${head('#/login')}
    <form class="form" data-form="verify" novalidate>
      <h1 class="title">인증번호 입력</h1>
      <p class="lead">${esc(flow.email)}로 메일을 보냈어요. 메일에 숫자가 있으면 아래에 입력하고, 링크가 있으면 링크를 누르세요. 메일이 안 보이면 스팸함도 확인해 주세요.</p>
      <label class="field">인증번호<input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" class="code" autofocus></label>
      <div class="msg"></div>
      <button class="primary" type="submit">확인</button>
      <button class="secondary" type="button" data-act="resend">번호 다시 보내기</button>
      <a class="linkbtn" href="#/${mode}">이메일 다시 입력</a>
    </form>`, {
    ...form('verify', async (d, say) => {
      const token = (d.code || '').replace(/\s/g, '');
      if (!/^\d{6,10}$/.test(token)) return say('메일로 받은 숫자를 입력해 주세요.');
      await verifyCode(flow.email, token);
      if (mode === 'reset') go('/reset/password', { replace: true });
      else if (me.name) await onSignedIn();          // 이미 가입한 계정: 기록 불러와서 바로 시작
      else go('/signup/profile', { replace: true });
    }),
    resend: async () => {
      const box = $app.querySelector('.msg');
      try { await sendCode(flow.email); box.innerHTML = msgBox('인증번호를 다시 보냈어요.', true); }
      catch (e) { box.innerHTML = msgBox(errKo(e)); }
    },
  });
}

export function profileView({ mode, onSignedIn }) {
  const reset = mode === 'reset';
  mount(`${head()}
    <form class="form" data-form="profile" novalidate>
      <h1 class="title">${reset ? '새 비밀번호 설정' : '거의 다 됐어요'}</h1>
      <p class="lead">${esc(me.email)} 인증이 끝났어요.</p>
      <label class="field">영어 이름<input name="name" autocomplete="name" placeholder="예: Haechang Lee" value="${esc(me.name)}" ${me.name ? '' : 'autofocus'}></label>
      <label class="field">비밀번호 (6자 이상)<input name="pw" type="password" autocomplete="new-password" ${me.name ? 'autofocus' : ''}></label>
      <label class="field">비밀번호 확인<input name="pw2" type="password" autocomplete="new-password"></label>
      <div class="msg"></div>
      <button class="primary" type="submit">${reset ? '저장하고 시작하기' : '가입 완료'}</button>
    </form>`, form('profile', async (d, say) => {
    const name = (d.name || '').trim();
    if (!NAME_RE.test(name)) return say('영어 이름은 영문 알파벳과 공백으로 입력해 주세요.');
    if ((d.pw || '').length < 6) return say('비밀번호는 6자 이상이어야 해요.');
    if (d.pw !== d.pw2) return say('비밀번호 두 개가 서로 달라요.');
    await saveProfile(name, d.pw);
    await onSignedIn();
  }));
}

export function configView() {
  mount(`${head()}<h1 class="title">설정이 필요해요</h1>
    <div class="note err">js/config.js 파일의 SUPABASE_URL과 SUPABASE_KEY를 내 Supabase 프로젝트 값으로 바꿔 주세요.</div>`);
}
