import { useMemo, useState } from "react";
import { CircleAlert, HeartHandshake } from "lucide-react";
import { useSession } from "../lib/auth";
import { visibleDivisions } from "../lib/permissions";
import { COHORT, DIVISIONS, STUDENTS } from "../content/cohort-mock";
import { STUDENT_PROFILES } from "../content/student-profiles";
import { enneagramGuides } from "../content/enneagram-guides";
import { TEMPERAMENT_GUIDES } from "../content/temperament-guides";
import { GuideItems } from "./Enneagram";
import { Accordion, type AccordionItem } from "../components/Accordion";
import { Link } from "../components/TransitionLink";
import { PageHeader, Card, StatTile } from "./common";

/**
 * 수강생 성향 분석 (2026-08-13 개편) — 수강생을 고르면 **기록된 에니어그램 유형의 원문**을
 * 한눈에 읽기 좋게 보여 준다.
 *
 * ⚠️ **종전에는 관찰문을 적어 규칙 엔진(`advice-engine.ts`)이 조언을 만들고, 그것을 외부
 * GPT 프롬프트로 이어 보내는 구조였다.** 리드 지시로 그 구조를 걷어냈다 — 쓰는 곳이 이
 * 화면 하나뿐이었던 `advice-engine.ts` · `AdvicePanel.tsx` · `advice-corpus.ts`도 함께
 * 지웠다(되살릴 때는 git 이력에서 꺼낸다). 지금 이 화면이 하는 일은 **원문을 찾아 주는
 * 것**뿐이고, 그 원문은 `/enneagram`(성향 참고)과 같은 소스(`enneagram-guides.ts`)다.
 *
 * 불변식 4(AI가 신앙·인격·심리를 확정 판정하지 않음)는 여전히 지킨다 — 이 화면은 **기록된
 * 유형의 원문을 그대로** 보여 줄 뿐, 관찰문으로 유형을 추정하거나 새 문장을 만들지 않는다.
 */
export function TendencyAnalysis() {
  const session = useSession();
  const divisions = visibleDivisions(session, DIVISIONS);

  const students = useMemo(() => STUDENTS.filter((s) => divisions.includes(s.division)), [divisions]);

  /**
   * 분반을 먼저 고르고 그 안에서 수강생을 고른다 (2026-08-18 리드 지시).
   * 종전에는 스무 명이 한 목록에 이어 붙어 「김하늘 · 1분반」처럼 분반을 글로 읽어야 했다 —
   * 담당자는 분반으로 사람을 떠올리므로 그 순서대로 좁혀 들어가는 편이 맞는다.
   */
  const [division, setDivision] = useState<string>("");
  const [studentKey, setStudentKey] = useState<string>("");
  const inDivision = useMemo(
    () => (division ? students.filter((s) => s.division === division) : []),
    [students, division],
  );
  const profile = studentKey ? STUDENT_PROFILES[studentKey] : undefined;
  const enneagram = profile ? enneagramGuides.find((g) => g.typeNo === profile.enneagramType) : undefined;

  const guideItems: AccordionItem[] = useMemo(
    () =>
      enneagram
        ? enneagram.sections.map((sec, i) => ({
            id: `${enneagram.typeNo}-${i}`,
            title: sec.label,
            hint: sec.items[0],
            content: <GuideItems items={sec.items} />,
          }))
        : [],
    [enneagram],
  );

  return (
    <div>
      <PageHeader
        crumb="수강생 관리 도우미"
        title="수강생 성향 분석"
        desc="수강생을 고르면 기록된 성향과, 그 에니어그램 유형의 성장과정·단계향상 방법·초중고 관리팁·보강 성구를 한 화면에서 봅니다."
      />

      <p className="mb-4 flex items-start gap-1.5 rounded-lg bg-gold-100/60 p-3 text-[12px] leading-relaxed text-ink">
        <CircleAlert size={15} className="mt-0.5 shrink-0 text-gold-700" />
        <span>
          여기 실린 것은 <strong className="font-bold">참고 원문</strong>입니다. 사람을 유형에
          가두거나 신앙·인격·심리를 확정 판정하는 도구가 아닙니다. 아래 수강생 이름은{" "}
          <strong className="font-bold">시범용 가상 인물</strong>입니다.
        </span>
      </p>

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 sm:max-w-2xl">
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
            <StatTile label="MBTI" value={profile.mbti} />
            <StatTile
              label="에니어그램"
              value={`${profile.enneagramType}번`}
              sub={enneagram?.title}
              accent
            />
            <StatTile label="도형" value={profile.shapeType} />
            <StatTile label="오행" value={profile.sajuElement} />
          </div>

          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-[12px] font-semibold text-zion-700">
                  <HeartHandshake size={14} /> 에니어그램 {profile.enneagramType}번 유형
                </div>
                <h2 className="mt-0.5 text-[19px] font-bold text-zion-900">{enneagram?.title}</h2>
              </div>
              <Link
                to="/enneagram"
                className="shrink-0 rounded-lg border border-zion-200 px-3 py-1.5 text-[12px] font-semibold text-zion-700 transition hover:border-zion-400"
              >
                9유형 전체 보기
              </Link>
            </div>

            {enneagram ? (
              <Accordion items={guideItems} resetKey={String(enneagram.typeNo)} />
            ) : (
              <p className="text-[12px] leading-relaxed text-ink-soft">
                이 유형의 원문을 찾지 못했습니다.
              </p>
            )}
          </Card>

          <Card>
            <h2 className="mb-1 text-[15px] font-bold text-zion-900">그 밖의 성향 참고</h2>
            <p className="mb-3 text-[12px] leading-relaxed text-ink-soft">
              MBTI · 기질 · 핵심 감정 · 오행은 <strong className="font-semibold">일반에 알려진 참고
              지식의 요약</strong>입니다(내부 교육 원문이 아닙니다). 에니어그램만 위처럼 내부
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
    </div>
  );
}
