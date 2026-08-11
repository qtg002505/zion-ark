import { useMemo } from "react";
import { Link } from "../components/TransitionLink";
import { CalendarDays, Megaphone } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { isFieldStaff, studentScopeLabel } from "../lib/permissions";
import { STUDENTS, COHORT, SCHEDULE } from "../content/cohort-mock";
import { readAll } from "../lib/attendance-signals";
import { rateOf } from "../lib/attendance-rate";
import {
  GRADES,
  GRADE_LABELS,
  GRADE_RANGE,
  GRADE_TONE,
  effectiveGrade,
  isOverridden,
} from "../lib/student-grade";
import { STUDENT_PROFILES } from "../content/student-profiles";
import { PageHeader, Card, StatTile } from "./common";

/**
 * 전체 현황 — **점검자용 요약 화면** (2026-08-06 회의 확정).
 *
 * 관리직(신학부장 이상)은 담당 기수가 없어 하위 조직 전체를 훑는 자리다. 그래서 여기서는
 * 수치 요약과 일정, 지금 손이 필요한 곳만 짚고 끝낸다.
 * 출석률 분포와 대면 시간대 같은 **상세 분석은 기수현황으로 옮겼다** — 한 기수를 파고드는
 * 도구여서 전국·지파 단위 요약 화면에는 맞지 않는다.
 */
export function Overview() {
  const session = useSession();
  const { entries, studentStatusOverrides } = useStore();

  const students = STUDENTS;
  const total = students.length;
  const activeCount = students.filter((s) => s.status === "active").length;
  const riskCount = total - activeCount;
  const cumRate =
    total === 0 ? 0 : Math.round(students.reduce((a, s) => a + s.attendanceRate, 0) / total);

  // 누적은 아직 높은데 최근이 흔들리는 사람 — 점검자가 가장 먼저 알아야 할 수치
  const earlyCount = readAll(students).filter((r) => r.isEarly).length;

  const pinned = entries.filter((e) => e.kind === "notice_hq" && e.pinned).slice(0, 2);

  /**
   * 명단 한 줄 — 등급·오픈 여부·출석률을 한 자리에 모은다 (2026-08-10 리드 지시).
   *
   * **등급은 사람이 바꾼 값이 먼저다.** 안 바꿨으면 출결로 자동 판정한다.
   * **오픈 여부**는 유월 축(오픈/비오픈)만 본다 — `신앙전환`은 유월로는 이미 오픈이다.
   */
  const roster = useMemo(() => {
    const byKey = new Map(studentStatusOverrides.map((o) => [o.studentKey, o]));
    return students
      .map((s) => {
        const ov = byKey.get(s.key);
        const profile = STUDENT_PROFILES[s.key];
        const faith = ov?.faithType ?? profile?.faithType ?? "비오픈";
        return {
          student: s,
          grade: effectiveGrade(s, ov?.grade),
          manual: isOverridden(s, ov?.grade),
          opened: faith !== "비오픈",
          rate: rateOf(s),
        };
      })
      .sort(
        (a, b) =>
          GRADES.indexOf(a.grade) - GRADES.indexOf(b.grade) ||
          b.student.attendanceRate - a.student.attendanceRate,
      );
  }, [students, studentStatusOverrides]);

  const openedCount = roster.filter((r) => r.opened).length;
  const gradeCounts = GRADES.map((g) => ({ g, n: roster.filter((r) => r.grade === g).length }));

  return (
    <div>
      <PageHeader
        crumb="홈"
        title="전체 현황"
        desc={`조회 범위: ${studentScopeLabel(session)} — 서버가 담당 배정(memberships)으로 스코프한 범위만 표시됩니다.`}
      />

      {pinned.length > 0 && (
        <div className="mb-5 space-y-2">
          {pinned.map((n) => (
            <Link
              viewTransition
              key={n.id}
              to="/notices"
              className="flex items-center gap-3 rounded-card border border-zion-200 bg-zion-50 px-4 py-3 transition hover:border-zion-400"
            >
              <Megaphone size={16} className="shrink-0 text-zion-700" />
              <span className="min-w-0 flex-1 text-[13px] font-semibold text-zion-900">{n.title}</span>
              <span className="shrink-0 text-[11px] text-zion-700">총회 공지 · 고정</span>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2">
        <StatTile label="수강생" value={`${total}명`} sub={COHORT.cohort} accent />
        <StatTile label="누적 출석률" value={`${cumRate}%`} sub="진도 전체 기준" />
        <StatTile label="수강 유지" value={`${activeCount}명`} sub="정상 출석 그룹" />
        <StatTile label="위기·중단" value={`${riskCount}명`} sub="출석률 50% 미만" />
      </div>

      {/* 일정 — 점검자가 기수 진행 상황을 가늠하는 기준 (8/6 확정) */}
      <Card className="mt-5">
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays size={16} className="text-zion-600" />
          <h2 className="text-[14px] font-bold text-zion-900">기수 일정</h2>
          <span className="text-[12px] text-ink-soft">
            {COHORT.tribe} 지파 · {COHORT.church} · {COHORT.cohort}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
          {(
            [
              ["개강일", SCHEDULE.startsOn],
              ["종강 예정일", SCHEDULE.endsOn],
              ["새신자 교육일", SCHEDULE.newcomerOn],
            ] as const
          ).map(([label, date]) => (
            <div key={label} className="rounded-lg bg-zion-50 px-3 py-2.5">
              <div className="text-[12px] text-ink-soft">{label}</div>
              <div className="mt-0.5 text-[15px] font-bold text-zion-900">{date}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* 등급별 명단 — 한눈에 훑는 자리 (2026-08-10 리드 지시) */}
      <Card className="mt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[14px] font-bold text-zion-900">등급별 명단</h2>
            <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
              등급은 <strong className="text-ink">누적 출석률</strong>로 자동 매겨지고,
              담당 사명자가 화면에서 바꾸면 그 값이 우선합니다(직접 지정 표시).
              <strong className="text-ink"> 노란 줄이 오픈된 분</strong>입니다 — 모두 {openedCount}명.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {gradeCounts.map(({ g, n }) => (
              <span
                key={g}
                className={"rounded-lg border px-2 py-1 text-[11px] font-bold " + GRADE_TONE[g]}
                title={`${GRADE_LABELS[g]} — 자동 기준 ${GRADE_RANGE[g]}`}
              >
                {g} {GRADE_LABELS[g]} {n}
              </span>
            ))}
          </div>
        </div>

        {/* 좁은 화면에서는 표만 가로로 넘긴다 */}
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[620px] text-[13px]">
            <thead>
              <tr className="border-b border-zion-100 text-left text-[12px] text-ink-soft">
                <th className="pb-2 font-medium">등급</th>
                <th className="pb-2 font-medium">이름</th>
                <th className="pb-2 font-medium">분반</th>
                <th className="pb-2 font-medium">오픈</th>
                <th className="pb-2 text-right font-medium">누적</th>
                <th className="pb-2 text-right font-medium">보강 포함</th>
                <th className="pb-2 text-right font-medium">대면만</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((r, i) => {
                const first = i === 0 || roster[i - 1].grade !== r.grade;
                return (
                  <tr
                    key={r.student.key}
                    className={
                      "border-b border-zion-100 last:border-0 " +
                      // 오픈된 분은 줄 전체를 노랗게 — 색만으로 전하지 않도록 「오픈」 글자도 함께 둔다
                      (r.opened ? "bg-gold-100/50" : "") +
                      (first ? " border-t-2 border-t-zion-200" : "")
                    }
                  >
                    <td className="py-2 pr-2">
                      {first ? (
                        <span className={"rounded border px-1.5 py-0.5 text-[11px] font-bold " + GRADE_TONE[r.grade]}>
                          {r.grade} {GRADE_LABELS[r.grade]}
                        </span>
                      ) : (
                        <span className="text-[11px] text-ink-soft">{r.grade}</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 font-medium text-ink">
                      {r.student.name}
                      {r.manual && (
                        <span className="ml-1 text-[10px] text-ink-soft" title="담당자가 직접 지정한 등급">
                          직접 지정
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-[12px] text-ink-soft">{r.student.division}</td>
                    <td className="py-2 pr-2">
                      {r.opened ? (
                        <span className="rounded bg-gold-100 px-1.5 py-0.5 text-[11px] font-bold text-gold-700">
                          오픈
                        </span>
                      ) : (
                        <span className="text-[11px] text-ink-soft">비오픈</span>
                      )}
                    </td>
                    <td className="py-2 text-right font-semibold text-zion-800">
                      {r.student.attendanceRate}%
                    </td>
                    <td className="py-2 text-right text-ink">{r.rate.withMakeup}%</td>
                    <td className="py-2 text-right text-[12px] text-ink-soft">{r.rate.presentOnly}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
          「누적」은 진도 전체 기준이고 등급을 매기는 값입니다. 「보강 포함」·「대면만」은 최근 8주
          기준입니다. 등급을 바꾸려면{" "}
          <Link viewTransition to="/students-dashboard" className="text-zion-700 underline">
            수강생 현황
          </Link>
          에서 그 사람을 열어 고칩니다.
        </p>
      </Card>

      {/* 점검자가 지금 손대야 할 곳 */}
      <Card className="mt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-[14px] font-bold text-zion-900">지금 볼 곳</div>
            <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
              누적 출석률은 아직 높은데 최근이 흔들리는 분이{" "}
              <strong className="text-zion-800">{earlyCount}명</strong> 있습니다. 이미 이탈한{" "}
              {riskCount}명보다 먼저 확인하시면 되돌릴 여지가 있습니다.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              viewTransition
              to="/cohort"
              className="rounded-lg border border-zion-200 bg-white px-4 py-2 text-center text-[13px] font-semibold text-zion-700 transition hover:bg-zion-50"
            >
              기수 현황
            </Link>
            <Link
              viewTransition
              to="/signals"
              className="rounded-lg bg-zion-800 px-4 py-2 text-center text-[13px] font-semibold text-white transition hover:bg-zion-700"
            >
              관찰 필요 보기
            </Link>
          </div>
        </div>
      </Card>

      <p className="mt-4 text-[11px] leading-relaxed text-ink-soft">
        출석률 분포와 대면 시간대 등 상세 분석은 <Link viewTransition to="/cohort" className="text-zion-700 underline">기수 현황</Link>에
        있습니다.
        {!isFieldStaff(session) &&
          " 담당 기수가 없는 관리직 계정은 이 요약 화면으로 들어옵니다."}
      </p>
    </div>
  );
}
