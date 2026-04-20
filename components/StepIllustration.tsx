/**
 * StepIllustration — 工程ステップのビジュアルイラスト
 * iOS の StepIllustrationView / IllType と完全対応
 * illustrationType (Firestore由来) を優先し、なければキーワード判定にフォールバック
 */

// iOS IllType の全rawValue + Web独自型
type IllType =
  | "measure" | "markLine" | "cut" | "sand" | "drill"
  | "foundation" | "levelCheck" | "topBoard" | "frame"
  | "wallMount" | "waterproof" | "paint" | "inspect"
  | "screw" | "complete"
  // legacy Web types (フォールバック用)
  | "assemble" | "install";

interface StepTheme {
  bg: string;
  accent: string;
  label: string;
}

const THEMES: Record<IllType, StepTheme> = {
  measure:    { bg: "linear-gradient(135deg,#ECFEFF,#CFFAFE)", accent: "#0891B2", label: "採寸" },
  markLine:   { bg: "linear-gradient(135deg,#FFF8EC,#FDECD4)", accent: "#D97B2A", label: "墨付け" },
  cut:        { bg: "linear-gradient(135deg,#FFF8EC,#FDECD4)", accent: "#D97B2A", label: "カット" },
  sand:       { bg: "linear-gradient(135deg,#F5F5F5,#E8E4DE)", accent: "#888",    label: "やすり" },
  drill:      { bg: "linear-gradient(135deg,#EBF2FF,#D6E6FF)", accent: "#2563EB", label: "穴あけ" },
  foundation: { bg: "linear-gradient(135deg,#FAFAF9,#F5F0E8)", accent: "#78716C", label: "下準備" },
  levelCheck: { bg: "linear-gradient(135deg,#ECFEFF,#CFFAFE)", accent: "#0891B2", label: "水平確認" },
  topBoard:   { bg: "linear-gradient(135deg,#EDFDF4,#D1FAE5)", accent: "#059669", label: "天板" },
  frame:      { bg: "linear-gradient(135deg,#EDFDF4,#D1FAE5)", accent: "#059669", label: "組立" },
  wallMount:  { bg: "linear-gradient(135deg,#FFF1F2,#FFE4E6)", accent: "#E11D48", label: "壁固定" },
  waterproof: { bg: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", accent: "#1D4ED8", label: "防腐処理" },
  paint:      { bg: "linear-gradient(135deg,#FDF4FF,#F0E4FD)", accent: "#9333EA", label: "塗装" },
  inspect:    { bg: "linear-gradient(135deg,#F0FDF4,#DCFCE7)", accent: "#16A34A", label: "確認" },
  screw:      { bg: "linear-gradient(135deg,#EBF2FF,#D6E6FF)", accent: "#2563EB", label: "固定" },
  complete:   { bg: "linear-gradient(135deg,#EDFDF4,#D1FAE5)", accent: "#059669", label: "完成" },
  // legacy
  assemble:   { bg: "linear-gradient(135deg,#EDFDF4,#D1FAE5)", accent: "#059669", label: "組立" },
  install:    { bg: "linear-gradient(135deg,#FFF1F2,#FFE4E6)", accent: "#E11D48", label: "取付" },
};

/* ── キーワード判定（illustrationType未指定時のフォールバック） ── */
function detectType(title: string, desc: string): IllType {
  const t = `${title} ${desc}`;
  if (/カット|のこぎり|切断|切り/.test(t))            return "cut";
  if (/やすり|サンドペーパー|磨|研磨/.test(t))         return "sand";
  if (/ビス|コーススレッド|ドライバー|ねじ|締め/.test(t)) return "screw";
  if (/下穴|ドリル|穴あけ/.test(t))                   return "drill";
  if (/塗装|ワックス|オイル|塗|ペイント|ニス/.test(t))  return "paint";
  if (/防腐|防水|キシラ|ウッドステイン/.test(t))        return "waterproof";
  if (/墨|マーキング|印|けがき/.test(t))              return "markLine";
  if (/メジャー|採寸|設計|カットリスト|寸法確認/.test(t)) return "measure";
  if (/水平確認|水平器|レベル/.test(t))               return "levelCheck";
  if (/束石|基礎|地盤|設置場所/.test(t))              return "foundation";
  if (/天板|天面|座板/.test(t))                       return "topBoard";
  if (/壁.*固定|転倒防止|壁付け/.test(t))             return "wallMount";
  if (/完成|最終|仕上|検査|チェック|確認/.test(t))     return "inspect";
  if (/組む|組立|フレーム|連結|箱/.test(t))            return "frame";
  return "frame";
}

/* ── SVG ダイアグラム ── */
const Diagrams: Record<IllType, React.FC> = {
  measure: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      <rect x="6" y="24" width="68" height="12" rx="2" fill="#0891B2" fillOpacity=".15" stroke="#0891B2" strokeWidth="1.2"/>
      {Array.from({length: 8}).map((_, i) => (
        <line key={i} x1={10 + i * 9} y1="24" x2={10 + i * 9} y2={i % 2 === 0 ? 20 : 22} stroke="#0891B2" strokeWidth="1"/>
      ))}
      <path d="M6 30 l6 -3 l0 6 z" fill="#0891B2"/>
      <path d="M74 30 l-6 -3 l0 6 z" fill="#0891B2"/>
      <text x="40" y="21" textAnchor="middle" fontSize="7" fill="#0891B2" fontWeight="bold">W × D × H</text>
    </svg>
  ),
  markLine: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      <rect x="8" y="15" width="64" height="30" rx="2" fill="#D97B2A" fillOpacity=".1" stroke="#D97B2A" strokeWidth="1.2"/>
      <line x1="8" y1="30" x2="72" y2="30" stroke="#D97B2A" strokeWidth="1.5" strokeDasharray="4 2"/>
      <line x1="40" y1="15" x2="40" y2="45" stroke="#D97B2A" strokeWidth="1.5" strokeDasharray="4 2"/>
      <circle cx="40" cy="30" r="3" fill="#D97B2A" fillOpacity=".7"/>
      <path d="M34 14 l3 5 l3 -5 l3 5" fill="none" stroke="#D97B2A" strokeWidth="1.2"/>
    </svg>
  ),
  cut: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      <rect x="4" y="20" width="72" height="20" rx="2" fill="#D97B2A" fillOpacity=".18" stroke="#D97B2A" strokeWidth="1.2"/>
      <line x1="40" y1="12" x2="40" y2="48" stroke="#D97B2A" strokeWidth="2" strokeDasharray="3 2"/>
      <path d="M40 8 l-4 6 h8 z" fill="#D97B2A"/>
      <line x1="4" y1="52" x2="36" y2="52" stroke="#D97B2A" strokeWidth="1" strokeOpacity=".5"/>
      <line x1="44" y1="52" x2="76" y2="52" stroke="#D97B2A" strokeWidth="1" strokeOpacity=".5"/>
      <line x1="4" y1="50" x2="4" y2="54" stroke="#D97B2A" strokeWidth="1" strokeOpacity=".5"/>
      <line x1="76" y1="50" x2="76" y2="54" stroke="#D97B2A" strokeWidth="1" strokeOpacity=".5"/>
    </svg>
  ),
  sand: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      <rect x="10" y="22" width="60" height="16" rx="2" fill="#888" fillOpacity=".15" stroke="#888" strokeWidth="1.2"/>
      {[0,1,2,3,4].map(i => (
        <line key={i} x1={18 + i * 10} y1="20" x2={14 + i * 10} y2="40" stroke="#888" strokeWidth="1.2" strokeOpacity=".5"/>
      ))}
      <rect x="30" y="15" width="28" height="10" rx="1" fill="#888" fillOpacity=".25" stroke="#888" strokeWidth="1"/>
      <text x="44" y="23" textAnchor="middle" fontSize="6" fill="#888" fontWeight="bold">#240</text>
    </svg>
  ),
  drill: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      <rect x="8" y="32" width="64" height="14" rx="2" fill="#2563EB" fillOpacity=".12" stroke="#2563EB" strokeWidth="1.2"/>
      <line x1="40" y1="8" x2="40" y2="32" stroke="#2563EB" strokeWidth="2.5"/>
      <ellipse cx="40" cy="8" rx="5" ry="3" fill="#2563EB" fillOpacity=".6"/>
      <line x1="36" y1="12" x2="44" y2="20" stroke="#2563EB" strokeWidth="1.2" strokeOpacity=".5"/>
      <line x1="44" y1="12" x2="36" y2="20" stroke="#2563EB" strokeWidth="1.2" strokeOpacity=".5"/>
      <circle cx="40" cy="32" r="3" fill="none" stroke="#2563EB" strokeWidth="1.5"/>
      <text x="40" y="53" textAnchor="middle" fontSize="6" fill="#2563EB">下穴 φ3mm</text>
    </svg>
  ),
  foundation: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      <rect x="10" y="40" width="16" height="12" rx="2" fill="#78716C" fillOpacity=".25" stroke="#78716C" strokeWidth="1.2"/>
      <rect x="54" y="40" width="16" height="12" rx="2" fill="#78716C" fillOpacity=".25" stroke="#78716C" strokeWidth="1.2"/>
      <line x1="6" y1="38" x2="74" y2="38" stroke="#78716C" strokeWidth="1" strokeDasharray="4 2"/>
      <rect x="28" y="32" width="24" height="8" rx="3" fill="#78716C" fillOpacity=".2" stroke="#78716C" strokeWidth="1.2"/>
      <circle cx="40" cy="36" r="2.5" fill="none" stroke="#78716C" strokeWidth="1.2"/>
      <circle cx="40" cy="36" r="1" fill="#78716C" fillOpacity=".5"/>
    </svg>
  ),
  levelCheck: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      <rect x="8" y="26" width="64" height="10" rx="4" fill="#0891B2" fillOpacity=".15" stroke="#0891B2" strokeWidth="1.2"/>
      <circle cx="40" cy="31" r="4" fill="none" stroke="#0891B2" strokeWidth="1.5"/>
      <circle cx="40" cy="31" r="1.5" fill="#0891B2" fillOpacity=".7"/>
      <line x1="6" y1="31" x2="14" y2="31" stroke="#0891B2" strokeWidth="1" strokeOpacity=".5"/>
      <line x1="66" y1="31" x2="74" y2="31" stroke="#0891B2" strokeWidth="1" strokeOpacity=".5"/>
      <text x="40" y="50" textAnchor="middle" fontSize="7" fill="#0891B2">水平確認</text>
    </svg>
  ),
  topBoard: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      <rect x="6" y="8" width="68" height="10" rx="2" fill="#059669" fillOpacity=".2" stroke="#059669" strokeWidth="1.5"/>
      <rect x="10" y="20" width="8" height="32" rx="2" fill="#059669" fillOpacity=".12" stroke="#059669" strokeWidth="1"/>
      <rect x="62" y="20" width="8" height="32" rx="2" fill="#059669" fillOpacity=".12" stroke="#059669" strokeWidth="1"/>
      <path d="M28 14 l4 -6 l4 6" fill="none" stroke="#059669" strokeWidth="1.5"/>
      <path d="M44 14 l4 -6 l4 6" fill="none" stroke="#059669" strokeWidth="1.5"/>
    </svg>
  ),
  frame: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      <rect x="6" y="8" width="10" height="44" rx="2" fill="#059669" fillOpacity=".15" stroke="#059669" strokeWidth="1.2"/>
      <rect x="64" y="8" width="10" height="44" rx="2" fill="#059669" fillOpacity=".15" stroke="#059669" strokeWidth="1.2"/>
      <rect x="16" y="10" width="48" height="8" rx="2" fill="#059669" fillOpacity=".2" stroke="#059669" strokeWidth="1"/>
      <rect x="16" y="42" width="48" height="8" rx="2" fill="#059669" fillOpacity=".2" stroke="#059669" strokeWidth="1"/>
      <rect x="16" y="26" width="48" height="8" rx="2" fill="#059669" fillOpacity=".2" stroke="#059669" strokeWidth="1" strokeDasharray="3 2"/>
      <path d="M36 28 l4 -3 l4 3" fill="none" stroke="#059669" strokeWidth="1.5"/>
    </svg>
  ),
  wallMount: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      <rect x="6" y="4" width="8" height="52" rx="1" fill="#E11D48" fillOpacity=".12" stroke="#E11D48" strokeWidth="1.2"/>
      <rect x="14" y="28" width="52" height="8" rx="2" fill="#E11D48" fillOpacity=".18" stroke="#E11D48" strokeWidth="1.2"/>
      <path d="M14 26 l0 12 l10 0" fill="none" stroke="#E11D48" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="10" cy="30" r="2" fill="#E11D48" fillOpacity=".7"/>
      <circle cx="10" cy="38" r="2" fill="#E11D48" fillOpacity=".7"/>
    </svg>
  ),
  waterproof: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      <rect x="8" y="32" width="64" height="12" rx="2" fill="#1D4ED8" fillOpacity=".12" stroke="#1D4ED8" strokeWidth="1.2"/>
      <path d="M16 32 q4 -8 8 0 q4 8 8 0 q4 -8 8 0 q4 8 8 0 q4 -8 8 0" fill="none" stroke="#1D4ED8" strokeWidth="1.5" strokeOpacity=".6"/>
      <rect x="34" y="14" width="12" height="16" rx="2" fill="#1D4ED8" fillOpacity=".3" stroke="#1D4ED8" strokeWidth="1"/>
      <path d="M38 30 l2 4 l2 -4" fill="#1D4ED8" fillOpacity=".6"/>
    </svg>
  ),
  paint: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      <rect x="10" y="28" width="60" height="12" rx="2" fill="#9333EA" fillOpacity=".12" stroke="#9333EA" strokeWidth="1.2"/>
      <rect x="30" y="16" width="20" height="10" rx="3" fill="#9333EA" fillOpacity=".4" stroke="#9333EA" strokeWidth="1.2"/>
      <line x1="40" y1="26" x2="40" y2="28" stroke="#9333EA" strokeWidth="2"/>
      {[0,1,2].map(i => (
        <path key={i} d={`M ${16 + i * 18} 28 q 4 -3 8 0 q 4 3 8 0`} fill="none" stroke="#9333EA" strokeWidth="1.2" strokeOpacity=".5"/>
      ))}
    </svg>
  ),
  inspect: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      <rect x="12" y="10" width="40" height="40" rx="3" fill="#16A34A" fillOpacity=".08" stroke="#16A34A" strokeWidth="1.2"/>
      <path d="M20 30 l8 8 l16 -16" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="56" cy="42" r="10" fill="none" stroke="#16A34A" strokeWidth="1.5"/>
      <line x1="63" y1="49" x2="70" y2="56" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  screw: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      <rect x="8" y="10" width="64" height="12" rx="2" fill="#2563EB" fillOpacity=".12" stroke="#2563EB" strokeWidth="1.2"/>
      <rect x="8" y="25" width="64" height="12" rx="2" fill="#2563EB" fillOpacity=".08" stroke="#2563EB" strokeWidth="1"/>
      {[24, 40, 56].map(x => (
        <g key={x}>
          <line x1={x} y1="8" x2={x} y2="38" stroke="#2563EB" strokeWidth="2"/>
          <line x1={x-4} y1="8" x2={x+4} y2="8" stroke="#2563EB" strokeWidth="2"/>
          <polygon points={`${x},38 ${x-3},30 ${x+3},30`} fill="#2563EB" fillOpacity=".8"/>
        </g>
      ))}
    </svg>
  ),
  complete: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      <rect x="10" y="12" width="60" height="36" rx="4" fill="#059669" fillOpacity=".1" stroke="#059669" strokeWidth="1.5"/>
      <path d="M24 30 l10 10 l22 -20" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="40" cy="30" r="18" fill="none" stroke="#059669" strokeWidth="1" strokeOpacity=".3"/>
    </svg>
  ),
  // legacy aliases
  assemble: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      <rect x="6" y="8" width="10" height="44" rx="2" fill="#059669" fillOpacity=".15" stroke="#059669" strokeWidth="1.2"/>
      <rect x="64" y="8" width="10" height="44" rx="2" fill="#059669" fillOpacity=".15" stroke="#059669" strokeWidth="1.2"/>
      <rect x="16" y="10" width="48" height="8" rx="2" fill="#059669" fillOpacity=".2" stroke="#059669" strokeWidth="1"/>
      <rect x="16" y="42" width="48" height="8" rx="2" fill="#059669" fillOpacity=".2" stroke="#059669" strokeWidth="1"/>
      <path d="M36 28 l4 -3 l4 3" fill="none" stroke="#059669" strokeWidth="1.5"/>
    </svg>
  ),
  install: () => (
    <svg viewBox="0 0 80 60" width="80" height="60" aria-hidden="true">
      <rect x="6" y="4" width="8" height="52" rx="1" fill="#E11D48" fillOpacity=".12" stroke="#E11D48" strokeWidth="1.2"/>
      <rect x="14" y="28" width="52" height="8" rx="2" fill="#E11D48" fillOpacity=".18" stroke="#E11D48" strokeWidth="1.2"/>
      <path d="M14 26 l0 12 l10 0" fill="none" stroke="#E11D48" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="10" cy="30" r="2" fill="#E11D48" fillOpacity=".7"/>
      <circle cx="10" cy="38" r="2" fill="#E11D48" fillOpacity=".7"/>
    </svg>
  ),
};

/* ── アイコン ── */
const Icons: Record<IllType, React.FC<{ color: string }>> = {
  measure: ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12h20M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3"/>
      <line x1="12" y1="8" x2="12" y2="16"/>
    </svg>
  ),
  markLine: ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
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
  drill: ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 6l-1-2H5v4h8l1-2zM5 10v8M9 14h4M17 6v12"/>
    </svg>
  ),
  foundation: ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 20h20M6 20V10M10 20V4M14 20V10M18 20V14"/>
    </svg>
  ),
  levelCheck: ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="9" width="20" height="6" rx="3"/>
      <circle cx="12" cy="12" r="2"/>
      <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
    </svg>
  ),
  topBoard: ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="4" rx="1"/>
      <line x1="6" y1="8" x2="6" y2="20"/><line x1="18" y1="8" x2="18" y2="20"/>
    </svg>
  ),
  frame: ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
    </svg>
  ),
  wallMount: ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/>
      <path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
      <path d="M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21.91 2 2.37 2 4.01C16 17.55 13.76 20 11 20s-5-2.45-5-5.75c0-2.67 1.79-4.91 4-5.01z"/>
    </svg>
  ),
  waterproof: ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
      <path d="M12 6v6l4 2"/>
    </svg>
  ),
  paint: ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
      <path d="M12 11v4m0 0H9m3 0h3M9 19h6"/>
    </svg>
  ),
  inspect: ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <path d="M8 11l2 2 4-4"/>
    </svg>
  ),
  screw: ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2v8M5 12H2m20 0h-3M12 22v-4"/>
      <circle cx="12" cy="12" r="4"/>
      <path d="M8.5 8.5l-2-2M17.5 8.5l2-2"/>
    </svg>
  ),
  complete: ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
      <path d="M22 4L12 14.01l-3-3"/>
    </svg>
  ),
  assemble: ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
    </svg>
  ),
  install: ({ color }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/>
      <path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
      <path d="M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21.91 2 2.37 2 4.01C16 17.55 13.76 20 11 20s-5-2.45-5-5.75c0-2.67 1.79-4.91 4-5.01z"/>
    </svg>
  ),
};

/* ── Props / コンポーネント ── */
interface Props {
  stepTitle: string;
  stepDescription: string;
  stepOrder: number;
  totalSteps: number;
  /** Firestoreから取得したillustration種別 (iOS IllType rawValue) */
  illustrationType?: string | null;
}

function resolveType(illustrationType: string | null | undefined, title: string, desc: string): IllType {
  if (illustrationType) {
    const known: IllType[] = [
      "measure","markLine","cut","sand","drill","foundation","levelCheck",
      "topBoard","frame","wallMount","waterproof","paint","inspect","screw","complete",
      "assemble","install",
    ];
    if (known.includes(illustrationType as IllType)) return illustrationType as IllType;
  }
  return detectType(title, desc);
}

export default function StepIllustration({ stepTitle, stepDescription, stepOrder, totalSteps, illustrationType }: Props) {
  const type = resolveType(illustrationType, stepTitle, stepDescription);
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
        <span className="text-xs font-bold" style={{ color: theme.accent }}>
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
