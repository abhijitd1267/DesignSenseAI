import logging
from datetime import datetime
from typing import Any, Dict

from flask import Flask, jsonify, request
from flask_cors import CORS

from .analytics import (
    ReviewFilters,
    build_buyer_insights,
    build_filter_options,
    build_model_recommender,
    build_supplier_insights,
    query_reviews,
)
from .data_loader import load_datasets

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

DATASETS: Dict[str, Any] = {}


def preload_datasets() -> None:
    global DATASETS
    try:
        DATASETS = load_datasets()
        logger.info("Datasets loaded successfully: %s", list(DATASETS.keys()))
    except FileNotFoundError as exc:
        logger.error("Dataset loading failed: %s", exc)
        DATASETS = {}


preload_datasets()


@app.route("/api/health", methods=["GET"])
def health_check() -> Any:
    return jsonify({
        "status": "ok" if DATASETS else "degraded",
        "datasets": list(DATASETS.keys()),
    })


@app.route("/api/reload", methods=["POST"])
def reload_datasets() -> Any:
    preload_datasets()
    return jsonify({"status": "reloaded", "datasets": list(DATASETS.keys())})


@app.route("/api/buyer-insights", methods=["GET"])
def buyer_insights() -> Any:
    if not DATASETS:
        return jsonify({"error": "datasets_unavailable"}), 503
    insights = build_buyer_insights(DATASETS)
    return jsonify(insights)


@app.route("/api/supplier-insights", methods=["GET"])
def supplier_insights() -> Any:
    if not DATASETS:
        return jsonify({"error": "datasets_unavailable"}), 503
    insights = build_supplier_insights(DATASETS)
    return jsonify(insights)


@app.route("/api/filters", methods=["GET"])
def filters() -> Any:
    if not DATASETS:
        return jsonify({"error": "datasets_unavailable"}), 503
    filter_map = build_filter_options(DATASETS)
    return jsonify(filter_map)


@app.route("/api/model-advisor", methods=["GET"])
def model_advisor() -> Any:
    if not DATASETS:
        return jsonify({"error": "datasets_unavailable"}), 503
    insights = build_model_recommender(DATASETS)
    return jsonify(insights)


@app.route("/api/reviews", methods=["GET"])
def reviews() -> Any:
    if not DATASETS:
        return jsonify({"error": "datasets_unavailable"}), 503

    filters = ReviewFilters(
        dataset=request.args.get("dataset"),
        brand=request.args.get("brand"),
        model=request.args.get("model"),
        sentiment=request.args.get("sentiment"),
        feature=request.args.get("feature"),
        source=request.args.get("source"),
        country=request.args.get("country"),
        search=request.args.get("search"),
        min_rating=_parse_float(request.args.get("min_rating")),
        max_rating=_parse_float(request.args.get("max_rating")),
        start_date=_parse_date(request.args.get("start_date")),
        end_date=_parse_date(request.args.get("end_date")),
        page=_parse_int(request.args.get("page"), default=1),
        page_size=_parse_int(request.args.get("page_size"), default=20),
    )

    results = query_reviews(DATASETS, filters)
    return jsonify(results)


def _parse_float(value: Any) -> Any:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except ValueError:
        return None


def _parse_int(value: Any, default: int) -> int:
    if value is None or value == "":
        return default
    try:
        parsed = int(value)
        return parsed if parsed > 0 else default
    except ValueError:
        return default


def _parse_date(value: Any) -> Any:
    if value is None or value == "":
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
