export interface SentimentCounts {
  Positive: number;
  Neutral: number;
  Negative: number;
}

export interface FeatureTile {
  feature: string;
  counts: SentimentCounts;
  total: number;
  positive_pct: number;
}

export interface TrendPoint {
  period: string;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
}

export interface ModelLeaderboardEntry {
  brand: string;
  model: string;
  total_reviews: number;
  sentiments: SentimentCounts;
  avg_rating: number | null;
  positive_ratio: number;
  score: number;
}

export interface ReviewRecord {
  review_id: string;
  dataset: string;
  brand: string;
  model: string;
  source: string;
  sentiment: keyof SentimentCounts | string;
  rating?: number | null;
  polarity?: number | null;
  country?: string | null;
  date?: string | null;
  created_at?: string | null;
  text: string;
  feature_sentiments?: Record<string, string>;
  age?: number;
  price_usd?: number;
  verified?: boolean;
  subreddit?: string;
}

export interface BuyerInsightsDataset {
  summary: {
    total_reviews: number;
    sentiment_counts: SentimentCounts;
    positive_pct: number;
    neutral_pct: number;
    negative_pct: number;
    avg_rating: number | null;
  };
  feature_tiles: FeatureTile[];
  trend: TrendPoint[];
  top_models: ModelLeaderboardEntry[];
  brand_analysis?: BrandAnalysisEntry[];
  model_analysis?: ModelAnalysisEntry[];
  top_reviews: {
    positive: ReviewRecord[];
    negative: ReviewRecord[];
  };
  recommendations?: string[];
  brand_segments?: Record<string, BuyerBrandSegment>;
}

export interface BuyerBrandSegment {
  summary: {
    total_reviews: number;
    sentiment_counts: SentimentCounts;
    positive_pct: number;
    neutral_pct: number;
    negative_pct: number;
    avg_rating: number | null;
  };
  feature_tiles: FeatureTile[];
  trend: TrendPoint[];
  top_models: ModelLeaderboardEntry[];
  top_reviews: {
    positive: ReviewRecord[];
    negative: ReviewRecord[];
  };
}

export interface BrandAnalysisEntry {
  brand: string;
  total_reviews: number;
  sentiments: SentimentCounts;
  avg_rating: number | null;
  positive_pct: number;
  negative_pct: number;
  strength_score: number;
  feature_sentiments: Record<string, SentimentCounts>;
}

export interface ModelAnalysisEntry {
  brand: string;
  model: string;
  total_reviews: number;
  sentiments: SentimentCounts;
  avg_rating: number | null;
  positive_pct: number;
  negative_pct: number;
  overall_score: number;
  strongest_features: { feature: string; positive_pct: number; mentions: number }[];
  weakest_features: { feature: string; positive_pct: number; mentions: number }[];
}

export interface BuyerInsightsResponse {
  datasets: Record<string, BuyerInsightsDataset>;
  overall?: BuyerInsightsDataset;
}

export interface BrandOverviewEntry {
  brand: string;
  total_reviews: number;
  sentiments: SentimentCounts;
  avg_rating: number | null;
  positive_pct?: number;
  negative_pct?: number;
  health_score?: number;
}

export interface ModelBreakdownEntry {
  model: string;
  total_reviews: number;
  sentiments: SentimentCounts;
  avg_rating: number | null;
  positive_pct?: number;
  negative_pct?: number;
  feature_performance?: Record<string, SentimentCounts>;
}

export interface SupplierDatasetInsight {
  brand_overview: BrandOverviewEntry[];
  model_breakdown: Record<string, ModelBreakdownEntry[]>;
  feature_heatmap: Record<string, Record<string, SentimentCounts>>;
  complaint_volume: { feature: string; complaints: number }[];
  regional_distribution: { country: string; total_reviews: number; sentiments: SentimentCounts }[];
  demographics: { age_group: string; total_reviews: number; sentiments: SentimentCounts; avg_rating: number | null }[];
  top_reviews: ReviewRecord[];
  recommendations: string[];
  brand_insights?: Record<string, SupplierBrandInsight>;
}

export interface SupplierBrandInsight {
  summary: {
    brand: string;
    total_reviews: number;
    sentiments: SentimentCounts;
    avg_rating: number | null;
    positive_pct: number;
    negative_pct: number;
    health_score: number;
  };
  complaint_volume: { feature: string; complaints: number }[];
  regional_distribution: { country: string; total_reviews: number; sentiments: SentimentCounts }[];
  demographics: { age_group: string; total_reviews: number; sentiments: SentimentCounts; avg_rating: number | null }[];
  feature_sentiments: Record<string, SentimentCounts>;
}

export interface SupplierInsightsResponse {
  datasets: Record<string, SupplierDatasetInsight>;
  overall?: SupplierDatasetInsight;
}

export interface FilterOptions {
  brands: string[];
  models: string[];
  sources: string[];
  countries: string[];
  features: string[];
}

export interface FiltersResponse {
  datasets: Record<string, FilterOptions>;
  overall?: FilterOptions;
  sentiments: (keyof SentimentCounts)[];
}

export interface ReviewQueryResult {
  reviews: ReviewRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ModelAdvisorModel {
  brand: string;
  model: string;
  avg_rating: number | null;
  avg_price_usd: number | null;
  avg_price_inr: number | null;
  avg_battery_rating: number | null;
  avg_camera_rating: number | null;
  avg_display_rating: number | null;
  avg_performance_rating: number | null;
  review_count: number;
}

export interface ModelAdvisorBrand {
  brand: string;
  models: ModelAdvisorModel[];
}

export interface ModelAdvisorResponse {
  brands: ModelAdvisorBrand[];
  models: ModelAdvisorModel[];
  currency: { usd_to_inr: number };
  summary: {
    brand_count: number;
    model_count: number;
    min_price_usd: number | null;
    max_price_usd: number | null;
  };
}
