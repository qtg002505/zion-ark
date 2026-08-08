import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Accordion, type AccordionItem } from "../components/Accordion";
import { PromptBox } from "../components/PromptBox";
import { PageHeader, Card } from "./common";

/**
 * 상담 도우미 — 테마 12종 허브 (2026-08-08 카테고리 개편 지시문 §2-5).
 *
 * 이 화면은 **0단계(구조 선행)** 산출물이다. 테마 목록·고지 문구·하단 지침을 먼저 세우고,
 * 사명자 참여형(UGC) 등록·도움됨·인기순·신고·숨김은 **3단계**에서 붙인다.
 * 지금 반쯤 만들어 두면 "등록은 되는데 권한이 없는" 상태가 되어 더 위험하다.
 *
 * ⑫ AI 상담 분석은 저장소가 필요 없고 **불변식(개인정보 미반출)을 직접 검증하는 자리**라
 * 먼저 만들었다 — 아래 `PromptBuilder` 참고.
 */

interface Theme {
  no: number;
  name: string;
  hint: string;
  /** 이 테마의 내용이 어디에 있는지 (이미 있는 화면이면 링크) */
  body: React.ReactNode;
}

/** 상담법 글에 항상 붙는 고지 — 개방형 등록의 전제다 (지시문 §2-5 검수 정책) */
function DisclaimerBanner() {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-card border border-gold-500/40 bg-gold-100/60 p-3">
      <ShieldAlert size={15} className="mt-0.5 shrink-0 text-gold-700" />
      <p className="text-[12px] leading-relaxed text-ink">
        여기 올라오는 상담법은 <strong className="font-bold">사명자 개인의 경험 공유이며 공식 교리
        해설이 아닙니다.</strong> 교리 판단이 필요한 대목은 신학부에 확인하세요.
      </p>
    </div>
  );
}

export function Counseling() {
  const themes: Theme[] = [
    {
      no: 1,
      name: "개강초",
      hint: "기수를 막 열었을 때 쓰는 상담법",
      body: <Pending related={{ to: "/library?section=instructor", label: "밭갈이·개강 세미나 자료" }} />,
    },
    { no: 2, name: "신앙전환", hint: "⚠️ 기존 미확정 용어 「영적전환」과 같은 것인지 확인 필요", body: <Pending undefinedTerm /> },
    {
      no: 3,
      name: "오픈 전 보강",
      hint: "보강 자료·편성은 분반·보강 도우미, 여기는 상담법",
      body: <Pending related={{ to: "/library?section=instructor&tab=class_material", label: "분반·보강 자료" }} />,
    },
    {
      no: 4,
      name: "오픈 후 보강",
      hint: "보강 자료·편성은 분반·보강 도우미, 여기는 상담법",
      body: <Pending related={{ to: "/library?section=instructor&tab=class_material", label: "분반·보강 자료" }} />,
    },
    { no: 5, name: "입조심 · 침 예방", hint: "⚠️ 「침」은 정의 미확정 용어", body: <Pending undefinedTerm /> },
    { no: 6, name: "왜곡씻기", hint: "⚠️ 정의 미확정 용어", body: <Pending undefinedTerm /> },
    { no: 7, name: "이면유월", hint: "⚠️ 정의 미확정 용어", body: <Pending undefinedTerm /> },
    { no: 8, name: "입교준비", hint: "수료를 앞둔 시점의 상담법", body: <Pending /> },
    { no: 9, name: "전도교육 · 정신교육", hint: "", body: <Pending /> },
    {
      no: 10,
      name: "성향 참고 — 에니어그램 / 기질검사",
      hint: "성향 데이터는 수강생 관리, 여기는 성향별 상담법",
      body: <Pending related={{ to: "/enneagram", label: "에니어그램 유형별 가이드" }} />,
    },
    {
      no: 11,
      name: "상담 사례 예시",
      hint: "이미 열려 있습니다 — 돌아온 경우와 놓친 경우",
      body: (
        <div className="text-[13px] leading-relaxed text-ink">
          <p>
            현장에서 겪은 일을 서로 남겨 두는 자리입니다. 잘된 경우만이 아니라 놓친 경우도 함께
            싣습니다.
          </p>
          <Link
            to="/cases"
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-zion-800 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-zion-700"
          >
            상담 사례 열기
          </Link>
        </div>
      ),
    },
    {
      no: 12,
      name: "AI 상담 분석",
      hint: "상황을 고르면 외부 상담 GPT에 쓸 프롬프트를 만들어 드립니다",
      body: <PromptBuilder />,
    },
  ];

  const items: AccordionItem[] = themes.map((t) => ({
    id: `theme-${t.no}`,
    title: `${t.no}. ${t.name}`,
    hint: t.hint || undefined,
    content: t.body,
  }));

  return (
    <div>
      <PageHeader
        crumb="상담 도우미"
        title="테마별 상담법"
        desc="상황별로 어떻게 상담했는지 사명자끼리 모으는 자리입니다. 테마를 눌러 펼쳐 보세요."
      />

      <DisclaimerBanner />

      <Accordion items={items} defaultOpenFirst={false} />

      {/* 하단 상담 지침 — 각 테마 화면 하단에 고정 노출 (지시문 §2-5) */}
      <Card className="mt-5">
        <div className="mb-2 text-[14px] font-bold text-zion-900">상담 시 주의사항</div>
        <ul className="space-y-1.5 text-[13px] leading-relaxed text-ink">
          <li>· 수강생의 신앙·인격·심리를 <strong>확정해 판정하지 않습니다.</strong> 관찰한 사실과 해석을 나눠 적습니다</li>
          <li>· 글에 <strong>이름·연락처·분반·나이</strong>를 적지 않습니다. 소속은 지파·교회·센터(기수)까지입니다</li>
          <li>· 다른 사명자의 상담을 평가하지 않습니다. 무엇을 했고 어떻게 됐는지만 적습니다</li>
          <li>· 교리 판단이 갈리는 대목은 글로 결론 내지 말고 신학부에 확인합니다</li>
        </ul>
        <p className="mt-3 border-t border-zion-100 pt-2.5 text-[11px] text-ink-soft">
          지침 전문은 별도 「상담 지침」 문서로 링크될 예정입니다 (원문 수령 대기).
        </p>
      </Card>

      <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
        사명자가 직접 상담법을 <strong className="text-ink">등록·수정</strong>하고 도움됨·인기순으로
        정렬하는 기능은 다음 단계에서 열립니다. 등록 개방과 함께 신고·숨김 검수 장치가 같이 들어갑니다.
      </p>
    </div>
  );
}

/** 아직 콘텐츠가 없는 테마 — 어디를 참고하면 되는지만 알려 준다 */
function Pending({
  related,
  undefinedTerm,
}: {
  related?: { to: string; label: string };
  undefinedTerm?: boolean;
}) {
  return (
    <div className="text-[13px] leading-relaxed text-ink-soft">
      <p>아직 등록된 상담법이 없습니다. 사명자 등록이 열리면 이 자리에 쌓입니다.</p>
      {undefinedTerm && (
        <p className="mt-1.5 text-ink">
          ⚠️ 이 테마 이름은 <strong>아직 정의를 받지 못한 용어</strong>입니다. 화면 이름으로만 두고
          코드 값으로 굳히지 않았습니다 — 뜻이 정해지면 이름만 고치면 됩니다.
        </p>
      )}
      {related && (
        <Link
          to={related.to}
          className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-zion-700 hover:underline"
        >
          지금은 여기를 참고하세요 — {related.label}
        </Link>
      )}
    </div>
  );
}

/* ── ⑫ AI 상담 분석 — 프롬프트 생성기 ── */

const SITUATIONS = ["연속 결석", "보강 미이행", "시간대 변경 잦음", "가족 반대", "직장·학업 부담", "교리 질문이 많음"];
const STAGES = ["개강 초반", "중반 (진도 절반쯤)", "후반 (수료 앞)", "보강 중"];
const TEMPERAMENTS = ["말이 적고 관찰형", "질문이 많고 논리형", "관계 중심·감정형", "성취 지향·계획형", "잘 모르겠음"];

/**
 * 외부 상담 GPT에 붙여 넣을 프롬프트를 만든다.
 *
 * ⛔ **절대 규칙 (불변식 2 직접 적용)**: 생성되는 문장에 수강생 실명·연락처·생년월일·
 * 소속 기수 같은 식별 정보를 **자동으로 넣지 않는다.** 고르는 항목 자체가 전부 비식별
 * 속성이고, 자유 입력칸을 두지 않아 사용자가 실수로 이름을 넣을 자리도 만들지 않았다.
 */
function PromptBuilder() {
  const [situation, setSituation] = useState(SITUATIONS[0]);
  const [stage, setStage] = useState(STAGES[0]);
  const [temperament, setTemperament] = useState(TEMPERAMENTS[0]);

  const prompt = useMemo(
    () =>
      [
        "당신은 성경 교육기관의 상담 조력자입니다. 아래 상황에 놓인 수강생을 어떻게 대하면 좋을지",
        "구체적인 대화 방법을 제안해 주세요.",
        "",
        `- 진도 단계: ${stage}`,
        `- 관찰된 상황: ${situation}`,
        `- 성향(추정): ${temperament}`,
        "",
        "조건:",
        "1. 사람을 단정해 판정하지 말고, 확인이 필요한 부분은 질문 형태로 제안해 주세요.",
        "2. 먼저 확인할 것 → 대화를 여는 말 → 피해야 할 말 순서로 정리해 주세요.",
        "3. 신앙적 판단이 갈릴 수 있는 대목은 단정하지 말고 그렇게 표시해 주세요.",
      ].join("\n"),
    [situation, stage, temperament],
  );

  return (
    <div>
      <p className="mb-3 text-[13px] leading-relaxed text-ink">
        사이트가 직접 답을 만들지 않습니다. 상황을 고르면 <strong>외부 상담 GPT에 붙여 넣을 프롬프트</strong>를
        만들어 드립니다. 복사해서 GPT로 가져가 대화하세요.
      </p>

      <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-1">
        {(
          [
            ["진도 단계", stage, setStage, STAGES],
            ["관찰된 상황", situation, setSituation, SITUATIONS],
            ["성향 (추정)", temperament, setTemperament, TEMPERAMENTS],
          ] as const
        ).map(([label, value, set, options]) => (
          <label key={label} className="block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">{label}</span>
            <select
              value={value}
              onChange={(e) => set(e.target.value)}
              className="w-full rounded-lg border border-zion-100 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500"
            >
              {options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="mt-3">
        <PromptBox prompt={prompt} />
      </div>
    </div>
  );
}
