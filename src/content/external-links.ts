/**
 * 외부 자료 — 말씀광장·천지일보.
 *
 * ⚠️ 두 사이트 모두 `X-Frame-Options`로 **다른 사이트 안에서의 표시를 막고 있다**
 * (실제 브라우저에서 "이 콘텐츠는 차단되어 있습니다"로 뜬다). 그래서 iframe으로는
 * 사이트 안에 띄울 수 없다. 이건 우리 쪽 설정으로 풀 수 있는 문제가 아니다.
 *
 * 지금은 뷰어 화면(`/external/:id`)에서 자료를 안내하고 새 탭으로 넘긴다.
 * 백엔드가 붙으면 서버가 대신 받아 오는 프록시로 사이트 안 표시가 가능해진다
 * (그때 `embeddable`을 켜고 `src`를 프록시 경로로 바꾼다).
 */

export interface ExternalSource {
  id: string;
  label: string;
  /** 어느 대주제에 속하는지 — 화면 크럼에 쓴다 */
  group: "말씀광장" | "천지일보";
  url: string;
  desc: string;
  /** 사이트 안 표시 가능 여부 — 상대가 막고 있으면 false */
  embeddable: boolean;
  /** 뷰어에서 안내할 때 쓸 한 줄 (무엇을 할 수 있는 자료인지) */
  hint: string;
}

export const EXTERNAL_SOURCES: ExternalSource[] = [
  {
    id: "bible",
    label: "온라인 성경",
    group: "말씀광장",
    url: "https://www.wordsquare.org/bible-forest/bible",
    desc: "말씀광장 온라인 성경 — 장·절 검색과 본문 열람",
    embeddable: false,
    hint: "구약·신약 전권을 장별로 찾아 읽고, 단어로 성경구절을 검색할 수 있습니다.",
  },
  {
    id: "dictionary",
    label: "성경사전",
    group: "말씀광장",
    url: "https://www.wordsquare.org/bible-forest/dictionary",
    desc: "말씀광장 성경사전 — 인명·지명·용어 풀이",
    embeddable: false,
    hint: "성경에 나오는 인명·지명·용어의 뜻을 찾아볼 수 있습니다. 강의 준비 중 용어 확인에 씁니다.",
  },
  {
    id: "news",
    label: "최근 이슈",
    group: "천지일보",
    url: "https://www.newscj.com/",
    desc: "천지일보 최신 기사",
    embeddable: false,
    hint: "천지일보 1면 — 전체 분야의 최신 기사를 봅니다.",
  },
  {
    id: "news-religion",
    label: "종교 · 개신교",
    group: "천지일보",
    url: "https://www.newscj.com/news/articleList.html?sc_sub_section_code=S2N53&sc_section_code=S1N7&view_type=sm",
    desc: "천지일보 종교면 — 개신교 기사 목록",
    embeddable: false,
    hint: "종교면의 개신교 기사 목록입니다. 현안 파악과 대응 자료로 활용합니다.",
  },
];

export function findExternal(id: string | undefined): ExternalSource | undefined {
  return EXTERNAL_SOURCES.find((s) => s.id === id);
}
