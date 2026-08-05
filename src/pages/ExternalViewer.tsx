import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ExternalLink, RotateCw, ShieldAlert } from "lucide-react";
import { EXTERNAL_SOURCES, findExternal } from "../content/external-links";
import { PageHeader, Card } from "./common";

/**
 * 외부 자료 화면 — 말씀광장·천지일보.
 *
 * 두 사이트가 다른 사이트 안에서의 표시를 막고 있어(X-Frame-Options) 본문을 그대로
 * 띄울 수 없다. 그래서 사이트 안에서는 자료를 안내하고 새 탭으로 넘긴다.
 * `embeddable`이 켜지면(백엔드 프록시 등) 같은 화면에서 바로 띄운다.
 */
export function ExternalViewer() {
  const { sourceId } = useParams();
  const source = findExternal(sourceId);

  const [loaded, setLoaded] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!source?.embeddable) return;
    setLoaded(false);
    setBlocked(false);
    timer.current = window.setTimeout(() => setBlocked(true), 8000);
    return () => window.clearTimeout(timer.current);
  }, [sourceId, reloadKey, source?.embeddable]);

  if (!source) return <Navigate to="/" replace />;

  const siblings = EXTERNAL_SOURCES.filter((s) => s.group === source.group && s.id !== source.id);

  const openButton = (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 rounded-lg bg-zion-800 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-zion-700"
    >
      <ExternalLink size={14} /> 새 탭으로 열기
    </a>
  );

  return (
    <div>
      <PageHeader
        crumb={source.group}
        title={source.label}
        desc={source.desc}
        action={
          source.embeddable ? (
            <div className="flex gap-2">
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                className="flex items-center gap-1.5 rounded-lg border border-zion-100 bg-white px-3 py-2 text-[13px] font-semibold text-zion-700 transition hover:bg-zion-50"
              >
                <RotateCw size={14} /> 새로고침
              </button>
              {openButton}
            </div>
          ) : (
            openButton
          )
        }
      />

      {source.embeddable ? (
        <Card className="!p-0 overflow-hidden">
          <div className="relative">
            {!loaded && !blocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-white">
                <span className="text-[13px] text-ink-soft">{source.label} 불러오는 중…</span>
              </div>
            )}
            <iframe
              key={reloadKey}
              src={source.url}
              title={`${source.group} ${source.label}`}
              onLoad={() => {
                window.clearTimeout(timer.current);
                setLoaded(true);
              }}
              className="h-[calc(100vh-260px)] min-h-[520px] w-full border-0"
            />
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-col items-center px-4 py-10 text-center sm:py-14">
            <ShieldAlert size={30} className="text-gold-600" />
            <p className="mt-4 text-[16px] font-semibold text-zion-900">
              {source.group}은 새 탭에서 열립니다
            </p>
            <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-ink-soft">
              {source.hint}
            </p>
            <p className="mt-2 max-w-lg text-[12px] leading-relaxed text-ink-soft">
              {source.group} 쪽에서 다른 사이트 안에 표시되는 것을 제한하고 있어, 화면에 바로 담을 수
              없습니다. 아래 버튼으로 열면 평소대로 보실 수 있습니다.
            </p>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center gap-2 rounded-xl bg-zion-800 px-5 py-3 text-[14px] font-semibold text-white shadow-lg shadow-zion-700/20 transition hover:bg-zion-700"
            >
              <ExternalLink size={16} /> {source.label} 열기
            </a>

            {siblings.length > 0 && (
              <div className="mt-6 w-full max-w-lg border-t border-zion-100 pt-4">
                <div className="mb-2 text-[12px] font-semibold text-ink-soft">
                  {source.group}의 다른 자료
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {siblings.map((s) => (
                    <Link
                      key={s.id}
                      to={`/external/${s.id}`}
                      className="rounded-lg border border-zion-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zion-700 transition hover:border-zion-500"
                    >
                      {s.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
