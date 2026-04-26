"use client";

import { useMemo, useState } from "react";
import BlueprintCard from "@/components/BlueprintCard";
import LottieIcon from "@/components/LottieIcon";
import type { UseCase, Difficulty, IndoorOutdoor } from "@/lib/data";

interface Props {
  useCases: UseCase[];
  exampleCounts?: Record<string, number>;
}

type DifficultyFilter = Difficulty | "all";
type IndoorFilter = IndoorOutdoor | "all";
type BudgetTier = "all" | "u3000" | "u10000" | "o10000";
type TimeTier = "all" | "u60" | "u180" | "o180";

const difficulties: { value: DifficultyFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "初心者向け", label: "初心者" },
  { value: "中級者向け", label: "中級者" },
  { value: "上級者向け", label: "上級者" },
];

const indoorOutdoors: { value: IndoorFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "室内", label: "室内" },
  { value: "屋外", label: "屋外" },
  { value: "両用", label: "両用" },
];

const budgets: { value: BudgetTier; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "u3000", label: "〜3,000円" },
  { value: "u10000", label: "〜10,000円" },
  { value: "o10000", label: "10,000円〜" },
];

const times: { value: TimeTier; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "u60", label: "〜1時間" },
  { value: "u180", label: "〜3時間" },
  { value: "o180", label: "3時間〜" },
];

function matchBudget(uc: UseCase, tier: BudgetTier): boolean {
  if (tier === "all") return true;
  const max = uc.estimatedBudgetMax;
  if (tier === "u3000") return max <= 3000;
  if (tier === "u10000") return max <= 10000;
  return max > 10000;
}

function matchTime(uc: UseCase, tier: TimeTier): boolean {
  if (tier === "all") return true;
  const t = uc.estimatedTimeMinutes;
  if (tier === "u60") return t <= 60;
  if (tier === "u180") return t <= 180;
  return t > 180;
}

export default function BlueprintFilters({ useCases, exampleCounts }: Props) {
  const [diff, setDiff] = useState<DifficultyFilter>("all");
  const [indoor, setIndoor] = useState<IndoorFilter>("all");
  const [budget, setBudget] = useState<BudgetTier>("all");
  const [time, setTime] = useState<TimeTier>("all");

  const filtered = useMemo(() => {
    return useCases.filter((uc) => {
      if (diff !== "all" && uc.difficulty !== diff) return false;
      if (indoor !== "all" && uc.indoorOutdoor !== indoor) return false;
      if (!matchBudget(uc, budget)) return false;
      if (!matchTime(uc, time)) return false;
      return true;
    });
  }, [useCases, diff, indoor, budget, time]);

  const hasActiveFilter = diff !== "all" || indoor !== "all" || budget !== "all" || time !== "all";

  const reset = () => {
    setDiff("all");
    setIndoor("all");
    setBudget("all");
    setTime("all");
  };

  return (
    <>
      <div
        className="rounded-2xl p-4 mb-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: "var(--navy-deep)" }}>
            絞り込み
          </p>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={reset}
              className="text-xs font-semibold"
              style={{ color: "var(--amber)" }}
            >
              リセット
            </button>
          )}
        </div>

        <FilterRow label="難易度" options={difficulties} value={diff} onChange={setDiff} />
        <FilterRow label="場所" options={indoorOutdoors} value={indoor} onChange={setIndoor} />
        <FilterRow label="予算" options={budgets} value={budget} onChange={setBudget} />
        <FilterRow label="制作時間" options={times} value={time} onChange={setTime} />
      </div>

      <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
        {filtered.length} 件 / 全 {useCases.length} 件
      </p>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {filtered.map((uc) => (
            <BlueprintCard key={uc.id} useCase={uc} exampleCount={exampleCounts?.[uc.id] ?? 0} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 mb-12">
          <div className="flex justify-center mb-4">
            <LottieIcon name="searching" size={180} ariaLabel="該当なし" />
          </div>
          <p className="text-gray-500 mb-4">条件に一致する設計図がありません。</p>
          <button
            type="button"
            onClick={reset}
            className="btn-primary text-sm inline-flex items-center gap-1.5"
          >
            フィルタをリセット
          </button>
        </div>
      )}
    </>
  );
}

interface FilterRowProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

function FilterRow<T extends string>({ label, options, value, onChange }: FilterRowProps<T>) {
  return (
    <div className="flex items-center gap-2 py-1.5 overflow-x-auto">
      <span
        className="text-xs font-semibold shrink-0 w-16"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </span>
      <div className="flex gap-1.5">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap"
              style={{
                background: active ? "var(--navy-deep)" : "var(--canvas)",
                color: active ? "white" : "var(--text-secondary)",
                border: active ? "1px solid var(--navy-deep)" : "1px solid var(--border)",
              }}
              aria-pressed={active}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
