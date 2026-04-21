"use client";

/**
 * StepIllustration — 工程ステップのビジュアルイラスト
 *
 * 優先順: Lottie アニメーション (public/lottie/{type}.json があれば) → SVG 静止画。
 * SVG は iOS `StepIllustrationView.swift` の Canvas 描画を忠実移植したもの。
 * illustrationType (Firestore由来) を優先し、なければキーワード判定にフォールバック。
 */

import { useEffect, useRef, useState } from "react";

// Lottie アセットが存在するタイプ（追加したら public/lottie に同名 JSON を置く）
const LOTTIE_AVAILABLE: ReadonlySet<string> = new Set([
  "measure", "markLine", "cut", "sand", "drill", "foundation", "levelCheck",
  "topBoard", "frame", "wallMount", "waterproof", "paint", "inspect", "screw", "complete",
]);

// Lottie 版ではテキストを HTML オーバーレイで描画する（フォント依存回避）。
// SVG フォールバック版は Diagram 内にテキストが既に埋め込まれている。
const LOTTIE_CAPTIONS: Partial<Record<IllType, string>> = {
  markLine: "さしがね使用",
  cut: "ホームセンターでカット可",
  sand: "#120 → #240",
  drill: "下穴 φ3.5mm",
  levelCheck: "水平 ✓",
  topBoard: "5mm 間隔",
  frame: "直角を確認",
  wallMount: "下地に固定",
  waterproof: "2度塗り必須",
  paint: "ワトコオイル・ニス",
  inspect: "ぐらつきなし ✓",
  screw: "コーススレッド 51mm",
  complete: "完成！おめでとう",
};

function resolveCaption(type: IllType, dimensions?: { width: number; depth: number; height: number }): string | undefined {
  if (type === "measure") {
    return dimensions ? `W ${dimensions.width} mm` : "W × D × H";
  }
  return LOTTIE_CAPTIONS[type];
}

/**
 * lottie-web を直接ロードして `container` にマウント。
 * SSR で window 不在時は何もしない。cleanup で destroy。
 */
function LottiePlayer({ type }: { type: IllType }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    let cancelled = false;
    let anim: { destroy: () => void } | null = null;
    (async () => {
      try {
        const [mod, res] = await Promise.all([
          import("lottie-web"),
          fetch(`/lottie/${type}.json`, { cache: "default" }),
        ]);
        if (cancelled || !ref.current || !res.ok) { if (!res.ok) setFailed(true); return; }
        const animationData = await res.json();
        if (cancelled || !ref.current) return;
        // lottie-web は UMD — Turbopack の default 解決揺れに両対応
        type LottieLike = { loadAnimation: (opts: unknown) => { destroy: () => void } };
        const lottie = ((mod as unknown as { default?: LottieLike }).default ?? (mod as unknown as LottieLike));
        anim = lottie.loadAnimation({
          container: ref.current,
          renderer: "svg",
          loop: true,
          autoplay: true,
          animationData,
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      anim?.destroy();
    };
  }, [type]);
  if (failed) return null;
  // 親フレックスの cross-axis が stretch しないので、iOS viewBox(180×140) のアスペクト比を明示。
  return (
    <div
      ref={ref}
      style={{ width: "100%", aspectRatio: "180 / 140", maxHeight: 132 }}
      aria-hidden="true"
    />
  );
}

type IllType =
  | "measure" | "markLine" | "cut" | "sand" | "drill"
  | "foundation" | "levelCheck" | "topBoard" | "frame"
  | "wallMount" | "waterproof" | "paint" | "inspect"
  | "screw" | "complete"
  | "assemble" | "install"; // legacy alias

interface StepTheme {
  bgLight: string;
  bgDark: string;
  accent: string;
  secondary: string;
  label: string;
  actionLabel: string;
}

/**
 * iOS `StepTheme(type:)` と完全対応。Color(red, green, blue) (0-1) を
 * #RRGGBB に変換済み。label / actionLabel は iOS `IllType` と同一。
 */
const THEMES: Record<IllType, StepTheme> = {
  measure:    { bgLight: "#E6F2FF", bgDark: "#CCE6FA", accent: "#2E78C7", secondary: "#99C7F2", label: "採寸",     actionLabel: "採寸する"   },
  markLine:   { bgLight: "#F0E6FF", bgDark: "#DBD1FA", accent: "#7A40C7", secondary: "#C7A6F2", label: "墨付け",   actionLabel: "線を引く"   },
  cut:        { bgLight: "#FFF2DE", bgDark: "#FFE0BF", accent: "#D96110", secondary: "#FAAD66", label: "カット",   actionLabel: "カットする" },
  sand:       { bgLight: "#FFF7E0", bgDark: "#FAEBBF", accent: "#C78514", secondary: "#F2BF61", label: "研磨",     actionLabel: "やすりがけ" },
  drill:      { bgLight: "#242938", bgDark: "#141A29", accent: "#38D9BF", secondary: "#26998C", label: "穴あけ",   actionLabel: "穴をあける" },
  foundation: { bgLight: "#EBDBC7", bgDark: "#CCB394", accent: "#664221", secondary: "#A67A4D", label: "基礎",     actionLabel: "整地・基礎" },
  levelCheck: { bgLight: "#E0EBFA", bgDark: "#C7D6F5", accent: "#385AAD", secondary: "#8CADE6", label: "水平確認", actionLabel: "水平を確認" },
  topBoard:   { bgLight: "#FAF0DB", bgDark: "#EBD6AD", accent: "#8C591E", secondary: "#CC9959", label: "天板取付", actionLabel: "天板を張る" },
  frame:      { bgLight: "#FFEBE6", bgDark: "#FAD6CC", accent: "#B8332E", secondary: "#EB998C", label: "組立",     actionLabel: "枠を組む"   },
  wallMount:  { bgLight: "#E6F7EB", bgDark: "#CCEBD6", accent: "#2E8C52", secondary: "#80CC99", label: "壁固定",   actionLabel: "壁に固定"   },
  waterproof: { bgLight: "#DBF5FA", bgDark: "#BDE6F5", accent: "#1485A6", secondary: "#66C7E0", label: "防腐処理", actionLabel: "防腐処理"   },
  paint:      { bgLight: "#E6FAEB", bgDark: "#CCF2D6", accent: "#1F9E61", secondary: "#73D194", label: "塗装",     actionLabel: "塗装仕上げ" },
  inspect:    { bgLight: "#F2E6FA", bgDark: "#E0D1F5", accent: "#732EB8", secondary: "#B88CEB", label: "安全確認", actionLabel: "安全確認"   },
  screw:      { bgLight: "#E6EBF5", bgDark: "#CCD6EB", accent: "#47618C", secondary: "#8CA6CC", label: "ビス固定", actionLabel: "ビス固定"   },
  complete:   { bgLight: "#FFFAE0", bgDark: "#FAF0B8", accent: "#A67A0D", secondary: "#E6B833", label: "完成",     actionLabel: "完成！"     },
  // legacy
  assemble:   { bgLight: "#FFEBE6", bgDark: "#FAD6CC", accent: "#B8332E", secondary: "#EB998C", label: "組立",     actionLabel: "枠を組む"   },
  install:    { bgLight: "#E6F7EB", bgDark: "#CCEBD6", accent: "#2E8C52", secondary: "#80CC99", label: "取付",     actionLabel: "壁に固定"   },
};

/* ── キーワード判定（illustrationType 未指定時のフォールバック） ── */
function detectType(title: string, desc: string, order: number, total: number): IllType {
  if (order === total) return "complete";
  const t = `${title} ${desc}`;
  if (/採寸|メジャー|寸法|測定/.test(t))                   return "measure";
  if (/墨|マーク|印|ライン/.test(t))                        return "markLine";
  if (/カット|のこ|切断|丸ノコ/.test(t))                    return "cut";
  if (/やすり|サンドペーパー|磨|研磨/.test(t))              return "sand";
  if (/穴|ドリル|ビット|下穴/.test(t))                      return "drill";
  if (/束石|整地|根太|砕石|基礎/.test(t))                   return "foundation";
  if (/水平|レベル|傾き/.test(t))                            return "levelCheck";
  if (/天板|座板|デッキ板|張り/.test(t))                    return "topBoard";
  if (/フレーム|枠|箱組|組み立て/.test(t))                  return "frame";
  if (/壁|下地|l字|アンカー|転倒防止/.test(t))              return "wallMount";
  if (/防腐|防水|キシラ|ウッドオイル/.test(t))              return "waterproof";
  if (/塗装|オイル|ニス|ワトコ|ペンキ/.test(t))             return "paint";
  if (/確認|ぐらつき|安全|チェック/.test(t))                return "inspect";
  if (/ビス|ネジ|固定|コーススレッド|ドライバー/.test(t))   return "screw";
  if (order === 1) return "measure";
  if (order === 2) return "sand";
  return "screw";
}

/* ── SVG ダイアグラム（iOS Canvas サイズ ~180×140 pt を正） ── */
const W = 180;
const H = 140;

type DiagramProps = {
  accent: string;
  secondary: string;
  dimensions?: { width: number; depth: number; height: number };
};

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      style={{ maxWidth: "100%", maxHeight: "100%" }}
    >
      {children}
    </svg>
  );
}

const Diagrams: Record<IllType, React.FC<DiagramProps>> = {
  // 採寸: 定規 + 板 + 寸法矢印
  measure: ({ accent, secondary, dimensions }) => {
    const cx = W / 2, cy = H / 2;
    const boardY = cy - 10, boardH = 30, boardW = W * 0.72;
    const bx = cx - boardW / 2;
    const arrowY = boardY + boardH + 14;
    const rulerY = boardY - 16;
    const ticks = Math.max(8, Math.floor(boardW / 12));
    const step = boardW / ticks;
    const label = dimensions ? `W ${dimensions.width} mm` : "W × D × H";
    return (
      <Svg>
        <rect x={bx - 4} y={rulerY - 6} width={boardW + 8} height="14" rx="3" fill={secondary} fillOpacity="0.5"/>
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const tx = bx + i * step;
          const th = i % 5 === 0 ? 8 : 4;
          return <line key={i} x1={tx} y1={rulerY - 2} x2={tx} y2={rulerY - 2 + th} stroke={accent} strokeOpacity="0.8" strokeWidth="0.8"/>;
        })}
        <rect x={bx} y={boardY} width={boardW} height={boardH} fill={accent} fillOpacity="0.25" stroke={accent} strokeOpacity="0.6" strokeWidth="1.5"/>
        <line x1={bx} y1={boardY + boardH} x2={bx} y2={arrowY + 5} stroke={accent} strokeOpacity="0.7" strokeWidth="1.2"/>
        <line x1={bx + boardW} y1={boardY + boardH} x2={bx + boardW} y2={arrowY + 5} stroke={accent} strokeOpacity="0.7" strokeWidth="1.2"/>
        <line x1={bx} y1={arrowY} x2={bx + boardW} y2={arrowY} stroke={accent} strokeWidth="1.8"/>
        <polygon points={`${bx},${arrowY} ${bx + 8},${arrowY - 5} ${bx + 8},${arrowY + 5}`} fill={accent}/>
        <polygon points={`${bx + boardW},${arrowY} ${bx + boardW - 8},${arrowY - 5} ${bx + boardW - 8},${arrowY + 5}`} fill={accent}/>
        <text x={cx} y={arrowY + 16} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="700" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fill={accent}>{label}</text>
      </Svg>
    );
  },

  // 墨付け: 板 + 3本の墨線 + ▼マーカー + 鉛筆
  markLine: ({ accent }) => {
    const cx = W / 2, cy = H / 2;
    const boardW = W * 0.70, boardH = 40;
    const bx = cx - boardW / 2, by = cy - boardH / 2 + 8;
    const lineXs = [0.28, 0.55, 0.75].map(p => bx + boardW * p);
    const pencilX = bx + boardW * 0.55, pencilY = by - 22;
    return (
      <Svg>
        <rect x={bx} y={by} width={boardW} height={boardH} fill={accent} fillOpacity="0.15" stroke={accent} strokeOpacity="0.4" strokeWidth="1.2"/>
        {lineXs.map((lx, i) => (
          <g key={i}>
            <line x1={lx} y1={by + 4} x2={lx} y2={by + boardH - 4} stroke={accent} strokeWidth="1.8"/>
            <text x={lx} y={by - 2} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill={accent} fillOpacity="0.85">▼</text>
          </g>
        ))}
        <g transform={`translate(${pencilX} ${pencilY}) rotate(40)`}>
          <rect x="-4" y="-34" width="8" height="6" fill="#EB999F"/>
          <rect x="-4" y="-28" width="8" height="28" fill="#F2D926"/>
          <polygon points="-4,0 4,0 0,10" fill="#EBC799"/>
          <polygon points="-1.5,8 1.5,8 0,10" fill="#000" fillOpacity="0.7"/>
        </g>
        <text x={cx} y={by + boardH + 16} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="500" fill={accent} fillOpacity="0.8">さしがね使用</text>
      </Svg>
    );
  },

  // カット: 板 + 切断ライン + のこぎり + 切り屑
  cut: ({ accent, secondary }) => {
    const cx = W / 2, cy = H / 2;
    const boardW = W * 0.68, boardH = 34;
    const bx = cx - boardW / 2, by = cy;
    const cutX = bx + boardW * 0.42;
    const sawX = cutX - 2, sawTop = by - 34;
    return (
      <Svg>
        <text x={cx} y={by - 52} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="500" fill={accent} fillOpacity="0.85">ホームセンター</text>
        <text x={cx} y={by - 40} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="500" fill={accent} fillOpacity="0.85">カットサービスOK</text>
        <rect x={bx} y={by} width={boardW} height={boardH} fill={accent} fillOpacity="0.20" stroke={accent} strokeOpacity="0.5" strokeWidth="1.5"/>
        <line x1={cutX} y1={by - 8} x2={cutX} y2={by + boardH + 8} stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 3"/>
        <g transform={`translate(${sawX} ${sawTop})`}>
          <rect x="-3" y="-16" width="6" height="16" fill="#664730"/>
          <rect x="-20" y="0" width="36" height="8" fill="#B3B8C2"/>
          {Array.from({ length: 6 }, (_, i) => {
            const tx = -20 + i * 6;
            return <polygon key={i} points={`${tx},8 ${tx + 3},14 ${tx + 6},8`} fill="#999EA6"/>;
          })}
        </g>
        {[[-10, 4], [4, 8], [14, 3], [-18, 6]].map(([dx, dy], i) => (
          <ellipse key={i} cx={cutX + dx} cy={by + boardH + dy} rx="3" ry="1.5" fill={secondary} fillOpacity="0.8"/>
        ))}
      </Svg>
    );
  },

  // 研磨: 半分研磨済みの板 + サンディングブロック + 摩擦矢印
  sand: ({ accent, secondary }) => {
    const cx = W / 2, cy = H / 2;
    const boardW = W * 0.70, boardH = 28;
    const bx = cx - boardW / 2, by = cy + 8;
    const sandedW = boardW * 0.55;
    const sbW = boardW * 0.32, sbH = 24;
    const sbX = bx + sandedW - 18, sbY = by - 30;
    const arrowXs = [bx + 8, bx + boardW * 0.25, bx + boardW * 0.42];
    return (
      <Svg>
        <rect x={bx} y={by} width={boardW} height={boardH} fill={accent} fillOpacity="0.25"/>
        <rect x={bx} y={by} width={sandedW} height={boardH} fill={secondary} fillOpacity="0.35"/>
        <rect x={bx} y={by} width={boardW} height={boardH} fill="none" stroke={accent} strokeOpacity="0.5" strokeWidth="1.2"/>
        <rect x={sbX} y={sbY} width={sbW} height={sbH * 0.45} fill="#9E572E"/>
        <rect x={sbX} y={sbY + sbH * 0.45} width={sbW} height={sbH * 0.55} fill={accent} fillOpacity="0.55"/>
        {Array.from({ length: 12 }, (_, i) => {
          const dx = sbX + (i % 6) * (sbW / 6) + 4;
          const dy = sbY + sbH * 0.5 + Math.floor(i / 6) * 8 + 2;
          return <circle key={i} cx={dx} cy={dy} r="1.5" fill={accent} fillOpacity="0.7"/>;
        })}
        {arrowXs.map((ax, i) => (
          <g key={i}>
            <line x1={ax} y1={by - 6} x2={ax + 14} y2={by - 6} stroke={accent} strokeOpacity="0.6" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2"/>
            <polygon points={`${ax + 14},${by - 6} ${ax + 10},${by - 10} ${ax + 10},${by - 2}`} fill={accent} fillOpacity="0.6"/>
          </g>
        ))}
        <text x={cx} y={by + boardH + 16} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="700" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fill={accent}>#120 → #240</text>
      </Svg>
    );
  },

  // 穴あけ: ドリルビット + 板 + 穴 + 切り粉
  drill: ({ accent }) => {
    const cx = W / 2, cy = H / 2;
    const boardW = W * 0.68, boardH = 28;
    const bx = cx - boardW / 2, by = cy + 12;
    return (
      <Svg>
        <ellipse cx={cx} cy={by - 20} rx="22" ry="22" fill={accent} fillOpacity="0.15"/>
        <rect x={bx} y={by} width={boardW} height={boardH} fill="#946B3D" fillOpacity="0.7" stroke={accent} strokeOpacity="0.4" strokeWidth="1"/>
        <rect x={cx - 3} y={by - 44} width="6" height="38" fill={accent} fillOpacity="0.9"/>
        <polygon points={`${cx - 5},${by - 6} ${cx + 5},${by - 6} ${cx},${by + 4}`} fill={accent}/>
        {Array.from({ length: 5 }, (_, i) => {
          const fy = by - 10 - i * 7;
          return <line key={i} x1={cx - 3} y1={fy} x2={cx + 3} y2={fy - 4} stroke="#000" strokeOpacity="0.3" strokeWidth="1"/>;
        })}
        <ellipse cx={cx} cy={by - 5} rx="8" ry="7" fill={accent} fillOpacity="0.25"/>
        <ellipse cx={cx} cy={by + 5} rx="5" ry="3" fill="#000" fillOpacity="0.65"/>
        {[[-12, -5], [8, -8], [-6, -2], [14, -3]].map(([dx, dy], i) => (
          <ellipse key={i} cx={cx + dx} cy={by + dy} rx="2.5" ry="1" fill={accent} fillOpacity="0.85"/>
        ))}
        <text x={cx} y={by + boardH + 16} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="700" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fill={accent}>下穴 φ3.5mm</text>
      </Svg>
    );
  },

  // 基礎: 地面断面 + 砕石 + 束石 + 柱 + GL 線
  foundation: ({ accent }) => {
    const cx = W / 2, cy = H / 2;
    const groundY = cy + 12;
    const stoneY = cy + 26;
    return (
      <Svg>
        <rect x="8" y={groundY} width={W - 16} height={H - groundY - 8} fill="#73522E" fillOpacity="0.6"/>
        <rect x="8" y={groundY} width={W - 16} height="14" fill="#9E8C7A" fillOpacity="0.7"/>
        {[[-28, 4], [-14, 7], [0, 3], [16, 6], [28, 4], [-8, 9], [8, 8]].map(([gx, gy], i) => (
          <ellipse key={i} cx={cx + gx} cy={groundY + gy} rx="5" ry="3" fill="#C7B8A6" fillOpacity="0.8"/>
        ))}
        <rect x={cx - 8} y={cy - 24} width="16" height={stoneY - cy + 24} fill={accent} fillOpacity="0.75" stroke={accent} strokeWidth="1.2"/>
        <rect x={cx - 20} y={stoneY} width="40" height="18" fill="#ADA399" stroke="#000" strokeOpacity="0.3" strokeWidth="1"/>
        <text x={cx} y={stoneY + 9} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="700" fill="#FFF" fillOpacity="0.9">束石</text>
        <line x1="12" y1={groundY + 2} x2={W - 12} y2={groundY + 2} stroke="#5C8CCC" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="4 3"/>
        <text x="20" y={groundY - 3} textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="700" fill="#5C8CCC" fillOpacity="0.7">GL</text>
      </Svg>
    );
  },

  // 水平確認: 板 + 水平器 + 気泡
  levelCheck: ({ accent }) => {
    const cx = W / 2, cy = H / 2;
    const boardW = W * 0.70, boardH = 20;
    const bx = cx - boardW / 2, by = cy + 8;
    const levW = boardW * 0.80, levH = 18;
    const levX = cx - levW / 2, levY = by - levH - 4;
    return (
      <Svg>
        <rect x={bx} y={by} width={boardW} height={boardH} fill={accent} fillOpacity="0.25" stroke={accent} strokeOpacity="0.5" strokeWidth="1.5"/>
        <rect x={levX} y={levY} width={levW} height={levH} fill="#4080CC" fillOpacity="0.85" stroke="#FFF" strokeOpacity="0.4" strokeWidth="0.8"/>
        <rect x={cx - 18} y={levY + 4} width="36" height="10" fill="#FFF" fillOpacity="0.3" stroke="#FFF" strokeOpacity="0.7" strokeWidth="0.8"/>
        <ellipse cx={cx} cy={levY + 9} rx="5" ry="3" fill="#9EE06B" fillOpacity="0.9"/>
        <line x1={cx - 1} y1={levY + 4} x2={cx - 1} y2={levY + 14} stroke="#FFF" strokeOpacity="0.9" strokeWidth="1"/>
        <line x1={cx + 1} y1={levY + 4} x2={cx + 1} y2={levY + 14} stroke="#FFF" strokeOpacity="0.9" strokeWidth="1"/>
        <text x={cx} y={by + boardH + 16} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="700" fill={accent}>水平 ✓</text>
      </Svg>
    );
  },

  // 天板取付: 両脇フレーム + 4枚デッキ (末尾が上から降りてくる) + 下矢印
  topBoard: ({ accent }) => {
    const cx = W / 2, cy = H / 2;
    const fW = W * 0.64, fH = 30;
    const fx = cx - fW / 2, fy = cy + 4;
    const slats = 4;
    const slatW = (fW - 8) / slats - 3;
    const slatStep = slatW + 3;
    const lastX = fx + 6 + (slats - 1) * slatStep + slatW / 2;
    return (
      <Svg>
        <rect x={fx} y={fy} width="12" height={fH} fill={accent} fillOpacity="0.5"/>
        <rect x={fx + fW - 12} y={fy} width="12" height={fH} fill={accent} fillOpacity="0.5"/>
        {Array.from({ length: slats }, (_, i) => {
          const sx = fx + 6 + i * slatStep;
          const last = i === slats - 1;
          const offset = last ? -12 : 0;
          const alpha = last ? 0.5 : 0.85;
          return (
            <rect key={i} x={sx} y={fy - 18 + offset} width={slatW} height={fH + 4}
              fill={accent} fillOpacity={alpha} stroke={accent} strokeWidth="0.8"/>
          );
        })}
        <line x1={lastX} y1={fy - 36} x2={lastX} y2={fy - 22} stroke={accent} strokeWidth="2"/>
        <polygon points={`${lastX},${fy - 22} ${lastX - 6},${fy - 30} ${lastX + 6},${fy - 30}`} fill={accent}/>
        <text x={cx} y={fy + fH + 16} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="700" fill={accent} fillOpacity="0.8">5mm 間隔</text>
      </Svg>
    );
  },

  // 組立: L字接合 + 4本のビス + 90°マーク
  frame: ({ accent }) => {
    const cx = W / 2, cy = H / 2;
    const thick = 14;
    const screwPositions: [number, number][] = [
      [cx - 28, cy - 37], [cx + 28, cy - 37],
      [cx - 7, cy - 22], [cx + 7, cy - 22],
    ];
    return (
      <Svg>
        <rect x={cx - thick / 2} y={cy - 44} width={thick} height="70" fill={accent} fillOpacity="0.6" stroke={accent} strokeWidth="1.2"/>
        <rect x={cx - 44} y={cy - 44} width="88" height={thick} fill={accent} fillOpacity="0.6" stroke={accent} strokeWidth="1.2"/>
        {screwPositions.map(([sx, sy], i) => (
          <g key={i}>
            <circle cx={sx} cy={sy} r="4" fill="#9EA6B3"/>
            <line x1={sx - 2.5} y1={sy} x2={sx + 2.5} y2={sy} stroke="#FFF" strokeOpacity="0.8" strokeWidth="1.2"/>
            <line x1={sx} y1={sy - 2.5} x2={sx} y2={sy + 2.5} stroke="#FFF" strokeOpacity="0.8" strokeWidth="1.2"/>
          </g>
        ))}
        <text x={cx + 28} y={cy - 28} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="700" fill={accent}>90°</text>
        <text x={cx} y={cy + 36} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="700" fill={accent} fillOpacity="0.85">直角を確認</text>
      </Svg>
    );
  },

  // 壁固定: 壁断面 + 下地(スタッド) + 板 + Lブラケット + アンカー
  wallMount: ({ accent }) => {
    const cx = W / 2, cy = H / 2;
    const bW = W * 0.52, bH = 56;
    const bX = 28, bY = cy - bH / 2;
    const brY = bY + 8;
    return (
      <Svg>
        <rect x="6" y="6" width="20" height={H - 12} fill="#E6E0D6" fillOpacity="0.9" stroke="#999" strokeOpacity="0.4" strokeWidth="0.8"/>
        <rect x="10" y="20" width="12" height={H - 40} fill="#CC9E66" fillOpacity="0.7"/>
        <rect x={bX} y={bY} width={bW} height={bH} fill={accent} fillOpacity="0.35" stroke={accent} strokeWidth="1.5"/>
        <rect x="18" y={brY} width="14" height="6" fill="#8C919E"/>
        <rect x="18" y={brY} width="6" height="20" fill="#8C919E"/>
        <circle cx="16" cy={brY + 6} r="4" fill="#BFBFCC"/>
        <circle cx="16" cy={brY + bH - 16} r="4" fill="#BFBFCC"/>
        <text x={bX + bW / 2 + 14} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="700" fill={accent}>下地に固定</text>
      </Svg>
    );
  },

  // 防腐処理: 板(半分塗布済) + 刷毛 + しずく
  waterproof: ({ accent }) => {
    const cx = W / 2, cy = H / 2;
    const boardW = W * 0.68, boardH = 32;
    const bx = cx - boardW / 2, by = cy + 4;
    const coatedW = boardW * 0.55;
    return (
      <Svg>
        <rect x={bx} y={by} width={boardW} height={boardH} fill={accent} fillOpacity="0.30"/>
        <rect x={bx} y={by} width={coatedW} height={boardH} fill={accent} fillOpacity="0.60"/>
        <rect x={bx} y={by} width={boardW} height={boardH} fill="none" stroke={accent} strokeOpacity="0.7" strokeWidth="1.2"/>
        <g transform={`translate(${bx + coatedW + 4} ${by - 24}) rotate(25)`}>
          <rect x="-5" y="-30" width="10" height="30" fill="#805933"/>
          <rect x="-7" y="0" width="14" height="12" fill="#4D3826"/>
          {Array.from({ length: 5 }, (_, i) => {
            const bx2 = -6 + i * 3.2;
            return <line key={i} x1={bx2} y1="12" x2={bx2 + 1} y2="20" stroke="#33261A" strokeWidth="1.5"/>;
          })}
        </g>
        {[[coatedW * 0.3, 4], [coatedW * 0.6, 8]].map(([dx, dy], i) => (
          <ellipse key={i} cx={bx + dx} cy={by + boardH + dy + 3} rx="3" ry="4" fill={accent} fillOpacity="0.55"/>
        ))}
        <text x={cx} y={by + boardH + 20} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="700" fill={accent}>2度塗り必須</text>
      </Svg>
    );
  },

  // 塗装: 縞状に塗られた板 + 刷毛
  paint: ({ accent }) => {
    const cx = W / 2, cy = H / 2;
    const boardW = W * 0.68, boardH = 30;
    const bx = cx - boardW / 2, by = cy + 6;
    const stripeAlphas = [0.85, 0.70, 0.90, 0.75];
    return (
      <Svg>
        <rect x={bx} y={by} width={boardW} height={boardH} fill="#C7944D" fillOpacity="0.5"/>
        {stripeAlphas.map((a, i) => {
          const sw = boardW * 0.22;
          const sx = bx + i * (boardW * 0.24);
          return <rect key={i} x={sx} y={by + 3} width={sw} height={boardH - 6} fill={accent} fillOpacity={a}/>;
        })}
        <rect x={bx} y={by} width={boardW} height={boardH} fill="none" stroke={accent} strokeOpacity="0.5" strokeWidth="1"/>
        <g transform={`translate(${bx + boardW * 0.65} ${by - 28}) rotate(-30)`}>
          <rect x="-5" y="-32" width="10" height="32" fill="#734D29"/>
          <rect x="-7" y="0" width="14" height="10" fill="#999" fillOpacity="0.6"/>
          {Array.from({ length: 6 }, (_, i) => {
            const bx3 = -6 + i * 2.4;
            return <line key={i} x1={bx3} y1="10" x2={bx3 + 1} y2="18" stroke={accent} strokeOpacity="0.9" strokeWidth="1.8"/>;
          })}
        </g>
        <text x={cx} y={by + boardH + 16} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="700" fill={accent} fillOpacity="0.85">ワトコオイル・ニス</text>
      </Svg>
    );
  },

  // 安全確認: 棚シルエット + 大きなチェックマーク
  inspect: ({ accent }) => {
    const cx = W / 2, cy = H / 2;
    return (
      <Svg>
        <rect x={cx - 30} y={cy - 28} width="60" height="8" fill={accent} fillOpacity="0.4"/>
        <rect x={cx - 30} y={cy - 4} width="60" height="8" fill={accent} fillOpacity="0.4"/>
        <rect x={cx - 30} y={cy + 20} width="60" height="8" fill={accent} fillOpacity="0.4"/>
        <rect x={cx - 30} y={cy - 28} width="8" height="56" fill={accent} fillOpacity="0.4"/>
        <rect x={cx + 22} y={cy - 28} width="8" height="56" fill={accent} fillOpacity="0.4"/>
        <path d={`M ${cx - 14} ${cy + 2} L ${cx - 4} ${cy + 14} L ${cx + 18} ${cy - 16}`}
          fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <text x={cx} y={cy + 40} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="700" fill={accent}>ぐらつきなし ✓</text>
      </Svg>
    );
  },

  // ビス固定: 接合2材 + ビス頭 + シャフト + ドライバー矢印
  screw: ({ accent }) => {
    const cx = W / 2, cy = H / 2;
    const b1W = W * 0.55, b1H = 22;
    const b1X = cx - b1W / 2, b1Y = cy - 2;
    const b2W = b1H + 4, b2H = 50;
    const b2X = cx - b2W / 2, b2Y = b1Y - b2H + 2;
    const screwX = cx, screwY = b2Y + 6;
    return (
      <Svg>
        <rect x={b1X} y={b1Y} width={b1W} height={b1H} fill={accent} fillOpacity="0.30" stroke={accent} strokeOpacity="0.6" strokeWidth="1.2"/>
        <rect x={b2X} y={b2Y} width={b2W} height={b2H} fill={accent} fillOpacity="0.40" stroke={accent} strokeOpacity="0.6" strokeWidth="1.2"/>
        <circle cx={screwX} cy={screwY} r="6" fill="#B3B8C7"/>
        <line x1={screwX - 4} y1={screwY} x2={screwX + 4} y2={screwY} stroke="#FFF" strokeOpacity="0.85" strokeWidth="1.5"/>
        <line x1={screwX} y1={screwY - 4} x2={screwX} y2={screwY + 4} stroke="#FFF" strokeOpacity="0.85" strokeWidth="1.5"/>
        <line x1={screwX} y1={screwY + 6} x2={screwX} y2={b1Y + b1H - 4} stroke="#9EA3B3" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2"/>
        <line x1={screwX + 20} y1={screwY - 20} x2={screwX + 8} y2={screwY - 8} stroke={accent} strokeWidth="2" strokeLinecap="round"/>
        <polygon points={`${screwX + 8},${screwY - 8} ${screwX + 14},${screwY - 4} ${screwX + 4},${screwY - 2}`} fill={accent}/>
        <text x={cx} y={b1Y + b1H + 16} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="700" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fill={accent}>コーススレッド 51mm</text>
      </Svg>
    );
  },

  // 完成: 放射線 + 円 + 大きなチェック + 紙吹雪
  complete: ({ accent, secondary }) => {
    const cx = W / 2, cy = H / 2;
    const rays = 8;
    const confetti: Array<[number, number, number, number]> = [
      [-38, -22, 5, 0.85], [30, -30, 4, 0.75], [38, 10, 6, 0.9],
      [-34, 18, 4, 0.8], [14, 34, 5, 0.7], [-14, 36, 3, 0.65],
    ];
    return (
      <Svg>
        {Array.from({ length: rays }, (_, i) => {
          const rad = (i * 360 / rays) * Math.PI / 180;
          const r1 = 18, r2 = 36;
          return (
            <line key={i}
              x1={cx + r1 * Math.cos(rad)} y1={cy + r1 * Math.sin(rad)}
              x2={cx + r2 * Math.cos(rad)} y2={cy + r2 * Math.sin(rad)}
              stroke={accent} strokeOpacity="0.4" strokeWidth="2.5"/>
          );
        })}
        <circle cx={cx} cy={cy} r="28" fill={accent} fillOpacity="0.2" stroke={accent} strokeWidth="2.5"/>
        <path d={`M ${cx - 14} ${cy + 2} L ${cx - 3} ${cy + 14} L ${cx + 16} ${cy - 14}`}
          fill="none" stroke={accent} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
        {confetti.map(([ox, oy, r, a], i) => (
          <circle key={i} cx={cx + ox} cy={cy + oy} r={r} fill={secondary} fillOpacity={a}/>
        ))}
        <text x={cx} y={cy + 48} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="700" fill={accent}>完成！おめでとう</text>
      </Svg>
    );
  },

  // Legacy aliases
  assemble: (props) => Diagrams.frame(props),
  install: (props) => Diagrams.wallMount(props),
};

/* ── SF Symbol 相当の左パネルアイコン ── */
const Icons: Record<IllType, React.FC<{ color: string }>> = {
  // measure: ruler
  measure: ({ color }) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="8" width="20" height="8" rx="1.5" fill="none"/>
      <line x1="5" y1="8" x2="5" y2="11.5"/><line x1="8" y1="8" x2="8" y2="10.5"/>
      <line x1="11" y1="8" x2="11" y2="11.5"/><line x1="14" y1="8" x2="14" y2="10.5"/>
      <line x1="17" y1="8" x2="17" y2="11.5"/><line x1="20" y1="8" x2="20" y2="10.5"/>
    </svg>
  ),
  // markLine: pencil.and.ruler
  markLine: ({ color }) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
      <path d="M2 20h4"/>
    </svg>
  ),
  // cut: scissors
  cut: ({ color }) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
      <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"/>
    </svg>
  ),
  // sand: hand.raised.fingers.spread
  sand: ({ color }) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 11V6a2 2 0 114 0v5"/><path d="M11 11V4a2 2 0 114 0v7"/>
      <path d="M15 11V6a2 2 0 114 0v7"/>
      <path d="M19 11v3a7 7 0 11-14 0v-3a2 2 0 114 0"/>
    </svg>
  ),
  // drill: bolt.fill
  drill: ({ color }) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill={color} stroke="none" aria-hidden="true">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  // foundation: square.stack.3d.down.right
  foundation: ({ color }) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 20h20M6 20V10M10 20V4M14 20V10M18 20V14"/>
    </svg>
  ),
  // levelCheck: arrow.up.and.down.and.arrow.left.and.right
  levelCheck: ({ color }) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="9" width="20" height="6" rx="3"/>
      <circle cx="12" cy="12" r="2"/>
      <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
    </svg>
  ),
  // topBoard: square.on.square
  topBoard: ({ color }) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="14" height="14" rx="2"/>
      <rect x="7" y="7" width="14" height="14" rx="2"/>
    </svg>
  ),
  // frame: square.dashed
  frame: ({ color }) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
    </svg>
  ),
  // wallMount: pin.fill
  wallMount: ({ color }) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill={color} stroke="none" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  ),
  // waterproof: drop.fill
  waterproof: ({ color }) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill={color} stroke="none" aria-hidden="true">
      <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/>
    </svg>
  ),
  // paint: paintbrush.fill
  paint: ({ color }) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill={color} stroke="none" aria-hidden="true">
      <path d="M18.37 2.63L14 7l-1.59-1.59-5.66 5.66 1.59 1.59L3 18a1 1 0 000 1.41l1.59 1.59a1 1 0 001.41 0l4.75-4.75 1.59 1.59 5.66-5.66L16 10.37l4.37-4.37a1 1 0 000-1.37z"/>
    </svg>
  ),
  // inspect: checkmark.shield.fill
  inspect: ({ color }) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill={color} stroke="none" aria-hidden="true">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
    </svg>
  ),
  // screw: screwdriver.fill
  screw: ({ color }) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 3l3 3-8 8-3-3 8-8z" fill={color} fillOpacity="0.2"/>
      <path d="M10 11l-7 7v3h3l7-7"/>
      <path d="M11 15l1 1"/>
    </svg>
  ),
  // complete: checkmark.seal.fill
  complete: ({ color }) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill={color} stroke="none" aria-hidden="true">
      <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.69 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.68L23 12zm-12.91 4.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z"/>
    </svg>
  ),
  assemble: (p) => Icons.frame(p),
  install: (p) => Icons.wallMount(p),
};

/* ── Props / コンポーネント ── */
interface Props {
  stepTitle: string;
  stepDescription: string;
  stepOrder: number;
  totalSteps: number;
  /** Firestore の illustration 種別 (iOS IllType rawValue と一致) */
  illustrationType?: string | null;
  /** 完成品寸法 (measure ダイアグラムで表示) */
  dimensions?: { width: number; depth: number; height: number };
}

const KNOWN: IllType[] = [
  "measure","markLine","cut","sand","drill","foundation","levelCheck",
  "topBoard","frame","wallMount","waterproof","paint","inspect","screw","complete",
  "assemble","install",
];

function resolveType(
  illustrationType: string | null | undefined,
  title: string, desc: string, order: number, total: number
): IllType {
  if (illustrationType && KNOWN.includes(illustrationType as IllType)) {
    return illustrationType as IllType;
  }
  return detectType(title, desc, order, total);
}

export default function StepIllustration({
  stepTitle, stepDescription, stepOrder, totalSteps, illustrationType, dimensions,
}: Props) {
  const type = resolveType(illustrationType, stepTitle, stepDescription, stepOrder, totalSteps);
  const theme = THEMES[type];
  const Diagram = Diagrams[type];
  const Icon = Icons[type];
  const isDark = type === "drill";
  const labelColor = isDark ? "rgba(255,255,255,0.85)" : theme.accent;
  const hasLottie = LOTTIE_AVAILABLE.has(type);

  return (
    <div
      className="relative flex rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${theme.bgLight} 0%, ${theme.bgDark} 100%)`,
        border: `1.5px solid ${theme.accent}4D`,
        boxShadow: `0 3px 10px ${theme.accent}1A`,
        minHeight: "156px",
      }}
    >
      {/* 左パネル: ツールアイコン */}
      <div
        className="flex flex-col items-center justify-center gap-2 shrink-0 px-5"
        style={{ borderRight: `1px solid ${theme.accent}40` }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            width: 64, height: 64,
            borderRadius: "50%",
            background: `${theme.accent}26`,
            border: `1.5px solid ${theme.accent}4D`,
          }}
        >
          <Icon color={theme.accent} />
        </div>
        <span
          className="text-[10px] font-bold text-center leading-tight"
          style={{ color: labelColor, maxWidth: 68 }}
        >
          {theme.actionLabel}
        </span>
      </div>

      {/* 右パネル: ダイアグラム (Lottie があれば優先、なければ SVG 静止画) */}
      <div className="flex-1 flex flex-col items-center justify-center px-2 py-3">
        {hasLottie ? (
          <>
            <LottiePlayer type={type} />
            {resolveCaption(type, dimensions) && (
              <div className="text-[10px] font-medium mt-1" style={{ color: `${theme.accent}CC` }}>
                {resolveCaption(type, dimensions)}
              </div>
            )}
          </>
        ) : (
          <Diagram accent={theme.accent} secondary={theme.secondary} dimensions={dimensions} />
        )}
      </div>

      {/* 下部: illType.label + STEP X/Y */}
      <div className="absolute bottom-2 left-0 right-0 flex items-center justify-between px-3 pointer-events-none">
        <span
          className="text-[9px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${theme.bgLight}E6`, color: `${theme.accent}D9` }}
        >
          {theme.label}
        </span>
        <span
          className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full"
          style={{ background: `${theme.bgLight}E6`, color: theme.accent }}
        >
          STEP {stepOrder} / {totalSteps}
        </span>
      </div>
    </div>
  );
}
