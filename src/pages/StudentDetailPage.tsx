import { useState, type ReactNode, type FormEvent } from "react";
import { useParams } from "react-router-dom";
// 화면 전환 효과가 조용히 빠지지 않게 여기서 가져온다 (CLAUDE.md 화면 규칙)
import { Link } from "../components/TransitionLink";
import { Portal } from "../components/Portal";
import { ArrowLeft, Sparkles, StickyNote, PencilLine, Check, X, Search, Camera } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { studentScopeLabel, canEditCohortRecord } from "../lib/permissions";
import { STUDENTS, COHORT } from "../content/cohort-mock";
import {
  STUDENT_PROFILES,
  DIVISION_EVANGELISTS,
  FEEDBACK_KIND_LABELS,
  FAITH_STATUS_LABELS,
  FELLOWSHIP_LABELS,
  ENROLLMENT_STATUS_DEFAULT,
  fellowshipOf,
  iljuOf,
  ohaengOf,
  birthCalendarOf,
  SAJU_ELEMENTS,
  SIXTY_GAPJA,
  type Fellowship,
  type FeedbackKind,
  type CourseLevel,
  type MaritalStatus,
  type SajuElement,
  type EnrollmentStatus,
  type RegistrationType,
  type ShapeType,
} from "../content/student-profiles";
import { attendanceStreak, readSignals } from "../lib/attendance-signals";
import { gradeOf, GRADE_LABELS, SUGGESTIONS, growthScore, type Grade } from "../lib/student-grade";
import { weekdayOf } from "../lib/date-format";
import { CHECKLIST_STANDARDS } from "../content/checklist-standards";
import { PageHeader, Card } from "./common";

const FELLOWSHIPS: Fellowship[] = ["청년회", "장년회", "부녀회", "자문회"];
const REGISTRATION_TYPES: RegistrationType[] = ["신규", "재수강", "재입교"];
/** 상태가 "수강"일 때만 고를 수 있는 등급 — "중단"은 탈락일 때 자동으로만 붙는다(2026-08-13) */
const GRADES_WHILE_ENROLLED: Grade[] = ["A", "B", "D"];
const ENROLLMENT_STATUSES: EnrollmentStatus[] = ["수강", "탈락", "유급"];
/** MBTI 16유형 — 항목이 많아 드롭다운으로 고른다(2026-08-13 리드 지시) */
const MBTI_TYPES = [
  "ISTJ", "ISFJ", "INFJ", "INTJ",
  "ISTP", "ISFP", "INFP", "INTP",
  "ESTP", "ESFP", "ENFP", "ENTP",
  "ESTJ", "ESFJ", "ENFJ", "ENTJ",
];
/** 에니어그램 1~9유형 — 9개라 드롭다운으로 고른다 */
const ENNEAGRAM_TYPES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
/** 도형 성향 — 4개뿐이라 다른 칩과 같은 방식(MiniPillSelect)으로 고른다 */
const SHAPE_TYPES: ShapeType[] = ["동그라미", "세모", "네모", "에스"];
/**
 * 전도사 선택지 — 2026-08-13부터 "분반"이 아니라 "전도사"를 먼저 고른다. 전도사 한 명이
 * 분반 하나씩을 맡으므로(`DIVISION_EVANGELISTS`) 전도사를 고르면 분반이 자동으로 정해진다.
 */
const EVANGELIST_OPTIONS: string[] = Object.values(DIVISION_EVANGELISTS);
/** 전도사 이름 → 분반 — `DIVISION_EVANGELISTS`를 뒤집어서 만든다 */
const DIVISION_BY_EVANGELIST: Record<string, string> = Object.fromEntries(
  Object.entries(DIVISION_EVANGELISTS).map(([division, evangelist]) => [evangelist, division]),
);
/**
 * 프로필 사진 업로드(2026-08-13 추가) — 원본을 그대로 저장하지 않는다. 로컬스토리지 용량이
 * 얼마 안 돼(브라우저마다 5~10MB) 사진 몇 장이면 다 찬다 — 정사각형 최대 200px, JPEG로
 * 줄여 저장한다. 새 패키지를 안 깔고 캔버스만 쓴다(이 저장소의 xlsx.ts와 같은 방침).
 */
function resizeImageToDataUrl(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("파일을 읽을 수 없습니다"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("이미지를 열 수 없습니다"));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("캔버스를 열 수 없습니다"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const MARITAL_STATUSES: MaritalStatus[] = ["미혼", "결혼", "이혼", "사별"];
const PARTNER_OPTIONS: ("있음" | "없음")[] = ["있음", "없음"];
const PARENT_LIVING_OPTIONS: ("동거" | "독립")[] = ["동거", "독립"];
const CHILDREN_LIVING_OPTIONS: ("동거" | "비동거")[] = ["동거", "비동거"];
/**
 * 등급 고리 색. **E까지 있어야 한다** — 등급은 A·B·D·E 네 단계이고(`student-grade.ts`,
 * 2026-08-13부터 "집중"(C)을 없앴다), E가 빠지면 그 등급 수강생에서 색이 비어 고리가 사라진다.
 */
const RING_STROKE: Record<Grade, string> = {
  A: "stroke-emerald-500",
  B: "stroke-amber-500",
  D: "stroke-orange-500",
  E: "stroke-red-500",
};
/** 오행 색 — 전통 오방색을 참고한 표시용 배색일 뿐, 별도 의미 판정에 쓰지 않는다 */
/**
 * 오행 뱃지 색 (2026-08-11 머지에서 손봤다).
 *
 * 종전에는 `bg-amber-500`·`bg-zinc-400` 같은 **밝은 면에 흰 글자**를 얹어 대비가
 * 2.13까지 떨어졌다 — 노란 동그라미 위 흰 숫자는 눈으로도 안 읽힌다.
 * **밝은 면 + 어두운 글자**(`text-zion-950`)로 뒤집었다. NEW 뱃지가 쓰는 짝과 같다.
 *
 * ⚠️ 300단계를 고른 데는 이유가 있다 — 다크 팔레트에서 이 단계는 뒤집지 않으므로
 * 어두운 화면에서도 밝은 면으로 남고, `zion-950` 글자와의 대비가 그대로 유지된다.
 * 600·700단계는 다크에서 **글자용으로 밝혀 놓았으므로** 배경에 쓰면 안 된다.
 */
const ELEMENT_BG: Record<SajuElement, string> = {
  목: "bg-emerald-300",
  화: "bg-rose-300",
  토: "bg-amber-300",
  금: "bg-zinc-300",
  수: "bg-blue-300",
};

const COURSE_LEVELS: CourseLevel[] = ["초등", "중등", "고등"];

/**
 * 수강생 정보 상세 — 참고 화면(상세보드 1.png) 구조를 그대로 옮긴 개인별 전체 페이지.
 *
 * `/students`의 목록·요약 패널에서 화살표(›)를 누르면 여기로 온다.
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
export function StudentDetailPage({
  studentKey,
  embedded = false,
  mode: controlledMode,
  onModeChange,
}: {
  /**
   * 팝업에서 열 때 넘기는 수강생 — 없으면 주소(`/students/:key`)에서 읽는다.
   * ⚠️ **이 두 props를 지우지 않는다.** 같은 화면을 페이지와 팝업 양쪽에서 쓰는 장치다
   * (`StudentDetailModal`이 이걸로 이 컴포넌트를 품는다). 복제하면 한쪽만 고쳐진다.
   */
  studentKey?: string;
  /** 팝업 안에서는 페이지 제목·「목록으로」를 숨긴다 (팝업이 이미 제목과 닫기를 갖는다) */
  embedded?: boolean;
  /**
   * 보기⇄편집 상태를 부모가 대신 들고 있을 때 넘긴다(2026-08-13 추가) — 팝업 머리의
   * 「전체 화면」 옆에 「수정」 버튼을 두려면 `StudentDetailModal`이 상태를 쥐고 있어야
   * 한다. 안 넘기면(전체 페이지 경로) 이 컴포넌트가 알아서 관리한다.
   */
  mode?: "view" | "edit";
  onModeChange?: (mode: "view" | "edit") => void;
} = {}) {
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
    setChecklistItemScore,
  } = useStore();
  /**
   * 이 페이지는 원래 「보기 + 고치기」가 한 화면에 섞여 있었다. 2026-08-13 리드 지시로
   * 갈랐다 — 처음엔 결과만 보여주는 「보기」 상태로 열리고, 「수정」을 눌러야 고칠 수 있는
   * 「편집」 상태로 바뀐다. 아래 `student`가 없을 때의 이른 반환보다 먼저 선언해야
   * 한다 — 훅은 조건부로 부르면 안 된다(Rules of Hooks).
   */
  const [internalMode, setInternalMode] = useState<"view" | "edit">("view");
  const mode = controlledMode ?? internalMode;
  const setMode = onModeChange ?? setInternalMode;
  const { key } = useParams<{ key: string }>();
  const decodedKey = studentKey ?? (key ? decodeURIComponent(key) : "");
  const student = STUDENTS.find((s) => s.key === decodedKey);

  if (!student) {
    return (
      <div>
        <PageHeader crumb="수강생 관리 도우미" title="수강생을 찾을 수 없습니다" />
        <Link
          viewTransition
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
  /**
   * `rawCanEdit`은 진짜 권한(해당 기수 강사·전도사인지), `canEdit`은 거기에 지금
   * 「편집」 상태(`mode`, 위에서 선언)인지까지 곱한 값이다 — 아래 모든 PillGroup·EditableText
   * 등은 그대로 `canEdit`을 받으므로 각 자리를 따로 안 고쳐도 이 값 하나로 전부 잠긴다.
   */
  const rawCanEdit = canEditCohortRecord(session, cohortKey);
  const canEdit = rawCanEdit && mode === "edit";
  const override = studentStatusOverrides.find((o) => o.studentKey === student.key);

  // 나이는 소속 자동판정(fellowshipOf)에도 쓰이므로 먼저 계산한다 — 나이를 고치면 소속 기본값도 따라온다
  const age = override?.age ?? p.age;
  const fellowship = override?.fellowship ?? fellowshipOf(age, p.gender);
  const registrationType = override?.registrationType ?? p.registrationType;
  const division = override?.division ?? student.division;
  const grade = override?.grade ?? gradeOf(student);
  const enrollmentStatus = override?.enrollmentStatus ?? ENROLLMENT_STATUS_DEFAULT;
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
  const guideMemo = override?.guideMemo ?? "";
  // guideMemo는 note와 달리 씨앗값이 없다 — 처음엔 "최초" 항목 없이 빈 이력으로 시작한다
  const guideMemoHistory: { text: string; label: string }[] = (override?.guideMemoHistory ?? []).map((h) => ({
    text: h.text,
    label: `${h.editedBy} · ${h.editedAt.slice(0, 10)}`,
  }));
  const hasPartner = override?.hasPartner ?? p.hasPartner;
  const materialPeriod = override?.materialPeriod ?? `${p.materialPeriodMonths}개월`;
  const livesWithParents = override?.livesWithParents ?? p.livesWithParents;
  const maritalStatus = override?.maritalStatus ?? p.maritalStatus;
  const livesWithChildren = override?.livesWithChildren ?? p.livesWithChildren;
  // 성향 — 편집 상태에서 고를 수 있게 했다(2026-08-13 추가)
  const mbti = override?.mbti ?? p.mbti;
  const enneagramType = override?.enneagramType ?? p.enneagramType;
  const shapeType = override?.shapeType ?? p.shapeType;
  /**
   * 인교섬·나이·생년월일·전화·주소 — 원래 마팔에서 오지만 중간에 바뀌기도 해 편집 상태에서
   * 직접 고쳐 쓸 수 있게 했다(2026-08-13 추가)
   */
  const guideName = override?.guideName ?? p.guideName;
  const teacherName = override?.teacherName ?? p.teacherName;
  const helperName = override?.helperName ?? p.helperName;
  const birthDate = override?.birthDate ?? p.birthDate;
  const phone = override?.phone ?? p.phone;
  const address = override?.address ?? p.address;
  // 프로필 사진 — 씨앗 값이 없다. 없으면 이니셜 원으로 대신 보여준다(2026-08-13 추가)
  const photoUrl = override?.photoUrl;
  // 사주 — 명리학 참고(2026-08-13). 일주는 육십갑자 중에서, 오행분포는 다섯 원소 개수를 각각 고른다.
  // ⚠️ 일주 기본값은 (덮어썼을 수 있는) birthDate에서 뽑는다 — 생년월일을 고치면 같이 따라온다
  const ilju = override?.ilju ?? iljuOf(birthDate);
  const ohaeng = override?.ohaeng ?? ohaengOf(p.sajuElement);
  const score = growthScore(student);
  const streak = attendanceStreak(student.recentWeeks);
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
      {/*
        목록으로 — 스크롤해도 항상 보이게 고정한다(2026-08-13 요청). 앱 공통 헤더(top-0, z-20)
        바로 아래에 붙는다.
        ⚠️ 팝업으로 열렸을 때는 숨긴다 — 팝업이 이미 닫기를 갖고 있고, 그 안에서 「목록으로」를
        누르면 팝업 뒤에서 화면만 바뀌어 뭐가 일어났는지 알 수 없다.
      */}
      {!embedded && (
        <PageHeader
          crumb="수강생 관리 도우미"
          title={`${student.name} — 수강생 정보 상세`}
          desc={`${COHORT.tribe} 지파 · ${COHORT.church} · ${student.division} — 조회 범위: ${studentScopeLabel(session)}`}
        />
      )}

      {/*
        목록으로 · 수정⇄완료 — 한 줄에 묶어서 같이 스크롤을 따라다니게 한다(2026-08-13 요청:
        "스크롤해서 내려가도 수정 버튼이 따라다니고, 위로 올라가는 것도 따라가게").
        ⚠️ 팝업으로 열렸을 때는 「목록으로」를 숨긴다 — 팝업이 이미 닫기를 갖고 있고, 그 안에서
        누르면 팝업 뒤에서 화면만 바뀌어 뭐가 일어났는지 알 수 없다.
        권한이 없는 사람에게는 「수정」 버튼 자체를 안 보여준다 — 눌러도 안 되는 버튼을 두지 않는다.
        ⚠️ 팝업(embedded)일 때는 이 줄을 통째로 숨긴다 — 「수정」은 이제 팝업 머리의
        「전체 화면」 옆에 뜬다(2026-08-13 요청, `StudentDetailModal`이 `mode`를 대신 쥐고 있다).
      */}
      {/*
        ⚠️ 이 줄 자체에도 배경을 준다(2026-08-13 버그 수정) — 버튼 각각에만 `bg-white/95`를
        주니 두 버튼 사이 빈틈으로 아래 카드 내용이 스크롤돼 올라와 글자가 겹쳐 보였다
        (전체화면에서 아래로 스크롤하면 「목록으로」·「완료」가 인교섬 카드와 겹치던 문제).
      */}
      {!embedded && (
        <div className="sticky top-14 z-10 -mx-1 mb-4 flex items-center justify-between gap-2 bg-surface/95 px-1 py-1 backdrop-blur">
          <Link
            viewTransition
            to="/students-dashboard"
            className="flex items-center gap-1 rounded-lg border border-zion-100 bg-white/95 px-3 py-1.5 text-[12px] font-semibold text-zion-700 shadow-sm backdrop-blur transition hover:bg-zion-50"
          >
            <ArrowLeft size={13} /> 목록으로
          </Link>
          {rawCanEdit &&
            (mode === "view" ? (
              <button
                type="button"
                onClick={() => setMode("edit")}
                className="flex items-center gap-1 rounded-lg border-2 border-zion-300 bg-white/95 px-3 py-1.5 text-[12px] font-bold text-zion-700 shadow-sm backdrop-blur transition hover:border-zion-500 hover:bg-zion-50"
              >
                <PencilLine size={13} /> 수정
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode("view")}
                className="flex items-center gap-1 rounded-lg bg-zion-700 px-3 py-1.5 text-[12px] font-bold text-white shadow-sm transition hover:bg-zion-600"
              >
                <Check size={13} /> 완료
              </button>
            ))}
        </div>
      )}

      {/*
        전도사 선택 — 제일 상단에 따로 박스를 뺐다(2026-08-13 리드 지시).
        전도사 한 명당 분반이 하나라 전도사를 고르면 분반이 자동으로 따라온다
        (`DIVISION_BY_EVANGELIST`) — 분반을 따로 고르지 않는다.
      */}
      <Card className="mb-4">
        {mode === "view" ? (
          // 보기 상태는 다른 항목처럼 SummaryRow로 통일한다(2026-08-13 리드 지시)
          <SummaryRow label="전도사" value={DIVISION_EVANGELISTS[division] ?? "-"} />
        ) : (
          <PillGroup
            label="전도사"
            value={DIVISION_EVANGELISTS[division] ?? "-"}
            options={EVANGELIST_OPTIONS}
            editable={canEdit}
            onSelect={(v) => {
              const d = DIVISION_BY_EVANGELIST[v];
              if (d) setStudentStatus(student.key, { division: d }, session.name, session.roleCode);
            }}
          />
        )}
      </Card>

      {/*
        기본정보·성향·인교섬·혼인상태 네 박스를 **한 grid**로 묶는다(2026-08-13 리드 지시 —
        "네 박스끼리 세로줄 가로줄이 맞게"). 줄을 둘로 나눠 각각 flex를 걸었더니 줄마다
        기준 폭이 달라 세로줄(칸 경계)이 안 맞았다 — grid 하나로 열 너비를 통째로 공유한다.
        (2:1 비율을 걸었던 xl:grow는 이 요청으로 없앴다 — 네 칸 모두 같은 폭이 우선이다.)
      */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch">
        <Card className="flex h-full flex-col">
          {/*
            이름·생년월일·전화·주소 — 아래 소속·등급 요약과 같은 SummaryRow 격자로 통일한다
            (2026-08-13 리드 지시: 가로 나열·세로 나열이 섞여 있던 것을 한 모양으로 맞춘다).
          */}
          <div className="flex items-start gap-3">
            {mode === "view" ? (
              photoUrl ? (
                <img
                  src={photoUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zion-50 text-[18px] font-bold text-zion-700">
                  {student.name[0]}
                </div>
              )
            ) : (
              /* 편집 상태에서만 사진을 등록·교체·삭제할 수 있다(2026-08-13 요청) */
              <div className="flex shrink-0 flex-col items-center gap-1">
                <label className="relative block h-14 w-14 cursor-pointer">
                  {photoUrl ? (
                    <img src={photoUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zion-50 text-[18px] font-bold text-zion-700">
                      {student.name[0]}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-zion-700 text-white">
                    <Camera size={11} />
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    aria-label="프로필 사진 등록"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      try {
                        const dataUrl = await resizeImageToDataUrl(file, 200);
                        setStudentStatus(student.key, { photoUrl: dataUrl }, session.name, session.roleCode);
                      } catch {
                        // 실패하면 조용히 두고 기존 사진(또는 이니셜)을 그대로 보여준다
                      }
                    }}
                  />
                </label>
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => setStudentStatus(student.key, { photoUrl: "" }, session.name, session.roleCode)}
                    className="text-[10px] font-semibold text-ink-soft hover:underline"
                  >
                    삭제
                  </button>
                )}
              </div>
            )}
            {mode === "view" ? (
              <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
                <SummaryRow label="이름" value={`${student.name} ${p.gender}(${age}세)`} />
                <SummaryRow label="생년월일" value={`${birthDate} (${birthCalendarOf(birthDate)})`} />
                <SummaryRow label="전화" value={phone} />
                <SummaryRow label="주소" value={address} />
              </dl>
            ) : (
              /*
                나이·생년월일·전화·주소 편집(2026-08-13 추가) — 원래 마팔 자료에서 오지만
                중간에 바뀌기도 해 담당자가 직접 고쳐 쓸 수 있게 했다.
              */
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 text-[12px]">
                <div>
                  <div className="mb-1 text-[11px] font-semibold text-ink-soft">나이</div>
                  <input
                    type="number"
                    min={0}
                    value={age}
                    onChange={(e) =>
                      setStudentStatus(
                        student.key,
                        { age: Math.max(0, Number(e.target.value) || 0) },
                        session.name,
                        session.roleCode,
                      )
                    }
                    aria-label="나이"
                    className="w-full rounded-lg border border-zion-200 bg-white px-2 py-1 text-[12px] outline-none focus:border-zion-500"
                  />
                </div>
                <div>
                  <div className="mb-1 text-[11px] font-semibold text-ink-soft">생년월일</div>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) =>
                      setStudentStatus(student.key, { birthDate: e.target.value }, session.name, session.roleCode)
                    }
                    aria-label="생년월일"
                    className="w-full rounded-lg border border-zion-200 bg-white px-2 py-1 text-[12px] outline-none focus:border-zion-500"
                  />
                </div>
                <div>
                  <div className="mb-1 text-[11px] font-semibold text-ink-soft">전화</div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) =>
                      setStudentStatus(student.key, { phone: e.target.value }, session.name, session.roleCode)
                    }
                    aria-label="전화"
                    className="w-full rounded-lg border border-zion-200 bg-white px-2 py-1 text-[12px] outline-none focus:border-zion-500"
                  />
                </div>
                <div>
                  <div className="mb-1 text-[11px] font-semibold text-ink-soft">주소</div>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) =>
                      setStudentStatus(student.key, { address: e.target.value }, session.name, session.roleCode)
                    }
                    aria-label="주소"
                    className="w-full rounded-lg border border-zion-200 bg-white px-2 py-1 text-[12px] outline-none focus:border-zion-500"
                  />
                </div>
              </div>
            )}
          </div>
          {mode === "view" ? (
            /*
              보기 상태 — 피드백할 때 한눈에 훑을 수 있게 여섯 값을 한 목록으로 모은다
              (2026-08-13 리드 지시). 칩 세 줄로 나뉘어 있던 것보다 자리를 덜 잡아먹고,
              이름·전화·주소와 같은 Row 형식이라 글자 정렬도 그대로 맞는다.
              ⚠️ 첫 칸(소속·유월)이 위 "이름"과 세로줄이 맞도록 왼쪽에 아바타 폭(56px)+간격(12px)만큼
              들여쓴다(2026-08-13 리드 지시) — 나머지 칸(등록·상태·신앙·등급)도 같이 오른쪽으로 밀린다.
            */
            <div className="mt-3 border-t border-zion-100 pt-2.5">
              <dl className="ml-[68px] grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12px] sm:grid-cols-3">
                <SummaryRow label="소속" value={FELLOWSHIP_LABELS[fellowship]} />
                <SummaryRow label="등록" value={registrationType} />
                <SummaryRow label="신앙" value={FAITH_STATUS_LABELS[faithStatus]} />
                <SummaryRow label="유월" value={yuwol} />
                <SummaryRow label="상태" value={enrollmentStatus} />
                <SummaryRow label="등급" value={enrollmentStatus === "유급" ? "고르지 않음" : GRADE_LABELS[grade]} />
              </dl>
            </div>
          ) : (
            <>
              {/* grid-cols-2로 세 줄의 둘째 칸(등록·유월·등급)이 같은 자리에 맞춰지게 한다(2026-08-13) */}
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-zion-100 pt-2.5">
                <PillGroup
                  label="소속"
                  value={fellowship}
                  options={FELLOWSHIPS}
                  labels={FELLOWSHIP_LABELS}
                  editable={canEdit}
                  onSelect={(v) => setStudentStatus(student.key, { fellowship: v }, session.name, session.roleCode)}
                />
                <PillGroup
                  label="등록"
                  value={registrationType}
                  options={REGISTRATION_TYPES}
                  editable={canEdit}
                  onSelect={(v) =>
                    setStudentStatus(student.key, { registrationType: v }, session.name, session.roleCode)
                  }
                />
              </div>

              {/* 신앙·유월 — 신앙을 소속 아래 줄로 내리고 그 옆에 유월을 붙였다(2026-08-13) */}
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-zion-100 pt-2.5">
                <PillGroup
                  label="신앙"
                  value={faithStatus}
                  labels={FAITH_STATUS_LABELS}
                  options={["신앙", "무신앙", "기타"]}
                  editable={canEdit}
                  onSelect={(v) => setStudentStatus(student.key, { faithStatus: v }, session.name, session.roleCode)}
                />
                <PillGroup
                  label="유월"
                  value={yuwol}
                  options={["오픈", "비오픈"]}
                  editable={canEdit}
                  onSelect={(v) => setStudentStatus(student.key, { faithType: v }, session.name, session.roleCode)}
                />
              </div>

              {/*
                상태·등급 — 종전 「현재 상황」 카드에 있던 것을 여기로 올렸다(2026-08-13).
                ⚠️ 둘은 서로 얽혀 있다: 「수강」일 때만 등급을 정상·관심·위기 중에서 고른다.
                「탈락」을 고르면 등급이 자동으로 "중단"이 되고 더는 고칠 수 없다(잠김 표시만).
                「유급」일 때는 등급 자체를 고르지 않는다 — 칸을 아예 내지 않는다.
              */}
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-zion-100 pt-2.5">
                <PillGroup
                  label="상태"
                  value={enrollmentStatus}
                  options={ENROLLMENT_STATUSES}
                  editable={canEdit}
                  onSelect={(v) =>
                    setStudentStatus(
                      student.key,
                      { enrollmentStatus: v, ...(v === "탈락" ? { grade: "E" as Grade } : {}) },
                      session.name,
                      session.roleCode,
                    )
                  }
                />
                {enrollmentStatus === "유급" ? (
                  <p className="self-end text-[11px] text-ink-soft">유급 상태에서는 등급을 고르지 않습니다.</p>
                ) : (
                  <PillGroup
                    label="등급"
                    value={grade}
                    labels={GRADE_LABELS}
                    options={enrollmentStatus === "탈락" ? (["E"] as Grade[]) : GRADES_WHILE_ENROLLED}
                    editable={canEdit && enrollmentStatus !== "탈락"}
                    onSelect={(v) => setStudentStatus(student.key, { grade: v }, session.name, session.roleCode)}
                  />
                )}
              </div>
            </>
          )}

          {/* 안내 문장은 뺐다(2026-08-13 리드 지시) — 최근 변경 이력만 있으면 보여준다. 오른쪽 정렬 */}
          {override && (
            <p className="mt-3 border-t border-zion-100 pt-2.5 text-right text-[11px] leading-relaxed text-ink-soft">
              최근 변경: {override.updatedBy} · {override.updatedAt.slice(0, 10)}
            </p>
          )}
        </Card>

        <Card className="flex h-full flex-col">
          <SectionTitle bar>성향</SectionTitle>
          {mode === "view" ? (
            // 다른 항목처럼 SummaryRow로 통일한다(2026-08-13 리드 지시 — 항목은 위, 값은 아래)
            <dl className="grid grid-cols-3 gap-x-4 gap-y-1.5 text-[12px]">
              <SummaryRow label="MBTI" value={mbti} />
              <SummaryRow label="에니어그램" value={`${enneagramType}유형`} />
              <SummaryRow label="도형" value={shapeType} />
            </dl>
          ) : (
            /* 편집 상태에서만 고른다(2026-08-13 리드 지시) — 항목이 많은 MBTI·에니어그램은 드롭다운 */
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <div className="mb-1 text-[11px] font-semibold text-ink-soft">MBTI</div>
                <select
                  value={mbti}
                  onChange={(e) => setStudentStatus(student.key, { mbti: e.target.value }, session.name, session.roleCode)}
                  aria-label="MBTI"
                  className="rounded-lg border border-zion-200 bg-white px-2 py-1 text-[12px] outline-none focus:border-zion-500"
                >
                  {MBTI_TYPES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold text-ink-soft">에니어그램</div>
                <select
                  value={enneagramType}
                  onChange={(e) =>
                    setStudentStatus(
                      student.key,
                      { enneagramType: Number(e.target.value) },
                      session.name,
                      session.roleCode,
                    )
                  }
                  aria-label="에니어그램"
                  className="rounded-lg border border-zion-200 bg-white px-2 py-1 text-[12px] outline-none focus:border-zion-500"
                >
                  {ENNEAGRAM_TYPES.map((n) => (
                    <option key={n} value={n}>
                      {n}유형
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold text-ink-soft">도형</div>
                <MiniPillSelect
                  value={shapeType}
                  options={SHAPE_TYPES}
                  editable={canEdit}
                  onSelect={(v) => setStudentStatus(student.key, { shapeType: v }, session.name, session.roleCode)}
                />
              </div>
            </div>
          )}

          {/* 사주 — 일주·오행분포. 개별 태그 대신 여기서만 보여준다(불변식 4·6 — 확정 판정
              아닌 시범 표시값). 카드 전체를 너무 늘리지 않도록 한 줄로 압축한다 */}
          <div className="mt-2.5 rounded-xl border border-zion-100 bg-white px-3 py-2">
            {/*
              명리학 참고(2026-08-13 리드 지시) — 일주는 육십갑자 60개 중에서 고르고(항목이
              많아 드롭다운), 오행분포는 우세 원소 하나로 뭉뚱그리지 않고 목·화·토·금·수 각각
              개수를 담당자가 직접 매긴다.
            */}
            {mode === "edit" && (
              <div className="mb-2 space-y-2 border-b border-zion-100 pb-2">
                <div>
                  <div className="mb-1 text-[11px] font-semibold text-ink-soft">일주(육십갑자)</div>
                  <select
                    value={ilju}
                    onChange={(e) => setStudentStatus(student.key, { ilju: e.target.value }, session.name, session.roleCode)}
                    aria-label="일주"
                    className="rounded-lg border border-zion-200 bg-white px-2 py-1 text-[12px] outline-none focus:border-zion-500"
                  >
                    {SIXTY_GAPJA.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="mb-1 text-[11px] font-semibold text-ink-soft">오행분포 — 원소별 개수</div>
                  <div className="flex flex-wrap gap-2">
                    {SAJU_ELEMENTS.map((el) => (
                      <label key={el} className="flex items-center gap-1 text-[11px] text-ink-soft">
                        {el}
                        <input
                          type="number"
                          min={0}
                          value={ohaeng[el]}
                          onChange={(e) => {
                            const n = Math.max(0, Number(e.target.value) || 0);
                            setStudentStatus(
                              student.key,
                              { ohaeng: { ...ohaeng, [el]: n } },
                              session.name,
                              session.roleCode,
                            );
                          }}
                          aria-label={`오행 ${el} 개수`}
                          className="w-12 rounded-lg border border-zion-200 bg-white px-1.5 py-1 text-[12px] outline-none focus:border-zion-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <span className="shrink-0 text-[11.5px] font-bold text-ink-soft">
                사주 <span className="font-medium text-zion-700">{ilju}</span>
              </span>
              <div className="flex flex-1 justify-end gap-1.5">
                {SAJU_ELEMENTS.map((el) => (
                  <span
                    key={el}
                    title={`${el} ${ohaeng[el]}`}
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[10.5px] font-bold text-zion-950 ${ELEMENT_BG[el]}`}
                  >
                    {ohaeng[el]}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/*
            특이사항 — 종전 오른쪽 혼인상태 카드 아래에 있던 것을 여기로 옮겼다(2026-08-13).
            ⚠️ `InfoBox`의 기본 `h-full`은 그 카드의 flex-h-full 체인에 맞춘 것이라, 이 성향
            카드(그런 체인이 없는 일반 블록)에 그대로 쓰면 박스가 카드 전체 높이만큼 늘어나
            아래 「현재 상황」 카드와 겹친다 — `!h-auto`로 되돌린다.
          */}
          <NoteInfoBox
            note={note}
            noteHistory={noteHistory}
            canEdit={canEdit}
            onSave={(v) => setStudentStatus(student.key, { note: v }, session.name, session.roleCode)}
            className="mt-2.5 !h-auto"
          />
        </Card>

        {/* 인교섬 — 종전 「현재 상황」이 있던 자리(2026-08-13). 위와 같은 grid 한 칸이라 열 폭도 같이 맞는다 */}
        <Card className="flex h-full flex-col">
          <SectionTitle bar>인교섬</SectionTitle>
          {mode === "view" ? (
            // 다른 요약과 같은 SummaryRow 격자로 통일한다(2026-08-13)
            <dl className="grid grid-cols-3 gap-x-4 gap-y-1.5 text-[12px]">
              <SummaryRow label="인도자" value={guideName} />
              <SummaryRow label="교사" value={teacherName} />
              <SummaryRow label="섬김이" value={helperName} />
            </dl>
          ) : (
            // 원래 마팔 자료에서 오지만 중간에 바뀌기도 해 직접 고쳐 쓸 수 있게 했다(2026-08-13)
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <div className="mb-1 text-[11px] font-semibold text-ink-soft">인도자</div>
                <input
                  type="text"
                  value={guideName}
                  onChange={(e) =>
                    setStudentStatus(student.key, { guideName: e.target.value }, session.name, session.roleCode)
                  }
                  aria-label="인도자"
                  className="w-full rounded-lg border border-zion-200 bg-white px-2 py-1 text-[12px] outline-none focus:border-zion-500"
                />
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold text-ink-soft">교사</div>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) =>
                    setStudentStatus(student.key, { teacherName: e.target.value }, session.name, session.roleCode)
                  }
                  aria-label="교사"
                  className="w-full rounded-lg border border-zion-200 bg-white px-2 py-1 text-[12px] outline-none focus:border-zion-500"
                />
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold text-ink-soft">섬김이</div>
                <input
                  type="text"
                  value={helperName}
                  onChange={(e) =>
                    setStudentStatus(student.key, { helperName: e.target.value }, session.name, session.roleCode)
                  }
                  aria-label="섬김이"
                  className="w-full rounded-lg border border-zion-200 bg-white px-2 py-1 text-[12px] outline-none focus:border-zion-500"
                />
              </div>
            </div>
          )}

          {/*
            인교섬 관련 메모 — 관심사와 같은 방식(한 칸에 바로 고쳐 쓰기)이고, 지난 자료는
            특이사항과 같은 팝업으로 본다(2026-08-13).
          */}
          <NoteInfoBox
            label="메모"
            note={guideMemo}
            noteHistory={guideMemoHistory}
            canEdit={canEdit}
            onSave={(v) => setStudentStatus(student.key, { guideMemo: v }, session.name, session.roleCode)}
            className="mt-2.5 !h-auto"
          />
        </Card>

        {/*
          소속에 따라 갈리는 항목 — 강사·전도사가 직접 고르거나 쓴다.
          ⚠️ `h-full`을 모드와 무관하게 항상 준다(2026-08-13 리드 지시 — "네 박스 정렬이 되도록").
          예전엔 보기 상태에서 내용이 짧으면 박스 아래가 비어 보인다고 빼기도 했지만,
          지금은 옆 카드(인교섬)와 높이를 맞추는 쪽을 우선한다.
        */}
        <Card className="flex h-full flex-col">
          <SectionTitle bar>
            {fellowship === "청년회" ? "이성친구 · 교제기간 · 부모동거" : "혼인 상태 · 자녀 동거"} · 연락 가능시간대 · 관심사
          </SectionTitle>

          {mode === "view" ? (
            /* 보기 상태 — 왼쪽 카드와 같은 규칙으로 최종 자료를 한 목록에 정리한다(2026-08-13) */
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12px] sm:grid-cols-3">
              {fellowship === "청년회" ? (
                <>
                  <SummaryRow label="이성친구 여부" value={hasPartner ? "있음" : "없음"} />
                  <SummaryRow label="교제 기간" value={materialPeriod} />
                  <SummaryRow label="부모와 동거 여부" value={livesWithParents ? "동거" : "독립"} />
                </>
              ) : (
                <>
                  <SummaryRow label="혼인 상태" value={maritalStatus} />
                  <SummaryRow label="자녀 동거유무" value={livesWithChildren ? "동거" : "비동거"} />
                </>
              )}
              <SummaryRow label="연락 가능 시간대" value={availableTime} />
              <SummaryRow label="관심사" value={interests} />
            </dl>
          ) : (
            <>
              <div
                className={
                  "grid grid-cols-1 gap-2 " +
                  (fellowship === "청년회" ? "sm:grid-cols-3" : "sm:grid-cols-[1.4fr_1fr]")
                }
              >
                {fellowship === "청년회" ? (
                  <>
                    <InfoBox label="이성친구 여부">
                      <MiniPillSelect
                        value={hasPartner ? "있음" : "없음"}
                        options={PARTNER_OPTIONS}
                        editable={canEdit}
                        onSelect={(v) =>
                          setStudentStatus(student.key, { hasPartner: v === "있음" }, session.name, session.roleCode)
                        }
                      />
                    </InfoBox>
                    <InfoBox label="교제 기간">
                      <EditableText
                        value={materialPeriod}
                        canEdit={canEdit}
                        onSave={(v) =>
                          setStudentStatus(student.key, { materialPeriod: v }, session.name, session.roleCode)
                        }
                      />
                    </InfoBox>
                    <InfoBox label="부모와 동거 여부">
                      <MiniPillSelect
                        value={livesWithParents ? "동거" : "독립"}
                        options={PARENT_LIVING_OPTIONS}
                        editable={canEdit}
                        onSelect={(v) =>
                          setStudentStatus(
                            student.key,
                            { livesWithParents: v === "동거" },
                            session.name,
                            session.roleCode,
                          )
                        }
                      />
                    </InfoBox>
                  </>
                ) : (
                  <>
                    <InfoBox label="혼인 상태">
                      <MiniPillSelect
                        value={maritalStatus}
                        options={MARITAL_STATUSES}
                        editable={canEdit}
                        onSelect={(v) =>
                          setStudentStatus(student.key, { maritalStatus: v }, session.name, session.roleCode)
                        }
                      />
                    </InfoBox>
                    <InfoBox label="자녀 동거유무">
                      <MiniPillSelect
                        value={livesWithChildren ? "동거" : "비동거"}
                        options={CHILDREN_LIVING_OPTIONS}
                        editable={canEdit}
                        onSelect={(v) =>
                          setStudentStatus(
                            student.key,
                            { livesWithChildren: v === "동거" },
                            session.name,
                            session.roleCode,
                          )
                        }
                      />
                    </InfoBox>
                  </>
                )}
              </div>

              <div className="mt-2 flex flex-1 flex-col gap-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <InfoBox label="연락 가능 시간대" compact>
                    <EditableText
                      value={availableTime}
                      canEdit={canEdit}
                      onSave={(v) =>
                        setStudentStatus(student.key, { availableTime: v }, session.name, session.roleCode)
                      }
                    />
                  </InfoBox>
                  <InfoBox label="관심사" compact>
                    <EditableText
                      value={interests}
                      canEdit={canEdit}
                      onSave={(v) => setStudentStatus(student.key, { interests: v }, session.name, session.roleCode)}
                      multiline
                    />
                  </InfoBox>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/*
        단계 항목 체크리스트(좌) · 보강·상담 메모(우) — 여기도 grid 대신 flex로 높이를 맞춘다
        (2026-08-13 — 오른쪽이 항목을 다 펼치면서 왼쪽보다 길어져 안 맞았다). 왼쪽 카드가
        기준이고, 오른쪽은 그 높이 안에서 `overflow-y-auto`로 스크롤한다(`MemoTimelineCard`
        내부에 이미 있다) — 카드 대신 이 바깥 레이아웃이 못 맞추고 있었다.
      */}
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="lg:min-w-0 lg:flex-[2]">
          {/*
            ⚠️ 여기도 `canEdit`이 아니라 `rawCanEdit`을 쓴다(2026-08-13 리드 지시) — 문항 점수는
            "상태를 고치는" 값이 아니라 "그때그때 관찰해 매기는" 값이라, 보강·상담 메모와 같은
            이유로 보기 상태에서도(=피드백 화면에서도) 권한만 있으면 곧장 매길 수 있어야 한다.
          */}
          <LevelChecklistCard
            progress={checklistProgress.filter((c) => c.studentKey === student.key)}
            canEdit={rawCanEdit}
            onSetScore={(level, groupNo, qIndex, score, week) =>
              setChecklistItemScore(
                student.key,
                level,
                groupNo,
                qIndex,
                score,
                session.name,
                session.roleCode,
                week,
              )
            }
          />
        </div>

        <div className="lg:min-w-0 lg:flex-1">
          <MemoTimelineCard
            /*
              ⚠️ 여기만 `canEdit`(모드까지 반영된 값)이 아니라 `rawCanEdit`(진짜 권한)을 쓴다
              (2026-08-13 리드 지시). 보강·상담 기록은 "상태를 고치는" 자리가 아니라 "새로 적는"
              자리라, 보기 상태로 열려 있어도 권한만 있으면 곧장 적을 수 있어야 한다 — 더보기
              팝업을 열고 「작성」을 눌러도 아무 반응이 없던 게 이 문제였다.
            */
            canEdit={rawCanEdit}
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

      <p className="mt-4 text-[11px] leading-relaxed text-ink-soft">
        시범 목업 데이터(가상 인물)입니다. 원문 개인정보는 담당 범위 밖으로 반출되지 않으며, 이
        화면의 값은 출결 계약(`Student`)과 분리된 시연용 프로필(`student-profiles.ts`)에서 옵니다.
      </p>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  bar,
  children,
}: {
  icon?: typeof Sparkles;
  /** 아이콘 배지 대신 짧은 세로 막대 강조만 쓴다(참고 화면 스타일) */
  bar?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center gap-2 text-[14px] font-bold text-ink">
      {Icon && (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zion-50 text-zion-600">
          <Icon size={15} />
        </span>
      )}
      {bar && <span className="h-4 w-1 shrink-0 rounded-full bg-zion-600" />}
      {children}
    </div>
  );
}

/**
 * 항목:값 표시 — 라벨을 값 위에 두는 한 가지 모양으로 페이지 전체를 통일한다(2026-08-13
 * 리드 지시: 이름 자리는 가로 나열, 소속 자리는 세로 나열로 섞여 있던 것을 하나로 맞췄다).
 * ⚠️ 라벨+값을 한 줄에 나란히 두는 방식은 여러 칸짜리 좁은 그리드에서 값 자리가 너무 좁아져
 * "평일 저녁, 주말 낮"처럼 긴 값이 글자 하나씩 세로로 쪼개지는 문제가 있었다 — 그래서 라벨을
 * 위로 올려 값이 칸 전체 폭에서 자연스럽게 줄바꿈되게 한다.
 */
/** 값 글자에 색을 준다(2026-08-13 리드 지시) — 성향 태그처럼 세부사항이 한눈에 잘 보이게 */
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-ink-soft">{label}</dt>
      <dd className="mt-0.5 font-semibold text-zion-700">{value}</dd>
    </div>
  );
}

/** 관리 메모 띠의 박스 하나 — 아이콘+라벨 헤더, 아래는 선택 칩이나 편집 텍스트 */
function InfoBox({
  label,
  action,
  children,
  className = "",
  compact = false,
}: {
  label: string;
  /** 라벨과 같은 줄 오른쪽 끝에 두는 것 — 예: "지난 자료 보기"(2026-08-13 추가, 줄을 아낀다) */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** 한 줄짜리 짧은 값(연락 가능 시간대 등) — 패딩을 줄여 박스 높이를 낮춘다 */
  compact?: boolean;
}) {
  return (
    <div
      className={
        "flex h-full flex-col rounded-xl border border-zion-100 bg-white " +
        (compact ? "p-2.5" : "p-3") +
        " " +
        className
      }
    >
      <div className={(compact ? "mb-1" : "mb-1.5") + " flex items-center justify-between gap-2"}>
        <span className="text-[13px] font-bold text-ink">{label}</span>
        {action}
      </div>
      <div className="text-[12.5px] leading-relaxed text-ink">{children}</div>
    </div>
  );
}

/**
 * 지난 자료 팝업 — 특이사항·메모·보강상담이 공통으로 쓴다(2026-08-13 리드 지시: 피드백
 * 화면에서 누르면 팝업으로 지난 자료를 본다). `StudentDetailModal`처럼 `Portal`로 감싼다 —
 * 감싸지 않으면 `main`의 쌓임 맥락에 갇혀 헤더에 눌린다.
 */
function RecordsModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Portal>
      {/*
        ⚠️ 포인터 이벤트를 여기서 끊는다(2026-08-13 버그 수정) — 이 팝업이 수강생 상세
        팝업(`StudentDetailModal`) 안에서 열릴 때, 리액트 트리 상으로는 자식이지만
        `createPortal(..., document.body)`라 실제 DOM 트리에서는 형제다. `StudentDetailModal`이
        "바깥을 눌렀는지"를 `panelRef.contains(e.target)`(DOM 기준)로 판정하는데, 이 팝업 안을
        눌러도 DOM 상 바깥이라 "바깥 클릭"으로 오판해 상세 팝업 전체가 닫히고 수강생 현황으로
        돌아가 버렸다. 이벤트가 리액트 트리를 타고 올라가지 못하게 여기서 멈춘다.
      */}
      <div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zion-950/50 p-3 sm:p-6"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="my-2 w-full max-w-lg rounded-2xl bg-white shadow-2xl"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-t-2xl border-b border-zion-100 bg-white/95 px-4 py-3 backdrop-blur">
            <div className="text-[14px] font-bold text-zion-900">{title}</div>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-soft transition hover:bg-zion-100"
            >
              <X size={16} />
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>
        </div>
      </div>
    </Portal>
  );
}

/** 특이사항 · 메모 — 짧은 한 줄 + 이전 값 이력. 이력은 눌러서 팝업으로 본다(2026-08-13) */
function NoteInfoBox({
  label = "특이사항",
  note,
  noteHistory,
  canEdit,
  onSave,
  className,
}: {
  label?: string;
  note: string;
  noteHistory: { text: string; label: string }[];
  canEdit: boolean;
  onSave: (v: string) => void;
  className?: string;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  return (
    <InfoBox
      label={label}
      className={className}
      // 줄 하나를 아낀다(2026-08-13 리드 지시) — 라벨과 같은 줄 오른쪽 끝에 둔다
      action={
        noteHistory.length > 0 && (
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            // 파란색이 아니라 "최근 변경"과 같은 톤으로(2026-08-13 요청)
            className="shrink-0 font-semibold text-[11px] text-ink-soft hover:underline"
          >
            지난 자료 보기 ({noteHistory.length}건)
          </button>
        )
      }
    >
      <EditableText value={note} canEdit={canEdit} onSave={onSave} multiline />
      {historyOpen && (
        <RecordsModal title={`${label} — 지난 자료`} onClose={() => setHistoryOpen(false)}>
          <ul className="space-y-2">
            {noteHistory.map((h, i) => (
              <li key={i} className="rounded-lg border border-zion-100 p-2.5 text-[12px] leading-relaxed">
                <div className="mb-1 text-[11px] text-ink-soft">{h.label}</div>
                <p className="whitespace-pre-line text-ink">{h.text}</p>
              </li>
            ))}
          </ul>
        </RecordsModal>
      )}
    </InfoBox>
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
      {/* 다른 값 표시와 같은 색으로 맞춘다(2026-08-13 — "다른 것도 확인해서 적용") */}
      <span className="whitespace-pre-line font-semibold text-zion-700">{value}</span>
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
  // 편집 상태가 아니면 고를 수 있는 전체 목록 대신 **지금 고른 값 하나만** 보여준다(2026-08-13 리드 지시)
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold text-ink-soft">{label}</div>
      {editable ? (
        <div className="flex flex-wrap gap-1">
          {options.map((o) => {
            const active = o === value;
            const cls =
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition " +
              (active
                ? "border-zion-700 bg-zion-700 text-white"
                : "border-zion-100 bg-white text-ink-soft hover:border-zion-300 hover:text-zion-700");
            return (
              <button key={o} type="button" onClick={() => onSelect(o)} className={cls}>
                {labels ? labels[o] : o}
              </button>
            );
          })}
        </div>
      ) : (
        <span className="inline-block rounded-full border border-zion-700 bg-zion-700 px-2.5 py-1 text-[11px] font-medium text-white">
          {labels ? labels[value] : value}
        </span>
      )}
    </div>
  );
}

/** 박스 안에 쓰는 작은 선택 칩 — `PillGroup`과 같은 스타일이지만 자체 라벨 줄이 없다 */
function MiniPillSelect<T extends string>({
  value,
  options,
  editable,
  onSelect,
}: {
  value: T;
  options: T[];
  editable: boolean;
  onSelect: (v: T) => void;
}) {
  // 편집 상태가 아니면 지금 고른 값 하나만 보여준다(2026-08-13 리드 지시 — PillGroup과 같은 규칙)
  if (!editable) {
    return (
      <span className="inline-block rounded-lg border border-zion-700 bg-zion-700 px-1.5 py-1.5 text-center text-[12.5px] font-semibold text-white">
        {value}
      </span>
    );
  }

  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const active = o === value;
        const cls =
          "rounded-lg border px-1.5 py-1.5 text-center text-[12.5px] font-semibold whitespace-nowrap transition " +
          (active
            ? "border-zion-700 bg-zion-700 text-white"
            : "border-zion-200 bg-white text-ink-soft hover:border-zion-300 hover:text-zion-700");
        return (
          <button key={o} type="button" onClick={() => onSelect(o)} className={cls}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

const MEMO_KINDS: FeedbackKind[] = ["makeup", "counsel"];

type MemoFilter = "all" | "makeup" | "counsel";
const MEMO_FILTERS: { key: MemoFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "makeup", label: FEEDBACK_KIND_LABELS.makeup },
  { key: "counsel", label: FEEDBACK_KIND_LABELS.counsel },
];

/**
 * 보강 · 상담 메모 — 2026-08-13부터 특이사항·메모는 카드 3(혼인상태 등)의 개별 박스로
 * 옮기고, 여기는 보강·상담 기록(날짜 있는 로그)만 남긴다.
 * ⚠️ 2026-08-13 리드 지시로 카드는 누르면 여는 요약으로 바꾸고, 실제 목록·검색·기록은
 * 팝업(`RecordsModal`) 안에서 한다 — 카드 자리를 덜 잡아먹으면서 지난 자료를 다 보여준다.
 */
function MemoTimelineCard({
  canEdit,
  entries,
  onAdd,
  onUpdate,
  onDelete,
}: {
  canEdit: boolean;
  entries: { id: string; kind: FeedbackKind; date: string; subject?: string; text: string; by: string; checklistItems?: number[] }[];
  onAdd: (input: { kind: FeedbackKind; date: string; subject: string; text: string }) => void;
  onUpdate: (id: string, patch: { date: string; subject: string; text: string; checklistItems: number[] }) => void;
  onDelete: (id: string) => void;
}) {
  const [popupOpen, setPopupOpen] = useState(false);
  const [filter, setFilter] = useState<MemoFilter>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>("makeup");
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

  // entries는 최신이 앞에 오도록 이미 정렬돼 들어온다(호출부의 combinedFeedback 정렬 기준)
  const relevant = entries.filter((e) => e.kind === "makeup" || e.kind === "counsel");
  const byFilter = filter === "all" ? relevant : relevant.filter((e) => e.kind === filter);
  const q = query.trim();
  const shown = q
    ? byFilter.filter((e) => e.text.includes(q) || (e.subject ?? "").includes(q))
    : byFilter;

  return (
    <Card className="flex h-full flex-col">
      {/*
        옆 카드(단계 항목 체크리스트)를 기준으로 높이를 맞춘다(2026-08-13 리드 지시) — 목록은
        `flex-1 overflow-y-auto`로 그 높이 안에서만 늘고, 넘치는 기록은 스크롤이나
        「검색 · 기록」 팝업에서 본다. 개수를 고정으로 자르진 않는다("내용은 더 있다"는 지적).
      */}
      <div className="mb-2.5 flex shrink-0 items-center justify-between gap-2">
        <SectionTitle icon={StickyNote}>보강 · 상담 메모</SectionTitle>
        {(relevant.length > 0 || canEdit) && (
          <button
            type="button"
            onClick={() => setPopupOpen(true)}
            className="shrink-0 text-[11px] font-semibold text-zion-700 hover:underline"
          >
            검색 · 기록
          </button>
        )}
      </div>

      {relevant.length > 0 ? (
        <ul className="flex-1 space-y-2 overflow-y-auto">
          {relevant.map((f) => (
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
      ) : (
        <button
          type="button"
          onClick={() => setPopupOpen(true)}
          className="flex-1 py-3 text-center text-[12px] text-ink-soft hover:text-zion-700"
        >
          기록이 없습니다{canEdit ? " — 눌러서 기록하기" : ""}
        </button>
      )}

      {popupOpen && (
        <RecordsModal title="보강 · 상담 메모" onClose={() => setPopupOpen(false)}>
          {canEdit && (
            <div className="mb-3 text-right">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="text-[11px] font-semibold text-zion-700 hover:underline"
              >
                {open ? "취소" : "+ 기록"}
              </button>
            </div>
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

          {/* 검색 — 2026-08-13 리드 지시로 추가. 과목·본문 텍스트를 함께 찾는다 */}
          <div className="mb-2.5 flex items-center gap-1.5 rounded-lg border border-zion-100 bg-white px-2.5 py-1.5">
            <Search size={13} className="text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="과목·내용 검색"
              aria-label="보강·상담 메모 검색"
              className="w-full text-[12px] outline-none"
            />
          </div>

          <div className="mb-2.5 flex flex-wrap gap-1">
            {MEMO_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition " +
                  (filter === key
                    ? "border-zion-700 bg-zion-700 text-white"
                    : "border-zion-100 bg-white text-ink-soft hover:border-zion-300")
                }
              >
                {label}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="py-3 text-center text-[12px] text-ink-soft">
              {q ? "검색 결과가 없습니다." : "기록이 없습니다."}
            </p>
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
        </RecordsModal>
      )}
    </Card>
  );
}

/**
 * 초·중·고 단계 체크리스트 — 레벨 탭을 오가며 항목을 직접 체크한다.
 * 중등·고등은 아직 항목 원본이 없어 "자료 대기" 상태로 둔다(리드가 추후 제공 예정).
 */
/** 그룹 하나의 달성률 원형 그래프 — 강사·전도사가 한눈에 훑어보는 용도 */
function GroupRing({ pct, size = 56 }: { pct: number; size?: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const tone = pct >= 80 ? "stroke-emerald-500" : pct >= 40 ? "stroke-amber-500" : "stroke-zion-300";
  const textTone = pct >= 80 ? "text-emerald-700" : pct >= 40 ? "text-amber-700" : "text-ink-soft";
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 56 56" className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="6" className="stroke-zion-100" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          className={tone}
          strokeDasharray={`${(pct / 100) * c} ${c}`}
        />
      </svg>
      <span className={`absolute text-[12px] font-bold ${textTone}`}>{pct}%</span>
    </div>
  );
}

/** 문항 하나의 만점 — 예/아니오 대신 0~5점으로 매긴다(2026-08-13, "매번 완전하게 되는 건 아니니까") */
const ITEM_SCORE_MAX = 5;

function LevelChecklistCard({
  progress,
  canEdit,
  onSetScore,
}: {
  progress: { level: CourseLevel; groupNo: number; qIndex: number; score: number; week?: number }[];
  canEdit: boolean;
  onSetScore: (level: CourseLevel, groupNo: number, qIndex: number, score: number, week?: number) => void;
}) {
  const [level, setLevel] = useState<CourseLevel>("초등");
  const [openGroup, setOpenGroup] = useState<number | null>(null);
  const [recordWeek, setRecordWeek] = useState(1);
  const standard = CHECKLIST_STANDARDS[level];
  const levelProgress = progress.filter((p) => p.level === level);

  const scoreOf = (groupNo: number, qIndex: number) =>
    levelProgress.find((p) => p.groupNo === groupNo && p.qIndex === qIndex)?.score ?? 0;
  const weekOf = (groupNo: number, qIndex: number) =>
    levelProgress.find((p) => p.groupNo === groupNo && p.qIndex === qIndex)?.week;

  const totalQuestions = standard.groups.reduce((sum, g) => sum + g.questions.length, 0);
  const maxScore = totalQuestions * ITEM_SCORE_MAX;
  const totalScore = standard.groups.reduce(
    (sum, g) => sum + g.questions.reduce((s, _q, qi) => s + scoreOf(g.no, qi), 0),
    0,
  );
  const pct = maxScore ? Math.round((totalScore / maxScore) * 100) : 0;

  function selectLevel(l: CourseLevel) {
    setLevel(l);
    setOpenGroup(null);
  }

  const openGroupDef = standard.groups.find((g) => g.no === openGroup);

  return (
    <Card>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <SectionTitle>단계 항목 체크리스트</SectionTitle>
        <span className="rounded-full border border-zion-100 bg-zion-50 px-2.5 py-1 text-[11px] font-medium text-ink-soft">
          단계목표 점수 {totalScore}/{maxScore}
        </span>
      </div>

      {/* 점수 박스는 뺐다(2026-08-13) — 아래 진행률 막대가 이미 {pct}%로 같은 값을 보여준다 */}
      <div className="relative mb-3 h-5 w-full overflow-hidden rounded-full bg-zion-100">
        <div className="h-full rounded-full bg-zion-600 transition-all" style={{ width: `${pct}%` }} />
        <span
          className={
            "absolute inset-0 flex items-center justify-center text-[10.5px] font-bold " +
            (pct >= 50 ? "text-white" : "text-zion-800")
          }
        >
          {pct}%
        </span>
      </div>

      <div className="mb-3 flex gap-1 rounded-lg bg-zion-100 p-1" role="tablist" aria-label="단계">
        {COURSE_LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={level === l}
            onClick={() => selectLevel(l)}
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

      {/* 그룹별 달성률 — 강사·전도사가 함께 한눈에 보고 피드백하는 자리 */}
      <div className="mb-1.5 text-[11px] font-semibold text-ink-soft">
        그룹별 달성률 — 원을 누르면 {canEdit ? "작성" : "내용"}이 열립니다
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {standard.groups.map((g) => {
          const groupScore = g.questions.reduce((s, _q, qi) => s + scoreOf(g.no, qi), 0);
          const groupMax = g.questions.length * ITEM_SCORE_MAX;
          const groupPct = groupMax ? Math.round((groupScore / groupMax) * 100) : 0;
          const active = openGroup === g.no;
          return (
            <button
              key={g.no}
              type="button"
              onClick={() => setOpenGroup(active ? null : g.no)}
              aria-expanded={active}
              className={
                "flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center transition " +
                (active ? "border-zion-400 bg-zion-50" : "border-zion-100 bg-white hover:border-zion-200")
              }
            >
              <GroupRing pct={groupPct} />
              <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-ink">
                {g.no}. {g.label}
              </span>
              <span className="text-[10px] text-ink-soft">{groupScore}/{groupMax}</span>
            </button>
          );
        })}
      </div>

      {openGroupDef && (
        <div className="rounded-xl border border-zion-300 bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[13px] font-bold text-zion-900">
              {canEdit && <PencilLine size={13} className="text-zion-600" />}
              {openGroupDef.no}. {openGroupDef.label} {canEdit ? "작성하기" : ""}
            </div>
            <button
              type="button"
              onClick={() => setOpenGroup(null)}
              className="text-[11px] font-semibold text-ink-soft hover:text-zion-700"
            >
              닫기
            </button>
          </div>

          {standard.weekly && (
            <div className="mb-2.5 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-soft">
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

          {/* 문항마다 예/아니오 체크가 아니라 0~5점을 직접 눌러 매긴다(2026-08-13) —
              매번 완전히 되는 게 아니라서 체크 하나로는 못 담는다 */}
          <div className="space-y-2.5">
            {openGroupDef.questions.map((q, qi) => {
              const score = scoreOf(openGroupDef.no, qi);
              const week = weekOf(openGroupDef.no, qi);
              return (
                <div key={qi} className="rounded-lg px-1.5 py-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={
                        "min-w-0 flex-1 whitespace-pre-line text-[12px] leading-relaxed " +
                        (score > 0 ? "text-ink-soft" : "text-ink")
                      }
                    >
                      {q}
                    </span>
                    {standard.weekly && score > 0 && week && (
                      <span className="shrink-0 rounded-full bg-zion-100 px-1.5 py-0.5 text-[10px] font-medium text-zion-700">
                        {week}주차
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1" role="radiogroup" aria-label={`${q} — 점수 0~5`}>
                    {Array.from({ length: ITEM_SCORE_MAX + 1 }, (_, s) => s).map((s) => {
                      const active = score === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={!canEdit}
                          role="radio"
                          aria-checked={active}
                          onClick={() =>
                            onSetScore(level, openGroupDef.no, qi, s, standard.weekly ? recordWeek : undefined)
                          }
                          className={
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold transition " +
                            (active
                              ? "border-zion-700 bg-zion-700 text-white"
                              : "border-zion-200 text-ink-soft " +
                                (canEdit ? "hover:border-zion-400 hover:text-zion-700" : "cursor-default"))
                          }
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
        <div className="min-w-0 flex-1">
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
        </div>
        {/* 수정·삭제는 따로 색을 주지 않는다(2026-08-13 리드 지시) — 둘 다 같은 톤으로 낸다 */}
        {canEdit && (
          <div className="flex shrink-0 gap-2 text-[11px]">
            <button type="button" onClick={() => setEditing(true)} className="font-semibold text-ink-soft hover:underline">
              수정
            </button>
            <button type="button" onClick={onDelete} className="font-semibold text-ink-soft hover:underline">
              삭제
            </button>
          </div>
        )}
      </div>
      {/*
        글쓴이·날짜 오른쪽 정렬(2026-08-13 요청) — flex 칸 안에 있을 때 폭이 애매해 가운데
        즈음에 있는 것처럼 보였다. 줄 전체(li) 폭을 그대로 쓰도록 바깥으로 뺐다 — 이제 카드
        폭 전체 기준으로 오른쪽 끝에 확실히 붙는다.
      */}
      <p className="mt-1 text-right text-[11px] text-ink-soft">
        {entry.by} · {entry.date} ({weekdayOf(entry.date)})
      </p>
    </li>
  );
}
