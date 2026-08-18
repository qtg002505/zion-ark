import { looseIndexOf, normalizeForSearch } from "./text-match";
import type { LibraryMaterial, WorkspaceEntry } from "./types";

/**
 * Ask AI 검색 — 사이트 자료 기반 답변 + 출처 표시 (확정 결정 5).
 * 현재는 로컬 키워드 검색이다. 실제 AI 연결 시에도 검색 대상은
 * 공통 교육 영역(교안·에니어그램·공지·어록·시리즈)으로 한정하며,
 * 수강생 개인정보(차트·상담·출결 원문)는 어떤 경우에도 입력에 넣지 않는다.
 *
 * ## 2026-08-11에 고친 것 — 문장으로 물으면 빈손이던 문제
 *
 * 종전에는 `text.includes(질의)` 한 줄이라 **질문 전체가 자료에 글자 그대로 있어야만**
 * 걸렸다. 입력칸에는 "질문해 보세요"라고 적어 두고 정작 「인교섬 미션이 뭔가요」로는
 * 0건이 나왔다. 「천사 성령」처럼 두 낱말을 띄어 써도 마찬가지였다.
 *
 * 그래서 세 가지를 넣었다:
 * 1. **어절로 쪼갠다** — 낱말이 흩어져 있어도 찾는다
 * 2. **조사와 질문어를 뗀다** — 「인교섬이」·「뭔가요」가 검색을 막지 않게
 * 3. **점수를 매겨 정렬한다** — 종전에는 순서 없이 앞에서 여덟 개를 잘라
 *    가장 관련 있는 자료가 잘려 나갈 수 있었다
 * 4. **용어집을 색인에 넣었다** — 자료는 진작 있는데 검색이 훑지 않아
 *    「인교섬」을 물으면 0건이 나왔다. 뜻을 묻는 것이야말로 이 칸에 가장 많이
 *    들어올 질문이다. 정의는 원문 그대로 보여 준다 (불변식 5)
 *
 * 형태소 분석기를 들이지 않은 것은 의도한 선택이다 — 번들이 수백 KB 늘고, 현장에서
 * 휴대전화로 여는 사이트라 그 값이 크다. 조사 목록을 손으로 쥐는 편이 이 규모에 맞는다.
 */

export interface SearchHit {
  source: string; // 출처 표기 (예: "초등 교안 3강")
  sourceType: "교안" | "에니어그램" | "시리즈" | "자료실" | "공지" | "어록" | "용어";
  title: string;
  snippet: string;
  href: string;
  /** 관련도 — 높은 것부터 보여 준다 */
  score: number;
}

/**
 * 질문에 섞이는 말. 이런 낱말로는 자료를 찾을 수 없고, 그대로 두면
 * 「어떻게」가 든 문서가 전부 딸려 온다.
 */
const STOPWORDS = new Set([
  "뭐", "뭐야", "뭔가요", "무엇", "무엇인가요", "뭡니까", "어떻게", "어떤", "어디", "언제",
  "누구", "왜", "하나요", "합니까", "인가요", "입니까", "인지", "일까요", "할까요", "될까요",
  "알려줘", "알려주세요", "설명", "설명해줘", "정리해줘", "찾아줘", "보여줘", "궁금",
  "관련", "대해", "대하여", "관하여", "그리고", "그런데", "하는", "있는", "없는", "때",
  "것", "수", "좀", "제발", "please", "the", "and", "for", "with",
]);

/**
 * 조사·어미 — 긴 것부터 떼야 한다 (「에서는」을 「는」보다 먼저 봐야 제대로 떨어진다).
 * 뗀 뒤 남는 줄기가 두 글자보다 짧아지면 되돌린다 — 「하나」에서 「나」를 떼면 뜻이 사라진다.
 */
const PARTICLES = [
  "에서는", "에게는", "으로는", "이라는", "라는", "이라고", "라고", "에서", "에게", "한테",
  "으로", "까지", "부터", "보다", "처럼", "마다", "조차", "밖에", "이나", "이란", "께서",
  "는", "은", "이", "가", "을", "를", "의", "에", "와", "과", "도", "만", "로", "나", "께",
];

function stripParticle(token: string): string {
  if (token.length < 3) return token;
  for (const p of PARTICLES) {
    if (token.length - p.length >= 2 && token.endsWith(p)) return token.slice(0, -p.length);
  }
  return token;
}

/**
 * 질의를 찾을 수 있는 낱말들로 바꾼다. 남는 것이 없으면 빈 배열.
 *
 * `export`인 이유: 1차 조언 엔진(`advice-engine.ts`)이 같은 토크나이저를 쓴다.
 * 복사해 가면 **STOPWORDS와 조사 목록이 두 벌로 갈려** 한쪽만 고쳐지는 사고가 난다.
 * ⚠️ 점수 규칙(`scoreOf`)은 공유하지 않는다 — 거기 걸린 절반 미만 컷오프가 조언 쪽에서는
 * 결과를 0건으로 만든다. 자세한 것은 `advice-engine.ts`의 주석에 있다.
 */
export function tokenize(raw: string): string[] {
  const out: string[] = [];
  for (const piece of raw.toLowerCase().split(/[\s,./?!·:;()[\]"'—~]+/)) {
    if (!piece) continue;
    if (STOPWORDS.has(piece)) continue;
    const stem = stripParticle(piece);
    if (STOPWORDS.has(stem)) continue;
    // 한 글자로는 아무거나 걸린다. 영문·숫자는 짧아도 뜻이 있어 두 글자부터 받는다
    if (stem.length < 2) continue;
    if (!out.includes(stem)) out.push(stem);
  }
  return out;
}

/** 제목에 든 낱말은 본문에 든 것보다 무겁게 본다 */
const TITLE_WEIGHT = 3;
const BODY_WEIGHT = 1;

interface Scored {
  score: number;
  /** 몇 낱말이 맞았나 — 다 맞은 자료를 부분만 맞은 것보다 위에 둔다 */
  matched: number;
  /** 잘라 보여 줄 자리를 잡는 기준 낱말 */
  term: string;
}

function scoreOf(tokens: string[], title: string, body: string): Scored | null {
  /*
    ⚠️ **띄어쓰기를 무시하고 견준다** (2026-08-13 리드 지시).
    「천국 비밀」로 찾든 「천국비밀」로 찾든 같은 자료가 나와야 한다 — 원문 표기와
    검색어의 띄어쓰기가 같을 이유가 없다.
  */
  const lowTitle = normalizeForSearch(title);
  const lowBody = normalizeForSearch(body);
  let score = 0;
  let matched = 0;
  let term = "";
  for (const raw of tokens) {
    const t = normalizeForSearch(raw);
    if (!t) continue;
    const inTitle = lowTitle.includes(t);
    const inBody = lowBody.includes(t);
    if (!inTitle && !inBody) continue;
    matched++;
    score += (inTitle ? TITLE_WEIGHT : 0) + (inBody ? BODY_WEIGHT : 0);
    // 긴 낱말이 더 또렷한 단서다 — 잘라 보여 줄 자리를 그쪽으로 잡는다
    if (t.length > term.length) term = t;
  }
  if (matched === 0) return null;
  /**
   * 낱말을 여럿 던졌는데 하나만 스친 것은 대개 엉뚱한 자료다.
   * **절반 넘게** 맞은 것만 남긴다 — 낱말이 하나뿐인 질의는 그대로 통과한다.
   */
  if (tokens.length > 1 && matched * 2 < tokens.length) return null;
  return { score, matched, term };
}

function snippetOf(text: string, term: string, len = 90): string {
  /*
    자리는 **원문에서** 잡는다 — 공백을 지운 문자열의 위치는 원문과 어긋난다.
    `looseIndexOf`가 원문의 공백을 건너뛰며 시작 자리를 찾아 준다.
  */
  const idx = looseIndexOf(text, term);
  const start = Math.max(0, (idx === -1 ? 0 : idx) - 20);
  const cut = text.slice(start, start + len).replace(/\n+/g, " ");
  return (start > 0 ? "…" : "") + cut + (start + len < text.length ? "…" : "");
}

/** 검색 한 건의 재료 — 어디서 왔든 여기까지 오면 같은 방식으로 점수를 매긴다 */
export interface SearchDoc {
  source: string;
  sourceType: SearchHit["sourceType"];
  title: string;
  href: string;
  body: string;
}

/**
 * 빌드에 박힌 자료는 바뀌지 않는다 — 질의마다 문자열을 다시 잇지 않고 한 번만 만든다.
 * (스토어에서 오는 자료실·공지·어록은 바뀌므로 매번 만든다.)
 */
let staticDocs: SearchDoc[] | null = null;
/** 받아 오는 중에 또 물어도 **한 번만** 내려받게 붙잡아 두는 자리 */
let corpusLoading: Promise<SearchDoc[]> | null = null;

/**
 * 자료 뭉치를 **처음 검색할 때** 가져온다 (2026-08-18 — 번들 가르기).
 *
 * 원문(시리즈·어록·교안)이 2MB가 넘는데 종전에는 이 파일이 그것을 정적으로 안고 있었고,
 * 셸의 검색창이 이 파일을 부르니 **화면마다 전 자료를 지고 떴다.**
 * 지금은 `search-corpus`를 따로 두고 여기서 동적으로 부른다 — 검색을 쓰지 않는 사람은
 * 끝까지 받지 않고, 한 번 받은 뒤에는 종전처럼 만들어 둔 것을 다시 쓴다.
 */
async function loadStaticDocs(): Promise<SearchDoc[]> {
  if (staticDocs) return staticDocs;
  corpusLoading ??= import("./search-corpus").then((m) => {
    staticDocs = m.buildStaticDocs();
    return staticDocs;
  });
  return corpusLoading;
}

/** 결과 수 — 점수순으로 정렬한 뒤 자르므로 종전(8건, 순서 없음)보다 손해가 없다 */
const LIMIT = 10;

/**
 * `limit` 인자 (2026-08-13 카테고리 필터) — 호출 쪽이 전체 결과를 받아 **거른 뒤에**
 * 자를 수 있게 한다. 여기서 10건으로 잘라 버리면 「교안만 보기」가 0건이 되는 함정이
 * 생긴다(상위 10건이 전부 다른 갈래일 때). 기본값은 종전과 같아 하위 호환이다.
 *
 * ⚠️ **2026-08-18부터 비동기다.** 자료 뭉치를 첫 검색 때 받아 오기 때문이다(위 `loadStaticDocs`).
 * 부르는 쪽은 결과를 기다려야 하고, 기다리는 사이 또 물을 수 있으므로 **늦게 온 옛 답이
 * 새 답을 덮지 않게** 막아야 한다 (`AskAiBar`가 요청 번호로 거른다).
 */
export async function searchSite(
  rawQuery: string,
  materials: LibraryMaterial[],
  entries: WorkspaceEntry[],
  limit: number = LIMIT,
): Promise<SearchHit[]> {
  const tokens = tokenize(rawQuery);
  if (tokens.length === 0) return [];

  const docs: SearchDoc[] = [...(await loadStaticDocs())];

  for (const m of materials) {
    docs.push({ source: "자료실", sourceType: "자료실", title: m.title, href: "/library", body: m.body });
  }

  for (const e of entries) {
    if (e.kind === "quote") {
      docs.push({ source: "총회장님 어록", sourceType: "어록", title: e.title, href: "/quotes", body: e.body });
    } else if (e.kind === "notice_hq" || e.kind === "notice_tribe") {
      docs.push({
        source: e.kind === "notice_hq" ? "총회 공지" : "지파 공지",
        sourceType: "공지",
        title: e.title,
        href: "/notices",
        body: e.body,
      });
    }
  }

  const scored: (SearchHit & { matched: number })[] = [];
  for (const d of docs) {
    const s = scoreOf(tokens, d.title, d.body);
    if (!s) continue;
    scored.push({
      source: d.source,
      sourceType: d.sourceType,
      title: d.title,
      href: d.href,
      // 제목에만 걸렸으면 본문에서 잘라 봐야 엉뚱한 자리가 나온다 — 그럴 때는 제목을 보여 준다
      snippet: normalizeForSearch(d.body).includes(s.term) ? snippetOf(d.body, s.term) : d.title,
      score: s.score,
      matched: s.matched,
    });
  }

  /**
   * **다 맞은 것이 먼저, 부분만 맞은 것은 그 뒤.**
   * 점수만으로 줄을 세우면 낱말 하나가 제목에 든 엉뚱한 자료가, 두 낱말이 본문에 다
   * 들어 있는 제대로 된 자료를 제칠 수 있다. 「인교섬 미션」을 물었을 때 「미션」만
   * 스친 에니어그램 유형이 맨 위로 올라온 것이 그 경우였다.
   */
  scored.sort((a, b) => b.matched - a.matched || b.score - a.score);
  return scored.map(({ matched: _matched, ...hit }) => hit).slice(0, limit);
}
