// 간격 반복(복습 일정) 규칙
// 맞힐 때마다 다음 복습까지의 간격이 늘어나고, 틀리면 다음 학습일에 다시 나온다.
// 간격은 달력 날짜가 아니라 '그 과정을 공부한 날' 기준.
export const INTERVALS = [1, 2, 4, 7, 15, 30];
export const MASTER = INTERVALS.length; // 이 단계가 되면 '외운 단어'

export function grade(card, correct, g) {
  if (!correct) return { lv: 0, due: g + INTERVALS[0], n: (card ? card.n : 0) + 1 };
  const lv = card ? card.lv + 1 : 1;
  return { lv, due: lv >= MASTER ? null : g + INTERVALS[lv], n: card ? card.n : 0 };
}

// 해당 과정에서 오늘(g) 복습할 단어 id 목록
export function dueIds(cards, cid, g, max, exclude = new Set()) {
  return Object.entries(cards)
    .filter(([id, c]) => id.startsWith(cid + ':') && c.lv < MASTER && c.due != null && c.due <= g && !exclude.has(id))
    .sort((a, b) => a[1].due - b[1].due || a[1].lv - b[1].lv)
    .slice(0, max)
    .map(([id]) => id);
}

export function counts(cards, cid) {
  let mastered = 0, learning = 0;
  for (const [id, c] of Object.entries(cards)) {
    if (cid && !id.startsWith(cid + ':')) continue;
    if (c.lv >= MASTER) mastered++; else learning++;
  }
  return { mastered, learning };
}
