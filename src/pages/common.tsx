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
    <div className="mb-6 flex animate-slide-in-up items-end justify-between gap-4">
      <div>
        <div className="text-[12px] font-medium text-ink-soft">{crumb}</div>
        <h1 className="mt-0.5 text-[24px] font-bold tracking-tight text-ink">{title}</h1>
        {desc && <p className="mt-1 max-w-2xl text-[13px] text-ink-soft">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={
        "rounded-card border border-zion-100 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-md " +
        className
      }
    >
      {children}
    </div>
  );
}

/**
 * 헤드라인 수치 타일 — 값·라벨·보조설명.
 * `accent`를 켜면 시안의 강조 타일처럼 진한 배경으로 낸다 (한 줄에 하나만).
 */
export function StatTile({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        "animate-slide-in-up rounded-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg " +
        (accent
          ? "bg-zion-700 text-white shadow-zion-700/20"
          : "border border-zion-100 bg-white")
      }
    >
      <div className={"text-[12px] " + (accent ? "text-white/80" : "text-ink-soft")}>{label}</div>
      <div className={"mt-1 text-[28px] font-bold leading-none " + (accent ? "text-white" : "text-ink")}>
        {value}
      </div>
      {sub && (
        <div className={"mt-1.5 text-[11px] " + (accent ? "text-white/70" : "text-ink-soft")}>{sub}</div>
      )}
    </div>
  );
}

/** 상태 배지 — 상태색은 아이콘+라벨 동반 (색 단독 표시 금지) */
export function StatusBadge({ status }: { status: Student["status"] }) {
  const spec = {
    active: { icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    atRisk: { icon: AlertTriangle, cls: "bg-amber-50 text-amber-700 border-amber-200" },
    paused: { icon: PauseCircle, cls: "bg-zion-100 text-ink-soft border-zion-100" },
  }[status];
  const Icon = spec.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${spec.cls}`}>
      <Icon size={12} />
      {STATUS_LABELS[status]}
    </span>
  );
}
