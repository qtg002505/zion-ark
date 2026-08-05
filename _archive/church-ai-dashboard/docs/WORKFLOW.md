# 협업 워크플로우 — Claude Project ↔ Claude Code

두 도구의 역할을 분리한다. 문서·의사결정은 Claude Project(웹), 실제 파일 편집·빌드·PR은 Claude Code.

## 역할 분담

| 활동 | Claude Project (웹) | Claude Code (CLI) |
| --- | --- | --- |
| 아이디어 브레인스토밍 | ✅ | ❌ |
| 사용자 스토리 도출 | ✅ | ❌ |
| 기능 스펙 초안 작성 | ✅ | ❌ |
| 아키텍처·데이터 모델 설계 | ✅ | 리뷰 |
| 스펙 파일 저장소 반영 | 산출물 전달 | ✅ (`docs/features/<name>.md`) |
| 코드 작성·수정 | ❌ | ✅ |
| 마이그레이션 SQL | 초안 검토 | ✅ 작성·실행 |
| 로컬 빌드·타입체크 | ❌ | ✅ |
| PR 열기 | ❌ | ✅ |
| PR 리뷰 코멘트 대응 | 논의 | ✅ 수정 |

## 표준 사이클

```
[웹] 기획 세션
  └─ 결과물: 기능 스펙 마크다운 (템플릿 준수)
       │
       ▼
[사람] docs/features/<name>.md 에 커밋
       │
       ▼
[CLI] Claude Code에 "docs/features/<name>.md 구현해줘" 요청
  ├─ 스펙 확인 → 영향 범위 파악
  ├─ 마이그레이션 → API → UI 순으로 구현
  ├─ 타입체크·로컬 확인
  └─ PR 열기 (스펙 링크 필수)
       │
       ▼
[웹] PR diff 리뷰 → 개선 지시 초안
       │
       ▼
[CLI] 지시 반영 → 재푸시
```

## 기능 스펙 템플릿

새 기능은 `docs/features/_template.md`를 복사해 시작한다. 최소 항목:

- 목적 (한 문장)
- 사용자 스토리
- UI 초안 (텍스트 와이어프레임 또는 화면 설명)
- 데이터 모델 변경 (테이블·컬럼·RLS)
- API 엔드포인트 / Server Action 목록
- 예외 케이스
- 완료 기준 (Definition of Done)

## Claude Code에 일 시킬 때 좋은 프롬프트 형태

권장:
> `docs/features/attendance-check.md`에 정의된 출석 체크 UI를 구현해줘. 태블릿 우선. 마이그레이션 먼저 만들고 리뷰해줘.

지양:
> 출석 기능 만들어줘 (스펙 링크 없음 → 임의 구현으로 표류)

## 브랜치·커밋 규칙 (재확인)

- 브랜치: `feat/<domain>-<slug>`, `fix/<slug>`, `chore/<slug>`
- 커밋: Conventional Commits
- PR 본문에 `Spec: docs/features/<name>.md` 반드시 포함

## 시크릿·환경 변수

- Claude Project(웹)에는 API 키·DB URL 등 시크릿 **절대 붙여넣지 않는다**
- 로컬 `.env.local`은 Claude Code 세션에서만 다룬다
- 스펙 문서에는 "환경 변수 이름"만 언급 (`ANTHROPIC_API_KEY` 등)

## 문서 유지 관리

- 스펙이 구현과 어긋나면 구현 완료 시 스펙도 갱신 (PR에 포함)
- 큰 결정은 `docs/adr/NNNN-<title>.md`로 기록 (짧아도 됨)
- README·CLAUDE.md는 스택 변화 시 즉시 반영
