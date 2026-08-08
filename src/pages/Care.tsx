import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { HeartPulse, Lock, Sparkles } from "lucide-react";
import { PromptBox } from "../components/PromptBox";
import { PageHeader, Card } from "./common";

/**
 * 사명자 심방 도우미 — 수강생이 아니라 **사명자 본인**이 대상이다
 * (2026-08-08 카테고리 개편 지시문 §2-7). 담당: 리드.
 *
 * ⚠️ 이 화면에서 지어내지 않은 것 둘 — 둘 다 원본을 받아야 한다.
 * 1. **번아웃 척도 문항.** 심리 척도를 임의로 만들어 사람의 상태를 재는 것은
 *    불변식 4(신앙·인격·심리를 확정 판정하지 않는다)에 정면으로 어긋난다
 * 2. **성향별 회복 방향.** 사이트의 에니어그램 원문은 *수강생 관리용*(성장과정·단계향상·
 *    관리팁·보강 성구)이고 사명자 본인 회복 내용이 없다. 없는 것을 만들어 넣지 않고
 *    원문 열람으로만 연결한다
 *
 * 먼저 만든 것은 **프롬프트 생성기**다. 저장이 필요 없고, 개인정보를 넣지 않는다는
 * 방침을 코드로 지킬 수 있는 부분이라서다.
 */
export function Care() {
  return (
    <div>
      <PageHeader
        crumb="사명자 심방 도우미"
        title="사명자 심방 도우미"
        desc="수강생을 창조하고 돌보느라 지친 강사·전도사 본인을 위한 자리입니다."
      />

      {/* 이 화면의 성격상 개인정보 방침을 가장 먼저 밝힌다 */}
      <div className="mb-4 flex items-start gap-2 rounded-card border border-zion-300 bg-zion-50 p-3.5">
        <Lock size={16} className="mt-0.5 shrink-0 text-zion-700" />
        <div className="text-[13px] leading-relaxed text-ink">
          <strong className="font-bold">사명자 본인의 심리 상태도 개인정보입니다.</strong>
          <p className="mt-1">
            여기서 고른 내용은 <strong>서버에 저장하지 않습니다.</strong> 화면에서 프롬프트만 만들고
            끝냅니다 — 관리자도 볼 수 없고, 기록도 남지 않습니다. 새로고침하면 사라집니다.
          </p>
        </div>
      </div>

      <Card className="mb-4">
        <div className="mb-1 flex items-center gap-1.5 text-[15px] font-bold text-zion-900">
          <Sparkles size={16} className="text-zion-700" /> 상담 GPT 프롬프트 만들기
        </div>
        <CarePromptBuilder />
      </Card>

      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <Card>
          <HeartPulse size={18} className="text-zion-700" />
          <div className="mt-2 text-[14px] font-bold text-zion-900">소진 자가진단</div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            지금 얼마나 지쳐 있는지 스스로 재어 봅니다. 결과는 이 화면에서만 보이고 저장하지
            않습니다.
          </p>
          <p className="mt-2 rounded-lg bg-zion-50 p-2.5 text-[12px] leading-relaxed text-ink">
            ⚠️ <strong>척도 문항 원본이 필요합니다.</strong> 심리 척도를 임의로 지어내지 않습니다 —
            출처 있는 문항을 받아 그대로 씁니다. 지어낸 문항으로 사람의 상태를 재면 결과가
            사실처럼 굳어집니다.
          </p>
        </Card>

        <Card>
          <HeartPulse size={18} className="text-zion-700" />
          <div className="mt-2 text-[14px] font-bold text-zion-900">성향 참고</div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            유형에 따라 무엇으로 회복되는지가 다릅니다. 우선 사이트에 있는 에니어그램 원문을
            그대로 열어 볼 수 있게 연결해 두었습니다.
          </p>
          <Link
            to="/enneagram"
            className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-zion-700 hover:underline"
          >
            에니어그램 유형별 자료 열기
          </Link>
          <p className="mt-2 rounded-lg bg-zion-50 p-2.5 text-[12px] leading-relaxed text-ink">
            ⚠️ 사이트의 에니어그램 원문은 <strong>수강생 관리용</strong>입니다(성장과정 · 단계향상 ·
            관리팁 · 보강 성구). <strong>사명자 본인의 회복용 내용은 별도 원문이 필요합니다.</strong>
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ── 사명자 본인을 위한 프롬프트 생성기 ── */

const BURDENS = [
  "시간이 없고 늘 쫓긴다",
  "수강생 이탈이 반복돼 무력하다",
  "성과에 대한 압박이 크다",
  "함께 일하는 사람과 부딪힌다",
  "영적으로 메말라 있다",
  "몸이 지쳐 회복이 안 된다",
];
const DURATIONS = ["최근 1~2주", "한 달쯤", "두세 달 이상", "반년 넘게"];
const NEEDS = [
  "쉬는 방법을 찾고 싶다",
  "마음을 정리하고 싶다",
  "일의 우선순위를 정하고 싶다",
  "털어놓고 이야기하고 싶다",
];

/**
 * ⛔ 상담 도우미 ⑫와 같은 규칙이다 — 고르는 항목이 **전부 비식별 속성**이고
 * **자유 입력칸을 두지 않는다.** 이름·소속·기수를 넣을 자리 자체를 만들지 않는 것이
 * "넣지 마세요"라고 적어 두는 것보다 확실하다.
 *
 * 사명자 본인의 상태도 개인정보이므로 고른 값을 저장하지 않는다 — 컴포넌트 상태로만 둔다.
 */
function CarePromptBuilder() {
  const [burden, setBurden] = useState(BURDENS[0]);
  const [duration, setDuration] = useState(DURATIONS[0]);
  const [need, setNeed] = useState(NEEDS[0]);

  const prompt = useMemo(
    () =>
      [
        "당신은 사람을 돌보는 일을 오래 해 온 사람을 상담하는 조력자입니다.",
        "저는 성경 교육기관에서 수강생을 가르치고 돌보는 일을 하고 있습니다.",
        "",
        `- 요즘 가장 힘든 것: ${burden}`,
        `- 이 상태가 이어진 기간: ${duration}`,
        `- 지금 가장 필요한 것: ${need}`,
        "",
        "부탁:",
        "1. 제 상태를 진단명으로 규정하지 말아 주세요. 지금 무엇이 힘든지 함께 정리해 주세요.",
        "2. 오늘 당장 해 볼 수 있는 작은 것 한두 가지를 알려 주세요.",
        "3. 혼자 감당하기 어려운 신호가 보이면, 전문가의 도움을 권해 주세요.",
      ].join("\n"),
    [burden, duration, need],
  );

  return (
    <div>
      <p className="mb-3 text-[13px] leading-relaxed text-ink">
        사이트가 직접 답을 만들지 않습니다. 아래를 고르면 <strong>외부 상담 GPT에 붙여 넣을
        프롬프트</strong>를 만들어 드립니다. 복사해서 GPT로 가져가 대화하세요.
      </p>

      <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-1">
        {(
          [
            ["요즘 가장 힘든 것", burden, setBurden, BURDENS],
            ["이어진 기간", duration, setDuration, DURATIONS],
            ["지금 필요한 것", need, setNeed, NEEDS],
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
