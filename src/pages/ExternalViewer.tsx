import { useEffect, useRef, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { ExternalLink, RotateCw, TriangleAlert } from "lucide-react";
import { findExternal } from "../content/external-links";
import { PageHeader, Card } from "./common";

/**
 * 외부 자료 뷰어 — 말씀광장·천지일보를 사이트 안에서 연다.
 * 상대 사이트가 임베드를 막으면 화면이 비므로, 로드 신호를 못 받으면 안내로 바꾼다.
 */
export function ExternalViewer() {
  const { sourceId } = useParams();
  const source = findExternal(sourceId);

  const [loaded, setLoaded] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setLoaded(false);
    setBlocked(false);
    // 임베드가 막히면 로드 신호가 오지 않는다 — 일정 시간 뒤 안내로 전환
    timer.current = window.setTimeout(() => setBlocked((b) => (b ? b : true)), 8000);
    return () => window.clearTimeout(timer.current);
  }, [sourceId, reloadKey]);

  function onFrameLoad() {
    window.clearTimeout(timer.current);
    setLoaded(true);
    setBlocked(false);
  }

  if (!source) return <Navigate to="/" replace />;

  const showNotice = blocked && !loaded;

  return (
    <div>
      <PageHeader
        crumb={source.group}
        title={source.label}
        desc={source.desc}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="flex items-center gap-1.5 rounded-lg border border-zion-100 bg-white px-3 py-2 text-[13px] font-semibold text-zion-700 transition hover:bg-zion-50"
            >
              <RotateCw size={14} /> 새로고침
            </button>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg bg-zion-800 px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-zion-700"
            >
              <ExternalLink size={14} /> 새 탭
            </a>
          </div>
        }
      />

      <Card className="!p-0 overflow-hidden">
        {showNotice ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <TriangleAlert size={30} className="text-gold-600" />
            <p className="mt-4 text-[15px] font-semibold text-zion-900">
              이 자료는 사이트 안에서 열 수 없습니다
            </p>
            <p className="mt-1 max-w-md text-[13px] leading-relaxed text-ink-soft">
              {source.group} 쪽에서 다른 사이트에 표시되는 것을 제한하고 있습니다. 새 탭으로 열면
              평소대로 볼 수 있습니다.
            </p>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-1.5 rounded-lg bg-zion-800 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-zion-700"
            >
              <ExternalLink size={14} /> {source.label} 새 탭으로 열기
            </a>
          </div>
        ) : (
          <div className="relative">
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-white">
                <span className="text-[13px] text-ink-soft">{source.label} 불러오는 중…</span>
              </div>
            )}
            <iframe
              key={reloadKey}
              src={source.url}
              title={`${source.group} ${source.label}`}
              onLoad={onFrameLoad}
              referrerPolicy="no-referrer-when-downgrade"
              className="h-[calc(100vh-260px)] min-h-[520px] w-full border-0"
            />
          </div>
        )}
      </Card>

      <p className="mt-2 text-[11px] text-ink-soft">
        {source.group}에서 제공하는 자료를 그대로 보여 줍니다. 내용은 해당 매체에 있습니다.
      </p>
    </div>
  );
}
