/**
 * 성구 표기를 찾아낸다 — `고전10:13` · `요일 5:2~4` · `계 22:18~19` · `창세기 1장 1절`.
 *
 * ## 왜 사전이 필요한가
 *
 * 종전에는 `AdvicePanel.tsx`에 `/^[가-힣]{1,2}\s?\d+\s*[:：]/` 한 줄이 있었다. 표시 전용이라
 * 그것으로 충분했지만, **책 이름을 모르니 오탐과 누락을 함께 안고 있었다** — 세 글자 약칭
 * (`고전`은 되지만 `요일 5:2~4`의 절 범위는 못 봄)을 놓치고, 「자유 1:2」의 「유」를 유다서로
 * 잡을 위험이 있었다. 사전을 두면 **책 이름이 사전에 있어야만 잡히므로** 전화번호·시각·날짜가
 * 저절로 걸러진다.
 *
 * ## 지키는 것
 *
 * - **원문 표기를 고치지 않는다**(불변식 5). 화면에는 `raw`(적힌 그대로)를 쓰고, 같은 성구를
 *   다르게 적은 것을 한 줄로 묶을 때만 `key`(정규 키)를 쓴다
 * - **정규식을 손으로 적지 않는다.** 사전에서 파생 생성하므로 책을 더하면 정규식이 따라온다
 *   (`Compose.tsx`의 `SOURCE_NAMES`가 `COMPOSE_SOURCES`에서 나오는 것과 같은 원리)
 * - ⚠️ **매칭 점수에 쓰지 않는다.** 종전 주석의 원칙 그대로다 — 성구 본문 낱말이 관찰문·관심사와
 *   겹치는 일은 드물고, 겹쳐도 근거가 약하다. 여기서 하는 일은 **찾아서 모아 보여 주는 것**이다
 */

export interface BibleBook {
  /** 집계용 정규 약칭 */
  id: string;
  full: string;
  /** 화면·원문에 쓰이는 표기 전부 */
  aliases: string[];
  /** 장 수 — 넘는 숫자는 성구가 아니다 */
  chapters: number;
}

/** 개역개정 66권. `aliases`에는 약칭과 정식 이름을 함께 담는다 */
export const BIBLE_BOOKS: BibleBook[] = [
  { id: "창", full: "창세기", aliases: ["창세기", "창"], chapters: 50 },
  { id: "출", full: "출애굽기", aliases: ["출애굽기", "출"], chapters: 40 },
  { id: "레", full: "레위기", aliases: ["레위기", "레"], chapters: 27 },
  { id: "민", full: "민수기", aliases: ["민수기", "민"], chapters: 36 },
  { id: "신", full: "신명기", aliases: ["신명기", "신"], chapters: 34 },
  { id: "수", full: "여호수아", aliases: ["여호수아", "수"], chapters: 24 },
  { id: "삿", full: "사사기", aliases: ["사사기", "삿"], chapters: 21 },
  { id: "룻", full: "룻기", aliases: ["룻기", "룻"], chapters: 4 },
  { id: "삼상", full: "사무엘상", aliases: ["사무엘상", "삼상"], chapters: 31 },
  { id: "삼하", full: "사무엘하", aliases: ["사무엘하", "삼하"], chapters: 24 },
  { id: "왕상", full: "열왕기상", aliases: ["열왕기상", "왕상"], chapters: 22 },
  { id: "왕하", full: "열왕기하", aliases: ["열왕기하", "왕하"], chapters: 25 },
  { id: "대상", full: "역대상", aliases: ["역대상", "대상"], chapters: 29 },
  { id: "대하", full: "역대하", aliases: ["역대하", "대하"], chapters: 36 },
  { id: "스", full: "에스라", aliases: ["에스라", "스"], chapters: 10 },
  { id: "느", full: "느헤미야", aliases: ["느헤미야", "느"], chapters: 13 },
  { id: "에", full: "에스더", aliases: ["에스더", "에"], chapters: 10 },
  { id: "욥", full: "욥기", aliases: ["욥기", "욥"], chapters: 42 },
  { id: "시", full: "시편", aliases: ["시편", "시"], chapters: 150 },
  { id: "잠", full: "잠언", aliases: ["잠언", "잠"], chapters: 31 },
  { id: "전", full: "전도서", aliases: ["전도서", "전"], chapters: 12 },
  { id: "아", full: "아가", aliases: ["아가서", "아가", "아"], chapters: 8 },
  { id: "사", full: "이사야", aliases: ["이사야", "사"], chapters: 66 },
  { id: "렘", full: "예레미야", aliases: ["예레미야", "렘"], chapters: 52 },
  { id: "애", full: "예레미야애가", aliases: ["예레미야애가", "애가", "애"], chapters: 5 },
  { id: "겔", full: "에스겔", aliases: ["에스겔", "겔"], chapters: 48 },
  { id: "단", full: "다니엘", aliases: ["다니엘", "단"], chapters: 12 },
  { id: "호", full: "호세아", aliases: ["호세아", "호"], chapters: 14 },
  { id: "욜", full: "요엘", aliases: ["요엘", "욜"], chapters: 3 },
  { id: "암", full: "아모스", aliases: ["아모스", "암"], chapters: 9 },
  { id: "옵", full: "오바댜", aliases: ["오바댜", "옵"], chapters: 1 },
  { id: "욘", full: "요나", aliases: ["요나", "욘"], chapters: 4 },
  { id: "미", full: "미가", aliases: ["미가", "미"], chapters: 7 },
  { id: "나", full: "나훔", aliases: ["나훔", "나"], chapters: 3 },
  { id: "합", full: "하박국", aliases: ["하박국", "합"], chapters: 3 },
  { id: "습", full: "스바냐", aliases: ["스바냐", "습"], chapters: 3 },
  { id: "학", full: "학개", aliases: ["학개", "학"], chapters: 2 },
  { id: "슥", full: "스가랴", aliases: ["스가랴", "슥"], chapters: 14 },
  { id: "말", full: "말라기", aliases: ["말라기", "말"], chapters: 4 },

  { id: "마", full: "마태복음", aliases: ["마태복음", "마태", "마"], chapters: 28 },
  { id: "막", full: "마가복음", aliases: ["마가복음", "마가", "막"], chapters: 16 },
  { id: "눅", full: "누가복음", aliases: ["누가복음", "누가", "눅"], chapters: 24 },
  { id: "요", full: "요한복음", aliases: ["요한복음", "요"], chapters: 21 },
  { id: "행", full: "사도행전", aliases: ["사도행전", "행"], chapters: 28 },
  { id: "롬", full: "로마서", aliases: ["로마서", "롬"], chapters: 16 },
  { id: "고전", full: "고린도전서", aliases: ["고린도전서", "고린도전", "고전"], chapters: 16 },
  { id: "고후", full: "고린도후서", aliases: ["고린도후서", "고린도후", "고후"], chapters: 13 },
  { id: "갈", full: "갈라디아서", aliases: ["갈라디아서", "갈"], chapters: 6 },
  { id: "엡", full: "에베소서", aliases: ["에베소서", "엡"], chapters: 6 },
  { id: "빌", full: "빌립보서", aliases: ["빌립보서", "빌"], chapters: 4 },
  { id: "골", full: "골로새서", aliases: ["골로새서", "골"], chapters: 4 },
  { id: "살전", full: "데살로니가전서", aliases: ["데살로니가전서", "살전"], chapters: 5 },
  { id: "살후", full: "데살로니가후서", aliases: ["데살로니가후서", "살후"], chapters: 3 },
  { id: "딤전", full: "디모데전서", aliases: ["디모데전서", "딤전"], chapters: 6 },
  { id: "딤후", full: "디모데후서", aliases: ["디모데후서", "딤후"], chapters: 4 },
  { id: "딛", full: "디도서", aliases: ["디도서", "딛"], chapters: 3 },
  { id: "몬", full: "빌레몬서", aliases: ["빌레몬서", "몬"], chapters: 1 },
  { id: "히", full: "히브리서", aliases: ["히브리서", "히"], chapters: 13 },
  { id: "약", full: "야고보서", aliases: ["야고보서", "약"], chapters: 5 },
  { id: "벧전", full: "베드로전서", aliases: ["베드로전서", "벧전"], chapters: 5 },
  { id: "벧후", full: "베드로후서", aliases: ["베드로후서", "벧후"], chapters: 3 },
  { id: "요일", full: "요한일서", aliases: ["요한일서", "요일"], chapters: 5 },
  { id: "요이", full: "요한이서", aliases: ["요한이서", "요이"], chapters: 1 },
  { id: "요삼", full: "요한삼서", aliases: ["요한삼서", "요삼"], chapters: 1 },
  { id: "유", full: "유다서", aliases: ["유다서", "유"], chapters: 1 },
  { id: "계", full: "요한계시록", aliases: ["요한계시록", "계시록", "계"], chapters: 22 },
];

/**
 * 별칭 → 책. **긴 별칭을 먼저** 본다 — 「요일」을 「요」보다 먼저 봐야 요한일서로 잡힌다.
 */
const ALIAS_TO_BOOK = new Map<string, BibleBook>();
for (const book of BIBLE_BOOKS) for (const a of book.aliases) ALIAS_TO_BOOK.set(a, book);

const ALIASES_DESC = [...ALIAS_TO_BOOK.keys()].sort((a, b) => b.length - a.length);
const BOOK_GROUP = `(${ALIASES_DESC.join("|")})`;

/** `고전10:13` · `요일 5:2~4` · `요일4:1, 5~6` */
const COLON_RE = new RegExp(
  `${BOOK_GROUP}\\s*(\\d{1,3})\\s*[:：]\\s*(\\d{1,3})(?:\\s*[~\\-–—]\\s*\\d{1,3})?(?:\\s*,\\s*\\d{1,3}(?:\\s*[~\\-–—]\\s*\\d{1,3})?)*`,
  "g",
);
/** `창세기 1장 1절` · `마 24장 3~14절` */
const CHAPTER_RE = new RegExp(
  `${BOOK_GROUP}\\s*(\\d{1,3})\\s*장\\s*(\\d{1,3})\\s*절(?:\\s*[~\\-–—]\\s*\\d{1,3}\\s*절?)?`,
  "g",
);

export interface BibleRef {
  /** 원문 표기 그대로 — 화면·인쇄에 이것을 쓴다 */
  raw: string;
  /** 집계용 정규 키 (`고전 10:13`) */
  key: string;
  book: BibleBook;
  chapter: number;
  verse: number;
  /** 원문에서의 위치 */
  index: number;
}

/**
 * 앞 글자로 오탐을 막는다.
 * - 숫자·영문·`/`·`-`가 앞에 붙으면 날짜·버전 표기다 (`2026-08-13`)
 * - **한글이 앞에 붙으면 낱말의 일부다** — 「자유 1:2」의 「유」가 유다서로 잡히는 것을 막는다
 */
function boundaryOk(text: string, index: number): boolean {
  if (index === 0) return true;
  const prev = text[index - 1];
  return !/[가-힣0-9A-Za-z/\-]/.test(prev);
}

function pushRef(out: BibleRef[], m: RegExpExecArray, text: string) {
  if (!boundaryOk(text, m.index)) return;
  const book = ALIAS_TO_BOOK.get(m[1]);
  if (!book) return;
  const chapter = Number(m[2]);
  const verse = Number(m[3]);
  // 장 수를 넘으면 성구가 아니다 (`창51:1` — 창세기는 50장)
  if (chapter < 1 || chapter > book.chapters) return;
  if (verse < 1 || verse > 200) return;
  out.push({ raw: m[0].trim(), key: `${book.id} ${chapter}:${verse}`, book, chapter, verse, index: m.index });
}

/** 글에서 성구 표기를 전부 찾는다 (나온 순서대로) */
export function extractRefs(text: string): BibleRef[] {
  const out: BibleRef[] = [];
  for (const re of [COLON_RE, CHAPTER_RE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) pushRef(out, m, text);
  }
  return out.sort((a, b) => a.index - b.index);
}

/**
 * 이 줄이 성구로 **시작하는가** — 표시(들여쓰기)용 판정.
 *
 * 종전 `AdvicePanel.tsx`의 `VERSE_LINE`을 흡수했다. 사전을 쓰므로 「고전10:13」·「요일 5:2~4」도
 * 함께 잡는다 — 종전에는 두 글자 책 이름까지만 받아 놓치던 것들이다.
 */
export function isVerseLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  const first = extractRefs(t)[0];
  return !!first && first.index <= 1;
}

/* ───────────────────────── 자기검증 ───────────────────────── */

/**
 * 사실상 유닛 테스트다. **표본을 함수 안에 두는 이유**: `import.meta.env.DEV`가 리터럴로
 * 치환되므로 프로덕션 빌드에서 이 함수째로 사라져 번들에 부담이 없다.
 * ⚠️ **표본을 늘리는 것이 곧 테스트를 늘리는 것이다.** 현장에서 못 잡은 표기를 만나면 여기 더한다.
 */
export function bibleRefStats(): { books: number; aliases: number; pass: number; total: number; fail: string[] } {
  const cases: { text: string; expect: number; why: string }[] = [
    { text: "고전10:13 사람에게 감당할", expect: 1, why: "세 글자 약칭 · 공백 없음" },
    { text: "요일 5:2~4 를 보면", expect: 1, why: "요한일서 · 절 범위" },
    { text: "계 22:18~19", expect: 1, why: "계시록 절 범위" },
    { text: "창1:1-3 태초에", expect: 1, why: "붙임표 범위" },
    { text: "요일4:1, 5~6", expect: 1, why: "절 목록" },
    { text: "창세기 1장 1절", expect: 1, why: "장절 표기" },
    { text: "시 119:105 주의 말씀은", expect: 1, why: "시편 119장" },
    { text: "010-1234-5678로 연락", expect: 0, why: "전화번호" },
    { text: "오후 2:30에 만나요", expect: 0, why: "시각" },
    { text: "2026-08-13 강의", expect: 0, why: "날짜" },
    { text: "창51:1", expect: 0, why: "창세기는 50장" },
    { text: "자유 1:2 라는 말", expect: 0, why: "「유」가 낱말 안에 있음" },
  ];

  const fail: string[] = [];
  for (const c of cases) {
    let got = -1;
    try {
      got = extractRefs(c.text).length;
    } catch {
      /* 아래에서 실패로 잡힌다 */
    }
    if (got !== c.expect) fail.push(`${c.why} (${c.text} → ${got}개, ${c.expect}개여야 함)`);
  }

  return {
    books: BIBLE_BOOKS.length,
    aliases: ALIAS_TO_BOOK.size,
    pass: cases.length - fail.length,
    total: cases.length,
    fail,
  };
}
