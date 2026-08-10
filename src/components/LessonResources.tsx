import { useState } from "react";
import { Link2, X } from "lucide-react";
import { useSession } from "../lib/auth";
import { useStore } from "../lib/store";
import { canWriteLibrary } from "../lib/permissions";
import { MediaLinks } from "./MediaLinks";

/**
 * 교안·영상 원스톱 매칭 (2026-08-10 리드 지시) — 교안 화면 하단에서 그 강의
 * **수업용 PPT와 강의 현장 영상**을 바로 연다. 교안 읽다가 자료실로 건너갈 필요가 없다.
 *
 * 링크 등록은 자료실과 같은 권한(content_admin · headquarters_admin)이다 —
 * 전국 공통 교육 영역의 콘텐츠 관리이기 때문이다.
 * ⚠️ 파일 원본 업로드는 R2 대기 — 지금은 외부 저장소(비메오·위플 포함) URL만 담는다.
 */
export function LessonResources({ lessonKey }: { lessonKey: string }) {
  const session = useSession();
  const { lessonResources } = useStore();
  const [editing, setEditing] = useState(false);

  const res = lessonResources.find((r) => r.lessonKey === lessonKey) ?? null;
  const writable = canWriteLibrary(session);

  if (!res && !writable) return null;

  return (
    <div className="mt-5 rounded-card border border-zion-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[13px] font-bold text-zion-900">
          <Link2 size={14} className="text-zion-600" /> 이 강의 수업 자료
        </div>
        {writable && (
          <button
            onClick={() => setEditing((v) => !v)}
            className="rounded-lg border border-zion-200 px-2.5 py-1 text-[11px] font-semibold text-zion-700 transition hover:bg-zion-50"
          >
            {editing ? "닫기" : res ? "링크 수정" : "링크 등록"}
          </button>
        )}
      </div>

      {res ? (
        <MediaLinks pptUrl={res.pptUrl} videoUrl={res.videoUrl} compact />
      ) : (
        <p className="mt-2 text-[12px] text-ink-soft">
          아직 연결된 PPT·영상이 없습니다.
          {writable ? " 링크 등록으로 연결해 주세요." : " 콘텐츠 관리자가 등록하면 표시됩니다."}
        </p>
      )}

      {editing && writable && (
        <ResourceForm
          lessonKey={lessonKey}
          initialPpt={res?.pptUrl ?? ""}
          initialVideo={res?.videoUrl ?? ""}
          onDone={() => setEditing(false)}
        />
      )}
    </div>
  );
}

function ResourceForm({
  lessonKey,
  initialPpt,
  initialVideo,
  onDone,
}: {
  lessonKey: string;
  initialPpt: string;
  initialVideo: string;
  onDone: () => void;
}) {
  const session = useSession();
  const { setLessonResource } = useStore();
  const [ppt, setPpt] = useState(initialPpt);
  const [video, setVideo] = useState(initialVideo);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const bad = [ppt, video].find((u) => u.trim() && !/^https?:\/\//.test(u.trim()));
    if (bad !== undefined) {
      setError("링크는 http(s):// 로 시작해야 합니다.");
      return;
    }
    setLessonResource({
      lessonKey,
      pptUrl: ppt.trim() || null,
      videoUrl: video.trim() || null,
      updatedBy: session.name,
      updatedByRole: session.roleCode,
    });
    onDone();
  }

  return (
    <form onSubmit={submit} className="mt-3 rounded-lg bg-zion-50 p-3">
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-ink">수업용 PPT 링크</label>
          <input
            value={ppt}
            onChange={(e) => setPpt(e.target.value)}
            placeholder="https://… (외부 저장소)"
            className="w-full rounded-lg border border-zion-100 bg-white px-3 py-2 text-[12px] outline-none focus:border-zion-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-ink">강의 현장 영상 링크</label>
          <input
            value={video}
            onChange={(e) => setVideo(e.target.value)}
            placeholder="https://vimeo.com/… 또는 위플 주소"
            className="w-full rounded-lg border border-zion-100 bg-white px-3 py-2 text-[12px] outline-none focus:border-zion-500"
          />
        </div>
      </div>
      {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-[10px] leading-relaxed text-ink-soft">
          둘 다 비우고 저장하면 링크가 지워집니다. 파일 원본 업로드는 저장소(R2) 도입 후 지원됩니다.
        </span>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={onDone}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-ink-soft hover:bg-white"
          >
            <X size={12} /> 취소
          </button>
          <button
            type="submit"
            className="rounded-lg bg-zion-800 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-zion-700"
          >
            저장
          </button>
        </div>
      </div>
    </form>
  );
}
