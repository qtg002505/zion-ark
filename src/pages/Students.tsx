import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useSession } from "../lib/auth";
import { visibleDivisions } from "../lib/permissions";
import { STUDENTS, DIVISIONS, STATUS_LABELS } from "../content/cohort-mock";
import type { Student } from "../lib/types";
import { PageHeader, Card, StatusBadge } from "./common";

type StatusFilter = "all" | Student["status"];

/** 수강생 관리 — 상태 분류·필터 (2단계 범위 미리보기) */
export function Students() {
  const session = useSession();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const divisions = visibleDivisions(session, DIVISIONS);

  const list = useMemo(() => {
    return STUDENTS.filter((s) => divisions.includes(s.division))
      .filter((s) => statusFilter === "all" || s.status === statusFilter)
      .filter((s) => divisionFilter === "all" || s.division === divisionFilter)
      .filter((s) => !query.trim() || s.name.includes(query.trim()))
      .sort((a, b) => a.attendanceRate - b.attendanceRate);
  }, [divisions, statusFilter, divisionFilter, query]);

  return (
    <div>
      <PageHeader
        crumb="현황"
        title="수강생 관리"
        desc={
          session.roleCode === "evangelist"
            ? `담당 분반(${session.division})의 수강생만 표시됩니다 — 범위 밖 조회는 서버가 차단(403)합니다.`
            : "담당 범위의 수강생을 상태·분반으로 분류해 관리합니다."
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-zion-100 p-1">
          {(["all", "active", "atRisk", "paused"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={
                "rounded-md px-3 py-1.5 text-[12px] font-semibold transition " +
                (statusFilter === f ? "bg-white text-zion-900 shadow-sm" : "text-zion-600 hover:text-zion-800")
              }
            >
              {f === "all" ? "전체" : STATUS_LABELS[f]}
            </button>
          ))}
        </div>

        {divisions.length > 1 && (
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            aria-label="분반 필터"
            className="rounded-lg border border-zion-100 bg-white px-3 py-1.5 text-[12px] outline-none focus:border-zion-500"
          >
            <option value="all">모든 분반</option>
            {divisions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}

        <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-zion-100 bg-white px-3 py-1.5">
          <Search size={13} className="text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름 검색"
            aria-label="수강생 이름 검색"
            className="w-28 bg-transparent text-[12px] outline-none"
          />
        </div>
      </div>

      <Card>
        {list.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-ink-soft">조건에 맞는 수강생이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-zion-100">
            {list.map((s) => (
              <li key={s.key} className="flex items-center gap-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zion-100 text-[13px] font-bold text-zion-700">
                  {s.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-ink">{s.name}</span>
                    <span className="text-[12px] text-ink-soft">{s.division}</span>
                  </div>
                  <div className="mt-0.5 text-[12px] text-ink-soft">
                    출석 {s.presentCount}/{s.totalSessions}회 ({s.attendanceRate}%) · 최근 출석{" "}
                    {s.lastAttended ?? "기록 없음"}
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 border-t border-zion-100 pt-3 text-[11px] text-ink-soft">
          시범 목업 데이터(가상 인물)입니다. 실제 연동 시 이름·인적사항 등 원문 개인정보는 담당 범위 밖으로
          내보낼 수 없으며, 상담·차트 기록은 담당자와 열람 권한자에게만 표시됩니다.
        </p>
      </Card>
    </div>
  );
}
