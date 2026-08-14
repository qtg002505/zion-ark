import { useSearchParams } from "react-router-dom";
import {
  GYOBUNGI_FOLDERS,
  INSTRUCTOR_BATGARI_FOLDERS,
  INSTRUCTOR_EARLY_FOLDERS,
  INSTRUCTOR_OTHER_FOLDERS,
  MATERIAL_LEVELS,
  type MaterialLevel,
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
 * **2026-08-14 피드백 반영 둘:**
 * - FB-05 — 「우수 교안·특강」('지침' 제거)이 `level`을 달고 와 **그 단계 자료만** 보인다
 * - FB-06 — 교분기 폴더 셋(초·중·고). 총회 표준본 + 지파 보충본 2계층은 `FolderLibrary`가
 *   `scope` 필드로 가른다 (Q-03 리드 확정)
 *
 * 몸통은 `FolderLibrary` 하나를 자료실과 나눠 쓴다 — 화면을 복제하면 등록 폼이나 우수 교안
 * 지정이 한쪽만 고쳐진다.
 */
export function TeachingLibrary() {
  const [params, setParams] = useSearchParams();

  const raw = params.get("folder");
  // 강의 도우미가 품지 않는 폴더 이름이 오면 전체로 되돌린다 (옛 링크·오타)
  const folder = raw && INSTRUCTOR_EARLY_FOLDERS.includes(raw) ? raw : null;
  // 초·중·고의 「우수 교안·특강」이 이 값을 달고 온다 — 폴더에 매이지 않고 전부에서 고른다
  const featuredOnly = params.get("tab") === "excellent_plan";
  // FB-05② — 단계 파라미터. 목록에 없는 값(오타·옛 링크)은 전체로 취급한다
  const rawLevel = params.get("level") as MaterialLevel | null;
  const level = rawLevel && MATERIAL_LEVELS.includes(rawLevel) ? rawLevel : null;

  const inBatgari = folder !== null && INSTRUCTOR_BATGARI_FOLDERS.includes(folder);
  const inGyobungi = folder !== null && GYOBUNGI_FOLDERS.includes(folder);

  return (
    <FolderLibrary
      crumb={inBatgari ? "강의 도우미 · 밭갈이" : inGyobungi ? "강의 도우미 · 교분기" : "강의 도우미"}
      title={featuredOnly ? `우수 교안 · 특강${level ? ` (${level})` : ""}` : (folder ?? "강의 자료 전체")}
      desc={
        featuredOnly
          ? `${level ? `${level} 단계의 ` : ""}우수 교안과 특강 자료입니다. 단계 표시가 없는 자료는 공통으로 모든 단계에 보입니다.`
          : inGyobungi
            ? "총회 표준본이 위에 고정되고, 그 아래 우리 지파의 보충 자료가 이어집니다. 다른 지파의 보충 자료는 보이지 않습니다."
            : inBatgari
              ? "이 파트에서 쓰는 자료입니다. 교안 · PPT · 영상이 자료 하나 안에서 함께 열립니다."
              : folder === INSTRUCTOR_OTHER_FOLDERS[0]
                ? "예배설교 자료입니다. 교안 · PPT · 영상이 자료 하나 안에서 함께 열립니다."
                : "밭갈이 네 파트와 예배설교 · 교분기 자료입니다. 파트는 왼쪽 메뉴에서 고릅니다."
      }
      folders={INSTRUCTOR_EARLY_FOLDERS}
      folder={folder}
      onSelectFolder={(next) => setParams(next ? { folder: next } : {})}
      categoryFilter={featuredOnly ? "excellent_plan" : null}
      levelFilter={featuredOnly ? level : null}
      openId={params.get("open")}
      emptyNote={
        inGyobungi
          ? "등록된 교분기 자료가 없습니다. 표준본은 콘텐츠 관리자·총회 신학부장이, 지파 보충본은 지파 신학부장이 올립니다."
          : "이 파트에 등록된 자료가 없습니다. 원본을 받으면 여기에 올립니다."
      }
    />
  );
}
