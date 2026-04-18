import Link from "next/link";
import { UseCase, formatBudget, formatTime } from "@/lib/data";

interface BlueprintCardProps {
  useCase: UseCase;
}

const difficultyColor: Record<string, string> = {
  "初心者向け": "bg-green-100 text-green-700",
  "中級者向け": "bg-orange-100 text-orange-700",
  "上級者向け": "bg-red-100 text-red-700",
};

export default function BlueprintCard({ useCase }: BlueprintCardProps) {
  return (
    <Link
      href={`/blueprint/${useCase.slug}`}
      className="group block bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* 画像プレースホルダー */}
      <div className="aspect-video bg-gray-50 flex items-center justify-center">
        <span className="text-4xl">🪚</span>
      </div>

      <div className="p-4">
        <p className="text-xs text-gray-400 mb-1">{useCase.category}</p>
        <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
          {useCase.name}
        </h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{useCase.description}</p>

        <div className="flex flex-wrap gap-2 mt-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColor[useCase.difficulty]}`}>
            {useCase.difficulty}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {formatBudget(useCase.estimatedBudgetMin, useCase.estimatedBudgetMax)}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {formatTime(useCase.estimatedTimeMinutes)}
          </span>
        </div>

        <div className="flex gap-1 mt-3">
          {useCase.supportedRetailers.map((r) => (
            <span key={r} className="text-xs px-2 py-0.5 rounded-full border border-gray-200 text-gray-500">
              {r}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
