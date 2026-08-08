import { HeartPulse, Lock, Sparkles } from "lucide-react";
import { PageHeader, Card } from "./common";

/**
 * 사명자 심방 도우미 — 수강생이 아니라 **사명자 본인**이 대상이다
 * (2026-08-08 카테고리 개편 지시문 §2-7). 전부 신설이며 7단계 작업이다.
 *
 * 지금은 자리와 방침만 세운다. 번아웃 척도 문항을 임의로 지어내지 않는다 —
 * 심리 척도는 출처 있는 원본을 받아 그대로 쓴다. 지어낸 문항으로 사람의 상태를
 * 재는 것은 불변식 4(신앙·인격·심리를 확정 판정하지 않는다)에 정면으로 어긋난다.
 */
export function Care() {
  return (
    <div>
      <PageHeader
        crumb="사명자 심방 도우미"
        title="사명자 심방 도우미"
        desc="수강생을 창조하고 돌보느라 지친 강사·전도사 본인을 위한 자리입니다."
      />

      {/* 이 화면의 성격상 개인정보 방침을 가장 먼저 밝힌다 */}
      <div className="mb-4 flex items-start gap-2 rounded-card border border-zion-300 bg-zion-50 p-3.5">
        <Lock size={16} className="mt-0.5 shrink-0 text-zion-700" />
        <div className="text-[13px] leading-relaxed text-ink">
          <strong className="font-bold">사명자 본인의 심리 상태도 개인정보입니다.</strong>
          <p className="mt-1">
            자가진단 결과는 <strong>서버에 저장하지 않습니다.</strong> 화면에서 결과와 프롬프트만
            만들고 끝냅니다. 관리자도 볼 수 없고, 기록도 남지 않습니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
        <Card>
          <HeartPulse size={18} className="text-zion-700" />
          <div className="mt-2 text-[14px] font-bold text-zion-900">소진 자가진단</div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            지금 얼마나 지쳐 있는지 스스로 재어 봅니다. 결과는 이 화면에서만 보입니다.
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-ink">
            ⚠️ <strong>척도 문항 원본이 필요합니다.</strong> 심리 척도를 임의로 지어내지 않습니다 —
            출처 있는 문항을 받아 그대로 씁니다.
          </p>
        </Card>

        <Card>
          <Sparkles size={18} className="text-zion-700" />
          <div className="mt-2 text-[14px] font-bold text-zion-900">성향 기반 회복 방향</div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            에니어그램·기질 유형에 따라 무엇으로 회복되는지가 다릅니다. 유형별로 쉬는 방법을
            달리 제안합니다.
          </p>
          <p className="mt-2 text-[11px] text-ink-soft">에니어그램 자료는 이미 사이트에 있습니다.</p>
        </Card>

        <Card>
          <Sparkles size={18} className="text-zion-700" />
          <div className="mt-2 text-[14px] font-bold text-zion-900">상담 GPT 프롬프트</div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
            상담 도우미와 같은 방식입니다 — 사이트가 답을 만들지 않고, 외부 상담 GPT에 쓸
            프롬프트만 만들어 드립니다.
          </p>
          <p className="mt-2 text-[11px] text-ink-soft">GPT 주소 수령 후 연결됩니다.</p>
        </Card>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-ink-soft">
        이 카테고리는 2026-08-08 개편에서 신설됐고 마지막 단계에 만듭니다. 지금은 자리와
        개인정보 방침만 세워 두었습니다 — 방침을 먼저 정해 두어야 나중에 기능이 그 안에서 만들어집니다.
      </p>
    </div>
  );
}
