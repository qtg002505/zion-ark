import { Moon, MonitorSmartphone, Sun } from "lucide-react";
import { useTheme, type ThemePref } from "../lib/theme";

/**
 * 밝게/어둡게 전환 (2026-08-11).
 *
 * 헤더에는 **누르면 바로 뒤집히는 단추** 하나만 둔다 — 좁은 화면에서 헤더에 이미
 * 메뉴·검색·음악·마이페이지가 들어 있어 고르는 칸을 놓을 자리가 없다.
 * 세 갈래(기기 설정 포함)는 마이페이지의 `ThemeChoice`에서 고른다.
 */
export function ThemeToggle() {
  const { isDark, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "밝은 화면으로" : "어두운 화면으로"}
      title={isDark ? "밝은 화면으로 바꿉니다" : "어두운 화면으로 바꿉니다"}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zion-100 bg-white text-zion-700 shadow-sm transition hover:bg-zion-50"
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

const CHOICES: { value: ThemePref; label: string; icon: typeof Sun; desc: string }[] = [
  { value: "system", label: "기기 설정", icon: MonitorSmartphone, desc: "휴대전화·PC 설정을 따릅니다" },
  { value: "light", label: "밝게", icon: Sun, desc: "언제나 밝은 화면" },
  { value: "dark", label: "어둡게", icon: Moon, desc: "언제나 어두운 화면" },
];

/**
 * 마이페이지에 두는 세 갈래 선택. **고른 값은 이 브라우저에만 남는다** —
 * 계정에 붙이는 것은 백엔드 연동 뒤의 일이다.
 */
export function ThemeChoice() {
  const { pref, isDark, setTheme } = useTheme();
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {CHOICES.map((c) => {
          const on = pref === c.value;
          const Icon = c.icon;
          return (
            <button
              key={c.value}
              onClick={() => setTheme(c.value)}
              aria-pressed={on}
              title={c.desc}
              className={
                "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] font-semibold transition " +
                (on
                  ? "border-zion-700 bg-zion-700 text-white"
                  : "border-zion-200 bg-white text-zion-700 hover:bg-zion-50")
              }
            >
              <Icon size={14} /> {c.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
        {pref === "system"
          ? `지금 기기 설정은 ${isDark ? "어둡게" : "밝게"}입니다.`
          : "기기 설정과 상관없이 이 사이트만 고정합니다."}{" "}
        이 브라우저에만 저장됩니다.
      </p>
    </div>
  );
}
