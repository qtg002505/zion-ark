# 배포 · 환경 변수

## 환경 변수 다루는 원칙

**감춰야 하는 값은 브라우저로 내려보내지 않는다.** Vite는 `VITE_`로 시작하는 변수만 앱에
넣어 주는데, 그 값은 빌드 결과물에 그대로 박혀 누구나 열어볼 수 있다. 그래서:

| 종류 | 이름 규칙 | 어디에 두나 | 예시 |
| --- | --- | --- | --- |
| 공개돼도 되는 설정 | `VITE_*` | `.env` · Vercel 환경 변수 | `VITE_ROUTER`, `VITE_ASK_API_PATH` |
| 감춰야 하는 값 | 접두사 없음 | `.env`(로컬) · Vercel 환경 변수(배포) — **서버에서만 읽음** | `ANTHROPIC_API_KEY`, `API_TOKEN` |

API 키가 필요한 호출은 **브라우저가 직접 외부 API를 부르지 않는다.** 우리 서버 경로
(`/api/...`)를 부르고, 키는 그 서버 쪽에서만 읽어 쓴다. 그렇게 해야 키가 노출되지 않는다.

## 로컬 설정

```bash
cp .env.example .env
```

Windows PowerShell:

```
Copy-Item .env.example .env
```

값을 채운 뒤 `npm run dev`. **`.env`는 git에 올라가지 않는다** — `.gitignore`가 `.env.*`를
통째로 막고, 비밀이 없는 `.env.example`·`.env.preview`만 예외로 둔다. 새 이름
(`.env.production` 같은)을 만들어도 자동으로 걸린다.

실수로 키를 커밋했다면 값을 지우는 것으로 끝나지 않는다 — **해당 키를 발급처에서 즉시
폐기하고 새로 발급**한다. 히스토리에 남은 값은 계속 조회 가능하기 때문이다.

## Vercel 배포

1. Vercel에서 **Add New → Project** → 이 GitHub 저장소를 고른다
2. 빌드 설정은 `vercel.json`에 있어 그대로 두면 된다
   (Framework: Vite · Build: `npm run build` · Output: `dist`)
3. **Settings → Environment Variables**에 값을 등록한다.
   `.env.example`에 있는 이름을 그대로 쓴다
   - 환경별로 나눠 넣을 수 있다: Production / Preview / Development
   - **키는 파일로 올리지 않고 반드시 여기에 등록한다**
4. Deploy

### 경로 라우팅

이 앱은 `/library`, `/series/revelation` 처럼 경로로 화면을 나눈다. 정적 호스팅은 그런 경로에
해당하는 파일이 없어 새로고침하면 404가 난다. `vercel.json`의 `rewrites`가 `/api/`로
시작하지 않는 모든 요청을 `index.html`로 넘겨 이 문제를 막는다.

`VITE_ROUTER`는 **비워 둔다**. `hash`는 서버 라우팅이 없는 곳(팀 공유 프리뷰)에서만 쓴다.

## 팀 공유 프리뷰와의 차이

| | 팀 공유 프리뷰 | Vercel 배포 |
| --- | --- | --- |
| 만드는 법 | `npm run build:preview` → 단일 HTML 발행 | git push → 자동 빌드 |
| 라우팅 | 해시(`#/quotes`) | 경로(`/quotes`) |
| 서버 기능 | 없음 (API 키를 쓸 수 없다) | Serverless Function 가능 |
| 용도 | 개발 중 화면 공유 | 실제 운영 |

## 운영 전 확인 (개인정보)

실제 수강생 정보를 넣기 전에 반드시 선행할 것 — `CLAUDE.md`의 불변식과 같은 내용이다.

- **시범 로그인 정리** (역할을 골라 들어가는 현재 방식은 운영에 쓸 수 없다)
- 목업 데이터(가상 인물 17명)를 실제 데이터로 교체하는 시점의 권한·감사 로그 설계
- 개인정보가 담긴 화면은 **팀 공유 프리뷰로 내보내지 않는다** — 집계·통계만 공유한다
