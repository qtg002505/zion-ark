import { buildXlsx, downloadBlob } from "../lib/xlsx";

/**
 * 진도표 **양식 내려받기** 단독 부품.
 *
 * ⚠️ **「진도표 올리기」(엑셀 자동 반영)는 2026-08-22 리드 지시로 뺐다** — 서식 불일치로
 * 잘못 반영되는 문제 때문에 수기 기입만 쓴다. 되살릴 때는 git 이력에서 꺼낸다
 * (`onFile`·`KIND_BY_LABEL`·`normalizeDate`와 store의 `replaceUploadedPlanEntries` 호출).
 * `fromUpload` 필드·「파일」 배지·store의 `replaceUploadedPlanEntries`는 이미 저장된 항목
 * 호환을 위해 남긴다(불변식 10).
 *
 * ⚠️ **두 화면이 같은 부품을 쓴다** (2026-08-21): 월간·주간 계획과 기수 세팅.
 * 복제하면 양식이 갈라지고 한쪽만 고쳐진다.
 */
export function ProgressUpload() {
  /** 공통 양식 — 수기 기입의 기준 서식으로 남긴다 (열 이름·순서가 달력 항목과 짝이다) */
  function downloadTemplate() {
    const rows = [
      ["날짜", "구분", "회차", "내용"],
      ["2026-08-11", "진도", "60", "예) 비유한 짐승과 머리"],
      ["2026-08-13", "보강", "", "예) 목요일 저녁 보강"],
      ["2026-08-14", "상담", "", "예) 오전 상담 2건"],
      ["2026-08-16", "심방", "", "예) 오후 심방"],
      ["2026-08-17", "행사", "", "예) 새신자 교육"],
    ];
    downloadBlob(buildXlsx(rows, "진도표"), "진도표_양식.xlsx");
  }

  return (
    <button
      onClick={downloadTemplate}
      className="rounded-lg border border-zion-200 px-3 py-2 text-[12px] font-semibold text-zion-700 transition hover:bg-zion-50"
    >
      양식 내려받기
    </button>
  );
}
