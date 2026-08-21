import { useState } from "react";
import { Upload } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { buildXlsx, downloadBlob, readXlsx } from "../lib/xlsx";
import type { PlanEntryKind } from "../lib/types";

/**
 * 진도표 업로드 — **한 파일로 주간계획과 진도표를 함께 채운다** (2026-08-10 리드 지시로 엑셀).
 *
 * ⚠️ **두 화면이 같은 부품을 쓴다** (2026-08-21): 월간·주간 계획과 기수 세팅.
 * 종전에는 `WeeklyPlanPage` 안에 있었는데, 기수 세팅에도 같은 자리가 생기면서 밖으로 뺐다 —
 * 복제하면 양식이 갈라지고 한쪽만 고쳐진다.
 *
 * ⚠️ **한 줄이 어긋나도 통째로 실패시키지 않는다** — 그 줄만 건너뛰고 몇 줄인지 알린다.
 * 사람이 엑셀에서 손댄 파일이 들어오기 때문이다.
 */
export function ProgressUpload({
  cohortKey,
  readOnly,
}: {
  cohortKey: string;
  /** 종료된 기수 — 양식만 내려받고 올리지는 못한다 (2026-08-21 리드 지시) */
  readOnly?: boolean;
}) {
  const session = useSession();
  const { replaceUploadedPlanEntries } = useStore();
  const [msg, setMsg] = useState<string | null>(null);

  /** 공통 양식 — 이 열 이름·순서 그대로 쓰면 그대로 읽힌다 */
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

  const KIND_BY_LABEL: Record<string, PlanEntryKind> = {
    진도: "progress",
    보강: "makeup",
    상담: "counsel",
    심방: "visit",
    행사: "event",
    메모: "note",
  };

  /**
   * 날짜 칸 읽기 — 사람이 엑셀에서 손대면 `2026-08-11` 말고 `2026. 8. 11` 처럼
   * 적히기도 한다. 흔한 형태는 받아 준다. 그래도 못 읽으면 그 줄만 건너뛴다.
   */
  function normalizeDate(raw: string): string | null {
    const s = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = /^(\d{4})[.\-/\s]+(\d{1,2})[.\-/\s]+(\d{1,2})\.?$/.exec(s);
    if (!m) return null;
    return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg("읽는 중…");

    let table: string[][];
    try {
      table = file.name.toLowerCase().endsWith(".csv")
        ? (await file.text())
            .replace(/^﻿/, "")
            .split(/\r?\n/)
            .filter((l) => l.trim())
            .map((l) => l.split(",").map((c) => c.trim()))
        : await readXlsx(file);
    } catch {
      setMsg("파일을 읽지 못했습니다. 양식을 내려받아 그대로 채운 뒤 다시 올려 주세요.");
      e.target.value = "";
      return;
    }

    const rows: { date: string; kind: PlanEntryKind; title: string; session: number | null }[] = [];
    let skipped = 0;

    for (const [i, cols] of table.entries()) {
      if (i === 0 && (cols[0] ?? "").includes("날짜")) continue; // 머리글
      const date = normalizeDate(cols[0] ?? "");
      const title = (cols[3] ?? "").trim();
      // 한 줄이 어긋나도 통째로 실패시키지 않는다 — 그 줄만 건너뛰고 몇 줄인지 알린다
      if (!date || !title) {
        if ((cols[0] ?? "").trim() || title) skipped++;
        continue;
      }
      const sessionNo = (cols[2] ?? "").trim();
      rows.push({
        date,
        kind: KIND_BY_LABEL[(cols[1] ?? "").trim()] ?? "note",
        title,
        session: /^\d+$/.test(sessionNo) ? Number(sessionNo) : null,
      });
    }

    if (rows.length === 0) {
      setMsg("읽을 수 있는 줄이 없습니다. 양식을 내려받아 열 순서(날짜·구분·회차·내용)를 맞춰 주세요.");
      e.target.value = "";
      return;
    }
    replaceUploadedPlanEntries(cohortKey, rows, session.name, session.roleCode);
    setMsg(
      `${rows.length}건을 달력에 반영했습니다.${skipped > 0 ? ` (읽지 못한 ${skipped}줄은 건너뛰었습니다)` : ""}`,
    );
    e.target.value = "";
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={downloadTemplate}
          className="rounded-lg border border-zion-200 px-3 py-2 text-[12px] font-semibold text-zion-700 transition hover:bg-zion-50"
        >
          양식 내려받기
        </button>
        {!readOnly && (
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-zion-800 px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-zion-700">
            <Upload size={14} /> 진도표 올리기
            {/* 엑셀이 기본이고 CSV도 받는다 — 이미 CSV로 만들어 둔 것이 있을 수 있다 */}
            <input
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              onChange={onFile}
              className="hidden"
            />
          </label>
        )}
      </div>
      {msg && (
        <span className="max-w-[280px] text-right text-[11px] leading-relaxed text-ink-soft">{msg}</span>
      )}
    </div>
  );
}
