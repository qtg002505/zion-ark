import type { RoleCode, Session } from "../lib/types";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Star,
  BookText,
  ScrollText,
  HeartHandshake,
  Megaphone,
  Quote,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";

/**
 * 내비 구조 — 정보구조 6개 카테고리 (PLATFORM_IA 계약).
 * 새 화면은 여기에 항목을 추가한다. mainUsers는 「권한-결정사항」의
 * 주 사용자 태그 — 본부·지파의 열람은 막지 않는다 (보기만 채택).
 */

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
  badge?: string;
  /** 이 역할만 접근 가능 (지정 없으면 로그인 전체 열람) */
  restrictTo?: RoleCode[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "현황",
    items: [
      { to: "/", label: "전체 현황", icon: LayoutDashboard },
      { to: "/cohort", label: "기수 현황", icon: GraduationCap },
      { to: "/students", label: "수강생 관리", icon: Users },
    ],
  },
  {
    label: "강사 도우미",
    items: [
      { to: "/library", label: "자료실", icon: BookOpen },
      { to: "/library?tab=excellent_plan", label: "우수 교안", icon: Star },
      { to: "/lessons", label: "강의 교안 (초등 23강)", icon: BookText },
    ],
  },
  {
    label: "자료실 시리즈",
    items: [
      { to: "/series/revelation", label: "요한계시록의 실상", icon: ScrollText },
      { to: "/series/creation", label: "천지창조", icon: ScrollText, badge: "준비 중" },
      { to: "/series/acts", label: "예수그리스도의 행전", icon: ScrollText, badge: "준비 중" },
    ],
  },
  {
    label: "전도사 도우미",
    items: [
      { to: "/library?tab=class_material", label: "분반·보강 자료", icon: BookOpen },
      { to: "/enneagram", label: "에니어그램 가이드", icon: HeartHandshake },
    ],
  },
  {
    label: "공지·어록",
    items: [
      { to: "/notices", label: "공지사항", icon: Megaphone },
      { to: "/quotes", label: "총회장님 어록", icon: Quote },
    ],
  },
  {
    label: "말씀광장",
    items: [
      { to: "https://www.wordsquare.org/bible-forest/bible", label: "온라인 성경", icon: ExternalLink, external: true },
      { to: "https://www.wordsquare.org/bible-forest/dictionary", label: "성경사전", icon: ExternalLink, external: true },
    ],
  },
];

/** 권한 필터 — 열람은 로그인 전체가 기본, restrictTo만 제한 */
export function visibleNavGroups(session: Session): NavGroup[] {
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.restrictTo || i.restrictTo.includes(session.roleCode)),
  })).filter((g) => g.items.length > 0);
}
