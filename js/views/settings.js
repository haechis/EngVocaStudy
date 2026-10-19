// #/settings — 계정, 저장 상태, 복습 개수, 로그아웃
import { esc } from '../util.js';
import { S, sync, setReviewMax, resetAll } from '../store.js';
import { me } from '../auth.js';
import { INTERVALS } from '../srs.js';
import { mount, topbar } from './layout.js';

export function settingsView({ onLogout }) {
  const n = S.reviewMax || 10;
  const err = sync.saveErr || sync.loadErr;
  mount(`${topbar([['설정']], { settings: false })}
    <h1 class="title">설정</h1>
    <div class="note">
      <div class="settings-row"><strong>${esc(me.name)}</strong><span>${esc(me.email)}</span></div>
      <div style="margin-top:6px" class="${err ? 'err' : ''}">${err ? '서버 연결 오류: ' + esc(err) : '기록이 서버에 저장되고 있어요. 다른 기기에서 로그인해도 이어서 할 수 있어요.'}</div>
    </div>
    <div class="sectionlabel">하루 복습 최대 개수 (과정마다)</div>
    <div class="seg">${[5, 10, 15, 20].map(k => `<button class="toggle" data-act="rmax" data-n="${k}" aria-pressed="${n === k}">${k}개</button>`).join('')}</div>
    <p class="lead" style="font-size:13px">적게 잡으면 복습이 밀릴 수 있어요. 바꾼 개수는 다음 날부터 적용돼요.</p>
    <div class="note">복습 간격: 맞힐 때마다 ${INTERVALS.join(', ')}일 뒤로 늘어나고, 틀리면 다음 학습일에 다시 나와요. 마지막 간격까지 맞히면 '외운 단어'가 돼요.</div>
    <div class="actions">
      <a class="secondary" href="#/">과정 목록으로</a>
      <button class="secondary" data-act="logout">로그아웃</button>
      <button class="secondary" data-act="reset" style="color:var(--red)">모든 기록 지우기</button>
    </div>`, {
    rmax: el => { setReviewMax(+el.dataset.n); settingsView({ onLogout }); },
    logout: () => { if (confirm('로그아웃할까요?')) onLogout(); },
    reset: async () => { if (confirm('모든 과정의 기록을 지우고 처음부터 시작할까요? 되돌릴 수 없어요.')) { await resetAll(); location.hash = '/'; } },
  });
}
