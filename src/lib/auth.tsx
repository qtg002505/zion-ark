import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { RoleCode, ScopeType, Session } from "./types";

/**
 * 시범 로그인 (리드 결정: 당분간 유지 · 실제 개인정보 투입 전 반드시 정리).
 * 세션 발급 지점은 이 파일 하나로 좁게 유지한다 — 상위 신학부 대시보드 SSO가
 * 확정되면 이 모듈만 교체한다 (CLAUDE.md §14).
 */

const SESSION_KEY = "zion_ark_session";

/**
 * 역할별 조직 범위 (2026-08-06 확정 — `docs/decisions/ORG_CHART.md` §2).
 * 전도사는 `division` → `cohort`로 바뀌었다 — 강사와 같은 범위를 본다.
 */
const ROLE_SCOPE: Record<RoleCode, ScopeType> = {
  headquarters_admin: "national",
  tribe_admin: "tribe",
  church_admin: "church",
  instructor: "cohort",
  evangelist: "cohort",
  content_admin: "national",
  security_auditor: "national",
};

interface AuthContextValue {
  session: Session | null;
  login: (name: string, roleCode: RoleCode, division: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(loadSession);

  const login = useCallback((name: string, roleCode: RoleCode, division: string | null) => {
    // 시범 조직 값 — 실제 지파·교회·기수 코드 체계 확정 전 임시
    const next: Session = {
      name,
      roleCode,
      scopeType: ROLE_SCOPE[roleCode],
      tribe: "요한",
      church: "과천교회",
      cohort: "113기",
      division: roleCode === "evangelist" ? (division ?? "1분반") : null,
      loggedInAt: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  return <AuthContext.Provider value={{ session, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth는 AuthProvider 안에서만 사용");
  return ctx;
}

/** 로그인 보장된 화면에서 사용 */
export function useSession(): Session {
  const { session } = useAuth();
  if (!session) throw new Error("세션 없음 — 라우터 가드 누락");
  return session;
}
