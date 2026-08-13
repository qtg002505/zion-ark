---
name: zion-ark-web
description: 시온 아크(ZION ARK) 웹 프로토타입 저장소(scj)의 작업 절차. 원문 자료(교안·시리즈·어록) 이관, 화면·메뉴 추가, 디자인 토큰 수정, 팀 공유 프리뷰 배포를 다룬다. 이 저장소에서 화면을 만들거나 고칠 때, 공유자료 폴더의 자료를 사이트에 넣을 때, 프리뷰 링크를 갱신할 때 반드시 사용할 것. "시온아크", "강사 전도사 대시보드", "교안 이관", "어록", "프리뷰 공유" 언급 시에도 먼저 읽는다. 원 운영 저장소(vinext+D1) 작업은 `zion-ark-dev` 스킬을 쓴다.
---

# 시온 아크 웹 프로토타입 — 작업 절차

이 저장소(`C:\Users\user\Desktop\scj`)는 강사·전도사가 쓰는 운영 대시보드의 **프런트엔드
프로토타입**이다. 규칙의 원문은 저장소 `CLAUDE.md`이고, 이 스킬은 **실제로 해 보고 알아낸
절차와 함정**을 작업 유형별로 정리한 것이다. 충돌하면 `CLAUDE.md`가 우선한다.

## 세션 시작 — 이 순서로 읽고 바로 시작한다

1. **`docs/HANDOFF.md`** — 지금 상태·다음 할 일·막힌 것. **이거 하나면 시작할 수 있다**
2. `git log --oneline -5` / `git status --short`
3. 필요할 때만: `docs/HISTORY.md`(지난 기록 — "왜 이렇게 됐나"를 찾을 때만) ·
   `docs/decisions/OPEN_QUESTIONS.md`(리드 답 대기) · `docs/TEAMWORK.md`(파트 분담)

⚠️ **처음부터 여러 문서를 통째로 읽지 않는다.** HANDOFF가 78KB까지 자라 세션마다 토큰을
낭비하던 것을 2026-08-11에 갈랐다 — 같은 실수를 되풀이하지 않는다. 필요한 파일만 열고,
큰 파일은 `Grep`으로 필요한 대목만 본다.

개발 셸은 Windows PowerShell (`npm.cmd`, `npx.cmd`). 미리보기는 Bash로 서버를 띄우지 말고
`.claude/launch.json`의 `zion-ark-dev`를 쓴다 (`autoPort: true` — 다른 세션이 5173을 쓰고
있어도 알아서 다른 포트로 뜬다).

## 셸 함정 — 이것 때문에 여러 번 막혔다

**PowerShell에 한글이 든 스크립트를 넘기지 않는다.** PowerShell 5.1이 한글을 ANSI로 읽어
`sed`·정규식·문자열이 깨지고 파서 오류가 난다. 한글이 섞인 처리는 **Node 스크립트(.mjs)로
작성해 `node`로 실행**한다. 파일 복사 스크립트를 PowerShell로 짰다가 전부 깨져 Node로 다시
쓴 적이 있고, `-replace`로 소스 파일을 고쳤다가 **파일 전체 한글이 깨져 다시 쓴 적도 있다.**

**커밋 메시지에 큰따옴표를 넣지 않는다.** here-string(`@'…'@`) 안이라도 `"…"`가 있으면
PowerShell이 파싱을 깨뜨려 `pathspec … did not match` 오류가 난다. 인용이 필요하면
`「…」`를 쓴다. (이 함정으로 커밋이 세 번 실패했다.)

**Bash 도구는 작업 디렉터리가 초기화된다.** `cd`가 다음 호출로 이어지지 않으니
`cd <절대경로> && ...` 형태로 매번 지정한다.

## 작업 유형별 절차

### 1. 원문 자료 이관 (교안·시리즈·어록)

원본은 `공유자료/`에 있다. **원본은 고치지 않는다** — 교리 콘텐츠는 원문 그대로 옮기고
재작성하지 않는 것이 불변식이다.

절차:
1. 원본 구조를 먼저 확인한다 (`##` 헤딩인지 `[핵심]` 형태인지 — 소주제 접기 경계가 여기서 갈린다)
2. Node 스크립트로 `src/content/` 아래에 복사·변환한다
3. `import.meta.glob("./경로/*.md", { query: "?raw", eager: true })` 로 빌드 타임에 싣는다
4. 화면에서 `splitSections()`으로 소주제를 나눠 `Accordion`으로 낸다
5. `src/lib/search.ts`의 검색 대상에 추가한다

**파일명 함정**: 파일명에 `~`가 있으면 Vite dev 서버가 403을 낸다. `[` `]` `#`도 함께 정리한다
(복사 스크립트에서 `~`→`-`로 바꾼다). 이걸 모르면 화면이 통째로 비어 보이는데 원인을 찾기 어렵다.

**docx 원본**은 zip이므로 `word/document.xml`을 꺼내 `<w:p>` 단위로 텍스트를 뽑는다
(`<w:numPr>`가 있으면 불릿). 외부 변환 패키지를 새로 깔지 않는다.

**어록처럼 사람이 옮겨 적은 자료**는 오탈자가 섞여 있다. 전량을 눈으로 훑어 명백한 오탈자만
고치고, **뜻이 달라질 수 있는 구어·방언 표현은 손대지 않는다**. 요약·압축은 하지 않는다.
수정은 사이트 탑재본에만 적용하고 `공유자료/` 원본은 그대로 둔다.

### 2. 화면·메뉴 추가

1. `src/pages/`에 컴포넌트 → `src/App.tsx`에 라우트 → `src/shell/nav.ts`에 메뉴
2. 권한 분기는 `src/lib/permissions.ts`의 함수만 쓴다 (컴포넌트에서 `roleCode` 직접 비교 금지)
3. 색은 `zion-*`·`ink`·`surface` 토큰만 쓴다
4. 본문이 길면 `Accordion`으로 접는다
5. 좁은 화면을 함께 본다 — 2단 구성은 `max-md:grid-cols-1`, 탭 줄은 `overflow-x-auto`,
   표는 표만 가로 스크롤(`min-w-[560px]`)

**이미 만들어 둔 것을 먼저 찾는다** — 같은 것을 두 벌 만들면 한쪽만 고쳐지는 일이 반드시 생긴다:
`Accordion` · `AnchoredPopover`(칸 옆에서 열리는 팝오버) · `StudentDetailModal` ·
`MediaLinks`(PPT·영상) · `FavoriteButton` · `PromptBox` · `common.tsx`(PageHeader·Card·StatTile)

**화면을 페이지와 팝업 양쪽에서 써야 하면** 복제하지 말고 props로 가른다 —
`StudentDetailPage`가 `studentKey`·`embedded`를 받는 방식이 본보기다.

⚠️ **`useEffect`를 배열·객체 정체성에 걸지 않는다.** 스토어를 구독하는 화면은 렌더마다 새
배열을 받으므로 열림 상태가 매번 초기화된다. `Accordion`이 도움됨을 누를 때마다 접히던 것이
이 때문이었다 — id 목록을 문자열로 이어 붙여(`items.map(i => i.id).join("|")`) 그것에 건다.

⚠️ **경로를 없앨 때는 지우지 말고 리다이렉트한다** (`<Navigate to=… replace />`).
북마크와 옛 링크가 죽는다. `/students` → `/students-dashboard`가 그 예다.

### 3. 팀 공유 프리뷰 배포

**리드는 화면 작업을 마칠 때마다 프리뷰 링크를 갱신해 보여 준다** (2026-08-10 요청).

```
npm.cmd run build:preview
```

`preview/zion-ark-preview.html`(자체 포함 단일 HTML)이 만들어진다. 이걸 아티팩트로 발행하되
**같은 파일 경로로 다시 발행해야 링크가 유지된다** — 팀이 쓰던 주소가 바뀌면 안 된다.
주소: `https://claude.ai/code/artifact/97c2d451-7903-4c8f-8ede-09b5d72c7d25`
(`Artifact` 도구에 `url`로 이 주소를 넘긴다.)

⚠️ "이 세션이 최신 버전을 못 봤다"며 거부되면 **`force: true`**를 쓴다 — 이 아티팩트는 손으로
고치는 문서가 아니라 소스에서 나온 빌드 산출물이라 덮어써도 잃을 것이 없다.
⚠️ **음원·대용량 자산은 이 단일 HTML에 안 들어간다.** 아티팩트에서 음악이 안 나오는 것은
결함이 아니다 — **음악 확인은 GitHub Pages 링크에서** 한다고 함께 알린다.

두 가지가 이미 해결돼 있으니 건드리지 않는다:
- 정적 호스팅에는 서버 라우팅이 없다 → `.env.preview`의 `VITE_ROUTER=hash`
- 감싸는 문서에 `<meta charset>`이 없어 한글이 깨진다 → 스크립트를 `\uXXXX` ASCII로 이스케이프해
  인라인한다. `data:` URI로 싣는 방법도 있지만 **공개 공유가 막히므로 쓰지 않는다**

로컬 확인은 `.claude/launch.json`의 `zion-ark-share-preview`(4173).

### 4. 디자인 조정

시안은 `Design/`(Next.js+shadcn 템플릿, 참조용·git 제외). 스택이 달라 컴포넌트를 그대로 쓰지
않고 **토큰과 레이아웃 패턴만** 가져온다. 팔레트는 `src/index.css`의 `@theme` 한 곳에서 고친다.

**색을 바꾸면 대비를 실측한다.** ⚠️ `getComputedStyle`은 `oklch(...)` 문자열을 그대로 돌려줘
숫자를 rgb로 잘못 읽는다 — **캔버스에 칠해 픽셀을 읽어야** 정확하다. 이걸 모르고 "본문 대비
1.01"이라는 엉뚱한 값을 얻은 적이 있다. 본문·버튼·뱃지 조합이 WCAG AA(4.5) 이상인지 본다.

```js
const cv = document.createElement('canvas'); cv.width = cv.height = 1;
const ctx = cv.getContext('2d', { willReadFrequently: true });
const px = c => { ctx.fillStyle = '#fff'; ctx.fillRect(0,0,1,1); ctx.fillStyle = c;
  ctx.fillRect(0,0,1,1); const d = ctx.getImageData(0,0,1,1).data; return [d[0],d[1],d[2]]; };
```

2026-08-10 네이비 전환은 **`@theme` 한 곳 수정으로 끝났다** — 화면 파일을 한 곳도 안 고쳤다.
색 하드코딩을 막아 온 규칙이 값을 한 셈이니 앞으로도 화면에 색을 직접 쓰지 않는다.

⚠️ **반투명 배경을 흰색 위에 칠해 재면 어두운 화면에서 값이 엉뚱하게 나온다.** 위 `px()`는
`#fff`를 깔고 색을 얹는데, `bg-zion-50/60` 같은 반투명이 섞이면 실제로는 어두운 바탕 위에
얹히는 색을 밝게 계산한다. 2026-08-11에 이것 때문에 "본문 대비 2.42, 어록 1.03" 같은
가짜 미달이 무더기로 나왔다. **바탕을 `body` 배경으로 깔고, 조상 배경을 아래에서 위로
차례로 얹어** 실제 보이는 바탕을 만든 뒤 재면 맞는다.

⚠️ **재기 전에 전환(transition)을 끈다.** 브라우저 패널이 화면에 없으면 프레임을 안 그려
**전환이 시작값에 멈춘다** — 테마를 다크로 바꿔도 옛 밝은 색이 그대로 읽혀 "사이드바 1.18"
같은 가짜 미달이 라우트마다 따라다닌다(2026-08-11에 한참 헤맸다). 값이 `oklab(...)` 형태로
나오면 전환 중이라는 신호다. 재기 전에 한 줄 깔아 둔다:
`*,*::before,*::after{transition:none !important;animation:none !important}`

⚠️ **`innerWidth`가 0이면 레이아웃이 뭉개진 상태다.** 패널이 안 떠 있으면 그렇게 된다 —
`resize_window`로 폭을 정해 주면 정상 레이아웃으로 잰다. 이걸 모르고 재면 화면에 안 뜬
요소가 통째로 빠져 "미달 0"으로 보인다.

⚠️ **팝업·팝오버·드로어는 라우트를 훑는 것만으로 안 잡힌다.** 수강생 상세 팝업 머리가
`bg-white/95`라 다크에서 흰 띠로 떠 있던 것을 라우트 훑기로는 못 봤다 — 열어서 재야 한다.
`/students/:key`·`/series/:id`처럼 **인자가 붙는 경로도 목록에 넣는다**.

### 4-1. 다크 모드 (2026-08-11에 넣었다)

`[data-theme="dark"]`가 **팔레트 변수를 갈아 끼운다.** 화면 파일에 `dark:`를 뿌리지 않는다.

⚠️ **토큰 하나가 두 가지 일을 겸하는 것이 유일한 함정이다.** `text-zion-700`은 밝아져야 하고
`bg-zion-700`은 어두워야 하는데 변수는 하나다. 그래서 **변수는 글자 쪽에 맞춰 뒤집고, 진한
면으로 쓰는 유틸리티만 `@layer` 밖 규칙으로 되돌려 놓았다** (레이어 밖이라 항상 이긴다).
**진한 배경은 그 목록 안에서만 고른다** — 목록 밖 단계를 배경으로 쓰면 다크에서 하얗게 뜬다.

새 화면을 만들었으면 **어두운 화면에서 밝게 뜨는 면이 없는지 훑는다.** 전 라우트를 돌며
배경 휘도가 0.45를 넘는 요소를 모으면 몇 초 만에 잡힌다 (`bg-gold-500`은 의도한 것이라 뺀다).

### 5. 파일·자산 다루기 (음원·문서)

- 원본은 폴더에 두고 **Node 스크립트로 `public/` 아래에 복사**한다 (`scripts/copy-music.mjs`가 본보기)
- ⚠️ 파일명의 `[` `]` `#` `~`를 걷어낸다 — 남으면 Vite dev 서버가 **403**을 내 조용히 실패한다
- ⚠️ 경로에 `import.meta.env.BASE_URL`을 붙인다. Pages는 하위 경로로 서비스되므로
  `/music/…`처럼 적으면 **배포본에서만 404**가 난다
- ⚠️ **원본 폴더를 함께 커밋하지 않는다** — 같은 파일이 두 벌 들어간다. `.gitignore`에 넣는다
- 엑셀(xlsx)은 외부 패키지 없이 다룬다 (`src/lib/xlsx.ts`) — zip + XML이고 읽기는 브라우저
  내장 `DecompressionStream`을 쓴다. 번들을 수백 KB 불리지 않기 위한 선택이다

## 검증 — 핸드오프 전

```
npx.cmd tsc -b --noEmit
npm.cmd run build
```

화면을 건드렸으면 미리보기에서 직접 열어 보고:
- **콘솔 오류 0 — 반드시 새 탭에서 확인한다.** ⚠️ 파일을 크게 고치거나 지우면 개발 서버가
  HMR 오류(`Failed to reload …` · `useStore는 StoreProvider 안에서만 사용` · 404/500)를
  남기는데, **이건 결함이 아니라 잔재다.** 새로고침만으로는 콘솔 기록이 남아 계속 보이므로
  `tabs_create`로 **새 탭을 열어** 확인한다. 이 세션에서만 네 번 헷갈렸다
- 모바일 폭(375)에서 가로 넘침 0 —
  `document.body.scrollWidth === document.documentElement.clientWidth`
- **외부 사이트 임베드 가능 여부는 개발용 인앱 브라우저를 믿지 않는다.** 인앱 브라우저는
  `X-Frame-Options`를 무시해 "표시된다"고 잘못 판단하게 만든다. 실제 브라우저에서 확인한다

## GitHub 작업 함정 (2026-08-07~08에 실제로 막힌 것)

저장소는 **`qtg002505/zion-ark`** (public). 팀 공유 링크는 GitHub Pages가 `main` push마다
자동 갱신한다 (`.github/workflows/deploy-pages.yml`).

- **`gh` CLI가 없다.** 이슈·라벨·설정은 브라우저(claude-in-chrome)로 해야 한다
- **push는 된다.** 자격 증명이 저장돼 있어 에이전트가 `git push`할 수 있다.
  처음 한 번만 리드가 로그인 창을 승인했다
- ⚠️ **GitHub Copilot 패널이 오른쪽 사이드바를 통째로 덮는다.** 이슈의 Labels·Assignees
  톱니바퀴를 누르려던 클릭이 전부 Copilot에 먹힌다. **먼저 "Close chat"을 눌러 닫고** 시작한다.
  이것 때문에 라벨 붙이기가 여러 번 실패했다
- ⚠️ **스크린샷 좌표가 CSS 좌표와 다를 수 있다.** 스크린샷 1425px인데 `innerWidth`가 1745px인
  상태가 있었다 — 좌표 클릭이 엉뚱한 곳에 떨어진다. `find`로 ref를 얻어 클릭하거나,
  `javascript_tool`로 `innerWidth`를 확인해 배율을 먼저 재고 쓴다
- 라벨 생성은 **URL 파라미터로 안 된다** (`/labels/new?name=…`는 이슈 필터로 해석된다).
  New label 폼을 열어 `form_input`으로 채운다. **Escape는 폼을 비우므로** 쓰지 말고
  「Create label」 버튼을 직접 누른다
- **PR 머지 권한**: 파트 파일만 고친 PR은 팀원이 직접 머지한다. `CODEOWNERS`에 걸린
  공유 파일을 건드리면 자동으로 리드 승인 대기가 된다 (`docs/TEAMWORK.md`)

### 6. 브라우저 최신 기능을 붙일 때 (2026-08-11에 겪은 것)

**「붙였는데 조용히 안 도는」 자리를 먼저 의심한다.** 눈으로 확인이 어려운 기능일수록
"코드에 있으니 되겠지"로 넘어가기 쉽다. **동작 자체를 세어서 확인한다.**

- ⚠️ **`<Link viewTransition>`은 데이터 라우터에서만 돈다.** 이 앱은 `<BrowserRouter>` +
  `<Routes>`라 **prop이 무시된다** — 22곳에 붙여 놓고 `document.startViewTransition`을
  가로채 세어 보니 **0회**였다. 그래서 `src/components/TransitionLink.tsx`로 클릭을 감쌌다.
  화면 링크는 이제 **거기서 가져온다**(`react-router-dom` 직접 import 금지)

  ```js
  // 정말 도는지 세어 본다
  let n = 0; const o = document.startViewTransition.bind(document);
  document.startViewTransition = (cb) => { n++; return o(cb); };
  ```

- ⚠️ **`content-visibility: auto`는 `contain: paint`를 함께 건다** — 그 안의
  `position: fixed` 모달이 **화면이 아니라 그 요소 기준으로 놓인다.** 모달을 품은
  목록에는 켜지 않는다
- ⚠️ **`contain-intrinsic-size`가 실제와 어긋나면 문서 길이가 통째로 틀어진다.**
  140px로 잡았다가 어록 화면이 7,159px → **15,525px로 부풀었다.** 반드시 견줘 본다:
  클래스를 뗐다 붙이며 `document.documentElement.scrollHeight`를 비교하면 바로 보인다
- **효과가 없는 곳에는 켜지 않는다.** 소주제 5~7개짜리 화면에도 켜 봤지만 얻는 것 없이
  어긋남만 생겨 도로 껐다. **켜기 전에 `scrollHeight`부터 재서 대상을 고른다**

### 7. 외부 API를 붙일 때 (카카오맵 — 2026-08-11)

- ⚠️ **개발용 인앱 브라우저에서는 외부 API 검증이 안 된다.** `dapi.kakao.com` 요청이
  **아예 나가지 않아** 우리 코드 문제로 오해하기 쉽다. **실제 브라우저(claude-in-chrome)로
  열어야** 진짜 응답(503 등)이 보인다
- ⚠️ **카카오는 키·도메인이 다 맞아도 「제품 설정 > 카카오맵」이 OFF면 503**을 준다.
  콘솔에서 켜는 단계가 따로 있다. 활성화 창의 **무료 쿼터 배정은 되돌릴 수 없으니**
  리드에게 확인받고 누른다
- 키는 `.env`(git 제외)에, 등록 도메인은 `localhost:5173`·`localhost:4173`·Pages 주소.
  **개발 서버가 autoPort로 다른 포트에 뜨면 그 포트도 등록해야 한다**
- 지도 핀이 여럿이면 **고정 확대 수준을 쓰지 말고 `setBounds`로 전부 담는다** —
  가까운 두 곳은 핀이 겹쳐 이름이 잘리고, 멀어지면 화면 밖으로 나간다

### 8. 화면 위에 띄우는 것 (모달·팝오버) — 2026-08-13

⚠️ **`fixed inset-0` + `z-50`으로는 부족하다.** 조상이 쌓임 맥락을 만들면 그 안에서만 논다.
이 앱의 `main`은 `view-transition-name` 때문에 맥락을 만들므로, **`main` 안에서 뜨는 모달은
헤더(`z-20`)에 눌린다.** 실제로 수강생 상세 팝업 머리가 잘렸다(2026-08-13).
**숫자를 올려도 안 고쳐진다** — `src/components/Portal`로 감싸 맥락 밖으로 꺼낸다.

같은 뿌리에서 나오는 증상 셋을 한꺼번에 막아 준다:
`view-transition-name` · `content-visibility`의 `contain: paint` · 조상의 `transform`.

⚠️ **모달은 라우트 훑기로 검증되지 않는다.** 열어 봐야 한다. 확인법:

```js
// 헤더와 겹치는 자리에서 실제로 무엇이 맨 위인가
const h = document.querySelector('header').getBoundingClientRect();
const el = document.elementFromPoint(640, h.top + h.height / 2);
overlay.contains(el)   // 모달이 위여야 true
```

## 브라우저로 검증하는 요령 (토큰을 아끼는 길이기도 하다)

⚠️ **미리보기 패널이 화면에 안 보이면 그 탭은 그림을 그리지 않는다.** 그래서
`requestAnimationFrame`이 **영영 안 불리고**, `setTimeout`도 1초 단위로 늘어진다.
`await`가 든 반복문이 30초 제한에 걸려 "페이지가 멈췄다"고 오해하기 쉽다 —
2026-08-11에 세 번 헛짚었다. 대처는 셋이다:

- 시간 측정·레이아웃 확인은 **`resize_window`를 한 번 호출해** 뷰포트를 살린 뒤에 한다
  (`innerHeight`가 0으로 나오면 그 측정값은 전부 못 믿는다)
- rAF를 쓰지 말고 **동기 반복**으로 잰다 (React가 렌더를 묶어 주므로 순수 계산 비용이 나온다)
- 스크린샷은 패널이 숨겨져 있으면 실패한다 — `javascript_tool`로 필요한 값만 뽑는다


스크린샷은 **브라우저 패널이 열려 있지 않으면 실패한다.** 대신 `javascript_tool`로 **필요한
값만 뽑아 확인**한다 — 화면을 통째로 읽는 것보다 정확하고 훨씬 싸다.

```js
// 한 번에 여러 가지를 재서 왕복을 줄인다
JSON.stringify({
  overflow: document.body.scrollWidth === document.documentElement.clientWidth,
  hasX: document.querySelector('main').textContent.includes('찾는 말'),
  rows: document.querySelectorAll('main tbody tr').length,
})
```

- 로그인은 `localStorage.setItem('zion_ark_session', …)`로 건너뛴다 (역할을 바꿔 볼 때도)
- `read_page`/`get_page_text`는 결과가 크다 — **꼭 필요할 때만** 쓰고 `max_chars`를 줄인다
- 저장 결과는 화면이 아니라 `localStorage`에서 확인하는 편이 확실하다

## 자동화 브라우저에서 스크롤 검증 시 주의

`window.scrollTo()`가 **scroll 이벤트를 안 낼 때가 있다** — 스크롤 기반 UI(맨 위로 버튼 등)가
동작하지 않는 것처럼 보인다. 결함이 아니라 환경 문제다.
`window.dispatchEvent(new Event('scroll'))`로 직접 이벤트를 보내 확인한다.
또 **부드러운 스크롤은 애니메이션이 끝나기 전에 읽으면 옛 위치가 나온다** — 1.5초쯤 기다린다.
페이지가 짧아 최대 스크롤이 임계값(300px)보다 작으면 버튼은 원래 안 뜬다. 긴 화면에서 본다.

## 리드에게 물어야 하는 것

이미 정해진 것(권한 확정값, 시범 로그인 유지, 새 탭 결정)은 다시 묻지 않는다. 반면 아래는
사람이 정해야 한다 — 만나면 멈추고 묻는다.

- 원문이 두 벌인 자료의 기준 소스 (예: 예그행 마태 MD vs 교수안)
- 수강생 실데이터 투입 — 시범 로그인 정리가 선행 조건이다
- 외부 매체 중계(프록시) — 상대 매체 약관 확인이 선행이다
- 데이터 계약(역할 코드·카테고리·kind·출결 어휘) 변경이 필요해 보일 때

## 마무리 — 매번 이 순서로 끝낸다

1. `npx.cmd tsc -b --noEmit` → `npm.cmd run build`
2. **새 탭**에서 콘솔 0 · 375px 넘침 0
3. 커밋 → push (커밋 메시지에 **큰따옴표 금지**)
4. `npm.cmd run build:preview` → 아티팩트 **같은 주소로** 재발행 (`force: true`)
5. 문서 갱신 — **`docs/HANDOFF.md`는 "지금 상태"만 고친다.**
   지난 작업 기록은 `docs/HISTORY.md`에 덧붙이고, **새로 밟은 함정은 이 스킬에 적는다.**
   ⚠️ HANDOFF에 세션 기록을 쌓지 않는다 — 그래서 78KB까지 자랐다(2026-08-11에 갈랐다)
6. 화면·권한 구조가 바뀌었으면 `docs/ARCHITECTURE.md`도

리드에게 보고할 때는 **무엇을 했는지 · 확인한 것 · 막힌 것 · 다음 선택지**를 짧게 적고
프리뷰 링크를 함께 준다. 어투는 존댓말(`CLAUDE.md`).
