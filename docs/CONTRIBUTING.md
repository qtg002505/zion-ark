# 공동작업 가이드

## 시작하기

```bash
git clone <repo-url>
cd zion-ark
npm install
npm run dev   # http://localhost:5173
```

Node 22 이상. Windows에서는 PowerShell 기준 `npm.cmd` / `npx.cmd`.

## 작업 전 읽을 것 (순서대로)

1. [../CLAUDE.md](../CLAUDE.md) — 불변식 · 데이터 계약 · 하지 말 것
2. [HANDOFF.md](HANDOFF.md) — 직전 작업 상태와 다음 할 일
3. [ARCHITECTURE.md](ARCHITECTURE.md) — 화면·권한·교체 경계

## 브랜치·커밋 규칙

- `main` 직접 커밋 금지 — 기능 브랜치에서 PR
- 브랜치: `feat/<영역>-<요약>` · `fix/<요약>` (예: `feat/library-course-series`)
- 커밋: Conventional Commits (`feat:` `fix:` `docs:` `chore:`)
- 한 파일은 동시에 한 명만 수정 (특히 `src/lib/types.ts` · `store.tsx` — 데이터 계약 파일)

## 코드 규칙

- TypeScript strict, `any` 금지
- 화면은 `src/pages/`, 도메인 로직은 `src/lib/`, 콘텐츠는 `src/content/`
- 새 화면 추가 시: `src/pages/`에 컴포넌트 → `src/App.tsx`에 라우트 → `src/shell/nav.ts`에 메뉴
- 권한 분기는 `src/lib/permissions.ts`의 함수만 사용 — 컴포넌트에서 roleCode 직접 비교 금지
- UI 문자열은 한국어, 데이터 계약 코드값은 영문 유지

## 검증 (PR 전)

```bash
npm run typecheck
npm run build
```

## 절대 규칙

- 실존 인물 정보를 목업·테스트 데이터에 쓰지 않는다
- 교리 콘텐츠는 원문 그대로 — 재작성 금지
- 역할 코드·카테고리·kind·출결 어휘 등 데이터 계약 변경 금지 (변경 필요 시 리드 승인)
- 작업 후 [HANDOFF.md](HANDOFF.md) 갱신
