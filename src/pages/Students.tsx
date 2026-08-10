import { useMemo, useState } from "react";
import { Maximize2, Search } from "lucide-react";
import { useSession } from "../lib/auth";
import { studentScopeLabel, visibleDivisions } from "../lib/permissions";
import { STUDENTS, DIVISIONS, STATUS_LABELS } from "../content/cohort-mock";
import type { Student } from "../lib/types";
import { StudentDetailModal } from "../components/StudentDetailModal";
import { PageHeader, Card, StatusBadge } from "./common";

type StatusFilter = "all" | Student["status"];

/** 수강생 관리 — 상태 분류·필터 (2단계 범위 미리보기) */
export function Students() {
  const session = useSession();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  /**
   * 상세를 **팝업으로** 연다 (2026-08-10 리드 지시). 페이지를 통째로 바꾸면 목록으로
   * 돌아올 때 스크롤 위치와 필터를 잃어 여러 명을 훑기 번거롭다.
   */
  const [picked, setPicked] = useState<string | null>(null);

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
        crumb="수강생 관리 도우미"
        title="수강생 관리"
        desc={`조회 범위: ${studentScopeLabel(session)} — 범위 밖 조회는 서버가 차단(403)합니다.`}
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
              <li key={s.key}>
                {/* 줄 전체가 눌린다 — 이름만 누르게 하면 손가락으로 맞히기 어렵다 */}
                <button
                  onClick={() => setPicked(s.key)}
                  aria-haspopup="dialog"
                  className="group -mx-2 flex w-[calc(100%+1rem)] items-center gap-4 rounded-lg px-2 py-3 text-left transition hover:bg-zion-50"
                >
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
                  {/*
                    줄 전체가 눌리지만 **눌러도 되는 자리라는 것이 보여야** 한다 —
                    화살표만 두었더니 눈에 띄지 않는다는 지적을 받아 버튼을 세웠다(2026-08-10).
                    실제 클릭은 바깥 버튼이 받으므로 이건 `span`이다(버튼 안에 버튼 금지).
                  */}
                  <span className="flex shrink-0 items-center gap-1 rounded-lg bg-zion-800 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition group-hover:bg-zion-700">
                    <Maximize2 size={11} /> 상세 보기
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 border-t border-zion-100 pt-3 text-[11px] text-ink-soft">
          이름을 누르면 상세가 창으로 열립니다 — 목록 자리를 잃지 않습니다. 시범 목업
          데이터(가상 인물)입니다. 실제 연동 시 이름·인적사항 등 원문 개인정보는 담당 범위 밖으로
          내보낼 수 없으며, 상담·차트 기록은 담당자와 열람 권한자에게만 표시됩니다.
        </p>
      </Card>

      {picked && <StudentDetailModal studentKey={picked} onClose={() => setPicked(null)} />}
    </div>
  );
}
