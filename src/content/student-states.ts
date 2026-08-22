import {
  Briefcase,
  Ear,
  GraduationCap,
  HeartPulse,
  HeartHandshake,
  Star,
  TrendingUp,
  Unlock,
  UserX,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * 수강생 상태 묶음의 정의 — **이 한 곳이 정본이다** (2026-08-22).
 *
 * 분류 대시보드(`OverviewClassify`)와 수강생 상세의 체크 패널(`StudentDetailPage`)이
 * 같은 목록을 읽는다 — 두 벌로 두면 한쪽만 고쳐지는 사고가 난다.
 *
 * ⚠️ **이름은 리드 운영 스프레드시트 「1페이지」의 원문 그대로다.** 다듬지 않고,
 * enum·코드 값으로 굳히지도 않는다(저장은 이 문자열 그대로 — `StudentStateMark.label`).
 * 색·아이콘은 시안의 느낌을 팔레트 안에서 잡은 것이다 — 다크 되돌리기 목록에 있는
 * 옅은 면 계열만 쓴다.
 */
export interface StudentStateGroupDef {
  label: string;
  icon: LucideIcon;
  /** 판 머리·아이콘 글자색 */
  head: string;
  /** 이름 칩 한 벌 (바탕+글자+테두리) */
  chip: string;
}

export const STATE_GROUPS: StudentStateGroupDef[] = [
  { label: "병리적 우울 (기질)", icon: HeartPulse, head: "text-red-600", chip: "bg-red-50 text-red-600 border-red-200" },
  { label: "수업 포인트 전혀 못잡음 (기질)", icon: TrendingUp, head: "text-zion-700", chip: "bg-zion-100 text-zion-800 border-zion-300" },
  { label: "행함부담", icon: Briefcase, head: "text-amber-600", chip: "bg-gold-100 text-gold-700 border-gold-300" },
  { label: "종교반감/무신론자", icon: UserX, head: "text-level-high", chip: "bg-level-high-soft text-level-high border-zion-300" },
  { label: "이성교제자", icon: HeartHandshake, head: "text-emerald-600", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { label: "기능자", icon: Wrench, head: "text-zion-700", chip: "bg-zion-100 text-zion-800 border-zion-300" },
  { label: "잎사귀 오픈", icon: Ear, head: "text-level-el", chip: "bg-level-el-soft text-level-el border-zion-300" },
  { label: "유급 챙길인원", icon: GraduationCap, head: "text-gold-700", chip: "bg-gold-100 text-gold-700 border-gold-300" },
  { label: "입막음 풀림", icon: Unlock, head: "text-red-600", chip: "bg-red-50 text-red-600 border-red-200" },
  { label: "사명자 양성", icon: Star, head: "text-gold-700", chip: "bg-gold-100 text-gold-700 border-gold-300" },
];
