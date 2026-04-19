// 静的データ層（Firestore 接続前のモックデータ）
// iOS の UseCase.mock / Blueprint と対応

// ── Firebase Storage サムネイル ──────────────────────────

const STORAGE_BASE =
  "https://firebasestorage.googleapis.com/v0/b/zumen-d0625.firebasestorage.app/o/usecase-thumbnails%2F";

const categoryToFile: Record<string, string> = {
  "棚":             "thumb_shelf.png",
  "本棚":           "thumb_bookshelf.png",
  "TV台":           "thumb_tv_stand.png",
  "ダイニングテーブル": "thumb_dining_table.png",
  "デスク・作業台":  "thumb_desk.png",
  "ベンチ":         "thumb_bench.png",
  "ガーデンテーブル": "thumb_garden_table.png",
  "ウッドデッキ":   "thumb_deck.png",
  "ガーデンフェンス": "thumb_fence.png",
  "シューズラック":  "thumb_shoe_rack.png",
  "玄関収納":       "thumb_entrance_storage.png",
  "フラワーボックス": "thumb_flower_box.png",
  "プランター台":   "thumb_planter_stand.png",
  "コンポスト":     "thumb_compost.png",
  "キャットウォーク": "thumb_cat_walk.png",
  "キャットタワー": "thumb_cat_tower.png",
  "犬小屋":         "thumb_dog_house.png",
  "ペット用収納":   "thumb_pet_storage.png",
  "子供用家具":     "thumb_kids_furniture.png",
  "ハンガーラック": "thumb_hanger_rack.png",
  "物置・収納":     "thumb_storage_shed.png",
  "看板・インテリア": "thumb_sign.png",
};

export function getCategoryThumbnailURL(category: string): string | null {
  const file = categoryToFile[category];
  if (!file) return null;
  return `${STORAGE_BASE}${file}?alt=media`;
}

export type Difficulty = "初心者向け" | "中級者向け" | "上級者向け";
export type IndoorOutdoor = "室内" | "屋外" | "両用";
export type Retailer = "カインズ" | "コメリ";

export interface UseCase {
  id: string;
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  difficulty: Difficulty;
  estimatedBudgetMin: number;
  estimatedBudgetMax: number;
  estimatedTimeMinutes: number;
  indoorOutdoor: IndoorOutdoor;
  supportedRetailers: Retailer[];
  templateID: string;
  description: string;
  imageAlt: string;
}

export interface BlueprintDetail extends UseCase {
  dimensions: { width: number; depth: number; height: number };
  tools: string[];
  parts: { name: string; spec: string; quantity: number; unit: string }[];
  steps: { order: number; title: string; description: string }[];
  warnings: string[];
  relatedSlugs: string[];
}

// ── データ ──────────────────────────────────────────

export const useCases: UseCase[] = [
  {
    id: "uc-shelf-basic",
    slug: "kantan-wall-shelf",
    name: "かんたん壁面棚",
    category: "棚",
    categorySlug: "tana",
    difficulty: "初心者向け",
    estimatedBudgetMin: 3000,
    estimatedBudgetMax: 8000,
    estimatedTimeMinutes: 120,
    indoorOutdoor: "室内",
    supportedRetailers: ["カインズ", "コメリ"],
    templateID: "tpl-shelf-basic",
    description: "SPF材で作るシンプルな壁面棚。初めてのDIYにも最適。サイズを自由に調整できます。",
    imageAlt: "シンプルな木製壁面棚のDIY設計図",
  },
  {
    id: "uc-planter-stand",
    slug: "planter-stand",
    name: "プランター台",
    category: "プランター台",
    categorySlug: "planter-dai",
    difficulty: "初心者向け",
    estimatedBudgetMin: 2000,
    estimatedBudgetMax: 5000,
    estimatedTimeMinutes: 90,
    indoorOutdoor: "両用",
    supportedRetailers: ["カインズ", "コメリ"],
    templateID: "tpl-planter-stand",
    description: "お気に入りの植物を引き立てる木製のプランター台。屋外にも使えるシンプルデザイン。",
    imageAlt: "木製プランター台のDIY設計図",
  },
  {
    id: "uc-compost",
    slug: "compost-box",
    name: "コンポストボックス",
    category: "コンポスト",
    categorySlug: "compost",
    difficulty: "中級者向け",
    estimatedBudgetMin: 4000,
    estimatedBudgetMax: 10000,
    estimatedTimeMinutes: 180,
    indoorOutdoor: "屋外",
    supportedRetailers: ["カインズ", "コメリ"],
    templateID: "tpl-compost-box",
    description: "生ゴミを堆肥に変えるコンポストボックス。ガーデニングと組み合わせて循環型の暮らしへ。",
    imageAlt: "木製コンポストボックスのDIY設計図",
  },
  {
    id: "uc-bench",
    slug: "garden-bench",
    name: "ガーデンベンチ",
    category: "ベンチ",
    categorySlug: "bench",
    difficulty: "初心者向け",
    estimatedBudgetMin: 3000,
    estimatedBudgetMax: 7000,
    estimatedTimeMinutes: 120,
    indoorOutdoor: "両用",
    supportedRetailers: ["カインズ", "コメリ"],
    templateID: "tpl-bench",
    description: "2×4材で作るシンプルなガーデンベンチ。玄関・庭・ベランダに。防腐塗装で長持ち。",
    imageAlt: "木製ガーデンベンチのDIY設計図",
  },
  {
    id: "uc-deck",
    slug: "wood-deck",
    name: "ウッドデッキ",
    category: "ウッドデッキ",
    categorySlug: "deck",
    difficulty: "中級者向け",
    estimatedBudgetMin: 15000,
    estimatedBudgetMax: 40000,
    estimatedTimeMinutes: 480,
    indoorOutdoor: "屋外",
    supportedRetailers: ["カインズ", "コメリ"],
    templateID: "tpl-deck",
    description: "庭をもっと活用するためのウッドデッキ。根太・デッキ材の基本構造から学べる入門設計。",
    imageAlt: "木製ウッドデッキのDIY設計図",
  },
  {
    id: "uc-shoe-rack",
    slug: "shoe-rack",
    name: "シューズラック",
    category: "シューズラック",
    categorySlug: "shoe-rack",
    difficulty: "初心者向け",
    estimatedBudgetMin: 2000,
    estimatedBudgetMax: 5000,
    estimatedTimeMinutes: 90,
    indoorOutdoor: "室内",
    supportedRetailers: ["カインズ", "コメリ"],
    templateID: "tpl-shoe-rack",
    description: "玄関をすっきり整理するオープンシューズラック。SPF材で軽量コンパクトに仕上げる。",
    imageAlt: "木製シューズラックのDIY設計図",
  },
  {
    id: "uc-flower-box",
    slug: "flower-box",
    name: "フラワーボックス",
    category: "フラワーボックス",
    categorySlug: "flower-box",
    difficulty: "初心者向け",
    estimatedBudgetMin: 1500,
    estimatedBudgetMax: 4000,
    estimatedTimeMinutes: 60,
    indoorOutdoor: "両用",
    supportedRetailers: ["カインズ", "コメリ"],
    templateID: "tpl-flower-box",
    description: "窓辺や玄関先を彩る木製フラワーボックス。1×4材で作るビギナー向け定番DIY。",
    imageAlt: "木製フラワーボックスのDIY設計図",
  },
  {
    id: "uc-hanger-rack",
    slug: "hanger-rack",
    name: "ハンガーラック",
    category: "ハンガーラック",
    categorySlug: "hanger-rack",
    difficulty: "初心者向け",
    estimatedBudgetMin: 3000,
    estimatedBudgetMax: 8000,
    estimatedTimeMinutes: 90,
    indoorOutdoor: "室内",
    supportedRetailers: ["カインズ", "コメリ"],
    templateID: "tpl-hanger-rack",
    description: "衣類をおしゃれに収納するシンプルなハンガーラック。アイアンバーと木材の組み合わせ。",
    imageAlt: "木製ハンガーラックのDIY設計図",
  },
  {
    id: "uc-garden-table",
    slug: "garden-table",
    name: "ガーデンテーブル",
    category: "ガーデンテーブル",
    categorySlug: "garden-table",
    difficulty: "中級者向け",
    estimatedBudgetMin: 6000,
    estimatedBudgetMax: 15000,
    estimatedTimeMinutes: 240,
    indoorOutdoor: "屋外",
    supportedRetailers: ["カインズ", "コメリ"],
    templateID: "tpl-garden-table",
    description: "庭でのBBQや朝食に使えるガーデンテーブル。天板・脚の基本的な組み方を習得できる。",
    imageAlt: "木製ガーデンテーブルのDIY設計図",
  },
  {
    id: "uc-tv-stand",
    slug: "tv-stand",
    name: "テレビ台",
    category: "TV台",
    categorySlug: "tv-stand",
    difficulty: "中級者向け",
    estimatedBudgetMin: 8000,
    estimatedBudgetMax: 20000,
    estimatedTimeMinutes: 300,
    indoorOutdoor: "室内",
    supportedRetailers: ["カインズ", "コメリ"],
    templateID: "tpl-tv-stand",
    description: "すっきりとしたローボードタイプのテレビ台。引き戸付きで配線も隠せる本格仕様。",
    imageAlt: "木製テレビ台のDIY設計図",
  },
  {
    id: "uc-bookshelf",
    slug: "bookshelf",
    name: "本棚",
    category: "本棚",
    categorySlug: "bookshelf",
    difficulty: "初心者向け",
    estimatedBudgetMin: 4000,
    estimatedBudgetMax: 10000,
    estimatedTimeMinutes: 150,
    indoorOutdoor: "室内",
    supportedRetailers: ["カインズ", "コメリ"],
    templateID: "tpl-bookshelf",
    description: "文庫本からA4サイズまで対応する可動棚式の本棚。棚板の位置を自分で変えられる。",
    imageAlt: "木製本棚のDIY設計図",
  },
  {
    id: "uc-cat-walk",
    slug: "cat-walk",
    name: "キャットウォーク",
    category: "キャットウォーク",
    categorySlug: "cat-walk",
    difficulty: "中級者向け",
    estimatedBudgetMin: 5000,
    estimatedBudgetMax: 12000,
    estimatedTimeMinutes: 180,
    indoorOutdoor: "室内",
    supportedRetailers: ["カインズ", "コメリ"],
    templateID: "tpl-cat-walk",
    description: "壁を活用した猫用キャットウォーク。ステップ板を壁に固定してスペースを有効活用。",
    imageAlt: "DIYキャットウォークの設計図",
  },
];

export const blueprintDetails: BlueprintDetail[] = [
  // ── ベンチ ────────────────────────────────────────────
  {
    ...useCases.find((u) => u.id === "uc-bench")!,
    dimensions: { width: 1200, depth: 350, height: 430 },
    tools: ["電動ドライバー", "メジャー", "鉛筆", "のこぎり（カットサービス利用可）"],
    parts: [
      { name: "天板 (2×6材)", spec: "1200mm", quantity: 2, unit: "枚" },
      { name: "脚材 (2×4材)", spec: "400mm", quantity: 4, unit: "本" },
      { name: "幕板 (2×4材)", spec: "1200mm", quantity: 2, unit: "本" },
      { name: "コーススレッド", spec: "65mm", quantity: 40, unit: "本" },
    ],
    steps: [
      { order: 1, title: "材料をカット", description: "脚材・幕板・天板を指定サイズにカットします。" },
      { order: 2, title: "脚フレームを組む", description: "脚材2本を幕板でつないで左右のコの字フレームを作ります。" },
      { order: 3, title: "左右フレームをつなぐ", description: "もう1本の幕板で左右フレームを連結して台座を完成させます。" },
      { order: 4, title: "天板を固定", description: "天板を2枚並べ、台座にコーススレッドで固定します。" },
      { order: 5, title: "仕上げ・塗装", description: "サンドペーパーで仕上げ、屋外用の場合は防腐塗装を施します。" },
    ],
    warnings: ["屋外使用の場合は防腐塗装が必須です", "耐荷重は約100kgです"],
    relatedSlugs: ["garden-table", "planter-stand"],
  },
  // ── ウッドデッキ ────────────────────────────────────────
  {
    ...useCases.find((u) => u.id === "uc-deck")!,
    dimensions: { width: 1800, depth: 1200, height: 300 },
    tools: ["電動ドライバー", "丸ノコまたはのこぎり", "メジャー", "水平器", "墨つぼ"],
    parts: [
      { name: "デッキ材 (イペ or SPF)", spec: "1800mm", quantity: 12, unit: "枚" },
      { name: "根太 (2×4材)", spec: "1200mm", quantity: 6, unit: "本" },
      { name: "大引き (4×4材)", spec: "1800mm", quantity: 3, unit: "本" },
      { name: "束石", spec: "150mm角", quantity: 6, unit: "個" },
      { name: "コーススレッド", spec: "90mm", quantity: 100, unit: "本" },
    ],
    steps: [
      { order: 1, title: "レイアウトと束石設置", description: "設置場所を決め、水平に束石を配置します。" },
      { order: 2, title: "大引きを設置", description: "束石の上に大引きを水平に並べます。" },
      { order: 3, title: "根太を固定", description: "大引きと直交するよう根太を等間隔に固定します。" },
      { order: 4, title: "デッキ材を張る", description: "デッキ材を5mm間隔で並べ、コーススレッドで固定します。" },
      { order: 5, title: "仕上げ塗装", description: "防腐・防水塗料を2度塗りします。" },
    ],
    warnings: ["束石は必ず水平に設置してください", "木材は防腐処理済みのものを推奨します", "隣地境界から十分な距離を確保してください"],
    relatedSlugs: ["garden-bench", "garden-table"],
  },
  // ── シューズラック ───────────────────────────────────────
  {
    ...useCases.find((u) => u.id === "uc-shoe-rack")!,
    dimensions: { width: 600, depth: 300, height: 500 },
    tools: ["電動ドライバー", "メジャー", "鉛筆", "のこぎり"],
    parts: [
      { name: "側板 (SPF 1×10材)", spec: "500mm", quantity: 2, unit: "枚" },
      { name: "棚板 (SPF 1×10材)", spec: "600mm", quantity: 3, unit: "枚" },
      { name: "背板 (ベニヤ 4mm)", spec: "600×500mm", quantity: 1, unit: "枚" },
      { name: "コーススレッド", spec: "38mm", quantity: 30, unit: "本" },
    ],
    steps: [
      { order: 1, title: "材料をカット", description: "各パーツを指定サイズにカットします。" },
      { order: 2, title: "棚板を側板に固定", description: "上・中・下の棚板を側板に固定してラック本体を作ります。" },
      { order: 3, title: "背板を取り付け", description: "背面にベニヤを固定して歪みを防ぎます。" },
      { order: 4, title: "仕上げ", description: "やすりがけ後、好みで塗装または蜜蝋ワックスを塗ります。" },
    ],
    warnings: ["重い荷物を乗せる場合は棚板の厚みを増やしてください"],
    relatedSlugs: ["kantan-wall-shelf", "hanger-rack"],
  },
  // ── ハンガーラック ───────────────────────────────────────
  {
    ...useCases.find((u) => u.id === "uc-hanger-rack")!,
    dimensions: { width: 900, depth: 400, height: 1600 },
    tools: ["電動ドライバー", "メジャー", "レンチ", "のこぎり"],
    parts: [
      { name: "支柱 (2×4材)", spec: "1600mm", quantity: 2, unit: "本" },
      { name: "横桟 (2×4材)", spec: "900mm", quantity: 2, unit: "本" },
      { name: "ハンガーパイプ (アイアン丸棒)", spec: "φ19mm × 900mm", quantity: 1, unit: "本" },
      { name: "フランジ (パイプ取付金具)", spec: "φ19mm対応", quantity: 2, unit: "個" },
      { name: "コーススレッド", spec: "65mm", quantity: 20, unit: "本" },
      { name: "ボルト・ナット", spec: "M8 × 40mm", quantity: 4, unit: "組" },
    ],
    steps: [
      { order: 1, title: "材料をカット・やすりがけ", description: "各部材を指定サイズにカットしてやすりがけします。" },
      { order: 2, title: "フレームを組む", description: "支柱2本を横桟2本でつなぎ、H型のフレームを作ります。" },
      { order: 3, title: "フランジを取り付け", description: "ハンガーパイプの取付位置にフランジをビス留めします。" },
      { order: 4, title: "ハンガーパイプを通す", description: "アイアン丸棒をフランジに差し込んで固定します。" },
      { order: 5, title: "仕上げ塗装", description: "好みの色でペイントまたはオイル仕上げにします。" },
    ],
    warnings: ["転倒防止のため壁に固定することを推奨します"],
    relatedSlugs: ["kantan-wall-shelf", "shoe-rack"],
  },
  {
    ...useCases[0],
    dimensions: { width: 900, depth: 200, height: 1200 },
    tools: ["電動ドライバー", "メジャー", "鉛筆", "のこぎり（カットサービス利用可）"],
    parts: [
      { name: "棚板 (SPF 1x8)", spec: "900mm", quantity: 4, unit: "枚" },
      { name: "側板 (SPF 1x8)", spec: "1200mm", quantity: 2, unit: "枚" },
      { name: "背板 (ベニヤ)", spec: "900×1200mm", quantity: 1, unit: "枚" },
      { name: "コーススレッド", spec: "65mm", quantity: 50, unit: "本" },
    ],
    steps: [
      { order: 1, title: "材料をカット", description: "ホームセンターのカットサービスを利用すると便利です。" },
      { order: 2, title: "やすりがけ", description: "切断面を#120→#240の順でやすりがけします。" },
      { order: 3, title: "側板に棚板を固定", description: "電動ドライバーでコーススレッドを打ち込みます。" },
      { order: 4, title: "背板を取り付け", description: "ベニヤを背板として固定し、歪みを防ぎます。" },
      { order: 5, title: "仕上げ", description: "好みに応じてオイルステインや塗装を施します。" },
    ],
    warnings: ["耐荷重は棚1枚あたり約10kgです", "壁への固定は別途壁掛け金具が必要です"],
    relatedSlugs: ["planter-stand"],
  },
  {
    ...useCases[1],
    dimensions: { width: 400, depth: 400, height: 600 },
    tools: ["電動ドライバー", "メジャー", "鉛筆", "のこぎり"],
    parts: [
      { name: "天板 (SPF 1x6)", spec: "400mm", quantity: 1, unit: "枚" },
      { name: "脚材 (2×4)", spec: "560mm", quantity: 4, unit: "本" },
      { name: "横桟 (SPF 1x4)", spec: "360mm", quantity: 4, unit: "本" },
      { name: "コーススレッド", spec: "65mm", quantity: 30, unit: "本" },
    ],
    steps: [
      { order: 1, title: "材料をカット", description: "各パーツを指定サイズにカットします。" },
      { order: 2, title: "脚を組む", description: "4本の脚を横桟でつなぎ箱型の台座を作ります。" },
      { order: 3, title: "天板を固定", description: "台座上部に天板を固定します。" },
    ],
    warnings: ["屋外使用の場合は防腐塗装を施してください"],
    relatedSlugs: ["kantan-wall-shelf", "compost-box"],
  },
  {
    ...useCases[2],
    dimensions: { width: 600, depth: 600, height: 700 },
    tools: ["電動ドライバー", "丸ノコまたはのこぎり", "メジャー", "鉛筆", "L字金具"],
    parts: [
      { name: "側板・前後板 (杉板)", spec: "700mm", quantity: 4, unit: "枚" },
      { name: "底板 (杉板)", spec: "600×600mm", quantity: 1, unit: "枚" },
      { name: "蓋板 (杉板)", spec: "600×600mm", quantity: 1, unit: "枚" },
      { name: "コーススレッド", spec: "75mm", quantity: 60, unit: "本" },
      { name: "蝶番", spec: "中型", quantity: 2, unit: "個" },
      { name: "防虫ネット", spec: "70cm角", quantity: 1, unit: "枚" },
    ],
    steps: [
      { order: 1, title: "材料をカット", description: "全パーツを所定のサイズにカットします。" },
      { order: 2, title: "箱型に組む", description: "4枚の板でコの字型に組み、コーススレッドで固定します。" },
      { order: 3, title: "底板を固定", description: "底板を取り付けます。水はけのため数箇所穴をあけておきます。" },
      { order: 4, title: "防虫ネットを貼る", description: "側面内側に防虫ネットをタッカーで固定します。" },
      { order: 5, title: "蓋を取り付ける", description: "蝶番で蓋板を固定します。" },
    ],
    warnings: [
      "屋外使用のため防腐塗装必須です",
      "設置場所は排水のよい場所を選んでください",
    ],
    relatedSlugs: ["planter-stand"],
  },
];

export const categories = [
  { slug: "tana",        name: "棚",             description: "壁面棚・ディスプレイ棚など",       count: 1 },
  { slug: "bookshelf",   name: "本棚",            description: "文庫からA4まで対応する本棚",        count: 1 },
  { slug: "tv-stand",    name: "TV台",            description: "ローボード・テレビ台",              count: 1 },
  { slug: "bench",       name: "ベンチ",           description: "玄関・庭に使える木製ベンチ",        count: 1 },
  { slug: "deck",        name: "ウッドデッキ",     description: "庭を拡張するウッドデッキ",          count: 1 },
  { slug: "shoe-rack",   name: "シューズラック",   description: "玄関をすっきり整理",               count: 1 },
  { slug: "flower-box",  name: "フラワーボックス", description: "窓辺・玄関先を彩るボックス",        count: 1 },
  { slug: "planter-dai", name: "プランター台",     description: "室内外で使える植物台",             count: 1 },
  { slug: "compost",     name: "コンポスト",       description: "家庭菜園と組み合わせた循環型DIY",   count: 1 },
  { slug: "hanger-rack", name: "ハンガーラック",   description: "衣類をおしゃれに収納",             count: 1 },
  { slug: "garden-table",name: "ガーデンテーブル", description: "庭で使えるアウトドアテーブル",      count: 1 },
  { slug: "cat-walk",    name: "キャットウォーク", description: "壁付きの猫用ステップ",             count: 1 },
];

export function getUseCaseBySlug(slug: string): UseCase | undefined {
  return useCases.find((uc) => uc.slug === slug);
}

export function getBlueprintBySlug(slug: string): BlueprintDetail | undefined {
  return blueprintDetails.find((bp) => bp.slug === slug);
}

export function getUseCasesByCategory(categorySlug: string): UseCase[] {
  return useCases.filter((uc) => uc.categorySlug === categorySlug);
}

export function formatBudget(min: number, max: number): string {
  return `¥${min.toLocaleString()}〜¥${max.toLocaleString()}`;
}

export function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}分`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}時間${m}分` : `${h}時間`;
}
