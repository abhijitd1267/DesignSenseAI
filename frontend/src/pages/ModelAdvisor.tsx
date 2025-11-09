import { useEffect, useMemo, useState } from "react";
import { FiAward, FiDollarSign, FiFilter, FiSliders, FiTarget, FiTrendingUp } from "react-icons/fi";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { useModelAdvisor } from "../hooks/useModelAdvisor";
import type { ModelAdvisorModel } from "../types/analytics";

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const formatRating = (value: number | null) => (value !== null && value !== undefined ? value.toFixed(1) : "N/A");

const formatUsd = (value: number | null) => (value !== null && value !== undefined ? usdFormatter.format(value) : "N/A");
const formatInr = (value: number | null) => (value !== null && value !== undefined ? inrFormatter.format(value) : "N/A");

function ModelAdvisor() {
  const { status, data, error } = useModelAdvisor();
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [budgetInput, setBudgetInput] = useState<string>("");
  const [budgetBrand, setBudgetBrand] = useState<string>("all");

  const brandOptions = useMemo(() => data?.brands.map((entry) => entry.brand) ?? [], [data]);

  useEffect(() => {
    if (!brandOptions.length) {
      setSelectedBrand("all");
      setBudgetBrand("all");
      return;
    }
    if (selectedBrand !== "all" && !brandOptions.includes(selectedBrand)) {
      setSelectedBrand("all");
    }
    if (budgetBrand !== "all" && !brandOptions.includes(budgetBrand)) {
      setBudgetBrand("all");
    }
  }, [brandOptions, selectedBrand, budgetBrand]);

  const visibleModels = useMemo(() => {
    if (!data) return [] as ModelAdvisorModel[];
    if (selectedBrand === "all") {
      return data.models;
    }
    const target = data.brands.find((entry) => entry.brand === selectedBrand);
    return target?.models ?? [];
  }, [data, selectedBrand]);

  const budgetValue = useMemo(() => {
    const parsed = Number.parseFloat(budgetInput);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [budgetInput]);

  const { recommendedModels, candidatePool } = useMemo<{
    recommendedModels: ModelAdvisorModel[];
    candidatePool: ModelAdvisorModel[];
  }>(() => {
    if (!data || !data.models.length) {
      return { recommendedModels: [], candidatePool: [] };
    }

    let scopedPool = data.models;
    if (budgetBrand !== "all") {
      scopedPool = scopedPool.filter((model) => model.brand === budgetBrand);
    }

    const withPriceAndRating = scopedPool.filter(
      (model) => model.avg_price_usd !== null && model.avg_rating !== null
    );

    if (!withPriceAndRating.length) {
      return { recommendedModels: [], candidatePool: [] };
    }

    const budget = budgetValue;
    const tolerance = budget ? Math.max(budget * 0.25, 100) : null;
    let workingSet = withPriceAndRating;

    if (budget && tolerance) {
      const withinTolerance = withPriceAndRating.filter((model) => {
        const price = model.avg_price_usd ?? 0;
        return Math.abs(price - budget) <= tolerance;
      });
      if (withinTolerance.length >= 3) {
        workingSet = withinTolerance;
      }
    }

    const sorted = [...workingSet].sort((a, b) => {
      const ratingDiff = (b.avg_rating ?? 0) - (a.avg_rating ?? 0);
      if (Math.abs(ratingDiff) > 1e-6) {
        return ratingDiff > 0 ? 1 : -1;
      }
      if (budget) {
        const diffA = Math.abs((a.avg_price_usd ?? budget) - budget);
        const diffB = Math.abs((b.avg_price_usd ?? budget) - budget);
        if (Math.abs(diffA - diffB) > 1e-6) {
          return diffA - diffB;
        }
      }
      const priceA = a.avg_price_usd ?? Number.MAX_SAFE_INTEGER;
      const priceB = b.avg_price_usd ?? Number.MAX_SAFE_INTEGER;
      return priceA - priceB;
    });

    return {
      recommendedModels: sorted.slice(0, 3),
      candidatePool: sorted,
    };
  }, [data, budgetValue, budgetBrand]);

  const comparisonData = useMemo(
    () =>
      candidatePool.slice(0, 8).map((model) => ({
        name: `${model.brand} ${model.model}`,
        price: model.avg_price_usd ?? 0,
        rating: model.avg_rating ?? 0,
      })),
    [candidatePool]
  );

  const averageFeatureSeries = useMemo(() => {
    const metrics: Array<{ key: keyof ModelAdvisorModel; label: string }> = [
      { key: "avg_camera_rating", label: "Camera" },
      { key: "avg_battery_rating", label: "Battery" },
      { key: "avg_display_rating", label: "Display" },
      { key: "avg_performance_rating", label: "Performance" },
    ];

    return metrics
      .map(({ key, label }) => {
        const values = candidatePool
          .map((model) => model[key])
          .filter((value): value is number => value !== null && value !== undefined);
        const rating = values.length
          ? Number((values.reduce((sum, val) => sum + val, 0) / values.length).toFixed(2))
          : 0;
        return { feature: label, rating };
      })
      .filter((entry) => entry.rating > 0);
  }, [candidatePool]);

  if (status === "loading" || status === "idle") {
    return (
      <section className="flex min-h-[320px] items-center justify-center rounded-3xl border border-white/60 bg-white/70 p-12 shadow-glass">
        <div className="flex flex-col items-center gap-4 text-slate-500" data-testid="loading-spinner">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-primary" aria-hidden="true" />
          <p className="text-sm font-medium">Loading model advisor…</p>
        </div>
      </section>
    );
  }

  if (status === "error" || !data) {
    return (
      <section className="rounded-3xl border border-white/60 bg-white/70 p-10 shadow-glass">
        <p className="text-sm text-rose-500">{error ?? "Unable to load model advisor data."}</p>
      </section>
    );
  }

  const { summary } = data;
  const minPrice = summary.min_price_usd;
  const maxPrice = summary.max_price_usd;

  return (
    <div className="flex flex-col gap-12">
      <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-white to-accent/10 p-10 shadow-glass">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold text-slate-900">Model Advisor</h1>
            <p className="mt-3 text-sm text-slate-600">
              Compare smartphone models within each company using real <strong>e-commerce reviews</strong>. Dial in your budget to surface the top-rated models that balance price, performance, and everyday reliability.
            </p>
          </div>
          <div className="grid w-full max-w-sm grid-cols-2 gap-4 text-sm">
            <div className="rounded-2xl border border-white/60 bg-white/80 p-4 text-slate-600 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-primary">Brands</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.brand_count}</p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/80 p-4 text-slate-600 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-primary">Models</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.model_count}</p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/80 p-4 text-slate-600 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-primary">Price Floor</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{formatUsd(minPrice)}</p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/80 p-4 text-slate-600 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-primary">Price Ceiling</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{formatUsd(maxPrice)}</p>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/80 p-8 shadow-glass">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Browse by company</h2>
            <p className="mt-2 text-sm text-slate-500">Select a brand to explore its portfolio with aggregated ratings and pricing.</p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <label htmlFor="brand-filter" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Company
            </label>
            <select
              id="brand-filter"
              value={selectedBrand}
              onChange={(event) => setSelectedBrand(event.target.value)}
              className="min-w-[220px] rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-primary focus:outline-none"
            >
              <option value="all">All companies</option>
              {brandOptions.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleModels.length > 0 ? (
            visibleModels.map((model) => (
              <article
                key={`${model.brand}-${model.model}`}
                className="group rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-400">{model.brand}</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">{model.model}</h3>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary flex items-center gap-2">
                    <FiAward />
                    {formatRating(model.avg_rating)}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><FiDollarSign className="text-primary" /> Avg. Price</span>
                    <span className="font-semibold text-slate-900">
                      {formatUsd(model.avg_price_usd)}
                      <span className="ml-2 text-xs text-slate-500">({formatInr(model.avg_price_inr)})</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <span className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                      <span>Camera</span>
                      <span className="font-semibold text-slate-700">{formatRating(model.avg_camera_rating)}</span>
                    </span>
                    <span className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                      <span>Battery</span>
                      <span className="font-semibold text-slate-700">{formatRating(model.avg_battery_rating)}</span>
                    </span>
                    <span className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                      <span>Display</span>
                      <span className="font-semibold text-slate-700">{formatRating(model.avg_display_rating)}</span>
                    </span>
                    <span className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                      <span>Performance</span>
                      <span className="font-semibold text-slate-700">{formatRating(model.avg_performance_rating)}</span>
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Based on {model.review_count.toLocaleString()} verified reviews</p>
                </div>
              </article>
            ))
          ) : (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center text-sm text-slate-500">
              No models detected for this company yet.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/80 p-8 shadow-glass">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-xl font-semibold text-slate-900">Budget-aligned recommendations</h2>
            <p className="mt-2 text-sm text-slate-500">
              Input an estimated budget in USD to surface the highest rated models priced near your target. We automatically convert pricing to INR for local procurement planning.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="budget-brand-filter" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Company focus
              </label>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm focus-within:border-primary">
                <FiFilter className="text-primary" />
                <select
                  id="budget-brand-filter"
                  value={budgetBrand}
                  onChange={(event) => setBudgetBrand(event.target.value)}
                  className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none"
                >
                  <option value="all">All companies</option>
                  {brandOptions.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="budget-input" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Estimated budget (USD)
              </label>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm focus-within:border-primary">
                <FiSliders className="text-primary" />
                <input
                  id="budget-input"
                  type="number"
                  min="0"
                  placeholder="e.g. 600"
                  value={budgetInput}
                  onChange={(event) => setBudgetInput(event.target.value)}
                  className="w-32 bg-transparent text-sm font-medium text-slate-700 focus:outline-none"
                />
              </div>
              <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
                <p>≈ {formatInr(budgetValue !== null ? budgetValue * data.currency.usd_to_inr : null)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {recommendedModels.length > 0 ? (
            recommendedModels.map((model, index) => (
              <article
                key={`${model.brand}-${model.model}-recommendation`}
                className="relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-white via-white to-primary/10 p-6 shadow-sm"
              >
                <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <span className="text-sm font-semibold">{index + 1}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <FiTarget />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-400">{model.brand}</p>
                    <h3 className="text-lg font-semibold text-slate-900">{model.model}</h3>
                  </div>
                </div>

                <div className="mt-5 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between text-slate-900">
                    <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><FiTrendingUp /> Rating</span>
                    <span className="text-lg font-semibold">{formatRating(model.avg_rating)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><FiDollarSign /> Avg. Price</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {formatUsd(model.avg_price_usd)}
                      <span className="ml-1 text-xs text-slate-500">({formatInr(model.avg_price_inr)})</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <span className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                      <span>Camera</span>
                      <span className="font-semibold text-slate-700">{formatRating(model.avg_camera_rating)}</span>
                    </span>
                    <span className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                      <span>Battery</span>
                      <span className="font-semibold text-slate-700">{formatRating(model.avg_battery_rating)}</span>
                    </span>
                    <span className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                      <span>Display</span>
                      <span className="font-semibold text-slate-700">{formatRating(model.avg_display_rating)}</span>
                    </span>
                    <span className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                      <span>Performance</span>
                      <span className="font-semibold text-slate-700">{formatRating(model.avg_performance_rating)}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{model.review_count.toLocaleString()} review signals aggregated</p>
                </div>
              </article>
            ))
          ) : (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center text-sm text-slate-500">
              Enter a budget to discover the highest rated matches.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/80 p-8 shadow-glass">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Visualize the short list</h2>
            <p className="mt-2 text-sm text-slate-500">
              Compare pricing, rating momentum, and average feature sentiment across the models considered for your budget.
            </p>
          </div>

          {candidatePool.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <article className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Price vs. rating</h3>
                  <p className="text-xs text-slate-500">Dual-axis trend of average price (USD) alongside buyer ratings.</p>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={comparisonData} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={70} />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => `$${Math.round(value as number)}`}
                    />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 5]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number | string, name) => {
                        const numericValue = typeof value === "number" ? value : Number(value);
                        const label = typeof name === "string" ? name : String(name);
                        if (label.toLowerCase().includes("price")) {
                          return formatUsd(Number.isFinite(numericValue) ? numericValue : 0);
                        }
                        return `${Number.isFinite(numericValue) ? numericValue.toFixed(2) : "0.00"} / 5`;
                      }}
                    />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="price" stroke="#007BFF" strokeWidth={2} name="Avg Price (USD)" />
                    <Line yAxisId="right" type="monotone" dataKey="rating" stroke="#22c55e" strokeWidth={2} name="Avg Rating" />
                  </LineChart>
                </ResponsiveContainer>
              </article>

              <article className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Feature satisfaction snapshot</h3>
                  <p className="text-xs text-slate-500">Average component ratings across shortlisted models.</p>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={averageFeatureSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="feature" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => `${value.toFixed(2)} / 5`} />
                    <Bar dataKey="rating" fill="#6366f1" radius={[12, 12, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </article>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center text-sm text-slate-500">
              Provide a budget and pick a company to unlock visual comparisons.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default ModelAdvisor;
