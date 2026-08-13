import { useMemo } from "react";
import { Link } from "../components/TransitionLink";
import { ArrowRight, Megaphone, Search } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { isFieldStaff, landingPath, studentScopeLabel } from "../lib/permissions";
import { COHORT, SCHEDULE } from "../content/cohort-mock";
import { effectiveSchedule, progressPct, scheduleSummary } from "../lib/cohort-calendar";
import { newGroups } from "../lib/nav-badges";
import { visibleNavGroups, groupItems } from "../shell/nav";
import { ZionLogo } from "../shell/ZionLogo";
import { Card } from "./common";

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 메인 — **홈페이지 노릇을 하는 첫 화면** (2026-08-13 리드 지시로 신설).
 *
 * 종전에는 「홈 · 전체 현황」 하나였다. 리드가 「메인 페이지를 따로 하나 만들어야 한다,
 * 홈 기능을 하는 것이고 거기에 카테고리가 들어간다」고 해서 갈랐다:
 *
 * - **여기(`/`)** — 어디로 갈지 고르는 자리. 카테고리가 주인공이다
 * - **전체 현황(`/overview`)** — 점검자용 수치 요약. 등급×분반 교차표·일정이 있다
 *
 * ⚠️ **카테고리는 `nav.ts`에서 파생한다.** 여기에 목록을 다시 적으면 사이드바와 어긋난다 —
 * 자료실 폴더가 두 군데에 뜨던 사고(2026-08-09)와 같은 자리다.
 */
export function Main() {
  const session = useSession();
  const store = useStore();

  const sched = effectiveSchedule(
    SCHEDULE,
    store.scheduleOverrides,
    `${COHORT.tribe}|${COHORT.church}|${COHORT.cohort}`,
  );
  const summary = scheduleSummary(sched.startsOn, sched.endsOn);
  const progress = progressPct(sched.startsOn, sched.endsOn, todayYmd());

  /** 홈·전체 현황을 뺀 나머지가 카테고리다 */
  const categories = useMemo(
    () => visibleNavGroups(session).filter((g) => g.to !== "/" && g.to !== "/overview"),
    [session],
  );

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

  const pinned = store.entries.filter((e) => e.kind === "notice_hq" && e.pinned).slice(0, 2);

  return (
    <div>
      {/* 머리 — 어디에 들어와 있는지, 지금 기수가 어디쯤인지 한 줄로 */}
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-card bg-zion-800 p-6 text-white shadow-sm">
        <ZionLogo size={44} />
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-bold tracking-tight">시온 아크</h1>
          <p className="mt-0.5 text-[13px] text-white/80">
            만국 소성 플랫폼 — {session.name}님, 담당 범위는 {studentScopeLabel(session)}입니다.
          </p>
        </div>
        <div className="rounded-xl bg-white/10 px-4 py-2.5">
          <div className="text-[11px] text-white/85">
            {COHORT.cohort} · {summary.months}개월 과정
          </div>
          <div className="mt-0.5 text-[15px] font-bold">
            {progress}% 진행 <span className="font-normal text-white/85">· 수업 {summary.sessions}회</span>
          </div>
        </div>
      </div>

      {pinned.length > 0 && (
        <div className="mb-5 space-y-2">
          {pinned.map((n) => (
            <Link
              viewTransition
              key={n.id}
              to="/notices"
              className="flex items-center gap-3 rounded-card border border-zion-200 bg-zion-50 px-4 py-3 transition hover:border-zion-400"
            >
              <Megaphone size={16} className="shrink-0 text-zion-700" />
              <span className="min-w-0 flex-1 text-[13px] font-semibold text-zion-900">{n.title}</span>
              <span className="shrink-0 text-[11px] text-zion-700">총회 공지 · 고정</span>
            </Link>
          ))}
        </div>
      )}

      {/* 카테고리 — 이 화면의 주인공 */}
      <Card>
        <h2 className="mb-3 text-[15px] font-bold text-zion-900">카테고리</h2>
        <div className="grid grid-cols-3 gap-2.5 max-md:grid-cols-2 max-sm:grid-cols-1">
          {categories.map((g) => {
            const Icon = g.icon;
            const items = groupItems(g);
            const to = g.to ?? items[0]?.to ?? "/";
            return (
              <Link
                viewTransition
                key={g.label}
                to={to}
                className="flex items-center gap-3 rounded-xl border border-zion-100 bg-white p-3.5 transition hover:border-zion-300 hover:bg-zion-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zion-50 text-zion-600">
                  <Icon size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-bold text-ink">{g.label}</span>
                  <span className="block text-[11px] text-ink-soft">
                    {g.to ? "바로 가기" : `${items.length}개 항목`}
                  </span>
                </span>
                {fresh.has(g.label) && (
                  <span
                    className="shrink-0 rounded bg-gold-500 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-zion-950"
                    title="최근 24시간 안에 새 자료가 올라왔습니다"
                  >
                    NEW
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </Card>

      {/* 역할에 맞는 다음 자리 — 종전 착지 분기(관리직 요약 / 실무직 기수현황)를 안내로 바꿨다 */}
      <div className="mt-5 grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <Card>
          <div className="text-[14px] font-bold text-zion-900">
            {isFieldStaff(session) ? "내 기수부터 보기" : "담당 범위 훑어보기"}
          </div>
          <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
            {isFieldStaff(session)
              ? "출결·주간 흐름·분반별 현황이 기수 현황에 모여 있습니다."
              : "등급×분반 명단과 기수 일정은 전체 현황에서 봅니다."}
          </p>
          <Link
            viewTransition
            to={landingPath(session)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-zion-800 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-zion-700"
          >
            {isFieldStaff(session) ? "기수 현황" : "전체 현황"} <ArrowRight size={14} />
          </Link>
        </Card>

        <Card>
          <div className="flex items-center gap-1.5 text-[14px] font-bold text-zion-900">
            <Search size={15} className="text-zion-600" /> 찾는 것이 있으면
          </div>
          <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
            위쪽 검색창에 물어보세요. 교안 · 시리즈 · 어록 · 용어를 한 번에 훑고 출처를 함께
            보여 줍니다. 갈래를 골라 걸러 볼 수도 있습니다.
          </p>
        </Card>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-ink-soft">
        시온 아크는 내부 운영 플랫폼입니다 — 수강생 개인정보는 담당 범위 밖으로 반출하지 않습니다
        (집계·통계만 공유 가능).
      </p>
    </div>
  );
}
