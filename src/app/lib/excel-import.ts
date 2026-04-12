import * as XLSX from "xlsx";

/* ─── Parsed structure ─── */
export interface ParsedColumn {
  name: string;              // header
  preview: string;           // first non-empty cell as string
  values: unknown[];         // all values in order
}

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, unknown>[];   // keyed by header
  columns: ParsedColumn[];
  rowCount: number;
  fileName: string;
}

/* ─── File parsing ─── */
export async function parseFile(file: File): Promise<ParsedSheet> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) throw new Error("빈 파일입니다");
  const ws = wb.Sheets[firstSheetName];

  // defval: "" ensures all keys are present even on blank cells
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
    raw: true,
  });

  if (raw.length === 0) {
    throw new Error("시트에 데이터가 없습니다");
  }

  // Derive headers from the first row's keys (xlsx preserves insertion order)
  const headers = Object.keys(raw[0]).map((h) => String(h).trim()).filter(Boolean);

  const columns: ParsedColumn[] = headers.map((h) => {
    const values = raw.map((r) => r[h]);
    const firstNonEmpty = values.find(
      (v) => v !== "" && v !== null && v !== undefined
    );
    return {
      name: h,
      preview: firstNonEmpty !== undefined ? stringifyCell(firstNonEmpty) : "",
      values,
    };
  });

  return {
    headers,
    rows: raw,
    columns,
    rowCount: raw.length,
    fileName: file.name,
  };
}

function stringifyCell(v: unknown): string {
  if (v instanceof Date) return isoDate(v);
  if (v === null || v === undefined) return "";
  return String(v);
}

/* ─── Normalizers (handle varied input formats) ─── */

/** Parse amount strings like "32,000,000", "3200만", "₩32,000,000", "3.2억" → number (원) */
export function normalizeAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && isFinite(value)) return Math.round(value);

  const raw = String(value).trim();
  if (!raw) return null;

  // Strip currency symbols, spaces, commas, VAT notes, misc
  const cleaned = raw
    .replace(/₩|원|KRW|\\|\s/gi, "")
    .replace(/,/g, "")
    .replace(/\(.+?\)/g, ""); // remove "(VAT포함)" etc

  // Match Korean unit suffixes: 억, 천만, 만
  const eok = /(-?\d+(?:\.\d+)?)억/.exec(cleaned);
  const man = /(-?\d+(?:\.\d+)?)만/.exec(cleaned);
  let total = 0;
  let matched = false;

  if (eok) {
    total += parseFloat(eok[1]) * 100_000_000;
    matched = true;
  }
  if (man) {
    total += parseFloat(man[1]) * 10_000;
    matched = true;
  }
  if (matched) return Math.round(total);

  const n = parseFloat(cleaned);
  return isFinite(n) ? Math.round(n) : null;
}

/** Format number (원) as display string "₩3,200만" */
export function formatAmountKrw(n: number): string {
  if (n >= 100_000_000) {
    const eok = n / 100_000_000;
    return `₩${trimZero(eok)}억`;
  }
  if (n >= 10_000) {
    const man = Math.round(n / 10_000);
    return `₩${man.toLocaleString("ko-KR")}만`;
  }
  return `₩${n.toLocaleString("ko-KR")}`;
}

function trimZero(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}

/** Parse dates in many formats → "YYYY-MM-DD" */
export function normalizeDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date && !isNaN(value.getTime())) return isoDate(value);

  // Excel serial date (number)
  if (typeof value === "number" && isFinite(value) && value > 0 && value < 100000) {
    const d = excelSerialToDate(value);
    if (d) return isoDate(d);
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // Korean: "2026년 3월 15일"
  const kMatch = /^(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일?/.exec(raw);
  if (kMatch) return pad(kMatch[1], kMatch[2], kMatch[3]);

  // Numeric separators: 2026-03-15, 2026/3/15, 2026.3.15, 26.3.15
  const sep = /^(\d{2,4})[-./](\d{1,2})[-./](\d{1,2})/.exec(raw);
  if (sep) {
    let y = sep[1];
    if (y.length === 2) y = (parseInt(y) >= 50 ? "19" : "20") + y;
    return pad(y, sep[2], sep[3]);
  }

  // Fallback to Date constructor
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return isoDate(d);
  return null;
}

function pad(y: string, m: string, d: string): string {
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function excelSerialToDate(serial: number): Date | null {
  // Excel epoch is 1899-12-30 (accounting for the 1900 leap bug)
  const ms = (serial - 25569) * 86400 * 1000;
  const d = new Date(ms);
  return isNaN(d.getTime()) ? null : d;
}

/** Parse quantity → integer */
export function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && isFinite(value)) return Math.round(value);
  const cleaned = String(value).replace(/,/g, "").trim();
  const n = parseFloat(cleaned);
  return isFinite(n) ? Math.round(n) : null;
}

/** Phone: strip spaces, keep digits + hyphens */
export function normalizePhone(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, "").trim();
}

/** Trim and lowercase email */
export function normalizeEmail(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
}

export function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return isoDate(value);
  return String(value).trim();
}

/* ─── Transform rows → Deal-like records ─── */

export interface FieldMapping {
  dealflowKey: string;       // e.g. "company", "amount"
  dealflowLabel: string;     // e.g. "기업명"
  excelColumn: string;       // selected source column (or "" if skipped)
  type: "text" | "number" | "amount" | "date" | "phone" | "email" | "select" | "person";
  required: boolean;
}

export interface TransformWarning {
  rowIndex: number;
  field: string;
  reason: string;
}

export interface TransformResult<T> {
  records: T[];
  warnings: TransformWarning[];
  skipped: number;
}

/**
 * Transform parsed rows into Deal-shaped records using field mappings.
 * Unmapped columns and fields without matches are stored under `extra` keys.
 */
export function transformRows(
  rows: Record<string, unknown>[],
  mappings: FieldMapping[],
  options: {
    stageAlias?: Record<string, string>;  // "제안" → "견적서 발송"
    defaultStage?: string;
    defaultStatus?: string;
  } = {}
): TransformResult<Record<string, unknown>> {
  const warnings: TransformWarning[] = [];
  let skipped = 0;
  const records: Record<string, unknown>[] = [];

  const companyMap = mappings.find((m) => m.dealflowKey === "company");

  rows.forEach((row, idx) => {
    // Skip entirely empty rows
    const hasAny = Object.values(row).some((v) => v !== "" && v != null);
    if (!hasAny) {
      skipped++;
      return;
    }

    const out: Record<string, unknown> = {};

    for (const m of mappings) {
      if (!m.excelColumn) continue;
      const raw = row[m.excelColumn];

      switch (m.type) {
        case "amount": {
          const n = normalizeAmount(raw);
          if (n === null && raw !== "" && raw != null) {
            warnings.push({ rowIndex: idx, field: m.dealflowLabel, reason: `금액 형식을 해석할 수 없습니다: "${raw}"` });
            out[m.dealflowKey] = "";
          } else if (n !== null) {
            out[m.dealflowKey] = formatAmountKrw(n);
            out[`${m.dealflowKey}_raw`] = n;
          }
          break;
        }
        case "date": {
          const d = normalizeDate(raw);
          if (d === null && raw !== "" && raw != null) {
            warnings.push({ rowIndex: idx, field: m.dealflowLabel, reason: `날짜 형식을 해석할 수 없습니다: "${raw}"` });
            out[m.dealflowKey] = "";
          } else {
            out[m.dealflowKey] = d ?? "";
          }
          break;
        }
        case "number": {
          const n = normalizeNumber(raw);
          if (n === null && raw !== "" && raw != null) {
            warnings.push({ rowIndex: idx, field: m.dealflowLabel, reason: `숫자 형식이 아닙니다: "${raw}"` });
            out[m.dealflowKey] = 0;
          } else {
            out[m.dealflowKey] = n ?? 0;
          }
          break;
        }
        case "phone":
          out[m.dealflowKey] = normalizePhone(raw);
          break;
        case "email":
          out[m.dealflowKey] = normalizeEmail(raw);
          break;
        case "select":
          if (m.dealflowKey === "stage") {
            const s = normalizeText(raw);
            const mapped = options.stageAlias?.[s] ?? s;
            out[m.dealflowKey] = mapped || options.defaultStage || "";
          } else if (m.dealflowKey === "status") {
            const s = normalizeText(raw);
            out[m.dealflowKey] = coerceStatus(s) || options.defaultStatus || "진행중";
          } else {
            out[m.dealflowKey] = normalizeText(raw);
          }
          break;
        default:
          out[m.dealflowKey] = normalizeText(raw);
      }
    }

    // Required-field gate: require company at minimum
    if (companyMap && !out["company"]) {
      warnings.push({ rowIndex: idx, field: "기업명", reason: "필수값 누락 — 이 행은 건너뜁니다" });
      skipped++;
      return;
    }

    // Defaults
    if (!out["stage"] && options.defaultStage) out["stage"] = options.defaultStage;
    if (!out["status"]) out["status"] = options.defaultStatus || "진행중";
    if (!out["date"]) out["date"] = isoDate(new Date());

    records.push(out);
  });

  return { records, warnings, skipped };
}

function coerceStatus(v: string): string {
  const low = v.toLowerCase();
  if (!v) return "";
  if (["성공", "완료", "수주", "won", "win", "closed-won", "success"].some((k) => low.includes(k.toLowerCase()) || v.includes(k))) return "성공";
  if (["실패", "취소", "lost", "lose", "fail", "closed-lost"].some((k) => low.includes(k.toLowerCase()) || v.includes(k))) return "실패";
  if (["진행", "협상", "검토", "open", "in progress", "active"].some((k) => low.includes(k.toLowerCase()) || v.includes(k))) return "진행중";
  return "";
}

/* ─── Detect unmapped / unknown values for a select field ─── */
export function detectUnknownValues(
  rows: Record<string, unknown>[],
  excelColumn: string,
  knownValues: string[]
): string[] {
  if (!excelColumn) return [];
  const seen = new Set<string>();
  for (const r of rows) {
    const raw = r[excelColumn];
    if (raw === null || raw === undefined || raw === "") continue;
    seen.add(normalizeText(raw));
  }
  const knownSet = new Set(knownValues);
  return Array.from(seen).filter((v) => !knownSet.has(v));
}
