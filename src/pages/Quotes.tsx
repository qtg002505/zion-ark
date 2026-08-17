import { useMemo, useState } from "react";
import { Portal } from "../components/Portal";
import { Check, Copy, Plus, Quote as QuoteIcon, Sparkles, X } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { canWriteWorkspace } from "../lib/permissions";
import type { QuoteCategory } from "../lib/types";
import { QUOTE_ITEMS, QUOTE_TOPIC_LIST, type QuoteItem } from "../content/quotes-data";
import { pickQuotes, popularTopics, toPlainText, type PickResult } from "../lib/quote-picker";
import { Accordion, type AccordionItem } from "../components/Accordion";
import { PageHeader, Card } from "./common";

const QUOTE_CATEGORIES: QuoteCategory[] = ["말씀", "사명", "신앙", "교육", "리더십"];
const PAGE_SIZE = 30;

/** 한 주제의 어록 목록 — 많은 주제는 나눠서 보여 준다 */
function TopicQuoteList({ items }: { items: QuoteItem[] }) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const shown = items.slice(0, limit);

  return (
    <>
      <ol className="divide-y divide-zion-100">
        {shown.map((it, i) => (
          <li key={`${it.category}-${it.no}-${i}`} className="py-2.5">
            <blockquote className="text-[14px] leading-relaxed text-ink">{it.text}</blockquote>
            <div className="mt-1 text-[11px] text-ink-soft">{it.no}번</div>
          </li>
        ))}
      </ol>
      {items.length > limit && (
        <button
          onClick={() => setLimit(limit + PAGE_SIZE)}
          className="mt-2 w-full rounded-lg border border-zion-200 py-1.5 text-[12px] font-semibold text-zion-700 transition hover:bg-zion-50"
        >
          더 보기 ({(items.length - limit).toLocaleString()}건 남음)
        </button>
      )}
    </>
  );
}

/**
 * 총회장님 어록 — 주제별 정리본(원문 그대로, 오탈자만 수정) 검색·열람.
 * 추가 등록분(store)은 상단에 별도 표시.
 */
export function Quotes() {
  const session = useSession();
  const { entries, addEntry } = useStore();
  const [formOpen, setFormOpen] = useState(false);

  const writable = canWriteWorkspace(session, "quote");

  const added = useMemo(() => entries.filter((e) => e.kind === "quote"), [entries]);

  /** 주제별 아코디언 — 주제를 누르면 그 주제의 어록이 열린다 */
  const topicItems: AccordionItem[] = useMemo(() => {
    const base = QUOTE_TOPIC_LIST.map((t) => {
      const list = QUOTE_ITEMS.filter((i) => i.category === t);
      return {
        id: t,
        title: `${t} (${list.length})`,
        hint: list[0]?.text,
        content: <TopicQuoteList items={list} />,
      };
    });

    // 사이트에서 등록한 어록도 한 주제로 묶어 같은 자리에서 본다
    if (added.length === 0) return base;
    return [
      {
        id: "__added",
        title: `사이트 추가 등록 (${added.length})`,
        hint: added[0]?.title,
        content: (
          <ol className="divide-y divide-zion-100">
            {added.map((q) => (
              <li key={q.id} className="py-2.5">
                <blockquote className="text-[14px] leading-relaxed text-ink">{q.title}</blockquote>
                {q.body && <p className="mt-1 text-[12px] text-ink-soft">{q.body}</p>}
                <div className="mt-1 text-[11px] text-ink-soft">
                  {q.quoteCategory ?? "미분류"}
                  {q.meta ? ` · ${q.meta}` : ""} · {q.createdBy}
                </div>
              </li>
            ))}
          </ol>
        ),
      },
      ...base,
    ];
  }, [added]);

  return (
    <div>
      <PageHeader
        crumb="공지 · 어록"
        title="총회장님 어록"
        desc={`주제별 정리본 ${QUOTE_ITEMS.length.toLocaleString()}건 · 주제 ${QUOTE_TOPIC_LIST.length}개 — 원문 그대로 탑재 (오탈자만 수정, 변형·압축 없음)`}
        action={
          writable ? (
            <button
              onClick={() => setFormOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-zion-800 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-zion-700"
            >
              <Plus size={15} /> 어록 등록
            </button>
          ) : (
            <span className="text-[11px] text-ink-soft">등록 권한: 콘텐츠 관리자 · 총회 신학부장</span>
          )
        }
      />

      <QuotePicker />

      <Card className="mt-5">
        <div className="mb-3 flex items-center gap-2">
          <QuoteIcon size={16} className="text-zion-600" />
          <h2 className="text-[15px] font-bold text-zion-900">전체 주제 보기</h2>
          <span className="text-[12px] text-ink-soft">
            주제 {QUOTE_TOPIC_LIST.length}개 · 어록 {QUOTE_ITEMS.length.toLocaleString()}건
          </span>
        </div>
        {/* 어록은 본문이 23,000px로 이 사이트에서 가장 길다 — 화면 밖은 그리지 않는다 */}
        <Accordion items={topicItems} defaultOpenFirst={false} compact deferOffscreen />
      </Card>

      {formOpen && writable && (
        <QuoteForm
          onClose={() => setFormOpen(false)}
          onSubmit={(title, body, cat, source) => {
            addEntry({
              kind: "quote",
              title,
              body,
              meta: source || null,
              quoteCategory: cat,
              pinned: false,
              createdBy: session.name,
              createdByRole: session.roleCode,
            });
            setFormOpen(false);
          }}
        />
      )}
    </div>
  );
}

/**
 * 주제로 어록 뽑기 — "○○ 관련 어록 뽑아줘" 요청을 받아 관련 어록을 모아 준다.
 * 어록 본문은 원문 그대로 인용하며 요약·재작성하지 않는다.
 */
function QuotePicker() {
  const [input, setInput] = useState("");
  const [asked, setAsked] = useState<{
    keywords: string[];
    results: PickResult[];
    total: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const topics = useMemo(() => popularTopics(8), []);

  /**
   * 2026-08-13 리드 지시 — 「요청 단어를 넣으면 다 나오도록」.
   * 종전에는 20건만 뽑고 「더 뽑기」로 스무 개씩 늘렸다. 이제 처음부터 **50건**을 뽑고
   * 걸린 총 건수를 함께 보여 준 뒤, 「전부 보기」로 한 번에 펼친다.
   */
  function run(text: string, take = 50) {
    const trimmed = text.trim();
    setInput(trimmed);
    setCopied(false);
    setAsked(trimmed ? pickQuotes(trimmed, take) : null);
  }

  async function copy() {
    if (!asked) return;
    const text = toPlainText(asked.keywords, asked.results);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 클립보드가 막힌 환경 대비
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="border-zion-200 bg-zion-50">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-zion-600" />
        <h2 className="text-[15px] font-bold text-zion-900">어록 검색 · 주제로 뽑기</h2>
      </div>
      <p className="mt-1 text-[12px] text-ink-soft">
        찾는 주제를 넣으면 관련 어록을 모아 줍니다. 예:{" "}
        <span className="text-zion-700">전도 관련 어록 뽑아줘</span> ·{" "}
        <span className="text-zion-700">청년 교육</span> — 원문 그대로 인용하며 요약하지 않습니다.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(input);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="주제로 찾기 (예: 전도, 믿음, 감사)"
          aria-label="어록 주제 입력"
          className="flex-1 rounded-lg border border-zion-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-zion-800 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-zion-700"
        >
          뽑기
        </button>
      </form>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-ink-soft">자주 찾는 주제</span>
        {topics.map((t) => (
          <button
            key={t}
            onClick={() => run(t)}
            className="rounded-full border border-zion-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zion-700 transition hover:border-zion-400"
          >
            {t}
          </button>
        ))}
      </div>

      <div aria-live="polite" className="sr-only">
        {asked ? `${asked.results.length}건을 찾았습니다` : ""}
      </div>

      {asked && (
        <div className="mt-4 border-t border-zion-200 pt-3">
          {asked.keywords.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-ink-soft">
              주제어를 두 글자 이상 넣어 주세요 (예: 전도, 기도, 청년).
            </p>
          ) : asked.results.length === 0 ? (
            <p className="py-4 text-center text-[13px] leading-relaxed text-ink-soft">
              <strong className="text-zion-800">{asked.keywords.join(" · ")}</strong> 관련 어록을 찾지 못했습니다.
              {/* 붙여 쓴 한 낱말은 그 연속이 원문에 있어야 걸린다 — 나눠 찾으면 넓어진다 */}
              {asked.keywords.length === 1 && asked.keywords[0].length >= 4 && (
                <>
                  <br />
                  <strong className="text-zion-800">낱말을 띄어서</strong> 찾아 보세요 — 예:{" "}
                  <span className="text-zion-700">
                    {asked.keywords[0].slice(0, 2)} {asked.keywords[0].slice(2)}
                  </span>
                </>
              )}
              <br />
              위 주제 버튼을 눌러 봐도 됩니다.
            </p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-zion-900">
                  <span className="text-zion-700">{asked.keywords.join(" · ")}</span> 관련 어록{" "}
                  {asked.total}건
                  {asked.results.length < asked.total && (
                    <span className="ml-1 font-normal text-ink-soft">
                      — 상위 {asked.results.length}건 보는 중
                    </span>
                  )}
                </span>
                <button
                  onClick={copy}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-zion-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zion-700 transition hover:bg-zion-50"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "복사됨" : "전체 복사"}
                </button>
              </div>

              <ol className="space-y-2">
                {asked.results.map((r, i) => (
                  <li key={`${r.item.category}-${r.item.no}-${i}`} className="rounded-lg bg-white p-3">
                    <div className="flex gap-2">
                      <span className="shrink-0 text-[12px] font-bold text-zion-600">{i + 1}</span>
                      <div className="min-w-0">
                        <blockquote className="text-[14px] leading-relaxed text-ink">
                          {r.item.text}
                        </blockquote>
                        <div className="mt-1 text-[11px] text-ink-soft">
                          출처: 총회장님 어록 — {r.item.category} {r.item.no}번
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>

              {asked.results.length < asked.total && (
                <button
                  onClick={() => run(input, asked.total)}
                  className="mt-3 w-full rounded-lg border border-zion-200 bg-white py-2 text-[13px] font-semibold text-zion-700 transition hover:bg-zion-50"
                >
                  전부 보기 ({asked.total}건)
                </button>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function QuoteForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (title: string, body: string, category: QuoteCategory, source: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<QuoteCategory>("말씀");
  const [source, setSource] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) {
      setError("어록 본문을 두 글자 이상 입력해 주세요.");
      return;
    }
    onSubmit(title.trim(), body.trim(), category, source.trim());
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zion-950/50 p-4" role="dialog" aria-modal="true" aria-label="어록 등록">
        <form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-zion-900">어록 등록</h2>
            <button type="button" onClick={onClose} aria-label="닫기" className="rounded p-1 text-ink-soft hover:bg-zion-50">
              <X size={16} />
            </button>
          </div>

          <label className="mb-1 block text-[12px] font-semibold text-ink">어록</label>
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            rows={3}
            className="mb-3 w-full resize-y rounded-lg border border-zion-100 px-3 py-2 text-[13px] outline-none focus:border-zion-500"
          />

          <label className="mb-1 block text-[12px] font-semibold text-ink">해설·맥락 (선택)</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="mb-3 w-full resize-y rounded-lg border border-zion-100 px-3 py-2 text-[13px] outline-none focus:border-zion-500"
          />

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-ink">카테고리</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as QuoteCategory)}
                className="w-full rounded-lg border border-zion-100 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500"
              >
                {QUOTE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-ink">출처 (선택)</label>
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="예: 2025 지도자 교육"
                className="w-full rounded-lg border border-zion-100 px-3 py-2 text-[13px] outline-none focus:border-zion-500"
              />
            </div>
          </div>

          {error && <p className="mb-3 text-[12px] text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-[13px] text-ink-soft hover:bg-zion-50">
              취소
            </button>
            <button type="submit" className="rounded-lg bg-zion-800 px-4 py-2 text-[13px] font-semibold text-white hover:bg-zion-700">
              등록
            </button>
          </div>
        </form>
      </div>
    </Portal>
  );
}
