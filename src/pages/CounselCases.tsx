import { useMemo, useState } from "react";
import { Portal } from "../components/Portal";
import {
  CheckCircle2,
  Pencil,
  Plus,
  Scale,
  Search,
  ShieldAlert,
  ThumbsUp,
  Trash2,
  XCircle,
} from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { canWriteCounselCase } from "../lib/permissions";
import { looseIncludes } from "../lib/text-match";
import { scanPII } from "../lib/privacy";
import { ROLE_LABELS, type CounselCase } from "../lib/types";
import { FavoriteButton } from "../components/FavoriteButton";
import { PageHeader, Card } from "./common";

type Filter = "all" | "success" | "failure";
type SortKey = "popular" | "recent";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "success", label: "돌아온 경우" },
  { key: "failure", label: "놓친 경우" },
];

/**
 * 법적 주의 — 스토킹처벌법 (2026-08-10 리드 지시).
 *
 * 수강생을 향한 과도한 열심이 **처벌 대상 행위**가 될 수 있다는 것을 상담 화면에 고정으로
 * 알린다. 상담 도우미(`/counseling`)도 이 카드를 함께 쓴다.
 * ⚠️ 법률 자문이 아니라 주의 안내다 — 구체적 사안은 반드시 전문가 확인을 안내한다.
 */
export function LegalNotice() {
  return (
    <Card className="mt-5 border-red-200">
      <div className="mb-2 flex items-center gap-1.5 text-[14px] font-bold text-red-700">
        <Scale size={15} /> 법적 주의 — 스토킹처벌법
      </div>
      <p className="mb-2 text-[13px] leading-relaxed text-ink">
        「스토킹범죄의 처벌 등에 관한 법률」(2021년 시행)은 <strong>상대방 의사에 반해
        정당한 이유 없이 반복되는 접근·연락</strong>을 범죄로 처벌합니다 — 3년 이하 징역 또는
        3천만 원 이하 벌금. 좋은 뜻이라도 상대가 원치 않으면 법 위반이 됩니다.
      </p>
      <ul className="space-y-1.5 text-[13px] leading-relaxed text-ink">
        <li>
          · <strong>「문고리 심방」 금지</strong> — 부재중 집 앞을 찾아가 기다리거나 문에 물건을
          걸어 두는 행위는 주거 부근 접근·물건 두기로 처벌될 수 있습니다
        </li>
        <li>
          · <strong>끊어 보내는 메시지도 횟수가 누적됩니다</strong> — 한 내용을 여러 번에 나눠
          보내면 법원은 각각을 따로 세어 반복성을 인정한 판결이 있습니다
        </li>
        <li>
          · 연락처 차단·거절 의사 표시 뒤의 연락, 다른 번호·계정으로 이어 가는 연락은 반복성의
          근거가 됩니다
        </li>
        <li>
          · <strong>상대가 그만해 달라고 하면 그 자리에서 멈춥니다.</strong> 이후 접촉은 담당자
          한 사람이 공식 경로로만 합니다
        </li>
      </ul>
      <p className="mt-3 border-t border-zion-100 pt-2.5 text-[11px] leading-relaxed text-ink-soft">
        실제 행정·사법 처리 사례가 있는 사안입니다. 이 안내는 법률 자문이 아니며, 구체적인 일이
        생기면 지파 신학부를 거쳐 전문가에게 확인합니다.
      </p>
    </Card>
  );
}

/**
 * 상담 사례 (2026-08-06 확정 · 2026-08-10 보강) — 실제 상담 글을 쌓는 아카이브.
 *
 * 성공 사례만 모으지 않는다. **놓친 경우가 더 많이 배운다** — 결과가 나빴던 사례도 같은
 * 무게로 싣고, 어느 쪽인지만 표시한다. 개인을 특정할 수 있는 것은 담지 않는다.
 *
 * 2026-08-10 리드 지시 반영: 최신순/인기순 정렬 · 도움됨 1인 1회 토글 ·
 * 본인 글 수정/삭제 · 법적 주의(스토킹처벌법) 고정 노출.
 */
export function CounselCases() {
  const session = useSession();
  const { counselCases, addCounselCase, updateCounselCase } = useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortKey>("popular"); // 상담 도우미와 같은 기본값 (지시문 §2-5)
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CounselCase | null>(null);

  const writable = canWriteCounselCase(session);

  const list = useMemo(() => {
    const q = query.trim();
    return counselCases
      .filter((c) => filter === "all" || c.outcome === filter)
      .filter(
        (c) =>
          !q || looseIncludes(c.situation, q) || looseIncludes(c.approach, q) || looseIncludes(c.result, q),
      )
      .sort((a, b) =>
        sort === "popular"
          ? b.helpfulBy.length - a.helpfulBy.length || b.createdAt.localeCompare(a.createdAt)
          : b.createdAt.localeCompare(a.createdAt),
      );
  }, [counselCases, filter, sort, query]);

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
          <br />
          {/* 왜 남의 글에는 단추가 없는지 미리 밝힌다 (2026-08-11 파트 B 검수 반영) */}
          <span className="text-ink-soft">
            고치거나 지우는 것은 <strong className="font-semibold text-zion-700">내가 올린 글</strong>
            에서만 됩니다 — 「내 글」 표시가 붙은 사례입니다.
          </span>
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
        <div className="flex gap-1 rounded-xl bg-zion-100 p-1" role="tablist" aria-label="정렬">
          {(
            [
              ["popular", "인기순"],
              ["recent", "최신순"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={sort === key}
              onClick={() => setSort(key)}
              className={
                "rounded-lg px-3 py-1.5 text-[12px] font-semibold transition " +
                (sort === key ? "bg-white text-zion-900 shadow-sm" : "text-zion-600 hover:text-zion-800")
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-zion-100 bg-white px-3 py-1.5">
          <Search size={13} className="shrink-0 text-ink-soft" />
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
        {counselCases.length - successCount}건 — 예시 글의 작성자·누른 사람은 전원 가상 인물입니다
      </p>

      {list.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-[13px] text-ink-soft">해당하는 사례가 없습니다.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((c) => (
            <CaseCard key={c.id} item={c} onEdit={() => setEditing(c)} />
          ))}
        </div>
      )}

      <LegalNotice />

      {(formOpen || editing) && writable && (
        <CaseForm
          editing={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSubmit={(input) => {
            if (editing) {
              updateCounselCase(editing.id, input);
            } else {
              addCounselCase({
                ...input,
                tribe: session.tribe,
                church: session.church,
                cohort: session.cohort,
                createdBy: session.name,
                createdByRole: session.roleCode,
              });
            }
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function CaseCard({ item, onEdit }: { item: CounselCase; onEdit: () => void }) {
  const session = useSession();
  const { toggleCaseHelpful, deleteCounselCase } = useStore();
  const success = item.outcome === "success";
  // 시범 로그인은 이름이 곧 계정 — 실연동 시 서버가 user_id로 다시 판정한다
  const mine = item.createdBy === session.name && item.createdByRole === session.roleCode;
  const pressed = item.helpfulBy.includes(session.name);

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
        {/*
          「내 글」 표시 (2026-08-11 파트 B 검수 반영). 수정·삭제 단추는 **자기 글에만**
          뜨는데, 남의 글만 보고 「고칠 방법이 없다」고 읽은 의견이 올라왔다.
          기능이 있어도 왜 없는지 모르면 없는 것과 같다 — 어느 것이 내 글인지 먼저 보인다.
        */}
        {mine && (
          <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[10.5px] font-bold text-gold-700">
            내 글
          </span>
        )}
        <span className="ml-auto">
          <FavoriteButton
            targetType="case"
            targetId={item.id}
            label={item.situation.slice(0, 20)}
            size={13}
          />
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
          {item.updatedAt && " · 수정됨"}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => toggleCaseHelpful(item.id, session.name)}
            aria-pressed={pressed}
            className={
              "flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition " +
              (pressed
                ? "border-zion-500 bg-zion-50 text-zion-800"
                : "border-zion-100 text-zion-700 hover:border-zion-300 hover:bg-zion-50")
            }
          >
            <ThumbsUp size={12} /> 도움됨 {item.helpfulBy.length}
          </button>
          {mine && (
            <>
              <button
                onClick={onEdit}
                className="flex items-center gap-1 rounded-lg border border-zion-100 px-2.5 py-1 text-[11px] font-semibold text-zion-700 transition hover:border-zion-300"
              >
                <Pencil size={12} /> 수정
              </button>
              <button
                onClick={() => {
                  if (window.confirm("이 사례를 지울까요? 되돌릴 수 없습니다.")) {
                    deleteCounselCase(item.id);
                  }
                }}
                className="flex items-center gap-1 rounded-lg border border-zion-100 px-2.5 py-1 text-[11px] font-semibold text-ink-soft transition hover:border-zion-300"
              >
                <Trash2 size={12} /> 삭제
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function CaseForm({
  editing,
  onClose,
  onSubmit,
}: {
  editing: CounselCase | null;
  onClose: () => void;
  onSubmit: (input: {
    situation: string;
    approach: string;
    result: string;
    outcome: "success" | "failure";
  }) => void;
}) {
  const [situation, setSituation] = useState(editing?.situation ?? "");
  const [approach, setApproach] = useState(editing?.approach ?? "");
  const [result, setResult] = useState(editing?.result ?? "");
  const [outcome, setOutcome] = useState<"success" | "failure">(editing?.outcome ?? "success");
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
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-zion-950/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-label={editing ? "상담 사례 수정" : "상담 사례 남기기"}
      >
        <form onSubmit={submit} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
          <h2 className="mb-1 text-[16px] font-bold text-zion-900">
            {editing ? "상담 사례 수정" : "상담 사례 남기기"}
          </h2>
          {/*
            「소속」이 수강생 것인지 쓰는 사람 것인지 헷갈린다는 검수 의견을 받았다
            (2026-08-11 파트 B). **쓰는 사람 소속**이 붙는다는 것을 문장에서 밝힌다.
          */}
          <p className="mb-4 text-[12px] leading-relaxed text-ink-soft">
            <strong className="font-semibold text-zion-700">쓰는 사람(나)의 소속</strong>이 지파 ·
            교회 · 센터까지만 자동으로 붙습니다 — 수강생 소속을 적는 칸이 아닙니다. 본문에는 이름 ·
            연락처 · 분반 · 나이를 적지 않습니다.
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
              {editing ? "고치기" : "올리기"}
            </button>
          </div>
        </form>
      </div>
    </Portal>
  );
}
