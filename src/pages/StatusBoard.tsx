import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Info,
  MinusCircle,
  XCircle,
} from "lucide-react";
import type { Student } from "../lib/types";
import { STUDENTS } from "../content/cohort-mock";
import {
  CHECK_SCALE,
  CHECK_SECTIONS,
  DROPOUT_REASONS,
  DROPOUTS,
  EVANGELISTS,
  MAKEUP_TOPICS,
  STAGES,
  STAGE_CRITERIA,
  WEEKLY_MAKEUP_FLOW,
  analysisOf,
  checkAnswer,
  evangelistOf,
  type CheckMark,
  type EventStatus,
  type StudentAnalysis,
} from "../content/status-analysis-mock";
import { Card, PageHeader, StatTile } from "./common";
import { Accordion } from "../components/Accordion";

/**
 * 수강생 상태 분석 보드 — 현장 상태 분석 스프레드시트(16개 탭)를 화면으로 옮긴 것.
 *
 * 시트의 다섯 관점(단계 현황판 · 필수보강 · 주간 점검표 · 오픈/입교 진행 · 탈락 분석)을
 * 탭으로 나눠 담았다. 시트에서 셀 배경색으로 표현하던 상태(완료 = 노란 박스 등)는
 * **명시적 상태 필드 + 아이콘·라벨 배지**로 승격했다 — 색 단독 표시 금지 규칙과도 맞는다.
 *
 * 지금은 **읽기 전용**이다. 기록 입력(점검표 갱신·보강 완료 전환)은 시트가 정본인 동안
 * 시트에서 하고, 실연동 시 이 화면이 입력을 맡을지 리드가 정한다.
 */

type Tab = "summary" | "stages" | "makeup" | "check" | "events" | "dropout";

const TABS: { id: Tab; label: string }[] = [
  { id: "summary", label: "요약" },
  { id: "stages", label: "단계 현황판" },
  { id: "makeup", label: "필수보강" },
  { id: "check", label: "주간 점검표" },
  { id: "events", label: "오픈 · 입교" },
  { id: "dropout", label: "탈락 분석" },
];

/** 재적 수강생 + 분석 값 묶음 — 분석 값이 없는 수강생은 화면에서 제외하지 않고 빈 값으로 둔다 */
interface Row {
  student: Student;
  analysis: StudentAnalysis;
}

export function StatusBoard() {
  const [tab, setTab] = useState<Tab>("summary");
  const [evFilter, setEvFilter] = useState<string | null>(null);

  const rows = useMemo<Row[]>(
    () =>
      STUDENTS.flatMap((student) => {
        const analysis = analysisOf(student);
        return analysis ? [{ student, analysis }] : [];
      }),
    [],
  );

  const filtered = useMemo(
    () => (evFilter ? rows.filter((r) => evangelistOf(r.student) === evFilter) : rows),
    [rows, evFilter],
  );

  return (
    <div>
      <PageHeader
        crumb="기수 현황"
        title="수강생 상태 분석"
        desc="현장에서 쓰는 상태 분석 시트의 다섯 관점(단계 · 필수보강 · 주간 점검 · 오픈/입교 · 탈락)을 한 화면으로 모았습니다. 매주 일요일 주간회의에서 함께 봅니다."
      />

      <p className="mb-4 flex items-start gap-1.5 text-[12px] text-ink-soft">
        <Info size={14} className="mt-0.5 shrink-0" />
        시범 목업 데이터(가상 인물)입니다. 시트 원본의 구조만 옮겼고 실제 수강생 정보는 담지
        않았습니다. 기록 입력은 아직 시트에서 합니다 — 이 화면은 읽기 전용입니다.
      </p>

      {/* 담당 전도사 필터 — 분반은 권한 경계가 아니라 표시·분류용이다 */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[12px] text-ink-soft">담당 전도사</span>
        <FilterChip label="전체" active={evFilter === null} onClick={() => setEvFilter(null)} />
        {EVANGELISTS.map((e) => (
          <FilterChip
            key={e.name}
            label={`${e.name} (${e.division})`}
            active={evFilter === e.name}
            onClick={() => setEvFilter(evFilter === e.name ? null : e.name)}
          />
        ))}
      </div>

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-zion-100 p-1" role="tablist" aria-label="상태 분석 탭">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={
              "shrink-0 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors " +
              (tab === t.id ? "bg-white text-zion-900 shadow-sm" : "text-zion-600 hover:text-zion-800")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "summary" && <SummaryTab rows={filtered} allRows={rows} />}
      {tab === "stages" && <StagesTab rows={filtered} />}
      {tab === "makeup" && <MakeupTab rows={filtered} />}
      {tab === "check" && <CheckTab rows={filtered} evFilter={evFilter} />}
      {tab === "events" && <EventsTab rows={filtered} />}
      {tab === "dropout" && <DropoutTab evFilter={evFilter} />}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={
        "rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors " +
        (active
          ? "border-zion-700 bg-zion-700 text-white"
          : "border-zion-100 bg-white text-ink-soft hover:text-ink")
      }
    >
      {label}
    </button>
  );
}

/* ---------------- 요약 ---------------- */

function SummaryTab({ rows, allRows }: { rows: Row[]; allRows: Row[] }) {
  const total = rows.length;
  const upper = rows.filter((r) => r.analysis.stage === "믿음" || r.analysis.stage === "소망").length;
  const makeupDone = rows.reduce(
    (n, r) => n + Object.values(r.analysis.makeup).filter((c) => c.status === "완료").length,
    0,
  );
  const makeupRate = total ? Math.round((makeupDone / (total * MAKEUP_TOPICS.length)) * 100) : 0;
  const opened = rows.filter((r) => r.analysis.open.status === "완료" || r.analysis.open.status === "완료부정").length;

  const pendingMakeup = rows.filter((r) =>
    Object.values(r.analysis.makeup).some((c) => c.status === "예정"),
  );
  const noTools = rows.filter(
    (r) => r.analysis.counselTools.length === 0 && STAGES.indexOf(r.analysis.stage) <= 3,
  );
  const openUnset = rows.filter(
    (r) =>
      (r.analysis.open.status === "미정" || r.analysis.open.status === null) &&
      STAGES.indexOf(r.analysis.stage) <= 3,
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="재적" value={`${total}명`} sub={`탈락 누적 ${DROPOUTS.length}명 별도`} accent />
        <StatTile label="상위 단계 (믿음 · 소망)" value={`${upper}명`} sub={`재적의 ${total ? Math.round((upper / total) * 100) : 0}%`} />
        <StatTile label="필수보강 진행률" value={`${makeupRate}%`} sub={`7종 × ${total}명 중 ${makeupDone}건 완료`} />
        <StatTile label="오픈 진행" value={`${opened} / ${total}명`} sub="완료부정 포함" />
        <StatTile label="입교 완료" value={`${rows.filter((r) => r.analysis.register.status === "완료").length}명`} sub="교적부 작성 기준" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-[14px] font-bold text-ink">단계 분포</h2>
          <p className="mt-0.5 text-[12px] text-ink-soft">믿음이 최상위입니다. 판정 기준은 단계 현황판 탭에 있습니다.</p>
          <div className="mt-4 space-y-2.5">
            {STAGES.map((stage) => {
              const count = rows.filter((r) => r.analysis.stage === stage).length;
              const max = Math.max(1, ...STAGES.map((s2) => rows.filter((r) => r.analysis.stage === s2).length));
              return (
                <div key={stage} className="flex items-center gap-2">
                  <span className="w-10 shrink-0 text-[12px] font-medium text-ink">{stage}</span>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-zion-50">
                    <div
                      className="h-full rounded bg-zion-600"
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-[12px] tabular-nums text-ink-soft">{count}명</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="text-[14px] font-bold text-ink">이번 주 관리 포인트</h2>
          <p className="mt-0.5 text-[12px] text-ink-soft">주간회의에서 먼저 짚을 항목을 모았습니다.</p>
          <div className="mt-4 space-y-3">
            <PointRow
              label="보강 예정 미이행"
              hint="예정 날짜가 잡혀 있고 아직 완료로 바뀌지 않은 인원"
              rows={pendingMakeup}
            />
            <PointRow
              label="심층 상담 도구 미진행"
              hint="평화 단계 이상인데 상담 도구를 한 번도 쓰지 않은 인원"
              rows={noTools}
              warn
            />
            <PointRow label="오픈 일정 미정" hint="평화 단계 이상인데 오픈 일정이 없는 인원" rows={openUnset} />
          </div>
        </Card>
      </div>

      {rows.length !== allRows.length && (
        <p className="text-[12px] text-ink-soft">담당 전도사 필터가 켜져 있습니다 — 수치는 필터된 인원 기준입니다.</p>
      )}
    </div>
  );
}

function PointRow({ label, hint, rows, warn = false }: { label: string; hint: string; rows: Row[]; warn?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {warn && rows.length > 0 ? (
          <AlertTriangle size={14} className="text-amber-700" />
        ) : (
          <CheckCircle2 size={14} className="text-zion-600" />
        )}
        <span className="text-[13px] font-medium text-ink">{label}</span>
        <span className="text-[12px] tabular-nums text-ink-soft">{rows.length}명</span>
      </div>
      <p className="mt-0.5 text-[11px] text-ink-soft">{hint}</p>
      {rows.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {rows.map((r) => (
            <StudentChip key={r.student.key} student={r.student} />
          ))}
        </div>
      )}
    </div>
  );
}

function StudentChip({ student }: { student: Student }) {
  return (
    <Link
      to={`/students/${encodeURIComponent(student.key)}`}
      className="rounded-full border border-zion-100 bg-white px-2 py-0.5 text-[11px] font-medium text-zion-700 hover:border-zion-700"
    >
      {student.name}
    </Link>
  );
}

/* ---------------- 단계 현황판 (단계 × 전도사 매트릭스) ---------------- */

function StagesTab({ rows }: { rows: Row[] }) {
  const activeEvs = EVANGELISTS.filter((e) => rows.some((r) => evangelistOf(r.student) === e.name));
  return (
    <div className="space-y-4">
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-[13px]">
          <thead>
            <tr className="border-b border-zion-100 text-left text-[12px] text-ink-soft">
              <th className="py-2 pr-3 font-medium">단계</th>
              {activeEvs.map((e) => (
                <th key={e.name} className="px-2 py-2 font-medium">
                  {e.name}
                  <span className="ml-1 font-normal">({e.division})</span>
                </th>
              ))}
              <th className="px-2 py-2 text-right font-medium">계</th>
            </tr>
          </thead>
          <tbody>
            {STAGES.map((stage) => {
              const inStage = rows.filter((r) => r.analysis.stage === stage);
              return (
                <tr key={stage} className="border-b border-zion-50 align-top">
                  <td className="py-2.5 pr-3">
                    <span className="font-bold text-ink">{stage}</span>
                  </td>
                  {activeEvs.map((e) => (
                    <td key={e.name} className="px-2 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {inStage
                          .filter((r) => evangelistOf(r.student) === e.name)
                          .map((r) => (
                            <StudentChip key={r.student.key} student={r.student} />
                          ))}
                      </div>
                    </td>
                  ))}
                  <td className="px-2 py-2.5 text-right tabular-nums text-ink-soft">{inStage.length}명</td>
                </tr>
              );
            })}
            <tr>
              <td className="py-2.5 pr-3 text-[12px] font-medium text-ink-soft">계</td>
              {activeEvs.map((e) => (
                <td key={e.name} className="px-2 py-2.5 text-[12px] tabular-nums text-ink-soft">
                  {rows.filter((r) => evangelistOf(r.student) === e.name).length}명
                </td>
              ))}
              <td className="px-2 py-2.5 text-right text-[12px] font-bold tabular-nums text-ink">{rows.length}명</td>
            </tr>
          </tbody>
        </table>
      </Card>

      <Accordion
        items={STAGES.map((stage) => ({
          id: stage,
          title: `${stage} — 판정 기준`,
          hint: STAGE_CRITERIA[stage],
          content: <p className="text-[13px] leading-relaxed text-ink-soft">{STAGE_CRITERIA[stage]}</p>,
        }))}
        defaultOpenFirst={false}
        compact
      />
    </div>
  );
}

/* ---------------- 필수보강 ---------------- */

function MakeupTab({ rows }: { rows: Row[] }) {
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-[14px] font-bold text-ink">주차별 공통 보강 흐름</h2>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[12px]">
          {WEEKLY_MAKEUP_FLOW.map((step, i) => (
            <span key={step} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-ink-soft">→</span>}
              <span className="rounded-full bg-zion-50 px-2.5 py-1 font-medium text-zion-700">{step}</span>
            </span>
          ))}
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <p className="mb-3 text-[12px] text-ink-soft">
          시트에서는 완료한 항목을 노란 박스로 바꿉니다 — 여기서는 완료·예정을 배지로 구분합니다.
        </p>
        <table className="w-full min-w-[820px] text-[12px]">
          <thead>
            <tr className="border-b border-zion-100 text-left text-ink-soft">
              <th className="py-2 pr-2 font-medium">수강생</th>
              <th className="px-1.5 py-2 font-medium">누적</th>
              {MAKEUP_TOPICS.map((t) => (
                <th key={t} className="px-1.5 py-2 font-medium">{t}</th>
              ))}
              <th className="px-1.5 py-2 font-medium">상담 도구</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ student, analysis }) => (
              <tr key={student.key} className="border-b border-zion-50">
                <td className="py-2 pr-2">
                  <StudentChip student={student} />
                </td>
                <td className="px-1.5 py-2 tabular-nums text-ink-soft">{analysis.makeupCount}회</td>
                {MAKEUP_TOPICS.map((topic) => {
                  const cell = analysis.makeup[topic];
                  return (
                    <td key={topic} className="px-1.5 py-2">
                      {cell ? (
                        <span
                          className={
                            "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-medium " +
                            (cell.status === "완료"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700")
                          }
                        >
                          {cell.status === "완료" ? <CheckCircle2 size={11} /> : <CircleDashed size={11} />}
                          {cell.date}
                        </span>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-1.5 py-2">
                  {analysis.counselTools.length > 0 ? (
                    <span className="text-ink-soft">{analysis.counselTools.join(" · ")}</span>
                  ) : STAGES.indexOf(analysis.stage) <= 3 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700">
                      <AlertTriangle size={11} />
                      미진행
                    </span>
                  ) : (
                    <span className="text-ink-soft">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ---------------- 주간 점검표 ---------------- */

const MARK_SPEC: Record<CheckMark, { short: string; cls: string; icon: typeof CheckCircle2 }> = {
  "확실,적극": { short: "확", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  미흡: { short: "미", cls: "bg-amber-50 text-amber-700 border-amber-200", icon: MinusCircle },
  "부정,안됨": { short: "부", cls: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
};

function CheckTab({ rows, evFilter }: { rows: Row[]; evFilter: string | null }) {
  // 17명을 한 표에 다 펴면 좁은 화면에서 못 읽는다 — 전도사 필터가 없으면 첫 전도사를 기본으로 편다
  const shown = evFilter ? rows : rows.filter((r) => evangelistOf(r.student) === EVANGELISTS[0].name);
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-ink-soft">
          <span className="font-medium text-ink">매주 일요일 주간회의에서 점검합니다</span>
          {CHECK_SCALE.map((m) => {
            const spec = MARK_SPEC[m];
            const Icon = spec.icon;
            return (
              <span key={m} className="inline-flex items-center gap-1">
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold ${spec.cls}`}>
                  {spec.short}
                </span>
                <Icon size={12} />
                {m}
              </span>
            );
          })}
          <span className="inline-flex items-center gap-1">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-zion-100 bg-white text-[10px] text-ink-soft">·</span>
            미점검
          </span>
        </div>
        {!evFilter && (
          <p className="mt-2 text-[12px] text-ink-soft">
            전도사 필터를 고르지 않아 <strong className="text-ink">{EVANGELISTS[0].name} ({EVANGELISTS[0].division})</strong> 담당분을
            먼저 보여 줍니다 — 위 필터에서 담당을 바꿀 수 있습니다.
          </p>
        )}
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[12px]">
          <thead>
            <tr className="border-b border-zion-100 text-left text-ink-soft">
              <th className="py-2 pr-3 font-medium">점검 문항</th>
              {shown.map((r) => (
                <th key={r.student.key} className="px-1 py-2 text-center font-medium">
                  <StudentChip student={r.student} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CHECK_SECTIONS.map((section, si) => (
              <SectionRows key={section.label} section={section} si={si} shown={shown} />
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function SectionRows({
  section,
  si,
  shown,
}: {
  section: (typeof CHECK_SECTIONS)[number];
  si: number;
  shown: Row[];
}) {
  return (
    <>
      <tr>
        <td colSpan={shown.length + 1} className="bg-zion-50 px-2 py-1.5 text-[11px] font-bold text-zion-700">
          {section.label}
        </td>
      </tr>
      {section.items.map((item, ii) => (
        <tr key={item} className="border-b border-zion-50">
          <td className="max-w-[320px] py-1.5 pr-3 leading-snug text-ink">{item}</td>
          {shown.map((r) => {
            const mark = checkAnswer(r.analysis, si, ii);
            const spec = mark ? MARK_SPEC[mark] : null;
            return (
              <td key={r.student.key} className="px-1 py-1.5 text-center">
                {spec ? (
                  <span
                    title={mark ?? undefined}
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold ${spec.cls}`}
                  >
                    {spec.short}
                  </span>
                ) : (
                  <span className="text-ink-soft">·</span>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

/* ---------------- 오픈 · 입교 ---------------- */

const EVENT_SPEC: Record<EventStatus, { cls: string; icon: typeof CheckCircle2 }> = {
  완료: { cls: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  완료부정: { cls: "border-amber-200 bg-amber-50 text-amber-700", icon: AlertTriangle },
  예정: { cls: "border-zion-100 bg-zion-50 text-zion-700", icon: CircleDashed },
  미정: { cls: "border-zion-100 bg-white text-ink-soft", icon: MinusCircle },
  수포: { cls: "border-red-200 bg-red-50 text-red-700", icon: XCircle },
};

function EventBadge({ status, date }: { status: EventStatus | null; date?: string }) {
  if (!status) return <span className="text-ink-soft">—</span>;
  const spec = EVENT_SPEC[status];
  const Icon = spec.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${spec.cls}`}>
      <Icon size={11} />
      {status}
      {date && <span className="font-normal">{date}</span>}
    </span>
  );
}

function EventsTab({ rows }: { rows: Row[] }) {
  const opened = rows.filter((r) => r.analysis.open.status === "완료" || r.analysis.open.status === "완료부정");
  const registered = rows.filter((r) => r.analysis.register.status === "완료");
  const given = rows.filter((r) => r.analysis.open.status === "수포").length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="오픈 진행률"
          value={`${rows.length ? Math.round((opened.length / rows.length) * 100) : 0}%`}
          sub={`재적 ${rows.length}명 중 ${opened.length}명 (완료부정 포함)`}
          accent
        />
        <StatTile label="완료부정" value={`${rows.filter((r) => r.analysis.open.status === "완료부정").length}명`} sub="진행했으나 반응이 부정적" />
        <StatTile label="수포" value={`${given}명`} sub="수강 포기로 일정 철회" />
        <StatTile label="입교 (교적부)" value={`${registered.length}명`} sub={`예정 ${rows.filter((r) => r.analysis.register.status === "예정").length}명`} />
      </div>

      <Card className="overflow-x-auto">
        <p className="mb-3 text-[12px] text-ink-soft">
          시트에서는 달력 날짜 칸에 「완료 이름(담당)」으로 적습니다 — 여기서는 인원별 진행 상태로 폈습니다.
        </p>
        <table className="w-full min-w-[560px] text-[13px]">
          <thead>
            <tr className="border-b border-zion-100 text-left text-[12px] text-ink-soft">
              <th className="py-2 pr-3 font-medium">수강생</th>
              <th className="px-2 py-2 font-medium">담당</th>
              <th className="px-2 py-2 font-medium">단계</th>
              <th className="px-2 py-2 font-medium">오픈</th>
              <th className="px-2 py-2 font-medium">입교 (교적부)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ student, analysis }) => (
              <tr key={student.key} className="border-b border-zion-50">
                <td className="py-2 pr-3">
                  <StudentChip student={student} />
                </td>
                <td className="px-2 py-2 text-ink-soft">{evangelistOf(student)}</td>
                <td className="px-2 py-2 font-medium text-ink">{analysis.stage}</td>
                <td className="px-2 py-2">
                  <EventBadge status={analysis.open.status} date={analysis.open.date} />
                </td>
                <td className="px-2 py-2">
                  <EventBadge status={analysis.register.status} date={analysis.register.date} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ---------------- 탈락 분석 ---------------- */

function DropoutTab({ evFilter }: { evFilter: string | null }) {
  const records = evFilter ? DROPOUTS.filter((d) => d.evangelist === evFilter) : DROPOUTS;
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-[14px] font-bold text-ink">사유 분포</h2>
        <p className="mt-0.5 text-[12px] text-ink-soft">
          누적 {records.length}명. 자책 없이 사실과 개선 방향만 적는 것이 기록 지침입니다.
        </p>
        <div className="mt-4 space-y-2.5">
          {DROPOUT_REASONS.map((reason) => {
            const count = records.filter((d) => d.reason === reason.label).length;
            const max = Math.max(1, ...DROPOUT_REASONS.map((r2) => records.filter((d) => d.reason === r2.label).length));
            return (
              <div key={reason.no} className="flex items-center gap-2">
                <span className="w-28 shrink-0 text-[12px] font-medium text-ink">
                  {reason.no}. {reason.label}
                </span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-zion-50">
                  <div className="h-full rounded bg-zion-600" style={{ width: `${(count / max) * 100}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right text-[12px] tabular-nums text-ink-soft">{count}명</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Accordion
        items={DROPOUT_REASONS.map((r) => ({
          id: String(r.no),
          title: `${r.no}. ${r.label}`,
          hint: r.desc,
          content: <p className="text-[13px] leading-relaxed text-ink-soft">{r.desc}</p>,
        }))}
        defaultOpenFirst={false}
        compact
      />

      <div className="space-y-3">
        {records.map((d) => (
          <Card key={d.name}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[14px] font-bold text-ink">{d.name}</span>
              <span className="text-[12px] text-ink-soft">담당 {d.evangelist}</span>
              <span className="rounded-full border border-zion-100 bg-zion-50 px-2 py-0.5 text-[11px] font-medium text-zion-700">
                {d.regType}
              </span>
              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                {d.reason}
              </span>
              <span className="text-[12px] text-ink-soft">본격 결석: {d.quitAt}</span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{d.analysis}</p>
          </Card>
        ))}
        {records.length === 0 && (
          <Card>
            <p className="text-[13px] text-ink-soft">이 담당의 탈락 기록이 없습니다.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
