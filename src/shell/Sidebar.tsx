import { Fragment, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { NavLink } from "../components/TransitionLink";
import { ChevronDown, ChevronRight, LogOut, Pin, PinOff, X } from "lucide-react";
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
  pinned = true,
  onSetPinned,
}: {
  /** 좁은 화면에서 드로어가 열려 있는지 */
  drawerOpen?: boolean;
  onClose?: () => void;
  /** lg 이상에서 고정돼 있는지 — 해제하면 아이콘 레일로 접힌다 (상태는 Layout 소유) */
  pinned?: boolean;
  onSetPinned?: (v: boolean) => void;
} = {}) {
  const session = useSession();
  const { logout } = useAuth();
  const location = useLocation();
  const groups = visibleNavGroups(session);
  const store = useStore();

  const currentFull = location.pathname + location.search;

  /**
   * 접기(레일)는 **lg 이상 전용**이다 — 좁은 화면의 드로어 동작에는 관여하지 않는다.
   * 마우스를 대면(또는 Tab으로 포커스가 들어오면) 펼쳐지고, 떼면 도로 접힌다.
   */
  const [hovering, setHovering] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const expanded = pinned || hovering;
  /* 드로어가 열려 있으면(좁은 화면) 항상 전체 메뉴다 — 레일은 데스크톱 접힘 상태에서만 */
  const rail = isDesktop && !expanded && !drawerOpen;

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
        "transition-[transform,width] duration-300 lg:translate-x-0 " +
        (drawerOpen ? "translate-x-0 shadow-2xl " : "-translate-x-full ") +
        (expanded ? "lg:w-[272px] " : "lg:w-[68px] ") +
        /* 고정을 풀고 호버로 펼친 상태 — 본문 여백은 안 움직이므로 위에 떠 있음을 그림자로 알린다 */
        (!pinned && expanded ? "lg:shadow-2xl" : "")
      }
      /* 가로 모드 노치를 피한다 (본문은 body에서 처리하지만 이 패널은 fixed라 따로 준다) */
      style={{ paddingLeft: "env(safe-area-inset-left)" }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      /* 키보드 사용자도 같은 경험 — Tab으로 들어오면 펼쳐진다 */
      onFocusCapture={() => setHovering(true)}
      onBlurCapture={(e) => {
        /*
          ⚠️ relatedTarget이 없는 blur는 무시한다. 펼쳐지는 순간 레일 쪽 DOM이 사라지면서
          그 안에 있던 포커스가 body로 떨어지는데(관련 대상 null), 이걸 「나갔다」로 읽으면
          펼침 → 접힘 → 펼침이 진동한다 — 실측으로 확인한 결함이다.
          진짜로 Tab이 밖으로 나가면 relatedTarget이 다음 요소로 온다.
        */
        const next = e.relatedTarget as Node | null;
        if (next && !e.currentTarget.contains(next)) setHovering(false);
      }}
    >
      {rail ? (
        /* ── 접힌 레일 — 아이콘만. 마우스를 대면 전체 메뉴가 이 위로 펼쳐진다 ── */
        <>
          <div className="flex justify-center py-5">
            {/* 로고는 **메인**으로 간다 — 전체 현황이 아니다 (2026-08-13 리드 지시) */}
            <NavLink viewTransition to="/" aria-label="메인으로" title="메인으로">
              <ZionLogo size={30} />
            </NavLink>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4" aria-label="주 메뉴">
            {groups.map((group) => (
              <Fragment key={group.label}>
                {/* 접힌 레일에서도 같은 자리에 선을 긋는다 — 두 화면이 어긋나지 않게 */}
                {group.dividerBefore && (
                  <div aria-hidden className="mx-auto my-2 w-6 border-t border-zion-200" />
                )}
              <RailIcon
                group={group}
                active={group.label === activeGroup}
                isNew={fresh.has(group.label)}
                onExpand={() => {
                  /*
                    마우스 없이 쓰는 사람의 결정적 경로 — 아이콘을 누르면 고정이 켜지고
                    그 대주제가 열린 채 펼쳐진다 (호버 펼침의 대체 수단).
                  */
                  onSetPinned?.(true);
                  setOpenGroup(group.label);
                }}
              />
              </Fragment>
            ))}
          </nav>
          <div className="flex justify-center border-t border-zion-100 py-3.5">
            <button
              onClick={logout}
              title="로그아웃"
              aria-label="로그아웃"
              className="rounded-lg p-2 text-ink-soft transition hover:bg-zion-50 hover:text-zion-700"
            >
              <LogOut size={16} />
            </button>
          </div>
        </>
      ) : (
        /* ── 전체 메뉴 — 고정 상태·호버 펼침·좁은 화면 드로어가 모두 이 모습이다 ── */
        <>
          <div className="flex items-center gap-3 px-5 py-5">
            {/* 마크·이름을 누르면 **메인**으로 (2026-08-13 리드 지시 — 전체 현황이 아니다) */}
            <NavLink
              viewTransition
              to="/"
              onClick={onClose}
              aria-label="메인으로"
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <ZionLogo />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold tracking-wide text-ink">시온 아크</span>
                <span className="block text-[11px] text-ink-soft">만국 소성 플랫폼</span>
              </span>
            </NavLink>
            {/*
              고정 토글 — **누르는 즉시** 접히고 펼쳐진다.

              ⚠️ 고정을 풀 때 `hovering`을 함께 끈다. 이걸 빠뜨리면 마우스가 아직 사이드바
              위에 있어 `expanded`가 참으로 남는다 — **본문 여백만 68px로 줄고 패널은 272px
              그대로**여서 「눌렀는데 안 접힌다」로 보인다(2026-08-13 실측으로 잡은 결함).
              마우스가 떠날 때까지 기다리게 두면 누른 것이 먹혔는지 알 수 없다.
              접은 뒤 마우스를 다시 올리면 종전대로 잠시 펼쳐진다.
            */}
            <button
              onClick={() => {
                const next = !pinned;
                onSetPinned?.(next);
                if (!next) setHovering(false);
              }}
              aria-pressed={pinned}
              title={
                pinned
                  ? "카테고리 접기 — 마우스를 대면 잠시 펼쳐집니다"
                  : "카테고리 펼친 채로 고정"
              }
              aria-label={pinned ? "카테고리 접기 (고정 해제)" : "카테고리 펼쳐 고정"}
              className="shrink-0 rounded-lg p-1.5 text-ink-soft transition hover:bg-zion-50 max-lg:hidden"
            >
              {pinned ? <Pin size={15} /> : <PinOff size={15} />}
            </button>
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
              <Fragment key={group.label}>
                {/*
                  「우리 기수 것」과 「모두에게 공통인 것」 사이의 선 (2026-08-18 리드 지시).
                  ⚠️ 표시일 뿐이라 `aria-hidden`이다 — 낭독기에는 메뉴 항목이 그대로 이어진다.
                */}
                {group.dividerBefore && (
                  <div aria-hidden className="my-2 border-t border-zion-200" />
                )}
              <NavGroupBlock
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
              </Fragment>
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
        </>
      )}
    </aside>
  );
}

/** 접힌 레일의 대주제 아이콘 — 단독 대주제는 바로 이동, 나머지는 고정+펼침 */
function RailIcon({
  group,
  active,
  isNew,
  onExpand,
}: {
  group: NavGroup;
  active: boolean;
  isNew: boolean;
  onExpand: () => void;
}) {
  const Icon = group.icon;
  const box = (
    <span
      className={
        "relative flex h-9 w-9 items-center justify-center rounded-lg transition " +
        (active ? "bg-zion-700 text-white shadow-sm shadow-zion-700/25" : "bg-zion-50 text-zion-600 hover:bg-zion-100")
      }
    >
      <Icon size={16} />
      {isNew && (
        <span
          className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-gold-500"
          title="최근 24시간 안에 새 자료가 올라왔습니다"
        />
      )}
    </span>
  );

  if (group.to) {
    return (
      <NavLink
        viewTransition
        to={group.to}
        title={group.label}
        aria-label={group.label}
        className="flex justify-center py-0.5"
      >
        {box}
      </NavLink>
    );
  }
  return (
    <button onClick={onExpand} title={group.label} aria-label={group.label} className="flex w-full justify-center py-0.5">
      {box}
    </button>
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
          viewTransition
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
              viewTransition
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
