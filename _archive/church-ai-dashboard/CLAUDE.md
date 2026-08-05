# church-ai-dashboard — Claude Code 지침서

이 파일은 Claude Code가 이 저장소에서 작업할 때 항상 로드되는 컨텍스트다. Claude Project(웹)에서 나온 기획·설계 결과물을 실제 코드로 구현하는 역할을 맡는다.

---

## 1. 프로젝트 요약

- **이름**: church-ai-dashboard
- **성격**: 교회 운영 관리 + AI 어시스턴트 + 커뮤니티 기능이 결합된 복합형 웹 서비스
- **저장소**: https://github.com/qtg002505/church-ai-dashboard
- **상세 배경**: [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md)
- **기능 요구사항**: [docs/PRD.md](docs/PRD.md)

## 2. 기술 스택

- **프레임워크**: Next.js (App Router, TypeScript)
- **DB / 인증 / 스토리지**: Supabase (Postgres + Auth + Storage + RLS)
- **UI**: Tailwind CSS + shadcn/ui
- **AI**: Anthropic Claude API (설교/성경 어시스턴트, 요약)
- **상태 관리**: React Server Components 우선, 필요 시 Zustand
- **배포**: Vercel + Supabase Cloud

상세 이유·버전·설정은 [docs/TECH_STACK.md](docs/TECH_STACK.md) 참고.

## 3. 폴더 구조 원칙

```
app/                   # Next.js App Router (라우트별 폴더)
  (auth)/              # 로그인·회원가입 그룹
  (dashboard)/         # 관리 화면 그룹 (인증 필요)
  api/                 # Route handlers
components/
  ui/                  # shadcn 기반 프리미티브
  features/<domain>/   # 도메인별 조합 컴포넌트
lib/
  supabase/            # 클라이언트/서버/미들웨어 팩토리
  ai/                  # Anthropic 호출 래퍼
  utils/
db/
  migrations/          # Supabase SQL 마이그레이션
  seed/                # 개발용 시드
docs/                  # 기획·설계 문서 (아래 4번 참고)
```

- 도메인 단위로 자를 것. 파일이 커지기 전에 `features/<domain>` 안으로 격리.
- 컴포넌트는 서버 컴포넌트 기본, 상호작용 필요할 때만 `"use client"`.
- Supabase 호출은 반드시 `lib/supabase/*`의 팩토리 경유 (직접 createClient 금지).

## 4. 문서 지도

작업 시작 전 관련 문서 먼저 읽는다.

| 문서 | 언제 읽나 |
| --- | --- |
| [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) | 프로젝트 목적·사용자·범위 확인할 때 |
| [docs/PRD.md](docs/PRD.md) | 기능 우선순위·MVP 범위 확인할 때 |
| [docs/TECH_STACK.md](docs/TECH_STACK.md) | 라이브러리 선택·버전·설정 참고할 때 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 데이터 모델·인증 흐름·경계 확인할 때 |
| [docs/WORKFLOW.md](docs/WORKFLOW.md) | Claude Project ↔ Claude Code 협업 규칙 |
| [docs/features/*.md](docs/features) | 개별 기능 스펙 (구현 전 반드시 확인) |
| [docs/adr/*.md](docs/adr) | 아키텍처 결정 기록 |

## 5. 코딩 규칙

- **TypeScript strict**. `any` 금지, 불가피하면 주석으로 이유.
- **서버 코드에서 Service Role Key 사용 절대 금지** (RLS 우회는 명시적 admin 라우트만).
- **환경 변수**는 `.env.local`, 커밋 금지. 필요한 키는 `.env.example`에 이름만.
- **DB 스키마 변경은 반드시 마이그레이션 파일로**. 대시보드에서 직접 수정 금지.
- **RLS 정책 없는 테이블 배포 금지**. 새 테이블 만들면 즉시 policy 작성.
- **AI 호출**은 `lib/ai/` 래퍼 통해서만. 프롬프트는 별도 파일로 분리.
- **한글 UI 문자열**은 `lib/i18n/ko.ts`에 모아두기 (추후 다국어 대비).

## 6. Git 워크플로우

- `main`: 배포 브랜치 (직접 커밋 금지)
- `feat/<domain>-<short>`: 기능 브랜치
- `fix/<short>`: 버그 픽스
- 커밋 메시지: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- PR 본문에 관련 기능 스펙 링크 필수 (`Closes docs/features/<name>.md`)

## 7. 작업 착수 체크리스트

새 태스크 받으면:

1. 관련 `docs/features/<name>.md` 있는지 확인 → 없으면 사용자에게 스펙 요청
2. 영향받는 테이블·API·컴포넌트 목록 파악
3. 마이그레이션 필요하면 먼저 SQL 작성 후 검토 요청
4. 구현 → 로컬 테스트 → 스크린샷/GIF로 확인
5. PR 열기 (스펙 링크 + 스크린샷 + 테스트 방법)

## 8. 하지 말 것

- 스펙 없는 기능 임의 추가
- `main`에 직접 푸시
- Service Role Key 클라이언트 노출
- 마이그레이션 없이 스키마 변경
- 문서 갱신 없이 큰 아키텍처 결정
- `console.log` 프로덕션 코드에 남기기
