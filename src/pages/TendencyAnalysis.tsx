import { useMemo, useState } from "react";
import { CircleAlert, ExternalLink, Info, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { useSession } from "../lib/auth";
import { visibleDivisions } from "../lib/permissions";
import { COHORT, DIVISIONS, STUDENTS } from "../content/cohort-mock";
import { STUDENT_PROFILES } from "../content/student-profiles";
import { enneagramGuides } from "../content/enneagram-guides";
import { TEMPERAMENT_GUIDES } from "../content/temperament-guides";
import { canSendToAI, redactForAI, scanPII, type ConsentState } from "../lib/privacy";
import { adviceToPromptBlock, readAdvice, type AdviceReading } from "../lib/advice-engine";
import { AdvicePanel } from "../components/AdvicePanel";
import { PromptBox } from "../components/PromptBox";
import { Link } from "../components/TransitionLink";
import { PageHeader, Card } from "./common";

/**
 * 수강생 성향 분석 (2026-08-13 리드 지시) — 관찰한 성향을 넣으면 **AI가 읽어 준다.**
 *
 * ## 이 화면이 지키는 것 (불변식 4)
 *
 * 성향 기록은 개인정보다. 그래서 세 겹을 둔다:
 *
 * 1. **동의** — `canSendToAI`가 `ok`를 줄 때만 프롬프트가 열린다. 기본값은 「모름」이고
 *    모르면 아무것도 내보내지 않는다. 실제 동의 데이터는 아직 없어 **시범 스위치**로
 *    흐름만 보인다 (실데이터 투입 전 제거 — 시범 로그인과 같은 취급)
 * 2. **비식별화** — 담당자가 쓴 글은 `redactForAI()`를 거친 것만 프롬프트에 들어간다.
 *    무엇을 가렸는지 화면에 보여 준다. 이름·연락처·나이·분반은 나가지 않는다
 * 3. **확정 판정 금지** — 프롬프트가 AI에게 「가능성으로만 적고 근거를 밝히라」고 먼저
 *    지시한다. 화면에도 같은 고지를 낸다
 *
 * ⚠️ **정규식은 사람이 쓴 이름을 못 잡는다.** 「민수가 요즘」은 안 걸린다 — 그래서
 * 서버가 붙으면 **서버에서 같은 검사를 다시** 한다. 브라우저 검사만 믿지 않는다.
 *
 * AI 응답 자리는 백엔드(`VITE_ASK_API_PATH`) 대기다. 그동안에도 화면이 쓸모 있도록
 * **에니어그램·기질 원문으로 가는 참고 길**을 함께 낸다.
 */
export function TendencyAnalysis() {
  const session = useSession();
  const divisions = visibleDivisions(session, DIVISIONS);

  const students = useMemo(() => STUDENTS.filter((s) => divisions.includes(s.division)), [divisions]);

  const [studentKey, setStudentKey] = useState<string>("");
  const [observation, setObservation] = useState("");
  /**
   * 동의 상태 — 실제로는 수강 신청서·기수 단위 동의 기록에서 읽어 온다.
   * 그 데이터가 붙기 전까지 **기본값은 「모름」**이고, 모르면 내보내지 않는다.
   */
  const [consent, setConsent] = useState<ConsentState>("unknown");
  /**
   * 1차 조언 — **버튼을 눌렀을 때 한 번만** 읽는다 (`AskAiBar`가 제출 때만 찾는 것과 같다).
   * 타자마다 돌리면 1,000여 건을 훑는 계산이 글자 수만큼 되풀이된다.
   * 계산에 쓴 관찰문을 함께 들고 있어야 **글이 바뀐 뒤에도 옛 결과를 보고 있는 일**을 막는다.
   */
  const [reading, setReading] = useState<{ text: string; result: AdviceReading } | null>(null);
  /** 찾은 근거를 외부 GPT 프롬프트에도 실을지 (2026-08-13 리드 결정 — 기본은 꺼 둔다) */
  const [withEvidence, setWithEvidence] = useState(false);

  const profile = studentKey ? STUDENT_PROFILES[studentKey] : undefined;

  /** 사람에게 먼저 알린다 — 스스로 지우게 하는 것이 기계가 가리는 것보다 낫다 */
  const warnings = useMemo(() => scanPII(observation), [observation]);
  const redacted = useMemo(() => redactForAI(observation), [observation]);
  const check = canSendToAI(consent);

  const enneagram = profile ? enneagramGuides.find((g) => g.typeNo === profile.enneagramType) : undefined;

  const ready = observation.trim().length >= 10;
  const stale = reading !== null && reading.text !== observation;

  const evidenceBlock =
    withEvidence && reading && !stale ? adviceToPromptBlock(reading.result) : "";

  const prompt = useMemo(
    () => buildPrompt({ redactedText: redacted.text, profile, evidenceBlock }),
    [redacted.text, profile, evidenceBlock],
  );

  function readNow() {
    setReading({
      text: observation,
      result: readAdvice({
        observation,
        // ⚠️ 기록된 유형만 넘긴다 — 엔진이 관찰문으로 유형을 추정하는 일은 없다
        enneagramType: profile?.enneagramType,
        shapeType: profile?.shapeType,
        mbti: profile?.mbti,
        sajuElement: profile?.sajuElement,
      }),
    });
  }

  return (
    <div>
      <PageHeader
        crumb="수강생 관리 도우미"
        title="수강생 성향 분석"
        desc="관찰한 성향과 언행을 적으면 사이트가 관련 원문을 찾아 1차 조언을 만듭니다. 더 깊은 답이 필요할 때 외부 AI로 이어집니다. 사람을 유형에 가두거나 판정하는 도구가 아닙니다."
      />

      {/* 불변식 4 고지 — 화면을 여는 순간 먼저 읽히도록 맨 위에 둔다 */}
      <p className="mb-4 flex items-start gap-1.5 rounded-lg bg-gold-100/60 p-3 text-[12px] leading-relaxed text-ink">
        <CircleAlert size={15} className="mt-0.5 shrink-0 text-gold-700" />
        <span>
          <strong className="font-bold">AI는 신앙·인격·심리를 확정하지 않습니다.</strong> 돌려주는 것은
          가능성과 대화 실마리이며, 근거가 된 문장을 함께 밝히도록 요청합니다. 최종 판단은 담당
          사명자의 몫입니다. 아래 수강생 이름은 <strong className="font-bold">시범용 가상 인물</strong>입니다.
        </span>
      </p>

      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        {/* 왼쪽 — 넣는 자리 */}
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 text-[15px] font-bold text-zion-900">1. 누구를 보고 있습니까</h2>

            <label htmlFor="tendency-student" className="mb-1 block text-[12px] font-semibold text-ink">
              수강생 (담당 범위)
            </label>
            <select
              id="tendency-student"
              value={studentKey}
              onChange={(e) => setStudentKey(e.target.value)}
              className="mb-3 w-full rounded-lg border border-zion-100 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500"
            >
              <option value="">고르지 않음 — 관찰 내용만 적기</option>
              {students.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name} · {s.division}
                </option>
              ))}
            </select>

            {profile ? (
              <div className="rounded-lg bg-zion-50 p-3">
                <div className="mb-1.5 text-[11px] font-semibold text-ink-soft">
                  기록된 성향 — 프롬프트에 함께 실립니다
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px] max-sm:grid-cols-1">
                  <Row label="MBTI" value={profile.mbti} />
                  <Row label="에니어그램" value={`${profile.enneagramType}번${enneagram ? ` · ${enneagram.title}` : ""}`} />
                  <Row label="도형" value={profile.shapeType} />
                  <Row label="오행" value={profile.sajuElement} />
                </dl>
                <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                  이름 · 나이 · 분반 · 연락처는 <strong className="font-semibold">보내지 않습니다.</strong> 소속은{" "}
                  {COHORT.tribe}지파 · {COHORT.church} · {COHORT.cohort}까지만 실립니다.
                </p>
              </div>
            ) : (
              <p className="text-[12px] leading-relaxed text-ink-soft">
                수강생을 고르면 기록된 성향(MBTI · 에니어그램 · 도형 · 오행)이 함께 실립니다. 고르지
                않아도 관찰 내용만으로 분석을 요청할 수 있습니다.
              </p>
            )}
          </Card>

          <Card>
            <h2 className="mb-1 text-[15px] font-bold text-zion-900">2. 무엇을 보았습니까</h2>
            {/*
              두 갈래를 함께 적게 안내한다 — 원문의 성질이 갈리기 때문이다.
              성향·정서는 **에니어그램 원문**에, 교리를 어떻게 받아들이는지는 **교안**에 걸린다.
              (교안은 교리 강의안이라 「가족」·「지각」 같은 낱말이 아예 없다 — 실측으로 확인했다.)
            */}
            <p className="mb-2 text-[12px] leading-relaxed text-ink-soft">
              말투 · 반응 · 참여 모습 · 최근 달라진 점을 있는 그대로 적습니다. 이름 대신 「이 수강생」으로
              적어 주세요. <strong className="font-semibold text-ink">교리를 어떻게 받아들이는지</strong>도
              함께 적으면 교안 원문에서도 찾아 줍니다.
            </p>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              rows={8}
              aria-label="관찰 내용"
              placeholder="예) 강의 중 질문이 많고 근거를 되묻습니다. 선악 구분은 아직 인정하지 못합니다. 분반 나눔에서는 말수가 줄고, 최근 2주는 지각이 잦아졌습니다."
              className="w-full resize-y rounded-lg border border-zion-100 px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-zion-500"
            />

            {warnings.length > 0 && (
              <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-gold-100/60 p-2.5 text-[12px] leading-relaxed text-ink">
                <CircleAlert size={14} className="mt-0.5 shrink-0 text-gold-700" />
                <span>
                  <strong className="font-bold">지워 주세요:</strong> {warnings.join(" · ")}. 보내기 전에
                  자동으로 가리지만, 직접 지우는 편이 안전합니다.
                </span>
              </p>
            )}

            {ready && redacted.removed.length > 0 && (
              <div className="mt-2 rounded-lg bg-zion-50 p-2.5">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-zion-700">
                  <ShieldCheck size={13} /> 가린 뒤 이렇게 나갑니다 — {redacted.removed.join(" · ")}
                </div>
                <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-ink">{redacted.text}</p>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-1 text-[15px] font-bold text-zion-900">3. 외부 AI 사용 동의</h2>
            <p className="mb-3 text-[12px] leading-relaxed text-ink-soft">
              동의가 확인된 대상의 기록만 나갑니다. <strong className="font-semibold">모르면 보내지 않습니다.</strong>
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold " +
                  (check.ok ? "bg-emerald-50 text-emerald-700" : "bg-zion-100 text-ink-soft")
                }
              >
                {check.ok ? <ShieldCheck size={13} /> : <Lock size={13} />}
                {check.ok ? "동의 확인됨" : "동의 확인 안 됨"}
              </span>
              <button
                onClick={() => setConsent(consent === "granted" ? "unknown" : "granted")}
                className="rounded-lg border border-zion-200 px-3 py-1.5 text-[12px] font-semibold text-zion-700 transition hover:border-zion-500"
              >
                {consent === "granted" ? "「모름」으로 되돌리기" : "동의 확인됨으로 전환 (시범)"}
              </button>
            </div>

            <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-soft">
              <Info size={13} className="mt-0.5 shrink-0" />
              <span>
                이 스위치는 <strong className="font-semibold">화면 흐름을 보이기 위한 시범 장치</strong>입니다.
                실제로는 수강 신청서 · 기수 단위 동의 기록에서 읽어 오며, 실데이터를 넣기 전에 없앱니다.
                동의를 받는 방법은 리드 결정 대기 중입니다.
              </span>
            </p>
          </Card>
        </div>

        {/* 오른쪽 — 나오는 자리. 위가 무료(사이트 안), 아래가 외부 AI다 */}
        <div className="space-y-4">
          {/*
            1차 조언 — **동의 게이트 밖에 둔다** (2026-08-13 리드 결정).
            계산이 기기 안에서 끝나 외부로 나가는 것이 없으니 `canSendToAI`가 막을 이유가 없고,
            오히려 **동의가 없을 때 유일하게 쓸모 있는 것이 이 조언**이다.
          */}
          <Card>
            <h2 className="mb-1 flex items-center gap-1.5 text-[15px] font-bold text-zion-900">
              <Sparkles size={15} className="text-zion-600" /> 1차 조언 — 사이트 안에서
            </h2>

            {!ready ? (
              <p className="py-8 text-center text-[13px] leading-relaxed text-ink-soft">
                관찰 내용을 10자 이상 적으면 사이트가 관련 원문을 찾아 줍니다.
              </p>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={readNow}
                    className="rounded-lg bg-zion-800 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-zion-700"
                  >
                    {reading ? "다시 읽기" : "관련 원문 찾기"}
                  </button>
                  {stale && (
                    <span className="text-[11px] text-gold-700">
                      관찰 내용이 바뀌었습니다 — 다시 읽어 주세요
                    </span>
                  )}
                </div>
                {reading ? (
                  <AdvicePanel reading={reading.result} />
                ) : (
                  <p className="text-[12px] leading-relaxed text-ink-soft">
                    에니어그램 원문과 초등 교안에서 관찰 내용과 겹치는 대목을 찾습니다. 비용이 들지
                    않고, 기록이 기기 밖으로 나가지 않습니다.
                  </p>
                )}
              </>
            )}
          </Card>

          {/* 더 깊은 답이 필요할 때 — 여기서부터는 밖으로 나간다 */}
          <Card>
            <h2 className="mb-1 flex items-center gap-1.5 text-[15px] font-bold text-zion-900">
              <ExternalLink size={15} className="text-zion-600" /> 외부 AI에 더 물어보기
            </h2>

            {!ready ? (
              <p className="py-8 text-center text-[13px] leading-relaxed text-ink-soft">
                관찰 내용을 10자 이상 적으면 분석 요청이 만들어집니다.
              </p>
            ) : !check.ok ? (
              <div className="rounded-lg bg-zion-50 p-4">
                <p className="flex items-start gap-1.5 text-[13px] leading-relaxed text-ink">
                  <Lock size={15} className="mt-0.5 shrink-0 text-ink-soft" />
                  <span>
                    <strong className="font-bold">{check.reason}</strong>
                    <br />
                    동의가 확인되기 전에는 프롬프트도 열지 않습니다 — 사람이 옮겨 붙이는 것도 외부로
                    보내는 것이기 때문입니다. <strong className="font-semibold">위 1차 조언은 그대로
                    쓰실 수 있습니다</strong> — 기기 밖으로 나가지 않기 때문입니다.
                  </span>
                </p>
              </div>
            ) : (
              <>
                <p className="mb-2 text-[12px] leading-relaxed text-ink-soft">
                  아래 프롬프트에는 <strong className="font-semibold">가린 글</strong>만 들어 있습니다. 복사해
                  상담 GPT에 붙여 넣습니다.
                </p>

                {/*
                  찾은 근거를 함께 실으면 외부 AI의 신학 환각이 줄어든다.
                  내부 **교육 원문**이라 개인정보가 없어 `redactForAI` 대상이 아니다.
                  분량이 크므로 기본은 꺼 둔다 (2026-08-13 리드 결정 — 체크박스로).
                */}
                {reading && !stale && reading.result.total > 0 && (
                  <label className="mb-2 flex items-start gap-2 rounded-lg bg-zion-50 p-2.5 text-[12px] leading-relaxed text-ink">
                    <input
                      type="checkbox"
                      checked={withEvidence}
                      onChange={(e) => setWithEvidence(e.target.checked)}
                      className="mt-0.5 shrink-0"
                    />
                    <span>
                      사이트가 찾은 <strong className="font-semibold">내부 근거 {reading.result.total}건</strong>을
                      프롬프트에 함께 싣기 — 외부 AI가 우리 자료 안에서 답하게 됩니다. 프롬프트가 길어집니다.
                    </span>
                  </label>
                )}

                <PromptBox prompt={prompt} linkNote="상담 GPT 링크는 주소 수령 후 연결됩니다" />
              </>
            )}
          </Card>

          {/* AI가 없어도 쓸모 있게 — 참고 원문으로 가는 길을 함께 낸다 */}
          <Card>
            <h2 className="mb-1 text-[15px] font-bold text-zion-900">함께 볼 참고 자료</h2>
            <p className="mb-3 text-[12px] leading-relaxed text-ink-soft">
              AI 답변을 기다리지 않고도 볼 수 있는 원문입니다. 출처를 밝혀 인용합니다.
            </p>

            {enneagram && (
              <Link
                to="/enneagram"
                className="mb-2 block rounded-lg border border-zion-100 p-3 transition hover:border-zion-300"
              >
                <div className="text-[13px] font-semibold text-zion-800">
                  에니어그램 {enneagram.typeNo}번 — {enneagram.title}
                </div>
                <div className="mt-0.5 text-[11px] text-ink-soft">
                  성장과정 · 단계향상 방법 · 초중고 관리팁 · 보강 성구 (내부 원문)
                </div>
              </Link>
            )}

            <div className="flex flex-wrap gap-1.5">
              {TEMPERAMENT_GUIDES.map((g) => (
                <span
                  key={g.name}
                  className="rounded-full border border-zion-200 px-2.5 py-1 text-[11px] font-medium text-zion-700"
                >
                  {g.name}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
              위 네 갈래는 <strong className="font-semibold">일반에 알려진 참고 지식의 요약</strong>입니다
              (내부 교육 원문이 아닙니다). 에니어그램만 내부 원문이 실려 있습니다.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <dt className="shrink-0 text-ink-soft">{label}</dt>
      <dd className="min-w-0 font-semibold text-ink">{value}</dd>
    </div>
  );
}

/**
 * 프롬프트를 만든다 — **가려진 글만 받는다.**
 *
 * 지시 다섯 줄이 불변식 4를 문장으로 옮긴 것이다: 확정 판정 금지 · 근거 표시 · 출처 표시 ·
 * 되묻기 금지. 지시를 프롬프트 안에 두는 이유는, 담당자가 복사해서 어느 AI에 붙여 넣든
 * 같은 제약이 함께 가야 하기 때문이다.
 */
function buildPrompt({
  redactedText,
  profile,
  evidenceBlock,
}: {
  redactedText: string;
  profile?: (typeof STUDENT_PROFILES)[string];
  /** 사이트가 찾은 내부 근거 — 비면 넣지 않는다 (기본은 꺼져 있다) */
  evidenceBlock?: string;
}) {
  const tendency = profile
    ? `[기록된 성향] MBTI ${profile.mbti} · 에니어그램 ${profile.enneagramType}번 · 도형 ${profile.shapeType} · 오행 ${profile.sajuElement}`
    : "[기록된 성향] 없음 — 관찰 내용만 있습니다";

  return [
    "당신은 성경 교육 과정의 담당 교사를 돕는 상담 보조입니다.",
    "아래는 담당 사명자가 수강생 한 명을 관찰한 기록입니다. 개인을 식별할 수 있는 정보는 지운 상태입니다.",
    "",
    `[소속] ${COHORT.tribe}지파 · ${COHORT.church} · ${COHORT.cohort}`,
    tendency,
    "[관찰 기록]",
    redactedText,
    ...(evidenceBlock ? ["", evidenceBlock] : []),
    "",
    "다음을 지켜 답해 주세요.",
    "1. 이 사람의 신앙·인격·심리를 확정해 판정하지 마세요. 「~일 수 있습니다」처럼 가능성으로 적습니다.",
    "2. 그렇게 본 근거를 관찰 기록의 문장을 인용해 함께 밝혀 주세요.",
    "3. 성향 분류(MBTI·에니어그램 등)를 인용할 때는 어느 분류의 이야기인지 출처를 밝혀 주세요.",
    "4. 셋으로 나눠 적어 주세요 — (1) 지금 어떤 상태로 보이는지 (2) 대화를 열 때 도움이 될 방식 (3) 조심할 것.",
    "5. 이름·연락처·나이·분반은 묻지 마세요. 알려 드릴 수 없습니다.",
  ].join("\n");
}
