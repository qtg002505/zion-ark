import { useState } from "react";
import { Check, Copy, ExternalLink, ShieldAlert, Sparkles } from "lucide-react";

/**
 * 외부 상담 GPT에 붙여 넣을 프롬프트를 보여 주고 복사시키는 상자.
 *
 * **왜 공용 부품인가**: 상담 도우미(수강생 대상)와 사명자 심방 도우미(사명자 본인 대상)가
 * 같은 방식을 쓴다. 두 곳에서 따로 만들면 **개인정보 경고 문구가 갈린다** — 한쪽만 고쳐지고
 * 다른 쪽은 옛 문구로 남는 것이 이런 곳에서 생기는 사고다. 문구를 한 곳에 묶어 둔다.
 *
 * ⛔ 이 상자는 **표시만** 한다. 프롬프트 문자열을 만드는 쪽에서 식별 정보를 넣지 않는 것이
 * 원칙이며(불변식 2), 그래서 두 화면 모두 **자유 입력칸 없이 고르기만** 하도록 만들었다.
 */
export function PromptBox({
  prompt,
  /** GPT 주소를 아직 못 받은 동안 보여 줄 안내 */
  linkNote = "상담 GPT 링크는 주소 수령 후 연결됩니다",
}: {
  prompt: string;
  linkNote?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-zion-50 p-3 text-[12px] leading-relaxed text-ink">
        {prompt}
      </pre>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          onClick={copy}
          className="flex items-center gap-1.5 rounded-lg bg-zion-800 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-zion-700"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "복사했습니다" : "프롬프트 복사"}
        </button>
        <span className="flex items-center gap-1 text-[11px] text-ink-soft">
          <Sparkles size={12} /> {linkNote}
          <ExternalLink size={11} />
        </span>
      </div>

      <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-gold-100/60 p-2.5 text-[12px] leading-relaxed text-ink">
        <ShieldAlert size={14} className="mt-0.5 shrink-0 text-gold-700" />
        <span>
          <strong className="font-bold">개인정보를 직접 입력하지 마세요.</strong> 위 프롬프트에는
          이름·연락처·소속 같은 식별 정보가 들어가지 않습니다. GPT 대화에서도 넣지 않습니다.
        </span>
      </p>
    </div>
  );
}
