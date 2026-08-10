import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * 배경 음악 플레이어 — 셸 최상위에 **`<audio>` 하나**를 두고 Context로 제어한다 (지시문 §4-6).
 *
 * ⚠️ **화면 컴포넌트가 자기 오디오를 만들면 안 된다.** 라우팅으로 화면이 바뀔 때
 * 그 컴포넌트가 언마운트되면서 소리가 끊긴다. 여기 하나만 두면 화면을 옮겨도 이어진다.
 *
 * ⚠️ **자동재생은 브라우저가 막는다.** 최초 재생은 반드시 사용자 클릭에서 시작하고,
 * 그 뒤에만 프로그램으로 곡을 바꾼다. 막혔을 때는 조용히 실패하지 말고 알린다.
 *
 * ⚠️ 음원 파일 자체는 저장소(R2)가 붙어야 올릴 수 있다. 지금은 **외부 URL만** 담는다 —
 * 자체 제작·허락받은 음원만 등록한다(저작권 확인은 등록하는 사람 몫, 지시문 §3).
 */

export interface Track {
  id: string;
  title: string;
  /** 갈래 — 찬양 · S-POP · 기도송 */
  kind: string;
  src: string;
}

const TRACK_KEY = "zion_ark_bgm_tracks";
const VOLUME_KEY = "zion_ark_bgm_volume";

/**
 * 기본 음원 — 리드가 준 파일을 `public/music/`에 두고 시드로 싣는다 (2026-08-10).
 *
 * ⚠️ 경로 앞에 `import.meta.env.BASE_URL`을 붙인다. GitHub Pages는 하위 경로
 * (`/zion-ark/`)로 서비스되므로 `/music/…`으로 적으면 **배포본에서만 404**가 난다.
 * ⚠️ 파일명에 `[` `]` `#` `~`가 있으면 Vite dev 서버가 403을 낸다 —
 * `scripts/copy-music.mjs`가 걷어내고 복사한다.
 *
 * 갈래는 일단 「찬양」으로 두었다. S-POP·기도송 구분은 리드 확인 후 고친다.
 */
const SEED_TRACKS: Track[] = [
  { id: "seed-m1", title: "더 가까이", kind: "찬양", src: "music/더-가까이.mp3" },
  { id: "seed-m2", title: "We Are One", kind: "찬양", src: "music/AR-We-Are-One.mp3" },
  { id: "seed-m3", title: "내 믿음의 시작", kind: "찬양", src: "music/AR-내-믿음의-시작.mp3" },
  { id: "seed-m4", title: "소망의 항해", kind: "찬양", src: "music/AR-소망의-항해.mp3" },
  { id: "seed-m5", title: "함께", kind: "찬양", src: "music/AR-함께.mp3" },
].map((t) => ({ ...t, src: import.meta.env.BASE_URL + t.src }));

/**
 * 저장된 목록을 읽고 **빠진 시드만 덧붙인다.**
 * 한 번 열어 본 사람에게 나중에 추가된 곡이 안 보이던 문제를 막는다 —
 * 자료실 시드에서 겪은 것과 같은 함정이다(`store.tsx`의 `load()` 주석).
 * 사용자가 지운 곡을 되살리지 않도록 **지운 시드 id를 따로 기억**한다.
 */
const REMOVED_KEY = "zion_ark_bgm_removed_seeds";

function removedSeeds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(REMOVED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function loadTracks(): Track[] {
  let stored: Track[] | null = null;
  try {
    const raw = localStorage.getItem(TRACK_KEY);
    if (raw) stored = JSON.parse(raw) as Track[];
  } catch {
    /* 손상 시 시드로 복구 */
  }
  if (!stored) return SEED_TRACKS;

  const have = new Set(stored.map((t) => t.id));
  const gone = removedSeeds();
  const missing = SEED_TRACKS.filter((s) => !have.has(s.id) && !gone.has(s.id));
  return missing.length > 0 ? [...stored, ...missing] : stored;
}

interface PlayerValue {
  tracks: Track[];
  current: Track | null;
  playing: boolean;
  volume: number;
  /** 재생이 막혔을 때 사람에게 보여 줄 말 */
  error: string | null;
  play: (track: Track) => void;
  toggle: () => void;
  next: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  addTrack: (input: Omit<Track, "id">) => void;
  removeTrack: (id: string) => void;
}

const PlayerContext = createContext<PlayerValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [tracks, setTracks] = useState<Track[]>(loadTracks);
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVol] = useState(() => {
    const v = Number(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(v) && v > 0 && v <= 1 ? v : 0.5;
  });

  const persist = useCallback((next: Track[]) => {
    localStorage.setItem(TRACK_KEY, JSON.stringify(next));
    setTracks(next);
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    localStorage.setItem(VOLUME_KEY, String(volume));
  }, [volume]);

  const play = useCallback((track: Track) => {
    setError(null);
    setCurrent(track);
    const el = audioRef.current;
    if (!el) return;
    el.src = track.src;
    // 사용자 클릭에서 시작하지 않으면 브라우저가 거절한다 — 조용히 넘기지 않고 알린다
    el.play()
      .then(() => setPlaying(true))
      .catch(() => {
        setPlaying(false);
        setError("재생이 막혔습니다. 재생 버튼을 한 번 눌러 주세요.");
      });
  }, []);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el || !current) return;
    if (el.paused) {
      el.play()
        .then(() => {
          setPlaying(true);
          setError(null);
        })
        .catch(() => setError("재생할 수 없습니다. 음원 주소를 확인해 주세요."));
    } else {
      el.pause();
      setPlaying(false);
    }
  }, [current]);

  const next = useCallback(() => {
    if (tracks.length === 0) return;
    const i = current ? tracks.findIndex((t) => t.id === current.id) : -1;
    play(tracks[(i + 1) % tracks.length]);
  }, [tracks, current, play]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
    setCurrent(null);
  }, []);

  const value = useMemo<PlayerValue>(
    () => ({
      tracks,
      current,
      playing,
      volume,
      error,
      play,
      toggle,
      next,
      stop,
      setVolume: setVol,
      addTrack: (input) => persist([...tracks, { id: Math.random().toString(36).slice(2, 10), ...input }]),
      removeTrack: (id) => {
        if (current?.id === id) stop();
        // 시드 곡을 지웠으면 기억해 둔다 — 안 그러면 다음에 열 때 되살아난다
        if (SEED_TRACKS.some((s) => s.id === id)) {
          const gone = removedSeeds();
          gone.add(id);
          localStorage.setItem(REMOVED_KEY, JSON.stringify([...gone]));
        }
        persist(tracks.filter((t) => t.id !== id));
      },
    }),
    [tracks, current, playing, volume, error, play, toggle, next, stop, persist],
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/*
        오디오는 셸 최상위에 하나만. 화면이 바뀌어도 이 요소는 살아 있어 소리가 안 끊긴다.
        곡이 끝나면 다음 곡으로 넘어간다 — 끊김 없이 듣게 하는 것이 이 기능의 목적이다.
      */}
      <audio
        ref={audioRef}
        onEnded={next}
        onError={() => {
          setPlaying(false);
          setError("음원을 불러오지 못했습니다. 주소를 확인해 주세요.");
        }}
        preload="none"
      />
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer는 PlayerProvider 안에서만 사용");
  return ctx;
}
