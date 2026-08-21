import { useEffect, useMemo, useState } from "react";
import { Link } from "../components/TransitionLink";
import { Clock, Palette, Star, StickyNote, Trash2, UserPlus, X } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { studentScopeLabel } from "../lib/permissions";
import { pageLabelOf } from "../shell/nav";
import { FAVORITE_LABELS, ROLE_LABELS, type FavoriteTarget } from "../lib/types";
import { SERIES } from "../content/series-content";
import { WeekScheduler } from "../components/WeekScheduler";
import { ThemeChoice } from "../shell/ThemeToggle";
import { PageHeader, Card } from "./common";

/**
 * 마이페이지 — 즐겨찾기 · 열람 기록 (2026-08-10 리드 지시, 지시문 §4-2).
 *
 * ⛔ **개인정보 설계가 이 화면의 핵심이다.** 기록에는 식별자(`targetType`+`targetId`)만
 * 저장돼 있고, 이름·제목은 **그릴 때 그 시점의 데이터에서 다시 찾는다**. 그래서
 * 자료가 지워지거나 담당이 바뀌면 이름이 자동으로 사라진다 — 옛 담당자의 기록에
 * 수강생 이름이 남는 일을 구조적으로 막는다.
 *
 * ⚠️ 수강생 화면은 **일부러 기록하지 않는다.** 지시문은 전체 화면 기록을 요구하지만,
 * 실데이터 투입 전에 리드 승인이 필요한 항목이라(§4-2 경고) 공통 교육 영역만 남긴다.
 * 승인이 나면 `logView` 호출 지점만 늘리면 된다.
 * ⚠️ 보관 기간은 미정(권장 90일)이라 지금은 **최근 200건**으로만 막아 둔다.
 */
export function MyPage() {
  const session = useSession();
  const {
    favorites,
    activityLogs,
    materials,
    counselingTips,
    counselCases,
    toggleFavorite,
    clearActivity,
    authorFollows,
    toggleAuthorFollow,
  } = useStore();

  const mineFav = favorites.filter((f) => f.userName === session.name);
  /** 내가 팔로우한 강사 (2026-08-15) */
  const myFollows = authorFollows.filter((f) => f.userName === session.name);
  const mineLog = activityLogs.filter((l) => l.userName === session.name);

  /**
   * 식별자 → 지금 이름. **찾지 못하면 이름 없이 표시한다** — 지워졌거나 범위 밖이라는 뜻이다.
   */
  const resolve = useMemo(() => {
    return (type: FavoriteTarget | "page", id: string): { label: string; to: string | null } => {
      switch (type) {
        case "material": {
          const m = materials.find((x) => x.id === id);
          /* 구획(?section=)은 2026-08-13에 폐지됐다 — 자료 상세를 바로 여는 딥링크로 간다 */
          return m
            ? { label: m.title, to: `/library?open=${m.id}` }
            : { label: "(지워졌거나 볼 수 없는 자료)", to: null };
        }
        case "tip": {
          const t = counselingTips.find((x) => x.id === id);
          return t && !t.hiddenAt
            ? { label: t.title, to: "/counseling" }
            : { label: "(지워졌거나 숨겨진 상담법)", to: null };
        }
        case "case": {
          const c = counselCases.find((x) => x.id === id);
          return c
            ? { label: c.situation.slice(0, 40) + (c.situation.length > 40 ? "…" : ""), to: "/cases" }
            : { label: "(지워진 상담 사례)", to: null };
        }
        case "series": {
          const s = SERIES.find((x) => x.id === id);
          return s ? { label: s.name, to: `/series/${s.id}` } : { label: "(없는 도서)", to: null };
        }
        case "lesson":
          return { label: id, to: "/lessons" };
        default: {
          /*
            화면 열람 기록 (2026-08-17 리드 지시) — `/plan` 같은 경로 대신 **메뉴에 적힌
            화면 이름**(「기수 현황 · 월간·주간 계획」)을 보인다. 이름은 nav.ts의 메뉴
            정의에서 파생하므로(`pageLabelOf`) 메뉴 이름이 바뀌면 지난 기록도 따라온다.
          */
          const label = pageLabelOf(id);
          return label
            ? { label, to: id.startsWith("/") ? id : null }
            : { label: "(지금은 없는 화면)", to: null };
        }
      }
    };
  }, [materials, counselingTips, counselCases]);

  return (
    <div>
      <PageHeader
        crumb="마이페이지"
        title={`${session.name} 님`}
        desc={`${ROLE_LABELS[session.roleCode]} · ${studentScopeLabel(session)} — 별표해 둔 자료와 최근에 연 화면입니다.`}
      />

      {/* 개인 메모장 (2026-08-18 리드 지시) — 계정당 한 장, 본인만 본다 */}
      <PersonalMemoPad />

      {/* 개인 스케줄러 — 담당 수강생 생일이 자동으로 뜬다 */}
      <WeekScheduler />

      {/* 화면 밝기 — 헤더 단추는 밝게↔어둡게만 뒤집는다. 기기 설정 따르기는 여기서 고른다 */}
      <Card className="mt-4">
        <div className="mb-2 flex items-center gap-1.5 text-[14px] font-bold text-zion-900">
          <Palette size={15} className="text-zion-600" /> 화면 밝기
        </div>
        <ThemeChoice />
      </Card>

      {/*
        내가 팔로우한 강사 (2026-08-15 리드 지시 — 「내가 팔로우한 강사님 항목도 볼 수 있도록」).
        자료 상세에서 「작성자 팔로우」를 누르면 여기 모이고, 이름을 누르면 그 사람의 자료만 나온다.
      */}
      <Card className="mt-4">
        <div className="mb-2 flex items-center gap-1.5 text-[14px] font-bold text-zion-900">
          <UserPlus size={15} className="text-zion-600" /> 팔로우한 강사 {myFollows.length}
        </div>
        {myFollows.length === 0 ? (
          <p className="py-6 text-center text-[13px] leading-relaxed text-ink-soft">
            팔로우한 강사가 없습니다.
            <br />
            자료를 열고 「작성자 팔로우」를 누르면 여기에 모입니다.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {myFollows
              .slice()
              .sort((a, b) => b.followedAt.localeCompare(a.followedAt))
              .map((f) => (
                <li
                  key={f.author}
                  className="flex items-center gap-1.5 rounded-lg border border-zion-100 py-1.5 pl-2.5 pr-1.5"
                >
                  {/* 그 강사의 자료만 보기 — 자료실 검색이 작성자도 찾는다(2026-08-15) */}
                  <Link
                    viewTransition
                    to={`/library?q=${encodeURIComponent(f.author)}`}
                    className="text-[13px] font-semibold text-zion-800 hover:underline"
                  >
                    {f.author}
                  </Link>
                  <button
                    onClick={() => toggleAuthorFollow(session.name, f.author)}
                    aria-label={`${f.author} 팔로우 해제`}
                    title="팔로우 해제"
                    className="rounded p-1 text-ink-soft transition hover:bg-zion-50 hover:text-red-600"
                  >
                    <X size={13} />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-4 max-md:grid-cols-1">
        {/* 즐겨찾기 */}
        <Card>
          <div className="mb-2 flex items-center gap-1.5 text-[14px] font-bold text-zion-900">
            <Star size={15} className="fill-gold-500 text-gold-500" /> 즐겨찾기 {mineFav.length}
          </div>
          {mineFav.length === 0 ? (
            <p className="py-8 text-center text-[13px] leading-relaxed text-ink-soft">
              별표해 둔 것이 없습니다.
              <br />
              자료·상담법·사례 옆의 별을 누르면 여기에 모입니다.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {mineFav
                .slice()
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((f) => {
                  const r = resolve(f.targetType, f.targetId);
                  return (
                    <li
                      key={`${f.targetType}-${f.targetId}`}
                      className="flex items-center gap-2 rounded-lg border border-zion-100 px-2.5 py-2"
                    >
                      <span className="shrink-0 rounded bg-zion-100 px-1.5 py-0.5 text-[10px] font-bold text-zion-700">
                        {FAVORITE_LABELS[f.targetType]}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                        {r.to ? (
                          <Link viewTransition to={r.to} className="hover:underline">
                            {r.label}
                          </Link>
                        ) : (
                          <span className="text-ink-soft">{r.label}</span>
                        )}
                      </span>
                      <button
                        onClick={() => toggleFavorite(session.name, f.targetType, f.targetId)}
                        aria-label="즐겨찾기 해제"
                        className="shrink-0 rounded p-1 text-gold-600 transition hover:bg-zion-50"
                      >
                        <Star size={13} className="fill-gold-500" />
                      </button>
                    </li>
                  );
                })}
            </ul>
          )}
        </Card>

        {/* 열람 기록 */}
        <Card>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[14px] font-bold text-zion-900">
              <Clock size={15} className="text-zion-600" /> 최근 본 것 {mineLog.length}
            </div>
            {mineLog.length > 0 && (
              <button
                onClick={() => clearActivity(session.name)}
                className="flex items-center gap-1 rounded-lg border border-zion-100 px-2 py-1 text-[11px] font-semibold text-ink-soft transition hover:border-zion-300"
              >
                <Trash2 size={11} /> 기록 지우기
              </button>
            )}
          </div>
          {mineLog.length === 0 ? (
            <p className="py-8 text-center text-[13px] leading-relaxed text-ink-soft">
              최근 기록이 없습니다.
              <br />
              자료를 열면 여기에 쌓입니다.
            </p>
          ) : (
            <ul className="max-h-[320px] space-y-1 overflow-y-auto">
              {mineLog.slice(0, 40).map((l, i) => {
                const r = resolve(l.targetType, l.targetId);
                return (
                  <li key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zion-50">
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">
                      {r.to ? (
                        <Link viewTransition to={r.to} className="hover:underline">
                          {r.label}
                        </Link>
                      ) : (
                        <span className="text-ink-soft">{r.label}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-[10.5px] text-ink-soft">
                      {l.viewedAt.slice(5, 16).replace("T", " ")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-ink-soft">
        기록에는 <strong className="text-ink">무엇을 봤는지의 식별자만</strong> 남고 제목·이름은
        저장되지 않습니다 — 화면에 그릴 때 그때의 자료에서 다시 찾습니다. 그래서 자료가 지워지거나
        담당 범위를 벗어나면 이름 없이 표시됩니다. <strong className="text-ink">수강생 화면은
        기록하지 않습니다.</strong> 보관 기간(권장 90일)은 정해지는 대로 적용되며, 지금은 최근
        200건까지만 남습니다.
      </p>
    </div>
  );
}

/** 저장하지 않고 떠난 글을 담아 두는 자리 — 계정 이름과 함께 넣어 남의 글이 뜨지 않게 한다 */
const MEMO_DRAFT_KEY = "zion_ark_memo_draft";

/**
 * 개인 메모장 (2026-08-18 리드 지시) — 계정당 한 장, 본인만 본다.
 * 내보내기가 없어 반출 경로도 없다(개인 일정과 달리 캘린더로 안 나간다).
 *
 * ⚠️ **저장은 단추를 눌러야 된다** (2026-08-21 리드 지시 — 종전 자동 저장을 대체한다).
 * 대신 **안 누르고 떠나도 글은 남는다** — 적는 동안 초안을 따로 담아 두고 다시 오면
 * 되살린다. 저장 단추의 약점(안 누르고 떠나 잃는 것)을 그것으로 막는다.
 */
function PersonalMemoPad() {
  const session = useSession();
  const { personalMemos, savePersonalMemo } = useStore();
  const saved = personalMemos.find((m) => m.userName === session.name);
  const savedText = saved?.text ?? "";
  const [text, setText] = useState(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(MEMO_DRAFT_KEY) ?? "null");
      if (draft && draft.userName === session.name && typeof draft.text === "string") {
        return draft.text as string;
      }
    } catch {
      /* 담긴 값이 깨졌으면 없는 셈 친다 */
    }
    return savedText;
  });
  const [justSaved, setJustSaved] = useState(false);
  const dirty = text !== savedText;

  // 아직 저장하지 않은 글만 담아 둔다 — 저장하면 지워 「저장 안 된 글」이 남지 않게 한다
  useEffect(() => {
    if (dirty) {
      localStorage.setItem(MEMO_DRAFT_KEY, JSON.stringify({ userName: session.name, text }));
    } else {
      localStorage.removeItem(MEMO_DRAFT_KEY);
    }
  }, [dirty, text, session.name]);

  // 「저장했습니다」는 잠깐만 띄운다
  useEffect(() => {
    if (!justSaved) return;
    const id = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(id);
  }, [justSaved]);

  return (
    <Card className="mt-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-[14px] font-bold text-zion-900">
          <StickyNote size={15} className="text-zion-600" /> 개인 메모장
        </div>
        <span className="text-[11px] text-ink-soft">
          나만 봅니다
          {saved && ` · 마지막 저장 ${saved.updatedAt.slice(5, 16).replace("T", " ")}`}
        </span>
      </div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setJustSaved(false);
        }}
        rows={3}
        placeholder="예) 다음 주 준비물, 확인할 일, 떠오른 생각"
        aria-label="개인 메모"
        className="w-full resize-y rounded-lg border border-zion-100 bg-zion-50/40 px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-zion-500"
      />
      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        <span aria-live="polite" className="mr-auto text-[11px] text-ink-soft">
          {dirty
            ? "아직 저장하지 않았습니다. 다른 화면에 갔다 와도 적은 글은 남습니다."
            : justSaved
              ? "저장했습니다."
              : ""}
        </span>
        <button
          type="button"
          disabled={!dirty}
          onClick={() => {
            savePersonalMemo(session.name, text);
            setJustSaved(true);
          }}
          className="rounded-lg bg-zion-800 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-zion-700 disabled:cursor-not-allowed disabled:bg-zion-300"
        >
          저장
        </button>
      </div>
    </Card>
  );
}
