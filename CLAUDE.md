# 시온 아크(ZION ARK) 웹 프로토타입 — AI 세션 작업 지침

이 저장소는 시온 아크 플랫폼의 **웹 프런트엔드 프로토타입**이다 (React 19 + Vite + TS + Tailwind 4).
원 운영 저장소(vinext + Cloudflare Workers/D1)와 별개이며, 화면·권한·동선을 먼저 완성해
검증하는 용도다. 단, **데이터 계약·권한 모델·불변식은 원 저장소와 동일하게 유지한다** —
백엔드 연동 시 그대로 이식하기 위해서다.

기획 원문: `C:\Users\user\Desktop\시온 아크 프로젝트\` (1단계-착수지시문 · 현재-상태 · 권한-결정사항)
및 `zion-ark-dev` 스킬.

## 세션 시작

1. `docs/HANDOFF.md` 먼저 읽기
2. `git log --oneline -5` / `git status --short`
3. 개발 셸은 Windows PowerShell: `npm.cmd`, `npx.cmd`

## 검증 (핸드오프 전)

```
npx.cmd tsc -b --noEmit
npm.cmd run build
```

## 데이터 계약 — 임의 변경 금지

- **역할 코드** (`src/lib/types.ts`): `headquarters_admin` · `tribe_admin` · `church_admin` ·
  `instructor` · `evangelist` · `content_admin` · `security_auditor`
- **조직 범위**: `national` · `tribe` · `church` · `cohort` · `division`
- **자료실 카테고리**: `standard_lecture` · `class_material` · `excellent_plan` + `isFeatured`
- **공지·어록 kind**: `notice_hq` · `notice_tribe` · `quote` · `video` (workspace_entries 계약)
- **출결 어휘**: `미입력`→unknown · `결석`→absent · `금주보강`→makeupPending ·
  `추후완료`→makeupDone · `대면` 포함→present
- 어휘: **사명자** = 강사+전도사. 강사=담당 기수, 전도사=담당 분반

## 권한 확정값 (2026-08-05 리드 — 재질문 금지)

- 총회 공지 작성: `headquarters_admin` + `content_admin` / 지파 공지: 해당 지파 `tribe_admin`
- 어록·영상·자료실 등록: `content_admin` + `headquarters_admin`
- 우수 교안 지정: `headquarters_admin`만, 승인 워크플로우 없음
- 열람은 로그인 전체. 본부·지파의 강사/전도사 도우미 사용은 "보기만"
- 시범 로그인 당분간 유지 — **실제 개인정보 투입 전 반드시 정리**

## 불변식

1. 수강생 조회는 담당 배정 범위로 스코프. 전도사는 담당 분반만. (서버 연동 시 401/403 계약)
2. 원문 개인정보는 외부 링크·아티팩트·스크린샷·로그 금지 — 집계·통계만 반출
3. 출결 원본은 읽기 전용 — 되쓰기 UI 만들지 않음
4. AI는 수강생의 신앙·인격·심리를 확정 판정하지 않음. 답변에 출처 표시.
   수강생 개인정보를 AI 입력에 넣지 않음 (공통 교육 영역만)
5. 교리 콘텐츠(교안·시리즈 본문)는 원문 그대로 이관 — **재작성 금지**
6. 목업 데이터는 반드시 가상 인물임을 화면에 표기

## 교체 경계 (백엔드 연동 시 이 파일들만 바뀐다)

- `src/lib/auth.tsx` — 시범 로그인 → 휴대전화 인증 / 상위 대시보드 SSO
- `src/lib/store.tsx` — localStorage → API 클라이언트 (library-materials · workspace-entries)
- `src/content/cohort-mock.ts` — 목업 → attendance-adapter (읽기 전용 시트 → 표준 모델)
- `src/lib/search.ts` — 로컬 검색 → AI API (검색 대상은 공통 교육 영역 유지)

화면 컴포넌트(`src/pages/**`)는 이 경계 뒤의 구현에 의존하지 않게 유지한다.

## 하지 말 것

- 스펙 없는 기능 임의 추가 (기획 문서·착수지시문 범위 밖)
- 데이터 계약(역할 코드·카테고리·kind·출결 어휘) 변경
- 교리 내용 재작성
- 실존 인물 정보를 목업에 사용
- `_archive/` 수정 (이전 프로젝트 보관용)

## 문서 갱신

작업 후 `docs/HANDOFF.md` 갱신. 화면·권한 구조가 바뀌면 `docs/ARCHITECTURE.md`도.
원 기획 폴더(`시온 아크 프로젝트`)의 `현재-상태.md`는 리드가 관리 — 직접 수정하지 않는다.
