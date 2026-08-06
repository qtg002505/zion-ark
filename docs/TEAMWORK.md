# 5인 분업 계획 — 파트 경계와 진행 순서

리드 1명(저장소 관리·합치기) + 팀원 5명(카테고리 파트 담당) 체제의 운영 규칙이다.
일반 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md), 이 문서는 **누가 어떤 파일을 만지는가**와
**작업이 도는 순서**만 다룬다.

## 원칙 하나 — 충돌은 파일 경계로 막는다

git 충돌은 "같은 파일을 두 사람이 고칠 때"만 생긴다. 그래서 파트를 **화면(카테고리)이 아니라
파일 목록**으로 가른다. 자기 파트 파일만 만지면 충돌은 구조적으로 나지 않는다.

## 파트 분담표

| 파트 | 카테고리 | 담당 파일 |
|---|---|---|
| **A. 우리 기수현황** | 전체 현황 · 기수 현황 · 주간계획 | `src/pages/Overview.tsx` · `CohortStatus.tsx` · `WeeklyPlanPage.tsx` · `src/content/cohort-mock.ts` |
| **B. 수강생 관리·상담** | 수강생 목록 · 관찰 필요 · 성향 · 상담 사례 | `src/pages/Students.tsx` · `Signals.tsx` · `Enneagram.tsx` · `CounselCases.tsx` · `src/lib/attendance-signals.ts` · `src/content/enneagram-guides.ts` |
| **C. 강사 도우미** | 초·중·고 교안 · 자료 모으기 · 현장 기록 | `src/pages/Lessons.tsx` · `Compose.tsx` · `src/components/LessonNotes.tsx` · `src/lib/compose.ts` · `src/content/elementary-lessons.ts` · `lessons-high*` |
| **D. 전도사 도우미·자료실** | 자료실 구획·폴더 · 신천지도서 시리즈 | `src/pages/Library.tsx` · `SeriesReader.tsx` · `src/content/series/**` · `series-content.ts` |
| **E. 공지·어록·외부매체** | 공지사항 · 총회장님 어록 · 말씀광장/천지일보 링크 | `src/pages/Notices.tsx` · `Quotes.tsx` · `src/lib/quote-picker.ts` · `src/content/quotes/**` · `quotes-data.ts` |

### 공유 파일 — 리드만 고친다

아래는 모든 파트가 함께 쓰는 계약·뼈대다. **팀원은 고치지 않는다.**
고칠 필요가 생기면 이슈나 PR 본문에 "무엇을 어떻게 바꿔 달라"고 적고, 리드가 반영한다.

```
CLAUDE.md · docs/** · index.html · vite.config.ts · package.json · .github/**
src/App.tsx · src/shell/** (nav.ts · Sidebar.tsx · Layout.tsx)
src/lib/types.ts · store.tsx · permissions.ts · auth.tsx · search.ts · markdown.tsx
src/pages/common.tsx · Login.tsx · src/components/Accordion.tsx · src/index.css
```

왜: `types.ts`·`store.tsx`는 데이터 계약이라 충돌하면 풀기 어렵고, `nav.ts`는 다섯 파트가
전부 닿는 파일이라 동시에 고치면 반드시 충돌한다. `공유자료/`·`_archive/`는 아무도 안 고친다.

## 진행 순서

### 1회 준비 (리드)

1. `git push -u origin main` — 원격에 올린다
2. GitHub → Settings → **Collaborators** → 팀원 5명 초대 (팀원은 GitHub 계정 필요)
3. Settings → **Branches** → `main` 보호 규칙:
   - "Require a pull request before merging" 체크 (승인 1명)
   - "Require review from Code Owners" 체크 — 공유 파일을 건드린 PR은 리드 승인이 강제된다
4. Settings → Pages → Source = **GitHub Actions** (프리뷰 자동 배포)

### 팀원 첫 세팅 (각자 1회)

```
git clone https://github.com/seonghun0025-wq/zion-ark.git
cd zion-ark
npm install
npm run dev
```

그리고 [CONTRIBUTING.md](CONTRIBUTING.md)의 "작업 전 읽을 것"을 읽는다.

### 반복되는 작업 사이클

```
리드: 이슈 발행(작업지시 양식) + 담당자 지정
  ↓
팀원: git pull origin main        ← 시작 전 반드시. 옛 코드에서 시작하는 것이 충돌 원인 1위
팀원: git switch -c part-a/요약    ← 파트 접두사 + 요약으로 브랜치
팀원: 수정 → 검증(아래) → push → PR 생성 (본문에 "Closes #이슈번호")
  ↓
리드: PR 리뷰 — 화면 확인 + 파트 밖 파일을 건드리지 않았는지
리드: 머지 → Pages가 자동 배포 → 팀 전체가 같은 링크에서 결과 확인
  ↓
다른 팀원들: 다음 작업 시작 전 git pull  (머지된 내용을 받는다)
```

팀원 검증 (PR 올리기 전, [CONTRIBUTING.md](CONTRIBUTING.md) 상세):

```
npm run typecheck
npm run build
```

+ 브라우저에서 콘솔 오류 0 · 375px 폭 가로 넘침 0.

### 리드 합치기 규칙

- **PR은 작게, 자주.** 파트 하나에 일주일치를 몰아 오면 리뷰도 충돌도 커진다.
  이슈 하나 = PR 하나가 기본
- 머지 순서는 선착순으로 충분하다 — 파일 경계를 지켰으면 순서가 무관하다
- 두 파트에 걸치는 작업(예: 새 화면 + 메뉴 등록)은 팀원이 화면 파일까지 만들고,
  `App.tsx`·`nav.ts` 등록은 리드가 머지 직후에 한다

## 작업지시 내리는 방법

**GitHub 이슈로 내린다.** 말로 전달하면 "뭘 하기로 했는지"가 흩어진다 — 이슈에 적으면
지시·진행·완료가 한 곳에 남고, PR과 자동으로 연결된다.

1. 저장소 → Issues → New issue → **"작업지시" 양식** 선택 (`.github/ISSUE_TEMPLATE/`)
2. 양식의 여섯 칸을 채운다 — 특히 **완료 기준**과 **건드리지 않는 파일**
3. 오른쪽 Assignees에서 담당 팀원 지정
4. 팀원은 PR 본문에 `Closes #번호`를 적는다 — 머지되면 이슈가 자동으로 닫힌다

지시 예시:

> **제목**: [파트 D] 자료실 폴더에 자료 건수 대신 최신 등록일 표시
> **배경**: 폴더에 자료가 쌓이면 건수보다 "언제 마지막으로 올라왔나"가 유용하다는 의견.
> **할 일**: `Library.tsx` 폴더 목록의 건수 숫자를 최신 등록일(MM.DD)로 바꾼다.
> **완료 기준**: 두 구획 모두에서 날짜가 보이고, 자료 없는 폴더는 "—" 표시. 375px 확인.
> **건드리지 않는 파일**: `types.ts` · `store.tsx` (필요하면 이슈에 코멘트로 요청)

## 주의 — 미리 알아 둘 것

- **localStorage는 각자 브라우저별이다.** 팀원 A가 화면에서 등록한 목업 자료는 B에게 안 보인다.
  같이 봐야 하는 데이터는 시드(`store.tsx`)에 넣어야 하며, 시드는 리드가 고친다
- 팀원이 Claude Code를 쓴다면 저장소의 `CLAUDE.md`와 `.claude/skills/`가 자동 적용된다 —
  같은 규칙으로 작업하게 되므로 오히려 권장
- 실수로 공유 파일을 고친 PR은 CODEOWNERS가 리드 승인을 강제하므로 몰래 머지되지 않는다
