# 공동작업 가이드

## 시작하기

```bash
git clone <저장소 주소>
cd scj
npm install
cp .env.example .env
npm run dev
```

Windows PowerShell이면 `cp` 대신 `Copy-Item .env.example .env`, `npm` 대신 `npm.cmd`.

`http://localhost:5173`이 열리면 로그인 화면에서 **역할을 골라 시범 로그인**한다.
역할마다 보이는 메뉴와 조회 범위가 다르니, 맡은 화면과 관련된 역할로 들어가 확인한다.

Node 22 이상이 필요하다.

## 작업 전 읽을 것 (순서대로)

1. [../CLAUDE.md](../CLAUDE.md) — 불변식 · 데이터 계약 · 화면 규칙 · 하지 말 것
2. [HANDOFF.md](HANDOFF.md) — 직전 작업 상태, 대기 중인 것, **밟으면 안 되는 함정**
3. [ARCHITECTURE.md](ARCHITECTURE.md) — 화면 구조 · 권한 모델 · 디자인 시스템 · 교체 경계

배포·환경 변수를 다룬다면 [DEPLOY.md](DEPLOY.md)도 함께 읽는다.

AI 도구(Claude Code)로 작업한다면 `.claude/skills/zion-ark-web` 스킬이 작업 절차를 담고 있다.

## 브랜치 · 커밋

- `main`에 직접 커밋하지 않는다 — 기능 브랜치에서 작업하고 PR로 합친다
- 브랜치: `feat/<영역>-<요약>` · `fix/<요약>` (예: `feat/library-course-series`)
- 커밋 메시지는 한국어로, 무엇을 왜 바꿨는지 적는다 (Conventional Commits: `feat:` `fix:` `docs:` `style:`)
- **한 파일은 동시에 한 사람만** 수정한다. 특히 `src/lib/types.ts`·`src/lib/store.tsx`는
  데이터 계약이라 충돌하면 풀기 어렵다

## 코드 규칙

- TypeScript strict. `any`를 쓰지 않는다
- 화면은 `src/pages/`, 도메인 로직은 `src/lib/`, 자료는 `src/content/`
- **새 화면 추가 순서**: `src/pages/`에 컴포넌트 → `src/App.tsx`에 라우트 → `src/shell/nav.ts`에 메뉴
- **권한 분기는 `src/lib/permissions.ts`의 함수만 쓴다.** 컴포넌트에서 `roleCode`를 직접
  비교하면 권한 규칙이 여기저기 흩어져 나중에 바꿀 수 없게 된다
- **색은 토큰만 쓴다** (`zion-*`·`ink`·`surface`). 화면 파일에 색을 하드코딩하지 않는다.
  팔레트를 바꿀 일이 생기면 `src/index.css` 한 곳만 고치면 되도록 유지한다
- 긴 본문은 `src/components/Accordion.tsx`로 소주제 단위로 접는다
- UI 문구는 한국어. 데이터 계약의 코드값(역할·카테고리 등)은 영문 그대로 둔다

## 좁은 화면도 함께 본다

현장에서 휴대전화로 자료를 여는 경우가 많다. 화면을 만들면 375px 폭에서도 확인한다.

- 2단 구성은 `max-md:grid-cols-1`로 쌓고, 탭 줄은 `overflow-x-auto`
- 표는 표만 가로로 넘긴다 (`min-w-[560px]`) — 페이지 본문이 옆으로 밀리면 안 된다

## 올리기 전 확인

```bash
npm run typecheck
npm run build
```

화면을 건드렸으면 브라우저에서 직접 열어 보고:
- 콘솔 오류 0
- 모바일 폭에서 가로 넘침 없음
- 외부 사이트를 화면에 담았다면 **실제 브라우저**에서 확인 (개발용 브라우저는 차단 정책을 무시한다)

## 절대 규칙

- **실제 개인정보를 목업·테스트 데이터에 쓰지 않는다.** 수강생 데이터는 전원 가상 인물이다
- **교리 콘텐츠(교안·시리즈·어록)는 원문 그대로.** 요약·재작성하지 않는다.
  명백한 오탈자만 고치고, 뜻이 달라질 수 있는 표현은 손대지 않는다
- **API 키를 커밋하지 않는다.** `.env`는 git에서 제외돼 있다.
  실수로 올렸다면 값을 지우는 것으로 끝나지 않는다 — 키를 폐기하고 새로 발급한다
- 역할 코드·카테고리·kind·출결 어휘 등 **데이터 계약을 바꾸지 않는다** (변경이 필요하면 리드 승인)
- `_archive/`(이전 프로젝트)·`공유자료/`(원본 자료)는 수정하지 않는다

## 작업을 마치면

[HANDOFF.md](HANDOFF.md)를 갱신한다. 화면·메뉴·권한 구조가 바뀌었으면
[ARCHITECTURE.md](ARCHITECTURE.md)도. **새로 밟은 함정은 반드시 적는다** — 다음 사람이
같은 데서 막히지 않게 하는 것이 이 문서들의 목적이다.
