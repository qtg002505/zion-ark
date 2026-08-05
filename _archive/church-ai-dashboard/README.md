# church-ai-dashboard

교회 운영 관리 + AI 어시스턴트 + 소그룹 커뮤니티 통합 대시보드.

## 문서

- [CLAUDE.md](CLAUDE.md) — Claude Code 지침 (에이전트가 항상 읽음)
- [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) — 목적·사용자·범위
- [docs/PRD.md](docs/PRD.md) — 기능 요구사항
- [docs/TECH_STACK.md](docs/TECH_STACK.md) — 기술 스택
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — 아키텍처·데이터 모델
- [docs/WORKFLOW.md](docs/WORKFLOW.md) — Claude Project ↔ Claude Code 협업
- [docs/features/](docs/features) — 기능 스펙
- [docs/adr/](docs/adr) — 아키텍처 결정 기록

## 스택 요약

Next.js (App Router, TS) · Supabase (Postgres/Auth/Storage) · Tailwind + shadcn/ui · Anthropic Claude · Vercel

## 시작

```bash
pnpm install
cp .env.example .env.local  # 값 채우기
pnpm supabase start          # 로컬 Supabase (선택)
pnpm dev
```

필요한 환경 변수는 `.env.example` 참고.
