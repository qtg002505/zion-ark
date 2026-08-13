import { useSearchParams } from "react-router-dom";
import {
  INSTRUCTOR_BATGARI_FOLDERS,
  INSTRUCTOR_EARLY_FOLDERS,
  INSTRUCTOR_OTHER_FOLDERS,
} from "../lib/types";
import { FolderLibrary } from "../components/FolderLibrary";

/**
 * 강의 도우미 자료 — **밭갈이 각 파트와 예배설교가 저마다 자료실 노릇을 한다**
 * (2026-08-13 리드 지시).
 *
 * 종전에는 파트를 누르면 자료실(`/library`)로 나갔다. 초·중·고는 자기 카테고리 안에서
 * 자료를 여는데 밭갈이·예배설교만 밖으로 나가 동선이 어긋나 있었다. 이제 **강의 도우미
 * 안에서** 그 파트의 자료를 바로 연다.
 *
 * 몸통은 `FolderLibrary` 하나를 자료실과 나눠 쓴다 — 화면을 복제하면 등록 폼이나 우수 교안
 * 지정이 한쪽만 고쳐진다.
 */
export function TeachingLibrary() {
  const [params, setParams] = useSearchParams();

  const raw = params.get("folder");
  // 강의 도우미가 품지 않는 폴더 이름이 오면 전체로 되돌린다 (옛 링크·오타)
  const folder = raw && INSTRUCTOR_EARLY_FOLDERS.includes(raw) ? raw : null;
  // 초·중·고의 「우수교안·지침·특강」이 이 값을 달고 온다 — 폴더에 매이지 않고 전부에서 고른다
  const featuredOnly = params.get("tab") === "excellent_plan";

  const inBatgari = folder !== null && INSTRUCTOR_BATGARI_FOLDERS.includes(folder);

  return (
    <FolderLibrary
      crumb={inBatgari ? "강의 도우미 · 밭갈이" : "강의 도우미"}
      title={featuredOnly ? "우수교안 · 지침 · 특강" : (folder ?? "강의 자료 전체")}
      desc={
        featuredOnly
          ? "총회 신학부장이 지정한 우수 교안과 지침·특강 자료입니다."
          : inBatgari
            ? "이 파트에서 쓰는 자료입니다. 교안 · PPT · 영상이 자료 하나 안에서 함께 열립니다."
            : folder === INSTRUCTOR_OTHER_FOLDERS[0]
              ? "예배설교 자료입니다. 교안 · PPT · 영상이 자료 하나 안에서 함께 열립니다."
              : "밭갈이 네 파트와 예배설교 자료입니다. 파트는 왼쪽 메뉴에서 고릅니다."
      }
      folders={INSTRUCTOR_EARLY_FOLDERS}
      folder={folder}
      onSelectFolder={(next) => setParams(next ? { folder: next } : {})}
      categoryFilter={featuredOnly ? "excellent_plan" : null}
      emptyNote="이 파트에 등록된 자료가 없습니다. 원본을 받으면 여기에 올립니다."
    />
  );
}
