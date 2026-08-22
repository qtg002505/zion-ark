import { useMemo, useState } from "react";
import { CircleAlert, HeartHandshake } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { visibleDivisions } from "../lib/permissions";
import { TENDENCY_AXIS_LABELS, type TendencyAxis } from "../lib/types";
import { COHORT, DIVISIONS, STUDENTS } from "../content/cohort-mock";
import {
  STUDENT_PROFILES,
  SAJU_ELEMENTS,
  type SajuElement,
  type ShapeType,
} from "../content/student-profiles";
import { enneagramGuides } from "../content/enneagram-guides";
import {
  MBTI_PREFERENCES,
  MBTI_SOURCE_NOTE,
  preferencesOf,
  type MbtiLetter,
  type MbtiPreference,
} from "../content/mbti-guides";
import { TEMPERAMENT_GUIDES } from "../content/temperament-guides";
import { GuideItems } from "./Enneagram";
import { Accordion, type AccordionItem } from "../components/Accordion";
import { Link } from "../components/TransitionLink";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { PageHeader, Card, StatTile } from "./common";

/**
 * 수강생 성향 분석 (2026-08-13 개편 · 2026-08-22 리드 지시로 두 갈래).
 *
 * ① **수강생으로 보기** — 수강생을 고르면 **기록된 유형의 원문**을 보여 준다 (종전 그대로).
 * ② **직접 골라 보기** — 사명자가 유형 값을 직접 골라 즉시 같은 원문을 조회한다
 *    (기록에 없는 값을 시험해 보는 자리 — **아무것도 저장하지 않는다**).
 *
 * **분석 축 제외** (2026-08-22) — MBTI·에니어그램·도형·오행 넷을 지파 설정으로 켜고 끈다.
 * 끈 축은 두 갈래 모두에서 빠진다. 저장은 store `zion_ark_tendency_axes`(끈 것만).
 *
 * ⚠️ 종전 관찰문 → 규칙 엔진 → 외부 GPT 구조는 2026-08-13에 걷어냈다(git 이력).
 * 불변식 4·5는 그대로다 — 이 화면은 원문을 찾아 줄 뿐, 유형을 추정하거나 새 문장을
 * 만들지 않는다. 도형 유형은 **원문 가이드가 아직 없어** 그렇게 말한다(지어내지 않는다).
 */

const AXES: TendencyAxis[] = ["mbti", "enneagram", "shape", "saju"];

/** StudentDetailPage의 선택지와 같은 목록 — ShapeType 리터럴의 표시 순서 */
const SHAPE_TYPES: ShapeType[] = ["동그라미", "세모", "네모", "에스"];

/** MBTI 네 축 — 각 축에서 하나를 고른다 (mbti-guides가 축 단위 자료라 이 모양이 맞다) */
const MBTI_PAIRS: [MbtiLetter, MbtiLetter][] = [
  ["E", "I"],
  ["S", "N"],
  ["T", "F"],
  ["J", "P"],
];

/** MBTI 축 카드 묶음 — 수강생 갈래·직접 갈래가 같은 렌더를 쓴다 */
function MbtiPrefCards({ prefs }: { prefs: MbtiPreference[] }) {
  return (
    <>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {prefs.map((p) => (
          <div key={p.letter} className="rounded-lg border border-zion-200 p-3">
            <div className="flex items-baseline gap-2">
              <span className="rounded bg-zion-700 px-1.5 py-0.5 text-[11px] font-bold text-white">
                {p.label}
              </span>
              <span className="text-[11px] text-ink-soft">{p.axis}</span>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink">{p.trait}</p>
            <p className="mt-1.5 border-t border-zion-100 pt-1.5 text-[12px] leading-relaxed text-zion-800">
              {p.tip}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 border-t border-zion-100 pt-2.5 text-[11px] leading-relaxed text-ink-soft">
        {MBTI_SOURCE_NOTE}
        <br />
        MBTI는 선호 경향을 나눠 보는 도구이며 능력·신앙·인격을 재는 잣대가 아닙니다. 신뢰도를
        두고 학계에서 논란이 이어져 온 도구이기도 하니, 사람을 규정하는 데 쓰지 않습니다.
      </p>
    </>
  );
}

/** 에니어그램 원문 카드 — 두 갈래가 같은 렌더를 쓴다 (/enneagram과 같은 소스·렌더러) */
function EnneagramCard({ typeNo }: { typeNo: number }) {
  const guide = enneagramGuides.find((g) => g.typeNo === typeNo);
  const items: AccordionItem[] = useMemo(
    () =>
      guide
        ? guide.sections.map((sec, i) => ({
            id: `${guide.typeNo}-${i}`,
            title: sec.label,
            hint: sec.items[0],
            content: <GuideItems items={sec.items} />,
          }))
        : [],
    [guide],
  );
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-zion-700">
            <HeartHandshake size={14} /> 에니어그램 {typeNo}번 유형
          </div>
          <h2 className="mt-0.5 text-[19px] font-bold text-zion-900">{guide?.title}</h2>
        </div>
        <Link
          to="/enneagram"
          className="shrink-0 rounded-lg border border-zion-200 px-3 py-1.5 text-[12px] font-semibold text-zion-700 transition hover:border-zion-400"
        >
          9유형 전체 보기
        </Link>
      </div>
      {guide ? (
        <Accordion items={items} resetKey={String(guide.typeNo)} />
      ) : (
        <p className="text-[12px] leading-relaxed text-ink-soft">이 유형의 원문을 찾지 못했습니다.</p>
      )}
    </Card>
  );
}

export function TendencyAnalysis() {
  const session = useSession();
  const { tendencyAxisSettings, setTendencyAxesOff } = useStore();
  const divisions = visibleDivisions(session, DIVISIONS);

  const students = useMemo(() => STUDENTS.filter((s) => divisions.includes(s.division)), [divisions]);

  /** 지파 설정 — 끈 축 목록. 없으면 전부 켬 */
  const offAxes = useMemo(
    () => new Set(tendencyAxisSettings.find((t) => t.tribe === session.tribe)?.off ?? []),
    [tendencyAxisSettings, session.tribe],
  );
  const axisOn = (a: TendencyAxis) => !offAxes.has(a);
  function toggleAxis(a: TendencyAxis) {
    const next = new Set(offAxes);
    if (next.has(a)) next.delete(a);
    else next.add(a);
    setTendencyAxesOff(session.tribe, [...next], session.name);
  }

  /** 갈래 — 수강생으로 보기 / 직접 골라 보기 */
  const [mode, setMode] = useState<"student" | "manual">("student");

  /* ── 수강생으로 보기 ── */
  const [division, setDivision] = useState<string>("");
  const [studentKey, setStudentKey] = useState<string>("");
  const inDivision = useMemo(
    () => (division ? students.filter((s) => s.division === division) : []),
    [students, division],
  );
  const profile = studentKey ? STUDENT_PROFILES[studentKey] : undefined;
  const enneagram = profile ? enneagramGuides.find((g) => g.typeNo === profile.enneagramType) : undefined;

  /* ── 직접 골라 보기 — 저장하지 않는 즉시 조회 값 ── */
  const [manualType, setManualType] = useState<number | "">("");
  const [mbtiPicks, setMbtiPicks] = useState<(MbtiLetter | null)[]>([null, null, null, null]);
  const [manualShape, setManualShape] = useState<ShapeType | "">("");
  const [manualSaju, setManualSaju] = useState<SajuElement | "">("");
  const manualPrefs = MBTI_PREFERENCES.filter((p) => mbtiPicks.includes(p.letter));
  const sajuGuide = TEMPERAMENT_GUIDES.find((g) => g.name.includes("오행"));
  const sajuItem = manualSaju ? sajuGuide?.items.find((i) => i.title.startsWith(manualSaju)) : undefined;

  const allOff = AXES.every((a) => !axisOn(a));

  return (
    <div>
      <PageHeader
        crumb="수강생 관리 도우미"
        title="수강생 성향 분석"
        desc="수강생을 고르거나 유형 값을 직접 골라, 그 유형의 원문 자료를 한 화면에서 봅니다."
      />

      <p className="mb-4 flex items-start gap-1.5 rounded-lg bg-gold-100/60 p-3 text-[12px] leading-relaxed text-ink">
        <CircleAlert size={15} className="mt-0.5 shrink-0 text-gold-700" />
        <span>
          여기 실린 것은 <strong className="font-bold">참고 원문</strong>입니다. 사람을 유형에
          가두거나 신앙·인격·심리를 확정 판정하는 도구가 아닙니다. 아래 수강생 이름은{" "}
          <strong className="font-bold">시범용 가상 인물</strong>입니다.
        </span>
      </p>

      {/* 분석 축 제외 (2026-08-22 리드 지시) — 지파 단위 설정. 폼 값이라 SegmentedTabs를 쓰지 않는다 */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[12px] font-semibold text-ink">
            분석 항목 — {session.tribe} 지파 설정
          </span>
          {AXES.map((a) => (
            <label key={a} className="flex cursor-pointer items-center gap-1.5 text-[12.5px] text-ink">
              <input
                type="checkbox"
                checked={axisOn(a)}
                onChange={() => toggleAxis(a)}
                className="h-3.5 w-3.5 accent-zion-700"
              />
              {TENDENCY_AXIS_LABELS[a]}
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
          끄면 이 지파의 성향 분석 화면에서 그 항목이 빠집니다. 기록된 값이 지워지는 것은 아닙니다.
        </p>
      </Card>

      <div className="mb-4">
        <SegmentedTabs
          label="보기 갈래"
          value={mode}
          onChange={setMode}
          items={[
            { id: "student", label: "수강생으로 보기" },
            { id: "manual", label: "직접 골라 보기" },
          ]}
        />
      </div>

      {allOff ? (
        <Card>
          <p className="py-10 text-center text-[13px] leading-relaxed text-ink-soft">
            분석 항목이 전부 꺼져 있습니다. 위의 분석 항목에서 볼 항목을 켭니다.
          </p>
        </Card>
      ) : mode === "student" ? (
        <>
          <Card className="mb-4">
            <div className="grid gap-3 sm:max-w-2xl sm:grid-cols-2">
              <div>
                <label htmlFor="tendency-division" className="mb-1 block text-[12px] font-semibold text-ink">
                  분반
                </label>
                <select
                  id="tendency-division"
                  value={division}
                  onChange={(e) => {
                    setDivision(e.target.value);
                    setStudentKey(""); // 분반을 바꾸면 고른 사람은 그 분반 밖이 된다
                  }}
                  className="w-full rounded-lg border border-zion-100 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500"
                >
                  <option value="">분반을 고르세요</option>
                  {divisions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="tendency-student" className="mb-1 block text-[12px] font-semibold text-ink">
                  수강생
                </label>
                <select
                  id="tendency-student"
                  value={studentKey}
                  disabled={!division}
                  onChange={(e) => setStudentKey(e.target.value)}
                  className="w-full rounded-lg border border-zion-100 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500 disabled:cursor-not-allowed disabled:bg-zion-50 disabled:text-ink-soft"
                >
                  <option value="">{division ? "수강생을 고르세요" : "분반을 먼저 고릅니다"}</option>
                  {inDivision.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {!profile ? (
            <Card>
              <p className="py-10 text-center text-[13px] leading-relaxed text-ink-soft">
                위에서 수강생을 고르면 기록된 성향과 유형별 원문이 나옵니다.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3 max-sm:grid-cols-2">
                {axisOn("mbti") && <StatTile label="MBTI" value={profile.mbti} />}
                {axisOn("enneagram") && (
                  <StatTile
                    label="에니어그램"
                    value={`${profile.enneagramType}번`}
                    sub={enneagram?.title}
                    accent
                  />
                )}
                {axisOn("shape") && <StatTile label="도형" value={profile.shapeType} />}
                {axisOn("saju") && <StatTile label="오행" value={profile.sajuElement} />}
              </div>

              {/*
                MBTI 안내 (2026-08-18 리드 지시 「MBTI 관리도 나오게」).
                ⚠️ 에니어그램은 **리드가 준 원문**이고 이쪽은 **바깥 자료를 정리한 것**이라,
                출처와 한계를 함께 낸다. 신학부 원문을 받으면 그때 갈아 끼운다.
              */}
              {axisOn("mbti") && (
                <Card>
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="text-[14px] font-bold text-zion-900">
                      MBTI {profile.mbti} — 말을 걸 때
                    </div>
                    <span className="text-[11px] text-ink-soft">참고 자료 · 확정 판정이 아닙니다</span>
                  </div>
                  <p className="mb-3 text-[12px] leading-relaxed text-ink-soft">
                    네 글자를 축마다 나눠 봅니다. 사람을 유형에 가두는 것이 아니라, 그 사람에게 말이
                    닿는 방식을 찾아보는 자리입니다.
                  </p>
                  <MbtiPrefCards prefs={preferencesOf(profile.mbti)} />
                </Card>
              )}

              {axisOn("enneagram") && <EnneagramCard typeNo={profile.enneagramType} />}

              <Card>
                <h2 className="mb-1 text-[15px] font-bold text-zion-900">그 밖의 성향 참고</h2>
                <p className="mb-3 text-[12px] leading-relaxed text-ink-soft">
                  MBTI · 기질 · 핵심 감정 · 오행은 <strong className="font-semibold">일반에 알려진
                  참고 지식의 요약</strong>입니다(내부 교육 원문이 아닙니다). 에니어그램만 내부
                  원문이 실려 있습니다.
                </p>
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
                  이름 · 나이 · 분반 · 연락처는 이 화면에 나오지 않습니다. 소속은 {COHORT.tribe}지파 ·{" "}
                  {COHORT.church} · {COHORT.cohort}까지만 씁니다.
                </p>
              </Card>
            </div>
          )}
        </>
      ) : (
        /*
          직접 골라 보기 (2026-08-22 리드 지시 — 「사명자가 데이터를 수동 입력해 즉각 결과」).
          고른 값은 저장하지 않는다 — 기록 계약을 만들지 않는 즉시 조회 도구다.
        */
        <div className="space-y-4">
          <Card>
            <p className="mb-3 text-[12px] leading-relaxed text-ink-soft">
              유형 값을 직접 고르면 그 유형의 자료가 바로 나옵니다. 여기서 고른 값은 어디에도
              저장되지 않습니다 — 수강생 기록에 남기려면 수강생 상세에서 적습니다.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {axisOn("enneagram") && (
                <div>
                  <label htmlFor="manual-enneagram" className="mb-1 block text-[12px] font-semibold text-ink">
                    에니어그램
                  </label>
                  <select
                    id="manual-enneagram"
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-lg border border-zion-100 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500"
                  >
                    <option value="">유형을 고르세요</option>
                    {enneagramGuides.map((g) => (
                      <option key={g.typeNo} value={g.typeNo}>
                        {g.typeNo}번 — {g.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {axisOn("shape") && (
                <div>
                  <label htmlFor="manual-shape" className="mb-1 block text-[12px] font-semibold text-ink">
                    도형
                  </label>
                  <select
                    id="manual-shape"
                    value={manualShape}
                    onChange={(e) => setManualShape(e.target.value as ShapeType | "")}
                    className="w-full rounded-lg border border-zion-100 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500"
                  >
                    <option value="">유형을 고르세요</option>
                    {SHAPE_TYPES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {axisOn("saju") && (
                <div>
                  <label htmlFor="manual-saju" className="mb-1 block text-[12px] font-semibold text-ink">
                    오행 (사주)
                  </label>
                  <select
                    id="manual-saju"
                    value={manualSaju}
                    onChange={(e) => setManualSaju(e.target.value as SajuElement | "")}
                    className="w-full rounded-lg border border-zion-100 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500"
                  >
                    <option value="">원소를 고르세요</option>
                    {SAJU_ELEMENTS.map((el) => (
                      <option key={el} value={el}>
                        {el}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {axisOn("mbti") && (
              <div className="mt-4">
                <div className="mb-1 text-[12px] font-semibold text-ink">MBTI — 축마다 하나를 고릅니다</div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {MBTI_PAIRS.map((pair, i) => (
                    <div key={pair.join("")} className="flex gap-1">
                      {pair.map((letter) => {
                        const pref = MBTI_PREFERENCES.find((p) => p.letter === letter)!;
                        const on = mbtiPicks[i] === letter;
                        return (
                          <button
                            key={letter}
                            type="button"
                            aria-pressed={on}
                            onClick={() =>
                              setMbtiPicks((prev) =>
                                prev.map((v, j) => (j === i ? (v === letter ? null : letter) : v)),
                              )
                            }
                            className={
                              "flex-1 rounded-lg border px-2 py-1.5 text-[12px] font-semibold transition " +
                              (on
                                ? "border-zion-800 bg-zion-800 text-white"
                                : "border-zion-200 bg-white text-zion-700 hover:bg-zion-50")
                            }
                          >
                            {pref.label}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {axisOn("mbti") && manualPrefs.length > 0 && (
            <Card>
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <div className="text-[14px] font-bold text-zion-900">
                  MBTI {mbtiPicks.filter(Boolean).join("")} — 말을 걸 때
                </div>
                <span className="text-[11px] text-ink-soft">참고 자료 · 확정 판정이 아닙니다</span>
              </div>
              <MbtiPrefCards prefs={manualPrefs} />
            </Card>
          )}

          {axisOn("enneagram") && manualType !== "" && <EnneagramCard typeNo={manualType} />}

          {axisOn("shape") && manualShape !== "" && (
            <Card>
              <div className="mb-1 text-[14px] font-bold text-zion-900">도형 — {manualShape}</div>
              <p className="text-[12px] leading-relaxed text-ink-soft">
                도형 유형의 원문 가이드는 아직 저장소에 없습니다. 원문이 오면 이 자리에 그대로
                실립니다 — 사이트가 지어서 채우지 않습니다.
              </p>
            </Card>
          )}

          {axisOn("saju") && sajuItem && (
            <Card>
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <div className="text-[14px] font-bold text-zion-900">오행 — {sajuItem.title}</div>
                <span className="text-[11px] text-ink-soft">일반 참고 지식 · 내부 원문 아님</span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-ink">{sajuItem.body}</p>
              {sajuGuide?.note && (
                <p className="mt-2 border-t border-zion-100 pt-2 text-[11px] leading-relaxed text-ink-soft">
                  {sajuGuide.note}
                </p>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
