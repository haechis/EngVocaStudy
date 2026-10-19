# 단어장

## 폴더 구조
```
index.html            화면 뼈대 (거의 안 바뀜)
css/style.css         모든 스타일
js/config.js          ★ Supabase 주소와 키 — 여기만 내 값으로 바꾸기
js/main.js            시작점, 주소별 화면 연결
js/router.js          주소(#/...) 처리
js/auth.js            로그인·가입 (Supabase)
js/store.js           학습 기록 저장 (기기 + 서버)
js/srs.js             복습 간격 규칙
js/data.js            단어 파일 불러오기
js/util.js            공통 도구
js/views/*.js         화면별 코드 (home, course, test, result, settings, account)
data/courses.json     과정 목록
data/en-basic.json    중학 기초 600 단어
data/ja-basic.json    일본어 기초 300 단어
```

## 화면 주소
| 주소 | 화면 |
|---|---|
| `#/` | 과정 고르기 (첫 화면) |
| `#/c/c1` | 과정의 오늘 단어 |
| `#/c/c1/test` | 시험 |
| `#/c/c1/result` | 오늘 결과 |
| `#/c/c1/day/3` | 지난 Day 3 단어 |
| `#/settings` | 설정 |
| `#/login`, `#/signup`, `#/reset` | 로그인·가입·비밀번호 재설정 |

모든 화면 맨 위의 `홈`을 누르면 과정 고르기로 돌아갑니다.

## 단어 추가하기
1. `data/`에 새 단어 파일을 만든다 (형식은 en-basic.json 참고, 한 줄에 한 단어).
2. `data/courses.json`에 과정을 하나 추가하고 `file`에 그 파일 경로를 적는다.
   `days × perDay`가 `count`(단어 수)와 맞아야 한다.
3. **이미 공부 중인 과정의 단어 순서는 바꾸지 말 것.** 진도 기록이 "과정id:순번"으로 저장돼서
   중간에 끼워 넣으면 기록이 다른 단어를 가리키게 된다. 새 단어는 맨 뒤에 붙이거나 새 과정으로 만든다.

## 내 컴퓨터에서 열어보기
`index.html`을 더블클릭하면 브라우저 보안 정책 때문에 단어 파일을 못 읽습니다.
폴더에서 `python -m http.server`를 실행하고 http://localhost:8000 으로 여세요.
GitHub Pages에서는 그대로 동작합니다.
