import { useState, type ReactNode, type FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Sparkles, UserCircle2, StickyNote, PencilLine } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { studentScopeLabel, canEditCohortRecord } from "../lib/permissions";
import { STUDENTS, COHORT, WEEKLY_RATES } from "../content/cohort-mock";
import {
  STUDENT_PROFILES,
  DIVISION_EVANGELISTS,
  FEEDBACK_KIND_LABELS,
  FAITH_STATUS_LABELS,
  fellowshipOf,
  type Fellowship,
  type FeedbackKind,
  type CourseLevel,
} from "../content/student-profiles";
import { attendanceStreak, readSignals } from "../lib/attendance-signals";
import { gradeOf, GRADE_LABELS, SUGGESTIONS, growthScore, type Grade } from "../lib/student-grade";
import { weekdayOf } from "../lib/date-format";
import { CHECKLIST_STANDARDS, type ChecklistGroup } from "../content/checklist-standards";
import { Accordion } from "../components/Accordion";
import { PageHeader, Card } from "./common";

const FELLOWSHIPS: Fellowship[] = ["청년회", "장년회", "부녀회", "자문회"];
const GRADES: Grade[] = ["A", "B", "C", "D"];
const RING_STROKE: Record<Grade, string> = {
  A: "stroke-emerald-500",
  B: "stroke-amber-500",
  C: "stroke-violet-500",
  D: "stroke-red-500",
};

const COURSE_LEVELS: CourseLevel[] = ["초등", "중등", "고등"];

/**
 * 수강생 정보 상세 — 참고 화면(상세보드 1.png) 구조를 그대로 옮긴 개인별 전체 페이지.
 *
 * `/students-dashboard`의 목록·요약 패널에서 화살표(›)를 누르면 여기로 온다.
 *
 * ⚠️ 상단 상태 표시줄(소속·등급·유월·신앙 상태)은 **기본정보로 자동 지정되지만, 해당
 * 기수의 강사·전도사가 직접 바꿀 수 있다**(2026-08-09 확정). 자동값은 출결·나이·성별에서
 * 나오고(소속은 `fellowshipOf`, 등급은 `student-grade.ts`), 사람이 덮어쓰면
 * `StudentStatusOverride`(`student-profiles.ts`, `store.tsx`가 저장)가 자동값을 대신한다.
 * ⚠️ 이것은 **AI 확정 판정이 아니라 담당자의 운영 판단**이다 — 불변식 4가 막는 것은
 * AI가 신앙·인격을 스스로 판정하는 것이지, 사람이 분류를 다시 매기는 것이 아니다.
 * 권한은 `canEditCohortRecord`와 같다 — 해당 기수의 강사·전도사만 바꿀 수 있다.
 *
 * ⚠️ 생년월일·전화·주소는 2026-08-09 리드 지시로 넣었다 — 실제 마팔 연동이 아니라
 * `student-profiles.ts`의 시범 값(가상 인물)이다. 실연동 시 이 자리가 마팔 데이터로 바뀐다(C-7).
 */
export function StudentDetailPage() {
  const session = useSession();
  const {
    studentStatusOverrides,
    setStudentStatus,
    studentFeedback,
    addStudentFeedback,
    feedbackEdits,
    deletedFeedbackIds,
    updateStudentFeedback,
    deleteStudentFeedback,
    checklistProgress,
    toggleChecklistItem,
  } = useStore();
  const { key } = useParams<{ key: string }>();
  const decodedKey = key ? decodeURIComponent(key) : "";
  const student = STUDENTS.find((s) => s.key === decodedKey);

  if (!student) {
    return (
      <div>
        <PageHeader crumb="수강생 관리 도우미" title="수강생을 찾을 수 없습니다" />
        <Link
          to="/students-dashboard"
          className="flex w-fit items-center gap-1 rounded-lg border border-zion-100 bg-white px-3 py-1.5 text-[12px] font-semibold text-zion-700 transition hover:bg-zion-50"
        >
          <ArrowLeft size={13} /> 수강생관리 도우미로 돌아가기
        </Link>
      </div>
    );
  }

  const p = STUDENT_PROFILES[student.key];
  const cohortKey = `${COHORT.tribe}|${COHORT.church}|${COHORT.cohort}`;
  const canEdit = canEditCohortRecord(session, cohortKey);
  const override = studentStatusOverrides.find((o) => o.studentKey === student.key);

  const fellowship = override?.fellowship ?? fellowshipOf(p.age, p.gender);
  const grade = override?.grade ?? gradeOf(student);
  const yuwol = override?.faithType ?? (p.faithType === "비오픈" ? "비오픈" : "오픈");
  const faithStatus = override?.faithStatus ?? p.faithStatus;
  const note = override?.note ?? p.note;
  // 이력 목록 — 지금 값은 안 넣는다(위에 이미 보이므로). "최초"(씨앗 값)를 맨 끝에 덧붙인다:
  // override가 처음 생길 때는 store가 씨앗을 몰라 이력에 못 넣으므로 여기서 항상 붙여 준다
  const noteHistory: { text: string; label: string }[] = [
    ...(override?.noteHistory ?? []).map((h) => ({ text: h.text, label: `${h.editedBy} · ${h.editedAt.slice(0, 10)}` })),
    { text: p.note, label: "최초" },
  ];
  const availableTime = override?.availableTime ?? p.availableTime;
  const interests = override?.interests ?? p.interests;
  const score = growthScore(student);
  const streak = attendanceStreak(student.recentWeeks);
  const cohortAvgRate = Math.round(
    STUDENTS.reduce((sum, s) => sum + s.attendanceRate, 0) / STUDENTS.length,
  );
  // ⚠️ 개인 주간 출석률 이력은 저장돼 있지 않다 — recentWeeks(최근 8주 마크)에서 누적 비율을
  // 거꾸로 계산한 참고용 추정이다. 기수 쪽은 WEEKLY_RATES 실측값을 그대로 쓴다
  const individualSeries = [...student.recentWeeks]
    .reverse()
    .map((_, idx, arr) => {
      const upto = arr.slice(0, idx + 1);
      const present = upto.filter((w) => w.mark === "present" || w.mark === "makeupDone").length;
      return Math.round((present / upto.length) * 100);
    });
  const cohortSeries = WEEKLY_RATES.map((r) => r.rate);
  // 씨앗 기록(RAW.feedback, 고정 id 부여) + 담당자가 직접 남긴 기록(store)을 합치고,
  // 수정분(feedbackEdits)을 덮어쓴 뒤 지워진 것(deletedFeedbackIds)을 뺀다
  const seedFeedback = p.feedback.map((f, i) => ({ ...f, id: `seed-${student.key}-${i}` }));
  const myFeedback = studentFeedback.filter((f) => f.studentKey === student.key);
  const editsById = Object.fromEntries(feedbackEdits.map((e) => [e.id, e]));
  const combinedFeedback = [...myFeedback, ...seedFeedback]
    .filter((f) => !deletedFeedbackIds.includes(f.id))
    .map((f) => ({ ...f, ...editsById[f.id] }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const counselEntries = combinedFeedback.filter((f) => f.kind === "counsel");
  const makeupDoneCount = student.recentWeeks.filter((w) => w.mark === "makeupDone").length;
  const hasMakeupPending = student.recentWeeks.some((w) => w.mark === "makeupPending");
  const penalty = Math.round(
    student.recentWeeks.length ? student.attendanceRate - score : 0,
  );

  // 강점 · 주의 포인트는 지어낸 성격 평가가 아니라 실제 관찰 기록에서 그대로 뽑는다(불변식 4)
  const strengths: string[] = [];
  if (student.attendanceRate >= 90) strengths.push(`출석률 ${student.attendanceRate}% — 꾸준한 참여`);
  if (streak >= 4) strengths.push(`최근 ${streak}주 연속 출석`);
  if (!hasMakeupPending && makeupDoneCount > 0) strengths.push("보강을 미루지 않고 이행함");
  if (counselEntries.length > 0) strengths.push("상담 기록을 통해 꾸준히 소통 중");
  if (strengths.length === 0) strengths.push("아직 뚜렷한 강점 관찰 기록이 없습니다");
  const cautions = readSignals(student).signals.map((s) => s.text);
  if (cautions.length === 0) cautions.push("관찰된 주의 신호가 없습니다");

  // ⚠️ 과거 AI 점수를 기록해 둔 적이 없어, 지금 점수로 거꾸로 추정한 참고용 3개월 추세다 —
  // 실제 이력이 아니다. 원본 이력이 쌓이면 이 자리를 실측값으로 바꾼다
  const trend = [Math.max(0, score - 22), Math.max(0, score - 10), score];

  return (
    <div>
      <PageHeader
        crumb="수강생 관리 도우미"
        title={`${student.name} — 수강생 정보 상세`}
        desc={`${COHORT.tribe} 지파 · ${COHORT.church} · ${student.division} — 조회 범위: ${studentScopeLabel(session)}`}
        action={
          <Link
            to="/students-dashboard"
            className="flex items-center gap-1 rounded-lg border border-zion-100 bg-white px-3 py-1.5 text-[12px] font-semibold text-zion-700 transition hover:bg-zion-50"
          >
            <ArrowLeft size={13} /> 목록으로
          </Link>
        }
      />

      {/* 상태 표시줄 — 기본값은 자동 지정, 해당 기수 강사·전도사는 직접 바꿀 수 있다 */}
      <Card className="mb-4">
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <PillGroup
            label="소속"
            value={fellowship}
            options={FELLOWSHIPS}
            editable={canEdit}
            onSelect={(v) => setStudentStatus(student.key, { fellowship: v }, session.name, session.roleCode)}
          />
          <PillGroup
            label="상태"
            value={grade}
            labels={GRADE_LABELS}
            options={GRADES}
            editable={canEdit}
            onSelect={(v) => setStudentStatus(student.key, { grade: v }, session.name, session.roleCode)}
          />
          <PillGroup
            label="유월"
            value={yuwol}
            options={["오픈", "비오픈"]}
            editable={canEdit}
            onSelect={(v) => setStudentStatus(student.key, { faithType: v }, session.name, session.roleCode)}
          />
          <PillGroup
            label="신앙"
            value={faithStatus}
            labels={FAITH_STATUS_LABELS}
            options={["신앙", "무신앙", "기타"]}
            editable={canEdit}
            onSelect={(v) => setStudentStatus(student.key, { faithStatus: v }, session.name, session.roleCode)}
          />
        </div>
        {canEdit ? (
          <p className="mt-3 border-t border-zion-100 pt-2.5 text-[11px] leading-relaxed text-ink-soft">
            기본정보로 자동 지정된 값입니다. 눌러서 직접 바꿀 수 있습니다.
            {override && (
              <>
                {" "}
                최근 변경: {override.updatedBy} · {override.updatedAt.slice(0, 10)}
              </>
            )}
          </p>
        ) : (
          <p className="mt-3 flex items-center gap-1 border-t border-zion-100 pt-2.5 text-[11px] leading-relaxed text-ink-soft">
            <PencilLine size={11} /> 기본정보로 자동 지정된 값입니다. 해당 기수의 강사·전도사만 바꿀 수
            있습니다.
            {override && (
              <>
                {" "}
                최근 변경: {override.updatedBy} · {override.updatedAt.slice(0, 10)}
              </>
            )}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1.1fr_0.8fr_0.9fr_1.3fr]">
        <Card>
          <SectionTitle>기본정보</SectionTitle>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zion-100 text-[18px] font-bold text-zion-700">
              {student.name[0]}
            </div>
            <div className="min-w-0 text-[12.5px]">
              <div className="font-bold text-ink">{student.name}</div>
              <div className="text-ink-soft">
                {p.gender} ({p.age}세)
              </div>
              <div className="text-ink-soft">{p.birthDate}</div>
            </div>
          </div>
          <dl className="mt-3 space-y-1.5 text-[12px]">
            <Row label="분반" value={student.division} />
            <Row label="담당 전도사" value={DIVISION_EVANGELISTS[student.division] ?? "-"} />
          </dl>
          <div className="mt-3 border-t border-zion-100 pt-2.5">
            <div className="flex flex-wrap gap-1.5">
              <Tag>MBTI {p.mbti}</Tag>
              <Tag>에니어그램 {p.enneagramType}유형</Tag>
              <Tag>도형 {p.shapeType}</Tag>
              <Tag>사주 {p.sajuElement}</Tag>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle>연락처</SectionTitle>
          <dl className="space-y-1.5 text-[12px]">
            <Row label="전화" value={p.phone} />
            <Row label="주소" value={p.address} />
          </dl>
          <div className="mt-3 border-t border-zion-100 pt-2.5">
            <SectionTitle icon={UserCircle2}>인교섬</SectionTitle>
            <dl className="space-y-1.5 text-[12px]">
              <Row label="인도자" value={p.guideName} />
              <Row label="교사" value={p.teacherName} />
              <Row label="섬김이" value={p.helperName} />
            </dl>
          </div>
        </Card>

        <Card>
          <SectionTitle>이성친구 · 교제기간 · 연락 가능시간대 · 관심사</SectionTitle>
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <div>
              <div className="mb-1 text-[11px] text-ink-soft">이성친구 여부</div>
              <span
                className={
                  "inline-block rounded-full border px-2.5 py-1 text-[11px] font-medium " +
                  (p.hasPartner
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700")
                }
              >
                {p.hasPartner ? "있음" : "없음"}
              </span>
            </div>
            <div>
              <div className="mb-1 text-[11px] text-ink-soft">교제 기간</div>
              <div className="font-semibold text-ink">{p.materialPeriodMonths}개월</div>
            </div>
            <div className="col-span-2">
              <div className="mb-1 text-[11px] text-ink-soft">연락 가능 시간대</div>
              <EditableText
                value={availableTime}
                canEdit={canEdit}
                onSave={(v) => setStudentStatus(student.key, { availableTime: v }, session.name, session.roleCode)}
              />
            </div>
            <div className="col-span-2">
              <div className="mb-1 text-[11px] text-ink-soft">관심사 · 메모</div>
              <EditableText
                value={interests}
                canEdit={canEdit}
                onSave={(v) => setStudentStatus(student.key, { interests: v }, session.name, session.roleCode)}
              />
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-2.5 flex items-center justify-between">
            <SectionTitle>출석 개요</SectionTitle>
            <Link
              to="/cohort?tab=attendance"
              className="text-[11px] font-semibold text-zion-700 hover:underline"
            >
              기수 출석현황 →
            </Link>
          </div>
          <dl className="space-y-1.5 text-[12px]">
            <Row label="출석률" value={`${student.attendanceRate}% (${student.presentCount}/${student.totalSessions}회)`} />
            <Row
              label="최근 출석"
              value={student.lastAttended ? `${student.lastAttended} (${weekdayOf(student.lastAttended)})` : "기록 없음"}
            />
          </dl>

          <div className="mt-3 rounded-lg border border-zion-100 p-3">
            <div className="mb-1.5 text-[12px] font-semibold text-ink-soft">개인 출석률 · 기수 평균 비교</div>
            <svg viewBox="0 0 120 44" preserveAspectRatio="none" className="h-12 w-full">
              <polyline
                points={cohortSeries
                  .map((v, i) => `${(i / (cohortSeries.length - 1)) * 120},${42 - (v / 100) * 38}`)
                  .join(" ")}
                fill="none"
                vectorEffect="non-scaling-stroke"
                className="stroke-zion-300"
                strokeWidth="2"
                strokeDasharray="4 3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points={individualSeries
                  .map((v, i) => `${(i / (individualSeries.length - 1)) * 120},${42 - (v / 100) * 38}`)
                  .join(" ")}
                fill="none"
                vectorEffect="non-scaling-stroke"
                className="stroke-zion-700"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {individualSeries.map((v, i) => (
                <circle
                  key={i}
                  cx={(i / (individualSeries.length - 1)) * 120}
                  cy={42 - (v / 100) * 38}
                  r="0"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  className={i >= individualSeries.length - streak ? "stroke-amber-500" : "stroke-zion-700"}
                />
              ))}
            </svg>
            <div className="mt-1 flex justify-between text-[9.5px] text-ink-soft">
              <span>{student.name} · {student.attendanceRate}%(실선)</span>
              <span>{COHORT.cohort} · {cohortAvgRate}%(점선)</span>
            </div>
            {streak > 0 && (
              <div className="mt-1 flex items-center gap-1 text-[9.5px] text-ink-soft">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" /> 연속 출석 {streak}회
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <SectionTitle icon={Sparkles}>AI 성장 분석 상세</SectionTitle>
        <p className="mb-3 text-[11px] leading-relaxed text-ink-soft">
          출결 참여도를 바탕으로 한 참고 수치·제안입니다. 신앙·인격을 확정 판정하지 않으며,
          연락 여부는 담당자가 정합니다(불변식 4). AI 분석·텔레그램 연동 자료는 이후 이 자리에 이어집니다.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="flex flex-col items-center justify-center rounded-lg border border-zion-100 p-3">
            <div className="mb-1 text-[12px] font-semibold text-ink-soft">AI 성장 종합 분석</div>
            <div className="relative flex h-24 w-24 items-center justify-center">
              <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" strokeWidth="10" className="stroke-zion-100" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  strokeWidth="10"
                  strokeLinecap="round"
                  className={RING_STROKE[grade]}
                  strokeDasharray={`${(score / 100) * 2 * Math.PI * 42} ${2 * Math.PI * 42}`}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-[22px] font-bold leading-none text-zion-800">{score}</span>
                <span className="text-[10px] text-ink-soft">/100</span>
              </div>
            </div>
            <div className="mt-1 text-[11px] text-ink-soft">성장 점수</div>
          </div>

          <div className="rounded-lg border border-zion-100 p-3">
            <div className="mb-1.5 text-[12px] font-semibold text-emerald-700">강점</div>
            <ul className="space-y-1 text-[11.5px] leading-relaxed text-ink">
              {strengths.slice(0, 3).map((s, i) => (
                <li key={i} className="flex gap-1">
                  <span className="text-emerald-600">·</span> {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-zion-100 p-3">
            <div className="mb-1.5 text-[12px] font-semibold text-amber-700">주의 포인트</div>
            <ul className="space-y-1 text-[11.5px] leading-relaxed text-ink">
              {cautions.slice(0, 3).map((s, i) => (
                <li key={i} className="flex gap-1">
                  <span className="text-amber-600">·</span> {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-zion-100 p-3">
            <div className="mb-1.5 text-[12px] font-semibold text-zion-800">추천 액션</div>
            <ul className="space-y-1 text-[11.5px] leading-relaxed text-ink">
              {SUGGESTIONS[grade].map((sug) => (
                <li key={sug} className="flex gap-1">
                  <span className="text-zion-600">·</span> {sug}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-zion-100 p-3">
            <div className="mb-1.5 text-[12px] font-semibold text-ink-soft">성장 추세 (참고용 추정)</div>
            <svg viewBox="0 0 120 44" preserveAspectRatio="none" className="h-12 w-full">
              <polyline
                points={trend.map((v, i) => `${(i / (trend.length - 1)) * 120},${42 - (v / 100) * 38}`).join(" ")}
                fill="none"
                vectorEffect="non-scaling-stroke"
                className="stroke-zion-700"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {trend.map((v, i) => (
                <circle
                  key={i}
                  cx={(i / (trend.length - 1)) * 120}
                  cy={42 - (v / 100) * 38}
                  r="0"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  className="stroke-zion-700"
                />
              ))}
            </svg>
            <div className="mt-1 flex justify-between text-[9.5px] text-ink-soft">
              <span>2개월 전 · {trend[0]}</span>
              <span>1개월 전 · {trend[1]}</span>
              <span>이번 달 · {trend[2]}</span>
            </div>
          </div>
        </div>

        <p className="mt-3 text-[10.5px] leading-relaxed text-ink-soft">
          ⚠️ 성장 추세는 과거 점수를 기록해 둔 적이 없어 지금 점수를 바탕으로 추정한 참고용
          값입니다 — 실제 이력이 아닙니다. 원본 이력이 쌓이면 실측값으로 바꿉니다.
          {penalty > 0 && ` (관찰 신호 가중치 -${penalty} 반영됨)`}
        </p>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LevelChecklistCard
            progress={checklistProgress.filter((c) => c.studentKey === student.key)}
            canEdit={canEdit}
            onToggle={(level, groupNo, qIndex, week) =>
              toggleChecklistItem(student.key, level, groupNo, qIndex, session.name, session.roleCode, week)
            }
          />
        </div>

        <MemoTimelineCard
          note={note}
          noteHistory={noteHistory}
          canEdit={canEdit}
          onSaveNote={(v) => setStudentStatus(student.key, { note: v }, session.name, session.roleCode)}
          entries={combinedFeedback}
          onAdd={({ kind, date, subject, text }) =>
            addStudentFeedback({
              studentKey: student.key,
              kind,
              date,
              subject,
              text,
              by: session.name,
              byRole: session.roleCode,
            })
          }
          onUpdate={(id, patch) => updateStudentFeedback(id, patch)}
          onDelete={(id) => deleteStudentFeedback(id)}
        />
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-ink-soft">
        시범 목업 데이터(가상 인물)입니다. 원문 개인정보는 담당 범위 밖으로 반출되지 않으며, 이
        화면의 값은 출결 계약(`Student`)과 분리된 시연용 프로필(`student-profiles.ts`)에서 옵니다.
      </p>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon?: typeof Sparkles; children: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center gap-1.5 text-[13px] font-bold text-zion-900">
      {Icon && <Icon size={14} />}
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="shrink-0 text-ink-soft">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-ink">{value}</dd>
    </div>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-zion-100 bg-zion-50 px-2.5 py-1 text-[11px] font-medium text-zion-700">
      {children}
    </span>
  );
}

/** 짧은 텍스트 한 줄 — `canEdit`이면 연필 아이콘을 눌러 바로 고칠 수 있다 */
function EditableText({
  value,
  canEdit,
  onSave,
  multiline,
}: {
  value: string;
  canEdit: boolean;
  onSave: (v: string) => void;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5">
        {multiline ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            autoFocus
            className="w-full resize-none rounded-lg border border-zion-200 bg-white px-2 py-1.5 text-[12px] leading-relaxed outline-none focus:border-zion-500"
          />
        ) : (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            className="w-full rounded-lg border border-zion-200 bg-white px-2 py-1 text-[12px] outline-none focus:border-zion-500"
          />
        )}
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => {
              onSave(draft.trim());
              setEditing(false);
            }}
            className="rounded-lg bg-zion-700 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-zion-600"
          >
            저장
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(value);
              setEditing(false);
            }}
            className="rounded-lg px-2.5 py-1 text-[11px] text-ink-soft transition hover:bg-zion-100"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-2">
      <span className="whitespace-pre-line">{value}</span>
      {canEdit && (
        <button
          type="button"
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
          aria-label="수정"
          className="shrink-0 text-ink-soft transition hover:text-zion-700"
        >
          <PencilLine size={12} />
        </button>
      )}
    </div>
  );
}

/**
 * 상단 상태 표시줄 한 그룹 — 현재 값만 강조하고, 나머지는 흐리게 둔다.
 * `editable`이면 다른 값을 눌러 바로 바꿀 수 있다(해당 기수 강사·전도사만).
 */
function PillGroup<T extends string>({
  label,
  value,
  options,
  labels,
  editable,
  onSelect,
}: {
  label: string;
  value: T;
  options: T[];
  labels?: Record<T, string>;
  editable: boolean;
  onSelect: (v: T) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold text-ink-soft">{label}</div>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => {
          const active = o === value;
          const cls =
            "rounded-full border px-2.5 py-1 text-[11px] font-medium transition " +
            (active
              ? "border-zion-700 bg-zion-700 text-white"
              : "border-zion-100 bg-white text-ink-soft" + (editable ? " hover:border-zion-300 hover:text-zion-700" : ""));
          return editable ? (
            <button key={o} type="button" onClick={() => onSelect(o)} className={cls}>
              {labels ? labels[o] : o}
            </button>
          ) : (
            <span key={o} className={cls}>
              {labels ? labels[o] : o}
            </span>
          );
        })}
      </div>
    </div>
  );
}

const MEMO_KINDS: FeedbackKind[] = ["makeup", "counsel", "note", "memo"];

/**
 * 특이사항 · 전체 메모 — 보강·상담·특이사항·메모를 한 곳에서 기록하고, 종류별로 걸러 본다.
 * 위쪽 `note`(표에 짧게 뜨는 한 줄)는 그대로 두고, 그 아래는 날짜 있는 기록 목록이다.
 */
function MemoTimelineCard({
  note,
  noteHistory,
  canEdit,
  onSaveNote,
  entries,
  onAdd,
  onUpdate,
  onDelete,
}: {
  note: string;
  noteHistory: { text: string; label: string }[];
  canEdit: boolean;
  onSaveNote: (v: string) => void;
  entries: { id: string; kind: FeedbackKind; date: string; subject?: string; text: string; by: string; checklistItems?: number[] }[];
  onAdd: (input: { kind: FeedbackKind; date: string; subject: string; text: string }) => void;
  onUpdate: (id: string, patch: { date: string; subject: string; text: string; checklistItems: number[] }) => void;
  onDelete: (id: string) => void;
}) {
  const [filter, setFilter] = useState<FeedbackKind | "all">("all");
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>("note");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd({ kind, date, subject: subject.trim(), text: text.trim() });
    setSubject("");
    setText("");
    setOpen(false);
  }

  const shown = filter === "all" ? entries : entries.filter((e) => e.kind === filter);

  return (
    <Card>
      <div className="mb-2.5 flex items-center justify-between">
        <SectionTitle icon={StickyNote}>특이사항 · 전체 메모</SectionTitle>
        {canEdit && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-[11px] font-semibold text-zion-700 hover:underline"
          >
            {open ? "취소" : "+ 기록"}
          </button>
        )}
      </div>

      <div className="mb-1 rounded-lg bg-zion-50 p-2.5 text-[12.5px] leading-relaxed text-ink">
        <EditableText value={note} canEdit={canEdit} onSave={onSaveNote} multiline />
      </div>
      <button
        type="button"
        onClick={() => setHistoryOpen((v) => !v)}
        className="mb-3 text-[11px] font-semibold text-zion-700 hover:underline"
      >
        {historyOpen ? "이전 특이사항 숨기기" : `이전 특이사항 보기 (${noteHistory.length}건)`}
      </button>
      {historyOpen && (
        <ul className="mb-3 space-y-1.5 border-l-2 border-zion-100 pl-3">
          {noteHistory.map((h, i) => (
            <li key={i} className="text-[11.5px] leading-relaxed">
              <span className="text-ink-soft">{h.label}</span>
              <p className="text-ink">{h.text}</p>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <form onSubmit={submit} className="mb-3 space-y-1.5 rounded-lg border border-zion-100 bg-zion-50 p-2.5">
          <div className="flex gap-1.5">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as FeedbackKind)}
              aria-label="종류"
              className="rounded-lg border border-zion-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-zion-500"
            >
              {MEMO_KINDS.map((k) => (
                <option key={k} value={k}>
                  {FEEDBACK_KIND_LABELS[k]}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="날짜"
              className="rounded-lg border border-zion-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-zion-500"
            />
          </div>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="과목 · 주제(선택)"
            aria-label="과목·주제"
            className="w-full rounded-lg border border-zion-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-zion-500"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="간단 메모"
            aria-label="간단 메모"
            rows={2}
            className="w-full resize-none rounded-lg border border-zion-200 bg-white px-2 py-1.5 text-[11.5px] leading-relaxed outline-none focus:border-zion-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-zion-700 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-zion-600"
          >
            저장
          </button>
        </form>
      )}

      <div className="mb-2.5 flex flex-wrap gap-1">
        {(["all", ...MEMO_KINDS] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition " +
              (filter === k
                ? "border-zion-700 bg-zion-700 text-white"
                : "border-zion-100 bg-white text-ink-soft hover:border-zion-300")
            }
          >
            {k === "all" ? "전체" : FEEDBACK_KIND_LABELS[k]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="py-3 text-center text-[12px] text-ink-soft">기록이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((f) => (
            <FeedbackItem
              key={f.id}
              entry={f}
              kindLabel={FEEDBACK_KIND_LABELS[f.kind]}
              canEdit={canEdit}
              onUpdate={(patch) => onUpdate(f.id, patch)}
              onDelete={() => onDelete(f.id)}
              showChecklist={f.kind === "makeup" || f.kind === "counsel"}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

/**
 * 초·중·고 단계 체크리스트 — 레벨 탭을 오가며 항목을 직접 체크한다.
 * 중등·고등은 아직 항목 원본이 없어 "자료 대기" 상태로 둔다(리드가 추후 제공 예정).
 */
const SECTION_GRADE_TONE: Record<"A" | "B" | "C", string> = {
  A: "text-emerald-700",
  B: "text-amber-700",
  C: "text-ink-soft",
};

function LevelChecklistCard({
  progress,
  canEdit,
  onToggle,
}: {
  progress: { level: CourseLevel; groupNo: number; qIndex: number; checked: boolean; week?: number }[];
  canEdit: boolean;
  onToggle: (level: CourseLevel, groupNo: number, qIndex: number, week?: number) => void;
}) {
  const [level, setLevel] = useState<CourseLevel>("초등");
  const [recordWeek, setRecordWeek] = useState(1);
  const standard = CHECKLIST_STANDARDS[level];
  const levelProgress = progress.filter((p) => p.level === level);

  const isChecked = (groupNo: number, qIndex: number) =>
    levelProgress.some((p) => p.groupNo === groupNo && p.qIndex === qIndex && p.checked);
  const weekOf = (groupNo: number, qIndex: number) =>
    levelProgress.find((p) => p.groupNo === groupNo && p.qIndex === qIndex)?.week;

  const totalQuestions = standard.groups.reduce((sum, g) => sum + g.questions.length, 0);
  const doneCount = standard.groups.reduce(
    (sum, g) => sum + g.questions.filter((_, qi) => isChecked(g.no, qi)).length,
    0,
  );
  const pct = totalQuestions ? Math.round((doneCount / totalQuestions) * 100) : 0;

  function sectionScore(section: { groupNos: number[]; gradeA: number; gradeB: number }) {
    const groups = standard.groups.filter((g) => section.groupNos.includes(g.no));
    const total = groups.reduce((sum, g) => sum + g.questions.length, 0);
    const done = groups.reduce(
      (sum, g) => sum + g.questions.filter((_, qi) => isChecked(g.no, qi)).length,
      0,
    );
    const grade: "A" | "B" | "C" = done >= section.gradeA ? "A" : done >= section.gradeB ? "B" : "C";
    return { done, total, grade };
  }

  const accordionItems = standard.groups.map((g: ChecklistGroup) => {
    const groupDone = g.questions.filter((_, qi) => isChecked(g.no, qi)).length;
    return {
      id: `${level}-${g.no}`,
      title: `${g.no}. ${g.label}`,
      hint: `${groupDone}/${g.questions.length} 체크`,
      content: (
        <div className="space-y-1">
          {g.questions.map((q, qi) => {
            const checked = isChecked(g.no, qi);
            const week = weekOf(g.no, qi);
            return (
              <button
                key={qi}
                type="button"
                disabled={!canEdit}
                onClick={() => onToggle(level, g.no, qi, standard.weekly ? recordWeek : undefined)}
                className={
                  "flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition " +
                  (canEdit ? "hover:bg-zion-50" : "cursor-default")
                }
              >
                <span
                  className={
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition " +
                    (checked ? "border-zion-700 bg-zion-700 text-white" : "border-zion-200 text-transparent")
                  }
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={
                      "block whitespace-pre-line text-[12px] leading-relaxed " +
                      (checked ? "text-ink-soft" : "text-ink")
                    }
                  >
                    {q}
                  </span>
                </span>
                {standard.weekly && checked && week && (
                  <span className="shrink-0 rounded-full bg-zion-100 px-1.5 py-0.5 text-[10px] font-medium text-zion-700">
                    {week}주차
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ),
    };
  });

  return (
    <Card>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <SectionTitle>단계 항목 체크리스트</SectionTitle>
        <span className="rounded-full border border-zion-100 bg-zion-50 px-2.5 py-1 text-[11px] font-medium text-ink-soft">
          단계목표 완성 {doneCount}/{totalQuestions} · {pct}%
        </span>
      </div>

      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-zion-100">
        <div className="h-full rounded-full bg-zion-600 transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="mb-3 flex gap-1 rounded-lg bg-zion-100 p-1" role="tablist" aria-label="단계">
        {COURSE_LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={level === l}
            onClick={() => setLevel(l)}
            className={
              "flex-1 rounded-md px-3 py-1.5 text-[12px] font-semibold transition " +
              (level === l ? "bg-white text-zion-900 shadow-sm" : "text-zion-600 hover:text-zion-800")
            }
          >
            {l}
          </button>
        ))}
      </div>

      {standard.goal && (
        <div className="mb-3 rounded-lg bg-zion-50 px-3 py-2 text-[12px] text-zion-800">
          <span className="font-semibold">목표</span> · {standard.goal}
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-1.5">
        {standard.sections.map((s, i) => {
          const { done, total, grade } = sectionScore(s);
          return (
            <span
              key={i}
              className="rounded-full border border-zion-100 bg-white px-2.5 py-1 text-[11px] text-ink-soft"
            >
              {s.groupNos.join("·")}번 구간 {done}/{total} ·{" "}
              <span className={"font-semibold " + SECTION_GRADE_TONE[grade]}>{grade}</span>
            </span>
          );
        })}
      </div>

      {standard.weekly && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-soft">
          <span>지금 체크하면 남길 주차</span>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: standard.weekCount ?? 6 }, (_, i) => i + 1).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setRecordWeek(w)}
                className={
                  "rounded-full px-2 py-0.5 text-[11px] font-medium transition " +
                  (recordWeek === w ? "bg-zion-700 text-white" : "bg-zion-50 text-ink-soft hover:bg-zion-100")
                }
              >
                {w}주차
              </button>
            ))}
          </div>
        </div>
      )}

      <Accordion items={accordionItems} resetKey={level} defaultOpenFirst={false} compact />
    </Card>
  );
}

/** 단계 항목 다중 선택 — 보강·상담 기록에 어떤 항목을 다뤘는지 남긴다 */
function ChecklistPicker({ selected, onToggle }: { selected: number[]; onToggle: (no: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {CHECKLIST_STANDARDS.초등.groups.map((item) => {
        const active = selected.includes(item.no);
        return (
          <button
            key={item.no}
            type="button"
            onClick={() => onToggle(item.no)}
            className={
              "rounded-full border px-2 py-0.5 text-[10.5px] font-medium transition " +
              (active ? "border-zion-700 bg-zion-700 text-white" : "border-zion-200 bg-white text-ink-soft hover:border-zion-300")
            }
          >
            {item.no}. {item.label}
          </button>
        );
      })}
    </div>
  );
}

/** 기록 한 건 — 읽기 모드와 수정 모드를 오간다. `canEdit`이면 수정·삭제 버튼이 뜬다 */
function FeedbackItem({
  entry,
  canEdit,
  onUpdate,
  onDelete,
  kindLabel,
  showChecklist = false,
}: {
  entry: { id: string; date: string; subject?: string; text: string; by: string; checklistItems?: number[] };
  canEdit: boolean;
  onUpdate: (patch: { date: string; subject: string; text: string; checklistItems: number[] }) => void;
  onDelete: () => void;
  /** 읽기 전용 표시 접두어(예: "보강") — 수정 폼의 과목·주제 값에는 섞이지 않는다 */
  kindLabel?: string;
  /** 초등 단계 항목 선택기를 보여줄지 — 보강·상담 카드에서만 켠다 */
  showChecklist?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(entry.date);
  const [subject, setSubject] = useState(entry.subject ?? "");
  const [text, setText] = useState(entry.text);
  const [checklistItems, setChecklistItems] = useState<number[]>(entry.checklistItems ?? []);

  function save(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onUpdate({ date, subject: subject.trim(), text: text.trim(), checklistItems });
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="rounded-lg border border-zion-200 bg-zion-50 p-2.5">
        <form onSubmit={save} className="space-y-1.5">
          <div className="flex gap-1.5">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="날짜"
              className="rounded-lg border border-zion-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-zion-500"
            />
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="과목 · 주제"
              aria-label="과목·주제"
              className="min-w-0 flex-1 rounded-lg border border-zion-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-zion-500"
            />
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            aria-label="간단 메모"
            className="w-full resize-none rounded-lg border border-zion-200 bg-white px-2 py-1.5 text-[11.5px] leading-relaxed outline-none focus:border-zion-500"
          />
          {showChecklist && (
            <div>
              <div className="mb-1 text-[10.5px] text-ink-soft">다룬 초등 단계 항목</div>
              <ChecklistPicker
                selected={checklistItems}
                onToggle={(no) =>
                  setChecklistItems((cur) => (cur.includes(no) ? cur.filter((n) => n !== no) : [...cur, no]))
                }
              />
            </div>
          )}
          <div className="flex gap-1.5">
            <button
              type="submit"
              className="rounded-lg bg-zion-700 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-zion-600"
            >
              저장
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg px-3 py-1.5 text-[11px] text-ink-soft transition hover:bg-zion-100"
            >
              취소
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-zion-100 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {(kindLabel || entry.subject) && (
            <div className="mb-0.5 text-[11px] font-semibold text-zion-700">
              {kindLabel}
              {kindLabel && entry.subject ? " · " : ""}
              {entry.subject}
            </div>
          )}
          <p className="text-[12.5px] leading-relaxed text-ink">{entry.text}</p>
          {entry.checklistItems && entry.checklistItems.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {entry.checklistItems.map((no) => {
                const item = CHECKLIST_STANDARDS.초등.groups.find((c) => c.no === no);
                return (
                  <span key={no} className="rounded-full bg-zion-50 px-1.5 py-0.5 text-[10px] text-zion-700">
                    {no}. {item?.label ?? ""}
                  </span>
                );
              })}
            </div>
          )}
          <p className="mt-1 text-[11px] text-ink-soft">
            {entry.by} · {entry.date} ({weekdayOf(entry.date)})
          </p>
        </div>
        {canEdit && (
          <div className="flex shrink-0 gap-2 text-[11px]">
            <button type="button" onClick={() => setEditing(true)} className="font-semibold text-zion-700 hover:underline">
              수정
            </button>
            <button type="button" onClick={onDelete} className="font-semibold text-red-600 hover:underline">
              삭제
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
