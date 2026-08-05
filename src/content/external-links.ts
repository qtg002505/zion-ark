/**
 * 사이트 안에서 여는 외부 자료 — 말씀광장·천지일보.
 * 하이퍼링크로 튕겨 보내지 않고 내부 뷰어(`/external/:id`)에서 띄운다.
 *
 * 주의: 임베드 차단(X-Frame-Options·CSP frame-ancestors)은 상대 사이트가 언제든
 * 켤 수 있다. 뷰어는 로드 실패를 감지해 새 탭 열기로 안내한다.
 */

export interface ExternalSource {
  id: string;
  label: string;
  /** 어느 대주제에 속하는지 — 화면 크럼에 쓴다 */
  group: "말씀광장" | "천지일보";
  url: string;
  desc: string;
}

export const EXTERNAL_SOURCES: ExternalSource[] = [
  {
    id: "bible",
    label: "온라인 성경",
    group: "말씀광장",
    url: "https://www.wordsquare.org/bible-forest/bible",
    desc: "말씀광장 온라인 성경 — 장·절 검색과 본문 열람",
  },
  {
    id: "dictionary",
    label: "성경사전",
    group: "말씀광장",
    url: "https://www.wordsquare.org/bible-forest/dictionary",
    desc: "말씀광장 성경사전 — 인명·지명·용어 풀이",
  },
  {
    id: "news",
    label: "최근 이슈",
    group: "천지일보",
    url: "https://www.newscj.com/",
    desc: "천지일보 최신 기사",
  },
  {
    id: "news-religion",
    label: "종교 · 개신교",
    group: "천지일보",
    url: "https://www.newscj.com/news/articleList.html?sc_sub_section_code=S2N53&sc_section_code=S1N7&view_type=sm",
    desc: "천지일보 종교면 — 개신교 기사 목록",
  },
];

export function findExternal(id: string | undefined): ExternalSource | undefined {
  return EXTERNAL_SOURCES.find((s) => s.id === id);
}
