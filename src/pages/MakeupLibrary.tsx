import { useSearchParams } from "react-router-dom";
import {
  EVANGELIST_ALL_FOLDERS,
  EVANGELIST_CONTENT_FOLDERS,
  EVANGELIST_MAKEUP_FOLDERS,
  LIBRARY_CATEGORY_LABELS,
  folderLabel,
} from "../lib/types";
import { FolderLibrary } from "../components/FolderLibrary";

/**
 * 분반 · 보강 도우미 자료 — **보강 자료와 보강 콘텐츠를 제 카테고리 안에서 연다**
 * (2026-08-18).
 *
 * 강의 도우미는 2026-08-13에 자료를 안에서 열게 됐는데(`/teaching`) 보강 쪽만 자료실
 * (`/library`)로 나가 있었다. 같은 성격의 자료인데 한쪽은 안에서 열리고 한쪽은 밖으로
 * 나가니 동선이 어긋났다 — 강의 도우미 때와 **같은 이유로 같은 방식**으로 고쳤다.
 *
 * 몸통은 `FolderLibrary` 한 벌을 자료실 · 강의 도우미와 나눠 쓴다. 화면을 복제하면
 * 등록 폼이나 추천·조회수 셈이 한쪽만 고쳐진다.
 *
 * ⚠️ **자료실에서도 여전히 보인다.** 자료실은 「전체 보기」를 겸하고, 폴더 목록
 * (`LIBRARY_FOLDERS`)에 보강 폴더가 그대로 들어 있다 — 강의 도우미 폴더와 같은 취급이다.
 * 여기는 **동선을 보강 쪽으로 모으는** 화면이지 자료를 옮기는 것이 아니다.
 */
export function MakeupLibrary() {
  const [params, setParams] = useSearchParams();

  const raw = params.get("folder");
  // 분반·보강이 품지 않는 폴더 이름이 오면 전체로 되돌린다 (옛 링크·오타)
  const folder = raw && EVANGELIST_ALL_FOLDERS.includes(raw) ? raw : null;
  /** 「분반 자료」는 폴더가 아니라 **분류**다 — 폴더에 매이지 않고 전부에서 고른다 */
  const classOnly = params.get("tab") === "class_material";

  const inMakeup = folder !== null && EVANGELIST_MAKEUP_FOLDERS.includes(folder);
  const inContent = folder !== null && EVANGELIST_CONTENT_FOLDERS.includes(folder);

  return (
    <FolderLibrary
      crumb={
        inMakeup
          ? "분반 · 보강 도우미 · 보강 자료"
          : inContent
            ? "분반 · 보강 도우미 · 보강 콘텐츠"
            : "분반 · 보강 도우미"
      }
      /* ⚠️ 폴더 이름은 저장값 그대로 쓰고 화면에는 `folderLabel`을 거쳐 낸다 */
      title={
        classOnly
          ? LIBRARY_CATEGORY_LABELS.class_material
          : folder
            ? folderLabel(folder)
            : "분반 · 보강 자료 전체"
      }
      desc={
        classOnly
          ? "분반 편성과 보강 운영에 쓰는 자료입니다. 폴더에 매이지 않고 전부에서 고릅니다."
          : inContent
            ? "보강 때 함께 보는 자료입니다. 교안 · PPT · 영상이 자료 하나 안에서 함께 열립니다."
            : inMakeup
              ? "이 보강 파트에서 쓰는 자료입니다. 교안 · PPT · 영상이 자료 하나 안에서 함께 열립니다."
              : "보강 자료 일곱 파트와 보강 콘텐츠 자료입니다. 파트는 왼쪽 메뉴에서 고릅니다."
      }
      folders={EVANGELIST_ALL_FOLDERS}
      folder={folder}
      onSelectFolder={(next) => setParams(next ? { folder: next } : {})}
      categoryFilter={classOnly ? "class_material" : null}
      openId={params.get("open")}
      emptyNote="이 파트에 등록된 자료가 없습니다. 원본을 받으면 여기에 올립니다."
    />
  );
}
