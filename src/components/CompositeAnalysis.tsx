import { Card } from "../pages/common";
import {
  DIVISION_EVANGELISTS,
  FAITH_STATUS_LABELS,
  STUDENT_PROFILES,
} from "../content/student-profiles";
import { enneagramGuides } from "../content/enneagram-guides";

/**
 * 복합 분석 — 연령대·등록구분·신앙유형·유월·MBTI·에니어그램·도형·사주 분포 (2026-08-09 개편분).
 *
 * 원래 수강생 현황(`StudentsDashboard`) 안에 있던 것을 2026-08-23 리드 지시
 * (「기수 요약 맨 하단에 위치, 펼치기 접기 기능으로」)로 **부품으로 뽑았다** —
 * 기수 요약과 수강생 현황이 같은 한 벌을 쓴다(복제 금지 규칙).
 *
 * ⚠️ 성향 값은 시범 데이터이고 집계 표시일 뿐이다 — 확정 판정 근거로 쓰지 않는다(불변식 4).
 */

export interface AnalysisRow {
  profile: (typeof STUDENT_PROFILES)[string];
  yuwol: "오픈" | "비오픈";
}

export function distribution(items: string[]): { label: string; count: number }[] {
  const map = new Map<string, number>();
  items.forEach((v) => map.set(v, (map.get(v) ?? 0) + 1));
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

/** count 0인 항목도 정해진 순서 그대로 보여준다 (예: 등록구분 — 재입교가 0명이어도 목록엔 남는다) */
export function fixedDistribution(items: string[], order: string[]): { label: string; count: number }[] {
  const map = new Map<string, number>();
  items.forEach((v) => map.set(v, (map.get(v) ?? 0) + 1));
  return order.map((label) => ({ label, count: map.get(label) ?? 0 }));
}

function MiniBreakdown({
  title,
  rows,
  total,
  hint,
}: {
  title: string;
  rows: { label: string; count: number }[];
  total: number;
  hint?: string;
}) {
  return (
    <Card>
      <div className="mb-2.5 text-[12.5px] font-bold text-zion-900" title={hint}>
        {title}
      </div>
      {rows.length === 0 ? (
        <p className="text-[11px] text-ink-soft">데이터 없음</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.label}>
              <div className="mb-0.5 flex justify-between text-[10.5px]">
                <span className="text-ink-soft">{r.label}</span>
                <span className="font-semibold text-zion-800">
                  {r.count}명 · {total ? Math.round((r.count / total) * 100) : 0}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zion-100">
                <div
                  className="h-full rounded-full bg-zion-700"
                  style={{ width: `${total ? (r.count / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/** 분포 격자 + 하단 고지 — 머리글 없이 몸통만. 접이식 카드 안에서도 쓴다 */
export function AnalysisGrid({ rows }: { rows: AnalysisRow[] }) {
  const total = rows.length;
  const ageRows = distribution(rows.map((r) => `${Math.floor(r.profile.age / 10) * 10}대`));
  const registrationRows = fixedDistribution(
    rows.map((r) => r.profile.registrationType),
    ["신규", "재수강", "재입교"],
  );
  const faithRows = distribution(rows.map((r) => FAITH_STATUS_LABELS[r.profile.faithStatus]));
  const yuwolRows = distribution(rows.map((r) => r.yuwol));
  const mbtiRows = distribution(rows.map((r) => r.profile.mbti));
  const enneaRows = distribution(rows.map((r) => `${r.profile.enneagramType}유형`)).sort(
    (a, b) => Number(a.label[0]) - Number(b.label[0]),
  );
  const shapeRows = distribution(rows.map((r) => r.profile.shapeType));
  const sajuRows = distribution(rows.map((r) => `${r.profile.sajuElement}(오행)`));

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MiniBreakdown title="연령대" rows={ageRows} total={total} />
        <MiniBreakdown title="등록구분" rows={registrationRows} total={total} />
        <MiniBreakdown title="신앙유형" rows={faithRows} total={total} />
        <MiniBreakdown title="유월" rows={yuwolRows} total={total} />
        <MiniBreakdown title="MBTI" rows={mbtiRows} total={total} />
        <MiniBreakdown
          title="에니어그램"
          rows={enneaRows}
          total={total}
          hint={enneagramGuides.map((g) => `${g.typeNo}유형 ${g.title}`).join(" · ")}
        />
        <MiniBreakdown title="도형 성향" rows={shapeRows} total={total} />
        <MiniBreakdown title="사주(오행)" rows={sajuRows} total={total} />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
        성향 값(MBTI·에니어그램·도형·사주)은 시범 데이터이며, 상담·강의 참고용일 뿐 확정 판정 근거로
        쓰지 않습니다(불변식 4). 에니어그램 유형별 설명은 「성향 참고」 화면에서 볼 수 있습니다.
      </p>
    </>
  );
}

/** 수강생 현황의 하단 파트 — 머리글(범위 표시) 포함 (종전 그대로) */
export function AnalysisSection({ rows, divisionFilter }: { rows: AnalysisRow[]; divisionFilter: string }) {
  const scopeLabel =
    divisionFilter === "all"
      ? "전체 분반"
      : `${divisionFilter} · ${DIVISION_EVANGELISTS[divisionFilter] ?? ""}`;
  return (
    <div className="mt-5">
      <div className="mb-3 text-[14px] font-bold text-zion-900">
        복합 분석 — {scopeLabel} ({rows.length}명 기준)
      </div>
      <AnalysisGrid rows={rows} />
    </div>
  );
}
