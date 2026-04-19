/**
 * StepIllustration — 工程ステップのビジュアルイラスト
 * iOS の StepIllustrationView に相当する Web 版
 * キーワードでステップ種別を判定し、テーマ別の背景・アイコン・SVG図を描画する
 */

type StepType = "cut" | "sand" | "screw" | "assemble" | "paint" | "measure" | "install" | "foundation";

interface StepTheme {
  bg: string;        // CSS gradient
  accent: string;
  label: string;
}

const THEMES: Record<StepType, StepTheme> = {
  cut:        { bg: "linear-gradient(135deg,#FFF8EC,#FDECD4)", accent: "#D97B2A", label: "カット" },
  sand:       { bg: "linear-gradient(135deg,#F5F5F5,#E8E4DE)", accent: "#888",    label: "やすり" },
  screw:      { bg: "linear-gradient(135deg,#EBF2FF,#D6E6FF)", accent: "#2563EB", label: "固定" },
  assemble:   { bg: "linear-gradient(135deg,#EDFDF4,#D1FAE5)", accent: "#059669", label: "組立" },
  paint:      { bg: "linear-gradient(135deg,#FDF4FF,#F0E4FD)", accent: "#9333EA", label: "塗装" },
  measure:    { bg: "linear-gradient(135deg,#ECFEFF,#CFFAFE)", accent: "#0891B2", label: "採寸" },
  install:    { bg: "linear-gradient(135deg,#FFF1F2,#FFE4E6)", accent: "#E11D48", label: "取付" },
  foundation: { bg: "linear-gradient(135deg,#FAFAF9,#F5F0E8)", accent: "#78716C", label: "下準備" },
};

function detectType(title: string, desc: string): StepType {
  const t = `${title} ${desc}`;
  if (/カット|のこぎり|切断|切り/.test(t)) return "cut";
  if (/やすり|サンドペーパー|磨|研磨/.test(t)) return "sand";
  if (/ビス|コーススレッド|ドライバー|ねじ|螺|締め/.test(t)) return "screw";
  if (/塗装|仕上げ|ワックス|オイル|塗|ペイント/.test(t)) return "paint";
  if (/メジャー|採寸|水平|墨|レイアウト|束石|設置場所|計/.test(t)) return "measure";
  if (/取り付け|張る|貼る|設置/.test(t)) return "install";
  if (/組む|組立|フレーム|箱型|連結|つなぎ/.test(t)) return "assemble";
  if (/下地|レイアウト|準備|確認/.test(t)) return "foundation";
  return "assemble";
}

/* ── SVG diagrams per type ── */

const Diagrams: Record<StepType, React.FC> = {
  cut: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      {/* 木材 */}
      <rect x="4" y="20" width="72" height="20" rx="2" fill="#D97B2A" fillOpacity=".18" stroke="#D97B2A" strokeWidth="1.2"/>
      {/* カット線 */}
      <line x1="40" y1="12" x2="40" y2="48" stroke="#D97B2A" strokeWidth="2" strokeDasharray="3 2"/>
      {/* 矢印（切断方向） */}
      <path d="M40 8 l-4 6 h8 z" fill="#D97B2A"/>
      {/* 寸法線 */}
      <line x1="4" y1="52" x2="36" y2="52" stroke="#D97B2A" strokeWidth="1" strokeOpacity=".5"/>
      <line x1="44" y1="52" x2="76" y2="52" stroke="#D97B2A" strokeWidth="1" strokeOpacity=".5"/>
      <line x1="4" y1="50" x2="4" y2="54" stroke="#D97B2A" strokeWidth="1" strokeOpacity=".5"/>
      <line x1="76" y1="50" x2="76" y2="54" stroke="#D97B2A" strokeWidth="1" strokeOpacity=".5"/>
    </svg>
  ),

  sand: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      {/* 板 */}
      <rect x="10" y="22" width="60" height="16" rx="2" fill="#888" fillOpacity=".15" stroke="#888" strokeWidth="1.2"/>
      {/* やすり動作線 */}
      {[0,1,2,3,4].map(i => (
        <line key={i} x1={18 + i * 10} y1="20" x2={14 + i * 10} y2="40" stroke="#888" strokeWidth="1.2" strokeOpacity=".5"/>
      ))}
      {/* グリット表現 */}
      <rect x="30" y="15" width="28" height="10" rx="1" fill="#888" fillOpacity=".25" stroke="#888" strokeWidth="1"/>
      <text x="44" y="23" textAnchor="middle" fontSize="6" fill="#888" fontWeight="bold">#240</text>
    </svg>
  ),

  screw: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      {/* 板 × 2 */}
      <rect x="8" y="10" width="64" height="12" rx="2" fill="#2563EB" fillOpacity=".12" stroke="#2563EB" strokeWidth="1.2"/>
      <rect x="8" y="25" width="64" height="12" rx="2" fill="#2563EB" fillOpacity=".08" stroke="#2563EB" strokeWidth="1"/>
      {/* ビス × 3 */}
      {[24, 40, 56].map(x => (
        <g key={x}>
          <line x1={x} y1="8" x2={x} y2="38" stroke="#2563EB" strokeWidth="2"/>
          <line x1={x-4} y1="8" x2={x+4} y2="8" stroke="#2563EB" strokeWidth="2"/>
          <polygon points={`${x},38 ${x-3},30 ${x+3},30`} fill="#2563EB" fillOpacity=".8"/>
        </g>
      ))}
    </svg>
  ),

  assemble: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      {/* 左板 */}
      <rect x="6" y="8" width="10" height="44" rx="2" fill="#059669" fillOpacity=".15" stroke="#059669" strokeWidth="1.2"/>
      {/* 右板 */}
      <rect x="64" y="8" width="10" height="44" rx="2" fill="#059669" fillOpacity=".15" stroke="#059669" strokeWidth="1.2"/>
      {/* 横板 × 2 */}
      <rect x="16" y="10" width="48" height="8" rx="2" fill="#059669" fillOpacity=".2" stroke="#059669" strokeWidth="1"/>
      <rect x="16" y="42" width="48" height="8" rx="2" fill="#059669" fillOpacity=".2" stroke="#059669" strokeWidth="1"/>
      {/* 中央板 */}
      <rect x="16" y="26" width="48" height="8" rx="2" fill="#059669" fillOpacity=".2" stroke="#059669" strokeWidth="1" strokeDasharray="3 2"/>
      {/* 矢印（組合せ） */}
      <path d="M36 28 l4 -3 l4 3" fill="none" stroke="#059669" strokeWidth="1.5"/>
    </svg>
  ),

  paint: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      {/* 板 */}
      <rect x="10" y="28" width="60" height="12" rx="2" fill="#9333EA" fillOpacity=".12" stroke="#9333EA" strokeWidth="1.2"/>
      {/* ローラー */}
      <rect x="30" y="16" width="20" height="10" rx="3" fill="#9333EA" fillOpacity=".4" stroke="#9333EA" strokeWidth="1.2"/>
      <line x1="40" y1="26" x2="40" y2="28" stroke="#9333EA" strokeWidth="2"/>
      {/* 塗り波線 */}
      {[0,1,2].map(i => (
        <path key={i} d={`M ${16 + i * 18} 28 q 4 -3 8 0 q 4 3 8 0`} fill="none" stroke="#9333EA" strokeWidth="1.2" strokeOpacity=".5"/>
      ))}
    </svg>
  ),

  measure: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      {/* メジャー本体 */}
      <rect x="6" y="24" width="68" height="12" rx="2" fill="#0891B2" fillOpacity=".15" stroke="#0891B2" strokeWidth="1.2"/>
      {/* 目盛り */}
      {Array.from({length: 8}).map((_, i) => (
        <line key={i} x1={10 + i * 9} y1="24" x2={10 + i * 9} y2={i % 2 === 0 ? 20 : 22} stroke="#0891B2" strokeWidth="1"/>
      ))}
      {/* 両端矢印 */}
      <path d="M6 30 l6 -3 l0 6 z" fill="#0891B2"/>
      <path d="M74 30 l-6 -3 l0 6 z" fill="#0891B2"/>
      {/* 寸法テキスト */}
      <text x="40" y="21" textAnchor="middle" fontSize="7" fill="#0891B2" fontWeight="bold">W × D × H</text>
    </svg>
  ),

  install: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      {/* 壁 */}
      <rect x="6" y="4" width="8" height="52" rx="1" fill="#E11D48" fillOpacity=".12" stroke="#E11D48" strokeWidth="1.2"/>
      {/* 棚 */}
      <rect x="14" y="28" width="52" height="8" rx="2" fill="#E11D48" fillOpacity=".18" stroke="#E11D48" strokeWidth="1.2"/>
      {/* L字金具 */}
      <path d="M14 26 l0 12 l10 0" fill="none" stroke="#E11D48" strokeWidth="2.5" strokeLinecap="round"/>
      {/* ビス */}
      <circle cx="10" cy="30" r="2" fill="#E11D48" fillOpacity=".7"/>
      <circle cx="10" cy="38" r="2" fill="#E11D48" fillOpacity=".7"/>
    </svg>
  ),

  foundation: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      {/* 束石 × 2 */}
      <rect x="10" y="40" width="16" height="12" rx="2" fill="#78716C" fillOpacity=".25" stroke="#78716C" strokeWidth="1.2"/>
      <rect x="54" y="40" width="16" height="12" rx="2" fill="#78716C" fillOpacity=".25" stroke="#78716C" strokeWidth="1.2"/>
      {/* 水平線 */}
      <line x1="6" y1="38" x2="74" y2="38" stroke="#78716C" strokeWidth="1" strokeDasharray="4 2"/>
      {/* 水平器 */}
      <rect x="28" y="32" width="24" height="8" rx="3" fill="#78716C" fillOpacity=".2" stroke="#78716C" strokeWidth="1.2"/>
      <circle cx="40" cy="36" r="2.5" fill="none" stroke="#78716C" strokeWidth="1.2"/>
      <circle cx="40" cy="36" r="1" fill="#78716C" fillOpacity=".5"/>
    </svg>
  ),
};

/* ── Left panel icons ── */

const Icons: Record<StepType, React.FC<{ color: string }>> = {
  cut: ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
      <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"/>
    </svg>
  ),
  sand: ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="8" width="18" height="12" rx="2"/>
      <path d="M7 8V6a2 2 0 012-2h6a2 2 0 012 2v2"/>
      <line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/>
    </svg>
  ),
  screw: ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2v8M5 12H2m20 0h-3M12 22v-4"/>
      <circle cx="12" cy="12" r="4"/>
      <path d="M8.5 8.5l-2-2M17.5 8.5l2-2"/>
    </svg>
  ),
  assemble: ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
    </svg>
  ),
  paint: ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
      <path d="M12 11v4m0 0H9m3 0h3M9 19h6"/>
    </svg>
  ),
  measure: ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12h20M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3"/>
      <line x1="12" y1="8" x2="12" y2="16"/>
    </svg>
  ),
  install: ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/>
      <path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
      <path d="M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21.91 2 2.37 2 4.01C16 17.55 13.76 20 11 20s-5-2.45-5-5.75c0-2.67 1.79-4.91 4-5.01z"/>
    </svg>
  ),
  foundation: ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 20h20M6 20V10M10 20V4M14 20V10M18 20V14"/>
    </svg>
  ),
};

interface Props {
  stepTitle: string;
  stepDescription: string;
  stepOrder: number;
  totalSteps: number;
}

export default function StepIllustration({ stepTitle, stepDescription, stepOrder, totalSteps }: Props) {
  const type = detectType(stepTitle, stepDescription);
  const theme = THEMES[type];
  const Diagram = Diagrams[type];
  const Icon = Icons[type];

  return (
    <div
      className="relative flex rounded-2xl overflow-hidden"
      style={{
        background: theme.bg,
        border: `1.5px solid ${theme.accent}40`,
        boxShadow: `0 3px 10px ${theme.accent}14`,
        minHeight: "120px",
      }}
    >
      {/* 左パネル：ツールアイコン */}
      <div
        className="flex flex-col items-center justify-center gap-2 shrink-0 px-5"
        style={{ borderRight: `1px solid ${theme.accent}22` }}
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: `${theme.accent}18` }}
        >
          <Icon color={theme.accent} />
        </div>
        <span
          className="text-xs font-bold"
          style={{ color: theme.accent }}
        >
          {theme.label}
        </span>
      </div>

      {/* 右パネル：ダイアグラム */}
      <div className="flex-1 flex items-center justify-center">
        <Diagram />
      </div>

      {/* STEP X/Y バッジ */}
      <div
        className="absolute bottom-2 right-3 text-xs font-mono font-bold px-2 py-0.5 rounded-full"
        style={{ background: `${theme.accent}18`, color: theme.accent }}
      >
        STEP {stepOrder} / {totalSteps}
      </div>
    </div>
  );
}
