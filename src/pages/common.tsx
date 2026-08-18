import type { ReactNode } from "react";
import { CheckCircle2, AlertTriangle, PauseCircle, XCircle } from "lucide-react";
import type { Student } from "../lib/types";
import { STATUS_LABELS } from "../content/cohort-mock";
import { ENROLLMENT_STATUS_TONE, type EnrollmentStatus } from "../content/student-profiles";

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
    <div className="mb-5 flex animate-slide-in-up flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <div className="text-[12px] font-medium text-ink-soft">{crumb}</div>
        <h1 className="mt-0.5 text-[20px] font-bold tracking-tight text-ink sm:text-[24px]">{title}</h1>
        {desc && <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-soft">{desc}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      /*
        테두리를 `zion-100` → `zion-200`으로 한 단계 올렸다 (2026-08-18).
        바탕(surface)과 카드(흰색)의 대비가 **1.08**이라 면끼리는 사실상 구분되지 않는다 —
        경계를 만드는 것은 테두리 하나뿐인데 그마저 옅어 카드가 배경에 묻혀 있었다.
        한 단계만 올린다: 더 진하게 하면 카드가 많은 화면에서 격자무늬처럼 답답해진다.
      */
      className={
        "rounded-card border border-zion-200 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-md " +
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

/**
 * 수강 상태 배지 — 담당자가 직접 고르는 값(`EnrollmentStatus`, 2026-08-13 추가).
 * 출결에서 자동으로 오는 `StatusBadge`(수강 중·중단 위기·중단)와는 다른 필드다.
 */
export function EnrollmentStatusBadge({ status }: { status: EnrollmentStatus }) {
  const Icon = { 수강: CheckCircle2, 유급: AlertTriangle, 탈락: XCircle }[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${ENROLLMENT_STATUS_TONE[status]}`}
    >
      <Icon size={12} />
      {status}
    </span>
  );
}
