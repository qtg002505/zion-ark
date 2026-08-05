import { useMemo } from "react";
import { AlertCircle, Clock } from "lucide-react";
import { useSession } from "../lib/auth";
import { visibleDivisions } from "../lib/permissions";
import { STUDENTS, DIVISIONS } from "../content/cohort-mock";
import { readAll, weekDots } from "../lib/attendance-signals";
import { PageHeader, Card, StatusBadge } from "./common";

/**
 * 관찰 필요 — 출결에서 읽히는 신호를 모아 담당자에게 보여 준다.
 *
 * 누적 출석률만 보면 "이미 이탈한 사람"만 보인다. 여기서는 **최근 몇 주의 변화**를 보아
 * 아직 되돌릴 여지가 있는 사람을 먼저 띄운다.
 * 사람을 판정하지 않는다 — 관찰된 사실만 적고 판단은 담당자가 한다.
 */
export function Signals() {
  const session = useSession();
  const divisions = visibleDivisions(session, DIVISIONS);
  const students = useMemo(() => STUDENTS.filter((s) => divisions.includes(s.division)), [divisions]);

  const all = useMemo(() => readAll(students), [students]);
  const early = all.filter((r) => r.isEarly);
  const longTerm = all.filter((r) => !r.isEarly);

  return (
    <div>
      <PageHeader
        crumb="현황"
        title="관찰 필요"
        desc="최근 출결에서 달라진 점이 보이는 수강생입니다. 판정이 아니라 관찰된 사실만 표시하며, 연락 여부는 담당자가 정합니다."
      />

      <Card className="border-zion-200 bg-zion-50/40">
        <div className="flex gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-zion-600" />
          <p className="text-[13px] leading-relaxed text-ink">
            이 기수는 출석률이 <strong className="text-zion-800">97% 이상</strong>과{" "}
            <strong className="text-zion-800">50% 미만</strong>으로 갈리고 그 사이가 비어 있습니다.
            초반에 갈리면 되돌리기 어렵다는 뜻이라, <strong className="text-zion-800">누적 출석률이
            아직 높은데 최근이 흔들리는 사람</strong>을 먼저 봅니다.
          </p>
        </div>
      </Card>

      <section className="mt-5">
        <div className="mb-2 flex items-baseline gap-2">
          <h2 className="text-[15px] font-bold text-zion-900">지금 연락하면 되돌릴 여지가 있는 분</h2>
          <span className="text-[12px] text-ink-soft">{early.length}명</span>
        </div>
        {early.length === 0 ? (
          <Card>
            <p className="py-6 text-center text-[13px] text-ink-soft">
              최근 흔들리는 분이 없습니다.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {early.map((r) => (
              <SignalCard key={r.student.key} row={r} highlight />
            ))}
          </div>
        )}
      </section>

      {longTerm.length > 0 && (
        <section className="mt-6">
          <div className="mb-2 flex items-baseline gap-2">
            <h2 className="text-[15px] font-bold text-zion-900">오래 나오지 않은 분</h2>
            <span className="text-[12px] text-ink-soft">{longTerm.length}명</span>
          </div>
          <div className="space-y-2">
            {longTerm.map((r) => (
              <SignalCard key={r.student.key} row={r} />
            ))}
          </div>
        </section>
      )}

      <p className="mt-5 text-[11px] leading-relaxed text-ink-soft">
        출결 원본은 읽기 전용입니다 — 이 화면에서 고칠 수 없고, 원본을 수정한 뒤 다음 동기화를
        기다립니다. 표시된 내용은 담당 배정 범위 안의 수강생만이며, 범위 밖 조회는 서버가 막습니다.
        시범 목업 데이터(가상 인물)입니다.
      </p>
    </div>
  );
}

function SignalCard({
  row,
  highlight = false,
}: {
  row: ReturnType<typeof readAll>[number];
  highlight?: boolean;
}) {
  const { student, signals } = row;
  const dots = weekDots(student.recentWeeks);

  return (
    <Card className={highlight ? "border-zion-300" : ""}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[15px] font-bold text-ink">{student.name}</span>
        <span className="text-[12px] text-ink-soft">{student.division}</span>
        <StatusBadge status={student.status} />
        <span className="ml-auto text-[12px] text-ink-soft">
          누적 {student.attendanceRate}% · 최근 출석 {student.lastAttended ?? "기록 없음"}
        </span>
      </div>

      <ul className="mt-2.5 space-y-1">
        {signals.map((s, i) => (
          <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-ink">
            <Clock size={13} className="mt-[3px] shrink-0 text-zion-500" />
            <span>{s.text}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 border-t border-zion-100 pt-2.5">
        <div className="mb-1 text-[11px] text-ink-soft">
          최근 8주 (왼쪽이 오래된 주) — 저: 저녁 · 전: 오전 · 후: 오후 · 결: 결석 · 보: 보강 · –: 미입력
        </div>
        <div className="flex flex-wrap gap-1">
          {dots.map((d, i) => (
            <span
              key={i}
              title={d.title}
              className={
                "flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-semibold " +
                d.tone
              }
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}
