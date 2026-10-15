# 영단어 앱 설정 가이드 (Supabase + GitHub Pages)

## 1. Supabase 프로젝트 만들기
1. https://supabase.com 에 가입하고 **New project**를 만든다. (Region은 Seoul 또는 Tokyo 추천)
2. 프로젝트가 준비되면 **Project Settings → API** (또는 API Keys)에서 아래 두 값을 복사한다.
   - Project URL (예: `https://abcdxyz.supabase.co`)
   - anon / publishable key
3. `index.html`을 열어 맨 위 설정 부분에 붙여 넣는다.
   ```js
   const SUPABASE_URL='https://abcdxyz.supabase.co';
   const SUPABASE_ANON_KEY='eyJhbGciOi...';
   ```
   이 키는 공개돼도 괜찮은 키다. 아래 2번의 보안 규칙(RLS)이 각자 자기 기록만 읽고 쓰게 막아준다.
   **service_role 키는 절대 넣으면 안 된다.**

## 2. 학습 기록 테이블 만들기
**SQL Editor**에서 아래를 붙여 넣고 Run.

```sql
create table public.progress (
  user_id    uuid primary key references auth.users on delete cascade,
  name       text,
  state      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

create policy "read own"   on public.progress for select using (auth.uid() = user_id);
create policy "insert own" on public.progress for insert with check (auth.uid() = user_id);
create policy "update own" on public.progress for update using (auth.uid() = user_id);
```

## 3. 이메일 인증번호 설정
1. **Authentication → Sign In / Providers → Email**이 켜져 있는지 확인한다.
2. **Authentication → Emails (Email Templates)**에서 **Magic Link**와 **Confirm signup** 두 템플릿을 모두 아래처럼 바꾼다.
   링크 대신 숫자 인증번호(`{{ .Token }}`)가 메일에 들어가게 하는 설정이다.
   - 제목: `영단어 인증번호`
   - 본문:
     ```html
     <p>인증번호는 아래와 같습니다.</p>
     <h2>{{ .Token }}</h2>
     <p>본인이 요청하지 않았다면 이 메일을 무시하세요.</p>
     ```
3. **Authentication → URL Configuration**의 Site URL에 GitHub Pages 주소를 넣는다.
   (예: `https://아이디.github.io/vocab/`)

## 4. 메일 발송 서버(SMTP) 연결 — 다른 사람도 가입하게 하려면 필수
Supabase 기본 메일 발송은 테스트용이라 **프로젝트 팀원 이메일로만**, 그것도 시간당 몇 통만 보낼 수 있다.
나 혼자 테스트할 때는 그대로 써도 되지만, 다른 사람이 가입하려면 **Authentication → Emails → SMTP Settings**에서 외부 메일 서버를 연결해야 한다.
- **Resend**, **Brevo** 같은 메일 서비스의 무료 플랜을 쓰거나
- Gmail 계정의 **앱 비밀번호**로 Gmail SMTP를 연결할 수 있다.

## 5. GitHub Pages에 올리기
1. 저장소에 `index.html`을 업로드 (기존 파일 덮어쓰기)
2. Settings → Pages에서 main 브랜치 / root로 배포
3. 주소로 들어가서 **이메일로 가입하기** → 인증번호 → 영어 이름·비밀번호 입력 순서로 테스트

## 동작 방식 요약
- 가입: 이메일 입력 → Supabase 서버가 인증번호를 만들어 메일 발송 → 번호 확인 → 영어 이름, 비밀번호 저장
- 로그인: 이메일 + 비밀번호
- 비밀번호를 잊으면: 같은 인증번호 절차로 다시 확인한 뒤 새 비밀번호 설정
- 기록: 공부할 때마다 `progress` 테이블에 저장되고, 어느 기기에서 로그인해도 마지막 위치부터 이어짐
- 가입자 목록은 Supabase의 **Authentication → Users**, 학습 기록은 **Table Editor → progress**에서 볼 수 있다.
