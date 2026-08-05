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
  compact = false,
}: {
  items: AccordionItem[];
  resetKey?: string;
  defaultOpenFirst?: boolean;
  compact?: boolean;
}) {
  const initial = useMemo(
    () => new Set(defaultOpenFirst && items.length > 0 ? [items[0].id] : []),
    [items, defaultOpenFirst],
  );
  const [open, setOpen] = useState<Set<string>>(initial);

  // 장을 옮기면 접힘 상태를 새로 시작한다
  useEffect(() => {
    setOpen(new Set(defaultOpenFirst && items.length > 0 ? [items[0].id] : []));
  }, [resetKey, items, defaultOpenFirst]);

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
        <span className="text-[11px] text-gray-400">
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
                    <span className="mt-0.5 block truncate text-[12px] font-normal text-gray-400">
                      {item.hint}
                    </span>
                  )}
                </span>
              </button>
              {isOpen && (
                <div className={"border-t border-gray-100 " + (compact ? "px-3 py-2.5" : "px-4 py-3")}>
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
