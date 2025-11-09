import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useBuyerInsights } from "../hooks/useBuyerInsights";
import type { BuyerBrandSegment, BuyerInsightsDataset } from "../types/analytics";
import { SentimentBadge } from "../components/SentimentBadge";

const SENTIMENT_KEYS = ["Positive", "Neutral", "Negative"] as const;

const sentimentPalette: Record<string, string> = {
  Positive: "#22c55e",
  Neutral: "#94a3b8",
  Negative: "#ef4444",
};

function BuyerInsights() {
  const { status, data, error } = useBuyerInsights();
  const datasetKeys = useMemo(() => {
    if (!data) return [];
    const keys = Object.keys(data.datasets ?? {});
    if (data.overall) {
      return ["overall", ...keys];
    }
    return keys;
  }, [data]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string>("all");

  useEffect(() => {
    if (!datasetKeys.length) return;
    if (!activeKey || !datasetKeys.includes(activeKey)) {
      setActiveKey(datasetKeys[0]);
    }
  }, [activeKey, datasetKeys]);

  const activeDataset: BuyerInsightsDataset | null = useMemo(() => {
    if (!data || !activeKey) return null;
    if (activeKey === "overall") {
      return data.overall ?? null;
    }
    return data.datasets?.[activeKey] ?? null;
  }, [activeKey, data]);

  const brandOptions = useMemo(() => {
    if (!activeDataset) return [];
    const names = new Set<string>();
    activeDataset.brand_analysis?.forEach((brand) => {
      if (brand?.brand && brand.brand !== "Unknown") {
        names.add(brand.brand);
      }
    });
    Object.keys(activeDataset.brand_segments ?? {}).forEach((brand) => {
      if (brand && brand !== "Unknown") {
        names.add(brand);
      }
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [activeDataset]);

  useEffect(() => {
    setSelectedBrand("all");
  }, [activeKey]);

  useEffect(() => {
    if (selectedBrand === "all") return;
    if (!brandOptions.includes(selectedBrand)) {
      setSelectedBrand("all");
    }
  }, [brandOptions, selectedBrand]);

  if (status === "loading" || status === "idle") {
    return (
      <section className="flex min-h-[320px] items-center justify-center rounded-3xl border border-white/60 bg-white/70 p-12 shadow-glass">
        <div className="flex flex-col items-center gap-4 text-slate-500" data-testid="loading-spinner">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-primary" aria-hidden="true" />
          <p className="text-sm font-medium">Loading buyer insights…</p>
        </div>
      </section>
    );
  }

  if (status === "error" || !activeDataset) {
    return (
      <section className="rounded-3xl border border-white/60 bg-white/70 p-10 shadow-glass">
        <p className={`text-sm ${status === "error" ? "text-rose-500" : "text-slate-500"}`}>
          {status === "error" ? error ?? "Unable to load insights." : "No insight data available."}
        </p>
      </section>
    );
  }

  const brandSegment: BuyerBrandSegment | null = selectedBrand === "all"
    ? null
    : activeDataset.brand_segments?.[selectedBrand] ?? null;

  const summary = brandSegment?.summary ?? activeDataset.summary;
  const trendData = brandSegment ? brandSegment.trend : activeDataset.trend;
  const topModels = brandSegment ? brandSegment.top_models : activeDataset.top_models;
  const featureTiles = brandSegment ? brandSegment.feature_tiles : activeDataset.feature_tiles;
  const topPositive = brandSegment
    ? brandSegment.top_reviews?.positive ?? []
    : activeDataset.top_reviews?.positive ?? [];
  const topNegative = brandSegment
    ? brandSegment.top_reviews?.negative ?? []
    : activeDataset.top_reviews?.negative ?? [];

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="text-3xl font-semibold text-slate-900">Buyer Insights</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Prioritize roadmap decisions with a sentiment-weighted view of smartphone feedback. Switch between datasets to compare how conversations shift across social media, marketplaces, and enthusiast communities.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-3">
          {datasetKeys.map((key: string) => (
            <button
              key={key}
              onClick={() => setActiveKey(key)}
              type="button"
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                key === activeKey
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-white/60 bg-white/70 text-slate-600 hover:bg-white"
              }`}
            >
              {key === "overall" ? "Combined" : key.charAt(0).toUpperCase() + key.slice(1)} insights
            </button>
          ))}
        </div>
        {brandOptions.length > 0 && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="buyer-brand-filter"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Company
            </label>
            <select
              id="buyer-brand-filter"
              value={selectedBrand}
              onChange={(event) => setSelectedBrand(event.target.value)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:border-primary focus:outline-none"
            >
              <option value="all">All companies</option>
              {brandOptions.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <section className="grid gap-6 md:grid-cols-4">
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-glass">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Total reviews</p>
          <p className="mt-4 text-3xl font-semibold">{summary.total_reviews.toLocaleString()}</p>
          <p className="mt-2 text-xs text-slate-500">Sentiment-weighted voice of the customer sample size</p>
        </div>
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-glass">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Positive</p>
          <p className="mt-4 text-3xl font-semibold text-emerald-500">{summary.positive_pct}%</p>
          <p className="mt-2 text-xs text-slate-500">Share of positive reviews</p>
        </div>
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-glass">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">Neutral</p>
          <p className="mt-4 text-3xl font-semibold text-amber-500">{summary.neutral_pct}%</p>
          <p className="mt-2 text-xs text-slate-500">Balanced, factual narratives</p>
        </div>
        <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-glass">
          <p className="text-xs font-semibold uppercase tracking-widest text-rose-400">Negative</p>
          <p className="mt-4 text-3xl font-semibold text-rose-500">{summary.negative_pct}%</p>
          <p className="mt-2 text-xs text-slate-500">Design gaps to address immediately</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="h-80 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-glass">
          <h2 className="text-lg font-semibold text-slate-800">Sentiment timeline</h2>
          <p className="mb-4 text-xs text-slate-500">Track polarity shifts to time releases and patches.</p>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  {SENTIMENT_KEYS.map((sentiment) => (
                    <linearGradient key={sentiment} id={`color-${sentiment}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={sentimentPalette[sentiment]} stopOpacity={0.6} />
                      <stop offset="95%" stopColor={sentimentPalette[sentiment]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 16 }} />
                <Legend />
                <Area type="monotone" dataKey="positive" stroke="#22c55e" fillOpacity={1} fill="url(#color-Positive)" />
                <Area type="monotone" dataKey="neutral" stroke="#94a3b8" fillOpacity={1} fill="url(#color-Neutral)" />
                <Area type="monotone" dataKey="negative" stroke="#ef4444" fillOpacity={1} fill="url(#color-Negative)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="mt-8 text-sm text-slate-500">Timeline data will appear once timestamped reviews are available.</p>
          )}
        </article>

        <article className="h-80 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-glass">
          <h2 className="text-lg font-semibold text-slate-800">Top models by delight score</h2>
          <p className="mb-4 text-xs text-slate-500">Blend of positive ratio and star-rating performance.</p>
          {topModels.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topModels}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="model"
                  stroke="#94a3b8"
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-10}
                  textAnchor="end"
                />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 16 }} />
                <Legend />
                <Bar dataKey="score" name="Delight score" fill="#6366f1" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="mt-8 text-sm text-slate-500">Leaderboard will populate as soon as model-level reviews are detected.</p>
          )}
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-glass">
          <h2 className="text-lg font-semibold text-slate-800">Feature hotspots</h2>
          <p className="mb-4 text-xs text-slate-500">Surface the most discussed product areas by sentiment volume.</p>
          {featureTiles.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {featureTiles.slice(0, 12).map((tile) => (
                <div
                  key={tile.feature}
                  className="min-w-[160px] rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm"
                >
                  <p className="text-xs uppercase tracking-widest text-slate-400">{tile.feature}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-800">{tile.total}</p>
                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-emerald-500">
                      <span>Positive</span>
                      <span>{tile.counts.Positive}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Neutral</span>
                      <span>{tile.counts.Neutral}</span>
                    </div>
                    <div className="flex items-center justify-between text-rose-500">
                      <span>Negative</span>
                      <span>{tile.counts.Negative}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Feature-level analysis will appear when aspect keywords are detected.</p>
          )}
        </article>

                <article className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-glass">
          <h2 className="text-lg font-semibold text-slate-800">Top voiced reviews</h2>
          <p className="mb-4 text-xs text-slate-500">Scan exemplar quotes to anchor feature decisions.</p>
          <div className="space-y-6">
            {topPositive.slice(0, 2).map((review) => (
              <blockquote key={review.review_id} className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
                <SentimentBadge sentiment="Positive" />
                <p className="mt-2 text-sm text-slate-700">"{review.text}"</p>
                <p className="mt-2 text-xs text-slate-500">
                  {review.brand} {review.model} · {review.source}
                </p>
              </blockquote>
            ))}
            {topNegative.slice(0, 2).map((review) => (
              <blockquote key={review.review_id} className="rounded-2xl border border-rose-100 bg-rose-50/80 p-4">
                <SentimentBadge sentiment="Negative" />
                <p className="mt-2 text-sm text-slate-700">"{review.text}"</p>
                <p className="mt-2 text-xs text-slate-500">
                  {review.brand} {review.model} · {review.source}
                </p>
              </blockquote>
            ))}
            {!topPositive.length && !topNegative.length && (
              <p className="text-sm text-slate-500">Top highlight snippets will populate once reviews stream in.</p>
            )}
          </div>
        </article>
      </section>

      {activeDataset.brand_analysis && activeDataset.brand_analysis.length > 0 && (
        <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-glass">
          <h2 className="mb-6 text-lg font-semibold text-slate-800">Brand Performance Analysis</h2>
          <p className="mb-4 text-xs text-slate-500">Compare smartphone companies based on overall sentiment and customer satisfaction.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200">
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="pb-3">Brand</th>
                  <th className="pb-3">Total Reviews</th>
                  <th className="pb-3">Avg Rating</th>
                  <th className="pb-3">Positive %</th>
                  <th className="pb-3">Negative %</th>
                  <th className="pb-3">Strength Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(selectedBrand === "all"
                  ? activeDataset.brand_analysis
                  : activeDataset.brand_analysis.filter((brand) => brand.brand === selectedBrand)
                )
                  .slice(0, 10)
                  .map((brand: any) => (
                    <tr key={brand.brand} className="hover:bg-slate-50/50">
                      <td className="py-3 font-medium text-slate-800">{brand.brand}</td>
                      <td className="py-3 text-slate-600">{brand.total_reviews.toLocaleString()}</td>
                      <td className="py-3 text-slate-600">{brand.avg_rating ?? "N/A"}</td>
                      <td className="py-3 text-emerald-600 font-medium">{brand.positive_pct}%</td>
                      <td className="py-3 text-rose-600 font-medium">{brand.negative_pct}%</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-slate-200">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{ width: `${Math.min(brand.strength_score, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">{brand.strength_score}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeDataset.model_analysis && activeDataset.model_analysis.length > 0 && (
        <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-glass">
          <h2 className="text-lg font-semibold text-slate-800">Model-Level Analysis</h2>
          <p className="mb-4 text-xs text-slate-500">Detailed breakdown of individual smartphone models with feature insights.</p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(selectedBrand === "all"
              ? activeDataset.model_analysis
              : activeDataset.model_analysis.filter((model) => model.brand === selectedBrand)
            )
              .slice(0, 9)
              .map((model: any) => (
                <div key={`${model.brand}-${model.model}`} className="rounded-2xl border border-white/60 bg-white/90 p-4">
                  <div className="mb-3">
                    <p className="text-xs text-slate-400">{model.brand}</p>
                    <p className="font-semibold text-slate-800">{model.model}</p>
                  </div>
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Reviews:</span>
                    <span className="font-medium">{model.total_reviews}</span>
                  </div>
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Rating:</span>
                    <span className="font-medium">{model.avg_rating ?? "N/A"}</span>
                  </div>
                  <div className="mb-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-emerald-500">Positive</span>
                      <span className="text-emerald-600 font-medium">{model.positive_pct}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-rose-500">Negative</span>
                      <span className="text-rose-600 font-medium">{model.negative_pct}%</span>
                    </div>
                  </div>
                  {model.strongest_features && model.strongest_features.length > 0 && (
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <p className="mb-1 text-xs text-slate-400">Top Features:</p>
                      <div className="flex flex-wrap gap-1">
                        {model.strongest_features.slice(0, 3).map((f: any) => (
                          <span key={f.feature} className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                            {f.feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-6 shadow-glass">
        <h2 className="text-lg font-semibold text-slate-800">💡 Buyer Recommendations</h2>
        <p className="mb-4 text-xs text-slate-500">AI-powered insights tailored to the selected company.</p>
        <div className="space-y-3">
          {generateBuyerRecommendations(activeDataset, selectedBrand, brandSegment).map((rec: BuyerRecommendation, idx: number) => (
            <div key={`${rec.title}-${idx}`} className="rounded-2xl border border-white/60 bg-white/90 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                  {idx + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 leading-relaxed">{rec.title}</p>
                  <p className="mt-1 text-sm text-slate-700 leading-relaxed">{rec.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default BuyerInsights;

interface BuyerRecommendation {
  title: string;
  description: string;
}

function generateBuyerRecommendations(
  dataset: BuyerInsightsDataset,
  selectedBrand: string,
  brandSegment: BuyerBrandSegment | null,
): BuyerRecommendation[] {
  const brandPool = dataset.brand_analysis ?? [];
  const modelPool = dataset.model_analysis ?? [];

  const scopedBrands = selectedBrand === "all"
    ? brandPool
    : brandPool.filter((brand) => brand.brand === selectedBrand);

  const scopedModels = selectedBrand === "all"
    ? modelPool
    : modelPool.filter((model) => model.brand === selectedBrand);

  const recommendations: BuyerRecommendation[] = [];

  let bestModel = scopedModels
    .slice()
    .sort((a, b) => {
      const bScore = (b.positive_pct ?? 0) + (b.avg_rating ?? 0);
      const aScore = (a.positive_pct ?? 0) + (a.avg_rating ?? 0);
      return bScore - aScore;
    })[0];

  if (!bestModel && brandSegment?.top_models?.length) {
    const candidate = brandSegment.top_models[0];
    const found = scopedModels.find((model) => model.brand === candidate.brand && model.model === candidate.model);
    if (found) {
      bestModel = found;
    }
  }

  if (bestModel) {
    const positivePct = bestModel.positive_pct?.toFixed(1) ?? "--";
    const rating = bestModel.avg_rating ?? "N/A";
    recommendations.push({
      title: `${bestModel.brand} ${bestModel.model} is your top pick`,
      description: `${bestModel.model} leads ${selectedBrand === "all" ? "across datasets" : "within the brand"} with ${positivePct}% positive sentiment and an average rating of ${rating}. Prioritize this model if you need a balanced flagship experience.`,
    });

    const standoutFeature = bestModel.strongest_features?.[0];
    if (standoutFeature) {
      recommendations.push({
        title: `What makes ${bestModel.model} stand out`,
        description: `${standoutFeature.feature} earns ${standoutFeature.positive_pct}% positive feedback (${standoutFeature.mentions} mentions). Spotlight this feature when comparing against alternatives.`,
      });
    }
  }

  if (selectedBrand === "all") {
    const leadingBrand = scopedBrands[0];
    if (leadingBrand) {
      recommendations.push({
        title: `${leadingBrand.brand} leads the market`,
        description: `${leadingBrand.brand} secures ${leadingBrand.positive_pct}% positive sentiment against ${leadingBrand.negative_pct}% negative across ${leadingBrand.total_reviews.toLocaleString()} reviews. Use this brand as a benchmark for reliability and customer satisfaction.`,
      });
    }
  } else {
    const analysisEntry = scopedBrands[0];
    const totalReviews = brandSegment?.summary?.total_reviews ?? analysisEntry?.total_reviews;
    const positivePct = brandSegment?.summary?.positive_pct ?? analysisEntry?.positive_pct;
    const negativePct = brandSegment?.summary?.negative_pct ?? analysisEntry?.negative_pct;
    if (totalReviews !== undefined && positivePct !== undefined && negativePct !== undefined) {
      recommendations.push({
        title: `${selectedBrand} brand health check`,
        description: `${positivePct}% positive vs ${negativePct}% negative sentiment across ${totalReviews.toLocaleString()} reviews. Reinforce service touchpoints and marketing to keep sentiment trending upward.`,
      });
    }
  }

  let otherModel = scopedModels
    .filter((model) => model !== bestModel)
    .sort((a, b) => (b.positive_pct ?? 0) - (a.positive_pct ?? 0))[0];
  if (!otherModel && brandSegment?.top_models?.length) {
    const fallbackCandidate = brandSegment.top_models.find((entry) => !bestModel || entry.model !== bestModel.model || entry.brand !== bestModel.brand);
    if (fallbackCandidate) {
      const found = scopedModels.find((model) => model.brand === fallbackCandidate.brand && model.model === fallbackCandidate.model);
      if (found) {
        otherModel = found;
      }
    }
  }
  if (otherModel) {
    recommendations.push({
      title: `Secondary option: ${otherModel.brand} ${otherModel.model}`,
      description: `${otherModel.model} posts ${otherModel.positive_pct}% positive sentiment and ${otherModel.avg_rating ?? "N/A"} star ratings. Consider it if you value its highlighted features: ${otherModel.strongest_features?.map((f) => f.feature).slice(0, 2).join(", ") || "core usability"}.`,
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      title: "Monitor customer feedback",
      description: "We need more recent reviews for this brand. Keep tracking sentiment to identify winning models as data grows.",
    });
  }

  return recommendations.slice(0, 4);
}
