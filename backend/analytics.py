from __future__ import annotations

import math
from collections import defaultdict
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Tuple

import pandas as pd

from .data_loader import _canonicalize_brand

SENTIMENTS = ["Positive", "Neutral", "Negative"]
USD_TO_INR = 83.0


@dataclass
class ReviewFilters:
    dataset: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    sentiment: Optional[str] = None
    feature: Optional[str] = None
    source: Optional[str] = None
    country: Optional[str] = None
    search: Optional[str] = None
    start_date: Optional[pd.Timestamp] = None
    end_date: Optional[pd.Timestamp] = None
    min_rating: Optional[float] = None
    max_rating: Optional[float] = None
    page: int = 1
    page_size: int = 20


def _safe_iter_feature_maps(series: pd.Series) -> Iterable[Dict[str, str]]:
    for value in series.dropna():
        if isinstance(value, dict):
            yield value


def _sentiment_counts(values: Iterable[str]) -> Dict[str, int]:
    counts = {sentiment: 0 for sentiment in SENTIMENTS}
    for sentiment in values:
        if sentiment in counts:
            counts[sentiment] += 1
    return counts


def _percentage(value: int, total: int) -> float:
    return round((value / total * 100) if total else 0.0, 2)


def _serialize_date(value: Any) -> Optional[str]:
    if isinstance(value, pd.Timestamp):
        if pd.isna(value):
            return None
        return value.isoformat()
    if isinstance(value, str) and value:
        return value
    return None


def _prepare_review_record(row: pd.Series) -> Dict[str, Any]:
    record = {
        "review_id": row.get("review_id"),
        "dataset": row.get("dataset"),
        "brand": row.get("brand"),
        "model": row.get("model"),
        "source": row.get("source"),
        "sentiment": row.get("sentiment"),
        "rating": row.get("rating"),
        "polarity": row.get("polarity"),
        "country": row.get("country"),
        "date": row.get("date"),
        "created_at": _serialize_date(row.get("created_at")),
        "text": row.get("text"),
        "feature_sentiments": row.get("feature_sentiments", {}),
    }
    if "age" in row and not pd.isna(row["age"]):
        record["age"] = int(row["age"])
    if "price_usd" in row and not pd.isna(row["price_usd"]):
        record["price_usd"] = float(row["price_usd"])
    if "verified" in row and not pd.isna(row["verified"]):
        record["verified"] = bool(row["verified"])
    if "subreddit" in row and isinstance(row["subreddit"], str):
        record["subreddit"] = row["subreddit"]
    return record


def _top_models(df: pd.DataFrame, max_items: int = 5) -> List[Dict[str, Any]]:
    if df.empty:
        return []
    grouping_cols = ["brand", "model"]
    grouped = df.groupby(grouping_cols)
    leaderboard: List[Tuple[str, str, Dict[str, Any]]] = []
    for (brand, model), group in grouped:
        total = len(group)
        sentiment_counts = _sentiment_counts(group["sentiment"].tolist())
        avg_rating = float(group["rating"].mean()) if "rating" in group and not group["rating"].dropna().empty else None
        positive_ratio = sentiment_counts["Positive"] / total if total else 0.0
        rating_score = ((avg_rating - 1) / 4) if avg_rating else positive_ratio
        combined_score = 0.5 * positive_ratio + 0.5 * rating_score
        leaderboard.append(
            (
                brand,
                model,
                {
                    "brand": brand,
                    "model": model,
                    "total_reviews": total,
                    "sentiments": sentiment_counts,
                    "avg_rating": round(avg_rating, 2) if avg_rating else None,
                    "positive_ratio": round(positive_ratio * 100, 2),
                    "score": round(combined_score * 100, 2),
                },
            )
        )
    leaderboard.sort(key=lambda item: (item[2]["score"], item[2]["total_reviews"]), reverse=True)
    return [entry[2] for entry in leaderboard[:max_items]]


def _top_reviews(df: pd.DataFrame, target: str, limit: int) -> List[Dict[str, Any]]:
    if df.empty:
        return []
    filtered = df[df["sentiment"] == target].copy()
    if filtered.empty:
        return []
    if "rating" in filtered.columns and not filtered["rating"].dropna().empty:
        filtered = filtered.sort_values(by=["rating", "polarity"], ascending=False if target == "Positive" else True)
    else:
        filtered = filtered.sort_values(by="polarity", ascending=target != "Positive")
    records: List[Dict[str, Any]] = []
    for _, row in filtered.head(limit).iterrows():
        records.append(_prepare_review_record(row))
    return records


def _analyze_by_brand(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Analyze reviews grouped by brand/company."""
    if df.empty:
        return []
    
    brand_stats = []
    grouped = df.groupby("brand")
    
    for brand, brand_df in grouped:
        if brand == "Unknown":
            continue
            
        total = len(brand_df)
        sentiments = _sentiment_counts(brand_df["sentiment"].tolist())
        avg_rating = float(brand_df["rating"].mean()) if "rating" in brand_df and not brand_df["rating"].dropna().empty else None
        
        # Feature breakdown for this brand
        feature_sentiments: Dict[str, Dict[str, int]] = defaultdict(lambda: {s: 0 for s in SENTIMENTS})
        for feature_map in _safe_iter_feature_maps(brand_df["feature_sentiments"]):
            for feature, sentiment in feature_map.items():
                if sentiment in SENTIMENTS:
                    feature_sentiments[feature][sentiment] += 1
        
        # Calculate strength score
        positive_ratio = sentiments["Positive"] / total if total else 0.0
        rating_score = ((avg_rating - 1) / 4) if avg_rating else positive_ratio
        strength_score = 0.6 * positive_ratio + 0.4 * rating_score
        
        brand_stats.append({
            "brand": brand,
            "total_reviews": total,
            "sentiments": sentiments,
            "avg_rating": round(avg_rating, 2) if avg_rating else None,
            "positive_pct": _percentage(sentiments["Positive"], total),
            "negative_pct": _percentage(sentiments["Negative"], total),
            "strength_score": round(strength_score * 100, 2),
            "feature_sentiments": dict(feature_sentiments),
        })
    
    brand_stats.sort(key=lambda x: x["strength_score"], reverse=True)
    return brand_stats


def _analyze_by_model(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Analyze reviews grouped by specific model."""
    if df.empty:
        return []
    
    model_stats = []
    grouped = df.groupby(["brand", "model"])
    
    for (brand, model), model_df in grouped:
        if brand == "Unknown" or model == "Unknown":
            continue
            
        total = len(model_df)
        sentiments = _sentiment_counts(model_df["sentiment"].tolist())
        avg_rating = float(model_df["rating"].mean()) if "rating" in model_df and not model_df["rating"].dropna().empty else None
        
        # Feature breakdown for this model
        feature_sentiments: Dict[str, Dict[str, int]] = defaultdict(lambda: {s: 0 for s in SENTIMENTS})
        for feature_map in _safe_iter_feature_maps(model_df["feature_sentiments"]):
            for feature, sentiment in feature_map.items():
                if sentiment in SENTIMENTS:
                    feature_sentiments[feature][sentiment] += 1
        
        # Identify strongest and weakest features
        feature_scores = []
        for feature, counts in feature_sentiments.items():
            total_mentions = sum(counts.values())
            if total_mentions > 0:
                positive_pct = _percentage(counts["Positive"], total_mentions)
                feature_scores.append((feature, positive_pct, total_mentions))
        
        feature_scores.sort(key=lambda x: (x[1], x[2]), reverse=True)
        strongest_features = [{"feature": f, "positive_pct": p, "mentions": m} for f, p, m in feature_scores[:3]]
        weakest_features = [{"feature": f, "positive_pct": p, "mentions": m} for f, p, m in reversed(feature_scores[-3:])]
        
        # Calculate overall score
        positive_ratio = sentiments["Positive"] / total if total else 0.0
        rating_score = ((avg_rating - 1) / 4) if avg_rating else positive_ratio
        overall_score = 0.5 * positive_ratio + 0.5 * rating_score
        
        model_stats.append({
            "brand": brand,
            "model": model,
            "total_reviews": total,
            "sentiments": sentiments,
            "avg_rating": round(avg_rating, 2) if avg_rating else None,
            "positive_pct": _percentage(sentiments["Positive"], total),
            "negative_pct": _percentage(sentiments["Negative"], total),
            "overall_score": round(overall_score * 100, 2),
            "strongest_features": strongest_features,
            "weakest_features": weakest_features,
        })
    
    model_stats.sort(key=lambda x: x["overall_score"], reverse=True)
    return model_stats


def _generate_buyer_recommendations(df: pd.DataFrame, top_models: List[Dict[str, Any]], feature_tiles: List[Dict[str, Any]]) -> List[str]:
    """Generate exactly 5 actionable recommendations for buyers."""
    recommendations: List[str] = []
    
    # Recommendation 1: Best overall model
    if top_models:
        best_model = top_models[0]
        recommendations.append(
            f"Top Choice: {best_model['brand']} {best_model['model']} leads with {best_model['positive_ratio']}% positive sentiment "
            f"and {best_model['avg_rating']}/5 rating across {best_model['total_reviews']} reviews."
        )
    else:
        recommendations.append("Explore multiple brands to find the best fit for your needs based on available reviews.")
    
    # Recommendation 2: Feature to prioritize
    if feature_tiles:
        most_discussed = feature_tiles[0]
        recommendations.append(
            f"Prioritize {most_discussed['feature'].capitalize()}: Most discussed feature with {most_discussed['positive_pct']}% positive feedback. "
            "Compare models based on this critical aspect."
        )
    else:
        recommendations.append("Focus on features that matter most to your usage patterns when comparing models.")
    
    # Recommendation 3: Features with high satisfaction
    positive_features = [f for f in feature_tiles if f['positive_pct'] >= 75]
    if positive_features:
        top_positive = positive_features[:2]
        feature_names = " and ".join([f['feature'].capitalize() for f in top_positive])
        recommendations.append(
            f"Strong Performers: {feature_names} receive consistently high praise. Look for models excelling in these areas."
        )
    else:
        recommendations.append("Read detailed reviews to understand real-world performance across different use cases.")
    
    # Recommendation 4: Warning about problematic features
    if feature_tiles:
        problematic = [f for f in feature_tiles if f['positive_pct'] < 50 and f['total'] > 10]
        if problematic:
            worst = problematic[0]
            recommendations.append(
                f"Watch Out: {worst['feature'].capitalize()} shows only {worst['positive_pct']}% satisfaction. "
                "Verify this aspect carefully before purchase."
            )
        else:
            recommendations.append("Check verified purchase reviews and recent feedback to get the most current product insights.")
    else:
        recommendations.append("Compare prices across platforms and wait for sales if budget is a primary concern.")
    
    # Recommendation 5: Consider review volume and recency
    total_reviews = len(df)
    if total_reviews > 100:
        recent_df = df.nlargest(100, 'created_at') if 'created_at' in df.columns else df.tail(100)
        recent_sentiment = _sentiment_counts(recent_df["sentiment"].tolist())
        recent_positive_pct = _percentage(recent_sentiment["Positive"], len(recent_df))
        recommendations.append(
            f"Recent Trends: Latest reviews show {recent_positive_pct}% positive sentiment. "
            "Consider recent feedback as it reflects current product quality."
        )
    else:
        recommendations.append(
            f"Limited Data: Only {total_reviews} reviews available. Cross-reference with other sources for a complete picture."
        )
    
    # Ensure exactly 5 recommendations
    while len(recommendations) < 5:
        recommendations.append("Always verify warranty, return policy, and after-sales support before making your purchase.")
    
    return recommendations[:5]


def build_buyer_insights(datasets: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
    insights: Dict[str, Any] = {"datasets": {}}
    combined_frames: List[pd.DataFrame] = []

    for name, df in datasets.items():
        if "brand" in df.columns:
            df["brand"] = df["brand"].apply(_canonicalize_brand)
        dataset_insight = _buyer_insight_for_dataset(df)
        insights["datasets"][name] = dataset_insight
        combined_frames.append(df)

    if combined_frames:
        combined = pd.concat(combined_frames, ignore_index=True)
        insights["overall"] = _buyer_insight_for_dataset(combined)

    return insights


def _buyer_dataset_components(df: pd.DataFrame) -> Tuple[Dict[str, Any], List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    total_reviews = len(df)
    sentiment_counts = _sentiment_counts(df["sentiment"].tolist())

    summary = {
        "total_reviews": total_reviews,
        "sentiment_counts": sentiment_counts,
        "positive_pct": _percentage(sentiment_counts["Positive"], total_reviews),
        "neutral_pct": _percentage(sentiment_counts["Neutral"], total_reviews),
        "negative_pct": _percentage(sentiment_counts["Negative"], total_reviews),
        "avg_rating": round(float(df["rating"].mean()), 2) if "rating" in df and not df["rating"].dropna().empty else None,
    }

    feature_totals: Dict[str, Dict[str, int]] = defaultdict(lambda: {s: 0 for s in SENTIMENTS})
    for feature_map in _safe_iter_feature_maps(df["feature_sentiments"]):
        for feature, sentiment in feature_map.items():
            if sentiment in SENTIMENTS:
                feature_totals[feature][sentiment] += 1

    feature_tiles: List[Dict[str, Any]] = []
    for feature, counts in feature_totals.items():
        total = sum(counts.values())
        feature_tiles.append(
            {
                "feature": feature,
                "counts": counts,
                "total": total,
                "positive_pct": _percentage(counts["Positive"], total),
            }
        )
    feature_tiles.sort(key=lambda item: item["total"], reverse=True)

    trend: List[Dict[str, Any]] = []
    if "created_at" in df.columns:
        timeline = df.dropna(subset=["created_at"]).copy()
        if not timeline.empty:
            timeline["period"] = timeline["created_at"].dt.to_period("M").dt.to_timestamp()
            grouped = timeline.groupby("period")
            for period, group in grouped:
                counts = _sentiment_counts(group["sentiment"].tolist())
                trend.append(
                    {
                        "period": period.isoformat(),
                        "total": int(len(group)),
                        "positive": counts["Positive"],
                        "neutral": counts["Neutral"],
                        "negative": counts["Negative"],
                    }
                )
            trend.sort(key=lambda item: item["period"])

    top_models = _top_models(df)
    top_positive_reviews = _top_reviews(df, target="Positive", limit=3)
    top_negative_reviews = _top_reviews(df, target="Negative", limit=3)

    return summary, feature_tiles, trend, top_models, top_positive_reviews, top_negative_reviews


def _brand_segment_from_df(df: pd.DataFrame) -> Dict[str, Any]:
    summary, feature_tiles, trend, top_models, top_positive_reviews, top_negative_reviews = _buyer_dataset_components(df)
    return {
        "summary": summary,
        "feature_tiles": feature_tiles,
        "trend": trend,
        "top_models": top_models,
        "top_reviews": {
            "positive": top_positive_reviews,
            "negative": top_negative_reviews,
        },
    }


def _buyer_insight_for_dataset(df: pd.DataFrame) -> Dict[str, Any]:
    (
        summary,
        feature_tiles,
        trend,
        top_models,
        top_positive_reviews,
        top_negative_reviews,
    ) = _buyer_dataset_components(df)
    # Brand-level analysis
    brand_analysis = _analyze_by_brand(df)
    
    # Model-level analysis
    model_analysis = _analyze_by_model(df)
    
    brand_segments: Dict[str, Any] = {}
    grouped_by_brand = df.groupby("brand")
    for brand, brand_df in grouped_by_brand:
        if brand == "Unknown" or brand_df.empty:
            continue
        brand_segments[brand] = _brand_segment_from_df(brand_df)
    
    # Generate buyer recommendations
    buyer_recommendations = _generate_buyer_recommendations(df, top_models, feature_tiles)

    return {
        "summary": summary,
        "feature_tiles": feature_tiles,
        "trend": trend,
        "top_models": top_models,
        "brand_analysis": brand_analysis,
        "model_analysis": model_analysis,
        "top_reviews": {
            "positive": top_positive_reviews,
            "negative": top_negative_reviews,
        },
        "recommendations": buyer_recommendations,
        "brand_segments": brand_segments,
    }


def build_supplier_insights(datasets: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
    insights: Dict[str, Any] = {"datasets": {}}
    combined_frames: List[pd.DataFrame] = []
    for name, df in datasets.items():
        if "brand" in df.columns:
            df["brand"] = df["brand"].apply(_canonicalize_brand)
        dataset_insight = _supplier_insight_for_dataset(df)
        insights["datasets"][name] = dataset_insight
        combined_frames.append(df)
    if combined_frames:
        combined = pd.concat(combined_frames, ignore_index=True)
        insights["overall"] = _supplier_insight_for_dataset(combined)
    return insights


def _supplier_insight_for_dataset(df: pd.DataFrame) -> Dict[str, Any]:
    sentiment_by_brand = []
    model_breakdown: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    feature_heatmap: Dict[str, Dict[str, Dict[str, int]]] = defaultdict(lambda: defaultdict(lambda: {s: 0 for s in SENTIMENTS}))
    complaint_volume: Dict[str, int] = defaultdict(int)
    brand_insights: Dict[str, Any] = {}

    grouped = df.groupby("brand")
    for brand, brand_df in grouped:
        total = len(brand_df)
        sentiments = _sentiment_counts(brand_df["sentiment"].tolist())
        avg_rating = float(brand_df["rating"].mean()) if "rating" in brand_df and not brand_df["rating"].dropna().empty else None
        
        # Calculate brand health score
        positive_ratio = sentiments["Positive"] / total if total else 0.0
        negative_ratio = sentiments["Negative"] / total if total else 0.0
        rating_score = ((avg_rating - 1) / 4) if avg_rating else 0.5
        health_score = (0.4 * positive_ratio) + (0.4 * rating_score) - (0.2 * negative_ratio)
        
        sentiment_by_brand.append(
            {
                "brand": brand,
                "total_reviews": total,
                "sentiments": sentiments,
                "avg_rating": round(avg_rating, 2) if avg_rating else None,
                "positive_pct": _percentage(sentiments["Positive"], total),
                "negative_pct": _percentage(sentiments["Negative"], total),
                "health_score": round(health_score * 100, 2),
            }
        )

        # Brand-level regional distribution
        brand_region_distribution = []
        if "country" in brand_df.columns:
            brand_country_grouped = brand_df.groupby("country")
            for country, country_df in brand_country_grouped:
                region_sentiments = _sentiment_counts(country_df["sentiment"].tolist())
                brand_region_distribution.append(
                    {
                        "country": country,
                        "total_reviews": len(country_df),
                        "sentiments": region_sentiments,
                    }
                )
            brand_region_distribution.sort(key=lambda item: item["total_reviews"], reverse=True)

        # Brand-level demographics
        brand_demographics = []
        if "age" in brand_df.columns and not brand_df["age"].dropna().empty:
            brand_demo_df = brand_df.dropna(subset=["age"]).copy()
            brand_demo_df["age"] = pd.to_numeric(brand_demo_df["age"], errors="coerce")
            brand_demo_df = brand_demo_df.dropna(subset=["age"])
            if not brand_demo_df.empty:
                bins = [0, 18, 25, 35, 45, 55, 120]
                labels = ["<18", "18-24", "25-34", "35-44", "45-54", "55+"]
                brand_demo_df["age_group"] = pd.cut(brand_demo_df["age"], bins=bins, labels=labels, right=False)
                brand_demo_grouped = brand_demo_df.groupby("age_group")
                for age_group, group in brand_demo_grouped:
                    if pd.isna(age_group):
                        continue
                    demo_sentiments = _sentiment_counts(group["sentiment"].tolist())
                    brand_demographics.append(
                        {
                            "age_group": str(age_group),
                            "total_reviews": len(group),
                            "sentiments": demo_sentiments,
                            "avg_rating": round(float(group["rating"].mean()), 2)
                            if "rating" in group and not group["rating"].dropna().empty
                            else None,
                        }
                    )
                brand_demographics.sort(key=lambda item: item["total_reviews"], reverse=True)

        brand_summary = {
            "brand": brand,
            "total_reviews": total,
            "sentiments": dict(sentiments),
            "avg_rating": round(avg_rating, 2) if avg_rating else None,
            "positive_pct": _percentage(sentiments["Positive"], total),
            "negative_pct": _percentage(sentiments["Negative"], total),
            "health_score": round(health_score * 100, 2),
        }

        brand_insights[brand] = {
            "summary": brand_summary,
            "regional_distribution": brand_region_distribution,
            "demographics": brand_demographics,
            "feature_sentiments": {},
            "complaint_volume": [],
        }

        model_grouped = brand_df.groupby("model")
        for model, model_df in model_grouped:
            model_sentiments = _sentiment_counts(model_df["sentiment"].tolist())
            model_avg_rating = float(model_df["rating"].mean()) if "rating" in model_df and not model_df["rating"].dropna().empty else None
            
            # Feature performance for this model
            model_features: Dict[str, Dict[str, int]] = defaultdict(lambda: {s: 0 for s in SENTIMENTS})
            for feature_map in _safe_iter_feature_maps(model_df["feature_sentiments"]):
                for feature, sentiment in feature_map.items():
                    if sentiment in SENTIMENTS:
                        model_features[feature][sentiment] += 1
            
            model_breakdown[brand].append(
                {
                    "model": model,
                    "total_reviews": len(model_df),
                    "sentiments": model_sentiments,
                    "avg_rating": round(model_avg_rating, 2) if model_avg_rating else None,
                    "positive_pct": _percentage(model_sentiments["Positive"], len(model_df)),
                    "negative_pct": _percentage(model_sentiments["Negative"], len(model_df)),
                    "feature_performance": dict(model_features),
                }
            )

        for feature_map in _safe_iter_feature_maps(brand_df["feature_sentiments"]):
            for feature, sentiment in feature_map.items():
                if sentiment in SENTIMENTS:
                    feature_heatmap[brand][feature][sentiment] += 1
                    if sentiment == "Negative":
                        complaint_volume[feature] += 1
                if brand in brand_insights:
                    brand_feature_map = brand_insights[brand].setdefault("feature_sentiments", {})
                    if feature not in brand_feature_map:
                        brand_feature_map[feature] = {s: 0 for s in SENTIMENTS}
                    brand_feature_map[feature][sentiment] += 1

    for brand in model_breakdown:
        model_breakdown[brand].sort(key=lambda item: (item["sentiments"]["Negative"], -item["total_reviews"]), reverse=False)

    for brand, features in feature_heatmap.items():
        brand_complaints = [
            {"feature": feature, "complaints": counts["Negative"]}
            for feature, counts in features.items()
        ]
        brand_complaints.sort(key=lambda item: item["complaints"], reverse=True)
        if brand in brand_insights:
            brand_insights[brand]["complaint_volume"] = brand_complaints
            # Ensure feature sentiments align with heatmap entries
            brand_insights[brand]["feature_sentiments"] = {
                feature: dict(counts) for feature, counts in features.items()
            }
        else:
            brand_insights[brand] = {
                "summary": None,
                "regional_distribution": [],
                "demographics": [],
                "feature_sentiments": {feature: dict(counts) for feature, counts in features.items()},
                "complaint_volume": brand_complaints,
            }

    complaint_list = [
        {"feature": feature, "complaints": count}
        for feature, count in sorted(complaint_volume.items(), key=lambda item: item[1], reverse=True)
    ]

    regional_distribution = []
    if "country" in df.columns:
        country_grouped = df.groupby("country")
        for country, country_df in country_grouped:
            sentiments = _sentiment_counts(country_df["sentiment"].tolist())
            regional_distribution.append(
                {
                    "country": country,
                    "total_reviews": len(country_df),
                    "sentiments": sentiments,
                }
            )
        regional_distribution.sort(key=lambda item: item["total_reviews"], reverse=True)

    demographics = []
    if "age" in df.columns and not df["age"].dropna().empty:
        demo_df = df.dropna(subset=["age"]).copy()
        demo_df["age"] = pd.to_numeric(demo_df["age"], errors="coerce")
        demo_df = demo_df.dropna(subset=["age"])
        if not demo_df.empty:
            bins = [0, 18, 25, 35, 45, 55, 120]
            labels = ["<18", "18-24", "25-34", "35-44", "45-54", "55+"]
            demo_df["age_group"] = pd.cut(demo_df["age"], bins=bins, labels=labels, right=False)
            demo_grouped = demo_df.groupby("age_group")
            for age_group, group in demo_grouped:
                if pd.isna(age_group):
                    continue
                sentiments = _sentiment_counts(group["sentiment"].tolist())
                demographics.append(
                    {
                        "age_group": str(age_group),
                        "total_reviews": len(group),
                        "sentiments": sentiments,
                        "avg_rating": round(float(group["rating"].mean()), 2) if "rating" in group and not group["rating"].dropna().empty else None,
                    }
                )
            demographics.sort(key=lambda item: item["total_reviews"], reverse=True)

    top_negative_reviews = _top_reviews(df, target="Negative", limit=5)

    # Generate supplier recommendations (exactly 5)
    supplier_recommendations = _generate_supplier_recommendations(sentiment_by_brand, model_breakdown, complaint_list, df)

    sentiment_by_brand.sort(key=lambda item: item["health_score"], reverse=True)

    return {
        "brand_overview": sentiment_by_brand,
        "model_breakdown": model_breakdown,
        "feature_heatmap": feature_heatmap,
        "complaint_volume": complaint_list,
        "regional_distribution": regional_distribution,
        "demographics": demographics,
        "top_reviews": top_negative_reviews,
        "recommendations": supplier_recommendations,
        "brand_insights": brand_insights,
    }


def _generate_recommendations(brands: List[Dict[str, Any]], complaints: List[Dict[str, Any]]) -> List[str]:
    recommendations: List[str] = []
    if brands:
        lagging = [b for b in brands if b["sentiments"]["Negative"] > b["sentiments"]["Positive"]]
        for entry in lagging[:3]:
            recommendations.append(
                f"{entry['brand']} shows higher negative sentiment than positive. Focus on root-cause analysis for its portfolio."
            )
    if complaints:
        top_issue = complaints[0]
        recommendations.append(
            f"{top_issue['feature'].capitalize()} issues are reported most frequently. Prioritize cross-team fixes in upcoming sprints."
        )
    if not recommendations:
        recommendations.append("Sentiment is largely positive—continue investing in features that delight customers.")
    return recommendations


def _generate_supplier_recommendations(
    brands: List[Dict[str, Any]], 
    model_breakdown: Dict[str, List[Dict[str, Any]]], 
    complaints: List[Dict[str, Any]],
    df: pd.DataFrame
) -> List[str]:
    """Generate exactly 5 actionable recommendations for suppliers/manufacturers."""
    recommendations: List[str] = []
    
    # Recommendation 1: Address top complaint
    if complaints:
        top_issue = complaints[0]
        recommendations.append(
            f"Critical Priority: {top_issue['feature'].capitalize()} issues reported in {top_issue['complaints']} reviews. "
            "Conduct immediate engineering review and quality control audit."
        )
    else:
        recommendations.append("Continue current quality standards while monitoring emerging customer feedback trends.")
    
    # Recommendation 2: Focus on underperforming brands/models
    if brands:
        weak_brands = [b for b in brands if b.get("health_score", 0) < 50]
        if weak_brands:
            worst_brand = weak_brands[0]
            recommendations.append(
                f"Portfolio Alert: {worst_brand['brand']} has {worst_brand['negative_pct']}% negative sentiment. "
                "Investigate manufacturing processes and component sourcing for this line."
            )
        else:
            recommendations.append("All brands show strong performance. Maintain current production standards across the portfolio.")
    else:
        recommendations.append("Expand review monitoring to capture more market feedback.")
    
    # Recommendation 3: Model-specific improvements
    if model_breakdown:
        all_models = []
        for brand_models in model_breakdown.values():
            all_models.extend(brand_models)
        
        problematic_models = [m for m in all_models if m.get("negative_pct", 0) > 40]
        if problematic_models:
            problematic_models.sort(key=lambda x: x.get("negative_pct", 0), reverse=True)
            worst_model = problematic_models[0]
            recommendations.append(
                f"Model Action Required: {worst_model.get('model', 'Unknown')} shows {worst_model.get('negative_pct', 0)}% negative feedback. "
                "Consider recalls, firmware updates, or production line modifications."
            )
        else:
            recommendations.append("Individual models performing well. Focus on incremental feature enhancements.")
    else:
        recommendations.append("Develop model-specific tracking to identify improvement opportunities.")
    
    # Recommendation 4: Feature development priorities
    if complaints and len(complaints) > 1:
        top_3_issues = complaints[:3]
        issue_names = ", ".join([c["feature"].capitalize() for c in top_3_issues])
        recommendations.append(
            f"R&D Focus Areas: Prioritize improvements in {issue_names}. "
            "Allocate resources to address these pain points in next product cycle."
        )
    else:
        recommendations.append("Invest in innovative features that differentiate from competitors based on positive feedback trends.")
    
    # Recommendation 5: Market and demographic insights
    total_reviews = len(df)
    if total_reviews > 50:
        overall_sentiments = _sentiment_counts(df["sentiment"].tolist())
        positive_pct = _percentage(overall_sentiments["Positive"], total_reviews)
        
        if positive_pct > 60:
            recommendations.append(
                f"Market Position: {positive_pct}% positive sentiment across {total_reviews} reviews indicates strong market acceptance. "
                "Leverage this in marketing and consider premium pricing strategies."
            )
        elif positive_pct < 40:
            recommendations.append(
                f"Urgent Action: Only {positive_pct}% positive sentiment. Launch comprehensive customer satisfaction initiative "
                "and consider temporary quality assurance freeze on new releases."
            )
        else:
            recommendations.append(
                "Mixed sentiment detected. Conduct detailed customer interviews to understand specific pain points and expectations."
            )
    else:
        recommendations.append(
            "Expand feedback collection channels to gather more comprehensive market intelligence."
        )
    
    # Ensure exactly 5 recommendations
    while len(recommendations) < 5:
        recommendations.append("Implement continuous monitoring dashboard to track sentiment trends in real-time.")
    
    return recommendations[:5]


def build_filter_options(datasets: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
    filter_map: Dict[str, Any] = {"datasets": {}}
    combined_frames: List[pd.DataFrame] = []
    for name, df in datasets.items():
        if "brand" in df.columns:
            df["brand"] = df["brand"].apply(_canonicalize_brand)
        filter_map["datasets"][name] = _filters_for_dataset(df)
        combined_frames.append(df)
    if combined_frames:
        combined = pd.concat(combined_frames, ignore_index=True)
        filter_map["overall"] = _filters_for_dataset(combined)
    filter_map["sentiments"] = SENTIMENTS
    return filter_map


def build_model_recommender(datasets: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
    ecommerce = datasets.get("ecommerce")
    base_response: Dict[str, Any] = {
        "brands": [],
        "models": [],
        "currency": {"usd_to_inr": USD_TO_INR},
        "summary": {
            "brand_count": 0,
            "model_count": 0,
            "min_price_usd": None,
            "max_price_usd": None,
        },
    }

    if ecommerce is None or ecommerce.empty:
        return base_response

    df = ecommerce.copy()
    if "brand" not in df.columns or "model" not in df.columns:
        return base_response

    df["brand"] = df["brand"].apply(_canonicalize_brand)
    df = df[df["brand"].notna() & (df["brand"] != "Unknown")]
    df = df[df["model"].notna() & (df["model"] != "Unknown")]

    numeric_columns = [
        "rating",
        "price_usd",
        "battery_life_rating",
        "camera_rating",
        "display_rating",
        "performance_rating",
    ]

    for column in numeric_columns:
        if column not in df.columns:
            df[column] = pd.NA
        df[column] = pd.to_numeric(df[column], errors="coerce")

    if df.empty:
        return base_response

    grouped = (
        df.groupby(["brand", "model"])
        .agg(
            avg_rating=("rating", "mean"),
            avg_price_usd=("price_usd", "mean"),
            avg_battery_rating=("battery_life_rating", "mean"),
            avg_camera_rating=("camera_rating", "mean"),
            avg_display_rating=("display_rating", "mean"),
            avg_performance_rating=("performance_rating", "mean"),
            review_count=("rating", "count"),
        )
        .reset_index()
    )

    if grouped.empty:
        return base_response

    grouped["avg_price_inr"] = grouped["avg_price_usd"] * USD_TO_INR

    def _round(value: Any) -> Optional[float]:
        if value is None or (isinstance(value, float) and math.isnan(value)):
            return None
        if pd.isna(value):
            return None
        return round(float(value), 2)

    brand_models: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    all_models: List[Dict[str, Any]] = []

    for _, row in grouped.iterrows():
        entry = {
            "brand": row["brand"],
            "model": row["model"],
            "avg_rating": _round(row["avg_rating"]),
            "avg_price_usd": _round(row["avg_price_usd"]),
            "avg_price_inr": _round(row["avg_price_inr"]),
            "avg_battery_rating": _round(row["avg_battery_rating"]),
            "avg_camera_rating": _round(row["avg_camera_rating"]),
            "avg_display_rating": _round(row["avg_display_rating"]),
            "avg_performance_rating": _round(row["avg_performance_rating"]),
            "review_count": int(row["review_count"]),
        }
        brand_models[row["brand"]].append(entry)
        all_models.append(entry)

    for models in brand_models.values():
        models.sort(key=lambda item: (item["avg_rating"] or 0.0, -(item["avg_price_usd"] or 0.0)), reverse=True)

    all_models.sort(key=lambda item: (item["avg_rating"] or 0.0, -(item["avg_price_usd"] or 0.0)), reverse=True)

    min_price = grouped["avg_price_usd"].min()
    max_price = grouped["avg_price_usd"].max()

    response = {
        "brands": [
            {"brand": brand, "models": models}
            for brand, models in sorted(brand_models.items(), key=lambda item: item[0])
        ],
        "models": all_models,
        "currency": {"usd_to_inr": USD_TO_INR},
        "summary": {
            "brand_count": len(brand_models),
            "model_count": len(all_models),
            "min_price_usd": _round(min_price),
            "max_price_usd": _round(max_price),
        },
    }

    return response


def _filters_for_dataset(df: pd.DataFrame) -> Dict[str, List[str]]:
    brands = sorted({
        canonical
        for item in df["brand"].dropna().tolist()
        if item
        for canonical in [_canonicalize_brand(item)]
        if canonical and canonical != "Unknown"
    })
    models = sorted([item for item in df["model"].dropna().unique().tolist() if item and item != "Unknown"])
    sources = sorted([item for item in df["source"].dropna().unique().tolist() if item])
    countries = sorted([item for item in df["country"].dropna().unique().tolist() if item and item != "Unknown"])
    features = sorted({feature for feature_map in _safe_iter_feature_maps(df["feature_sentiments"]) for feature in feature_map})
    return {
        "brands": brands,
        "models": models,
        "sources": sources,
        "countries": countries,
        "features": features,
    }


def query_reviews(datasets: Dict[str, pd.DataFrame], filters: ReviewFilters) -> Dict[str, Any]:
    frames: List[pd.DataFrame] = []
    if filters.dataset and filters.dataset in datasets:
        frames.append(datasets[filters.dataset])
    elif not filters.dataset:
        frames.extend(datasets.values())
    else:
        return {"reviews": [], "total": 0, "page": filters.page, "page_size": filters.page_size, "total_pages": 0}

    if not frames:
        return {"reviews": [], "total": 0, "page": filters.page, "page_size": filters.page_size, "total_pages": 0}

    df = pd.concat(frames, ignore_index=True)

    if filters.brand:
        df = df[df["brand"] == filters.brand]
    if filters.model:
        df = df[df["model"] == filters.model]
    if filters.sentiment and filters.sentiment in SENTIMENTS:
        df = df[df["sentiment"] == filters.sentiment]
    if filters.source:
        df = df[df["source"] == filters.source]
    if filters.country:
        df = df[df["country"] == filters.country]
    if filters.min_rating is not None:
        df = df[df["rating"] >= filters.min_rating]
    if filters.max_rating is not None:
        df = df[df["rating"] <= filters.max_rating]
    if filters.feature:
        df = df[df["feature_sentiments"].apply(lambda x: isinstance(x, dict) and filters.feature in x)]
    if filters.search:
        query = filters.search.lower()
        df = df[df["text"].str.contains(query, case=False, na=False)]
    if filters.start_date is not None:
        df = df[df["created_at"] >= filters.start_date]
    if filters.end_date is not None:
        df = df[df["created_at"] <= filters.end_date]

    df = df.sort_values(by="created_at", ascending=False, na_position="last")
    total = len(df)
    page_size = max(1, min(filters.page_size, 100))
    total_pages = math.ceil(total / page_size) if total else 0
    start = (max(1, filters.page) - 1) * page_size
    end = start + page_size

    paginated = df.iloc[start:end]
    records = [_prepare_review_record(row) for _, row in paginated.iterrows()]

    return {
        "reviews": records,
        "total": total,
        "page": filters.page,
        "page_size": page_size,
        "total_pages": total_pages,
    }
