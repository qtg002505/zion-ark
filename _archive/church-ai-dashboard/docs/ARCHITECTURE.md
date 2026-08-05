# 아키텍처

## 전체 그림

```
[Browser]
   │ (RSC + Client Components)
   ▼
[Next.js on Vercel]
   ├── Route Handlers / Server Actions
   │        │
   │        ├── Supabase (DB / Auth / Storage) — RLS로 권한 강제
   │        └── Anthropic Claude API — AI 어시스턴트
   ▼
[Supabase Postgres]
   └── RLS 정책 · Trigger · Extension (pgvector 검토)
```

## 인증 흐름

1. 사용자가 `/login`에서 이메일 또는 카카오 로그인
2. Supabase Auth가 세션 쿠키 발급
3. `middleware.ts`가 요청마다 세션 검증 → 만료 시 갱신
4. RSC/Server Action은 `createServerClient(cookies)`로 사용자 컨텍스트 로드
5. DB 쿼리는 사용자 JWT로 실행 → RLS가 자동 적용

## 권한 모델

- `profiles` 테이블에 `role`, `church_id` 저장
- RLS는 `auth.uid()` + `profiles` 조회 함수 (`is_role('pastor')`, `same_church(row.church_id)`)로 판단
- 관리자 승격은 서버 액션에서 `role` 체크 후 수행

## 핵심 테이블 (초안)

| 테이블 | 요약 |
| --- | --- |
| `churches` | 교회 기본 정보 (멀티테넌시 대비) |
| `profiles` | 사용자 프로필 + 역할 (Auth `users`와 1:1) |
| `members` | 성도 명부 |
| `families` | 가족 그룹 (members에 `family_id` FK) |
| `small_groups` | 소그룹 (구역·목장) |
| `attendances` | 출석 기록 (`member_id`, `service_id`, `date`) |
| `services` | 예배·모임 정의 |
| `offerings` | 헌금 기록 |
| `offering_types` | 헌금 종류 (교회별 커스텀) |
| `posts` | 소그룹 게시글 (공지·기도제목·나눔) |
| `comments` | 게시글 댓글 |
| `ai_calls` | AI 호출 로그 (사용자·프롬프트 종류·토큰) |
| `ai_documents` | AI 결과 저장 (설교 초안 등) |

상세 스키마·인덱스·RLS 정책은 각 기능 스펙 문서에서 확정.

## 폴더 구조 (반복)

```
app/
  (auth)/login/
  (auth)/signup/
  (dashboard)/
    layout.tsx           # 인증 가드 + 사이드바
    page.tsx             # 홈 대시보드
    members/
    attendance/
    offerings/
    groups/
    ai/
  api/
    ai/[route]/route.ts
components/
  ui/                    # shadcn 프리미티브
  features/
    members/
    attendance/
    offerings/
    groups/
    ai/
lib/
  supabase/
    client.ts            # 브라우저용
    server.ts            # RSC / Server Action용
    middleware.ts        # 세션 갱신
  ai/
    client.ts            # Anthropic SDK 래퍼
    prompts/
    logger.ts
  auth/
    guards.ts            # 역할 체크 헬퍼
  utils/
  i18n/ko.ts
db/
  migrations/            # supabase migration new
  seed/
docs/
  features/
  adr/
```

## AI 어시스턴트 파이프라인

1. 사용자가 어시스턴트 폼 제출 → Server Action
2. Server Action이 역할 체크 (pastor/admin만 설교 도우미 가능 등)
3. `lib/ai/client.ts`가 프롬프트 조립 → Anthropic 호출 (스트리밍)
4. 호출 완료 후 `ai_calls`에 토큰·비용 기록
5. 사용자가 결과 편집 → `ai_documents`에 저장

## 오류 처리

- Server Action은 `{ ok: true, data } | { ok: false, error }` 형태 리턴
- 클라이언트 에러 경계(`error.tsx`)로 페이지 단위 폴백
- Supabase 에러는 `PGRST` 코드 매핑 유틸로 사용자 메시지 변환

## 관련 ADR

- `docs/adr/0001-supabase-vs-custom-backend.md` (예정)
- `docs/adr/0002-app-router-rsc-default.md` (예정)
