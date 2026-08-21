import { useSearchParams } from "react-router-dom";
import { Download } from "lucide-react";
import {
  ARCHIVE_FOLDERS,
  MEDIA_FOLDERS,
  LIBRARY_CATEGORY_LABELS,
  LIBRARY_FOLDERS,
  type LibraryCategory,
} from "../lib/types";
import { ExternalMediaLink, FolderLibrary } from "../components/FolderLibrary";

/** 종전 링크(`?tab=…`)가 넘겨 오는 분류 — 북마크가 죽지 않게 계속 받는다 */
function categoryOf(tab: string | null): LibraryCategory | null {
  return tab === "excellent_plan" || tab === "class_material" || tab === "standard_lecture" ? tab : null;
}

/**
 * 자료실 — **독립 대메뉴**이고 **폴더 한 줄기**다 (2026-08-13 리드 지시로 구획 폐지).
 *
 * 종전에는 「강사 도우미 자료실」·「외부 자료실」 두 구획으로 갈렸다. 그런데 리드 확인 결과
 * **「외부 자료실」이라는 것은 없었다** — 외부 매체(비메오·위플)는 자료에 붙는 **참고 링크**를
 * 뜻한 것이지 자료의 보관 구획이 아니다. 그래서 구획 탭을 걷어내고 폴더만 남겼다.
 *
 * 지금 자료실이 맡는 것은 **아카이브**(실상 뮤지컬 영상 · 계시록 삽화 — 여기서 내려받아
 * 확인한다)와 **말씀광장 · 천지일보** 바로가기다. 실무 교육 자료는 강의 도우미(`/teaching`)와
 * 분반·보강 도우미가 가져갔다.
 *
 * ⚠️ 여기 있는 자료도 **로그인해야 열린다.** 무세션 401 원칙에 예외를 만들지 않는다.
 */
export function Library() {
  const [params, setParams] = useSearchParams();

  const folder = params.get("folder");
  // 종전 링크(?tab=… · ?section=…)도 계속 동작하게 둔다 — 북마크가 죽지 않게
  const category = categoryOf(params.get("tab"));
  const isArchive = folder !== null && ARCHIVE_FOLDERS.includes(folder);
  /* 활용 미디어 (2026-08-21) — 현장 송출용. 아카이브(장기 보관)와 안내 문구가 다르다 */
  const isMedia = folder !== null && MEDIA_FOLDERS.includes(folder);

  return (
    <FolderLibrary
      crumb="자료실"
      title={category ? LIBRARY_CATEGORY_LABELS[category] : (folder ?? "자료실 전체")}
      desc={
        isArchive
          ? "장기 보관 자료입니다. 파일을 내려받아 확인합니다."
          : isMedia
            ? "센터 현장에서 바로 쓰는 자료입니다. 내려받아 강의·예배에서 송출합니다."
            : category
              ? "분류로 모아 본 자료입니다. 폴더에 매이지 않고 전부에서 고릅니다."
              : "폴더는 왼쪽 메뉴에서 고릅니다. 강의·보강 자료는 각 도우미 안에서 엽니다."
      }
      folders={LIBRARY_FOLDERS}
      folder={folder}
      onSelectFolder={(next) => setParams(next ? { folder: next } : {})}
      /* 마이페이지의 「팔로우한 강사」가 `?q=이름`으로 넘어온다 (2026-08-15) */
      initialQuery={params.get("q")}
      scopeAll
      categoryFilter={category}
      openId={params.get("open")}
      emptyNote={
        isArchive
          ? "아직 올라온 파일이 없습니다. 원본이 등록되면 여기서 내려받습니다."
          : isMedia
            ? "아직 올라온 자료가 없습니다. 이미지·영상·음원 원본이 취합되면 여기서 내려받습니다."
            : undefined
      }
    >
      {isArchive && (
        <p className="mb-4 flex items-start gap-1.5 rounded-lg bg-zion-50 p-2.5 text-[12px] leading-relaxed text-ink">
          <Download size={14} className="mt-0.5 shrink-0 text-zion-600" />
          <span>
            <strong className="font-bold">{folder}</strong>은(는) 여기서 내려받아 확인합니다. 자료를 열면
            내려받기 링크가 나옵니다.
          </span>
        </p>
      )}

      {/*
        말씀광장 · 천지일보는 **자료실 안에** 두되 새 탭으로 연다 (2026-08-13 리드 확인).
        두 매체가 `X-Frame-Options`로 사이트 안 표시를 막아 두어 iframe이 불가능하다 —
        백엔드 프록시가 생기면 그때 내부 표시로 바꾼다.
      */}
      {!folder && !category && (
        <div className="mb-4">
          <div className="mb-1.5 text-[12px] font-semibold text-ink">외부 매체 바로가기</div>
          <div className="flex flex-wrap gap-2">
            <ExternalMediaLink label="말씀광장 · 온라인 성경" href="https://www.wordsquare.org/bible-forest/bible" note="새 탭" />
            <ExternalMediaLink label="말씀광장 · 성경사전" href="https://www.wordsquare.org/bible-forest/dictionary" note="새 탭" />
            <ExternalMediaLink label="천지일보 · 최근 이슈" href="https://www.newscj.com/" note="새 탭" />
          </div>
        </div>
      )}
    </FolderLibrary>
  );
}
