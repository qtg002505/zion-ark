import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, LogOut } from "lucide-react";
import { useAuth, useSession } from "../lib/auth";
import { ROLE_LABELS } from "../lib/types";
import { studentScopeLabel } from "../lib/permissions";
import { visibleNavGroups, type NavGroup, type NavItem } from "./nav";
import { ZionLogo } from "./ZionLogo";

const OPEN_KEY = "zion_ark_nav_open";

/** 쿼리를 포함한 항목은 전체 URL로, 그 외에는 경로로 활성 판정 */
function isActive(item: NavItem, pathname: string, full: string): boolean {
  if (item.external) return false;
  if (item.to.includes("?")) return full === item.to;
  return pathname === item.to && !full.includes("?");
}

export function Sidebar() {
  const session = useSession();
  const { logout } = useAuth();
  const location = useLocation();
  const groups = visibleNavGroups(session);

  const currentFull = location.pathname + location.search;

  /** 현재 보고 있는 화면이 속한 그룹 — 항상 펼쳐 둔다 */
  const activeGroup = useMemo(() => {
    const hit = groups.find((g) => g.items.some((i) => isActive(i, location.pathname, currentFull)));
    return hit?.label ?? groups.find((g) => g.items.some((i) => i.to === location.pathname))?.label ?? null;
  }, [groups, location.pathname, currentFull]);

  const [open, setOpen] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(OPEN_KEY);
      if (raw) return new Set(JSON.parse(raw) as string[]);
    } catch {
      /* 손상 시 기본값 */
    }
    return new Set(["현황"]);
  });

  // 다른 그룹의 화면으로 이동하면 그 그룹을 펼친다
  useEffect(() => {
    if (!activeGroup) return;
    setOpen((prev) => (prev.has(activeGroup) ? prev : new Set(prev).add(activeGroup)));
  }, [activeGroup]);

  useEffect(() => {
    localStorage.setItem(OPEN_KEY, JSON.stringify([...open]));
  }, [open]);

  function toggle(label: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[272px] flex-col border-r border-zion-100 bg-white max-lg:w-[238px]">
      <div className="flex items-center gap-3 px-5 py-5">
        <ZionLogo />
        <div>
          <div className="text-[15px] font-bold tracking-wide text-ink">시온 아크</div>
          <div className="text-[11px] text-ink-soft">만국 소성 플랫폼</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="주 메뉴">
        {groups.map((group) => (
          <NavGroupBlock
            key={group.label}
            group={group}
            isOpen={open.has(group.label)}
            hasActive={group.label === activeGroup}
            pathname={location.pathname}
            currentFull={currentFull}
            onToggle={() => toggle(group.label)}
          />
        ))}
      </nav>

      <div className="border-t border-zion-100 px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-ink">
              {session.name} <span className="font-normal text-ink-soft">· {ROLE_LABELS[session.roleCode]}</span>
            </div>
            <div className="truncate text-[11px] text-ink-soft">담당 범위: {studentScopeLabel(session)}</div>
          </div>
          <button
            onClick={logout}
            title="로그아웃"
            aria-label="로그아웃"
            className="shrink-0 rounded-lg p-2 text-ink-soft transition hover:bg-zion-50 hover:text-zion-700"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

/** 대주제 한 덩어리 — 제목을 누르면 소주제가 열린다 */
function NavGroupBlock({
  group,
  isOpen,
  hasActive,
  pathname,
  currentFull,
  onToggle,
}: {
  group: NavGroup;
  isOpen: boolean;
  hasActive: boolean;
  pathname: string;
  currentFull: string;
  onToggle: () => void;
}) {
  return (
    <div className="mt-1.5 first:mt-0">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-2 text-left transition hover:bg-zion-50"
      >
        <ChevronDown
          size={13}
          className={"shrink-0 text-zion-300 transition-transform " + (isOpen ? "rotate-0" : "-rotate-90")}
        />
        <span
          className={
            "flex-1 text-[10px] font-semibold uppercase tracking-wider " +
            (hasActive ? "text-zion-700" : "text-ink-soft")
          }
        >
          {group.label}
        </span>
        {/* 접힌 그룹 안에 현재 화면이 있으면 점으로 알린다 */}
        {!isOpen && hasActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zion-600" />}
        {!isOpen && !hasActive && (
          <span className="text-[10px] text-zion-300">{group.items.length}</span>
        )}
      </button>

      {isOpen && (
        <ul className="mt-0.5 space-y-0.5 pl-2">
          {group.items.map((item) => {
            const Icon = item.icon;
            if (item.external) {
              return (
                <li key={item.to}>
                  <a
                    href={item.to}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-ink-soft transition duration-300 hover:translate-x-1 hover:bg-zion-50 hover:text-ink"
                  >
                    <Icon size={16} className="shrink-0 text-zion-400" />
                    <span className="flex-1">{item.label}</span>
                    <span className="text-[10px] text-zion-300">새 탭</span>
                  </a>
                </li>
              );
            }
            const active = isActive(item, pathname, currentFull);
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition duration-300 " +
                    (active
                      ? "bg-zion-700 font-semibold text-white shadow-lg shadow-zion-700/20"
                      : "text-ink-soft hover:translate-x-1 hover:bg-zion-50 hover:text-ink")
                  }
                >
                  <Icon size={16} className={"shrink-0 " + (active ? "text-white" : "text-zion-400")} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="rounded bg-zion-100 px-1.5 py-0.5 text-[10px] text-zion-700">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
