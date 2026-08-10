import { ExternalLink, MonitorPlay, Presentation } from "lucide-react";

/**
 * 수업 자료 링크 묶음 — PPT 다운로드 + 강의 현장 영상 (2026-08-10 리드 지시).
 * 강의 도우미(교안 하단)와 분반·보강(자료실 상세)이 같은 표시를 쓰므로 한 곳에 모았다.
 *
 * 영상 재생 방침:
 * - **비메오만 사이트 안에서 재생한다** — player.vimeo.com은 임베드가 공식 허용된 주소다
 * - 위플 등 다른 곳은 **새 탭**으로 연다. 임베드 허용 여부를 모르는 사이트를 iframe에
 *   넣으면 실제 브라우저에서 "차단되었습니다"가 뜬다. ⚠️ 개발용 인앱 브라우저는
 *   X-Frame-Options를 무시해 "되는 것처럼" 보인다 — 실기기 확인 전에는 새 탭이 안전하다
 */

function vimeoEmbedUrl(url: string): string | null {
  const m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(url);
  return m ? `https://player.vimeo.com/video/${m[1]}` : null;
}

export function MediaLinks({
  pptUrl,
  videoUrl,
  compact = false,
}: {
  pptUrl?: string | null;
  videoUrl?: string | null;
  compact?: boolean;
}) {
  if (!pptUrl && !videoUrl) return null;
  const embed = videoUrl ? vimeoEmbedUrl(videoUrl) : null;

  return (
    <div className={compact ? "mt-3" : "mt-4 border-t border-zion-100 pt-4"}>
      <div className="flex flex-wrap gap-2">
        {pptUrl && (
          <a
            href={pptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-zion-800 px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-zion-700"
          >
            <Presentation size={14} /> 수업용 PPT 내려받기
            <span className="text-[10px] text-white/70">새 탭</span>
          </a>
        )}
        {videoUrl && !embed && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-zion-200 bg-white px-3 py-2 text-[12px] font-semibold text-zion-700 transition hover:border-zion-500"
          >
            <MonitorPlay size={14} /> 강의 현장 영상 보기
            <span className="text-[10px] text-ink-soft">새 탭</span>
          </a>
        )}
      </div>

      {embed && (
        <div className="mt-3">
          <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-ink">
            <MonitorPlay size={13} className="text-zion-600" /> 강의 현장 영상
            <a
              href={videoUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-[11px] font-medium text-zion-700 hover:underline"
            >
              <ExternalLink size={11} /> 새 탭으로
            </a>
          </div>
          {/* 16:9 비율 유지 — 좁은 화면에서도 영역 안에 머문다 */}
          <div className="relative w-full overflow-hidden rounded-lg bg-zion-950" style={{ paddingTop: "56.25%" }}>
            <iframe
              src={embed}
              title="강의 현장 영상"
              className="absolute inset-0 h-full w-full"
              allow="fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}
