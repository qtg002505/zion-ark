import { Star } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import type { FavoriteTarget } from "../lib/types";

/**
 * 즐겨찾기 별표 — 누르면 마이페이지(`/my`)에 모인다 (지시문 §4-2).
 *
 * 저장하는 것은 **(사용자, 종류, 식별자)** 뿐이다. 제목을 함께 담지 않는 이유는
 * 마이페이지에서 그릴 때 그 시점의 자료에서 다시 찾기 위해서다 — 자료가 지워지거나
 * 담당 범위를 벗어나면 이름이 자동으로 사라진다.
 */
export function FavoriteButton({
  targetType,
  targetId,
  label,
  size = 14,
}: {
  targetType: FavoriteTarget;
  targetId: string;
  /** 보조기술이 읽을 대상 이름 — 저장되지 않고 화면 설명에만 쓰인다 */
  label: string;
  size?: number;
}) {
  const session = useSession();
  const { favorites, toggleFavorite } = useStore();

  const on = favorites.some(
    (f) => f.userName === session.name && f.targetType === targetType && f.targetId === targetId,
  );

  return (
    <button
      onClick={(e) => {
        // 카드 전체가 눌리는 자리에 놓이므로 부모로 클릭이 번지지 않게 막는다
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(session.name, targetType, targetId);
      }}
      aria-pressed={on}
      aria-label={on ? `${label} 즐겨찾기 해제` : `${label} 즐겨찾기`}
      title={on ? "즐겨찾기 해제" : "즐겨찾기"}
      className={
        "shrink-0 rounded p-1 transition " +
        (on ? "text-gold-600 hover:bg-gold-100/60" : "text-zion-300 hover:bg-zion-50 hover:text-gold-600")
      }
    >
      <Star size={size} className={on ? "fill-gold-500 text-gold-500" : ""} />
    </button>
  );
}
