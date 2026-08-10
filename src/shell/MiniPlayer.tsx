import { useState } from "react";
import { Music, Pause, Play, Plus, SkipForward, Trash2, Volume2, X } from "lucide-react";
import { useSession } from "../lib/auth";
import { canWriteLibrary } from "../lib/permissions";
import { usePlayer } from "./player";

/**
 * 상단 미니플레이어 (지시문 §4-6 · 2026-08-10 리드 지시).
 *
 * ⚠️ **셸 상단에 고정하지 않고 헤더 안에 놓았다.** 지시문은 상시 고정을 요구하지만,
 * 고정 띠를 얹으면 본문 상단 여백을 셸이 다시 잡아야 하고 그 자리에서 과거에
 * Ask AI 바가 본문을 가린 사고가 있었다(§4-6 경고). 헤더는 이미 `sticky`라
 * **스크롤해도 따라오면서** 여백 계산을 건드리지 않는다 — 같은 목적을 위험 없이 이룬다.
 *
 * 오디오 자체는 셸 최상위(`PlayerProvider`)에 있어 화면을 옮겨도 끊기지 않는다.
 */
/** 초 → "3:07" — 한 자리 초가 07로 나오게 채운다 */
function mmss(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${`${s}`.padStart(2, "0")}`;
}

export function MiniPlayer() {
  const { tracks, current, playing, volume, position, duration, error, play, toggle, next, seek, setVolume } =
    usePlayer();
  const [open, setOpen] = useState(false);
  /**
   * 손잡이를 끄는 동안에는 재생 위치를 화면에 그대로 반영하지 않는다.
   * 안 그러면 끌고 있는 중에 `timeupdate`가 값을 되돌려 손잡이가 튄다.
   */
  const [dragging, setDragging] = useState<number | null>(null);

  const empty = tracks.length === 0;
  const seekable = duration > 0;
  const shown = dragging ?? position;

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={current ? `배경 음악 — ${current.title}` : "배경 음악"}
        title={current ? `${current.title} (${current.kind})` : "배경 음악"}
        className={
          "flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-semibold transition " +
          (playing
            ? "border-zion-500 bg-zion-700 text-white"
            : "border-zion-100 bg-white text-zion-700 hover:bg-zion-50")
        }
      >
        <Music size={15} className={playing ? "animate-pulse" : ""} />
        <span className="hidden max-w-[120px] truncate sm:inline">
          {current ? current.title : "배경 음악"}
        </span>
      </button>

      {open && (
        <>
          {/* 바깥을 누르면 닫힌다 */}
          <button
            className="fixed inset-0 z-30 cursor-default"
            aria-label="닫기"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-11 z-40 w-[280px] rounded-card border border-zion-100 bg-white p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-bold text-zion-900">배경 음악</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="rounded p-0.5 text-ink-soft hover:bg-zion-50"
              >
                <X size={14} />
              </button>
            </div>

            {error && (
              <p className="mb-2 rounded-lg bg-gold-100/60 p-2 text-[11px] leading-relaxed text-ink">
                {error}
              </p>
            )}

            {empty ? (
              <p className="py-3 text-center text-[12px] leading-relaxed text-ink-soft">
                등록된 음원이 없습니다.
                <br />
                찬양 · S-POP · 기도송 음원 주소를 등록하면 여기서 이어서 들을 수 있습니다.
              </p>
            ) : (
              <>
                {current && (
                  <div className="mb-2 rounded-lg bg-zion-50 px-2.5 py-2">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-semibold text-ink">{current.title}</div>
                        <div className="text-[10.5px] text-ink-soft">{current.kind}</div>
                      </div>
                      <button
                        onClick={toggle}
                        aria-label={playing ? "일시정지" : "재생"}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zion-700 text-white transition hover:bg-zion-600"
                      >
                        {playing ? <Pause size={13} /> : <Play size={13} />}
                      </button>
                      <button
                        onClick={next}
                        aria-label="다음 곡"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zion-200 text-zion-700 transition hover:bg-white"
                      >
                        <SkipForward size={13} />
                      </button>
                    </div>

                    {/*
                      진행바 — 듣고 싶은 지점으로 옮긴다 (2026-08-10 리드 지시).
                      `range` 입력을 쓴 이유: 키보드(←→)와 화면 낭독기가 그대로 동작하고,
                      직접 만든 막대보다 터치 조작이 정확하다.
                      길이를 모르는 동안(메타데이터 로딩 전)에는 잠근다 — 그때 옮기면 되돌아온다.
                    */}
                    <div className="mt-2">
                      <input
                        type="range"
                        min={0}
                        max={seekable ? duration : 1}
                        step={0.5}
                        value={seekable ? Math.min(shown, duration) : 0}
                        disabled={!seekable}
                        onChange={(e) => setDragging(Number(e.target.value))}
                        onPointerUp={() => {
                          if (dragging !== null) seek(dragging);
                          setDragging(null);
                        }}
                        onKeyUp={() => {
                          if (dragging !== null) seek(dragging);
                          setDragging(null);
                        }}
                        aria-label="재생 위치"
                        aria-valuetext={`${mmss(shown)} / ${mmss(duration)}`}
                        className="w-full accent-zion-700 disabled:opacity-40"
                      />
                      <div className="flex justify-between text-[10px] tabular-nums text-ink-soft">
                        <span>{mmss(shown)}</span>
                        <span>{seekable ? mmss(duration) : "불러오는 중…"}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-2 flex items-center gap-2">
                  <Volume2 size={13} className="shrink-0 text-ink-soft" />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    aria-label="음량"
                    className="min-w-0 flex-1 accent-zion-700"
                  />
                </div>

                <ul className="max-h-[200px] space-y-0.5 overflow-y-auto">
                  {tracks.map((t) => (
                    <li key={t.id}>
                      <button
                        onClick={() => play(t)}
                        className={
                          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] transition " +
                          (current?.id === t.id
                            ? "bg-zion-100 font-semibold text-zion-800"
                            : "text-ink hover:bg-zion-50")
                        }
                      >
                        <Play size={11} className="shrink-0 text-zion-400" />
                        <span className="min-w-0 flex-1 truncate">{t.title}</span>
                        <span className="shrink-0 text-[10px] text-ink-soft">{t.kind}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <TrackAdmin />
          </div>
        </>
      )}
    </div>
  );
}

/** 음원 등록 — 자료실과 같은 권한 (content_admin · headquarters_admin) */
function TrackAdmin() {
  const session = useSession();
  const { tracks, addTrack, removeTrack } = usePlayer();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("찬양");
  const [src, setSrc] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canWriteLibrary(session)) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 1 || !/^https?:\/\//.test(src.trim())) {
      setError("제목과 http(s):// 로 시작하는 음원 주소를 넣어 주세요.");
      return;
    }
    if (!agreed) {
      setError("저작권 확인에 체크해 주세요.");
      return;
    }
    addTrack({ title: title.trim(), kind, src: src.trim() });
    setTitle("");
    setSrc("");
    setAgreed(false);
    setError(null);
    setOpen(false);
  }

  return (
    <div className="mt-2 border-t border-zion-100 pt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[11px] font-semibold text-zion-700 hover:underline"
      >
        <Plus size={11} /> 음원 등록
      </button>

      {open && (
        <form onSubmit={submit} className="mt-2 space-y-1.5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="곡 제목"
            className="w-full rounded-lg border border-zion-100 px-2 py-1.5 text-[12px] outline-none focus:border-zion-500"
          />
          <div className="flex gap-1.5">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              aria-label="갈래"
              className="rounded-lg border border-zion-100 px-2 py-1.5 text-[12px] outline-none focus:border-zion-500"
            >
              {["찬양", "S-POP", "기도송"].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
            <input
              value={src}
              onChange={(e) => setSrc(e.target.value)}
              placeholder="https://… mp3 주소"
              className="min-w-0 flex-1 rounded-lg border border-zion-100 px-2 py-1.5 text-[12px] outline-none focus:border-zion-500"
            />
          </div>
          {/* 저작권 확인 — 자체 제작·허락받은 음원만 (지시문 §3) */}
          <label className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-ink-soft">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 shrink-0 accent-zion-700"
            />
            <span>자체 제작이거나 사용 허락을 받은 음원입니다. 저작권을 확인했습니다.</span>
          </label>
          {error && <p className="text-[10.5px] text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-zion-800 py-1.5 text-[12px] font-semibold text-white transition hover:bg-zion-700"
          >
            등록
          </button>
        </form>
      )}

      {tracks.length > 0 && open && (
        <ul className="mt-2 space-y-0.5">
          {tracks.map((t) => (
            <li key={t.id} className="flex items-center gap-1.5 text-[11px] text-ink-soft">
              <span className="min-w-0 flex-1 truncate">{t.title}</span>
              <button
                onClick={() => removeTrack(t.id)}
                aria-label={`${t.title} 지우기`}
                className="shrink-0 rounded p-0.5 hover:bg-zion-50 hover:text-red-600"
              >
                <Trash2 size={11} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
