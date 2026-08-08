import { useMemo, useState } from "react";
import { CheckCircle2, Plus, Search, ShieldAlert, ThumbsUp, XCircle } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { canWriteCounselCase } from "../lib/permissions";
import { ROLE_LABELS, type CounselCase } from "../lib/types";
import { PageHeader, Card } from "./common";

type Filter = "all" | "success" | "failure";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "success", label: "돌아온 경우" },
  { key: "failure", label: "놓친 경우" },
];

/**
 * 개인을 짚을 수 있는 표현을 걸러 낸다 (2026-08-06 확정 익명화 기준).
 *
 * 자료실은 전국 공통이라 조직 스코프가 없다. 그래서 **지파·교회·센터(기수)까지만** 밝히고
 * 그 아래는 적지 않는다. 여기서 막는 것은 화면 단의 1차 방어이며, 서버 연동 시 같은 검사를
 * 서버에서도 한다 (불변식 2 — 원문 개인정보 반출 금지).
 *
 * ⚠️ 정규식은 완벽한 차단 장치가 아니라 **실수를 잡아 주는 장치**다.
 * 그래서 막는 동시에 "왜 막는지"를 화면에 적어 사람이 스스로 지우게 한다.
 */
const PII_RULES: { re: RegExp; hint: string }[] = [
  { re: /01[016-9][-\s.]?\d{3,4}[-\s.]?\d{4}/, hint: "휴대전화 번호" },
  { re: /\d{6}[-\s]?\d{7}/, hint: "주민등록번호 형태의 숫자" },
  { re: /[\w.+-]+@[\w-]+\.[\w.]+/, hint: "이메일 주소" },
  { re: /\d+\s*분반|[가-힣A-Za-z]+\s*분반/, hint: "분반 (센터 아래 단위는 적지 않습니다)" },
  { re: /\d{2,3}\s*(세|살)/, hint: "나이" },
  { re: /[가-힣]{2,3}\s*(자매|형제)님?/, hint: "이름으로 읽히는 호칭" },
];

export function scanPII(text: string): string[] {
  return PII_RULES.filter((r) => r.re.test(text)).map((r) => r.hint);
}

/**
 * 상담 사례 (2026-08-06 확정) — 강사 도우미의 공유 자산.
 *
 * 성공 사례만 모으지 않는다. **놓친 경우가 더 많이 배운다** — 결과가 나빴던 사례도 같은
 * 무게로 싣고, 어느 쪽인지만 표시한다. 개인을 특정할 수 있는 것은 담지 않는다.
 */
export function CounselCases() {
  const session = useSession();
  const { counselCases, addCounselCase, markCaseHelpful } = useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const writable = canWriteCounselCase(session);

  const list = useMemo(() => {
    const q = query.trim();
    return counselCases
      .filter((c) => filter === "all" || c.outcome === filter)
      .filter(
        (c) => !q || c.situation.includes(q) || c.approach.includes(q) || c.result.includes(q),
      );
  }, [counselCases, filter, query]);

  const successCount = counselCases.filter((c) => c.outcome === "success").length;

  return (
    <div>
      <PageHeader
        crumb="상담 도우미"
        title="상담 사례"
        desc="현장에서 겪은 일을 서로 남겨 둡니다. 잘된 경우만이 아니라 놓친 경우도 함께 싣습니다."
        action={
          writable ? (
            <button
              onClick={() => setFormOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-zion-800 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-zion-700"
            >
              <Plus size={15} /> 사례 남기기
            </button>
          ) : null
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-card border border-gold-500/40 bg-gold-100/60 p-3">
        <ShieldAlert size={15} className="mt-0.5 shrink-0 text-gold-700" />
        <p className="text-[12px] leading-relaxed text-ink">
          <strong className="font-bold">소속은 지파 · 교회 · 센터(기수)까지만 적습니다.</strong> 이름 ·
          연락처 · 분반 · 나이처럼 사람을 짚을 수 있는 것은 적지 않습니다. 여기 올린 글은 전국의
          사명자가 봅니다.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl bg-zion-100 p-1" role="tablist" aria-label="사례 구분">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={
                "shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-semibold transition " +
                (filter === f.key ? "bg-white text-zion-900 shadow-sm" : "text-zion-600 hover:text-zion-800")
              }
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-zion-100 bg-white px-3 py-1.5">
          <Search size={13} className="text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="상황·방법으로 찾기 (예: 근무, 연락)"
            aria-label="사례 검색"
            className="min-w-0 flex-1 bg-transparent text-[12px] outline-none"
          />
        </div>
      </div>

      <p className="mb-3 text-[12px] text-ink-soft">
        모두 {counselCases.length}건 · 돌아온 경우 {successCount}건 · 놓친 경우{" "}
        {counselCases.length - successCount}건
      </p>

      {list.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-[13px] text-ink-soft">해당하는 사례가 없습니다.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((c) => (
            <CaseCard key={c.id} item={c} onHelpful={() => markCaseHelpful(c.id)} />
          ))}
        </div>
      )}

      {formOpen && writable && (
        <CaseForm
          onClose={() => setFormOpen(false)}
          onSubmit={(input) => {
            addCounselCase({
              ...input,
              tribe: session.tribe,
              church: session.church,
              cohort: session.cohort,
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

function CaseCard({ item, onHelpful }: { item: CounselCase; onHelpful: () => void }) {
  const success = item.outcome === "success";
  return (
    <article className="rounded-card border border-zion-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <span
          className={
            "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold " +
            (success ? "bg-zion-100 text-zion-800" : "bg-zion-50 text-ink-soft")
          }
        >
          {success ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          {success ? "돌아온 경우" : "놓친 경우"}
        </span>
        {/* 익명화 기준 — 여기까지만 밝힌다 */}
        <span className="text-[11px] text-ink-soft">
          {item.tribe} 지파 · {item.church} · {item.cohort}
        </span>
      </div>

      <dl className="space-y-2.5">
        {[
          ["어떤 상황이었나", item.situation],
          ["어떻게 했나", item.approach],
          ["어떻게 됐나", item.result],
        ].map(([label, body]) => (
          <div key={label}>
            <dt className="text-[11px] font-bold text-zion-700">{label}</dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{body}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zion-100 pt-2.5">
        <span className="text-[11px] text-ink-soft">
          {item.createdBy} ({ROLE_LABELS[item.createdByRole]}) · {item.createdAt.slice(0, 10)}
        </span>
        <button
          onClick={onHelpful}
          className="flex items-center gap-1 rounded-lg border border-zion-100 px-2.5 py-1 text-[11px] font-semibold text-zion-700 transition hover:border-zion-300 hover:bg-zion-50"
        >
          <ThumbsUp size={12} /> 도움됨 {item.helpful}
        </button>
      </div>
    </article>
  );
}

function CaseForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (input: {
    situation: string;
    approach: string;
    result: string;
    outcome: "success" | "failure";
  }) => void;
}) {
  const [situation, setSituation] = useState("");
  const [approach, setApproach] = useState("");
  const [result, setResult] = useState("");
  const [outcome, setOutcome] = useState<"success" | "failure">("success");
  const [error, setError] = useState<string | null>(null);

  // 입력 중에도 걸리는 표현을 보여 준다 — 제출할 때 처음 알면 다시 쓰게 되어서다
  const hits = useMemo(
    () => [...new Set(scanPII([situation, approach, result].join("\n")))],
    [situation, approach, result],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (situation.trim().length < 10 || approach.trim().length < 10 || result.trim().length < 5) {
      setError("세 칸을 모두 채워 주세요. 뒤에 읽는 사람이 상황을 그려 볼 수 있을 만큼 적어 주세요.");
      return;
    }
    if (hits.length > 0) {
      setError(`개인을 짚을 수 있는 내용이 있습니다 — ${hits.join(", ")}. 지운 뒤 올려 주세요.`);
      return;
    }
    onSubmit({
      situation: situation.trim(),
      approach: approach.trim(),
      result: result.trim(),
      outcome,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zion-950/50 p-4" role="dialog" aria-modal="true" aria-label="상담 사례 남기기">
      <form onSubmit={submit} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-1 text-[16px] font-bold text-zion-900">상담 사례 남기기</h2>
        <p className="mb-4 text-[12px] leading-relaxed text-ink-soft">
          소속은 지파 · 교회 · 센터까지만 자동으로 붙습니다. 본문에는 이름 · 연락처 · 분반 · 나이를
          적지 않습니다.
        </p>

        <div className="mb-3 flex gap-1 rounded-xl bg-zion-100 p-1">
          {(
            [
              ["success", "돌아온 경우"],
              ["failure", "놓친 경우"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setOutcome(v)}
              className={
                "flex-1 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition " +
                (outcome === v ? "bg-white text-zion-900 shadow-sm" : "text-zion-600")
              }
            >
              {label}
            </button>
          ))}
        </div>

        {(
          [
            ["어떤 상황이었나", situation, setSituation, "예) 근무 시간이 바뀌어 저녁 대면에 계속 빠지게 된 분이 있었습니다."],
            ["어떻게 했나", approach, setApproach, "예) 그만두는 이야기를 바로 만류하지 않고 올 수 있는 시간대부터 물었습니다."],
            ["어떻게 됐나", result, setResult, "예) 오전 보강으로 옮긴 뒤 계속 나오고 있습니다."],
          ] as const
        ).map(([label, value, set, ph]) => (
          <div key={label} className="mb-3">
            <label className="mb-1 block text-[12px] font-semibold text-ink">{label}</label>
            <textarea
              value={value}
              onChange={(e) => set(e.target.value)}
              rows={3}
              placeholder={ph}
              className="w-full resize-y rounded-lg border border-zion-100 px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-zion-500"
            />
          </div>
        ))}

        {hits.length > 0 && (
          <p className="mb-3 flex items-start gap-1.5 rounded-lg bg-gold-100/60 p-2.5 text-[12px] leading-relaxed text-ink">
            <ShieldAlert size={14} className="mt-0.5 shrink-0 text-gold-700" />
            <span>
              지워 주세요 — {hits.join(", ")}. 사람을 짚을 수 있는 내용은 올릴 수 없습니다.
            </span>
          </p>
        )}

        {error && <p className="mb-3 text-[12px] text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-[13px] text-ink-soft hover:bg-zion-50">
            취소
          </button>
          <button
            type="submit"
            disabled={hits.length > 0}
            className="rounded-lg bg-zion-800 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-zion-700 disabled:cursor-not-allowed disabled:bg-zion-300"
          >
            올리기
          </button>
        </div>
      </form>
    </div>
  );
}
