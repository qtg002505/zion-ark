import { useState } from "react";
import { useAuth } from "../lib/auth";
import { ROLE_LABELS, type RoleCode } from "../lib/types";
import { DIVISIONS } from "../content/cohort-mock";
import { ZionLogo } from "../shell/ZionLogo";

const ROLE_ORDER: RoleCode[] = [
  "instructor",
  "evangelist",
  "headquarters_admin",
  "tribe_admin",
  "church_admin",
  "content_admin",
  "security_auditor",
];

/**
 * 시범 로그인 — 리드 결정: 당분간 유지, 실제 개인정보 투입 전 반드시 정리.
 * 운영 전환 시 휴대전화 인증(SMS) 또는 상위 대시보드 SSO로 교체한다.
 */
export function Login() {
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [role, setRole] = useState<RoleCode>("instructor");
  const [division, setDivision] = useState(DIVISIONS[0]);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("이름을 두 글자 이상 입력해 주세요.");
      return;
    }
    login(trimmed, role, role === "evangelist" ? division : null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md animate-slide-in-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <ZionLogo size={56} />
          <h1 className="mt-4 text-[26px] font-bold text-ink">시온 아크</h1>
          <p className="mt-1 text-[13px] text-ink-soft">
            만국 소성 플랫폼 — 강사·전도사 AI 운영 대시보드
          </p>
        </div>

        <form onSubmit={submit} className="rounded-card border border-zion-100 bg-white p-6 shadow-lg">
          <div className="mb-1 text-[15px] font-bold text-zion-900">시범 로그인</div>
          <p className="mb-4 text-[12px] text-ink-soft">
            역할별 화면·권한을 확인하는 시범 모드입니다. 운영 전환 시 휴대전화
            인증으로 교체됩니다.
          </p>

          <label className="mb-1 block text-[12px] font-semibold text-ink" htmlFor="login-name">
            이름
          </label>
          <input
            id="login-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 김사명"
            className="mb-4 w-full rounded-lg border border-zion-100 px-3 py-2 text-[14px] outline-none focus:border-zion-500"
          />

          <label className="mb-1 block text-[12px] font-semibold text-ink" htmlFor="login-role">
            역할
          </label>
          <select
            id="login-role"
            value={role}
            onChange={(e) => setRole(e.target.value as RoleCode)}
            className="mb-4 w-full rounded-lg border border-zion-100 bg-white px-3 py-2 text-[14px] outline-none focus:border-zion-500"
          >
            {ROLE_ORDER.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>

          {role === "evangelist" && (
            <>
              <label className="mb-1 block text-[12px] font-semibold text-ink" htmlFor="login-division">
                담당 분반 (표시용 — 조회 범위는 담당 기수 전체입니다)
              </label>
              <select
                id="login-division"
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="mb-4 w-full rounded-lg border border-zion-100 bg-white px-3 py-2 text-[14px] outline-none focus:border-zion-500"
              >
                {DIVISIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </>
          )}

          {error && <p className="mb-3 text-[12px] text-red-600">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-zion-800 py-2.5 text-[14px] font-semibold text-white transition hover:bg-zion-700"
          >
            로그인
          </button>

          <p className="mt-4 text-center text-[11px] text-ink-soft">
            시범 조직: 요한 지파 · 과천교회 · 113기 (목업 데이터 — 실제 개인정보 아님)
          </p>
        </form>
      </div>
    </div>
  );
}
