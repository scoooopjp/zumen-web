// 静的データ層（Firestore 接続前のモックデータ）
// iOS の UseCase.mock / Blueprint と対応

// ── Firebase Storage サムネイル ──────────────────────────

// リサイズ済みサムネイル（600px幅・JPEG）を使用
const STORAGE_BASE =
  "https://firebasestorage.googleapis.com/v0/b/zumen-d0625.firebasestorage.app/o/usecase-thumbnails-resized%2F";

const categoryToFile: Record<string, string> = {
  "棚":             "thumb_shelf.jpg",
  "本棚":           "thumb_bookshelf.jpg",
  "TV台":           "thumb_tv_stand.jpg",
  "ダイニングテーブル": "thumb_dining_table.jpg",
  "デスク・作業台":  "thumb_desk.jpg",
  "ベンチ":         "thumb_bench.jpg",
  "ガーデンテーブル": "thumb_garden_table.jpg",
  "ウッドデッキ":   "thumb_deck.jpg",
  "ガーデンフェンス": "thumb_fence.jpg",
  "シューズラック":  "thumb_shoe_rack.jpg",
  "玄関収納":       "thumb_entrance_storage.jpg",
  "フラワーボックス": "thumb_flower_box.jpg",
  "プランター台":   "thumb_planter_stand.jpg",
  "コンポスト":     "thumb_compost.jpg",
  "キャットウォーク": "thumb_cat_walk.jpg",
  "キャットタワー": "thumb_cat_tower.jpg",
  "犬小屋":         "thumb_dog_house.jpg",
  "ペット用収納":   "thumb_pet_storage.jpg",
  "子供用家具":     "thumb_kids_furniture.jpg",
  "ハンガーラック": "thumb_hanger_rack.jpg",
  "物置・収納":     "thumb_storage_shed.jpg",
  "看板・インテリア": "thumb_sign.jpg",
};

export function getCategoryThumbnailURL(category: string): string | null {
  const file = categoryToFile[category];
  if (!file) return null;
  return `${STORAGE_BASE}${file}?alt=media`;
}

export type Difficulty = "初心者向け" | "中級者向け" | "上級者向け";
export type IndoorOutdoor = "室内" | "屋外" | "両用";
export type Retailer = "カインズ" | "コメリ" | "コーナン" | "DCM";

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
  /** Firebase Storage の useCaseID 固有サムネイル URL */
  imageURL?: string;
}

export interface Part {
  name: string;
  spec: string;
  quantity: number;
  unit: string;
  note?: string;
  cainzURL?: string;  // カインズ購入リンク
  komeriURL?: string; // コメリ購入リンク
  kohnanURL?: string; // コーナン購入リンク
  dcmURL?: string;    // DCM購入リンク
}

// ── 購入リンク定数（RetailerCatalog.swift と同期） ──────────────────
const C = {
  spf1x4:  "https://www.cainz.com/search?q=SPF+1x4",
  spf1x6:  "https://www.cainz.com/search?q=SPF+1x6",
  spf1x8:  "https://www.cainz.com/search?q=SPF+1x8",
  spf2x4:  "https://www.cainz.com/search?q=SPF+2x4",
  cedar:   "https://www.cainz.com/search?q=%E3%83%AC%E3%83%83%E3%83%89%E3%82%B7%E3%83%80%E3%83%BC",
  plywood: "https://www.cainz.com/search?q=%E3%83%99%E3%83%8B%E3%83%A4%E5%90%88%E6%9D%BF",
  screw:   "https://www.cainz.com/search?q=%E3%82%B3%E3%83%BC%E3%82%B9%E3%83%AC%E3%83%83%E3%83%89",
  bracket: "https://www.cainz.com/search?q=L%E5%AD%97%E9%87%91%E5%85%B7",
  hinge:   "https://www.cainz.com/search?q=%E8%9D%B6%E7%95%AA",
  net:     "https://www.cainz.com/search?q=%E9%89%A2%E5%BA%95%E3%83%8D%E3%83%83%E3%83%88",
  lumber:  "https://www.cainz.com/search?q=%E6%9C%A8%E6%9D%90",
  hardware:"https://www.cainz.com/search?q=%E9%87%91%E7%89%A9",
};
const K = {
  spf1x4:  "https://www.komeri.com/shop/goods/search.aspx?search=x&category=&keyword=1x4+SPF",
  spf1x6:  "https://www.komeri.com/shop/goods/search.aspx?search=x&category=&keyword=1x6+SPF",
  spf1x8:  "https://www.komeri.com/shop/goods/search.aspx?search=x&category=&keyword=1x8+SPF",
  spf2x4:  "https://www.komeri.com/shop/goods/search.aspx?search=x&category=&keyword=2x4+SPF",
  cedar:   "https://www.komeri.com/shop/goods/search.aspx?search=x&category=&keyword=%E3%83%AC%E3%83%83%E3%83%89%E3%82%B7%E3%83%80%E3%83%BC",
  plywood: "https://www.komeri.com/shop/goods/search.aspx?search=x&category=&keyword=%E3%83%99%E3%83%8B%E3%83%A4",
  sugi:    "https://www.komeri.com/shop/goods/search.aspx?search=x&category=&keyword=%E6%9D%89%E6%9D%BF",
  screw:   "https://www.komeri.com/shop/goods/search.aspx?search=x&category=&keyword=%E3%82%B3%E3%83%BC%E3%82%B9%E3%83%AC%E3%83%83%E3%83%89",
  bracket: "https://www.komeri.com/shop/goods/search.aspx?search=x&category=&keyword=L%E5%AD%97%E9%87%91%E5%85%B7",
  hinge:   "https://www.komeri.com/shop/goods/search.aspx?search=x&category=&keyword=%E8%9D%B6%E7%95%AA",
  net:     "https://www.komeri.com/shop/goods/search.aspx?search=x&category=&keyword=%E9%89%A2%E5%BA%95%E3%83%8D%E3%83%83%E3%83%88",
  flange:  "https://www.komeri.com/shop/goods/search.aspx?search=x&category=&keyword=%E3%83%95%E3%83%A9%E3%83%B3%E3%82%B8",
  pipe:    "https://www.komeri.com/shop/goods/search.aspx?search=x&category=&keyword=%E3%82%A2%E3%82%A4%E3%82%A2%E3%83%B3%E3%83%91%E3%82%A4%E3%83%97",
  lumber:  "https://www.komeri.com/shop/goods/search.aspx?search=x&category=&keyword=%E6%9C%A8%E6%9D%90",
  stone:   "https://www.komeri.com/shop/goods/search.aspx?search=x&category=&keyword=%E6%9D%9F%E7%9F%B3",
};
const KH = {
  spf1x4:  "https://www.kohnan-eshop.com/shop/goods/search.aspx?search=x&category=&keyword=1x4+SPF&search=search",
  spf1x6:  "https://www.kohnan-eshop.com/shop/goods/search.aspx?search=x&category=&keyword=1x6+SPF&search=search",
  spf1x8:  "https://www.kohnan-eshop.com/shop/goods/search.aspx?search=x&category=&keyword=1x8+SPF&search=search",
  spf2x4:  "https://www.kohnan-eshop.com/shop/goods/search.aspx?search=x&category=&keyword=2x4+SPF&search=search",
  cedar:   "https://www.kohnan-eshop.com/shop/goods/search.aspx?search=x&category=&keyword=%E3%83%AC%E3%83%83%E3%83%89%E3%82%B7%E3%83%80%E3%83%BC&search=search",
  plywood: "https://www.kohnan-eshop.com/shop/goods/search.aspx?search=x&category=&keyword=%E3%83%99%E3%83%8B%E3%83%A4%E5%90%88%E6%9D%BF&search=search",
  sugi:    "https://www.kohnan-eshop.com/shop/goods/search.aspx?search=x&category=&keyword=%E6%9D%89%E6%9D%BF&search=search",
  screw:   "https://www.kohnan-eshop.com/shop/goods/search.aspx?search=x&category=&keyword=%E3%82%B3%E3%83%BC%E3%82%B9%E3%83%AC%E3%83%83%E3%83%89&search=search",
  bracket: "https://www.kohnan-eshop.com/shop/goods/search.aspx?search=x&category=&keyword=L%E5%AD%97%E9%87%91%E5%85%B7&search=search",
  hinge:   "https://www.kohnan-eshop.com/shop/goods/search.aspx?search=x&category=&keyword=%E8%9D%B6%E7%95%AA&search=search",
  net:     "https://www.kohnan-eshop.com/shop/goods/search.aspx?search=x&category=&keyword=%E9%89%A2%E5%BA%95%E3%83%8D%E3%83%83%E3%83%88&search=search",
  flange:  "https://www.kohnan-eshop.com/shop/goods/search.aspx?search=x&category=&keyword=%E3%83%95%E3%83%A9%E3%83%B3%E3%82%B8&search=search",
  pipe:    "https://www.kohnan-eshop.com/shop/goods/search.aspx?search=x&category=&keyword=%E3%82%A2%E3%82%A4%E3%82%A2%E3%83%B3%E3%83%91%E3%82%A4%E3%83%97&search=search",
  lumber:  "https://www.kohnan-eshop.com/shop/goods/search.aspx?search=x&category=&keyword=%E6%9C%A8%E6%9D%90&search=search",
  stone:   "https://www.kohnan-eshop.com/shop/goods/search.aspx?search=x&category=&keyword=%E8%B8%8F%E3%81%BF%E7%9F%B3&search=search",
};
const D = {
  spf1x4:  "https://www.dcm-ekurashi.com/search/?dispNo=&q=1x4+SPF&x=0&y=0&searchbox=1",
  spf1x6:  "https://www.dcm-ekurashi.com/search/?dispNo=&q=1x6+SPF&x=0&y=0&searchbox=1",
  spf1x8:  "https://www.dcm-ekurashi.com/search/?dispNo=&q=1x8+SPF&x=0&y=0&searchbox=1",
  spf2x4:  "https://www.dcm-ekurashi.com/search/?dispNo=&q=2x4+SPF&x=0&y=0&searchbox=1",
  cedar:   "https://www.dcm-ekurashi.com/search/?dispNo=&q=%E3%83%AC%E3%83%83%E3%83%89%E3%82%B7%E3%83%80%E3%83%BC&x=0&y=0&searchbox=1",
  plywood: "https://www.dcm-ekurashi.com/search/?dispNo=&q=%E3%83%99%E3%83%8B%E3%83%A4%E5%90%88%E6%9D%BF&x=0&y=0&searchbox=1",
  sugi:    "https://www.dcm-ekurashi.com/search/?dispNo=&q=%E6%9D%89%E6%9D%BF&x=0&y=0&searchbox=1",
  screw:   "https://www.dcm-ekurashi.com/search/?dispNo=&q=%E3%82%B3%E3%83%BC%E3%82%B9%E3%83%AC%E3%83%83%E3%83%89&x=0&y=0&searchbox=1",
  bracket: "https://www.dcm-ekurashi.com/search/?dispNo=&q=L%E5%AD%97%E9%87%91%E5%85%B7&x=0&y=0&searchbox=1",
  hinge:   "https://www.dcm-ekurashi.com/search/?dispNo=&q=%E8%9D%B6%E7%95%AA&x=0&y=0&searchbox=1",
  net:     "https://www.dcm-ekurashi.com/search/?dispNo=&q=%E9%89%A2%E5%BA%95%E3%83%8D%E3%83%83%E3%83%88&x=0&y=0&searchbox=1",
  flange:  "https://www.dcm-ekurashi.com/search/?dispNo=&q=%E3%83%95%E3%83%A9%E3%83%B3%E3%82%B8&x=0&y=0&searchbox=1",
  pipe:    "https://www.dcm-ekurashi.com/search/?dispNo=&q=%E3%82%A2%E3%82%A4%E3%82%A2%E3%83%B3%E3%83%91%E3%82%A4%E3%83%97&x=0&y=0&searchbox=1",
  lumber:  "https://www.dcm-ekurashi.com/search/?dispNo=&q=%E6%9C%A8%E6%9D%90&x=0&y=0&searchbox=1",
  stone:   "https://www.dcm-ekurashi.com/search/?dispNo=&q=%E8%B8%8F%E3%81%BF%E7%9F%B3&x=0&y=0&searchbox=1",
};

export interface CutItem {
  partName: string;
  thickness: number; // mm
  width: number;     // mm
  length: number;    // mm
  quantity: number;
}

export interface BlueprintDetail extends UseCase {
  dimensions: { width: number; depth: number; height: number };
  tools: string[];
  parts: Part[];
  cutItems: CutItem[];
  steps: { order: number; title: string; description: string }[];
  warnings: string[];
  relatedSlugs: string[];
}

// ── データ ──────────────────────────────────────────

export const useCases: UseCase[] = [
  {
    id: "kantan-wall-shelf",
    slug: "kantan-wall-shelf",
    name: "かんたん壁面棚",
    category: "棚",
    categorySlug: "tana",
    difficulty: "初心者向け",
    estimatedBudgetMin: 3000,
    estimatedBudgetMax: 8000,
    estimatedTimeMinutes: 120,
    indoorOutdoor: "室内",
    supportedRetailers: ["カインズ", "コメリ", "コーナン", "DCM"],
    templateID: "tpl-shelf-basic",
    description: "SPF材で作るシンプルな壁面棚。初めてのDIYにも最適。サイズを自由に調整できます。",
    imageAlt: "シンプルな木製壁面棚のDIY設計図",
  },
  {
    id: "planter-stand",
    slug: "planter-stand",
    name: "プランター台",
    category: "プランター台",
    categorySlug: "planter-dai",
    difficulty: "初心者向け",
    estimatedBudgetMin: 2000,
    estimatedBudgetMax: 5000,
    estimatedTimeMinutes: 90,
    indoorOutdoor: "両用",
    supportedRetailers: ["カインズ", "コメリ", "コーナン", "DCM"],
    templateID: "tpl-planter-stand",
    description: "お気に入りの植物を引き立てる木製のプランター台。屋外にも使えるシンプルデザイン。",
    imageAlt: "木製プランター台のDIY設計図",
  },
  {
    id: "compost-box",
    slug: "compost-box",
    name: "コンポストボックス",
    category: "コンポスト",
    categorySlug: "compost",
    difficulty: "中級者向け",
    estimatedBudgetMin: 4000,
    estimatedBudgetMax: 10000,
    estimatedTimeMinutes: 180,
    indoorOutdoor: "屋外",
    supportedRetailers: ["カインズ", "コメリ", "コーナン", "DCM"],
    templateID: "tpl-compost-box",
    description: "生ゴミを堆肥に変えるコンポストボックス。ガーデニングと組み合わせて循環型の暮らしへ。",
    imageAlt: "木製コンポストボックスのDIY設計図",
  },
  {
    id: "garden-bench",
    slug: "garden-bench",
    name: "ガーデンベンチ",
    category: "ベンチ",
    categorySlug: "bench",
    difficulty: "初心者向け",
    estimatedBudgetMin: 3000,
    estimatedBudgetMax: 7000,
    estimatedTimeMinutes: 120,
    indoorOutdoor: "両用",
    supportedRetailers: ["カインズ", "コメリ", "コーナン", "DCM"],
    templateID: "tpl-bench",
    description: "2×4材で作るシンプルなガーデンベンチ。玄関・庭・ベランダに。防腐塗装で長持ち。",
    imageAlt: "木製ガーデンベンチのDIY設計図",
  },
  {
    id: "wood-deck",
    slug: "wood-deck",
    name: "ウッドデッキ",
    category: "ウッドデッキ",
    categorySlug: "deck",
    difficulty: "中級者向け",
    estimatedBudgetMin: 15000,
    estimatedBudgetMax: 40000,
    estimatedTimeMinutes: 480,
    indoorOutdoor: "屋外",
    supportedRetailers: ["カインズ", "コメリ", "コーナン", "DCM"],
    templateID: "tpl-wood-deck",
    description: "庭をもっと活用するためのウッドデッキ。根太・デッキ材の基本構造から学べる入門設計。",
    imageAlt: "木製ウッドデッキのDIY設計図",
  },
  {
    id: "shoe-rack",
    slug: "shoe-rack",
    name: "シューズラック",
    category: "シューズラック",
    categorySlug: "shoe-rack",
    difficulty: "初心者向け",
    estimatedBudgetMin: 2000,
    estimatedBudgetMax: 5000,
    estimatedTimeMinutes: 90,
    indoorOutdoor: "室内",
    supportedRetailers: ["カインズ", "コメリ", "コーナン", "DCM"],
    templateID: "tpl-shoe-rack",
    description: "玄関をすっきり整理するオープンシューズラック。SPF材で軽量コンパクトに仕上げる。",
    imageAlt: "木製シューズラックのDIY設計図",
  },
  {
    id: "flower-box",
    slug: "flower-box",
    name: "フラワーボックス",
    category: "フラワーボックス",
    categorySlug: "flower-box",
    difficulty: "初心者向け",
    estimatedBudgetMin: 1500,
    estimatedBudgetMax: 4000,
    estimatedTimeMinutes: 60,
    indoorOutdoor: "両用",
    supportedRetailers: ["カインズ", "コメリ", "コーナン", "DCM"],
    templateID: "tpl-flower-box",
    description: "窓辺や玄関先を彩る木製フラワーボックス。1×4材で作るビギナー向け定番DIY。",
    imageAlt: "木製フラワーボックスのDIY設計図",
  },
  {
    id: "hanger-rack",
    slug: "hanger-rack",
    name: "ハンガーラック",
    category: "ハンガーラック",
    categorySlug: "hanger-rack",
    difficulty: "初心者向け",
    estimatedBudgetMin: 3000,
    estimatedBudgetMax: 8000,
    estimatedTimeMinutes: 90,
    indoorOutdoor: "室内",
    supportedRetailers: ["カインズ", "コメリ", "コーナン", "DCM"],
    templateID: "tpl-hanger-rack",
    description: "衣類をおしゃれに収納するシンプルなハンガーラック。アイアンバーと木材の組み合わせ。",
    imageAlt: "木製ハンガーラックのDIY設計図",
  },
  {
    id: "garden-table",
    slug: "garden-table",
    name: "ガーデンテーブル",
    category: "ガーデンテーブル",
    categorySlug: "garden-table",
    difficulty: "中級者向け",
    estimatedBudgetMin: 6000,
    estimatedBudgetMax: 15000,
    estimatedTimeMinutes: 240,
    indoorOutdoor: "屋外",
    supportedRetailers: ["カインズ", "コメリ", "コーナン", "DCM"],
    templateID: "tpl-garden-table",
    description: "庭でのBBQや朝食に使えるガーデンテーブル。天板・脚の基本的な組み方を習得できる。",
    imageAlt: "木製ガーデンテーブルのDIY設計図",
  },
  {
    id: "tv-stand",
    slug: "tv-stand",
    name: "テレビ台",
    category: "TV台",
    categorySlug: "tv-stand",
    difficulty: "中級者向け",
    estimatedBudgetMin: 8000,
    estimatedBudgetMax: 20000,
    estimatedTimeMinutes: 300,
    indoorOutdoor: "室内",
    supportedRetailers: ["カインズ", "コメリ", "コーナン", "DCM"],
    templateID: "tpl-tv-stand",
    description: "すっきりとしたローボードタイプのテレビ台。引き戸付きで配線も隠せる本格仕様。",
    imageAlt: "木製テレビ台のDIY設計図",
  },
  {
    id: "bookshelf",
    slug: "bookshelf",
    name: "本棚",
    category: "本棚",
    categorySlug: "bookshelf",
    difficulty: "初心者向け",
    estimatedBudgetMin: 4000,
    estimatedBudgetMax: 10000,
    estimatedTimeMinutes: 150,
    indoorOutdoor: "室内",
    supportedRetailers: ["カインズ", "コメリ", "コーナン", "DCM"],
    templateID: "tpl-bookshelf",
    description: "文庫本からA4サイズまで対応する可動棚式の本棚。棚板の位置を自分で変えられる。",
    imageAlt: "木製本棚のDIY設計図",
  },
  {
    id: "cat-walk",
    slug: "cat-walk",
    name: "キャットウォーク",
    category: "キャットウォーク",
    categorySlug: "cat-walk",
    difficulty: "中級者向け",
    estimatedBudgetMin: 5000,
    estimatedBudgetMax: 12000,
    estimatedTimeMinutes: 180,
    indoorOutdoor: "室内",
    supportedRetailers: ["カインズ", "コメリ", "コーナン", "DCM"],
    templateID: "tpl-cat-walk",
    description: "壁を活用した猫用キャットウォーク。ステップ板を壁に固定してスペースを有効活用。",
    imageAlt: "DIYキャットウォークの設計図",
  },
];

export const blueprintDetails: BlueprintDetail[] = [
  // ── ベンチ ────────────────────────────────────────────
  {
    ...useCases.find((u) => u.id === "garden-bench")!,
    dimensions: { width: 1200, depth: 350, height: 430 },
    tools: ["電動ドライバー", "メジャー", "鉛筆", "のこぎり（カットサービス利用可）"],
    parts: [
      { name: "天板 (2×6材)", spec: "38×140×1200mm", quantity: 2, unit: "枚", cainzURL: C.lumber, komeriURL: "https://www.komeri.com/disp/CKmSfKeyWordPage.jsp?KEYWORDS=2x6+SPF", kohnanURL: "https://www.kohnan-eshop.com/shop/search?searchWord=2x6+SPF", dcmURL: "https://www.dcm-online.jp/search?q=2x6+SPF" },
      { name: "脚材 (2×4材)", spec: "38×89×400mm", quantity: 4, unit: "本", cainzURL: C.spf2x4, komeriURL: K.spf2x4, kohnanURL: KH.spf2x4, dcmURL: D.spf2x4 },
      { name: "幕板 (2×4材)", spec: "38×89×1200mm", quantity: 2, unit: "本", cainzURL: C.spf2x4, komeriURL: K.spf2x4, kohnanURL: KH.spf2x4, dcmURL: D.spf2x4 },
      { name: "コーススレッド", spec: "65mm", quantity: 40, unit: "本", note: "約40本使用", cainzURL: C.screw, komeriURL: K.screw, kohnanURL: KH.screw, dcmURL: D.screw },
    ],
    cutItems: [
      { partName: "天板", thickness: 38, width: 140, length: 1200, quantity: 2 },
      { partName: "脚材", thickness: 38, width: 89, length: 400, quantity: 4 },
      { partName: "幕板", thickness: 38, width: 89, length: 1200, quantity: 2 },
    ],
    steps: [
      { order: 1, title: "材料の確認とカット計画", description: "木材のカット寸法を紙に書き出し、ホームセンターのカットサービスで依頼するリストを作成します。カットサービスを使うと精度が上がり、のこぎり作業を大幅に減らせます。" },
      { order: 2, title: "やすりがけ（カット面の処理）", description: "#120番のサンドペーパーで全部材のカット面と表面を研磨します。特に天板は座面になるため#120→#240の順で丁寧に仕上げます。角は軽く面取りしてトゲが刺さらないようにします。" },
      { order: 3, title: "脚フレームの仮組み（片側）", description: "脚材2本と幕板1本でコの字型のフレームを仮組みします。L字金具やクランプで固定しながら、直角が出ているかスコヤで確認します。ビスを打つ前に必ず位置合わせを確認してください。" },
      { order: 4, title: "脚フレームのビス留め（片側）", description: "コーススレッド65mmを使って幕板と脚材を固定します。下穴をドリルで事前に開けると木割れを防げます。1箇所につき2本のビスを斜め方向に打ち込むと強度が増します。" },
      { order: 5, title: "反対側の脚フレームを作る", description: "同じ手順でもう片側の脚フレームを作ります。左右のフレームが同じ寸法・形になるよう、最初に作ったフレームを型紙代わりに使うと効率的です。" },
      { order: 6, title: "左右フレームを連結する", description: "2本目の幕板（長辺）で左右フレームを連結します。作業台や床に置いた状態で、左右のフレームが垂直になっているか確認しながらビス留めします。対角線の長さを測って歪みがないか確認します。" },
      { order: 7, title: "天板を並べて固定", description: "天板2枚を台座の上に均等に並べます。天板の端を台座の端に揃え、クランプで仮固定してからビスを打ちます。ビスは天板の木目に沿って、幕板に届く長さで打ち込みます（65mm以上推奨）。" },
      { order: 8, title: "仕上げのやすりがけ", description: "組み立て後、全体を#240のサンドペーパーで再度やすりがけします。特に継ぎ目部分の段差や角を重点的に磨き、手触りを滑らかにします。" },
      { order: 9, title: "防腐塗装または油仕上げ", description: "屋外で使う場合は必ず防腐塗料を全面に2回塗りします（乾燥時間：24時間）。屋内用ならば蜜蠟ワックスやオスモカラーなどのオイル系塗料で仕上げると木の質感が引き立ちます。" },
    ],
    warnings: ["屋外使用の場合は防腐塗装が必須です（年1回の再塗装推奨）", "耐荷重は約100kgです。過荷重に注意してください", "下穴をあけずにビスを打つと木割れの原因になります"],
    relatedSlugs: ["garden-table", "planter-stand"],
  },
  // ── ウッドデッキ ────────────────────────────────────────
  {
    ...useCases.find((u) => u.id === "wood-deck")!,
    dimensions: { width: 1800, depth: 1200, height: 300 },
    tools: ["電動ドライバー", "丸ノコまたはのこぎり", "メジャー", "水平器", "墨つぼ"],
    parts: [
      { name: "デッキ材 (ウエスタンレッドシダー)", spec: "20×90×1800mm", quantity: 12, unit: "枚", note: "屋外対応", cainzURL: C.cedar, komeriURL: K.cedar, kohnanURL: KH.cedar, dcmURL: D.cedar },
      { name: "根太 (2×4材)", spec: "38×89×1200mm", quantity: 6, unit: "本", cainzURL: C.spf2x4, komeriURL: K.spf2x4, kohnanURL: KH.spf2x4, dcmURL: D.spf2x4 },
      { name: "大引き (4×4材)", spec: "89×89×1800mm", quantity: 3, unit: "本", cainzURL: C.lumber, komeriURL: K.lumber, kohnanURL: KH.lumber, dcmURL: D.lumber },
      { name: "束石", spec: "150mm角", quantity: 6, unit: "個", cainzURL: "https://www.cainz.com/shop/c/c10601010201", komeriURL: K.stone, kohnanURL: KH.stone, dcmURL: D.stone },
      { name: "コーススレッド", spec: "90mm", quantity: 100, unit: "本", note: "ステンレス製推奨", cainzURL: C.screw, komeriURL: K.screw, kohnanURL: KH.screw, dcmURL: D.screw },
    ],
    cutItems: [
      { partName: "デッキ材", thickness: 20, width: 90, length: 1800, quantity: 12 },
      { partName: "根太", thickness: 38, width: 89, length: 1200, quantity: 6 },
      { partName: "大引き", thickness: 89, width: 89, length: 1800, quantity: 3 },
    ],
    steps: [
      { order: 1, title: "レイアウトの計画と地盤確認", description: "設置場所の寸法を測り、束石の位置を決めます。縄張りを行い4隅と中央に杭を打って位置を確定させます。地面が柔らかい場合は砕石を敷いて転圧してから作業します。" },
      { order: 2, title: "束石の水平設置", description: "束石を設置位置に並べ、水糸を基準に高さを揃えます。水平器で縦横の水平を確認し、砂や砕石で高さを微調整します。全ての束石の天端が同じ高さになることが最も重要です（誤差±3mm以内を目指します）。" },
      { order: 3, title: "大引きの設置と固定", description: "防腐処理済みの大引き（4×4材）を束石の上に並べます。束石と大引きは金物（束バンド）で固定します。大引きが水平になっているか再度確認し、高さが合わない箇所はゴムパッドで調整します。" },
      { order: 4, title: "根太の取り付け", description: "大引きと直交する方向に根太を等間隔（300〜400mm間隔）で並べ、羽子板ボルトや根太受け金物で固定します。根太の間隔はデッキ材の強度に直結するため、間隔を広げすぎないよう注意します。" },
      { order: 5, title: "デッキ材の仮並べと確認", description: "デッキ材を根太の上に仮並べし、全体のレイアウトを確認します。両端のデッキ材が均等にはみ出るよう位置を調整します。木材は乾燥すると収縮するため、デッキ材の間に5〜6mmのスペーサー（ビス等）を挟みます。" },
      { order: 6, title: "デッキ材のビス留め", description: "ステンレスコーススレッド90mmを使ってデッキ材を根太に固定します。1枚のデッキ材につき各根太との交点で2本打ちます。ビスは木目から外れた位置に打ち、デッキ材の端から30mm以上離します（割れ防止）。" },
      { order: 7, title: "端部の仕上げカット", description: "デッキ材の端部を墨糸に合わせて丸ノコでまっすぐにカットします。カット後に木口面に防腐剤を塗ります。端部の処理が外観を大きく左右するため丁寧に行います。" },
      { order: 8, title: "防腐・防水塗装（1回目）", description: "デッキ全体にキシラデコールや屋外用ウッドステインを塗ります。木目に沿って刷毛またはローラーで塗布し、余分な塗料は塗り広げます。根太・大引きの露出面にも忘れずに塗ります。" },
      { order: 9, title: "乾燥後に2回目の塗装", description: "24時間以上乾燥させてから2回目を塗ります。2回塗りにすることで塗膜が厚くなり、耐久性が大幅に向上します。以降は年1〜2回の再塗装で20年以上の耐久を実現できます。" },
    ],
    warnings: ["束石は必ず水平に設置してください（傾くと根太が歪みます）", "ステンレスビス必須（鉄ビスは錆びてデッキ材が腐食します）", "隣地境界から50cm以上離してください", "防腐塗装は年1〜2回の再塗装で耐久性を維持します"],
    relatedSlugs: ["garden-bench", "garden-table"],
  },
  // ── シューズラック ───────────────────────────────────────
  {
    ...useCases.find((u) => u.id === "shoe-rack")!,
    dimensions: { width: 600, depth: 300, height: 500 },
    tools: ["電動ドライバー", "メジャー", "鉛筆", "のこぎり"],
    parts: [
      { name: "側板 (SPF 1×10材)", spec: "19×235×500mm", quantity: 2, unit: "枚", cainzURL: C.lumber, komeriURL: K.lumber, kohnanURL: KH.lumber, dcmURL: D.lumber },
      { name: "棚板 (SPF 1×10材)", spec: "19×235×600mm", quantity: 3, unit: "枚", cainzURL: C.lumber, komeriURL: K.lumber, kohnanURL: KH.lumber, dcmURL: D.lumber },
      { name: "背板 (ベニヤ 4mm)", spec: "600×500mm", quantity: 1, unit: "枚", note: "4mm厚", cainzURL: C.plywood, komeriURL: K.plywood, kohnanURL: KH.plywood, dcmURL: D.plywood },
      { name: "コーススレッド", spec: "38mm", quantity: 30, unit: "本", cainzURL: C.screw, komeriURL: K.screw, kohnanURL: KH.screw, dcmURL: D.screw },
    ],
    cutItems: [
      { partName: "側板", thickness: 19, width: 235, length: 500, quantity: 2 },
      { partName: "棚板", thickness: 19, width: 235, length: 600, quantity: 3 },
      { partName: "背板 (ベニヤ)", thickness: 4, width: 500, length: 600, quantity: 1 },
    ],
    steps: [
      { order: 1, title: "材料の確認とカット", description: "側板・棚板・背板のカットリストを作成し、ホームセンターのカットサービスを利用します。カット後、全部材の寸法をメジャーで確認してください。" },
      { order: 2, title: "棚板の取り付け位置をマーキング", description: "側板2枚を並べ、棚板を固定する位置に鉛筆で印をつけます。靴の高さに合わせて棚板の間隔を決めます（スニーカー：約130mm、ブーツ：約200mm）。左右の側板の印が同じ高さになるよう水平器で確認します。" },
      { order: 3, title: "下穴を開ける", description: "マーキングした位置にドリルで下穴を開けます。下穴径はビス径より1〜2mm細いものを選びます（コーススレッド38mmなら3mm径ドリルが目安）。下穴を開けることで木割れを防ぎ、ビスがまっすぐ入ります。" },
      { order: 4, title: "棚板を仮置きして水平確認", description: "棚板を側板にはめ込み、水平器で水平を確認します。前後の傾きがある場合はスペーサーを挟んで調整します。" },
      { order: 5, title: "棚板をビス留め", description: "クランプで棚板を固定しながら、側板の外側からビスを打ち込みます。1枚の棚板につき左右各2本、計4本で固定します。ビスは木口に向かって打ち込むため、少し斜めにすると外れにくくなります。" },
      { order: 6, title: "背板の取り付け", description: "ベニヤ板を背面にあてがい、全周にタッカーまたは細いビスで固定します。背板を付けることでラック全体の歪みを防ぎ、強度が大幅に上がります。" },
      { order: 7, title: "仕上げのやすりがけ", description: "全体を#180→#240のサンドペーパーで研磨します。特に棚板の前面エッジは靴を出し入れする際に触れるため、丁寧に面取りします。" },
      { order: 8, title: "塗装・防汚コーティング", description: "玄関に置くため汚れが付きやすい環境です。ウレタン塗料かオスモカラーを塗ると水・泥汚れを弾きます。2回塗り（1回目乾燥後に軽くやすりがけして2回目）で耐久性が上がります。" },
    ],
    warnings: ["重い荷物を乗せる場合は棚板厚を19mm→24mmに増やしてください", "玄関の湿気対策として塗装は必ず行ってください"],
    relatedSlugs: ["kantan-wall-shelf", "hanger-rack"],
  },
  // ── ハンガーラック ───────────────────────────────────────
  {
    ...useCases.find((u) => u.id === "hanger-rack")!,
    dimensions: { width: 900, depth: 400, height: 1600 },
    tools: ["電動ドライバー", "メジャー", "レンチ", "のこぎり"],
    parts: [
      { name: "支柱 (2×4材)", spec: "38×89×1600mm", quantity: 2, unit: "本", cainzURL: C.spf2x4, komeriURL: K.spf2x4, kohnanURL: KH.spf2x4, dcmURL: D.spf2x4 },
      { name: "横桟 (2×4材)", spec: "38×89×900mm", quantity: 2, unit: "本", cainzURL: C.spf2x4, komeriURL: K.spf2x4, kohnanURL: KH.spf2x4, dcmURL: D.spf2x4 },
      { name: "ハンガーパイプ (アイアン丸棒)", spec: "φ19mm × 900mm", quantity: 1, unit: "本", cainzURL: C.hardware, komeriURL: K.pipe, kohnanURL: KH.pipe, dcmURL: D.pipe },
      { name: "フランジ (パイプ取付金具)", spec: "φ19mm対応", quantity: 2, unit: "個", cainzURL: C.hardware, komeriURL: K.flange, kohnanURL: KH.flange, dcmURL: D.flange },
      { name: "コーススレッド", spec: "65mm", quantity: 20, unit: "本", cainzURL: C.screw, komeriURL: K.screw, kohnanURL: KH.screw, dcmURL: D.screw },
      { name: "ボルト・ナット", spec: "M8 × 40mm", quantity: 4, unit: "組", cainzURL: C.hardware, komeriURL: K.flange, kohnanURL: KH.flange, dcmURL: D.flange },
    ],
    cutItems: [
      { partName: "支柱", thickness: 38, width: 89, length: 1600, quantity: 2 },
      { partName: "横桟", thickness: 38, width: 89, length: 900, quantity: 2 },
    ],
    steps: [
      { order: 1, title: "材料のカットとやすりがけ", description: "支柱・横桟を指定サイズにカットします。カット後に#120サンドペーパーで全面を研磨し、ケバや木割れを除去します。特にパイプが触れる横桟の内側面は#240まで丁寧に仕上げます。" },
      { order: 2, title: "H型フレームの組み立て（仮組み）", description: "支柱2本と横桟2本を仮組みしてH型フレームを作ります。床に寝かせた状態で組むと作業しやすいです。スコヤで直角を確認しながら、クランプで固定して位置を決めます。" },
      { order: 3, title: "フレームのボルト締め", description: "クランプで固定した状態でドリルでボルト穴を貫通させます。M8×40mmのボルト・ナット・ワッシャーで横桟と支柱を締結します。レンチでしっかり締め、緩みがないか確認します。" },
      { order: 4, title: "フランジの取り付け位置を決める", description: "ハンガーパイプを通す位置（横桟から約100mm下）にフランジをあてがい、鉛筆でビス穴位置をマーキングします。左右のフランジが水平になるよう水平器で確認することが重要です。" },
      { order: 5, title: "フランジのビス留め", description: "マーキング位置に下穴を開け、フランジをビス留めします。フランジは4点留めが基本です。しっかり固定しないとパイプが外れる原因になるため、トルクをかけて締めます。" },
      { order: 6, title: "ハンガーパイプを通す", description: "アイアン丸棒（φ19mm）を左右のフランジに差し込みます。パイプの両端をフランジのねじ穴に合わせて固定ねじを締め込みます。パイプを強く握って左右に揺れないか確認します。" },
      { order: 7, title: "転倒防止の壁固定", description: "L字金具を使って支柱上部を壁の間柱に固定します。間柱の位置はパーカッションドライバーや間柱センサーで探します。石膏ボードのみへの固定は強度不足のため、必ず間柱に届かせてください。" },
      { order: 8, title: "塗装・仕上げ", description: "木部をオイルステイン（ウォルナット系が人気）で2回塗りします。アイアンパイプ部分はラッカースプレーで同系色に塗るとインテリアになじみます。乾燥後24時間置いてから衣類を掛けます。" },
    ],
    warnings: ["必ず壁の間柱に固定してください（石膏ボードのみは不可）", "一本のパイプにかけられる重量は約15kgが目安です", "転倒防止固定を省略する場合は底部に重りを置いてください"],
    relatedSlugs: ["kantan-wall-shelf", "shoe-rack"],
  },
  {
    ...useCases[0],
    dimensions: { width: 900, depth: 200, height: 1200 },
    tools: ["電動ドライバー", "メジャー", "鉛筆", "のこぎり（カットサービス利用可）"],
    parts: [
      { name: "棚板 (SPF 1×8材)", spec: "19×184×900mm", quantity: 4, unit: "枚", cainzURL: C.spf1x8, komeriURL: K.spf1x8, kohnanURL: KH.spf1x8, dcmURL: D.spf1x8 },
      { name: "側板 (SPF 1×8材)", spec: "19×184×1200mm", quantity: 2, unit: "枚", cainzURL: C.spf1x8, komeriURL: K.spf1x8, kohnanURL: KH.spf1x8, dcmURL: D.spf1x8 },
      { name: "背板 (ベニヤ 4mm)", spec: "900×1200mm", quantity: 1, unit: "枚", cainzURL: C.plywood, komeriURL: K.plywood, kohnanURL: KH.plywood, dcmURL: D.plywood },
      { name: "コーススレッド", spec: "65mm", quantity: 50, unit: "本", cainzURL: C.screw, komeriURL: K.screw, kohnanURL: KH.screw, dcmURL: D.screw },
    ],
    cutItems: [
      { partName: "棚板", thickness: 19, width: 184, length: 900, quantity: 4 },
      { partName: "側板", thickness: 19, width: 184, length: 1200, quantity: 2 },
      { partName: "背板 (ベニヤ)", thickness: 4, width: 900, length: 1200, quantity: 1 },
    ],
    steps: [
      { order: 1, title: "カットリストの作成とカット依頼", description: "棚板4枚・側板2枚・背板のカット寸法を一覧化し、ホームセンターのカットサービスに持参します。カット後は全寸法を必ずメジャーで確認します（誤差±1mm以内が理想）。" },
      { order: 2, title: "全部材のやすりがけ", description: "#120のサンドペーパーで全面を研磨し、#240で仕上げます。側板の棚板が当たる部分（木口面）は特に丁寧に。棚板の表面は物が乗る面なので傷が残らないよう慎重に磨きます。" },
      { order: 3, title: "棚板の取り付け位置をマーキング", description: "側板2枚を並べ、棚板を置く高さを決めて鉛筆で印をつけます。棚板の間隔は収納物に合わせて決定します（文庫本：約230mm、A4書類：約300mm）。左右の側板に同じ高さで印をつけることが重要です。" },
      { order: 4, title: "下穴を開ける", description: "マーキング位置にφ3mmのドリルで下穴を開けます。ドリルが貫通しないよう、ドリルビットにマスキングテープを巻いて深さの目安にします（板厚の半分＋10mm程度）。" },
      { order: 5, title: "棚板をビス留めする", description: "側板の外側から棚板の木口に向かってコーススレッド65mmを打ち込みます。1か所につき2本のビスを打ち、棚板がぐらつかないか確認します。クランプで仮固定してから打つと精度が上がります。" },
      { order: 6, title: "背板を取り付ける", description: "ベニヤ板を背面にあてがい、全体の歪みを確認します。対角線の長さが同じであれば直角が出ています。ずれている場合は側板を少し押したり引いたりして調整し、その状態でビス留めします。" },
      { order: 7, title: "壁への固定（転倒防止）", description: "L字金具を棚の上部に取り付け、壁の間柱に固定します。間柱の位置は下地センサーやノックして音で確認します。間柱が近くにない場合は壁アンカーを使用します。" },
      { order: 8, title: "仕上げ塗装", description: "オイルステイン（ウォルナット・オーク等）を刷毛で全面に塗ります。15〜20分後に布で拭き取ると自然な木の質感になります。完全乾燥まで24時間待ってから物を載せます。" },
    ],
    warnings: ["耐荷重は棚1枚あたり約10kgです", "必ず壁の間柱に固定して転倒防止対策をしてください", "湿気の多い場所では防水オイルを使用してください"],
    relatedSlugs: ["planter-stand"],
  },
  {
    ...useCases[1],
    dimensions: { width: 400, depth: 400, height: 600 },
    tools: ["電動ドライバー", "メジャー", "鉛筆", "のこぎり"],
    parts: [
      { name: "天板 (SPF 1×6材)", spec: "19×140×400mm", quantity: 1, unit: "枚", cainzURL: C.spf1x6, komeriURL: K.spf1x6, kohnanURL: KH.spf1x6, dcmURL: D.spf1x6 },
      { name: "脚材 (2×4材)", spec: "38×89×560mm", quantity: 4, unit: "本", cainzURL: C.spf2x4, komeriURL: K.spf2x4, kohnanURL: KH.spf2x4, dcmURL: D.spf2x4 },
      { name: "横桟 (SPF 1×4材)", spec: "19×89×360mm", quantity: 4, unit: "本", cainzURL: C.spf1x4, komeriURL: K.spf1x4, kohnanURL: KH.spf1x4, dcmURL: D.spf1x4 },
      { name: "コーススレッド", spec: "65mm", quantity: 30, unit: "本", cainzURL: C.screw, komeriURL: K.screw, kohnanURL: KH.screw, dcmURL: D.screw },
    ],
    cutItems: [
      { partName: "天板", thickness: 19, width: 140, length: 400, quantity: 1 },
      { partName: "脚材", thickness: 38, width: 89, length: 560, quantity: 4 },
      { partName: "横桟", thickness: 19, width: 89, length: 360, quantity: 4 },
    ],
    steps: [
      { order: 1, title: "材料のカットとやすりがけ", description: "天板・脚材・横桟をカットします。カット後に全部材を#120→#240でやすりがけし、角を面取りします。特に天板の上面は丁寧に仕上げます。" },
      { order: 2, title: "脚のペア組み（前後）", description: "脚材2本と横桟1本で前面フレームを作ります。横桟を脚材の内側に当て、クランプで固定後に下穴を開けてビス留めします。直角が出ているかスコヤで必ず確認します。" },
      { order: 3, title: "もう片側のペア組み（後面）", description: "同じ手順で後面フレームを作ります。プランターの重さがかかるため、横桟は脚材の下端から100mm程度の位置に取り付けると安定します。" },
      { order: 4, title: "前後フレームを横桟でつなぐ", description: "前後フレームを左右の横桟でつなぎ台座を完成させます。4本の脚が床に均等に接地するか確認し、グラつく場合は脚の端をやすりで調整します。" },
      { order: 5, title: "天板の取り付け", description: "台座の上に天板を置き、四隅から均等にビス留めします。天板の端が台座より均等にはみ出るように位置を調整してから固定します（前後左右各10〜20mm程度）。" },
      { order: 6, title: "防腐塗装", description: "屋外・屋内問わず水回りに置く場合は防腐処理が必要です。キシラデコールなどの浸透型防腐塗料を全面に2回塗りします。乾燥後に表面をサンディングして再度塗ると仕上がりが美しくなります。" },
    ],
    warnings: ["屋外使用の場合は防腐塗装が必須です（年1回の再塗装推奨）", "重いプランター（土入り）は底の横桟が重要な支えになります"],
    relatedSlugs: ["kantan-wall-shelf", "compost-box"],
  },
  {
    ...useCases[2],
    dimensions: { width: 600, depth: 600, height: 700 },
    tools: ["電動ドライバー", "丸ノコまたはのこぎり", "メジャー", "鉛筆", "L字金具"],
    parts: [
      { name: "側板・前後板 (杉板)", spec: "20×200×700mm", quantity: 4, unit: "枚", cainzURL: C.lumber, komeriURL: K.sugi, kohnanURL: KH.sugi, dcmURL: D.sugi },
      { name: "底板 (杉板)", spec: "20×600×600mm", quantity: 1, unit: "枚", cainzURL: C.lumber, komeriURL: K.sugi, kohnanURL: KH.sugi, dcmURL: D.sugi },
      { name: "蓋板 (杉板)", spec: "20×600×600mm", quantity: 1, unit: "枚", cainzURL: C.lumber, komeriURL: K.sugi, kohnanURL: KH.sugi, dcmURL: D.sugi },
      { name: "コーススレッド", spec: "75mm", quantity: 60, unit: "本", note: "ステンレス製推奨", cainzURL: C.screw, komeriURL: K.screw, kohnanURL: KH.screw, dcmURL: D.screw },
      { name: "蝶番", spec: "中型", quantity: 2, unit: "個", cainzURL: C.hinge, komeriURL: K.hinge, kohnanURL: KH.hinge, dcmURL: D.hinge },
      { name: "防虫ネット", spec: "70cm角", quantity: 1, unit: "枚", cainzURL: C.net, komeriURL: K.net, kohnanURL: KH.net, dcmURL: D.net },
    ],
    cutItems: [
      { partName: "側板・前後板", thickness: 20, width: 200, length: 700, quantity: 4 },
      { partName: "底板", thickness: 20, width: 600, length: 600, quantity: 1 },
      { partName: "蓋板", thickness: 20, width: 600, length: 600, quantity: 1 },
    ],
    steps: [
      { order: 1, title: "材料のカットと防腐前処理", description: "側板・前後板・底板・蓋板を所定のサイズにカットします。カット直後に木口面に防腐剤を刷毛で塗り込みます。木口は最も腐食しやすい部分で、この前処理が耐久性を大きく左右します。" },
      { order: 2, title: "底板に水抜き穴を開ける", description: "底板にφ15〜20mmのドリルで4〜6箇所の水抜き穴を均等に開けます。穴の周囲もやすりで整えてバリを取ります。水抜き穴がないと内部が嫌気性環境になり腐食が早まります。" },
      { order: 3, title: "箱型のフレームを組む（側面）", description: "側板と前後板でコの字型の枠を組みます。ステンレスのコーススレッド75mmで固定します（屋外のため必ずステンレスビス使用）。四隅をL字金具でも補強すると長持ちします。" },
      { order: 4, title: "底板を取り付ける", description: "底板をフレームの底にビス留めします。底板の四辺をフレームのへりに沿って均等に合わせてからビスを打ちます。ビス間隔は150mm程度が目安です。" },
      { order: 5, title: "防虫ネットの取り付け", description: "側面の内側に防虫ネット（細目）をタッカーで貼ります。タッカーの針は防錆タイプを使用します。虫の侵入口になりやすい底板の隙間にもネットを折り込んで固定します。" },
      { order: 6, title: "蝶番の取り付け", description: "蓋板と後面板を蝶番2個でつなぎます。蝶番の位置は端から150mm程度が目安です。蓋の開閉をスムーズにするため、蝶番の面を合わせてから慎重にビス留めします。" },
      { order: 7, title: "全体の防腐塗装", description: "キシラデコールまたはペンキを外面全体に2回塗りします。内面は有機物への影響を避けるため塗装不要です。塗料が乾燥するまで24時間置いてから堆肥を投入します。" },
      { order: 8, title: "設置と微生物の活性化", description: "日当たりが良く排水のよい場所に設置します。底にわら・枯れ葉を少し敷いてから生ゴミを投入します。初回は市販のコンポスト活性剤を加えると分解が早まります。" },
    ],
    warnings: [
      "屋外使用のためステンレスビス必須（通常ビスは半年で錆びます）",
      "防腐塗装は毎年1回の塗り直しで耐久性を保てます",
      "設置場所は直射日光が当たる排水のよい場所を選んでください",
      "分解促進のため定期的な撹拌（週1〜2回）が重要です",
    ],
    relatedSlugs: ["planter-stand"],
  },
  // ── TV台 ─────────────────────────────────────────────────
  {
    ...useCases.find((u) => u.id === "tv-stand")!,
    dimensions: { width: 1300, depth: 400, height: 450 },
    tools: ["電動ドライバー", "メジャー", "鉛筆", "のこぎり", "水平器", "クランプ（2個以上）", "サンドペーパー"],
    parts: [
      { name: "天板 (SPF 1×8材)", spec: "19×184×1300mm", quantity: 2, unit: "枚", note: "2枚並べて天板（幅を出す）", cainzURL: C.spf1x8, komeriURL: K.spf1x8, kohnanURL: KH.spf1x8, dcmURL: D.spf1x8 },
      { name: "側板 (SPF 1×8材)", spec: "19×184×450mm", quantity: 2, unit: "枚", cainzURL: C.spf1x8, komeriURL: K.spf1x8, kohnanURL: KH.spf1x8, dcmURL: D.spf1x8 },
      { name: "中段棚板 (SPF 1×8材)", spec: "19×184×1262mm", quantity: 2, unit: "枚", cainzURL: C.spf1x8, komeriURL: K.spf1x8, kohnanURL: KH.spf1x8, dcmURL: D.spf1x8 },
      { name: "背板 (SPF 1×4材)", spec: "19×89×1300mm", quantity: 2, unit: "枚", note: "薄板またはMDF可", cainzURL: C.spf1x4, komeriURL: K.spf1x4, kohnanURL: KH.spf1x4, dcmURL: D.spf1x4 },
      { name: "コーススレッド 51mm", spec: "51mm", quantity: 60, unit: "本", cainzURL: C.screw, komeriURL: K.screw, kohnanURL: KH.screw, dcmURL: D.screw },
      { name: "L字金具 50mm", spec: "50mm", quantity: 8, unit: "個", note: "棚板補強用", cainzURL: C.bracket, komeriURL: K.bracket, kohnanURL: KH.bracket, dcmURL: D.bracket },
    ],
    cutItems: [
      { partName: "天板", thickness: 19, width: 184, length: 1300, quantity: 2 },
      { partName: "側板", thickness: 19, width: 184, length: 450, quantity: 2 },
      { partName: "中段棚板", thickness: 19, width: 184, length: 1262, quantity: 2 },
      { partName: "背板", thickness: 19, width: 89, length: 1300, quantity: 2 },
    ],
    steps: [
      { order: 1, title: "設計図の確認・木材選び", description: "完成寸法 W1300×D400×H450mm を確認。天板は集成材またはランバーコアを推奨（反りにくい）。天板厚は最低24mm以上を確保してください。木目の向きを確認してから購入します。" },
      { order: 2, title: "カット・検品", description: "側板×2・天板×1・底板×1・棚板×必要数・背板をカット。天板・棚板は木目が長辺方向を向くよう木取りします。" },
      { order: 3, title: "やすりがけ（#120→#240→#320）", description: "天板表面は特に念入りに#320まで仕上げます。側板・棚板も#240で仕上げてから木粉を払います。" },
      { order: 4, title: "側板への棚板位置マーキング", description: "両側板を合わせてクランプで固定し、棚板位置を鉛筆でマーキング。左右の高さが揃っていることを必ず確認。" },
      { order: 5, title: "箱組み（底板・棚板の固定）", description: "底板→棚板の順に側板にビスで固定してフレームを作ります。L字金具を内側に追加すると強度が格段に向上します。コーナーは対角確認必須。" },
      { order: 6, title: "天板の固定", description: "天板をフレームの上にビスで固定します。天板上面からビスが見えないよう、側板からポケットホールジグを使って隠しビスにするとスッキリします。" },
      { order: 7, title: "背板・配線穴の加工", description: "背板（ラワン合板4mm）に配線を通す穴（φ60〜80mm）をホールソーで開けてから取り付けます。背板取り付けで全体の剛性が大幅に向上します。" },
      { order: 8, title: "下塗り・仕上げ塗装", description: "水性サンジングシーラーで下塗り→乾燥→#320でソフトサンド→水性ウレタンニスで2回仕上げ。TV台は水拭きする機会が多いため耐水性の高いウレタン仕上げを推奨。" },
      { order: 9, title: "扉・引き出しの取り付け（必要な場合）", description: "扉がある場合は丁番を取り付け、スライドレールで引き出しを設置します。扉の調整（隙間・傾き）は丁番のネジで行います。" },
      { order: 10, title: "設置・転倒防止", description: "TV台は重量物が乗るため床との設置を安定させます。4隅にアジャスターフットを付けると水平調整が楽。必要に応じて壁とL字金具で連結して転倒防止処理を行います。" },
    ],
    warnings: ["TVの重量に耐えられるよう棚板の枚数・素材を検討してください", "配線用に背板に穴をあけることを推奨します"],
    relatedSlugs: ["bookshelf", "kantan-wall-shelf"],
  },
  // ── 本棚 ─────────────────────────────────────────────────
  {
    ...useCases.find((u) => u.id === "bookshelf")!,
    dimensions: { width: 900, depth: 280, height: 1800 },
    tools: ["電動ドライバー", "メジャー", "鉛筆", "のこぎり", "水平器"],
    parts: [
      { name: "側板 (SPF 1×12材)", spec: "19×286×1800mm", quantity: 2, unit: "枚", cainzURL: C.spf1x8, komeriURL: K.spf1x8, kohnanURL: KH.spf1x8, dcmURL: D.spf1x8 },
      { name: "棚板 (SPF 1×12材)", spec: "19×286×862mm", quantity: 5, unit: "枚", cainzURL: C.spf1x8, komeriURL: K.spf1x8, kohnanURL: KH.spf1x8, dcmURL: D.spf1x8 },
      { name: "天板・底板 (SPF 1×12材)", spec: "19×286×900mm", quantity: 2, unit: "枚", cainzURL: C.spf1x8, komeriURL: K.spf1x8, kohnanURL: KH.spf1x8, dcmURL: D.spf1x8 },
      { name: "背板 (ベニヤ 4mm)", spec: "900×1800mm", quantity: 1, unit: "枚", cainzURL: C.plywood, komeriURL: K.plywood, kohnanURL: KH.plywood, dcmURL: D.plywood },
      { name: "コーススレッド", spec: "65mm", quantity: 80, unit: "本", cainzURL: C.screw, komeriURL: K.screw, kohnanURL: KH.screw, dcmURL: D.screw },
    ],
    cutItems: [
      { partName: "側板", thickness: 19, width: 286, length: 1800, quantity: 2 },
      { partName: "棚板", thickness: 19, width: 286, length: 862, quantity: 5 },
      { partName: "天板・底板", thickness: 19, width: 286, length: 900, quantity: 2 },
    ],
    steps: [
      { order: 1, title: "設計図の確認・材料の準備", description: "完成寸法 W900×D280×H1800mm を確認します。必要部材（側板×2・天板×1・底板×1・棚板×5・背板）のカット図を手元に用意し、ホームセンターへ持参してカットを依頼しましょう。板厚は18mm（SPF 1×6など）が標準です。" },
      { order: 2, title: "カット材の検品・やすりがけ（#120）", description: "カットしてもらった材料を広げ、寸法通りにカットされているか一本ずつ確認します。大きなズレ（2mm以上）があればその場で修正依頼を。問題なければ#120のサンドペーパーで木口（カット面）のバリとトゲを落とします。" },
      { order: 3, title: "仕上げやすりがけ（#240）", description: "#120で粗削りした後、#240で全面を仕上げます。特に手が触れる棚板の表面・角を丁寧に。やすりがけ後は乾いたウェスで木粉をしっかり払ってください。" },
      { order: 4, title: "側板への棚板位置のマーキング", description: "側板2枚を並べて、棚板を取り付ける位置に鉛筆でラインを引きます（さしがねを使うと直角が出しやすい）。左右対称になるよう、2枚を重ねてまとめてマーキングすると誤差が出ません。棚板の厚み（18mm）分を考慮して位置を決めてください。" },
      { order: 5, title: "側板への棚受け材の取り付け", description: "マーキングしたラインに沿って、棚受け材または棚ダボを取り付けます。ビス固定の場合は先にφ2.5mm程度の下穴を開けてから、コーススレッド51mmを2本ずつ打ちます。下穴なしだと木が割れることがあるので必ず開けましょう。水平器で水平を確認しながら進めます。" },
      { order: 6, title: "箱組み（底板・天板の固定）", description: "側板2枚に底板・天板をビスで固定して、コの字型のフレームを作ります。コーナーを固定するときはクランプで仮固定してから打ちます。直角になっているか確認するには、対角線の長さを両方測って同じになればOK。" },
      { order: 7, title: "棚板・背板の取り付け", description: "棚板をフレームに納めて、下からビスで固定します（棚板の反りは下向きにするのがコツ）。背板（ラワンベニヤ4mm等）を後ろに打ち付けると剛性が上がり、棚が歪みにくくなります。背板がない場合はコーナーにL字金具を取り付けて補強します。" },
      { order: 8, title: "下塗り（サンジングシーラーまたは目止め）", description: "塗装前に目止め剤（水性サンジングシーラーなど）を薄く1回塗ります。木材の導管を埋めることで塗料の吸い込みが均一になり、仕上がりがきれいになります。乾燥後（約30分）に#320で軽くソフトサンドをかけます。" },
      { order: 9, title: "仕上げ塗装", description: "ワトコオイルまたは水性ウレタンニスを刷毛で薄く塗ります。木目を活かすならオイル系（ワトコ・オスモ等）がおすすめ。乾燥後（約12時間）に#320でソフトサンドし、2回目を塗って完成です。" },
      { order: 10, title: "壁固定・転倒防止", description: "高さ600mm以上の棚は転倒防止固定が必須です。下地センサーで壁の柱位置を探し、L字金具（50mm以上）でビス固定します。賃貸の場合は突っ張りポールとの組み合わせや、家具転倒防止プレートを活用してください。" },
    ],
    warnings: ["必ず壁に固定してください", "上段への重いものの配置は避けてください"],
    relatedSlugs: ["tv-stand", "kantan-wall-shelf"],
  },
  // ── フラワーボックス ────────────────────────────────────
  {
    ...useCases.find((u) => u.id === "flower-box")!,
    dimensions: { width: 600, depth: 180, height: 200 },
    tools: ["電動ドライバー", "メジャー", "鉛筆", "のこぎり"],
    parts: [
      { name: "前後板 (杉板)", spec: "20×180×600mm", quantity: 2, unit: "枚", cainzURL: C.lumber, komeriURL: K.sugi, kohnanURL: KH.sugi, dcmURL: D.sugi },
      { name: "側板 (杉板)", spec: "20×180×140mm", quantity: 2, unit: "枚", cainzURL: C.lumber, komeriURL: K.sugi, kohnanURL: KH.sugi, dcmURL: D.sugi },
      { name: "底板 (杉板)", spec: "20×140×560mm", quantity: 1, unit: "枚", cainzURL: C.lumber, komeriURL: K.sugi, kohnanURL: KH.sugi, dcmURL: D.sugi },
      { name: "コーススレッド (ステンレス)", spec: "45mm", quantity: 30, unit: "本", cainzURL: C.screw, komeriURL: K.screw, kohnanURL: KH.screw, dcmURL: D.screw },
    ],
    cutItems: [
      { partName: "前後板", thickness: 20, width: 180, length: 600, quantity: 2 },
      { partName: "側板", thickness: 20, width: 180, length: 140, quantity: 2 },
      { partName: "底板", thickness: 20, width: 140, length: 560, quantity: 1 },
    ],
    steps: [
      { order: 1, title: "設計図の確認・材料選び", description: "完成寸法 W600×D180×H200mm を確認。植物を植えるため防腐・排水対策が必須。レッドシダー・ヒノキ・防腐処理済み材を使用し、内側にビニールライナーを貼ると長持ちします。" },
      { order: 2, title: "カット・木口の防腐処理", description: "前後板×2・側板×2・底板×1をカット。カット直後の木口に防腐塗料を塗布します（忘れがちな工程ですが、木口からの腐敗が最も早い）。" },
      { order: 3, title: "底板への排水穴あけ", description: "底板に電動ドライバー＋φ12mmビットで排水穴を等間隔（10cm間隔程度）に開けます。穴が少ないと根腐れの原因になります。穴を開ける前に台の上に底板を置くと割れ防止になります。" },
      { order: 4, title: "箱の組み立て", description: "前後板を側板の外側にビスで固定してボックス状にします（前後板を側板が挟む構造）。ビスはステンレス製を使用。コーナーにL字金具を補強として追加すると強度UP。" },
      { order: 5, title: "底板の固定", description: "排水穴を開けた底板を固定します。底板と側板の間に2〜3mmの隙間を設けても構いません（追加の排水スペース）。" },
      { order: 6, title: "やすりがけ・面取り", description: "外面全体を#120→#240でやすりがけ。上縁の角を面取りすると手が触れても痛くありません。" },
      { order: 7, title: "防腐塗装（外面）", description: "外側に防腐塗料を2回塗り。木目を活かすならウッドステイン系が美しく仕上がります。" },
      { order: 8, title: "内側ライナーの設置・設置場所確認", description: "内側にビニールポット（ゴミ袋でも可）を敷いて木材と土の直接接触を防ぎます。設置場所を決めて底面にキャスター（重くなるため）を付けると移動が楽になります。" },
    ],
    warnings: ["屋外使用のためステンレスビス推奨", "水抜き穴を必ず設けてください"],
    relatedSlugs: ["planter-stand", "compost-box"],
  },
  // ── ガーデンテーブル ────────────────────────────────────
  {
    ...useCases.find((u) => u.id === "garden-table")!,
    dimensions: { width: 1200, depth: 700, height: 720 },
    tools: ["電動ドライバー", "丸ノコまたはのこぎり", "メジャー", "水平器"],
    parts: [
      { name: "天板 (2×6材)", spec: "38×140×1200mm", quantity: 4, unit: "枚", cainzURL: C.lumber, komeriURL: "https://www.komeri.com/disp/CKmSfKeyWordPage.jsp?KEYWORDS=2x6+SPF", kohnanURL: "https://www.kohnan-eshop.com/shop/search?searchWord=2x6+SPF", dcmURL: "https://www.dcm-online.jp/search?q=2x6+SPF" },
      { name: "脚材 (4×4材)", spec: "89×89×720mm", quantity: 4, unit: "本", cainzURL: C.spf2x4, komeriURL: K.spf2x4, kohnanURL: KH.spf2x4, dcmURL: D.spf2x4 },
      { name: "幕板 (2×4材)", spec: "38×89×1200mm", quantity: 2, unit: "本", cainzURL: C.spf2x4, komeriURL: K.spf2x4, kohnanURL: KH.spf2x4, dcmURL: D.spf2x4 },
      { name: "幕板 (2×4材)", spec: "38×89×700mm", quantity: 2, unit: "本", cainzURL: C.spf2x4, komeriURL: K.spf2x4, kohnanURL: KH.spf2x4, dcmURL: D.spf2x4 },
      { name: "コーススレッド", spec: "75mm", quantity: 60, unit: "本", cainzURL: C.screw, komeriURL: K.screw, kohnanURL: KH.screw, dcmURL: D.screw },
    ],
    cutItems: [
      { partName: "天板", thickness: 38, width: 140, length: 1200, quantity: 4 },
      { partName: "脚材", thickness: 89, width: 89, length: 720, quantity: 4 },
      { partName: "長辺幕板", thickness: 38, width: 89, length: 1200, quantity: 2 },
      { partName: "短辺幕板", thickness: 38, width: 89, length: 700, quantity: 2 },
    ],
    steps: [
      { order: 1, title: "設計図の確認・木材選び", description: "完成寸法 W1200×D700×H720mm を確認。天板材は反りの少ないものを選びます（木材店で一本ずつ目で見て確認）。屋外用はレッドシダーまたは防腐処理済み材を推奨。" },
      { order: 2, title: "カット・検品", description: "天板スラット・脚・幕板をカット。脚4本は同一長さであることが最重要。木口には防腐剤（屋外用）を塗布します。" },
      { order: 3, title: "脚のやすりがけ（#120→#240）", description: "脚と幕板を#120→#240でやすりがけ。角を丸めておくと怪我防止と見た目向上に。" },
      { order: 4, title: "天板スラットのやすりがけ（#120→#240→#320）", description: "天板は手や物が乗る面なので特に丁寧に。#320まで仕上げると木の触感が格段に向上します。" },
      { order: 5, title: "脚＋幕板のフレーム組み", description: "脚4本に幕板（長辺2枚・短辺2枚）をビスで固定してロの字フレームを作ります。コーナークランプ必須。直角・対角確認を忘れずに。幕板は脚の内側に取り付けるのが基本です。" },
      { order: 6, title: "天板スラットの仮並べ・間隔確認", description: "フレームの上に天板スラットを並べ、全体バランスを確認。スラット間に5mmスペーサーを挟んで均等間隔にします。端から固定すると最後の1枚がはみ出すことがあるので、中央から左右対称に並べるのがコツです。" },
      { order: 7, title: "天板の固定", description: "スラットを1枚ずつ幕板にビスで固定します。天板から見えるビスは皿もみダボ処理か、ポケットホールで隠しビスにすると仕上がりが美しくなります。" },
      { order: 8, title: "防腐・仕上げ塗装（1回目）", description: "全面に防腐塗料またはデッキオイルを刷毛で塗布。木口を特に重点的に。4〜6時間乾燥させます。" },
      { order: 9, title: "仕上げ塗装（2回目）・組み立て確認", description: "1回目乾燥後に#320で軽くサンド→2回目を塗布。乾燥後、水平な床で4本脚が均一に接地するか確認。ぐらつく場合は脚の下にフェルトパッドで調整します。" },
    ],
    warnings: ["屋外使用のため防腐塗装が必須です", "雨ざらしの場合は定期的な再塗装が必要です"],
    relatedSlugs: ["garden-bench", "wood-deck"],
  },
  // ── キャットウォーク ────────────────────────────────────
  {
    ...useCases.find((u) => u.id === "cat-walk")!,
    dimensions: { width: 600, depth: 200, height: 150 },
    tools: ["電動ドライバー", "メジャー", "鉛筆", "レベル（水平器）"],
    parts: [
      { name: "ステップ板 (SPF 1×8材)", spec: "19×184×600mm", quantity: 3, unit: "枚", cainzURL: C.spf1x8, komeriURL: K.spf1x8, kohnanURL: KH.spf1x8, dcmURL: D.spf1x8 },
      { name: "L字金具", spec: "75mm角", quantity: 6, unit: "個", cainzURL: C.hardware, komeriURL: K.bracket, kohnanURL: KH.bracket, dcmURL: D.bracket },
      { name: "コーススレッド", spec: "45mm", quantity: 24, unit: "本", cainzURL: C.screw, komeriURL: K.screw, kohnanURL: KH.screw, dcmURL: D.screw },
      { name: "壁アンカー", spec: "石膏ボード用", quantity: 6, unit: "個", cainzURL: C.hardware, komeriURL: K.bracket, kohnanURL: KH.bracket, dcmURL: D.bracket },
    ],
    cutItems: [
      { partName: "ステップ板", thickness: 19, width: 184, length: 600, quantity: 3 },
    ],
    steps: [
      { order: 1, title: "設計・壁の下地確認", description: "設置位置を決め、下地センサーで柱・間柱の位置を確認します（石膏ボードのみへの固定では体重に耐えられません）。柱位置に印をつけておきます。猫のジャンプ力（通常35〜40cm）を考慮してステップ間隔を設計します。" },
      { order: 2, title: "ステップ板のカット・検品", description: "ステップ板（SPF 1×6 または 1×8）を設計寸法にカット。長さは300〜400mmが一般的です。カット面を確認してバリを取ります。" },
      { order: 3, title: "ステップ板のやすりがけ（#120→#240→#320）", description: "ステップ板の表面・側面・角を丁寧に仕上げます。猫が歩く面は特に毛羽立ちをなくし、カーペット素材を張る場合は下地として#120で十分です。" },
      { order: 4, title: "カーペット素材の貼り付け（オプション）", description: "滑り止め・爪研ぎ防止のためにカーペットタイルや人工芝をボンドとタッカーでステップ板に貼ります。素材の端はタッカーでしっかり固定し、猫が引っ張っても剥がれないようにします。" },
      { order: 5, title: "L字金具の取り付け準備", description: "各ステップの取り付け位置を壁に鉛筆でマーキング。水平器でレベルを確認します。L字金具は耐荷重10kg以上のものを選択（猫の体重＋ジャンプ衝撃を考慮）。" },
      { order: 6, title: "L字金具の壁固定", description: "マーキングした位置に電動ドライバーでビス穴を開け（φ2.5mm下穴）、L字金具をビスで固定します。下地（柱）に確実に打ち込んでいるか、手で引っ張って確認。グラグラするようなら位置をずらして打ち直します。" },
      { order: 7, title: "ステップ板の取り付け", description: "L字金具にステップ板を乗せ、下からビス（35mm）で固定します。板のぐらつきがないか手で強く押して確認。前後左右に動かなければOKです。" },
      { order: 8, title: "全体レイアウトの確認", description: "全ステップを取り付け後、下から上まで実際に猫が移動できる経路があるか確認します。ステップ間の水平距離が遠すぎないか（30〜40cm以内）、高さが急すぎないかチェック。" },
      { order: 9, title: "安全荷重テスト", description: "各ステップに人の手で体重をかけて（5kg以上）ぐらつきがないか確認します。少しでも動揺を感じたらビスを増し締め、または補強ブラケットを追加してください。" },
      { order: 10, title: "猫の慣れ確認", description: "完成直後は猫が怖がって使わないことがあります。お気に入りのおもちゃやオヤツをステップに置いて誘導しましょう。最初の1週間は毎日ビスの緩みをチェックする習慣をつけてください。" },
    ],
    warnings: ["必ず壁の下地（柱・間柱）に固定してください", "石膏ボードのみへの固定は強度不足です"],
    relatedSlugs: ["kantan-wall-shelf"],
  },
];

export const retailerSlugs: Record<Retailer, string> = {
  カインズ: "cainz",
  コメリ: "komeri",
  コーナン: "kohnan",
  DCM: "dcm",
};

export const categories = [
  { slug: "tana",             name: "棚",             description: "壁面棚・ディスプレイ棚など",        count: 1 },
  { slug: "bookshelf",        name: "本棚",            description: "文庫からA4まで対応する本棚",         count: 1 },
  { slug: "tv-stand",         name: "TV台",            description: "ローボード・テレビ台",               count: 1 },
  { slug: "dining-table",     name: "ダイニングテーブル", description: "家族で囲めるダイニングテーブル",   count: 1 },
  { slug: "desk",             name: "デスク・作業台",   description: "在宅ワーク・DIY作業台",             count: 1 },
  { slug: "bench",            name: "ベンチ",           description: "玄関・庭に使える木製ベンチ",         count: 1 },
  { slug: "garden-table",     name: "ガーデンテーブル", description: "庭で使えるアウトドアテーブル",       count: 1 },
  { slug: "deck",             name: "ウッドデッキ",     description: "庭を拡張するウッドデッキ",           count: 1 },
  { slug: "garden-fence",     name: "ガーデンフェンス", description: "庭を彩る木製フェンス",              count: 1 },
  { slug: "shoe-rack",        name: "シューズラック",   description: "玄関をすっきり整理",                count: 1 },
  { slug: "entrance-storage", name: "玄関収納",         description: "玄関まわりの収納家具",              count: 1 },
  { slug: "flower-box",       name: "フラワーボックス", description: "窓辺・玄関先を彩るボックス",         count: 1 },
  { slug: "planter-dai",      name: "プランター台",     description: "室内外で使える植物台",              count: 1 },
  { slug: "compost",          name: "コンポスト",       description: "家庭菜園と組み合わせた循環型DIY",    count: 1 },
  { slug: "cat-walk",         name: "キャットウォーク", description: "壁付きの猫用ステップ",              count: 1 },
  { slug: "cat-tower",        name: "キャットタワー",   description: "猫が遊べる立体的な猫用家具",         count: 1 },
  { slug: "dog-house",        name: "犬小屋",           description: "愛犬のための木製ハウス",            count: 1 },
  { slug: "pet-storage",      name: "ペット用収納",     description: "フード・用品を整理する収納",         count: 1 },
  { slug: "kids-furniture",   name: "子供用家具",       description: "子供サイズの机・椅子・収納",         count: 1 },
  { slug: "hanger-rack",      name: "ハンガーラック",   description: "衣類をおしゃれに収納",              count: 1 },
  { slug: "storage-shed",     name: "物置・収納",       description: "屋外物置・大型収納",                count: 1 },
  { slug: "sign",             name: "看板・インテリア", description: "木製サインや装飾アイテム",           count: 1 },
];

export function getUseCaseBySlug(slug: string): UseCase | undefined {
  return useCases.find((uc) => uc.slug === slug);
}

export function getUseCaseById(id: string): UseCase | undefined {
  return useCases.find((uc) => uc.id === id);
}

export function getBlueprintBySlug(slug: string): BlueprintDetail | undefined {
  return blueprintDetails.find((bp) => bp.slug === slug);
}

export function getBlueprintByTemplateID(templateID: string): BlueprintDetail | undefined {
  return blueprintDetails.find((bp) => bp.templateID === templateID);
}

export function getUseCasesByCategory(categorySlug: string): UseCase[] {
  return useCases.filter((uc) => uc.categorySlug === categorySlug);
}

/** 部材名・スペックからリテーラーURLを推定して付与する */
export function enrichPartWithRetailerURLs(partName: string, _spec: string): {
  cainzURL?: string; komeriURL?: string; kohnanURL?: string; dcmURL?: string;
} {
  const n = partName;
  if (n.includes("1×4") || n.includes("1x4")) return { cainzURL: C.spf1x4, komeriURL: K.spf1x4, kohnanURL: KH.spf1x4, dcmURL: D.spf1x4 };
  if (n.includes("1×6") || n.includes("1x6")) return { cainzURL: C.spf1x6, komeriURL: K.spf1x6, kohnanURL: KH.spf1x6, dcmURL: D.spf1x6 };
  if (n.includes("1×8") || n.includes("1x8")) return { cainzURL: C.spf1x8, komeriURL: K.spf1x8, kohnanURL: KH.spf1x8, dcmURL: D.spf1x8 };
  if (n.includes("2×4") || n.includes("2x4")) return { cainzURL: C.spf2x4, komeriURL: K.spf2x4, kohnanURL: KH.spf2x4, dcmURL: D.spf2x4 };
  if (n.includes("天板") || n.includes("側板") || n.includes("棚板") || n.includes("底板") || n.includes("座板") || n.includes("背板") || n.includes("幕板") || n.includes("貫") || n.includes("支柱") || n.includes("横桟") || n.includes("前後板") || n.includes("左右板") || n.includes("ステップ板") || n.includes("デッキ板") || n.includes("根太") || n.includes("大引")) {
    // スペックから板厚・幅で素材推定
    if (_spec.startsWith("19×89")) return { cainzURL: C.spf1x4, komeriURL: K.spf1x4, kohnanURL: KH.spf1x4, dcmURL: D.spf1x4 };
    if (_spec.startsWith("19×140")) return { cainzURL: C.spf1x6, komeriURL: K.spf1x6, kohnanURL: KH.spf1x6, dcmURL: D.spf1x6 };
    if (_spec.startsWith("19×184")) return { cainzURL: C.spf1x8, komeriURL: K.spf1x8, kohnanURL: KH.spf1x8, dcmURL: D.spf1x8 };
    if (_spec.startsWith("38×89")) return { cainzURL: C.spf2x4, komeriURL: K.spf2x4, kohnanURL: KH.spf2x4, dcmURL: D.spf2x4 };
    if (n.includes("レッドシダー") || n.includes("デッキ") || n.includes("シダー")) return { cainzURL: C.cedar, komeriURL: K.cedar, kohnanURL: KH.cedar, dcmURL: D.cedar };
    return { cainzURL: C.lumber, komeriURL: K.lumber, kohnanURL: KH.lumber, dcmURL: D.lumber };
  }
  if (n.includes("レッドシダー") || n.includes("シダー")) return { cainzURL: C.cedar, komeriURL: K.cedar, kohnanURL: KH.cedar, dcmURL: D.cedar };
  if (n.includes("ベニヤ") || n.includes("合板")) return { cainzURL: C.plywood, komeriURL: K.plywood, kohnanURL: KH.plywood, dcmURL: D.plywood };
  if (n.includes("コーススレッド") || n.includes("ステンレスビス") || n.includes("ビス")) return { cainzURL: C.screw, komeriURL: K.screw, kohnanURL: KH.screw, dcmURL: D.screw };
  if (n.includes("L字金具")) return { cainzURL: C.bracket, komeriURL: K.bracket, kohnanURL: KH.bracket, dcmURL: D.bracket };
  if (n.includes("蝶番") || n.includes("丁番")) return { cainzURL: C.hinge, komeriURL: K.hinge, kohnanURL: KH.hinge, dcmURL: D.hinge };
  if (n.includes("鉢底ネット") || n.includes("防虫ネット")) return { cainzURL: C.net, komeriURL: K.net, kohnanURL: KH.net, dcmURL: D.net };
  if (n.includes("フランジ")) return { cainzURL: C.hardware, komeriURL: K.flange, kohnanURL: KH.flange, dcmURL: D.flange };
  if (n.includes("ハンガーパイプ") || n.includes("アイアン丸棒")) return { cainzURL: C.hardware, komeriURL: K.pipe, kohnanURL: KH.pipe, dcmURL: D.pipe };
  if (n.includes("束石")) return { cainzURL: "https://www.cainz.com/shop/c/c10601010201", komeriURL: K.stone, kohnanURL: KH.stone, dcmURL: D.stone };
  return {};
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
