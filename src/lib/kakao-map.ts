/**
 * 카카오맵 SDK를 필요할 때 불러온다 (2026-08-11).
 *
 * ## 왜 `index.html`에 넣지 않았나
 *
 * 지도는 **한 화면에서만** 쓴다. `index.html`에 `<script>`를 박으면 지도를 보지 않는
 * 사람도 매번 외부 스크립트를 받는다 — 현장에서 휴대전화로 여는 사이트라 그만큼 손해다.
 * 그래서 그 화면에 들어갔을 때만 부르고, 한 번 부른 뒤에는 다시 부르지 않는다.
 *
 * ## 키와 도메인
 *
 * 카카오맵 JavaScript 키는 **브라우저에 드러나는 것이 정상**이다. 대신 카카오 개발자
 * 콘솔에 **등록한 도메인에서만 동작**하므로 키가 새어 나가도 남이 못 쓴다.
 * 그래서 `VITE_` 접두사를 붙여도 되는 몇 안 되는 값이다 (`.env.example` 참고).
 * ⚠️ **도메인 등록을 빼먹으면 키가 맞아도 지도가 뜨지 않는다.**
 *
 * ## 못 불러올 때
 *
 * 키가 없거나(아직 발급 전) 외부 스크립트가 막히면(팀 공유 프리뷰의 단일 HTML은
 * 외부 요청이 차단된다) **던지지 않고 이유를 돌려준다.** 화면은 그 이유를 보고
 * 목록으로 넘어간다 — 지도를 못 본다고 센터 정보까지 못 보면 안 된다.
 */

/** 쓰는 기능만 좁게 적는다 — 전체 타입 패키지를 새로 깔지 않기 위한 선택이다 */
export interface KakaoLatLng {
  getLat(): number;
  getLng(): number;
}
export interface KakaoMap {
  setCenter(latlng: KakaoLatLng): void;
  setLevel(level: number, options?: { animate?: boolean }): void;
  getLevel(): number;
  panTo(latlng: KakaoLatLng): void;
  relayout(): void;
}
interface KakaoCustomOverlay {
  setMap(map: KakaoMap | null): void;
}
export interface KakaoMaps {
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  LatLngBounds: new () => { extend(latlng: KakaoLatLng): void; isEmpty(): boolean };
  CustomOverlay: new (options: {
    position: KakaoLatLng;
    content: HTMLElement | string;
    yAnchor?: number;
    xAnchor?: number;
    zIndex?: number;
    clickable?: boolean;
  }) => KakaoCustomOverlay;
  ZoomControl: new () => object;
  ControlPosition: { RIGHT: unknown; TOPRIGHT: unknown };
  event: {
    addListener(target: object, type: string, handler: () => void): void;
  };
  services?: {
    Geocoder: new () => {
      addressSearch(
        address: string,
        callback: (result: { x: string; y: string }[], status: string) => void,
      ): void;
    };
    Status: { OK: string };
  };
  load(callback: () => void): void;
}

declare global {
  interface Window {
    kakao?: { maps?: KakaoMaps };
  }
}

/** 지도를 못 켠 이유 — 화면이 이걸 보고 안내 문구를 고른다 */
export type MapFailure = "no-key" | "blocked";

export interface LoadResult {
  ok: boolean;
  maps?: KakaoMaps;
  failure?: MapFailure;
}

const SDK_ID = "kakao-maps-sdk";
/** 한 번 부른 결과를 들고 있는다 — 화면을 오갈 때마다 다시 받지 않게 */
let pending: Promise<LoadResult> | null = null;

export function kakaoAppKey(): string {
  return (import.meta.env.VITE_KAKAO_MAP_KEY ?? "").trim();
}

export function loadKakaoMaps(): Promise<LoadResult> {
  if (pending) return pending;

  const key = kakaoAppKey();
  if (!key) return Promise.resolve({ ok: false, failure: "no-key" });

  pending = new Promise<LoadResult>((resolve) => {
    // 이미 실려 있으면 그대로 쓴다
    if (window.kakao?.maps) {
      window.kakao.maps.load(() => resolve({ ok: true, maps: window.kakao!.maps! }));
      return;
    }

    const existing = document.getElementById(SDK_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.id = SDK_ID;
      script.async = true;
      /**
       * `autoload=false` — 스크립트를 받자마자 알아서 시작하지 않게 막고
       * `kakao.maps.load()`로 우리가 준비됐을 때 켠다. 동적으로 부를 때 필요하다.
       * `libraries=services` — 주소를 좌표로 바꾸는 기능(Geocoder)이 여기 들어 있다.
       */
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&libraries=services&autoload=false`;
    }

    script.addEventListener("load", () => {
      const maps = window.kakao?.maps;
      if (!maps) {
        resolve({ ok: false, failure: "blocked" });
        return;
      }
      maps.load(() => resolve({ ok: true, maps }));
    });
    // 키가 틀렸거나 도메인이 등록되지 않았거나 외부 요청이 막힌 경우 모두 여기로 온다
    script.addEventListener("error", () => {
      pending = null; // 다음에 다시 시도할 수 있게 풀어 준다
      resolve({ ok: false, failure: "blocked" });
    });

    if (!existing) document.head.appendChild(script);
  });

  return pending;
}
