import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Flag,
  Pencil,
  Plus,
  ShieldAlert,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { Accordion, type AccordionItem } from "../components/Accordion";
import { PromptBox } from "../components/PromptBox";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import {
  canEditCounselingTip,
  canModerateCounselingTips,
  canWriteCounselingTip,
} from "../lib/permissions";
import { ROLE_LABELS, type CounselingTip } from "../lib/types";
import { scanPII } from "./CounselCases";
import { PageHeader, Card } from "./common";

/**
 * 상담 도우미 — 테마별 UGC 지식베이스 (2026-08-08 지시문 §2-5 · 3단계).
 *
 * 등록·도움됨·인기순과 검수 장치(신고·숨김·고정 고지)를 **한 번에** 열었다 —
 * 등록만 먼저 열면 권한 판정 없이 글이 쌓이기 때문이다 (지시문 §2-5 검수 정책).
 *
 * - 등록: 사명자 전체(강사+전도사) · 수정/삭제: 본인 글만 · 숨김: content_admin+hq
 * - 도움됨: 계정당 1회 토글, 카운트는 누른 사람 목록 길이에서 재계산 (캐시 아님)
 * - 신고: 로그인 전체 → content_admin 검토 큐 (이 화면 상단에 관리자에게만 노출)
 * - 테마는 번호(1~12)로 저장한다 — 이름은 미확정 용어가 많아 코드 값으로 굳히지 않는다
 */

interface Theme {
  no: number;
  name: string;
  hint: string;
  /** UGC 목록 대신 특수 본문을 쓰는 테마 (⑪ 사례 링크 · ⑫ 프롬프트 생성기) */
  special?: React.ReactNode;
  /** 참고할 기존 화면 */
  related?: { to: string; label: string };
  /** 정의 미확정 용어 표시 */
  undefinedTerm?: boolean;
}

const THEMES: Theme[] = [
  {
    no: 1,
    name: "개강초",
    hint: "기수를 막 열었을 때 쓰는 상담법",
    related: { to: "/library?section=instructor", label: "밭갈이·개강 세미나 자료" },
  },
  { no: 2, name: "신앙전환", hint: "⚠️ 기존 미확정 용어 「영적전환」과 같은 것인지 확인 필요", undefinedTerm: true },
  {
    no: 3,
    name: "오픈 전 보강",
    hint: "보강 자료·편성은 분반·보강 도우미, 여기는 상담법",
    related: { to: "/library?section=instructor&tab=class_material", label: "분반·보강 자료" },
  },
  {
    no: 4,
    name: "오픈 후 보강",
    hint: "보강 자료·편성은 분반·보강 도우미, 여기는 상담법",
    related: { to: "/library?section=instructor&tab=class_material", label: "분반·보강 자료" },
  },
  { no: 5, name: "입조심 · 침 예방", hint: "⚠️ 「침」은 정의 미확정 용어", undefinedTerm: true },
  { no: 6, name: "왜곡씻기", hint: "⚠️ 정의 미확정 용어", undefinedTerm: true },
  { no: 7, name: "이면유월", hint: "⚠️ 정의 미확정 용어", undefinedTerm: true },
  { no: 8, name: "입교준비", hint: "수료를 앞둔 시점의 상담법" },
  { no: 9, name: "전도교육 · 정신교육", hint: "" },
  {
    no: 10,
    name: "성향 참고 — 에니어그램 / 기질검사",
    hint: "성향 데이터는 수강생 관리, 여기는 성향별 상담법",
    related: { to: "/enneagram", label: "에니어그램 유형별 가이드" },
  },
  { no: 11, name: "상담 사례 예시", hint: "이미 열려 있습니다 — 돌아온 경우와 놓친 경우" },
  { no: 12, name: "AI 상담 분석", hint: "상황을 고르면 외부 상담 GPT에 쓸 프롬프트를 만들어 드립니다" },
];

/** 상담법 글에 항상 붙는 고지 — 개방형 등록의 전제다 (지시문 §2-5 검수 정책) */
function DisclaimerBanner() {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-card border border-gold-500/40 bg-gold-100/60 p-3">
      <ShieldAlert size={15} className="mt-0.5 shrink-0 text-gold-700" />
      <p className="text-[12px] leading-relaxed text-ink">
        여기 올라오는 상담법은 <strong className="font-bold">사명자 개인의 경험 공유이며 공식 교리
        해설이 아닙니다.</strong> 교리 판단이 필요한 대목은 신학부에 확인하세요.
      </p>
    </div>
  );
}

export function Counseling() {
  const session = useSession();
  const { counselingTips, tipReports } = useStore();
  const moderator = canModerateCounselingTips(session);

  const items: AccordionItem[] = THEMES.map((t) => {
    const count = counselingTips.filter((tip) => tip.themeNo === t.no && !tip.hiddenAt).length;
    return {
      id: `theme-${t.no}`,
      title: `${t.no}. ${t.name}` + (count > 0 ? ` (${count})` : ""),
      hint: t.hint || undefined,
      content:
        t.no === 11 ? (
          <CasesLink />
        ) : t.no === 12 ? (
          <PromptBuilder />
        ) : (
          <TipSection theme={t} />
        ),
    };
  });

  const openReports = tipReports.filter((r) => !r.resolvedAt);

  return (
    <div>
      <PageHeader
        crumb="상담 도우미"
        title="테마별 상담법"
        desc="상황별로 어떻게 상담했는지 사명자끼리 모으는 자리입니다. 테마를 눌러 펼쳐 보세요."
      />

      <DisclaimerBanner />

      {moderator && openReports.length > 0 && <ReportQueue />}

      <Accordion items={items} defaultOpenFirst={false} />

      {/* 하단 상담 지침 — 각 테마 화면 하단에 고정 노출 (지시문 §2-5) */}
      <Card className="mt-5">
        <div className="mb-2 text-[14px] font-bold text-zion-900">상담 시 주의사항</div>
        <ul className="space-y-1.5 text-[13px] leading-relaxed text-ink">
          <li>· 수강생의 신앙·인격·심리를 <strong>확정해 판정하지 않습니다.</strong> 관찰한 사실과 해석을 나눠 적습니다</li>
          <li>· 글에 <strong>이름·연락처·분반·나이</strong>를 적지 않습니다. 소속은 지파·교회·센터(기수)까지입니다</li>
          <li>· 다른 사명자의 상담을 평가하지 않습니다. 무엇을 했고 어떻게 됐는지만 적습니다</li>
          <li>· 교리 판단이 갈리는 대목은 글로 결론 내지 말고 신학부에 확인합니다</li>
        </ul>
        <p className="mt-3 border-t border-zion-100 pt-2.5 text-[11px] text-ink-soft">
          지침 전문은 별도 「상담 지침」 문서로 링크될 예정입니다 (원문 수령 대기).
        </p>
      </Card>

      <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
        미리 실린 예시 글의 작성자는 <strong className="text-ink">전원 가상 인물</strong>입니다.
        신고된 글의 처리 기준·담당자는 정책 확정 대기 중입니다 — 지금은 콘텐츠 관리자와 총회
        신학부장이 숨김으로 우선 대응합니다.
      </p>
    </div>
  );
}

/* ── 신고 검토 큐 — content_admin · headquarters_admin에게만 보인다 ── */

function ReportQueue() {
  const session = useSession();
  const { counselingTips, tipReports, resolveTipReport, setTipHidden } = useStore();
  const open = tipReports.filter((r) => !r.resolvedAt);

  return (
    <Card className="mb-4 border-gold-500/40">
      <div className="mb-2 flex items-center gap-1.5 text-[14px] font-bold text-zion-900">
        <Flag size={15} className="text-gold-700" /> 신고 검토 큐 ({open.length}건)
      </div>
      <p className="mb-3 text-[12px] text-ink-soft">
        숨김은 삭제가 아닙니다 — 글은 남고 사명자 화면에서만 사라집니다. 해제하면 다시 보입니다.
      </p>
      <ul className="space-y-2.5">
        {open.map((r) => {
          const tip = counselingTips.find((t) => t.id === r.tipId);
          if (!tip) return null;
          return (
            <li key={r.id} className="rounded-lg border border-zion-100 bg-zion-50/50 p-3">
              <div className="text-[13px] font-semibold text-ink">
                {tip.title}
                {tip.hiddenAt && (
                  <span className="ml-1.5 rounded-full bg-zion-100 px-2 py-0.5 text-[10px] font-bold text-ink-soft">
                    숨김 상태
                  </span>
                )}
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-ink">
                신고 사유: {r.reason}
              </p>
              <div className="mt-1 text-[11px] text-ink-soft">
                {r.reporterName} ({ROLE_LABELS[r.reporterRole]}) · {r.createdAt.slice(0, 10)}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => setTipHidden(tip.id, !tip.hiddenAt, session.name)}
                  className="flex items-center gap-1 rounded-lg border border-zion-100 bg-white px-2.5 py-1 text-[11px] font-semibold text-zion-700 transition hover:border-zion-300"
                >
                  {tip.hiddenAt ? <Eye size={12} /> : <EyeOff size={12} />}
                  {tip.hiddenAt ? "숨김 해제" : "글 숨기기"}
                </button>
                <button
                  onClick={() => resolveTipReport(r.id, session.name)}
                  className="flex items-center gap-1 rounded-lg border border-zion-100 bg-white px-2.5 py-1 text-[11px] font-semibold text-zion-700 transition hover:border-zion-300"
                >
                  <CheckCircle2 size={12} /> 처리 완료
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* ── 테마 하나의 상담법 목록 + 등록 ── */

type SortKey = "popular" | "recent";

function TipSection({ theme }: { theme: Theme }) {
  const session = useSession();
  const { counselingTips } = useStore();
  const [sort, setSort] = useState<SortKey>("popular"); // 기본값 인기순 (지시문 확정)
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CounselingTip | null>(null);

  const writable = canWriteCounselingTip(session);
  const moderator = canModerateCounselingTips(session);

  const tips = useMemo(() => {
    const mine = (t: CounselingTip) => canEditCounselingTip(session, t);
    return counselingTips
      // 숨겨진 글은 관리자와 작성자 본인에게만 보인다 (본인은 무슨 일이 있었는지 알아야 한다)
      .filter((t) => t.themeNo === theme.no && (!t.hiddenAt || moderator || mine(t)))
      .sort((a, b) =>
        sort === "popular"
          ? b.helpfulBy.length - a.helpfulBy.length || b.createdAt.localeCompare(a.createdAt)
          : b.createdAt.localeCompare(a.createdAt),
      );
  }, [counselingTips, theme.no, sort, session, moderator]);

  return (
    <div>
      {theme.undefinedTerm && (
        <p className="mb-2.5 text-[12px] leading-relaxed text-ink">
          ⚠️ 이 테마 이름은 <strong>아직 정의를 받지 못한 용어</strong>입니다. 화면 이름으로만 두고
          코드 값으로 굳히지 않았습니다 — 뜻이 정해지면 이름만 고치면 됩니다.
        </p>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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
                "rounded-lg px-3 py-1 text-[12px] font-semibold transition " +
                (sort === key ? "bg-white text-zion-900 shadow-sm" : "text-zion-600 hover:text-zion-800")
              }
            >
              {label}
            </button>
          ))}
        </div>
        {writable && (
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-zion-800 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-zion-700"
          >
            <Plus size={13} /> 상담법 남기기
          </button>
        )}
      </div>

      {tips.length === 0 ? (
        <div className="text-[13px] leading-relaxed text-ink-soft">
          <p>
            아직 등록된 상담법이 없습니다.
            {writable
              ? " 겪어 본 상황이 있다면 첫 글을 남겨 주세요."
              : " 사명자(강사·전도사)가 등록할 수 있습니다."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tips.map((t) => (
            <TipCard key={t.id} tip={t} onEdit={() => setEditing(t)} />
          ))}
        </div>
      )}

      {theme.related && (
        <Link
          to={theme.related.to}
          className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-zion-700 hover:underline"
        >
          함께 보기 — {theme.related.label}
        </Link>
      )}

      {(formOpen || editing) && (
        <TipForm
          themeName={theme.name}
          themeNo={theme.no}
          editing={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/* ── 상담법 글 한 건 ── */

function TipCard({ tip, onEdit }: { tip: CounselingTip; onEdit: () => void }) {
  const session = useSession();
  const { tipReports, toggleTipHelpful, deleteCounselingTip, reportTip, setTipHidden } = useStore();
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");

  const mine = canEditCounselingTip(session, tip);
  const moderator = canModerateCounselingTips(session);
  const pressed = tip.helpfulBy.includes(session.name);
  const alreadyReported = tipReports.some(
    (r) => r.tipId === tip.id && r.reporterName === session.name && !r.resolvedAt,
  );

  return (
    <article
      className={
        "rounded-card border bg-white p-4 shadow-sm " +
        (tip.hiddenAt ? "border-zion-100 opacity-70" : "border-zion-100")
      }
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <h3 className="text-[14px] font-bold text-zion-900">{tip.title}</h3>
        {tip.hiddenAt && (
          <span className="rounded-full bg-zion-100 px-2 py-0.5 text-[10px] font-bold text-ink-soft">
            관리자 숨김 — 사명자에게 보이지 않습니다
          </span>
        )}
      </div>
      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{tip.body}</p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zion-100 pt-2.5">
        <span className="text-[11px] text-ink-soft">
          {tip.createdBy} ({ROLE_LABELS[tip.createdByRole]}) · {tip.createdAt.slice(0, 10)}
          {tip.updatedAt !== tip.createdAt && " · 수정됨"}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => toggleTipHelpful(tip.id, session.name)}
            aria-pressed={pressed}
            className={
              "flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition " +
              (pressed
                ? "border-zion-500 bg-zion-50 text-zion-800"
                : "border-zion-100 text-zion-700 hover:border-zion-300 hover:bg-zion-50")
            }
          >
            <ThumbsUp size={12} /> 도움됨 {tip.helpfulBy.length}
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
                  if (window.confirm("이 상담법을 지울까요? 되돌릴 수 없습니다.")) {
                    deleteCounselingTip(tip.id);
                  }
                }}
                className="flex items-center gap-1 rounded-lg border border-zion-100 px-2.5 py-1 text-[11px] font-semibold text-ink-soft transition hover:border-zion-300"
              >
                <Trash2 size={12} /> 삭제
              </button>
            </>
          )}
          {!mine &&
            (alreadyReported ? (
              <span className="text-[11px] text-ink-soft">신고 접수됨</span>
            ) : (
              <button
                onClick={() => setReportOpen((v) => !v)}
                className="flex items-center gap-1 rounded-lg border border-zion-100 px-2.5 py-1 text-[11px] font-semibold text-ink-soft transition hover:border-zion-300"
              >
                <Flag size={12} /> 신고
              </button>
            ))}
          {moderator && (
            <button
              onClick={() => setTipHidden(tip.id, !tip.hiddenAt, session.name)}
              className="flex items-center gap-1 rounded-lg border border-zion-100 px-2.5 py-1 text-[11px] font-semibold text-zion-700 transition hover:border-zion-300"
            >
              {tip.hiddenAt ? <Eye size={12} /> : <EyeOff size={12} />}
              {tip.hiddenAt ? "숨김 해제" : "숨기기"}
            </button>
          )}
        </div>
      </div>

      {reportOpen && !alreadyReported && (
        <form
          className="mt-2.5 rounded-lg bg-zion-50 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (reason.trim().length < 5) return;
            reportTip({
              tipId: tip.id,
              reporterName: session.name,
              reporterRole: session.roleCode,
              reason: reason.trim(),
            });
            setReportOpen(false);
            setReason("");
          }}
        >
          <label className="mb-1 block text-[12px] font-semibold text-ink">
            무엇이 문제인지 적어 주세요 — 콘텐츠 관리자가 검토합니다
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="예) 교리 해석이 공식 자료와 다릅니다 / 수강생을 짚을 수 있는 내용이 있습니다"
            className="w-full resize-y rounded-lg border border-zion-100 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500"
          />
          <div className="mt-1.5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReportOpen(false)}
              className="rounded-lg px-3 py-1 text-[12px] text-ink-soft hover:bg-white"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={reason.trim().length < 5}
              className="rounded-lg bg-zion-800 px-3 py-1 text-[12px] font-semibold text-white transition hover:bg-zion-700 disabled:cursor-not-allowed disabled:bg-zion-300"
            >
              신고하기
            </button>
          </div>
        </form>
      )}
    </article>
  );
}

/* ── 등록·수정 폼 ── */

function TipForm({
  themeName,
  themeNo,
  editing,
  onClose,
}: {
  themeName: string;
  themeNo: number;
  editing: CounselingTip | null;
  onClose: () => void;
}) {
  const session = useSession();
  const { addCounselingTip, updateCounselingTip } = useStore();
  const [title, setTitle] = useState(editing?.title ?? "");
  const [body, setBody] = useState(editing?.body ?? "");
  const [error, setError] = useState<string | null>(null);

  // 입력 중에도 걸리는 표현을 보여 준다 — 상담 사례(/cases)와 같은 1차 방어다.
  // 상담법 글에 수강생 실명이 적혀 올라올 위험은 §8 정책 대기 항목이지만,
  // 막는 쪽이 안전한 기본값이라 먼저 적용했다. 서버 연동 시 서버에서도 같은 검사를 한다.
  const hits = useMemo(() => [...new Set(scanPII(title + "\n" + body))], [title, body]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 5 || body.trim().length < 20) {
      setError("제목과 본문을 채워 주세요. 뒤에 읽는 사명자가 상황을 그려 볼 수 있을 만큼 적어 주세요.");
      return;
    }
    if (hits.length > 0) {
      setError(`개인을 짚을 수 있는 내용이 있습니다 — ${hits.join(", ")}. 지운 뒤 올려 주세요.`);
      return;
    }
    if (editing) {
      updateCounselingTip(editing.id, { title: title.trim(), body: body.trim() });
    } else {
      addCounselingTip({
        themeNo,
        title: title.trim(),
        body: body.trim(),
        createdBy: session.name,
        createdByRole: session.roleCode,
      });
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zion-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={editing ? "상담법 수정" : "상담법 남기기"}
    >
      <form onSubmit={submit} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-1 text-[16px] font-bold text-zion-900">
          {editing ? "상담법 수정" : "상담법 남기기"} — {themeName}
        </h2>
        <p className="mb-4 text-[12px] leading-relaxed text-ink-soft">
          전국의 사명자가 봅니다. 개인 경험 공유이며 공식 교리 해설이 아닙니다 — 본문에는
          이름 · 연락처 · 분반 · 나이를 적지 않습니다.
        </p>

        <div className="mb-3">
          <label className="mb-1 block text-[12px] font-semibold text-ink">제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예) 첫 주에 빠진 분은 둘째 주가 되기 전에 연락합니다"
            className="w-full rounded-lg border border-zion-100 px-3 py-2 text-[13px] outline-none focus:border-zion-500"
          />
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-[12px] font-semibold text-ink">본문</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            placeholder="어떤 상황에서, 어떻게 대화했고, 어떻게 됐는지 적어 주세요."
            className="w-full resize-y rounded-lg border border-zion-100 px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-zion-500"
          />
        </div>

        {hits.length > 0 && (
          <p className="mb-3 flex items-start gap-1.5 rounded-lg bg-gold-100/60 p-2.5 text-[12px] leading-relaxed text-ink">
            <ShieldAlert size={14} className="mt-0.5 shrink-0 text-gold-700" />
            <span>지워 주세요 — {hits.join(", ")}. 사람을 짚을 수 있는 내용은 올릴 수 없습니다.</span>
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
  );
}

/* ── ⑪ 상담 사례 링크 — 사례는 /cases의 상황·방법·결과 구조를 그대로 쓴다 ── */

function CasesLink() {
  return (
    <div className="text-[13px] leading-relaxed text-ink">
      <p>
        현장에서 겪은 일을 서로 남겨 두는 자리입니다. 잘된 경우만이 아니라 놓친 경우도 함께
        싣습니다.
      </p>
      <Link
        to="/cases"
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-zion-800 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-zion-700"
      >
        상담 사례 열기
      </Link>
    </div>
  );
}

/* ── ⑫ AI 상담 분석 — 프롬프트 생성기 ── */

const SITUATIONS = ["연속 결석", "보강 미이행", "시간대 변경 잦음", "가족 반대", "직장·학업 부담", "교리 질문이 많음"];
const STAGES = ["개강 초반", "중반 (진도 절반쯤)", "후반 (수료 앞)", "보강 중"];
const TEMPERAMENTS = ["말이 적고 관찰형", "질문이 많고 논리형", "관계 중심·감정형", "성취 지향·계획형", "잘 모르겠음"];

/**
 * 외부 상담 GPT에 붙여 넣을 프롬프트를 만든다.
 *
 * ⛔ **절대 규칙 (불변식 2 직접 적용)**: 생성되는 문장에 수강생 실명·연락처·생년월일·
 * 소속 기수 같은 식별 정보를 **자동으로 넣지 않는다.** 고르는 항목 자체가 전부 비식별
 * 속성이고, 자유 입력칸을 두지 않아 사용자가 실수로 이름을 넣을 자리도 만들지 않았다.
 */
function PromptBuilder() {
  const [situation, setSituation] = useState(SITUATIONS[0]);
  const [stage, setStage] = useState(STAGES[0]);
  const [temperament, setTemperament] = useState(TEMPERAMENTS[0]);

  const prompt = useMemo(
    () =>
      [
        "당신은 성경 교육기관의 상담 조력자입니다. 아래 상황에 놓인 수강생을 어떻게 대하면 좋을지",
        "구체적인 대화 방법을 제안해 주세요.",
        "",
        `- 진도 단계: ${stage}`,
        `- 관찰된 상황: ${situation}`,
        `- 성향(추정): ${temperament}`,
        "",
        "조건:",
        "1. 사람을 단정해 판정하지 말고, 확인이 필요한 부분은 질문 형태로 제안해 주세요.",
        "2. 먼저 확인할 것 → 대화를 여는 말 → 피해야 할 말 순서로 정리해 주세요.",
        "3. 신앙적 판단이 갈릴 수 있는 대목은 단정하지 말고 그렇게 표시해 주세요.",
      ].join("\n"),
    [situation, stage, temperament],
  );

  return (
    <div>
      <p className="mb-3 text-[13px] leading-relaxed text-ink">
        사이트가 직접 답을 만들지 않습니다. 상황을 고르면 <strong>외부 상담 GPT에 붙여 넣을 프롬프트</strong>를
        만들어 드립니다. 복사해서 GPT로 가져가 대화하세요.
      </p>

      <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-1">
        {(
          [
            ["진도 단계", stage, setStage, STAGES],
            ["관찰된 상황", situation, setSituation, SITUATIONS],
            ["성향 (추정)", temperament, setTemperament, TEMPERAMENTS],
          ] as const
        ).map(([label, value, set, options]) => (
          <label key={label} className="block">
            <span className="mb-1 block text-[12px] font-semibold text-ink">{label}</span>
            <select
              value={value}
              onChange={(e) => set(e.target.value)}
              className="w-full rounded-lg border border-zion-100 bg-white px-3 py-2 text-[13px] outline-none focus:border-zion-500"
            >
              {options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="mt-3">
        <PromptBox prompt={prompt} />
      </div>
    </div>
  );
}
