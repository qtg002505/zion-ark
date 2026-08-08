# 시온 아크 (ZION ARK) — 만국 소성 플랫폼

전국 12지파 → 교회 → 기수 → 분반으로 이어지는 신학 교육 조직에서, **강사와 전도사(사명자)가
수강생을 관리하고 강의·분반 자료를 공유받는 내부 운영 플랫폼**의 웹 프런트엔드 프로토타입.

강사는 표준 강의 자료·우수 교안·교안 7항목을, 전도사는 분반·보강 자료·에니어그램 가이드를
공유받고, 로그인하면 담당 범위(**강사·전도사 모두 담당 기수 전체** — 2026-08-06 확정)의
출석 현황과 수강생 관리 대시보드가 한 화면에 연동된다.

## 실행

```bash
npm install
cp .env.example .env
npm run dev        # http://localhost:5173
```

```bash
npm run build          # 프로덕션 빌드 (tsc + vite)
npm run typecheck      # 타입 검사만
npm run build:preview  # 팀 공유용 단일 HTML (preview/)
```

`.env`는 git에 올라가지 않는다. **API 키는 파일로 올리지 않고 배포처(Vercel) 환경 변수에
등록한다** — 자세한 내용은 [docs/DEPLOY.md](docs/DEPLOY.md).

로그인 화면에서 **역할을 선택해 시범 로그인**하면 역할별 메뉴·권한·조회 범위를 확인할 수
있다 (시범 조직: 요한 지파 · 과천교회 · 113기 — 목업 데이터, 실제 개인정보 아님).

## 팀 파트 분담 (대시보드 대카테고리 기준)

다섯 명이 대시보드의 큰 카테고리별로 한 파트씩 맡는다. **자기 파트 파일만 고치면
승인을 기다리지 않고 직접 머지**한다. 상세는 [docs/TEAMWORK.md](docs/TEAMWORK.md).

2026-08-08 카테고리 개편(9개 → **7개 + 홈**)이 반영된 배분이다.

| 파트 | 담당 카테고리 | 주요 파일 |
| --- | --- | --- |
| **A** | 홈 · 기수 현황 | `pages/Overview.tsx` · `CohortStatus.tsx` · `WeeklyPlanPage.tsx` · `content/cohort-mock.ts` |
| **B** | 수강생 관리 도우미 (개인 카드) | `pages/Students.tsx` · `Signals.tsx` · `Enneagram.tsx` · `lib/attendance-signals.ts` |
| **C** | 강의 도우미 | `pages/Lessons.tsx` · `Compose.tsx` · `components/LessonNotes.tsx` · `lib/compose.ts` · 교안 콘텐츠 |
| **D** | 분반 · 보강 도우미 **+ 상담 도우미** | `pages/Counseling.tsx` · `CounselCases.tsx` · 보강 자료 원문(`content/evangelist/**`) |
| **E** | 자료실 (공지 · 어록 · 외부 매체 포함) | `pages/Library.tsx` · `SeriesReader.tsx` · `Notices.tsx` · `Quotes.tsx` · `lib/quote-picker.ts` · 시리즈·어록 콘텐츠 |
| **리드** | 사명자 심방 도우미 | `pages/Care.tsx` |

**공유 파일**(`lib/types.ts` · `store.tsx` · `permissions.ts` · `App.tsx` · `shell/**` ·
`index.css` · `docs/**`)은 리드만 고친다. 실수로 건드리면 `CODEOWNERS`가 잡아
머지 버튼이 잠기므로, PR 본문의 "공유 파일 변경 요청"에 적으면 리드가 반영한다.

### 팀원이 볼 곳

| 무엇 | 어디 |
| --- | --- |
| **처음 시작** — 설치부터 PR까지 순서대로 | [docs/ONBOARDING.md](docs/ONBOARDING.md) |
| **내 작업지시** | [Issues](../../issues) → 자기 파트 라벨로 거르기 |
| **결과 확인** (팀 공유 링크, 자동 갱신) | https://qtg002505.github.io/zion-ark/ |

## 기술 스택

| 항목 | 값 |
| --- | --- |
| 프레임워크 | React 19 + Vite 6 + TypeScript (strict) |
| 라우팅 | react-router-dom 7 |
| 스타일 | Tailwind CSS 4 |
| 아이콘 | lucide-react |
| 데이터 | 프로토타입 단계 — localStorage 스토어 (`src/lib/store.tsx`가 API 교체 경계) |

## 폴더 구조

```
src/
  lib/          # 타입(데이터 계약) · 인증 · 권한 · 스토어 · 검색
  content/      # 교안·에니어그램·시리즈·목업 기수 데이터
  shell/        # 앱 셸 (사이드바 · Ask AI 바 · 로고 · 내비 정의)
  pages/        # 화면 (전체 현황 · 기수 현황 · 수강생 · 자료실 · 시리즈 · 공지 · 어록 …)
docs/           # 프로젝트 문서 (아래 참고)
_archive/       # 이전 프로젝트(church-ai-dashboard) 기획 문서 보관
```

## 문서

- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) — **공동작업자는 여기부터** (설치 · 규칙 · 브랜치)
- [CLAUDE.md](CLAUDE.md) — AI 세션 작업 지침 (불변식 · 데이터 계약 · 화면 규칙)
- [docs/HANDOFF.md](docs/HANDOFF.md) — 세션 핸드오프: 끝낸 것 · 다음 작업 · 함정
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — 화면 구조 · 권한 모델 · 디자인 시스템 · 교체 경계
- [docs/DEPLOY.md](docs/DEPLOY.md) — 환경 변수 · Vercel 배포

## 구현 상태 (1단계 자료 제공 중심)

| 기능 | 상태 |
| --- | --- |
| 시범 로그인 (역할 7종 · 권한별 메뉴/범위) | ✅ |
| 전체 현황 — 출석률 **분포**·대면 시간대·고정 공지 | ✅ |
| 기수 현황 (요약·출석·분반 3탭) | ✅ |
| 수강생 관리 (상태 분류·필터·검색 — 강사·전도사 모두 담당 기수 전체) | ✅ |
| 자료실 — 등록·열람·검색·우수 교안 지정 | ✅ |
| 시리즈 리더 — 요한계시록 (장 목록·검색·열람 동선) | ✅ 구조 완성 · 본문 원문 이관 대기 |
| 공지 — 총회/지파 작성 권한 분리 | ✅ |
| 어록 검색·등록 | ✅ 구조 완성 · 원본 파일 수령 대기 |
| Ask AI — 사이트 자료 검색 + 출처 표시 | ✅ 로컬 검색 (AI API 연결은 다음 단계) |
| 파일 업로드 / QR 출석 / 텔레그램 / 고급 AI 분석 | ⏳ 2~4단계 |

## 원칙 (요약)

- 수강생 데이터는 **담당 배정 범위만** 조회 — 항상 전국을 보여주는 방식은 채택하지 않음
- 개인정보 원문은 외부 반출 금지, **집계·통계만** 공유 가능
- AI는 수강생의 신앙·인격·심리를 **확정 판정하지 않음** — 출처·근거 표시
- 상세 규칙은 [CLAUDE.md](CLAUDE.md)
