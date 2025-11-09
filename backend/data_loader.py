import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
from textblob import TextBlob

logger = logging.getLogger(__name__)

_TOKEN_PATTERN = re.compile(r"[a-z0-9]+")


def _is_missing(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, float) and pd.isna(value):
        return True
    if isinstance(value, str) and not value.strip():
        return True
    return False


def _to_iso_timestamp(value: Any) -> Optional[str]:
    if _is_missing(value):
        return None
    try:
        ts = pd.to_datetime(value, utc=True, errors="coerce")
        if pd.isna(ts):
            return None
        return ts.isoformat()
    except Exception:
        return None


def _canonicalize_brand(value: Any) -> str:
    if _is_missing(value):
        return "Unknown"
    name = str(value).strip()
    if not name:
        return "Unknown"

    normalized = name.lower()
    tokens = _TOKEN_PATTERN.findall(normalized)
    token_set = set(tokens)

    # Direct canonical replacements ensure known sub-brands map to parent brand
    direct_map = {
        "apple": "Apple",
        "apple iphone": "Apple",
        "iphone": "Apple",
        "iphone 15": "Apple",
        "galaxy": "Samsung",
        "samsung galaxy": "Samsung",
        "samsung s24": "Samsung",
        "pixel": "Google",
        "google": "Google",
        "oneplus": "OnePlus",
        "oneplus 12": "OnePlus",
        "oppo": "Oppo",
        "vivo": "Vivo",
        "lg": "LG",
        "htc": "HTC",
        "tecno pova": "Tecno",
        "motorola": "Motorola",
        "nokia": "Nokia",
        "sony": "Sony",
        "realme": "Realme",
        "iqoo": "iQOO",
        "iqoo neo": "iQOO",
        "infinix note": "Infinix",
        "nothing phone (2)": "Nothing Phone",
    }

    if normalized in direct_map:
        return direct_map[normalized]

    token_map = {
        "apple": "Apple",
        "iphone": "Apple",
        "samsung": "Samsung",
        "galaxy": "Samsung",
        "pixel": "Google",
        "google": "Google",
        "oneplus": "OnePlus",
        "oppo": "Oppo",
        "vivo": "Vivo",
        "motorola": "Motorola",
        "moto": "Motorola",
        "nokia": "Nokia",
        "sony": "Sony",
        "xiaomi": "Xiaomi",
        "redmi": "Xiaomi",
        "poco": "Poco",
        "tecno": "Tecno",
        "infinix": "Infinix",
        "iqoo": "iQOO",
        "asus": "Asus",
        "lenovo": "Lenovo",
        "huawei": "Huawei",
        "honor": "Honor",
        "realme": "Realme",
        "htc": "HTC",
    }

    for token in tokens:
        if token in token_map:
            return token_map[token]

    if normalized.startswith("iphone"):
        return "Apple"
    if "samsung" in normalized or normalized.startswith("galaxy"):
        return "Samsung"
    if "apple" in normalized:
        return "Apple"
    if "pixel" in normalized:
        return "Google"
    if "google" in normalized:
        return "Google"
    if "oneplus" in normalized:
        return "OnePlus"
    if normalized.startswith("redmi") or "redmi" in normalized:
        return "Xiaomi"
    if "xiaomi" in normalized:
        return "Xiaomi"
    if normalized.startswith("poco"):
        return "Poco"
    if "tecno" in normalized:
        return "Tecno"
    if "infinix" in normalized:
        return "Infinix"
    if "nothing phone" in normalized or ("nothing" in token_set and "phone" in token_set):
        return "Nothing Phone"
    if normalized.startswith("moto") or "motorola" in normalized:
        return "Motorola"
    if normalized.startswith("lg") or " lg " in f" {normalized} ":
        return "LG"
    if normalized.startswith("htc"):
        return "HTC"
    if "asus" in normalized:
        return "Asus"
    if "lenovo" in normalized:
        return "Lenovo"
    if "huawei" in normalized:
        return "Huawei"
    if "honor" in normalized:
        return "Honor"
    if "realme" in normalized:
        return "Realme"
    if "iqoo" in normalized:
        return "iQOO"
    if "nokia" in normalized:
        return "Nokia"
    if "sony" in normalized:
        return "Sony"

    # Default to title case while preserving acronyms
    title = name.title()
    title_map = {
        "Lg": "LG",
        "Htc": "HTC",
        "Iqoo": "iQOO",
        "Iqoo 11": "iQOO",
        "Iqoo 12": "iQOO",
        "Iqoo Z7": "iQOO",
        "Moto": "Motorola",
    }
    return title_map.get(title, title)


class SentimentAnalyzer:
    """Simple TextBlob-powered sentiment and aspect extractor."""

    def __init__(self) -> None:
        self.feature_keywords = {
            "battery": ["battery", "charge", "charging", "power", "battery life", "mah"],
            "camera": ["camera", "photo", "picture", "selfie", "video", "lens", "megapixel", "mp"],
            "heating": ["heat", "heating", "hot", "warm", "temperature", "overheat"],
            "performance": ["performance", "speed", "fast", "slow", "lag", "smooth", "processor", "ram"],
            "display": ["display", "screen", "brightness", "resolution", "amoled", "lcd"],
            "price": ["price", "cost", "expensive", "cheap", "value", "money", "worth"],
            "design": ["design", "look", "build", "quality", "premium", "elegant"],
            "ui": ["ui", "interface", "software", "update", "android", "ios"],
        }

    def analyze_sentiment(self, text: Any) -> tuple[str, float]:
        if _is_missing(text):
            return "Neutral", 0.0
        blob = TextBlob(str(text))
        polarity = float(blob.sentiment.polarity)
        if polarity > 0.1:
            return "Positive", polarity
        if polarity < -0.1:
            return "Negative", polarity
        return "Neutral", polarity

    def extract_feature_sentiment(self, text: Any) -> Dict[str, str]:
        if _is_missing(text):
            return {}
        text_lower = str(text).lower()
        feature_sentiments: Dict[str, str] = {}
        for feature, keywords in self.feature_keywords.items():
            feature_mentions: List[float] = []
            for keyword in keywords:
                if keyword not in text_lower:
                    continue
                sentences = str(text).split(".")
                for sentence in sentences:
                    if keyword in sentence.lower():
                        polarity = float(TextBlob(sentence).sentiment.polarity)
                        feature_mentions.append(polarity)
            if not feature_mentions:
                continue
            avg_sentiment = sum(feature_mentions) / len(feature_mentions)
            if avg_sentiment > 0.1:
                feature_sentiments[feature] = "Positive"
            elif avg_sentiment < -0.1:
                feature_sentiments[feature] = "Negative"
            else:
                feature_sentiments[feature] = "Neutral"
        return feature_sentiments

    def extract_brand(self, text: Any) -> str:
        brands = [
            "samsung",
            "apple",
            "iphone",
            "xiaomi",
            "oneplus",
            "google",
            "pixel",
            "realme",
            "oppo",
            "vivo",
            "motorola",
            "nokia",
            "sony",
            "lg",
            "huawei",
            "honor",
            "asus",
            "lenovo",
            "zte",
            "htc",
            "galaxy",
            "redmi",
            "poco",
        ]
        if _is_missing(text):
            return "Unknown"
        text_lower = str(text).lower()
        for brand in brands:
            if brand in text_lower:
                return _canonicalize_brand(brand)
        return "Unknown"


class CSVDataLoader:
    """Loads the three review datasets individually."""

    def __init__(self) -> None:
        self.analyzer = SentimentAnalyzer()
        project_root = Path(__file__).resolve().parent.parent
        self.paths = {
            "twitter": project_root / "twitter_reviews.csv",
            "reddit": project_root / "reddit_reviews.csv.xz",
            "ecommerce": project_root / "e_commerce_reviews.csv",
        }

    def load_all(self) -> Dict[str, pd.DataFrame]:
        datasets: Dict[str, pd.DataFrame] = {}
        for name in ("twitter", "ecommerce", "reddit"):
            path = self.paths.get(name)
            if not path or not path.exists():
                logger.warning("Dataset not found for %s at %s", name, path)
                continue
            process_fn = getattr(self, f"_process_{name}")
            records = process_fn(path)
            if not records:
                logger.warning("No records processed for dataset %s", name)
                continue
            df = pd.DataFrame(records)
            if "brand" in df.columns:
                df["brand"] = df["brand"].apply(_canonicalize_brand)
            df["dataset"] = name
            df["brand"] = df["brand"].fillna("Unknown")
            df["model"] = df["model"].fillna("Unknown")
            df["country"] = df["country"].fillna("Unknown")
            df["source"] = df["source"].fillna("Unknown")
            df["sentiment"] = df["sentiment"].fillna("Neutral")
            df["created_at"] = pd.to_datetime(df["created_at"], utc=True, errors="coerce")
            datasets[name] = df
        if not datasets:
            raise FileNotFoundError("None of the review datasets were found.")
        return datasets

    def _process_twitter(self, path: Path) -> List[Dict[str, Any]]:
        df = pd.read_csv(path)
        text_column = "Tweet " if "Tweet " in df.columns else "Tweet"
        reviews: List[Dict[str, Any]] = []
        for idx, row in df.iterrows():
            text = row.get(text_column, "")
            if _is_missing(text) or len(str(text)) < 10:
                continue
            sentiment, polarity = self.analyzer.analyze_sentiment(text)
            feature_sentiments = self.analyzer.extract_feature_sentiment(text)
            brand = self.analyzer.extract_brand(text)
            created_at = _to_iso_timestamp(row.get("Tweet_Posted_Time (UTC)") or row.get("Tweet_Posted_Time"))
            reviews.append(
                {
                    "review_id": f"twitter_{row.get('ID', idx)}",
                    "source": "Twitter",
                    "text": str(text)[:1000],
                    "sentiment": sentiment,
                    "polarity": polarity,
                    "brand": brand,
                    "model": "Unknown",
                    "feature_sentiments": feature_sentiments,
                    "date": row.get("Tweet_Posted_Time (UTC)") or row.get("Tweet_Posted_Time", ""),
                    "country": "Unknown",
                    "rating": 4.0 if sentiment == "Positive" else 2.0 if sentiment == "Negative" else 3.0,
                    "created_at": created_at or datetime.now(timezone.utc).isoformat(),
                }
            )
        return reviews

    def _process_ecommerce(self, path: Path) -> List[Dict[str, Any]]:
        df = pd.read_csv(path)
        reviews: List[Dict[str, Any]] = []
        for idx, row in df.iterrows():
            text = row.get("review_text", "")
            if _is_missing(text) or len(str(text)) < 5:
                continue
            sentiment = row.get("sentiment", "Neutral")
            if _is_missing(sentiment):
                sentiment, polarity = self.analyzer.analyze_sentiment(text)
            else:
                normalized = str(sentiment).strip().lower()
                polarity = 0.5 if normalized == "positive" else -0.5 if normalized == "negative" else 0.0
                sentiment = normalized.capitalize() if normalized else "Neutral"
            feature_sentiments = {
                "battery": self._rating_to_sentiment(row.get("battery_life_rating")),
                "camera": self._rating_to_sentiment(row.get("camera_rating")),
                "performance": self._rating_to_sentiment(row.get("performance_rating")),
                "design": self._rating_to_sentiment(row.get("design_rating")),
                "display": self._rating_to_sentiment(row.get("display_rating")),
            }
            feature_sentiments = {k: v for k, v in feature_sentiments.items() if v}
            created_at = _to_iso_timestamp(row.get("review_date"))
            source = row.get("source", "E-commerce") or "E-commerce"
            brand = _canonicalize_brand(row.get("brand", "Unknown"))
            model = row.get("model", "Unknown") or "Unknown"
            country = row.get("country", "Unknown") or "Unknown"
            verified_raw = row.get("verified_purchase", False)
            if isinstance(verified_raw, str):
                verified = verified_raw.strip().lower() in {"true", "1", "yes"}
            else:
                verified = bool(verified_raw)
            battery_rating = float(row.get("battery_life_rating")) if not _is_missing(row.get("battery_life_rating")) else None
            camera_rating = float(row.get("camera_rating")) if not _is_missing(row.get("camera_rating")) else None
            performance_rating = float(row.get("performance_rating")) if not _is_missing(row.get("performance_rating")) else None
            display_rating = float(row.get("display_rating")) if not _is_missing(row.get("display_rating")) else None
            design_rating = float(row.get("design_rating")) if not _is_missing(row.get("design_rating")) else None
            reviews.append(
                {
                    "review_id": f"ecommerce_{row.get('review_id', idx)}",
                    "source": source,
                    "text": str(text)[:1000],
                    "sentiment": sentiment,
                    "polarity": polarity,
                    "brand": brand,
                    "model": model,
                    "feature_sentiments": feature_sentiments,
                    "date": row.get("review_date", ""),
                    "country": country,
                    "age": int(row.get("age")) if not _is_missing(row.get("age")) else None,
                    "rating": float(row.get("rating", 3.0)) if not _is_missing(row.get("rating")) else 3.0,
                    "price_usd": float(row.get("price_usd")) if not _is_missing(row.get("price_usd")) else None,
                    "verified": verified,
                    "battery_life_rating": battery_rating,
                    "camera_rating": camera_rating,
                    "performance_rating": performance_rating,
                    "display_rating": display_rating,
                    "design_rating": design_rating,
                    "created_at": created_at or datetime.now(timezone.utc).isoformat(),
                }
            )
        return reviews

    def _process_reddit(self, path: Path) -> List[Dict[str, Any]]:
        df = pd.read_csv(path, on_bad_lines="skip", compression="infer")
        reviews: List[Dict[str, Any]] = []
        for idx, row in df.iterrows():
            text = row.get("text", "")
            if _is_missing(text) or len(str(text)) < 10:
                continue
            compound = float(row.get("compound", 0.0)) if not _is_missing(row.get("compound")) else 0.0
            if compound > 0.1:
                sentiment = "Positive"
            elif compound < -0.1:
                sentiment = "Negative"
            else:
                sentiment = "Neutral"
            feature_sentiments = self.analyzer.extract_feature_sentiment(text)
            brand = _canonicalize_brand(row.get("brand", "Unknown"))
            if _is_missing(brand) or brand == "Unknown":
                brand = self.analyzer.extract_brand(text)
            country = row.get("country", "Unknown") or "Unknown"
            subreddit = row.get("source_subreddit", "")
            created_at = _to_iso_timestamp(row.get("created_utc"))
            reviews.append(
                {
                    "review_id": f"reddit_{row.get('Id', idx)}",
                    "source": "Reddit",
                    "text": str(text)[:1000],
                    "sentiment": sentiment,
                    "polarity": compound,
                    "brand": brand or "Unknown",
                    "model": brand or "Unknown",
                    "feature_sentiments": feature_sentiments,
                    "date": row.get("created_utc", ""),
                    "country": country,
                    "subreddit": subreddit if not _is_missing(subreddit) else "",
                    "rating": 4.0 if sentiment == "Positive" else 2.0 if sentiment == "Negative" else 3.0,
                    "created_at": created_at or datetime.now(timezone.utc).isoformat(),
                }
            )
        return reviews

    def _rating_to_sentiment(self, rating: Any) -> Optional[str]:
        if _is_missing(rating):
            return None
        value = float(rating)
        if value >= 3.5:
            return "Positive"
        if value <= 2.5:
            return "Negative"
        return "Neutral"


def load_datasets() -> Dict[str, pd.DataFrame]:
    loader = CSVDataLoader()
    return loader.load_all()
