# 기술 스택

## 프론트엔드

| 항목 | 선택 | 이유 |
| --- | --- | --- |
| 프레임워크 | Next.js 15 (App Router) | RSC로 초기 로드 최적화, Vercel 배포 간편 |
| 언어 | TypeScript 5.x (strict) | 도메인 모델 안전성 |
| 스타일 | Tailwind CSS 4 | 빠른 프로토타이핑, 시니어 대상 큰 타이포 커스텀 쉬움 |
| UI 프리미티브 | shadcn/ui | 소스 소유, 커스텀 자유, 접근성 기본 |
| 아이콘 | lucide-react | shadcn 표준 |
| 폼 | react-hook-form + zod | 검증 스키마 재사용 (서버·클라이언트 공유) |
| 차트 | Recharts | 대시보드 시각화, RSC 호환 |
| 상태 | RSC 기본, 클라이언트 필요 시 Zustand | Redux 오버킬 회피 |

## 백엔드 / 데이터

| 항목 | 선택 | 이유 |
| --- | --- | --- |
| DB | Supabase Postgres | RLS로 권한 강제, 실시간 구독 |
| 인증 | Supabase Auth | 카카오 OAuth 지원, 세션 미들웨어 |
| 스토리지 | Supabase Storage | 프로필 사진·주보 첨부 |
| 마이그레이션 | Supabase CLI (`supabase/migrations/`) | 코드 리뷰 가능한 SQL 관리 |
| API | Next.js Route Handlers + Server Actions | 별도 백엔드 서버 없음 |

## AI

| 항목 | 선택 | 이유 |
| --- | --- | --- |
| LLM | Anthropic Claude (Sonnet 5 / Opus 5) | 한국어 성경·신학 문맥 이해 우수 |
| SDK | `@anthropic-ai/sdk` | 스트리밍·툴 유즈 지원 |
| 프롬프트 관리 | `lib/ai/prompts/*.ts` | 파일 단위 버전 관리 |
| 토큰 로깅 | Supabase `ai_calls` 테이블 | 비용 추적 |

## 개발 환경

- 패키지 매니저: **pnpm**
- Node: 20 LTS 고정 (`.nvmrc`)
- Lint: ESLint (Next.js 기본) + Prettier
- 커밋 훅: Husky + lint-staged
- 타입 체크: `pnpm typecheck`을 CI에서 강제

## 배포

- **프론트**: Vercel (자동 프리뷰 배포)
- **DB**: Supabase Cloud (Seoul 리전)
- **환경 분리**: `dev` / `staging` / `prod` — Supabase 프로젝트 각각
- **비밀 관리**: Vercel 환경 변수, 로컬은 `.env.local`

## 미결정 / 검토 중

- 에러 모니터링: Sentry vs. Vercel 내장 → 트래픽 발생 후 결정
- 이메일 발송: Resend 유력 (초기 도입 대상)
- 백업: Supabase 유료 플랜 자동 백업 vs. 자체 pg_dump 크론
