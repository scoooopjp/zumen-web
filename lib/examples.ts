// 作例データ (Firestore 接続前のモック)
// 実際は Firestore から動的取得
export { fetchExamples, fetchExampleById, fetchRecentExamples } from "./firestore";

export interface ExampleStep {
  id: string;
  order: number;
  text: string;
  imageURL: string | null;
  /** 一覧・詳細表示用の縮小版 (960px max)。null のときは imageURL を使う。 */
  thumbnailURL: string | null;
  /** IllType rawValue (例: "measure", "cut", "screw"). iOS 側と一致 */
  illustrationType: string | null;
  /** Storage 上の動画パス。non-null なら工程動画が紐付いている。
   *  Web では path は使わず、▶ オーバーレイと App 誘導モーダルだけ表示する。 */
  videoPath: string | null;
}

export interface Example {
  id: string;
  useCaseID: string;
  useCaseName: string;
  useCaseSlug: string;
  imageURL: string | null;
  /** 一覧用の縮小版 (960px max)。null のときは imageURL を使う。 */
  thumbnailURL: string | null;
  actualWidth: number | null;
  actualDepth: number | null;
  actualHeight: number | null;
  actualCost: number;
  actualTimeMinutes: number;
  retailer: string;
  comment: string;
  authorUID: string;
  authorName: string;
  // 投稿時に denormalize されないので fetch 時に users から join
  authorPhotoURL: string | null;
  authorUsername: string | null;
  createdAt: string; // ISO date string
  steps: ExampleStep[];
  /** Cloud Function `recomputeRatingAggregate` が親 doc に書き戻す評価数。 */
  ratingCount: number;
  /** 親 doc の平均評価 (1.0–5.0)。未評価は 0。 */
  ratingAverage: number;
  /** 一覧 orderBy 用のベイジアン人気スコア (`average*count/(count+2)`)。 */
  popularityScore: number;
}

export const mockExamples: Example[] = [
  {
    id: "ex-001",
    useCaseID: "kantan-wall-shelf",
    useCaseName: "かんたん壁面棚",
    useCaseSlug: "kantan-wall-shelf",
    imageURL: null,
    thumbnailURL: null,
    actualWidth: 900,
    actualDepth: 200,
    actualHeight: 1100,
    actualCost: 4800,
    actualTimeMinutes: 150,
    retailer: "カインズ",
    comment: "初めてのDIYでしたが、カットサービスを使ったら思ったより簡単でした。棚板の間隔を変えて本棚として使っています。",
    authorUID: "mock-taro",
    authorName: "taro_diy",
    authorPhotoURL: null,
    authorUsername: null,
    createdAt: "2025-03-15",
    steps: [],
    ratingCount: 0,
    ratingAverage: 0,
    popularityScore: 0,
  },
  {
    id: "ex-002",
    useCaseID: "planter-stand",
    useCaseName: "プランター台",
    useCaseSlug: "planter-stand",
    imageURL: null,
    thumbnailURL: null,
    actualWidth: 400,
    actualDepth: 350,
    actualHeight: 550,
    actualCost: 2900,
    actualTimeMinutes: 80,
    retailer: "コメリ",
    comment: "ベランダに置くためにオイルステインで仕上げました。思ったより頑丈で満足しています。",
    authorUID: "mock-garden",
    authorName: "garden_life",
    authorPhotoURL: null,
    authorUsername: null,
    createdAt: "2025-04-02",
    steps: [],
    ratingCount: 0,
    ratingAverage: 0,
    popularityScore: 0,
  },
];

export function getExampleById(id: string): Example | undefined {
  return mockExamples.find((e) => e.id === id);
}

export function formatTime(minutes: number, locale: string = "ja"): string {
  if (locale === "en") {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return h === 1 ? "1 h" : `${h} h`;
    return `${h} h ${m} min`;
  }
  if (minutes < 60) return `${minutes}分`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}時間${m}分` : `${h}時間`;
}
