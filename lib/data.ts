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
];

export const blueprintDetails: BlueprintDetail[] = [
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
  { slug: "tana", name: "棚", description: "壁面棚・ディスプレイ棚・本棚など", count: 1 },
  { slug: "planter-dai", name: "プランター台", description: "室内外で使える植物台", count: 1 },
  { slug: "compost", name: "コンポスト", description: "家庭菜園と組み合わせた循環型DIY", count: 1 },
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
