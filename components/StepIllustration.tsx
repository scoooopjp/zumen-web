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
  | "assemble" | "install"; // legacy Web types (フォールバック用)

interface StepTheme {
  bgLight: string;
  bgDark: string;
  accent: string;
  /** iOS IllType.label (下部左ラベル) */
  label: string;
  /** iOS IllType.actionLabel (左パネルアクション名) */
  actionLabel: string;
}

// iOS StepTheme を Hex に変換、label/actionLabel を IllType と合わせる
const THEMES: Record<IllType, StepTheme> = {
  measure: {
    bgLight: "#E6F2FF", bgDark: "#CCE5FA", accent: "#2E78C7",
    label: "採寸", actionLabel: "採寸する",
  },
  markLine: {
    bgLight: "#F0E6FF", bgDark: "#DBD0FA", accent: "#7A40C7",
    label: "墨付け", actionLabel: "線を引く",
  },
  cut: {
    bgLight: "#FFF2DE", bgDark: "#FFE0BE", accent: "#D96110",
    label: "カット", actionLabel: "カットする",
  },
  sand: {
    bgLight: "#FFF8E0", bgDark: "#FAEBBD", accent: "#C78514",
    label: "研磨", actionLabel: "やすりがけ",
  },
  drill: {
    // iOS: dark bg with cyan accent
    bgLight: "#242838", bgDark: "#141929", accent: "#38D9C0",
    label: "穴あけ", actionLabel: "穴をあける",
  },
  foundation: {
    bgLight: "#EADBC7", bgDark: "#CCB294", accent: "#664221",
    label: "基礎", actionLabel: "整地・基礎",
  },
  levelCheck: {
    bgLight: "#E0EAF9", bgDark: "#C7D7F5", accent: "#385AAD",
    label: "水平確認", actionLabel: "水平を確認",
  },
  topBoard: {
    bgLight: "#FAF0DC", bgDark: "#EAD5AD", accent: "#8C5920",
    label: "天板取付", actionLabel: "天板を張る",
  },
  frame: {
    bgLight: "#FFEBE5", bgDark: "#FAD6CC", accent: "#B83330",
    label: "組立", actionLabel: "枠を組む",
  },
  wallMount: {
    bgLight: "#E5F7EB", bgDark: "#CCEBd5", accent: "#2E8C52",
    label: "壁固定", actionLabel: "壁に固定",
  },
  waterproof: {
    bgLight: "#DBF5FA", bgDark: "#BCE5F5", accent: "#1485A6",
    label: "防腐処理", actionLabel: "防腐処理",
  },
  paint: {
    bgLight: "#E5FAE9", bgDark: "#CCF2D6", accent: "#1E9E61",
    label: "塗装", actionLabel: "塗装仕上げ",
  },
  inspect: {
    bgLight: "#F2E5FA", bgDark: "#E0D1F5", accent: "#732DB8",
    label: "安全確認", actionLabel: "安全確認",
  },
  screw: {
    bgLight: "#E5EBEE", bgDark: "#CCD5EB", accent: "#476190",
    label: "ビス固定", actionLabel: "ビス固定",
  },
  complete: {
    bgLight: "#FFFAE0", bgDark: "#FAF0B8", accent: "#A67A0D",
    label: "完成", actionLabel: "完成！",
  },
  // legacy aliases
  assemble: {
    bgLight: "#FFEBE5", bgDark: "#FAD6CC", accent: "#B83330",
    label: "組立", actionLabel: "枠を組む",
  },
  install: {
    bgLight: "#E5F7EB", bgDark: "#CCEBd5", accent: "#2E8C52",
    label: "取付", actionLabel: "壁に固定",
  },
};

/* ── キーワード判定（illustrationType未指定時のフォールバック） ── */
function detectType(title: string, desc: string, order: number, total: number): IllType {
  if (order === total) return "complete";
  const t = `${title} ${desc}`;
  if (/採寸|メジャー|寸法|測定/.test(t))                 return "measure";
  if (/墨|マーク|印|ライン/.test(t))                      return "markLine";
  if (/カット|のこ|切断|丸ノコ/.test(t))                  return "cut";
  if (/やすり|サンドペーパー|磨|研磨/.test(t))             return "sand";
  if (/穴|ドリル|ビット|下穴/.test(t))                    return "drill";
  if (/束石|整地|根太|砕石|基礎/.test(t))                 return "foundation";
  if (/水平|レベル|傾き/.test(t))                          return "levelCheck";
  if (/天板|座板|デッキ板|張り/.test(t))                  return "topBoard";
  if (/フレーム|枠|箱組|組み立て/.test(t))                return "frame";
  if (/壁|下地|l字|アンカー|転倒防止/.test(t))            return "wallMount";
  if (/防腐|防水|キシラ|ウッドオイル/.test(t))             return "waterproof";
  if (/塗装|オイル|ニス|ワトコ|ペンキ/.test(t))           return "paint";
  if (/確認|ぐらつき|安全|チェック/.test(t))              return "inspect";
  if (/ビス|ネジ|固定|コーススレッド|ドライバー/.test(t)) return "screw";
  if (order === 1) return "measure";
  if (order === 2) return "sand";
  return "screw";
}

/* ── SVG ダイアグラム ── */
const Diagrams: Record<IllType, React.FC<{ accent: string }>> = {
  measure: ({ accent }) => (
    <svg viewBox="0 0 100 70" width="100" height="70" aria-hidden="true">
      <rect x="8" y="28" width="84" height="14" rx="2" fill={accent} fillOpacity=".15" stroke={accent} strokeWidth="1.2"/>
      {Array.from({length: 10}).map((_, i) => (
        <line key={i} x1={12 + i * 8} y1="28" x2={12 + i * 8} y2={i % 2 === 0 ? 23 : 25} stroke={accent} strokeWidth="1"/>
      ))}
      <path d={`M8 35 l7 -3 l0 6 z`} fill={accent}/>
      <path d={`M92 35 l-7 -3 l0 6 z`} fill={accent}/>
      <text x="50" y="22" textAnchor="middle" fontSize="8" fill={accent} fontWeight="bold">W × D × H</text>
      <text x="50" y="56" textAnchor="middle" fontSize="7" fill={accent} fillOpacity=".7">寸法を確認</text>
    </svg>
  ),
  markLine: ({ accent }) => (
    <svg viewBox="0 0 100 70" width="100" height="70" aria-hidden="true">
      <rect x="10" y="16" width="80" height="38" rx="2" fill={accent} fillOpacity=".1" stroke={accent} strokeWidth="1.2"/>
      <line x1="10" y1="35" x2="90" y2="35" stroke={accent} strokeWidth="1.5" strokeDasharray="5 2"/>
      <line x1="50" y1="16" x2="50" y2="54" stroke={accent} strokeWidth="1.5" strokeDasharray="5 2"/>
      <circle cx="50" cy="35" r="4" fill={accent} fillOpacity=".6"/>
      <path d="M44 15 l3 6 l3 -6 l3 6" fill="none" stroke={accent} strokeWidth="1.2"/>
    </svg>
  ),
  cut: ({ accent }) => (
    <svg viewBox="0 0 100 70" width="100" height="70" aria-hidden="true">
      <rect x="6" y="22" width="88" height="22" rx="2" fill={accent} fillOpacity=".18" stroke={accent} strokeWidth="1.2"/>
      <line x1="50" y1="10" x2="50" y2="58" stroke={accent} strokeWidth="2.5" strokeDasharray="4 2"/>
      <path d="M50 6 l-5 7 h10 z" fill={accent}/>
      <line x1="6" y1="60" x2="46" y2="60" stroke={accent} strokeWidth="1" strokeOpacity=".5"/>
      <line x1="54" y1="60" x2="94" y2="60" stroke={accent} strokeWidth="1" strokeOpacity=".5"/>
      <line x1="6" y1="57" x2="6" y2="63" stroke={accent} strokeWidth="1" strokeOpacity=".5"/>
      <line x1="94" y1="57" x2="94" y2="63" stroke={accent} strokeWidth="1" strokeOpacity=".5"/>
    </svg>
  ),
  sand: ({ accent }) => (
    <svg viewBox="0 0 100 70" width="100" height="70" aria-hidden="true">
      <rect x="10" y="28" width="80" height="18" rx="2" fill={accent} fillOpacity=".15" stroke={accent} strokeWidth="1.2"/>
      {[0,1,2,3,4,5].map(i => (
        <line key={i} x1={20 + i * 12} y1="26" x2={16 + i * 12} y2="48" stroke={accent} strokeWidth="1.2" strokeOpacity=".5"/>
      ))}
      <rect x="36" y="14" width="32" height="12" rx="2" fill={accent} fillOpacity=".25" stroke={accent} strokeWidth="1"/>
      <text x="52" y="23" textAnchor="middle" fontSize="7" fill={accent} fontWeight="bold">#240</text>
    </svg>
  ),
  drill: ({ accent }) => (
    <svg viewBox="0 0 100 70" width="100" height="70" aria-hidden="true">
      <rect x="10" y="42" width="80" height="16" rx="2" fill={accent} fillOpacity=".15" stroke={accent} strokeWidth="1.2"/>
      <line x1="50" y1="8" x2="50" y2="42" stroke={accent} strokeWidth="3"/>
      <ellipse cx="50" cy="8" rx="7" ry="4" fill={accent} fillOpacity=".6"/>
      <line x1="43" y1="13" x2="57" y2="26" stroke={accent} strokeWidth="1.5" strokeOpacity=".5"/>
      <line x1="57" y1="13" x2="43" y2="26" stroke={accent} strokeWidth="1.5" strokeOpacity=".5"/>
      <circle cx="50" cy="42" r="4" fill="none" stroke={accent} strokeWidth="1.5"/>
      <text x="50" y="65" textAnchor="middle" fontSize="7" fill={accent}>下穴 φ3mm</text>
    </svg>
  ),
  foundation: ({ accent }) => (
    <svg viewBox="0 0 100 70" width="100" height="70" aria-hidden="true">
      <rect x="12" y="46" width="20" height="16" rx="2" fill={accent} fillOpacity=".25" stroke={accent} strokeWidth="1.2"/>
      <rect x="68" y="46" width="20" height="16" rx="2" fill={accent} fillOpacity=".25" stroke={accent} strokeWidth="1.2"/>
      <line x1="6" y1="44" x2="94" y2="44" stroke={accent} strokeWidth="1" strokeDasharray="5 2"/>
      <rect x="36" y="32" width="28" height="12" rx="3" fill={accent} fillOpacity=".2" stroke={accent} strokeWidth="1.2"/>
      <circle cx="50" cy="38" r="3" fill="none" stroke={accent} strokeWidth="1.2"/>
      <circle cx="50" cy="38" r="1.2" fill={accent} fillOpacity=".5"/>
    </svg>
  ),
  levelCheck: ({ accent }) => (
    <svg viewBox="0 0 100 70" width="100" height="70" aria-hidden="true">
      <rect x="8" y="28" width="84" height="14" rx="6" fill={accent} fillOpacity=".15" stroke={accent} strokeWidth="1.2"/>
      <circle cx="50" cy="35" r="5" fill="none" stroke={accent} strokeWidth="1.5"/>
      <circle cx="50" cy="35" r="2" fill={accent} fillOpacity=".7"/>
      <line x1="6" y1="35" x2="18" y2="35" stroke={accent} strokeWidth="1" strokeOpacity=".5"/>
      <line x1="82" y1="35" x2="94" y2="35" stroke={accent} strokeWidth="1" strokeOpacity=".5"/>
      <text x="50" y="56" textAnchor="middle" fontSize="7" fill={accent}>水平確認</text>
    </svg>
  ),
  topBoard: ({ accent }) => (
    <svg viewBox="0 0 100 70" width="100" height="70" aria-hidden="true">
      <rect x="6" y="10" width="88" height="12" rx="2" fill={accent} fillOpacity=".2" stroke={accent} strokeWidth="1.5"/>
      <rect x="12" y="24" width="10" height="38" rx="2" fill={accent} fillOpacity=".12" stroke={accent} strokeWidth="1"/>
      <rect x="78" y="24" width="10" height="38" rx="2" fill={accent} fillOpacity=".12" stroke={accent} strokeWidth="1"/>
      <path d="M35 18 l5 -8 l5 8" fill="none" stroke={accent} strokeWidth="1.5"/>
      <path d="M55 18 l5 -8 l5 8" fill="none" stroke={accent} strokeWidth="1.5"/>
    </svg>
  ),
  frame: ({ accent }) => (
    <svg viewBox="0 0 100 70" width="100" height="70" aria-hidden="true">
      <rect x="6" y="8" width="12" height="54" rx="2" fill={accent} fillOpacity=".15" stroke={accent} strokeWidth="1.2"/>
      <rect x="82" y="8" width="12" height="54" rx="2" fill={accent} fillOpacity=".15" stroke={accent} strokeWidth="1.2"/>
      <rect x="18" y="10" width="64" height="10" rx="2" fill={accent} fillOpacity=".2" stroke={accent} strokeWidth="1"/>
      <rect x="18" y="52" width="64" height="10" rx="2" fill={accent} fillOpacity=".2" stroke={accent} strokeWidth="1"/>
      <rect x="18" y="30" width="64" height="10" rx="2" fill={accent} fillOpacity=".2" stroke={accent} strokeWidth="1" strokeDasharray="4 2"/>
      <path d="M44 34 l6 -4 l6 4" fill="none" stroke={accent} strokeWidth="1.5"/>
    </svg>
  ),
  wallMount: ({ accent }) => (
    <svg viewBox="0 0 100 70" width="100" height="70" aria-hidden="true">
      <rect x="6" y="4" width="10" height="62" rx="1" fill={accent} fillOpacity=".12" stroke={accent} strokeWidth="1.2"/>
      <rect x="16" y="28" width="68" height="14" rx="2" fill={accent} fillOpacity=".18" stroke={accent} strokeWidth="1.2"/>
      <path d="M16 26 l0 18 l14 0" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round"/>
      <circle cx="11" cy="30" r="3" fill={accent} fillOpacity=".7"/>
      <circle cx="11" cy="42" r="3" fill={accent} fillOpacity=".7"/>
    </svg>
  ),
  waterproof: ({ accent }) => (
    <svg viewBox="0 0 100 70" width="100" height="70" aria-hidden="true">
      <rect x="8" y="38" width="84" height="16" rx="2" fill={accent} fillOpacity=".12" stroke={accent} strokeWidth="1.2"/>
      <path d="M16 38 q6 -12 12 0 q6 12 12 0 q6 -12 12 0 q6 12 12 0 q6 -12 12 0" fill="none" stroke={accent} strokeWidth="1.5" strokeOpacity=".6"/>
      <rect x="42" y="14" width="16" height="22" rx="2" fill={accent} fillOpacity=".3" stroke={accent} strokeWidth="1"/>
      <path d="M47 36 l3 5 l3 -5" fill={accent} fillOpacity=".6"/>
    </svg>
  ),
  paint: ({ accent }) => (
    <svg viewBox="0 0 100 70" width="100" height="70" aria-hidden="true">
      <rect x="10" y="32" width="80" height="16" rx="2" fill={accent} fillOpacity=".12" stroke={accent} strokeWidth="1.2"/>
      <rect x="36" y="14" width="28" height="16" rx="4" fill={accent} fillOpacity=".4" stroke={accent} strokeWidth="1.2"/>
      <line x1="50" y1="30" x2="50" y2="32" stroke={accent} strokeWidth="2.5"/>
      {[0,1,2].map(i => (
        <path key={i} d={`M ${18 + i * 24} 32 q 6 -4 12 0 q 6 4 12 0`} fill="none" stroke={accent} strokeWidth="1.2" strokeOpacity=".5"/>
      ))}
    </svg>
  ),
  inspect: ({ accent }) => (
    <svg viewBox="0 0 100 70" width="100" height="70" aria-hidden="true">
      <rect x="14" y="8" width="52" height="54" rx="4" fill={accent} fillOpacity=".08" stroke={accent} strokeWidth="1.2"/>
      <path d="M24 35 l11 11 l22 -22" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="72" cy="50" r="12" fill="none" stroke={accent} strokeWidth="1.5"/>
      <line x1="81" y1="59" x2="90" y2="68" stroke={accent} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  ),
  screw: ({ accent }) => (
    <svg viewBox="0 0 100 70" width="100" height="70" aria-hidden="true">
      <rect x="8" y="12" width="84" height="14" rx="2" fill={accent} fillOpacity=".12" stroke={accent} strokeWidth="1.2"/>
      <rect x="8" y="30" width="84" height="14" rx="2" fill={accent} fillOpacity=".08" stroke={accent} strokeWidth="1"/>
      {[28, 50, 72].map(x => (
        <g key={x}>
          <line x1={x} y1="8" x2={x} y2="46" stroke={accent} strokeWidth="2.5"/>
          <line x1={x-5} y1="8" x2={x+5} y2="8" stroke={accent} strokeWidth="2.5"/>
          <polygon points={`${x},46 ${x-4},36 ${x+4},36`} fill={accent} fillOpacity=".8"/>
        </g>
      ))}
    </svg>
  ),
  complete: ({ accent }) => (
    <svg viewBox="0 0 100 70" width="100" height="70" aria-hidden="true">
      <circle cx="50" cy="35" r="26" fill="none" stroke={accent} strokeWidth="1" strokeOpacity=".3"/>
      <rect x="12" y="14" width="76" height="42" rx="6" fill={accent} fillOpacity=".1" stroke={accent} strokeWidth="1.5"/>
      <path d="M28 35 l14 14 l30 -28" fill="none" stroke={accent} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  // legacy aliases
  assemble: ({ accent }) => (
    <svg viewBox="0 0 100 70" width="100" height="70" aria-hidden="true">
      <rect x="6" y="8" width="12" height="54" rx="2" fill={accent} fillOpacity=".15" stroke={accent} strokeWidth="1.2"/>
      <rect x="82" y="8" width="12" height="54" rx="2" fill={accent} fillOpacity=".15" stroke={accent} strokeWidth="1.2"/>
      <rect x="18" y="10" width="64" height="10" rx="2" fill={accent} fillOpacity=".2" stroke={accent} strokeWidth="1"/>
      <rect x="18" y="52" width="64" height="10" rx="2" fill={accent} fillOpacity=".2" stroke={accent} strokeWidth="1"/>
      <path d="M44 34 l6 -4 l6 4" fill="none" stroke={accent} strokeWidth="1.5"/>
    </svg>
  ),
  install: ({ accent }) => (
    <svg viewBox="0 0 100 70" width="100" height="70" aria-hidden="true">
      <rect x="6" y="4" width="10" height="62" rx="1" fill={accent} fillOpacity=".12" stroke={accent} strokeWidth="1.2"/>
      <rect x="16" y="28" width="68" height="14" rx="2" fill={accent} fillOpacity=".18" stroke={accent} strokeWidth="1.2"/>
      <path d="M16 26 l0 18 l14 0" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round"/>
      <circle cx="11" cy="30" r="3" fill={accent} fillOpacity=".7"/>
      <circle cx="11" cy="42" r="3" fill={accent} fillOpacity=".7"/>
    </svg>
  ),
};

/* ── アイコン（iOS SF Symbol に対応するSVG） ── */
const Icons: Record<IllType, React.FC<{ color: string }>> = {
  // measure: ruler
  measure: ({ color }) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12h20M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3"/>
      <line x1="12" y1="9" x2="12" y2="15"/>
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
      <rect x="3" y="8" width="18" height="12" rx="2"/>
      <path d="M7 8V6a2 2 0 012-2h6a2 2 0 012 2v2"/>
      <line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/>
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
      <rect x="2" y="4" width="20" height="4" rx="1"/>
      <line x1="6" y1="8" x2="6" y2="20"/><line x1="18" y1="8" x2="18" y2="20"/>
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
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
      <path d="M12 2v8M5 12H2m20 0h-3M12 22v-4"/>
      <circle cx="12" cy="12" r="4"/>
      <path d="M8.5 8.5l-2-2M17.5 8.5l2-2"/>
    </svg>
  ),
  // complete: checkmark.seal.fill
  complete: ({ color }) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill={color} stroke="none" aria-hidden="true">
      <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.69 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.68L23 12zm-12.91 4.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z"/>
    </svg>
  ),
  assemble: ({ color }) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
    </svg>
  ),
  install: ({ color }) => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill={color} stroke="none" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
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

function resolveType(illustrationType: string | null | undefined, title: string, desc: string, order: number, total: number): IllType {
  if (illustrationType) {
    const known: IllType[] = [
      "measure","markLine","cut","sand","drill","foundation","levelCheck",
      "topBoard","frame","wallMount","waterproof","paint","inspect","screw","complete",
      "assemble","install",
    ];
    if (known.includes(illustrationType as IllType)) return illustrationType as IllType;
  }
  return detectType(title, desc, order, total);
}

export default function StepIllustration({ stepTitle, stepDescription, stepOrder, totalSteps, illustrationType }: Props) {
  const type = resolveType(illustrationType, stepTitle, stepDescription, stepOrder, totalSteps);
  const theme = THEMES[type];
  const Diagram = Diagrams[type];
  const Icon = Icons[type];

  // drill は暗背景なのでテキスト色を明るく
  const isDark = type === "drill";
  const labelColor = isDark ? "rgba(255,255,255,0.85)" : theme.accent;

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
      {/* 左パネル：ツールアイコン（iOS: Circle 64×64 + actionLabel） */}
      <div
        className="flex flex-col items-center justify-center gap-2 shrink-0 px-5"
        style={{ borderRight: `1px solid ${theme.accent}40` }}
      >
        {/* Circle アイコン（iOS: Circle fill accent 0.15 + stroke accent 0.30） */}
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
        {/* actionLabel（iOS: illType.actionLabel） */}
        <span
          className="text-[10px] font-bold text-center leading-tight"
          style={{ color: labelColor, maxWidth: 68 }}
        >
          {theme.actionLabel}
        </span>
      </div>

      {/* 右パネル：ダイアグラム */}
      <div className="flex-1 flex items-center justify-center">
        <Diagram accent={theme.accent} />
      </div>

      {/* 下部：左 label ＋ 右 STEP X/Y（iOS と同じ構成） */}
      <div className="absolute bottom-2 left-0 right-0 flex items-center justify-between px-3">
        {/* 左：illType.label（iOS: Text(illType.label) in Capsule） */}
        <span
          className="text-[9px] font-bold px-2 py-0.5 rounded-full"
          style={{
            background: `${theme.bgLight}E6`,
            color: `${theme.accent}D9`,
          }}
        >
          {theme.label}
        </span>
        {/* 右：STEP X/Y */}
        <span
          className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full"
          style={{
            background: `${theme.bgLight}E6`,
            color: theme.accent,
          }}
        >
          STEP {stepOrder} / {totalSteps}
        </span>
      </div>
    </div>
  );
}
