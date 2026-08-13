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
import { Card } from "./common";
import heroImg from "../assets/hero-ark.jpg?inline";

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 메인 — **홈페이지 노릇을 하는 첫 화면** (2026-08-13 리드 지시로 신설).
 *
 * - **여기(`/`)** — 어디로 갈지 고르는 자리. 카테고리가 주인공이다
 * - **전체 현황(`/overview`)** — 점검자용 수치 요약. 등급×분반 교차표·일정이 있다
 *
 * **2026-08-13 리드 지시 — 유한킴벌리(yuhan-kimberly.co.kr) 짜임새로 바꿨다.**
 * 사진이 화면을 채우고, 그 위에 큰 문구와 **카테고리 격자**가 얹힌다.
 *
 * ⚠️ **카테고리는 `nav.ts`에서 파생한다.** 여기에 목록을 다시 적으면 사이드바와 어긋난다 —
 * 자료실 폴더가 두 군데에 뜨던 사고(2026-08-09)와 같은 자리다.
 *
 * ⚠️ **히어로 위에는 로고를 얹지 않는다.** 로고는 흰 바탕에 그린 남색 선화라 어두운 사진
 * 위에서 묻힌다 — 다크 모드용 흰 판(`index.css`)은 테마를 따라가지만 이 사진은 테마와
 * 무관하게 늘 어둡기 때문에 두 화면 다 어긋난다.
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
      {/*
        히어로 — 본문 기둥 끝에서 끝까지 채운다.
        `main`의 좌우 패딩(px-4/sm:px-6)과 위 패딩(py-4)을 음수 여백으로 상쇄한 뒤,
        안쪽에서 같은 값을 다시 줘 글자는 본문과 세로선이 맞는다.
      */}
      <section className="relative -mx-4 -mt-4 mb-5 overflow-hidden sm:-mx-6">
        <img
          src={heroImg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/*
          글자가 읽히게 어둡게 깐다. ⚠️ `zion-950`은 다크 모드에서 뒤집지 않는 값이라
          (CLAUDE.md 화면 규칙) 두 테마에서 똑같이 어둡다 — 사진 위 흰 글자가 안전하다.
        */}
        <div className="absolute inset-0 bg-gradient-to-r from-zion-950/92 via-zion-950/72 to-zion-950/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-zion-950/80 via-transparent to-transparent" />

        <div className="relative px-4 pb-6 pt-12 sm:px-6 sm:pt-16">
          <p className="text-[12px] font-semibold tracking-wide text-white/75">
            {COHORT.tribe}지파 · {COHORT.church} · {COHORT.cohort}
          </p>
          <h1 className="mt-2 text-[26px] font-bold leading-tight tracking-tight text-white sm:text-[34px]">
            말씀을 전하고 세우는 자리에
            <br />
            <span className="text-white">시온 아크가 함께 합니다</span>
          </h1>
          <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-white/80">
            {session.name}님, 담당 범위는 {studentScopeLabel(session)}입니다. 아래에서 필요한 자리를
            바로 여세요.
          </p>

          {/* 기수 진행 — 사진 위라 반투명 판을 깔아 글자를 살린다 */}
          <div className="mt-5 inline-flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur-sm">
            <span className="text-[12px] text-white/85">
              {summary.months}개월 과정 · 수업 {summary.sessions}회
            </span>
            <span className="text-[15px] font-bold text-white">{progress}% 진행</span>
          </div>

          {/*
            카테고리 격자 — 이 화면의 주인공. 참고 사이트의 브랜드 격자와 같은 짜임새로,
            `gap-px` + 옅은 흰 바탕이 칸 사이 실선이 된다.
            ⚠️ `bg-white/10`·`/15`는 진한 면 위 덧칠이라 다크에서 되돌리지 않는 값이다.
          */}
          <div className="mt-6 grid grid-cols-4 gap-px overflow-hidden rounded-xl bg-white/15 max-lg:grid-cols-3 max-sm:grid-cols-2">
            {categories.map((g) => {
              const Icon = g.icon;
              const items = groupItems(g);
              const to = g.to ?? items[0]?.to ?? "/";
              return (
                <Link
                  viewTransition
                  key={g.label}
                  to={to}
                  className="group relative flex min-h-[104px] flex-col justify-between bg-zion-950/60 p-3.5 backdrop-blur-sm transition duration-300 hover:bg-zion-950/25"
                >
                  <span className="flex items-start justify-between gap-2">
                    <Icon size={20} className="shrink-0 text-white/85" />
                    {fresh.has(g.label) && (
                      <span
                        className="shrink-0 rounded bg-gold-500 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-zion-950"
                        title="최근 24시간 안에 새 자료가 올라왔습니다"
                      >
                        NEW
                        <span className="sr-only"> — 최근 24시간 안에 새 자료가 올라온 카테고리입니다</span>
                      </span>
                    )}
                  </span>
                  <span>
                    <span className="block text-[13.5px] font-bold leading-snug text-white">
                      {g.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-white/70">
                      {g.to ? "바로 가기" : `${items.length}개 항목`}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

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

      {/* 역할에 맞는 다음 자리 — 종전 착지 분기(관리직 요약 / 실무직 기수현황)를 안내로 바꿨다 */}
      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
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
