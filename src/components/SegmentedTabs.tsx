import type { ReactNode } from "react";

export interface SegmentedItem<T extends string> {
  id: T;
  label: ReactNode;
  /** 라벨 옆에 붙는 숫자 — 몇 건인지 (선택) */
  count?: number;
  /** 이 항목만 다른 색으로 칠할 때 (초·중·고 단계 색처럼) */
  activeClass?: string;
}

/**
 * 세그먼트 탭 — 몇 갈래 중 하나를 고르는 알약 모양 전환기.
 *
 * ## 왜 부품으로 뽑았나 (2026-08-18)
 *
 * 같은 모양이 **열세 곳에 복제**돼 있었다(기수 현황 다섯 · 상담 사례 셋 · 내 일정 ·
 * 기수 달력 · 교안 · 공지 · 수강생 상세). 복제된 탓에 손볼 때마다 한 곳만 고쳐지고,
 * 무엇보다 **고른 것이 잘 안 보였다** — 옅은 남색 트랙 위에 **흰 알약**이라 흰 카드
 * 안에서는 경계가 거의 사라졌다(리드 지적: 「주간 월간 전환 버튼 더 가독성 있게」).
 *
 * 그래서 고른 항목을 **진한 남색 바탕에 흰 글자**로 바꿨다. 트랙(옅은 면)과 명암이
 * 완전히 갈려 곁눈으로도 어느 쪽이 켜져 있는지 보인다.
 *
 * ⚠️ **`bg-zion-700`은 다크에서 되돌려 놓은 「진한 면」 목록에 있는 값이다**
 * (`index.css`). 목록 밖 단계로 바꾸면 어두운 화면에서 하얗게 뜬다.
 *
 * ⚠️ 색은 **여기서만** 정한다. 쓰는 쪽이 클래스를 덧대기 시작하면 다시 열세 갈래가 된다 —
 * 단계 색처럼 정말 달라야 하는 것만 `activeClass`로 받는다(교안 화면의 초·중·고).
 */
export function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
  label,
  size = "md",
  scroll = false,
  grow = false,
  className = "",
}: {
  items: readonly SegmentedItem<T>[];
  value: T;
  onChange: (next: T) => void;
  /** 낭독기가 읽을 이 전환기의 이름 (예: 「일정 보기」) */
  label: string;
  /** md = 화면 위쪽의 큰 전환기 · sm = 표·패널 안의 작은 전환기 */
  size?: "md" | "sm";
  /** 항목이 많아 좁은 화면에서 넘칠 때 — 가로로 밀어 본다 */
  scroll?: boolean;
  /** 항목이 둘뿐이라 폭을 반씩 나눠 갖게 할 때 (공지의 총회/지파처럼) */
  grow?: boolean;
  className?: string;
}) {
  const md = size === "md";
  return (
    <div
      role="tablist"
      aria-label={label}
      className={
        "flex shrink-0 border border-zion-200/70 " +
        (md ? "gap-1 rounded-xl p-1 " : "rounded-lg p-0.5 ") +
        (scroll ? "overflow-x-auto " : "") +
        "bg-zion-100 " +
        className
      }
    >
      {items.map((it) => {
        const on = value === it.id;
        return (
          <button
            key={it.id}
            role="tab"
            aria-selected={on}
            /*
              어두운 화면에서 고른 항목의 **면 대비가 1.72**까지 떨어진다(실측) — 트랙도
              진한 면이 되기 때문이다. 글자 밝기로는 갈리지만(7.92 대 5.51) 한눈에 들어오진
              않아, `index.css`가 이 표시를 잡아 **안쪽 테두리 한 줄**을 얹는다.
              밝은 화면에서는 면 대비가 8.3이라 필요 없어 규칙이 걸리지 않는다.
            */
            data-segmented-on={on ? "true" : undefined}
            onClick={() => onChange(it.id)}
            className={
              "shrink-0 font-semibold whitespace-nowrap transition " +
              (grow ? "flex-1 " : "") +
              (md ? "rounded-lg px-3 py-2 text-[13px] sm:px-4 " : "rounded-md px-2.5 py-1 text-[12px] ") +
              (on
                ? (it.activeClass ?? "bg-zion-700 text-white shadow-sm") + " "
                : /*
                    ⚠️ 고르지 않은 항목은 **`text-ink-soft`**다 — `text-zion-600`을 쓰면
                    어두운 화면에서 트랙과 함께 어두워져 **대비 1.96**으로 안 읽힌다(실측).
                    본문 보조색은 밝기가 양쪽에서 뒤집혀 어느 화면에서도 읽힌다(다크 5.51).
                    ⚠️ hover 면도 `bg-white/70`을 쓰지 않는다 — **반투명 흰 면은 다크
                    되돌리기 목록에 없어** 어두운 화면에서 흰 띠로 뜬다(CLAUDE.md 함정).
                  */
                  "text-ink-soft hover:bg-zion-200 hover:text-ink ")
            }
          >
            {it.label}
            {it.count !== undefined && (
              <span className={"ml-1 font-bold " + (on ? "text-white/75" : "text-ink-soft")}>{it.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
