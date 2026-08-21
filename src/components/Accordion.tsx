import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronsDown, ChevronsUp } from "lucide-react";

export interface AccordionItem {
  id: string;
  title: string;
  /** 접힌 상태에서도 보이는 한 줄 미리보기 (선택) */
  hint?: string;
  content: ReactNode;
}

/**
 * 소주제 접기 — 긴 자료를 소주제 단위로 접어 두고, 눌러서 펼쳐 읽는다.
 * `resetKey`가 바뀌면(다른 장·다른 강으로 이동) 열림 상태를 초기값으로 되돌린다.
 */
export function Accordion({
  items,
  resetKey,
  defaultOpenFirst = true,
  initialOpenIds,
  compact = false,
  deferOffscreen = false,
}: {
  items: AccordionItem[];
  resetKey?: string;
  defaultOpenFirst?: boolean;
  /**
   * 처음부터 열어 둘 항목 (2026-08-15) — **딥링크가 있는 화면**을 위한 것이다.
   * 기수 현황이 `?tab=attendance`로 들어오면 그 항목이 열린 채로 뜬다.
   * 주면 `defaultOpenFirst`보다 이 값이 이긴다.
   */
  initialOpenIds?: string[];
  compact?: boolean;
  /**
   * 화면 밖 소주제를 그리지 않는다 (2026-08-11).
   *
   * **소주제가 수십 개인 화면에서만 켠다.** 어록(99개)에는 켰고, 교안(7개)·에니어그램(5개)에는
   * 켜 봤다가 껐다 — 본문이 3,000px 안쪽이라 얻는 것 없이 스크롤 길이만 어긋났다.
   *
   * ⚠️ **기본이 꺼짐인 또 다른 이유.** 이걸 켜면 항목마다 `contain: paint`가 걸려
   * **소주제 안에 있는 `position: fixed` 모달이 그 항목 안에 갇힌다.** 화면 가운데
   * 떠야 할 등록 창이 목록 한 칸 안에서 열린다. 소주제 안에 모달이 없는 것을 확인한
   * 화면에서만 켠다 — 상담 도우미(`Counseling`)는 소주제가 곧 등록 폼을 품고 있어 껐다.
   */
  deferOffscreen?: boolean;
}) {
  const initialKey = (initialOpenIds ?? []).join("|");
  const initial = useMemo(
    () =>
      new Set(
        initialOpenIds && initialOpenIds.length > 0
          ? initialOpenIds
          : defaultOpenFirst && items.length > 0
            ? [items[0].id]
            : [],
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, defaultOpenFirst, initialKey],
  );
  const [open, setOpen] = useState<Set<string>>(initial);

  // 장을 옮기면(resetKey) 또는 항목 구성 자체가 바뀌면 접힘 상태를 새로 시작한다.
  // ⚠️ items **배열 정체성**에 걸면 안 된다 — 항목 안 내용만 바뀌어도(예: 상담법 도움됨
  // 클릭으로 스토어 갱신) 렌더마다 새 배열이 오므로 열어 둔 것이 전부 닫혀 버린다.
  const idsKey = items.map((i) => i.id).join("|");
  const firstId = items.length > 0 ? items[0].id : null;
  useEffect(() => {
    setOpen(
      new Set(
        initialOpenIds && initialOpenIds.length > 0
          ? initialOpenIds
          : defaultOpenFirst && firstId
            ? [firstId]
            : [],
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, idsKey, defaultOpenFirst, initialKey]);

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allOpen = open.size === items.length && items.length > 0;

  if (items.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] text-ink-soft">
          소주제 {items.length}개 — 제목을 누르면 내용이 열립니다
        </span>
        <button
          onClick={() => setOpen(allOpen ? new Set() : new Set(items.map((i) => i.id)))}
          className="flex items-center gap-1 rounded-lg border border-zion-200 px-2.5 py-1 text-[11px] font-semibold text-zion-700 transition hover:bg-zion-50"
        >
          {allOpen ? <ChevronsUp size={12} /> : <ChevronsDown size={12} />}
          {allOpen ? "모두 접기" : "모두 펼치기"}
        </button>
      </div>

      <div className="space-y-1.5">
        {items.map((item) => {
          const isOpen = open.has(item.id);
          return (
            <div
              key={item.id}
              className={
                "overflow-hidden rounded-xl border transition " +
                // 접힘·펼침에 따라 자리 높이가 다르다 — 한 값으로 두면 문서 길이가 어긋난다
                (deferOffscreen ? (isOpen ? "defer-offscreen-open " : "defer-offscreen ") : "") +
                (isOpen ? "border-zion-300 bg-white" : "border-zion-100 bg-zion-50/40")
              }
            >
              <button
                onClick={() => toggle(item.id)}
                aria-expanded={isOpen}
                className={
                  "flex w-full items-center gap-2 text-left transition hover:bg-zion-50 " +
                  (compact ? "px-3 py-2" : "px-4 py-3")
                }
              >
                <ChevronDown
                  size={15}
                  className={
                    "shrink-0 text-zion-400 transition-transform " + (isOpen ? "rotate-0" : "-rotate-90")
                  }
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={
                      "block font-bold text-zion-900 " + (compact ? "text-[13px]" : "text-[14px]")
                    }
                  >
                    {item.title}
                  </span>
                  {!isOpen && item.hint && (
                    <span className="mt-0.5 block truncate text-[12px] font-normal text-ink-soft">
                      {item.hint}
                    </span>
                  )}
                </span>
              </button>
              {isOpen && (
                /*
                  ⚠️ **긴 본문은 소주제 안에서 굴린다** (2026-08-21 리드 지시 — 「자료가 긴 경우
                  스크롤이 너무 내려가며 상단이 안 보인다. 내부 스크롤을 넣되 너무 작지 않도록」).
                  한 소주제를 펼치면 페이지가 수천 px로 늘어나 목록·머리가 시야에서 사라졌다.
                  `72vh`는 화면 세 뼘 중 두 뼘 — 많은 내용이 한눈에 보이면서 그 안에서 내려간다.
                  짧은 본문은 max-h에 안 닿아 아무 변화가 없다.
                  ⚠️ 모달은 `Portal`로 밖에 떠서 이 overflow에 갇히지 않는다(2026-08-13 결정 덕).
                */
                <div
                  className={
                    "max-h-[72vh] overflow-y-auto border-t border-zion-100 " +
                    (compact ? "px-3 py-2.5" : "px-4 py-3")
                  }
                >
                  {item.content}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
