// 단어 데이터: data/courses.json(과정 목록) + 과정별 단어 파일
let COURSES = null;
const WORDS = {};

export async function loadCourses() {
  if (COURSES) return COURSES;
  const r = await fetch('data/courses.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('courses.json ' + r.status);
  COURSES = await r.json();
  return COURSES;
}

export const courses = () => COURSES || [];
export const course = id => courses().find(c => c.id === id) || null;

// 과정 단어 파일을 한 번만 받아서 기억. 단어 id = "과정id:순번" (진도 기록이 이 id를 씀)
export async function loadWords(cid) {
  if (WORDS[cid]) return WORDS[cid];
  const c = course(cid);
  if (!c || !c.file) throw new Error('no file for ' + cid);
  const r = await fetch(c.file, { cache: 'no-cache' });
  if (!r.ok) throw new Error(c.file + ' ' + r.status);
  const list = await r.json();
  WORDS[cid] = list.map((w, i) => ({ ...w, id: cid + ':' + i, lang: c.lang || 'en' }));
  return WORDS[cid];
}

export function word(id) {
  const [cid, i] = id.split(':');
  return (WORDS[cid] && WORDS[cid][+i]) || null;
}

export function dayWords(cid, day) {
  const c = course(cid);
  const s = (day - 1) * c.perDay;
  return (WORDS[cid] || []).slice(s, s + c.perDay);
}

export const allWords = cid => WORDS[cid] || [];
