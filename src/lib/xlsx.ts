/**
 * 최소 XLSX 만들기·읽기 — **외부 패키지를 쓰지 않는다.**
 *
 * 왜 직접 만드나: 진도표 양식을 엑셀로 주고 그 파일을 그대로 받아야 하는데(2026-08-10
 * 리드 지시), 이것 하나 때문에 수백 KB짜리 스프레드시트 라이브러리를 번들에 넣으면
 * 현장에서 휴대전화로 여는 사이트가 그만큼 무거워진다. 우리가 다루는 표는 머리글 한 줄에
 * 문자열·숫자만 있는 단순한 시트라 직접 다루는 편이 가볍다.
 *
 * xlsx는 **zip 안에 XML 몇 개**가 든 형식이다.
 *   - 쓸 때: 압축하지 않고(store) 담는다 — 압축기가 필요 없다. 엑셀은 무압축 zip도 연다
 *   - 읽을 때: 엑셀이 저장한 파일은 deflate 압축이라, 브라우저 내장
 *     `DecompressionStream("deflate-raw")`으로 푼다 (별도 라이브러리 없음)
 *
 * ⚠️ 다루는 범위를 좁게 유지한다 — 서식·수식·여러 시트는 다루지 않는다.
 * 진도표처럼 **머리글 + 값**인 표만 대상이다.
 */

/* ── CRC32 (zip 필수) ── */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ── zip 쓰기 (무압축) ── */

/**
 * `Blob`에 넣으려면 버퍼가 `ArrayBuffer`여야 한다 (`SharedArrayBuffer`는 받지 않는다).
 * `TextEncoder.encode()`는 더 넓은 타입을 돌려주므로 한 번 감싸 좁힌다.
 */
type Bytes = Uint8Array<ArrayBuffer>;

const TEXT = new TextEncoder();
function bytes(s: string): Bytes {
  return new Uint8Array(TEXT.encode(s));
}

interface ZipEntry {
  name: string;
  data: Bytes;
}

function zipStore(entries: ZipEntry[]): Blob {
  const chunks: Bytes[] = [];
  const central: Bytes[] = [];
  let offset = 0;

  for (const e of entries) {
    const nameBytes = bytes(e.name);
    const crc = crc32(e.data);

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // 로컬 헤더 서명
    lv.setUint16(4, 20, true); // 필요 버전
    lv.setUint16(6, 0, true); // 플래그
    lv.setUint16(8, 0, true); // 압축 방식 0 = store
    lv.setUint16(10, 0, true); // 시각
    lv.setUint16(12, 0, true); // 날짜
    lv.setUint32(14, crc, true);
    lv.setUint32(18, e.data.length, true);
    lv.setUint32(22, e.data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);

    chunks.push(local, e.data);

    const cd = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true); // 중앙 디렉터리 서명
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, e.data.length, true);
    cv.setUint32(24, e.data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    cd.set(nameBytes, 46);
    central.push(cd);

    offset += local.length + e.data.length;
  }

  const centralSize = central.reduce((a, c) => a + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); // 끝 서명
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  return new Blob([...chunks, ...central, end], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/* ── zip 읽기 ── */

async function inflateRaw(data: Bytes): Promise<Bytes> {
  // 브라우저 내장 해제기 — 별도 라이브러리를 쓰지 않는 이유다
  const ds = new DecompressionStream("deflate-raw");
  const stream = new Blob([data]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** zip에서 파일 이름 → 내용(문자열) 지도를 만든다 */
async function unzip(buf: ArrayBuffer): Promise<Map<string, string>> {
  const all: Bytes = new Uint8Array(buf);
  const view = new DataView(buf);
  const dec = new TextDecoder();
  const out = new Map<string, string>();

  // 끝 레코드를 뒤에서 찾는다 (주석이 붙어 있을 수 있다)
  let end = -1;
  for (let i = all.length - 22; i >= 0 && i > all.length - 22 - 65536; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("zip 끝 레코드를 찾지 못했습니다");

  const count = view.getUint16(end + 10, true);
  let p = view.getUint32(end + 16, true);

  for (let i = 0; i < count; i++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOff = view.getUint32(p + 42, true);
    const name = dec.decode(all.subarray(p + 46, p + 46 + nameLen));

    // 로컬 헤더에서 실제 데이터 시작점을 다시 잰다 (extra 길이가 다를 수 있다)
    const lNameLen = view.getUint16(localOff + 26, true);
    const lExtraLen = view.getUint16(localOff + 28, true);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const raw: Bytes = all.slice(dataStart, dataStart + compSize);

    if (name.endsWith(".xml") || name.endsWith(".rels")) {
      const plain = method === 0 ? raw : await inflateRaw(raw);
      out.set(name, dec.decode(plain));
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

/* ── XML 도우미 ── */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function unesc(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, "&");
}

/** 0 → A, 25 → Z, 26 → AA */
function colName(i: number): string {
  let s = "";
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/* ── 공개 API ── */

/**
 * 표 하나를 xlsx로 만든다. 값은 전부 **문자열(inlineStr)**로 넣는다 —
 * 날짜를 엑셀 일련번호로 바꾸면 사람이 열었을 때 숫자로 보이고 다시 읽을 때도 어긋난다.
 */
export function buildXlsx(rows: string[][], sheetName = "Sheet1"): Blob {
  const sheetRows = rows
    .map((cells, r) => {
      const cs = cells
        .map((v, c) =>
          v === ""
            ? ""
            : `<c r="${colName(c)}${r + 1}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`,
        )
        .join("");
      return `<row r="${r + 1}">${cs}</row>`;
    })
    .join("");

  const files: ZipEntry[] = [
    {
      name: "[Content_Types].xml",
      data: bytes(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
      ),
    },
    {
      name: "_rels/.rels",
      data: bytes(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      ),
    },
    {
      name: "xl/workbook.xml",
      data: bytes(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      ),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: bytes(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
      ),
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: bytes(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="14"/><col min="2" max="2" width="8"/><col min="3" max="3" width="8"/><col min="4" max="4" width="44"/></cols><sheetData>${sheetRows}</sheetData></worksheet>`,
      ),
    },
  ];

  return zipStore(files);
}

/**
 * xlsx에서 표를 읽는다 — 첫 시트의 값만 행 배열로 낸다.
 * 엑셀이 저장한 파일은 문자열을 `sharedStrings.xml`에 모아 두므로 그것도 함께 푼다.
 */
export async function readXlsx(file: File): Promise<string[][]> {
  const map = await unzip(await file.arrayBuffer());

  const sharedXml = map.get("xl/sharedStrings.xml") ?? "";
  const shared: string[] = [];
  for (const m of sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    // 한 문자열이 여러 <t>로 쪼개져 있을 수 있다 (서식이 섞인 셀)
    const text = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => unesc(t[1])).join("");
    shared.push(text);
  }

  const sheetKey =
    [...map.keys()].find((k) => k === "xl/worksheets/sheet1.xml") ??
    [...map.keys()].find((k) => k.startsWith("xl/worksheets/"));
  if (!sheetKey) throw new Error("시트를 찾지 못했습니다");
  const sheet = map.get(sheetKey)!;

  const rows: string[][] = [];
  for (const rm of sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    /*
      ⚠️ 속성 부분을 **게으르게**(`*?`) 잡아야 한다. 욕심껏 잡으면 빈 셀
      `<c r="C2"/>`에서 닫는 `/`까지 먹어 버려 자체 닫힘 대안이 빗나가고, 뒤따르는
      셀을 통째로 삼킨다(값이 한 칸씩 밀린다). 엑셀은 빈 칸을 이 형태로 저장하므로
      실제 파일에서 바로 드러나는 자리다.
    */
    for (const cm of rm[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1];
      const body = cm[2] ?? "";
      const ref = /r="([A-Z]+)\d+"/.exec(attrs)?.[1] ?? "";
      // 열 문자를 0부터의 번호로 — 빈 칸이 건너뛰어져 있어도 자리가 맞는다
      let idx = 0;
      for (const ch of ref) idx = idx * 26 + (ch.charCodeAt(0) - 64);
      idx = Math.max(0, idx - 1);

      const type = /t="([^"]+)"/.exec(attrs)?.[1];
      let value = "";
      if (type === "inlineStr") {
        value = [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => unesc(t[1])).join("");
      } else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "";
        value = type === "s" ? (shared[Number(v)] ?? "") : unesc(v);
      }
      cells[idx] = value.trim();
    }
    for (let i = 0; i < cells.length; i++) if (cells[i] === undefined) cells[i] = "";
    rows.push(cells);
  }
  return rows;
}

/** 만든 파일을 내려받게 한다 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
