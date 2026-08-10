import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight, LogOut, X } from "lucide-react";
import { useAuth, useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { ROLE_LABELS } from "../lib/types";
import { newGroups } from "../lib/nav-badges";
import { studentScopeLabel } from "../lib/permissions";
import { visibleNavGroups, groupItems, type NavGroup, type NavItem, type NavSubGroup } from "./nav";
import { ZionLogo } from "./ZionLogo";

const OPEN_SUB_KEY = "zion_ark_nav_open_sub";

/** 쿼리를 포함한 항목은 전체 URL로, 그 외에는 경로로 활성 판정 */
function isActive(item: { to: string; external?: boolean }, pathname: string, full: string): boolean {
  if (item.external) return false;
  if (item.to.includes("?")) return full === item.to;
  return pathname === item.to && !full.includes("?");
}

export function Sidebar({
  drawerOpen = false,
  onClose,
}: {
  /** 좁은 화면에서 드로어가 열려 있는지 */
  drawerOpen?: boolean;
  onClose?: () => void;
} = {}) {
  const session = useSession();
  const { logout } = useAuth();
  const location = useLocation();
  const groups = visibleNavGroups(session);
  const store = useStore();

  const currentFull = location.pathname + location.search;

  /**
   * 최근 24시간 안에 새 자료가 올라온 대주제 — 금색 NEW 뱃지를 붙인다 (2026-08-10 지시).
   * ⚠️ 브라우저 시계로 잰다 — 서버가 붙으면 요약 엔드포인트의 값으로 바꾼다(`nav-badges.ts`).
   */
  const fresh = useMemo(
    () =>
      newGroups({
        materials: store.materials,
        entries: store.entries,
        counselingTips: store.counselingTips,
        counselCases: store.counselCases,
        lessonNotes: store.lessonNotes,
        lessonResources: store.lessonResources,
        planEntries: store.planEntries,
      }),
    [
      store.materials,
      store.entries,
      store.counselingTips,
      store.counselCases,
      store.lessonNotes,
      store.lessonResources,
      store.planEntries,
    ],
  );

  /** 현재 보고 있는 화면이 속한 대주제 */
  const activeGroup = useMemo(() => {
    const hit = groups.find(
      (g) =>
        (g.to && isActive({ to: g.to }, location.pathname, currentFull)) ||
        groupItems(g).some((i) => isActive(i, location.pathname, currentFull)),
    );
    return hit?.label ?? null;
  }, [groups, location.pathname, currentFull]);

  /** 대주제는 한 번에 하나만 연다 — 다른 대주제를 누르면 이전 것이 닫힌다 */
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroup ?? "현황");

  /** 하위 묶음(초등·중등·고등)은 여럿 열려 있어도 된다 */
  const [openSubs, setOpenSubs] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(OPEN_SUB_KEY);
      if (raw) return new Set(JSON.parse(raw) as string[]);
    } catch {
      /* 손상 시 기본값 */
    }
    return new Set();
  });

  // 다른 대주제의 화면으로 이동하면 그 대주제를 연다
  useEffect(() => {
    if (activeGroup) setOpenGroup(activeGroup);
  }, [activeGroup]);

  useEffect(() => {
    localStorage.setItem(OPEN_SUB_KEY, JSON.stringify([...openSubs]));
  }, [openSubs]);

  function toggleSub(key: string) {
    setOpenSubs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <aside
      className={
        "fixed inset-y-0 left-0 z-40 flex w-[272px] max-w-[85vw] flex-col border-r border-zion-100 bg-white " +
        "transition-transform duration-300 lg:translate-x-0 " +
        (drawerOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full")
      }
      /* 가로 모드 노치를 피한다 (본문은 body에서 처리하지만 이 패널은 fixed라 따로 준다) */
      style={{ paddingLeft: "env(safe-area-inset-left)" }}
    >
      <div className="flex items-center gap-3 px-5 py-5">
        <ZionLogo />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold tracking-wide text-ink">시온 아크</div>
          <div className="text-[11px] text-ink-soft">만국 소성 플랫폼</div>
        </div>
        <button
          onClick={onClose}
          aria-label="메뉴 닫기"
          className="shrink-0 rounded-lg p-1.5 text-ink-soft transition hover:bg-zion-50 lg:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="주 메뉴">
        {groups.map((group) => (
          <NavGroupBlock
            key={group.label}
            group={group}
            isNew={fresh.has(group.label)}
            isOpen={openGroup === group.label}
            hasActive={group.label === activeGroup}
            openSubs={openSubs}
            pathname={location.pathname}
            currentFull={currentFull}
            onToggle={() => setOpenGroup((prev) => (prev === group.label ? null : group.label))}
            onToggleSub={toggleSub}
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
        {/*
          빌드 스탬프 — 팀 공유 프리뷰에서 "내가 보는 게 최신인가"를 확인하는 유일한 단서다.
          옛 화면이 보인다는 말이 나오면 이 시각부터 맞춰 본다.
        */}
        <div className="mt-2 text-[10px] text-ink-soft">빌드 {buildLabel()}</div>
      </div>
    </aside>
  );
}

/** 빌드 시각을 사람이 읽는 형태로 — 초 단위까지는 필요 없다 */
function buildLabel(): string {
  try {
    return new Date(__BUILD_STAMP__).toLocaleString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "확인 불가";
  }
}

/** 대주제 한 덩어리 — 제목을 누르면 열리고, 다른 대주제를 누르면 닫힌다 */
function NavGroupBlock({
  group,
  isNew,
  isOpen,
  hasActive,
  openSubs,
  pathname,
  currentFull,
  onToggle,
  onToggleSub,
}: {
  group: NavGroup;
  isNew?: boolean;
  isOpen: boolean;
  hasActive: boolean;
  openSubs: Set<string>;
  pathname: string;
  currentFull: string;
  onToggle: () => void;
  onToggleSub: (key: string) => void;
}) {
  const GroupIcon = group.icon;

  /**
   * NEW 뱃지 — 금색. 색만으로 전하지 않도록 글자(NEW)를 함께 쓰고,
   * 보조기술에는 무엇이 새것인지 풀어 읽어 준다.
   */
  const newBadge = isNew ? (
    <span
      className="shrink-0 rounded bg-gold-500 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-zion-950 shadow-sm"
      title="최근 24시간 안에 새 자료가 올라왔습니다"
    >
      NEW
      <span className="sr-only"> — 최근 24시간 안에 새 자료가 올라온 카테고리입니다</span>
    </span>
  ) : null;

  const iconBox = (
    <span
      className={
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition " +
        (hasActive ? "bg-zion-700 text-white shadow-sm shadow-zion-700/25" : "bg-zion-50 text-zion-600")
      }
    >
      <GroupIcon size={15} />
    </span>
  );

  const labelClass =
    "flex-1 text-[14px] font-bold tracking-tight " + (hasActive ? "text-zion-700" : "text-ink");

  // 하위가 없는 단독 대주제(공지사항·총회장님 어록)는 바로 이동한다
  if (group.to) {
    return (
      <div className="mt-1 first:mt-0">
        <NavLink
          to={group.to}
          className={
            "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition " +
            (hasActive ? "bg-zion-50" : "hover:bg-zion-50")
          }
        >
          {iconBox}
          <span className={labelClass}>{group.label}</span>
          {newBadge}
        </NavLink>
      </div>
    );
  }

  const count = groupItems(group).length;

  return (
    <div className="mt-1 first:mt-0">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-zion-50"
      >
        {iconBox}
        <span className={labelClass}>{group.label}</span>
        {newBadge}
        {!isOpen && hasActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zion-600" />}
        {!isOpen && !hasActive && !isNew && <span className="text-[11px] text-zion-300">{count}</span>}
        <ChevronDown
          size={14}
          className={"shrink-0 text-zion-300 transition-transform " + (isOpen ? "rotate-0" : "-rotate-90")}
        />
      </button>

      {/*
        하위 묶음을 먼저, 직속 항목을 뒤에 놓는다.
        확정 카테고리에서 묶음이 앞서고(자료실 › 신천지도서 → 영인지…,
        강사 도우미 › 초등·중등·고등 → 강의 자료 모으기) 직속 항목은 보조 도구이기 때문이다.
      */}
      {isOpen && (
        <div className="ml-[22px] border-l border-zion-100 pb-1 pl-3">
          {group.subGroups?.map((sub) => (
            <SubGroupBlock
              key={sub.label}
              group={group}
              sub={sub}
              isOpen={openSubs.has(`${group.label}/${sub.label}`)}
              pathname={pathname}
              currentFull={currentFull}
              onToggle={() => onToggleSub(`${group.label}/${sub.label}`)}
            />
          ))}

          {group.items && group.items.length > 0 && (
            <ItemList items={group.items} pathname={pathname} currentFull={currentFull} />
          )}
        </div>
      )}
    </div>
  );
}

/** 대주제 안의 중간 묶음 — 여럿이 동시에 열려 있어도 된다 */
function SubGroupBlock({
  group,
  sub,
  isOpen,
  pathname,
  currentFull,
  onToggle,
}: {
  group: NavGroup;
  sub: NavSubGroup;
  isOpen: boolean;
  pathname: string;
  currentFull: string;
  onToggle: () => void;
}) {
  const SubIcon = sub.icon;
  const hasActive = sub.items.some((i) => isActive(i, pathname, currentFull));

  return (
    <div className="mt-0.5 first:mt-0" data-group={group.label}>
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className={
          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-zion-50 " +
          (hasActive ? "bg-zion-50" : "")
        }
      >
        <SubIcon size={14} className={"shrink-0 " + (hasActive ? "text-zion-700" : "text-zion-400")} />
        <span
          className={
            "flex-1 text-[13px] font-semibold " + (hasActive ? "text-zion-700" : "text-ink")
          }
        >
          {sub.label}
        </span>
        <ChevronRight
          size={13}
          className={"shrink-0 text-zion-300 transition-transform " + (isOpen ? "rotate-90" : "")}
        />
      </button>

      {isOpen && (
        <div className="ml-[7px] border-l border-zion-100 pl-2.5">
          <ItemList items={sub.items} pathname={pathname} currentFull={currentFull} />
        </div>
      )}
    </div>
  );
}

function ItemList({
  items,
  pathname,
  currentFull,
}: {
  items: NavItem[];
  pathname: string;
  currentFull: string;
}) {
  return (
    <ul className="mt-0.5 space-y-0.5">
      {items.map((item) => {
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
          <li key={item.to + item.label}>
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
                <span
                  className={
                    "rounded px-1.5 py-0.5 text-[10px] " +
                    (active ? "bg-white/20 text-white" : "bg-zion-100 text-zion-700")
                  }
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          </li>
        );
      })}
    </ul>
  );
}
