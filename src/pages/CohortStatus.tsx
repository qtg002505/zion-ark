import { useState } from "react";
import { useSession } from "../lib/auth";
import { visibleDivisions } from "../lib/permissions";
import { STUDENTS, DIVISIONS, COHORT, TOTAL_SESSIONS } from "../content/cohort-mock";
import { PageHeader, Card, StatTile, StatusBadge } from "./common";

type Tab = "summary" | "attendance" | "divisions";

/** 기수 현황 — 요약 · 출석 · 분반 3탭 (원 저장소 CohortStatus 3탭 구조) */
export function CohortStatus() {
  const session = useSession();
  const [tab, setTab] = useState<Tab>("summary");

  const divisions = visibleDivisions(session, DIVISIONS);
  const students = STUDENTS.filter((s) => divisions.includes(s.division));

  const tabs: { id: Tab; label: string }[] = [
    { id: "summary", label: "기수 요약" },
    { id: "attendance", label: "출석 현황" },
    { id: "divisions", label: "분반별 현황" },
  ];

  return (
    <div>
      <PageHeader
        crumb="현황"
        title="기수 현황"
        desc={`${COHORT.tribe} 지파 · ${COHORT.church} · ${COHORT.cohort} — 진도 ${TOTAL_SESSIONS}회 (시범 목업 데이터)`}
      />

      <div className="mb-5 flex gap-1 rounded-xl bg-zion-100 p-1" role="tablist" aria-label="기수 현황 탭">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={
              "flex-1 rounded-lg px-4 py-2 text-[13px] font-semibold transition " +
              (tab === t.id ? "bg-white text-zion-900 shadow-sm" : "text-zion-600 hover:text-zion-800")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "summary" && (
        <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
          <StatTile label="등록 수강생" value={`${students.length}명`} sub={`${divisions.length}개 분반`} />
          <StatTile
            label="수강 유지"
            value={`${students.filter((s) => s.status === "active").length}명`}
            sub="97% 이상 출석 그룹"
          />
          <StatTile
            label="위기·중단"
            value={`${students.filter((s) => s.status !== "active").length}명`}
            sub="50% 미만 — 보강·상담 대상"
          />
        </div>
      )}

      {tab === "attendance" && (
        <Card>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-zion-100 text-left text-[12px] text-ink-soft">
                <th className="pb-2 font-medium">이름</th>
                <th className="pb-2 font-medium">분반</th>
                <th className="pb-2 font-medium">출석</th>
                <th className="pb-2 font-medium">출석률</th>
                <th className="pb-2 font-medium">최근 출석</th>
                <th className="pb-2 font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {[...students]
                .sort((a, b) => a.attendanceRate - b.attendanceRate)
                .map((s) => (
                  <tr key={s.key} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 font-medium text-ink">{s.name}</td>
                    <td className="py-2.5 text-ink-soft">{s.division}</td>
                    <td className="py-2.5 text-ink-soft">
                      {s.presentCount}/{s.totalSessions}회
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zion-100">
                          <div className="h-full rounded-full bg-zion-700" style={{ width: `${s.attendanceRate}%` }} />
                        </div>
                        <span className="font-semibold text-zion-800">{s.attendanceRate}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-ink-soft">{s.lastAttended ?? "—"}</td>
                    <td className="py-2.5">
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] text-ink-soft">
            출결 원본은 읽기 전용 시트에서 동기화됩니다 — 이 화면에서 수정할 수 없고, 원본 수정 후 다음 동기화를
            기다립니다.
          </p>
        </Card>
      )}

      {tab === "divisions" && (
        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
          {divisions.map((d) => {
            const group = students.filter((s) => s.division === d);
            const active = group.filter((s) => s.status === "active").length;
            return (
              <Card key={d}>
                <div className="flex items-center justify-between">
                  <div className="text-[15px] font-bold text-zion-900">{d}</div>
                  <div className="text-[12px] text-ink-soft">{group.length}명</div>
                </div>
                <div className="mt-3 space-y-1.5">
                  {group.map((s) => (
                    <div key={s.key} className="flex items-center justify-between text-[13px]">
                      <span className="text-ink">{s.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-ink-soft">{s.attendanceRate}%</span>
                        <StatusBadge status={s.status} />
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 border-t border-zion-100 pt-2 text-[12px] text-ink-soft">
                  유지 {active} · 위기·중단 {group.length - active}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
