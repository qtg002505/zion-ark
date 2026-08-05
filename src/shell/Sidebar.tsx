import { NavLink, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth, useSession } from "../lib/auth";
import { ROLE_LABELS } from "../lib/types";
import { studentScopeLabel } from "../lib/permissions";
import { visibleNavGroups } from "./nav";
import { ZionLogo } from "./ZionLogo";

export function Sidebar() {
  const session = useSession();
  const { logout } = useAuth();
  const location = useLocation();
  const groups = visibleNavGroups(session);

  const currentFull = location.pathname + location.search;

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[272px] flex-col bg-zion-900 text-zion-100 max-lg:w-[238px]">
      <div className="flex items-center gap-3 px-5 py-5">
        <ZionLogo />
        <div>
          <div className="text-[15px] font-bold tracking-wide text-white">시온 아크</div>
          <div className="text-[11px] text-zion-300">만국 소성 플랫폼</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="주 메뉴">
        {groups.map((group) => (
          <div key={group.label} className="mt-4 first:mt-1">
            <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zion-400">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                if (item.external) {
                  return (
                    <li key={item.to}>
                      <a
                        href={item.to}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-zion-200 transition hover:bg-zion-800 hover:text-white"
                      >
                        <Icon size={16} className="shrink-0 text-zion-400" />
                        <span className="flex-1">{item.label}</span>
                        <span className="text-[10px] text-zion-400">새 탭</span>
                      </a>
                    </li>
                  );
                }
                // 쿼리 포함 항목은 전체 URL 일치, 그 외 pathname 일치로 활성 판정
                const active = item.to.includes("?")
                  ? currentFull === item.to
                  : location.pathname === item.to && !currentFull.includes("?tab=");
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition " +
                        (active
                          ? "bg-zion-700 font-semibold text-white"
                          : "text-zion-200 hover:bg-zion-800 hover:text-white")
                      }
                    >
                      <Icon size={16} className={"shrink-0 " + (active ? "text-gold-500" : "text-zion-400")} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="rounded bg-zion-800 px-1.5 py-0.5 text-[10px] text-zion-300">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-zion-800 px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-white">
              {session.name} <span className="font-normal text-zion-300">· {ROLE_LABELS[session.roleCode]}</span>
            </div>
            <div className="truncate text-[11px] text-zion-400">담당 범위: {studentScopeLabel(session)}</div>
          </div>
          <button
            onClick={logout}
            title="로그아웃"
            aria-label="로그아웃"
            className="shrink-0 rounded-lg p-2 text-zion-300 transition hover:bg-zion-800 hover:text-white"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
