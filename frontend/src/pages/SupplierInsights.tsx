import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FiAlertTriangle, FiMapPin, FiTrendingDown, FiUsers } from "react-icons/fi";
import { useSupplierInsights } from "../hooks/useSupplierInsights";
import type { SupplierDatasetInsight, SupplierBrandInsight, ModelBreakdownEntry } from "../types/analytics";

const toFivePointScore = (positive: number, total: number) => {
  if (!total) return 0;
  const scaled = (positive / total) * 5;
  return Number(scaled.toFixed(2));
};

const SupplierInsights = () => {
  const { status, data, error } = useSupplierInsights();
  const datasetKeys = useMemo(() => {
    if (!data) return [];
    const keys: string[] = [];
    if (data.overall) keys.push("overall");
    keys.push(...Object.keys(data.datasets ?? {}));
    return keys;
  }, [data]);

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string>("all");

  useEffect(() => {
    if (!datasetKeys.length) {
      setActiveKey(null);
      return;
    }
    if (!activeKey || !datasetKeys.includes(activeKey)) {
      setActiveKey(datasetKeys[0]);
    }
  }, [datasetKeys, activeKey]);

  const activeDataset = useMemo<SupplierDatasetInsight | null>(() => {
    if (!data || !activeKey) return null;
    if (activeKey === "overall") {
      return data.overall ?? null;
    }
    return data.datasets?.[activeKey] ?? null;
  }, [data, activeKey]);

  useEffect(() => {
    setSelectedBrand("all");
  }, [activeKey]);

  const brandOptions = useMemo(() => activeDataset?.brand_overview.map((brand) => brand.brand) ?? [], [activeDataset]);

  useEffect(() => {
    if (selectedBrand === "all") return;
    if (!brandOptions.includes(selectedBrand)) {
      setSelectedBrand("all");
    }
  }, [brandOptions, selectedBrand]);

  const brandInsight = useMemo(() => {
    if (!activeDataset || selectedBrand === "all") return null;
    return activeDataset.brand_insights?.[selectedBrand] ?? null;
  }, [activeDataset, selectedBrand]);

  const brandModels = useMemo<ModelBreakdownEntry[] | null>(() => {
    if (!activeDataset || selectedBrand === "all") return null;
    return activeDataset.model_breakdown[selectedBrand] ?? null;
  }, [activeDataset, selectedBrand]);

  if (status === "loading" || status === "idle") {
    return (
      <section className="flex min-h-[320px] items-center justify-center rounded-3xl border border-white/60 bg-white/70 p-12 shadow-glass">
        <div className="flex flex-col items-center gap-4 text-slate-500" data-testid="loading-spinner">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-primary" aria-hidden="true" />
          <p className="text-sm font-medium">Loading supplier insights…</p>
        </div>
      </section>
    );
  }

  if (status === "error" || !activeDataset) {
    return (
      <div className="rounded-3xl border border-white/60 bg-white/70 p-8 text-center shadow-glass">
        <h2 className="text-lg font-semibold text-slate-800">Supplier insights unavailable</h2>
        <p className="mt-2 text-sm text-slate-500">{error ?? "No analytics data could be loaded."}</p>
      </div>
    );
  }

  const overallComplaintVolume = activeDataset.complaint_volume ?? [];
  const brandSentimentEntries = activeDataset.brand_overview.map((brand) => ({
    brand: brand.brand,
    positive: brand.sentiments.Positive,
    neutral: brand.sentiments.Neutral,
    negative: brand.sentiments.Negative,
  }));
  const overallBrandSentimentData = brandSentimentEntries.slice(0, 8);

  const overallCountryData = activeDataset.regional_distribution.slice(0, 10).map((region) => ({
    country: region.country,
    rating: toFivePointScore(region.sentiments.Positive, region.total_reviews),
    reviews: region.total_reviews,
  }));

  const overallDemographicData = activeDataset.demographics.map((group) => ({
    age: group.age_group,
    rating:
      group.avg_rating !== null && group.avg_rating !== undefined
        ? Number(group.avg_rating.toFixed(2))
        : toFivePointScore(group.sentiments.Positive, group.total_reviews),
    reviews: group.total_reviews,
  }));

  const overallTotals = {
    countries: activeDataset.regional_distribution.length,
    brands: activeDataset.brand_overview.length,
    ageGroups: activeDataset.demographics.length,
  };

  const scopedComplaintVolume = (brandInsight?.complaint_volume?.length ? brandInsight.complaint_volume : overallComplaintVolume).slice(0, 6);
  const scopedBrandSentimentData = selectedBrand === "all"
    ? overallBrandSentimentData
    : brandSentimentEntries.filter((entry) => entry.brand === selectedBrand);

  const scopedCountryData = selectedBrand === "all"
    ? overallCountryData
    : (brandInsight?.regional_distribution ?? []).map((region) => ({
        country: region.country,
        rating: toFivePointScore(region.sentiments.Positive, region.total_reviews),
        reviews: region.total_reviews,
      }));

  const scopedDemographicData = selectedBrand === "all"
    ? overallDemographicData
    : (brandInsight?.demographics ?? []).map((group) => ({
        age: group.age_group,
        rating:
          group.avg_rating !== null && group.avg_rating !== undefined
            ? Number(group.avg_rating.toFixed(2))
            : toFivePointScore(group.sentiments.Positive, group.total_reviews),
        reviews: group.total_reviews,
      }));

  const metricCountries = selectedBrand === "all" ? overallTotals.countries : brandInsight?.regional_distribution?.length ?? 0;
  const metricBrands = selectedBrand === "all" ? overallTotals.brands : activeDataset.model_breakdown[selectedBrand]?.length ?? 0;
  const metricAgeGroups = selectedBrand === "all" ? overallTotals.ageGroups : brandInsight?.demographics?.length ?? 0;

  const topComplaintLabel = scopedComplaintVolume[0]?.feature ?? "N/A";
  const topComplaintCount = scopedComplaintVolume[0]?.complaints ?? 0;

  const scopeLabel = selectedBrand === "all" ? "All companies" : selectedBrand;
  const recommendationCards = createRecommendationCards(
    scopeLabel,
    scopedComplaintVolume,
    selectedBrand === "all" ? activeDataset.recommendations ?? [] : [],
    selectedBrand === "all" ? null : brandInsight,
    selectedBrand === "all" ? null : brandModels,
  );

  return (
    <div data-testid="supplier-insights-page">
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ marginBottom: "48px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              marginBottom: "12px",
            }}
          >
            <h1 style={{ fontSize: "36px", fontWeight: "700" }} data-testid="page-title">
              Supplier Insights Dashboard
            </h1>
            {datasetKeys.length > 1 && (
              <select
                value={activeKey ?? ""}
                onChange={(event) => setActiveKey(event.target.value)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "9999px",
                  border: "1px solid #E5E7EB",
                  background: "rgba(255,255,255,0.85)",
                  fontWeight: 600,
                  color: "#1F2937",
                }}
              >
                {datasetKeys.map((key) => (
                  <option key={key} value={key}>
                    {key === "overall" ? "All channels" : key.charAt(0).toUpperCase() + key.slice(1)}
                  </option>
                ))}
              </select>
            )}
          </div>
          <p style={{ color: "#6B7280", fontSize: "16px" }}>Data-driven recommendations for product improvement</p>
          {brandOptions.length > 0 && (
            <div
              style={{
                marginTop: "16px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <label
                htmlFor="supplier-brand-filter"
                style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}
              >
                Company
              </label>
              <select
                id="supplier-brand-filter"
                value={selectedBrand}
                onChange={(event) => setSelectedBrand(event.target.value)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "9999px",
                  border: "1px solid #E5E7EB",
                  background: "rgba(255,255,255,0.85)",
                  fontWeight: 600,
                  color: "#1F2937",
                  minWidth: "200px",
                }}
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

        {/* Key Metrics */}
        <div
          className="fade-in"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          <MetricCard
            icon={<FiAlertTriangle size={24} color="#FF5B5B" />}
            iconTint="rgba(255, 91, 91, 0.16)"
            label="Top Complaint"
            value={topComplaintLabel}
            subtext={`${topComplaintCount.toLocaleString()} complaints`}
            dataTestId="top-complaint-card"
          />

          <MetricCard
            icon={<FiMapPin size={24} color="#0EA5E9" />}
            iconTint="rgba(14, 165, 233, 0.15)"
            label="Countries Analyzed"
            value={metricCountries.toLocaleString()}
            dataTestId="countries-analyzed-card"
          />

          <MetricCard
            icon={<FiTrendingDown size={24} color="#A855F7" />}
            iconTint="rgba(168, 85, 247, 0.15)"
            label="Brands Tracked"
            value={metricBrands.toLocaleString()}
            dataTestId="brands-tracked-card"
          />

          <MetricCard
            icon={<FiUsers size={24} color="#34D399" />}
            iconTint="rgba(52, 211, 153, 0.15)"
            label="Age Demographics"
            value={metricAgeGroups.toLocaleString()}
            dataTestId="age-groups-card"
          />
        </div>

        {/* Complaint Volume */}
        <div className="chart-container fade-in" style={{ marginBottom: "24px" }} data-testid="complaint-volume-chart">
          <div className="chart-title">Feature Complaint Volume</div>
          <p style={{ color: "#6B7280", fontSize: "14px", marginBottom: "20px" }}>
            Areas requiring immediate attention
          </p>
          <ResponsiveContainer width="100%" height={350}>
            {scopedComplaintVolume.length > 0 ? (
              <BarChart data={scopedComplaintVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="feature" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip />
                <Bar dataKey="complaints" fill="#FF5252" radius={[8, 8, 0, 0]} />
              </BarChart>
            ) : (
              <BarChart data={[{ feature: "No data", complaints: 0 }]}> 
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="feature" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip />
                <Bar dataKey="complaints" fill="#FF5252" radius={[8, 8, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Brand Sentiment Comparison */}
        <div className="chart-container fade-in" style={{ marginBottom: "24px" }} data-testid="brand-sentiment-chart">
          <div className="chart-title">Brand Sentiment Comparison</div>
          <p style={{ color: "#6B7280", fontSize: "14px", marginBottom: "20px" }}>
            Competitive sentiment analysis
          </p>
          <ResponsiveContainer width="100%" height={400}>
            {scopedBrandSentimentData.length > 0 ? (
              <BarChart data={scopedBrandSentimentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="brand" stroke="#6B7280" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#6B7280" />
                <Tooltip />
                <Legend />
                <Bar dataKey="positive" stackId="a" fill="#00E676" name="Positive" />
                <Bar dataKey="neutral" stackId="a" fill="#FFC107" name="Neutral" />
                <Bar dataKey="negative" stackId="a" fill="#FF5252" name="Negative" />
              </BarChart>
            ) : (
              <BarChart data={[{ brand: "No data", positive: 0, neutral: 0, negative: 0 }]}> 
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="brand" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip />
                <Legend />
                <Bar dataKey="positive" stackId="a" fill="#00E676" name="Positive" />
                <Bar dataKey="neutral" stackId="a" fill="#FFC107" name="Neutral" />
                <Bar dataKey="negative" stackId="a" fill="#FF5252" name="Negative" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", gap: "24px", marginBottom: "48px" }}
        >
          {/* Geographic Sentiment */}
          <div className="chart-container fade-in" data-testid="country-sentiment-chart">
            <div className="chart-title">Sentiment by Region</div>
            <p style={{ color: "#6B7280", fontSize: "14px", marginBottom: "20px" }}>
              Regional satisfaction levels
            </p>
            <ResponsiveContainer width="100%" height={300}>
              {scopedCountryData.length > 0 ? (
                <BarChart data={scopedCountryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" domain={[0, 5]} stroke="#6B7280" />
                  <YAxis dataKey="country" type="category" stroke="#6B7280" width={80} />
                  <Tooltip />
                  <Bar dataKey="rating" fill="#007BFF" radius={[0, 8, 8, 0]} />
                </BarChart>
              ) : (
                <BarChart data={[{ country: "No data", rating: 0 }]} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" domain={[0, 5]} stroke="#6B7280" />
                  <YAxis dataKey="country" type="category" stroke="#6B7280" width={80} />
                  <Tooltip />
                  <Bar dataKey="rating" fill="#007BFF" radius={[0, 8, 8, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Demographic Analysis */}
          <div className="chart-container fade-in" data-testid="demographic-chart">
            <div className="chart-title">Age Demographics Analysis</div>
            <p style={{ color: "#6B7280", fontSize: "14px", marginBottom: "20px" }}>
              Satisfaction by age group
            </p>
            <ResponsiveContainer width="100%" height={300}>
              {scopedDemographicData.length > 0 ? (
                <BarChart data={scopedDemographicData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="age" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" domain={[0, 5]} />
                  <Tooltip />
                  <Bar dataKey="rating" fill="#A46BF5" radius={[8, 8, 0, 0]} />
                </BarChart>
              ) : (
                <BarChart data={[{ age: "No data", rating: 0 }]}> 
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="age" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" domain={[0, 5]} />
                  <Tooltip />
                  <Bar dataKey="rating" fill="#A46BF5" radius={[8, 8, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recommendations */}
        <div className="fade-in" data-testid="recommendations-section">
          <h2 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "24px" }}>Actionable Recommendations</h2>
          <div style={{ display: "grid", gap: "16px" }}>
            {recommendationCards.map((card, index) => (
              <div
                key={`${card.title}-${index}`}
                className="glass-card"
                style={{ padding: "24px" }}
                data-testid={`recommendation-card-${index}`}
              >
                <div style={{ display: "flex", alignItems: "start", gap: "16px" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      background: "rgba(255, 82, 82, 0.1)",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <FiAlertTriangle size={24} color="#FF5252" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>{card.title}</h3>
                    <p style={{ color: "#6B7280", lineHeight: "1.6", marginBottom: "12px" }}>{card.description}</p>
                    <div
                      style={{
                        display: "inline-block",
                        padding: "6px 12px",
                        background: "rgba(255, 82, 82, 0.1)",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#D32F2F",
                      }}
                    >
                      Priority: {card.priority}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierInsights;

interface MetricCardProps {
  icon: ReactNode;
  iconTint: string;
  label: string;
  value: string;
  subtext?: string;
  dataTestId?: string;
}

function MetricCard({ icon, iconTint, label, value, subtext, dataTestId }: MetricCardProps) {
  return (
    <div
      className="glass-card"
      data-testid={dataTestId}
      style={{
        padding: "24px",
        borderRadius: "20px",
        background: "rgba(255, 255, 255, 0.9)",
        border: "1px solid rgba(226, 232, 240, 0.6)",
        boxShadow: "0 25px 45px rgba(15, 23, 42, 0.08)",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "16px",
          background: iconTint,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#6B7280", marginBottom: "6px" }}>{label}</div>
        <div style={{ fontSize: "28px", fontWeight: 700, color: "#111827", textTransform: "capitalize" }}>{value}</div>
        {subtext && <div style={{ fontSize: "14px", color: "#6B7280", marginTop: "6px" }}>{subtext}</div>}
      </div>
    </div>
  );
}

type RecommendationPriority = "Critical" | "High" | "Medium";

interface RecommendationCardData {
  title: string;
  description: string;
  priority: RecommendationPriority;
}

function createRecommendationCards(
  scopeLabel: string,
  complaints: { feature: string; complaints: number }[],
  fallback: string[],
  brandInsight: SupplierBrandInsight | null,
  brandModels: ModelBreakdownEntry[] | null,
): RecommendationCardData[] {
  const scopeSuffix = scopeLabel === "All companies" ? "" : ` for ${scopeLabel}`;
  const priorities: RecommendationPriority[] = ["Critical", "High", "Medium"];
  const cards: RecommendationCardData[] = [];
  const MAX_CARDS = 3;

  const pushCard = (title: string, description: string) => {
    const priority = priorities[cards.length] ?? "Medium";
    if (cards.length < MAX_CARDS) {
      cards.push({ title, description, priority });
    }
  };

  if (brandInsight) {
    const { summary } = brandInsight;
    const positive = summary.positive_pct.toFixed(1);
    const negative = summary.negative_pct.toFixed(1);
    const averageRating = summary.avg_rating ? summary.avg_rating.toFixed(1) : "N/A";
    pushCard(
      `${summary.brand}: Sentiment pulse`,
      `${summary.total_reviews.toLocaleString()} reviews${scopeSuffix} show ${positive}% positive vs ${negative}% negative sentiment with an average rating of ${averageRating}. Launch a satisfaction uplift program focused on service quality and proactive outreach.`,
    );

    if (complaints.length && cards.length < MAX_CARDS) {
      const primaryComplaint = complaints[0];
      pushCard(
        `${summary.brand}: Urgent fix for ${primaryComplaint.feature}`,
        `${primaryComplaint.complaints.toLocaleString()} complaints cite ${primaryComplaint.feature}${scopeSuffix}. Allocate tiger teams across engineering, QA, and support to deliver a hotfix within 2 sprints.`,
      );
      complaints.slice(1, MAX_CARDS - cards.length + 1).forEach((item) => {
        if (cards.length < MAX_CARDS) {
          pushCard(
            `${summary.brand}: Stabilize ${item.feature}`,
            `Sustain a recovery plan for ${item.feature}${scopeSuffix} by improving diagnostics, releasing incremental firmware tweaks, and communicating timelines to affected customers.`,
          );
        }
      });
    }

    if (cards.length < MAX_CARDS) {
      const featureSentiments = Object.entries(brandInsight.feature_sentiments ?? {})
        .map(([feature, counts]) => {
          const total = counts.Positive + counts.Neutral + counts.Negative;
          const negativeRatio = total ? counts.Negative / total : 0;
          return { feature, counts, total, negativeRatio };
        })
        .filter((entry) => entry.total > 0)
        .sort((a, b) => {
          if (b.negativeRatio !== a.negativeRatio) return b.negativeRatio - a.negativeRatio;
          return b.counts.Negative - a.counts.Negative;
        });

      featureSentiments.forEach((item) => {
        if (cards.length >= MAX_CARDS) return;
        const negativePct = (item.negativeRatio * 100).toFixed(1);
        pushCard(
          `${summary.brand}: Redesign ${item.feature}`,
          `${negativePct}% of mentions for ${item.feature}${scopeSuffix} skew negative. Pair usability testing with supplier audits to reverse the sentiment trend.`,
        );
      });
    }

    if (brandModels && cards.length < MAX_CARDS) {
      const problematicModel = [...brandModels]
        .filter((model) => typeof model.negative_pct === "number")
        .sort((a, b) => (b.negative_pct ?? 0) - (a.negative_pct ?? 0))[0];
      if (problematicModel && (problematicModel.negative_pct ?? 0) > 0) {
        pushCard(
          `${summary.brand}: Model recovery for ${problematicModel.model}`,
          `${problematicModel.negative_pct?.toFixed(1) ?? "--"}% negative sentiment on ${problematicModel.model}${scopeSuffix}. Launch an investigative task force, align firmware fixes, and supply field service guidance to partners.`,
        );
      }
    }

    while (cards.length < MAX_CARDS) {
      pushCard(
        `${summary.brand}: Customer delight initiative`,
        `Augment post-purchase touchpoints${scopeSuffix} with concierge support, extended warranty offers, and proactive communications to reinforce loyalty.`,
      );
    }

    return cards;
  }

  if (complaints.length) {
    complaints.slice(0, MAX_CARDS - cards.length).forEach((item) => {
      pushCard(
        `Portfolio: Fix ${item.feature}`,
        `${item.complaints.toLocaleString()} customers flagged ${item.feature}${scopeSuffix}. Stand up a rapid response squad to triage root causes, ship fixes, and validate improvements with targeted surveys.`,
      );
    });
  }

  if (cards.length < 3 && fallback.length) {
    fallback.slice(0, 3 - cards.length).forEach((text, index) => {
      const nextNumber = cards.length + 1;
      const label = scopeLabel === "All companies"
        ? `Recommendation ${nextNumber}`
        : `${scopeLabel}: Initiative ${nextNumber}`;
      pushCard(label, scopeLabel === "All companies" ? text : `${text} (${scopeLabel})`);
    });
  }

  if (!cards.length) {
    pushCard(
      "Monitor customer signals",
      `No urgent issues detected${scopeSuffix}. Keep pulse on NPS, support tickets, and social channels to catch early sentiment shifts.`,
    );
  }

  return cards;
}
