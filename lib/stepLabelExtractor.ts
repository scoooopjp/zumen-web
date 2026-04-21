/**
 * 工程ステップ説明文から図中ラベル値を抽出。
 * iOS `StepLabelExtractor` の完全ポート (ZUMEN/Features/BlueprintDetail/StepIllustrationView.swift)。
 */

/** 番手シーケンス: "#120→#240" / "#120→#240→#320" / "#120〜#240" / "#120/#240" 等 */
export function sandGrit(desc: string, fallback = "#120 → #240"): string {
  const seq = desc.match(/#\d{2,4}(?:\s*(?:→|->|〜|～|~|、|,|\/)\s*#?\d{2,4}){1,3}/);
  if (seq) {
    const nums = seq[0].match(/\d+/g);
    if (nums && nums.length >= 2) {
      return nums.map((n) => `#${n}`).join(" → ");
    }
  }
  const single = desc.match(/#\d{2,4}/);
  if (single) return single[0];
  return fallback;
}

/** 下穴径: "φ2.5mm" / "φ3.5mm" / "φ2.5〜3mm" / "φ12mm" 等。説明文に「下穴」があれば接頭 */
export function drillDiameter(desc: string, fallback = "下穴 φ3.5mm"): string {
  const m = desc.match(/φ\s*\d+(?:\.\d+)?(?:\s*[〜～~-]\s*\d+(?:\.\d+)?)?\s*mm/);
  if (!m) return fallback;
  const raw = m[0].replace(/\s/g, "");
  return desc.includes("下穴") ? `下穴 ${raw}` : raw;
}

/** 板間隔: "5mm 間隔" / "10mm間隔" / "隙間 5mm" / "5mmの隙間" 等 */
export function spacingLabel(desc: string, fallback = "5mm 間隔"): string {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*mm\s*間隔/,
    /間隔\s*(\d+(?:\.\d+)?)\s*mm/,
    /隙間\s*(\d+(?:\.\d+)?)\s*mm/,
    /(\d+(?:\.\d+)?)\s*mm\s*(?:の)?隙間/,
  ];
  for (const p of patterns) {
    const m = desc.match(p);
    if (m?.[1]) {
      const n = Number(m[1]);
      const s = Number.isInteger(n) ? String(n) : String(n);
      return `${s}mm 間隔`;
    }
  }
  return fallback;
}

/** ビス規格: "コーススレッド 51mm" / "ステンレスビス 65mm" / "ビス 65mm" 等 */
export function screwLabel(desc: string, fallback = "コーススレッド 51mm"): string {
  const patterns: Array<[RegExp, (n: number) => string]> = [
    [/コーススレッド\s*(\d{2,3})\s*mm/, (n) => `コーススレッド ${n}mm`],
    [/ステンレス(?:デッキ)?ビス\s*(\d{2,3})\s*mm/, (n) => `ステンレスビス ${n}mm`],
    [/ビス\s*(\d{2,3})\s*mm/, (n) => `ビス ${n}mm`],
  ];
  for (const [p, fmt] of patterns) {
    const m = desc.match(p);
    if (m?.[1]) return fmt(parseInt(m[1], 10));
  }
  return fallback;
}
