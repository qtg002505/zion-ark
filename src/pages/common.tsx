import type { ReactNode } from "react";
import { CheckCircle2, AlertTriangle, PauseCircle } from "lucide-react";
import type { Student } from "../lib/types";
import { STATUS_LABELS } from "../content/cohort-mock";

export function PageHeader({
  crumb,
  title,
  desc,
  action,
}: {
  crumb: string;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <div className="text-[12px] text-gray-400">{crumb}</div>
        <h1 className="mt-0.5 text-[22px] font-bold text-zion-900">{title}</h1>
        {desc && <p className="mt-1 max-w-2xl text-[13px] text-gray-500">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={"rounded-xl border border-zion-100 bg-white p-5 shadow-sm " + className}>
      {children}
    </div>
  );
}

/** 헤드라인 수치 타일 — 값·라벨·보조설명 */
export function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="!p-4">
      <div className="text-[12px] text-gray-500">{label}</div>
      <div className="mt-1 text-[26px] font-bold leading-none text-zion-900">{value}</div>
      {sub && <div className="mt-1.5 text-[11px] text-gray-400">{sub}</div>}
    </Card>
  );
}

/** 상태 배지 — 상태색은 아이콘+라벨 동반 (색 단독 표시 금지) */
export function StatusBadge({ status }: { status: Student["status"] }) {
  const spec = {
    active: { icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    atRisk: { icon: AlertTriangle, cls: "bg-amber-50 text-amber-700 border-amber-200" },
    paused: { icon: PauseCircle, cls: "bg-gray-100 text-gray-500 border-gray-200" },
  }[status];
  const Icon = spec.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${spec.cls}`}>
      <Icon size={12} />
      {STATUS_LABELS[status]}
    </span>
  );
}
