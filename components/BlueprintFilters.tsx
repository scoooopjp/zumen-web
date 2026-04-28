"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("BlueprintFilters");

  const difficulties: { value: DifficultyFilter; label: string }[] = [
    { value: "all", label: t("all") },
    { value: "初心者向け", label: t("diffBeginner") },
    { value: "中級者向け", label: t("diffIntermediate") },
    { value: "上級者向け", label: t("diffAdvanced") },
  ];

  const indoorOutdoors: { value: IndoorFilter; label: string }[] = [
    { value: "all", label: t("all") },
    { value: "室内", label: t("indoor") },
    { value: "屋外", label: t("outdoor") },
    { value: "両用", label: t("both") },
  ];

  const budgets: { value: BudgetTier; label: string }[] = [
    { value: "all", label: t("all") },
    { value: "u3000", label: t("budgetUnder3000") },
    { value: "u10000", label: t("budgetUnder10000") },
    { value: "o10000", label: t("budgetOver10000") },
  ];

  const times: { value: TimeTier; label: string }[] = [
    { value: "all", label: t("all") },
    { value: "u60", label: t("timeUnder1h") },
    { value: "u180", label: t("timeUnder3h") },
    { value: "o180", label: t("timeOver3h") },
  ];

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
            {t("title")}
          </p>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={reset}
              className="text-xs font-semibold"
              style={{ color: "var(--amber)" }}
            >
              {t("reset")}
            </button>
          )}
        </div>

        <FilterRow label={t("difficulty")} options={difficulties} value={diff} onChange={setDiff} />
        <FilterRow label={t("place")} options={indoorOutdoors} value={indoor} onChange={setIndoor} />
        <FilterRow label={t("budget")} options={budgets} value={budget} onChange={setBudget} />
        <FilterRow label={t("time")} options={times} value={time} onChange={setTime} />
      </div>

      <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
        {t("matchCount", { filtered: filtered.length, total: useCases.length })}
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
            <LottieIcon name="searching" size={180} ariaLabel={t("noMatchAria")} />
          </div>
          <p className="text-gray-500 mb-4">{t("noMatchBody")}</p>
          <button
            type="button"
            onClick={reset}
            className="btn-primary text-sm inline-flex items-center gap-1.5"
          >
            {t("resetFilter")}
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
