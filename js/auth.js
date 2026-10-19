// 계정: Supabase Auth 감싸기 (인증번호/비밀번호는 전부 Supabase 서버가 만들고 확인함)
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export let client = null;
export let me = null; // { id, email, name }

export function configured() {
  return !!window.supabase && !SUPABASE_URL.includes('YOUR-PROJECT') && !SUPABASE_KEY.includes('YOUR-');
}

export function init(onSignedOut) {
  // 주소 뒤에 /rest/v1 같은 경로가 붙어 있어도 https://xxxx.supabase.co 까지만 사용
  const base = (SUPABASE_URL.trim().match(/^https?:\/\/[^/]+/) || [SUPABASE_URL.trim()])[0];
  client = window.supabase.createClient(base, SUPABASE_KEY.trim());
  client.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT' && me) { me = null; onSignedOut && onSignedOut(); } });
  return client;
}

function setMe(u) {
  me = u ? { id: u.id, email: u.email, name: (u.user_metadata && u.user_metadata.name) || '' } : null;
  return me;
}

export async function restore() {
  const { data } = await client.auth.getSession();
  return setMe(data && data.session ? data.session.user : null);
}

export async function login(email, password) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return setMe(data.user);
}

export async function sendCode(email) {
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname },
  });
  if (error) throw error;
}

export async function verifyCode(email, token) {
  const { data, error } = await client.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
  return setMe(data.user);
}

export async function saveProfile(name, password) {
  const { data, error } = await client.auth.updateUser({ password, data: { name } });
  if (error) throw error;
  return setMe(data.user);
}

export async function logout() {
  const m = me; me = null;
  try { await client.auth.signOut(); } catch (e) { /* 이미 끊긴 경우 */ }
  return m;
}

export function errKo(e) {
  const m = (e && e.message) || String(e);
  if (/Invalid login credentials/i.test(m)) return '이메일 또는 비밀번호가 맞지 않아요.';
  if (/expired|invalid.*(otp|token)/i.test(m)) return '인증번호가 틀렸거나 만료됐어요. 다시 받아서 입력해 주세요.';
  if (/rate limit|security purposes|seconds/i.test(m)) return '요청이 너무 잦아요. 1분쯤 뒤에 다시 시도해 주세요.';
  if (/Password should be/i.test(m)) return '비밀번호는 6자 이상이어야 해요.';
  if (/not authorized/i.test(m)) return '이 이메일로는 메일을 보낼 수 없어요. Supabase에 SMTP를 연결해야 다른 주소로도 보낼 수 있어요.';
  if (/Error sending/i.test(m)) return '메일 발송에 실패했어요. Supabase의 SMTP 설정을 확인해 주세요.';
  if (/Signups not allowed/i.test(m)) return 'Supabase 설정에서 신규 가입이 꺼져 있어요.';
  if (/Invalid path specified/i.test(m)) return 'Supabase 주소가 맞지 않아요. js/config.js의 SUPABASE_URL을 확인해 주세요.';
  if (/Invalid API key|JWT|apikey/i.test(m)) return 'Supabase 키가 맞지 않아요. js/config.js의 SUPABASE_KEY를 확인해 주세요.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.';
  return m;
}
