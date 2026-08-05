# 반응형 · 크로스 브라우징 가이드

PC(Chrome/Edge) · Android(Chrome 웹뷰) · iOS(Safari 웹뷰)에서 같은 화면이 나오게 하는 규칙.
**공통 규칙은 `src/index.css`에 한 번만 두었다** — 화면 파일마다 되풀이하지 않는다.

## 기준 폭

| 구간 | 폭 | 레이아웃 |
| --- | --- | --- |
| 모바일 | ~767px | 사이드바는 드로어, 2단 구성은 1단으로 쌓임 |
| 태블릿 | 768~1023px | 2단 복원, 사이드바는 여전히 드로어 |
| PC | 1024px~ | 사이드바 272px 고정, 본문이 그 옆에 |

Tailwind 기준으로 `md`=768, `lg`=1024. **사이드바 전환 기준은 `lg`** — 태블릿에서 272px을
고정으로 두면 본문이 너무 좁아진다.

검증은 **320 / 375 / 768 / 1280** 네 폭에서 한다. 320은 구형 소형 단말 기준선이다.

## 텍스트가 세로로 찢어지는 문제

가장 흔한 증상이고, 원인은 거의 항상 **flex·grid 자식의 `min-width: auto`**다.
자식은 기본적으로 제 콘텐츠보다 작아지지 못한다. 그래서 긴 문장이 든 칸이 부모를 밀어내고,
옆 칸은 폭이 0에 가깝게 찌그러져 글자가 한 자씩 세로로 쌓인다.

`index.css`에서 전역으로 풀어 두었다:

```css
:where(.flex, .grid) > * { min-width: 0; }
```

`:where()`라 우선순위가 0이므로, 줄어들면 안 되는 요소는 `shrink-0`을 붙이면 그대로 이긴다.

**개별 화면에서 추가로 챙길 것**: 아이콘+텍스트를 나란히 둘 때 아이콘에는 `shrink-0`,
텍스트 쪽 컨테이너에는 `min-w-0`을 준다. 한 줄로 줄이려면 `truncate`.

## 줄바꿈

```css
word-break: keep-all;      /* 한글은 낱말 단위로 끊어야 읽기 좋다 */
overflow-wrap: anywhere;   /* 끊을 자리가 없는 긴 문자열은 강제로 끊는다 */
```

둘 다 있어야 한다. `keep-all`만 두면 공백 없는 긴 URL이 영역을 뚫고 나가고,
`anywhere`만 두면 한글이 아무 데서나 끊겨 읽기 나빠진다.

## iOS에서만 생기는 문제

| 증상 | 원인 | 처리 |
| --- | --- | --- |
| 입력칸을 누르면 화면이 확대되며 레이아웃이 틀어짐 | Safari는 입력 글자가 16px 미만이면 자동 확대한다 | 터치 기기에서 입력 요소만 16px로 (`@media (hover: none) and (pointer: coarse)`) |
| 가로로 돌리면 글자만 커지며 폭이 어긋남 | iOS의 글자 자동 확대 | `-webkit-text-size-adjust: 100%` |
| 목록이 화면 밖으로 넘침 | `vh`를 주소창까지 포함해 계산한다 | `dvh` 우선 사용 (`.doc-list-scroll`), 미지원 시 `vh`로 되돌아감 |
| 노치에 내용이 가림 | 가로 모드 안전영역 | `env(safe-area-inset-*)` — body와 드로어 사이드바에 적용 |
| 스크롤이 뻑뻑함 | 관성 스크롤 미적용 | `-webkit-overflow-scrolling: touch` |

**입력 글자 크기 주의**: 디자인상 12~13px이지만 터치 기기에서는 16px로 커진다.
확대되어 레이아웃이 깨지는 쪽이 훨씬 나쁘기 때문에 감수한 선택이다.

## Android에서 챙긴 것

누를 때 생기는 회색 사각형을 없앴다 (`-webkit-tap-highlight-color: transparent`).
그 외에는 Chrome 기반이라 PC와 거의 같게 렌더링된다.

## 넘칠 수 있는 것들

페이지 전체가 옆으로 밀리지 않도록 `body`에 `overflow-x: hidden`을 두었지만,
이건 최후 방어일 뿐이고 **넘치는 요소는 그 자리에서 처리한다**.

- **표**: 표만 가로로 넘긴다 — 감싸는 `div`에 `overflow-x-auto`, 표에 `min-w-[560px]`
- **탭 줄**: `overflow-x-auto` + 각 버튼에 `shrink-0 whitespace-nowrap`
- **이미지·아이콘**: 전역에서 `max-width: 100%` 처리됨

## 화면을 만들거나 고친 뒤 확인

```js
// 가로 넘침이 없어야 한다
document.body.scrollWidth === document.documentElement.clientWidth
```

세로 찢김은 이렇게 잡는다 — 폭이 아주 좁은데 높이가 큰 텍스트 요소를 찾는다:

```js
[...document.querySelectorAll('main p, main span, main li')]
  .filter(el => { const r = el.getBoundingClientRect();
                  return r.width > 0 && r.width < 40 && r.height > 80; })
```

극단적인 입력으로도 시험해 본다 — **공백 없는 긴 URL**과 **띄어쓰기 없는 긴 한글 문장**을
넣었을 때 영역 안에서 줄바꿈되면 통과다.

실기기가 없다면 브라우저 개발자도구의 기기 시뮬레이션으로 320·375 폭을 확인한다.
다만 **iOS 특유 동작(입력 확대·`vh`·노치)은 시뮬레이션으로 재현되지 않으니**,
가능하면 실기기에서 한 번 열어 본다.
