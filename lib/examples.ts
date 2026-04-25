// 作例データ (Firestore 接続前のモック)
// 実際は Firestore から動的取得
export { fetchExamples } from "./firestore";

export interface Example {
  id: string;
  useCaseID: string;
  useCaseName: string;
  useCaseSlug: string;
  imageURL: string | null;
  actualWidth: number | null;
  actualDepth: number | null;
  actualHeight: number | null;
  actualCost: number;
  actualTimeMinutes: number;
  retailer: string;
  comment: string;
  authorUID: string;
  authorName: string;
  createdAt: string; // ISO date string
}

export const mockExamples: Example[] = [
  {
    id: "ex-001",
    useCaseID: "uc-shelf-basic",
    useCaseName: "かんたん壁面棚",
    useCaseSlug: "kantan-wall-shelf",
    imageURL: null,
    actualWidth: 900,
    actualDepth: 200,
    actualHeight: 1100,
    actualCost: 4800,
    actualTimeMinutes: 150,
    retailer: "カインズ",
    comment: "初めてのDIYでしたが、カットサービスを使ったら思ったより簡単でした。棚板の間隔を変えて本棚として使っています。",
    authorUID: "mock-taro",
    authorName: "taro_diy",
    createdAt: "2025-03-15",
  },
  {
    id: "ex-002",
    useCaseID: "uc-planter-stand",
    useCaseName: "プランター台",
    useCaseSlug: "planter-stand",
    imageURL: null,
    actualWidth: 400,
    actualDepth: 350,
    actualHeight: 550,
    actualCost: 2900,
    actualTimeMinutes: 80,
    retailer: "コメリ",
    comment: "ベランダに置くためにオイルステインで仕上げました。思ったより頑丈で満足しています。",
    authorUID: "mock-garden",
    authorName: "garden_life",
    createdAt: "2025-04-02",
  },
];

export function getExampleById(id: string): Example | undefined {
  return mockExamples.find((e) => e.id === id);
}

export function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}分`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}時間${m}分` : `${h}時間`;
}
