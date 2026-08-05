import { Link } from "react-router-dom";
import { Megaphone } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { visibleDivisions } from "../lib/permissions";
import { STUDENTS, DIVISIONS, COHORT, TOTAL_SESSIONS } from "../content/cohort-mock";
import { PageHeader, Card, StatTile } from "./common";

/**
 * 전체 현황 — 화면 설계 지침: 평균이 아니라 분포를 보여라.
 * 출석률이 상·하위로 갈리고 중간이 비는 구조가 첫 화면에서 드러나야 한다.
 */
export function Overview() {
  const session = useSession();
  const { entries } = useStore();

  const divisions = visibleDivisions(session, DIVISIONS);
  const students = STUDENTS.filter((s) => divisions.includes(s.division));

  // 출석률 10%p 구간 분포
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    label: `${i * 10}~${i * 10 + 9}%`,
    count: students.filter((s) => s.attendanceRate >= i * 10 && s.attendanceRate < i * 10 + 10).length,
  }));
  buckets[9].count += students.filter((s) => s.attendanceRate === 100).length;
  buckets[9].label = "90~100%";
  const maxBucket = Math.max(1, ...buckets.map((b) => b.count));

  const total = students.length;
  const activeCount = students.filter((s) => s.status === "active").length;
  const riskCount = students.filter((s) => s.status !== "active").length;
  const cumRate =
    total === 0 ? 0 : Math.round(students.reduce((a, s) => a + s.attendanceRate, 0) / total);

  // 대면 시간대 집계 — 저녁 비중은 보강 편성 신호
  const slotTotal = students.reduce(
    (acc, s) => ({
      evening: acc.evening + s.slotCounts.evening,
      morning: acc.morning + s.slotCounts.morning,
      afternoon: acc.afternoon + s.slotCounts.afternoon,
    }),
    { evening: 0, morning: 0, afternoon: 0 },
  );
  const slotSum = slotTotal.evening + slotTotal.morning + slotTotal.afternoon || 1;
  const eveningPct = Math.round((slotTotal.evening / slotSum) * 100);

  const pinned = entries.filter((e) => e.kind === "notice_hq" && e.pinned).slice(0, 2);

  const scopeDesc =
    session.roleCode === "evangelist"
      ? `${COHORT.church} ${COHORT.cohort} ${session.division} (담당 분반)`
      : `${COHORT.tribe} 지파 · ${COHORT.church} · ${COHORT.cohort}`;

  return (
    <div>
      <PageHeader
        crumb="현황"
        title="전체 현황"
        desc={`조회 범위: ${scopeDesc} — 서버가 담당 배정(memberships)으로 스코프한 범위만 표시됩니다.`}
      />

      {pinned.length > 0 && (
        <div className="mb-5 space-y-2">
          {pinned.map((n) => (
            <Link
              key={n.id}
              to="/notices"
              className="flex items-center gap-3 rounded-xl border border-zion-200 bg-zion-50 px-4 py-3 transition hover:border-zion-500"
            >
              <Megaphone size={16} className="shrink-0 text-zion-700" />
              <span className="text-[13px] font-semibold text-zion-900">{n.title}</span>
              <span className="ml-auto shrink-0 text-[11px] text-zion-700">총회 공지 · 고정</span>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2">
        <StatTile label="수강생" value={`${total}명`} sub={`${divisions.length}개 분반`} accent />
        <StatTile label="누적 출석률" value={`${cumRate}%`} sub={`진도 ${TOTAL_SESSIONS}회 기준`} />
        <StatTile label="수강 중" value={`${activeCount}명`} sub="출석률 97% 이상 그룹" />
        <StatTile label="위기·중단" value={`${riskCount}명`} sub="출석률 50% 미만 그룹" />
      </div>

      <div className="mt-5 grid grid-cols-5 gap-4 max-md:grid-cols-1">
        <Card className="col-span-3 max-md:col-span-1">
          <div className="mb-1 text-[14px] font-bold text-zion-900">출석률 분포</div>
          <p className="mb-4 text-[12px] text-ink-soft">
            수강생이 상·하위 두 그룹으로 갈리고 <strong className="text-zion-800">50~96% 구간이 비어 있습니다</strong>.
            초반에 이탈하면 돌아오지 않는 구조 — 평균({cumRate}%)만 보면 이 사실이 가려집니다.
          </p>
          <div className="flex items-end gap-1.5" role="img" aria-label="출석률 10퍼센트포인트 구간별 수강생 수 분포">
            {buckets.map((b) => (
              <div key={b.label} className="group flex flex-1 flex-col items-center gap-1" title={`${b.label} — ${b.count}명`}>
                <span className="text-[11px] font-semibold text-zion-800">{b.count > 0 ? b.count : ""}</span>
                <div
                  className="w-full rounded-t bg-zion-700 transition group-hover:bg-zion-500"
                  style={{ height: `${(b.count / maxBucket) * 120 + (b.count > 0 ? 4 : 1)}px` }}
                />
                <span className="text-[9px] text-ink-soft">{b.label.replace("~", "–").replace("%", "")}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-right text-[11px] text-ink-soft">구간: 출석률(%) · 막대: 수강생 수</div>
        </Card>

        <Card className="col-span-2 max-md:col-span-1">
          <div className="mb-1 text-[14px] font-bold text-zion-900">대면 시간대</div>
          <p className="mb-4 text-[12px] text-ink-soft">
            저녁 대면이 전체의 <strong className="text-zion-800">{eveningPct}%</strong> — 보강 편성 시 저녁 시간대를
            우선 검토할 신호입니다.
          </p>
          {(
            [
              ["저녁(대면)", slotTotal.evening],
              ["오전(대면)", slotTotal.morning],
              ["오후(대면)", slotTotal.afternoon],
            ] as const
          ).map(([label, v]) => (
            <div key={label} className="mb-2.5" title={`${label} ${v}회`}>
              <div className="mb-1 flex justify-between text-[12px]">
                <span className="text-ink-soft">{label}</span>
                <span className="font-semibold text-zion-800">
                  {v}회 · {Math.round((v / slotSum) * 100)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zion-100">
                <div className="h-full rounded-full bg-zion-700" style={{ width: `${(v / slotSum) * 100}%` }} />
              </div>
            </div>
          ))}
        </Card>
      </div>

      <Card className="mt-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[14px] font-bold text-zion-900">다음 동선</div>
            <p className="mt-0.5 text-[12px] text-ink-soft">
              위기·중단 {riskCount}명의 명단과 분반별 현황은 수강생 관리에서 확인합니다.
            </p>
          </div>
          <Link
            to="/students"
            className="rounded-lg bg-zion-800 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-zion-700"
          >
            수강생 관리로 이동
          </Link>
        </div>
      </Card>
    </div>
  );
}
