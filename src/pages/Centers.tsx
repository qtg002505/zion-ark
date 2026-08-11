import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, CalendarDays, ExternalLink, Info, MapPin, Users } from "lucide-react";
import { useSession } from "../lib/auth";
import { Link } from "../components/TransitionLink";
import {
  MAP_DEFAULT_CENTER,
  MISSION_CENTERS,
  TRIBES,
  daysLeft,
  progressPercent,
  type CenterCohort,
  type MissionCenter,
} from "../content/centers";
import { loadKakaoMaps, type KakaoLatLng, type KakaoMap, type MapFailure } from "../lib/kakao-map";
import { PageHeader, Card } from "./common";

/**
 * 12지파 선교센터 — 어디에 있고 지금 어느 기수가 도는지 (2026-08-11 리드 지시).
 *
 * 지도가 이 화면의 본체지만 **지도가 없어도 화면은 제 몫을 해야 한다.** 키를 아직 못
 * 받았거나 팀 공유 프리뷰(외부 요청 차단)에서 열면 지도 자리에 안내가 뜨고 아래 목록은
 * 그대로 보인다 — 센터 주소와 기수·진도는 지도 없이도 필요한 정보다.
 *
 * 지도를 켤 때 주소는 **카카오 쪽에 다시 물어 좌표를 받는다.** 데이터에 적어 둔 좌표는
 * 어림값이라 건물을 정확히 짚지 못한다.
 */
export function Centers() {
  const session = useSession();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObj = useRef<KakaoMap | null>(null);
  /** 핀 DOM과 실제로 찍힌 좌표 — 확대 수준이 바뀌면 내용을 갈아 끼우고, 목록에서 고르면 그리로 옮긴다 */
  const pinsRef = useRef<{ center: MissionCenter; el: HTMLElement; pos: KakaoLatLng }[]>([]);
  const [failure, setFailure] = useState<MapFailure | null>(null);
  const [pickedId, setPickedId] = useState<string>(MISSION_CENTERS[0]?.id ?? "");
  /** 지도 확대 수준 — 가까이 가면 핀에 층·기수까지 보여 준다 */
  const [level, setLevel] = useState(MAP_DEFAULT_CENTER.level);

  const picked = MISSION_CENTERS.find((c) => c.id === pickedId) ?? MISSION_CENTERS[0];
  const placedCount = MISSION_CENTERS.length;
  const missingTribes = useMemo(
    () => TRIBES.filter((t) => !MISSION_CENTERS.some((c) => c.tribe === t)).length,
    [],
  );

  useEffect(() => {
    let cancelled = false;

    loadKakaoMaps().then((res) => {
      if (cancelled) return;
      if (!res.ok || !res.maps || !mapRef.current) {
        setFailure(res.failure ?? "blocked");
        return;
      }
      const maps = res.maps;
      /**
       * SDK가 실렸다고 지도가 뜨는 것은 아니다 — 키가 맞아도 **도메인을 등록하지 않으면**
       * 여기서 걸린다(가장 흔한 실수다). 터지면 화면 전체가 빈 채로 남으므로 받아서
       * 안내로 돌린다.
       */
      let map: KakaoMap;
      try {
        map = new maps.Map(mapRef.current, {
          center: new maps.LatLng(MAP_DEFAULT_CENTER.lat, MAP_DEFAULT_CENTER.lng),
          level: MAP_DEFAULT_CENTER.level,
        });
      } catch {
        setFailure("blocked");
        return;
      }
      mapObj.current = map;
      maps.event.addListener(map, "zoom_changed", () => setLevel(map.getLevel()));

      const bounds = new maps.LatLngBounds();
      const geocoder = maps.services ? new maps.services.Geocoder() : null;
      /**
       * 주소 검색이 비동기라 **다 찍힌 뒤에** 화면을 맞춰야 한다.
       * 센터가 몇 곳이든 전부 보이게 범위를 잡는다 — 대전 두 곳처럼 가까이 붙어 있으면
       * 알아서 당겨 주고(안 그러면 핀 두 개가 겹쳐 이름이 잘린다), 전국으로 늘어나면
       * 알아서 물러난다. 고정 확대 수준으로는 둘 다 만족시킬 수 없다.
       */
      let placed = 0;
      const fitAll = () => {
        if (cancelled || placed < MISSION_CENTERS.length || bounds.isEmpty()) return;
        map.setBounds(bounds);
        // 한 곳뿐이면 지나치게 당겨져 주변이 안 보인다 — 적당한 선에서 멈춘다
        if (map.getLevel() < 3) map.setLevel(3);
        setLevel(map.getLevel());
      };

      for (const center of MISSION_CENTERS) {
        const place = (pos: KakaoLatLng) => {
          if (cancelled) return;
          const el = buildPin(center, () => setPickedId(center.id));
          new maps.CustomOverlay({
            position: pos,
            content: el,
            yAnchor: 1,
            clickable: true,
            zIndex: 3,
          }).setMap(map);
          pinsRef.current.push({ center, el, pos });
          bounds.extend(pos);
          placed++;
          fitAll();
        };

        if (geocoder) {
          geocoder.addressSearch(center.address, (result, status) => {
            if (status === maps.services!.Status.OK && result[0]) {
              place(new maps.LatLng(Number(result[0].y), Number(result[0].x)));
            } else {
              // 주소를 못 찾으면 적어 둔 어림값으로라도 찍는다 — 핀이 사라지면 안 된다
              place(new maps.LatLng(center.fallbackLat, center.fallbackLng));
            }
          });
        } else {
          place(new maps.LatLng(center.fallbackLat, center.fallbackLng));
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // 확대 수준·고른 센터가 바뀌면 핀 표시를 다시 그린다
  useEffect(() => {
    for (const { center, el } of pinsRef.current) {
      paintPin(el, center, level <= 5, center.id === pickedId);
    }
  }, [level, pickedId]);

  // 목록에서 센터를 고르면 지도도 그쪽으로 옮긴다 — 주소로 찾은 실제 자리로 간다
  function pick(id: string) {
    setPickedId(id);
    const map = mapObj.current;
    const hit = pinsRef.current.find((p) => p.center.id === id);
    if (map && hit) map.panTo(hit.pos);
  }

  return (
    <div>
      <PageHeader
        crumb="선교센터"
        title="12지파 선교센터 위치"
        desc={`센터를 누르면 그곳에서 도는 기수와 진도가 함께 뜹니다. 지금 ${placedCount}곳이 올라와 있고 ${missingTribes}개 지파는 주소를 받는 대로 더합니다. (주소 외 기수·진도는 시범 목업입니다)`}
      />

      <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
        {/* 지도 — 좁은 화면에서는 위에 쌓인다 */}
        <div className="col-span-2 max-lg:col-span-1">
          <div className="overflow-hidden rounded-card border border-zion-100 bg-white shadow-sm">
            {failure ? (
              <MapUnavailable reason={failure} />
            ) : (
              <div ref={mapRef} className="h-[420px] w-full max-lg:h-[320px]" role="application" aria-label="선교센터 지도" />
            )}
          </div>
          {!failure && (
            <p className="mt-1.5 px-1 text-[11px] leading-relaxed text-ink-soft">
              금색 표시가 선교센터입니다. 확대하면 층과 기수까지 보이고, 누르면 오른쪽에 진도가 뜹니다.
            </p>
          )}
        </div>

        {/* 고른 센터의 기수·진도 */}
        <div className="col-span-1">
          {picked ? <CenterDetail center={picked} myCohort={session.cohort} /> : null}
        </div>
      </div>

      {/* 목록 — 지도가 없어도 여기서 다 볼 수 있다 */}
      <Card className="mt-4">
        <div className="mb-2 flex items-center gap-1.5 text-[14px] font-bold text-zion-900">
          <Building2 size={15} className="text-zion-600" /> 센터 목록 {MISSION_CENTERS.length}곳
        </div>
        <ul className="space-y-1.5">
          {MISSION_CENTERS.map((c) => {
            const on = c.id === pickedId;
            return (
              <li key={c.id}>
                <button
                  onClick={() => pick(c.id)}
                  aria-current={on ? "true" : undefined}
                  className={
                    "flex w-full flex-wrap items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition " +
                    (on ? "border-zion-500 bg-zion-50" : "border-zion-100 hover:bg-zion-50")
                  }
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gold-500 text-zion-950">
                    <MapPin size={13} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-semibold text-zion-900">
                      {c.name} <span className="font-normal text-ink-soft">{c.floor}</span>
                    </span>
                    <span className="block truncate text-[11.5px] text-ink-soft">{c.address}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-ink-soft">
                    {c.tribe ? `${c.tribe} 지파` : "지파 확인 필요"}
                  </span>
                  <span className="shrink-0 rounded bg-zion-100 px-1.5 py-0.5 text-[11px] font-semibold text-zion-700">
                    {c.cohorts.map((x) => x.name).join(" · ")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

/* ── 지도 위 금색 핀 ── */

/**
 * 핀은 React 밖에서 만든다 — 카카오 오버레이가 DOM 요소를 그대로 받기 때문이다.
 * 내용은 `textContent`로만 넣는다. 지금은 우리가 적은 목업이지만 실연동되면 서버에서
 * 온 문자열이 들어오므로, 그때 가서 고치지 않아도 되게 처음부터 안전한 쪽으로 둔다.
 */
function buildPin(center: MissionCenter, onPick: () => void): HTMLElement {
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("aria-label", `${center.name} ${center.floor}`);
  el.addEventListener("click", onPick);

  const label = document.createElement("span");
  label.dataset.role = "label";
  const detail = document.createElement("span");
  detail.dataset.role = "detail";
  const tail = document.createElement("span");
  tail.dataset.role = "tail";

  el.append(label, detail, tail);
  paintPin(el, center, false, false);
  return el;
}

/** 확대 수준과 선택 여부에 따라 핀 모양을 다시 칠한다 */
function paintPin(el: HTMLElement, center: MissionCenter, detailed: boolean, active: boolean) {
  el.className =
    "relative flex flex-col items-center gap-0.5 rounded-lg border-2 px-2 py-1 text-center shadow-lg transition " +
    // 금색은 「눈에 띄게」 쓰라는 지시대로 센터 표시 전용이다. 글자는 zion-950 —
    // 이 조합은 밝은·어두운 화면 양쪽에서 대비가 확보된 짝이다 (CLAUDE.md 화면 규칙)
    (active
      ? "border-zion-900 bg-gold-500 text-zion-950 scale-110 z-10"
      : "border-gold-600 bg-gold-500 text-zion-950 hover:scale-105");

  const label = el.querySelector<HTMLElement>('[data-role="label"]');
  const detail = el.querySelector<HTMLElement>('[data-role="detail"]');
  const tail = el.querySelector<HTMLElement>('[data-role="tail"]');
  if (!label || !detail || !tail) return;

  label.className = "block text-[11.5px] font-black leading-tight whitespace-nowrap";
  label.textContent = center.name;

  // 가까이 가면 층과 기수까지 — 멀리서는 이름만 보여야 핀끼리 겹치지 않는다
  detail.className = detailed
    ? "block text-[10px] font-semibold leading-tight whitespace-nowrap opacity-80"
    : "hidden";
  detail.textContent = `${center.floor} · ${center.cohorts.map((c) => c.name).join(" · ")}`;

  // 핀 아래 꼬리 — 건물 자리를 정확히 가리킨다
  tail.className =
    "absolute -bottom-[7px] left-1/2 h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[7px] border-x-transparent " +
    (active ? "border-t-zion-900" : "border-t-gold-600");
  tail.textContent = "";
}

/* ── 고른 센터의 기수·진도 ── */

function CenterDetail({ center, myCohort }: { center: MissionCenter; myCohort: string | null }) {
  return (
    <Card>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gold-500 text-zion-950">
          <MapPin size={15} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-zion-900">{center.name}</h2>
          <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
            {center.address} {center.floor}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-soft">
            {center.tribe ? `${center.tribe} 지파` : "지파 배정 확인 필요"} · {center.region}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {center.cohorts.map((c) => (
          <CohortProgress key={c.name} cohort={c} isMine={myCohort === c.name} />
        ))}
      </div>

      <a
        href={`https://map.kakao.com/link/search/${encodeURIComponent(center.address)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center justify-center gap-1 rounded-lg border border-zion-200 py-2 text-[12px] font-semibold text-zion-700 transition hover:bg-zion-50"
      >
        카카오맵에서 길찾기 <ExternalLink size={12} />
      </a>
    </Card>
  );
}

function CohortProgress({ cohort, isMine }: { cohort: CenterCohort; isMine: boolean }) {
  const pct = progressPercent(cohort);
  const left = daysLeft(cohort);
  return (
    <div className="rounded-xl border border-zion-100 bg-zion-50/60 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[14px] font-bold text-zion-900">{cohort.name}</span>
        <span className="rounded bg-zion-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-zion-700">
          {cohort.slot}
        </span>
        {isMine && (
          <span className="rounded bg-gold-500 px-1.5 py-0.5 text-[10.5px] font-black text-zion-950">
            내 담당
          </span>
        )}
      </div>

      {/* 진도 */}
      <div className="mt-2">
        <div className="flex items-baseline justify-between text-[11.5px]">
          <span className="font-semibold text-zion-700">
            진도 {cohort.session} / {cohort.totalSessions}회
          </span>
          <span className="font-bold text-zion-900">{pct}%</span>
        </div>
        <div
          className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zion-100"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${cohort.name} 진도`}
        >
          <div className="h-full rounded-full bg-zion-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/*
        ⚠️ **출석률은 여기 두지 않는다** (2026-08-11 리드 지시). 이 화면은 「어디에 있고
        지금 어디까지 나갔나」를 보는 자리다 — 센터별 출석률을 지도에 늘어놓으면 위치를
        찾으러 온 사람에게 성적표처럼 읽힌다. 출석률은 기수 현황에서 본다.
      */}
      <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11.5px]">
        <div className="flex items-center gap-1">
          <Users size={11} className="shrink-0 text-zion-600" />
          <dt className="text-ink-soft">수강생</dt>
          <dd className="font-semibold text-ink">{cohort.students}명</dd>
        </div>
        <div className="col-span-2 flex items-center gap-1">
          <CalendarDays size={11} className="shrink-0 text-zion-600" />
          <dt className="text-ink-soft">개강·종강</dt>
          <dd className="font-semibold text-ink">
            {cohort.startsOn} ~ {cohort.endsOn}
            {left > 0 && <span className="ml-1 font-normal text-ink-soft">({left}일 남음)</span>}
          </dd>
        </div>
      </dl>

      {isMine && (
        <Link
          viewTransition
          to="/cohort"
          className="mt-2 flex items-center justify-center gap-1 rounded-lg bg-zion-800 py-1.5 text-[12px] font-semibold text-white transition hover:bg-zion-700"
        >
          기수 현황 열기
        </Link>
      )}
    </div>
  );
}

/* ── 지도를 못 켰을 때 ── */

function MapUnavailable({ reason }: { reason: MapFailure }) {
  return (
    <div className="flex h-[420px] flex-col items-center justify-center px-6 text-center max-lg:h-[260px]">
      <Info size={26} className="text-zion-300" />
      <p className="mt-3 text-[14px] font-semibold text-zion-900">
        {reason === "no-key" ? "지도 키가 아직 등록되지 않았습니다" : "이 화면에서는 지도를 띄울 수 없습니다"}
      </p>
      <p className="mt-1.5 max-w-sm text-[12px] leading-relaxed text-ink-soft">
        {reason === "no-key" ? (
          <>
            카카오 개발자 콘솔에서 JavaScript 키를 발급받아 <code className="rounded bg-zion-100 px-1">VITE_KAKAO_MAP_KEY</code>에
            넣고, 쓰는 주소를 <strong className="text-zion-700">플랫폼 &gt; Web</strong>에 등록하면 바로 뜹니다.
            아래 목록은 지금도 그대로 쓰실 수 있습니다.
          </>
        ) : (
          <>
            팀 공유 프리뷰(단일 HTML)는 외부 요청이 막혀 있어 지도가 실리지 않습니다.
            <strong className="text-zion-700"> 팀 공유 링크</strong>에서 열면 지도가 보입니다.
            아래 목록은 여기서도 그대로 쓰실 수 있습니다.
          </>
        )}
      </p>
    </div>
  );
}
