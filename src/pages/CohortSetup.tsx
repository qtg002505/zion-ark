import { useMemo, useState } from "react";
import { CalendarDays, Download, Lock, Plus, Trash2, Upload, Users } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { canEditCohortRecord } from "../lib/permissions";
import { COHORT_LIST, RUNNING_COHORT } from "../content/cohort-mock";
import { CHECKLIST_STANDARDS } from "../content/checklist-standards";
import { LEVEL_NAME, LEVEL_TONE } from "../content/level-labels";
import {
  COHORT_CHANGE_LABELS,
  MATERIAL_LEVELS,
  ROLE_LABELS,
  type CohortChangeKind,
  type MaterialLevel,
  type ScheduleOverride,
} from "../lib/types";
import { effectiveSchedule, scheduleSummary } from "../lib/cohort-calendar";
import { buildXlsx, downloadBlob, readXlsx } from "../lib/xlsx";
import { ProgressUpload } from "../components/ProgressUpload";
import { PageHeader, Card } from "./common";

/**
 * 기수 세팅 · 지난 기수 (2026-08-21 리드 지시로 신설).
 *
 * ## 무엇을 하는 화면인가
 *
 * 새 기수를 열 때 흩어져 있던 것 — 진도표 · 단계 향상표 · 사명자 · 수강생 — 을 **한 자리에서
 * 양식으로 넣는다.** 그리고 지난 기수를 열어 일정과 운영을 본다.
 *
 * ## 지켜야 할 것
 *
 * - **현재 기수는 고치고, 종료된 기수는 조회·다운로드만 된다** (리드 지시).
 *   `closed`면 편집 자리를 아예 그리지 않는다 — 눌러 보고 막히는 것보다 낫다.
 * - **양식을 내려받아 채운 뒤 올려야 들어간다.** 화면에서 한 줄씩 치는 자리를 만들지 않았다 —
 *   기수 하나가 수십 줄이라 손으로 치면 아무도 안 쓴다.
 * - ⛔ **사명자·수강생 명단은 올려도 저장하지 않는다.** 읽어서 「이렇게 들어옵니다」를
 *   보여 줄 뿐이다. 명단의 정본은 행정 시스템이고, 이름이 든 표를 브라우저에 쌓아 두면
 *   반출 경로가 하나 늘어난다(불변식 2). 실연동 때 서버로 곧장 보낸다.
 * - **단계 향상표는 표준을 못 고친다.** 지파가 세부 항목을 **덧붙일** 뿐이다
 *   (`ChecklistExtra`) — 표준이 지파마다 갈라지면 기수 비교가 무너진다.
 *
 * ## 아직 사람이 정해야 하는 것
 *
 * - **누가 세팅하는가** — 지금은 기수 기록 권한(`canEditCohortRecord`, 해당 기수 강사·전도사)을
 *   그대로 쓴다. 사명자 배정처럼 관리직 몫으로 보이는 것이 섞여 있어 리드 확인이 필요하다.
 * - **지파별·교회별 체크리스트 적용 범위** — 총회·지파 신학부장 논의 중이라 지금은 기수 단위다.
 * - **우수 기수 공개 범위** — 지금은 같은 기수 담당자에게만 보인다.
 */
export function CohortSetup() {
  const session = useSession();
  const { scheduleOverrides } = useStore();
  const [cohortId, setCohortId] = useState(RUNNING_COHORT.key);

  const cohort = COHORT_LIST.find((c) => c.key === cohortId) ?? RUNNING_COHORT;
  /*
    ⚠️ **저장·권한에 쓰는 키는 「지파|교회|기수」 전체다** (`cohortKeyOf`와 같은 모양).
    화면에서 고르는 값(`cohortId`)은 「113기」뿐이라 그대로 넘기면 권한이 늘 막힌다 —
    주간계획·주차 기록이 이미 전체 키로 저장돼 있어 형식을 맞춰야 같은 기수로 이어진다.
  */
  const cohortKey = `${cohort.tribe}|${cohort.church}|${cohort.key}`;
  const closed = cohort.status === "closed";
  /* 종료된 기수는 담당자여도 못 고친다 — 상태가 권한보다 앞선다 */
  const canEdit = !closed && canEditCohortRecord(session, cohortKey);

  return (
    <div>
      <PageHeader
        crumb="기수 세팅"
        title="기수 세팅 · 지난 기수"
        desc="새 기수에 필요한 것을 한 자리에서 양식으로 넣습니다. 지난 기수는 열어 보고 내려받을 수 있습니다."
      />

      <Card className="mt-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label
              htmlFor="cohort-pick"
              className="mb-1 block text-[12px] font-semibold text-ink"
            >
              기수
            </label>
            {/* 기수는 해마다 쌓이므로 알약 전환기가 아니라 목록으로 고른다 */}
            <select
              id="cohort-pick"
              value={cohortId}
              onChange={(e) => setCohortId(e.target.value)}
              className="rounded-lg border border-zion-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500"
            >
              {COHORT_LIST.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.key} · {c.startsOn.slice(0, 7)} ~ {c.endsOn.slice(0, 7)}
                  {c.status === "closed" ? " (종료)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 pb-1">
            {closed ? (
              <span className="flex items-center gap-1 rounded-lg bg-zion-100 px-2 py-1 text-[11.5px] font-semibold text-zion-700">
                <Lock size={12} /> 종료 · 조회와 내려받기만 됩니다
              </span>
            ) : (
              <span className="rounded-lg bg-gold-100 px-2 py-1 text-[11.5px] font-semibold text-ink">
                진행 중
              </span>
            )}
            {cohort.exemplary && (
              <span className="rounded-lg bg-gold-500 px-2 py-1 text-[11.5px] font-bold text-zion-950">
                우수 기수
              </span>
            )}
            {!closed && !canEdit && (
              <span className="text-[11.5px] text-ink-soft">
                담당 기수가 아니어서 보기만 됩니다.
              </span>
            )}
          </div>
        </div>

        <CohortFacts cohortId={cohortId} />

        {cohort.note && (
          <p className="mt-3 rounded-lg bg-zion-50 px-3 py-2 text-[12px] leading-relaxed text-ink">
            <span className="font-semibold text-zion-700">운영 기록</span> {cohort.note}
          </p>
        )}

        {/*
          종료 기수 데이터의 보관·이관 (2026-08-21 리드 회의록) — **설계 대기라 안내만 한다.**
          방향은 「완전 삭제보다 권한별 보관 · 종합 데이터는 지정 관리자(신학서무·신학부장)에게
          이관 · 일반 강사·전도사는 필요한 범위만」이다. 확정되면 `permissions.ts`에 넣는다
          (`docs/decisions/OPEN_QUESTIONS.md` §F).
        */}
        {closed && (
          <p className="mt-3 rounded-lg bg-zion-50 px-3 py-2 text-[11.5px] leading-relaxed text-ink-soft">
            종료된 기수의 데이터 보관 기간과 열람 권한은 정해지는 대로 적용됩니다. 지금은 담당
            범위 안에서 조회와 내려받기만 됩니다.
          </p>
        )}

        <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
          시범 기수입니다. 사람 이름은 모두 가상이며 실제 기수 자료가 아닙니다.
        </p>
      </Card>

      <SetupForms cohortId={cohortId} closed={closed} />
      <ChecklistExtras cohortKey={cohortKey} canEdit={canEdit} />
      <CohortChanges cohortKey={cohortKey} canEdit={canEdit} />

      {/* 일정 편집은 전체 현황에 이미 있다 — 여기서는 어디로 가면 되는지만 알린다 */}
      <Card className="mt-4">
        <div className="mb-1 flex items-center gap-1.5 text-[14px] font-bold text-zion-900">
          <CalendarDays size={15} className="text-zion-600" /> 일정과 요일 구간
        </div>
        <p className="text-[12.5px] leading-relaxed text-ink">
          개강일·종강 예정일과 수업 요일 구간은 전체 현황의 일정 편집에서 고칩니다. 여기서 다시
          받지 않는 것은 같은 값을 두 곳에서 고치게 되면 어긋나기 때문입니다.
        </p>
        <p className="mt-1 text-[11.5px] text-ink-soft">
          지금 이 기수: {scheduleLine(cohortId, cohortKey, scheduleOverrides)}
        </p>
      </Card>
    </div>
  );
}

/**
 * 기수 한 줄 요약 — 일정 산수는 `cohort-calendar` 한 곳을 거친다.
 * ⚠️ 목록에서 찾을 때는 `cohortId`(113기), 수정값을 찾을 때는 `cohortKey`(전체)다.
 */
function scheduleLine(
  cohortId: string,
  cohortKey: string,
  overrides: ScheduleOverride[],
): string {
  const cohort = COHORT_LIST.find((c) => c.key === cohortId) ?? RUNNING_COHORT;
  const s = effectiveSchedule(
    { startsOn: cohort.startsOn, endsOn: cohort.endsOn },
    overrides,
    cohortKey,
  );
  const sum = scheduleSummary(s.startsOn, s.endsOn, s.weekdayPeriods);
  return `${s.startsOn} ~ ${s.endsOn} · ${sum.months}개월 · 수업 ${sum.sessions}회`;
}

function CohortFacts({ cohortId }: { cohortId: string }) {
  const cohort = COHORT_LIST.find((c) => c.key === cohortId) ?? RUNNING_COHORT;
  const facts: [string, string][] = [
    ["소속", `${cohort.tribe}지파 · ${cohort.church}`],
    ["기간", `${cohort.startsOn} ~ ${cohort.endsOn}`],
    ["수강생", `개강 ${cohort.startedCount}명 → 지금 ${cohort.currentCount}명`],
    ["사명자", `${cohort.instructors.join(" · ")} / ${cohort.evangelists.join(" · ")}`],
  ];
  return (
    <dl className="mt-3 grid grid-cols-2 gap-2 max-md:grid-cols-1">
      {facts.map(([k, v]) => (
        <div key={k} className="rounded-lg bg-zion-50 px-3 py-2">
          <dt className="text-[11px] text-ink-soft">{k}</dt>
          <dd className="mt-0.5 text-[12.5px] font-semibold text-zion-900">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ── 양식 넷 — 내려받아 채운 뒤 올린다 ── */

/**
 * 명단 양식(사명자·수강생)은 **읽어서 보여 주기만** 한다.
 * 저장하지 않는 이유는 파일 첫머리 주석에 있다(불변식 2).
 */
function SetupForms({
  cohortId,
  closed,
}: {
  /** 파일 이름에 쓰는 짧은 이름 — 전체 키에는 `|`가 있어 파일명으로 못 쓴다 */
  cohortId: string;
  closed: boolean;
}) {
  const [preview, setPreview] = useState<{ title: string; rows: string[][] } | null>(null);

  function downloadStaffForm() {
    downloadBlob(
      buildXlsx(
        [
          ["역할", "이름", "담당 분반", "비고"],
          ["강사", "예) 김강사", "", ""],
          ["전도사", "예) 이전도", "1분반", ""],
        ],
        "사명자",
      ),
      `${cohortId}_사명자_양식.xlsx`,
    );
  }

  function downloadStudentForm() {
    downloadBlob(
      buildXlsx(
        [
          ["이름", "나이", "소속", "분반", "등록일", "비고"],
          ["예) 홍길동", "34", "청년", "1분반", "2026-03-02", ""],
        ],
        "수강생",
      ),
      `${cohortId}_수강생_양식.xlsx`,
    );
  }

  async function readInto(file: File, title: string) {
    try {
      const table = file.name.toLowerCase().endsWith(".csv")
        ? (await file.text())
            .replace(/^﻿/, "")
            .split(/\r?\n/)
            .filter((l) => l.trim())
            .map((l) => l.split(",").map((c) => c.trim()))
        : await readXlsx(file);
      setPreview({ title, rows: table.slice(0, 12) });
    } catch {
      setPreview({ title, rows: [["파일을 읽지 못했습니다. 양식을 내려받아 그대로 채워 주세요."]] });
    }
  }

  return (
    <Card className="mt-4">
      <div className="mb-1 flex items-center gap-1.5 text-[14px] font-bold text-zion-900">
        <Upload size={15} className="text-zion-600" /> 한 번에 세팅
      </div>
      <p className="mb-3 text-[12.5px] leading-relaxed text-ink">
        양식을 내려받아 채운 뒤 올리면 들어갑니다. 열 이름과 순서를 그대로 두어야 읽힙니다.
      </p>

      <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
        <div className="rounded-lg border border-zion-100 p-3">
          <div className="text-[13px] font-semibold text-zion-900">진도표</div>
          {/* 올리기(자동 반영)는 2026-08-22 리드 지시로 뺐다 — 서식이 어긋나면 잘못 들어가서다.
              양식을 기준 삼아 월간·주간 계획 달력에 직접 적는다 */}
          <p className="mb-2 mt-0.5 text-[11.5px] leading-relaxed text-ink-soft">
            날짜·구분·회차·내용. 이 양식을 기준으로 월간·주간 계획 달력에 직접 적습니다.
          </p>
          <ProgressUpload />
        </div>

        <div className="rounded-lg border border-zion-100 p-3">
          <div className="text-[13px] font-semibold text-zion-900">단계 향상표</div>
          <p className="mb-2 mt-0.5 text-[11.5px] leading-relaxed text-ink-soft">
            표준 항목은 그대로 두고 지파가 쓰는 세부 항목만 덧붙입니다. 아래 칸에서 직접
            넣거나 지웁니다.
          </p>
          <p className="text-[11.5px] text-ink-soft">아래 「단계 향상표 보충」에서 다룹니다.</p>
        </div>

        <FormSlot
          title="사명자"
          hint="역할·이름·담당 분반. 올리면 어떻게 읽히는지 보여 줍니다."
          onDownload={downloadStaffForm}
          onFile={(f) => readInto(f, "사명자")}
          readOnly={closed}
        />
        <FormSlot
          title="수강생"
          hint="이름·나이·소속·분반·등록일. 올리면 어떻게 읽히는지 보여 줍니다."
          onDownload={downloadStudentForm}
          onFile={(f) => readInto(f, "수강생")}
          readOnly={closed}
        />
      </div>

      <p className="mt-3 rounded-lg bg-gold-100/60 px-3 py-2 text-[11.5px] leading-relaxed text-ink">
        <span className="font-bold">유의</span> 사명자·수강생 명단은 올려도 이 사이트에 저장하지
        않습니다. 읽어서 보여 주기만 하며, 실제 반영은 행정 시스템과 이어진 뒤에 됩니다.
        <br />
        이름이 든 표를 브라우저에 쌓아 두지 않으려는 것입니다.
      </p>

      {preview && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-zion-900">
              {preview.title} — 읽은 결과 (처음 12줄)
            </span>
            <button
              onClick={() => setPreview(null)}
              className="text-[11.5px] text-ink-soft hover:underline"
            >
              닫기
            </button>
          </div>
          <div className="-mx-1 max-h-[40vh] overflow-auto px-1">
            <table className="w-full min-w-[520px] text-[12px]">
              <tbody>
                {preview.rows.map((r, i) => (
                  <tr key={i} className={i === 0 ? "bg-zion-50 font-semibold" : ""}>
                    {r.map((c, j) => (
                      <td key={j} className="border-b border-zion-100 px-2 py-1.5">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

function FormSlot({
  title,
  hint,
  onDownload,
  onFile,
  readOnly,
}: {
  title: string;
  hint: string;
  onDownload: () => void;
  onFile: (f: File) => void;
  readOnly: boolean;
}) {
  return (
    <div className="rounded-lg border border-zion-100 p-3">
      <div className="text-[13px] font-semibold text-zion-900">{title}</div>
      <p className="mb-2 mt-0.5 text-[11.5px] leading-relaxed text-ink-soft">{hint}</p>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          onClick={onDownload}
          className="flex items-center gap-1.5 rounded-lg border border-zion-200 px-3 py-2 text-[12px] font-semibold text-zion-700 transition hover:bg-zion-50"
        >
          <Download size={14} /> 양식 내려받기
        </button>
        {!readOnly && (
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-zion-800 px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-zion-700">
            <Upload size={14} /> 올리기
            <input
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = "";
              }}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );
}

/* ── 단계 향상표 보충 — 표준 뒤에 덧붙는다 ── */

function ChecklistExtras({ cohortKey, canEdit }: { cohortKey: string; canEdit: boolean }) {
  const session = useSession();
  const { checklistExtras, addChecklistExtra, removeChecklistExtra } = useStore();
  const [level, setLevel] = useState<MaterialLevel>("초등");
  const [groupNo, setGroupNo] = useState(1);
  const [question, setQuestion] = useState("");

  const standard = CHECKLIST_STANDARDS[level];
  const mine = useMemo(
    () => checklistExtras.filter((c) => c.cohortKey === cohortKey && c.level === level),
    [checklistExtras, cohortKey, level],
  );

  return (
    <Card className="mt-4">
      <div className="mb-1 flex items-center gap-1.5 text-[14px] font-bold text-zion-900">
        단계 향상표 보충
      </div>
      <p className="mb-3 text-[12.5px] leading-relaxed text-ink">
        표준 항목은 그대로 두고, 우리 지파가 쓰는 세부 항목만 덧붙입니다. 여기서 넣은 항목은
        수강생 상세의 성장 지표와 「지금 우리 기수는」에 함께 나옵니다.
      </p>

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="extra-level" className="mb-1 block text-[12px] font-semibold text-ink">
            단계
          </label>
          {/* 폼 값 고르기라 알약 전환기를 쓰지 않는다 — 색만 맞춘다 */}
          <select
            id="extra-level"
            value={level}
            onChange={(e) => {
              setLevel(e.target.value as MaterialLevel);
              setGroupNo(1);
            }}
            className={"rounded-lg px-3 py-2 text-[13px] font-semibold outline-none " + LEVEL_TONE[level]}
          >
            {MATERIAL_LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_NAME[l]}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[180px] flex-1">
          <label htmlFor="extra-group" className="mb-1 block text-[12px] font-semibold text-ink">
            붙일 표준 항목
          </label>
          <select
            id="extra-group"
            value={groupNo}
            onChange={(e) => setGroupNo(Number(e.target.value))}
            className="w-full rounded-lg border border-zion-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500"
          >
            {standard.groups.map((g) => (
              <option key={g.no} value={g.no}>
                {g.no}. {g.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {canEdit ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const q = question.trim();
            if (q.length < 2) return;
            addChecklistExtra({
              cohortKey,
              level,
              groupNo,
              question: q,
              createdBy: session.name,
              createdByRole: session.roleCode,
            });
            setQuestion("");
          }}
          className="mb-3 flex flex-wrap items-center gap-2"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="예) 가정 예배를 드리는가"
            aria-label="덧붙일 점검 항목"
            className="min-w-[220px] flex-1 rounded-lg border border-zion-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500"
          />
          <button
            type="submit"
            disabled={question.trim().length < 2}
            className="flex items-center gap-1.5 rounded-lg bg-zion-800 px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-zion-700 disabled:cursor-not-allowed disabled:bg-zion-300"
          >
            <Plus size={14} /> 저장
          </button>
        </form>
      ) : (
        <p className="mb-3 text-[11.5px] text-ink-soft">
          담당 기수의 강사·전도사만 넣을 수 있습니다.
        </p>
      )}

      {mine.length === 0 ? (
        <p className="rounded-lg bg-zion-50 px-3 py-3 text-center text-[12px] text-ink-soft">
          덧붙인 항목이 없습니다. 표준 항목만 쓰고 있습니다.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {mine.map((c) => {
            const g = standard.groups.find((x) => x.no === c.groupNo);
            return (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-zion-100 px-3 py-2"
              >
                <span className={"rounded px-1.5 py-0.5 text-[10.5px] font-bold " + LEVEL_TONE[c.level]}>
                  {LEVEL_NAME[c.level]}
                </span>
                <span className="text-[11.5px] text-ink-soft">
                  {c.groupNo}. {g?.label ?? "표준에 없는 항목"}
                </span>
                <span className="min-w-0 flex-1 text-[12.5px] text-ink">{c.question}</span>
                <span className="text-[11px] text-ink-soft">
                  {c.createdBy} · {ROLE_LABELS[c.createdByRole]}
                </span>
                {canEdit && (
                  <button
                    onClick={() => removeChecklistExtra(c.id)}
                    aria-label="이 항목 지우기"
                    className="rounded p-1 text-ink-soft transition hover:bg-zion-100"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ── 편성 변동 — 행정 시스템보다 현장이 빠른 것들 ── */

function CohortChanges({ cohortKey, canEdit }: { cohortKey: string; canEdit: boolean }) {
  const session = useSession();
  const { cohortChanges, addCohortChange, removeCohortChange } = useStore();
  const [kind, setKind] = useState<CohortChangeKind>("evangelist");
  const [effectiveOn, setEffectiveOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [body, setBody] = useState("");

  const mine = cohortChanges.filter((c) => c.cohortKey === cohortKey);

  return (
    <Card className="mt-4">
      <div className="mb-1 flex items-center gap-1.5 text-[14px] font-bold text-zion-900">
        <Users size={15} className="text-zion-600" /> 편성 변동
      </div>
      <p className="mb-3 text-[12.5px] leading-relaxed text-ink">
        전도사가 바뀌거나, 유급 수강생이 옮겨 오거나, 청년·장년이 합반한 것을 적습니다. 행정
        시스템에 아직 반영되지 않은 것을 여기에 남겨 두면 담당자가 함께 봅니다.
      </p>

      {canEdit ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const t = body.trim();
            if (t.length < 3) return;
            addCohortChange({
              cohortKey,
              kind,
              body: t,
              effectiveOn,
              createdBy: session.name,
              createdByRole: session.roleCode,
            });
            setBody("");
          }}
          className="mb-3 space-y-2"
        >
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label htmlFor="chg-kind" className="mb-1 block text-[12px] font-semibold text-ink">
                무엇이 바뀌었나
              </label>
              <select
                id="chg-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as CohortChangeKind)}
                className="rounded-lg border border-zion-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500"
              >
                {(Object.keys(COHORT_CHANGE_LABELS) as CohortChangeKind[]).map((k) => (
                  <option key={k} value={k}>
                    {COHORT_CHANGE_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="chg-date" className="mb-1 block text-[12px] font-semibold text-ink">
                언제부터
              </label>
              <input
                id="chg-date"
                type="date"
                value={effectiveOn}
                onChange={(e) => setEffectiveOn(e.target.value)}
                className="rounded-lg border border-zion-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500"
              />
            </div>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            placeholder="예) 3분반 담당이 이전도에서 한전도로 바뀌었습니다"
            aria-label="변동 내용"
            className="w-full resize-y rounded-lg border border-zion-200 bg-white px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-zion-500"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={body.trim().length < 3}
              className="rounded-lg bg-zion-800 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-zion-700 disabled:cursor-not-allowed disabled:bg-zion-300"
            >
              저장
            </button>
          </div>
        </form>
      ) : (
        <p className="mb-3 text-[11.5px] text-ink-soft">
          담당 기수의 강사·전도사만 적을 수 있습니다.
        </p>
      )}

      {mine.length === 0 ? (
        <p className="rounded-lg bg-zion-50 px-3 py-3 text-center text-[12px] text-ink-soft">
          적힌 변동이 없습니다.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {mine.map((c) => (
            <li key={c.id} className="rounded-lg border border-zion-100 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-zion-100 px-1.5 py-0.5 text-[10.5px] font-bold text-zion-700">
                  {COHORT_CHANGE_LABELS[c.kind]}
                </span>
                <span className="text-[11.5px] text-ink-soft">{c.effectiveOn}부터</span>
                <span className="ml-auto text-[11px] text-ink-soft">
                  {c.createdBy} · {ROLE_LABELS[c.createdByRole]}
                </span>
                {canEdit && (
                  <button
                    onClick={() => removeCohortChange(c.id)}
                    aria-label="이 변동 지우기"
                    className="rounded p-1 text-ink-soft transition hover:bg-zion-100"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
        여기 적은 것은 이 기수 담당자에게만 보입니다. 사이트 밖으로 나가지 않습니다.
      </p>
    </Card>
  );
}
