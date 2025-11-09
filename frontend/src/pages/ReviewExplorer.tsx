import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useFilters } from "../hooks/useFilters";
import { useReviewExplorer, type ReviewQueryParams } from "../hooks/useReviewExplorer";
import type { FilterOptions, ReviewRecord } from "../types/analytics";
import { SentimentBadge } from "../components/SentimentBadge";

function ReviewExplorer() {
  const { status: filterStatus, data: filterData } = useFilters();
  const { status, data, error, params, updateParams } = useReviewExplorer();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.get("search") ?? "");

  const datasetFromUrl = searchParams.get("dataset") ?? undefined;
  const searchFromUrl = searchParams.get("search") ?? undefined;

  useEffect(() => {
    if (datasetFromUrl && datasetFromUrl !== params.dataset) {
      updateParams({ dataset: datasetFromUrl });
    }
  }, [datasetFromUrl, params.dataset, updateParams]);

  useEffect(() => {
    if (searchFromUrl !== params.search) {
      updateParams({ search: searchFromUrl });
    }
  }, [searchFromUrl, params.search, updateParams]);

  const datasetOptions = useMemo(() => Object.keys(filterData?.datasets ?? {}), [filterData]);
  const activeDataset = params.dataset && datasetOptions.includes(params.dataset) ? params.dataset : undefined;
  const activeFilterOptions: FilterOptions | undefined = useMemo(() => {
    if (!filterData) return undefined;
    if (activeDataset) {
      return filterData.datasets?.[activeDataset];
    }
    return filterData.overall;
  }, [filterData, activeDataset]);

  const handleSelectChange = (key: "dataset" | "brand" | "model" | "sentiment" | "feature" | "source" | "country") =>
    (event: ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value || undefined;
      const nextParams: Partial<ReviewQueryParams> =
        key === "dataset"
          ? {
              dataset: value,
              brand: undefined,
              model: undefined,
              feature: undefined,
              source: undefined,
              country: undefined,
            }
          : { [key]: value };
      updateParams(nextParams);

      const next = new URLSearchParams(location.search);
      if (key === "dataset") {
        if (value) {
          next.set("dataset", String(value));
        } else {
          next.delete("dataset");
        }
      }
      if (key === "sentiment") {
        if (value) {
          next.set("sentiment", String(value));
        } else {
          next.delete("sentiment");
        }
      }
      setSearchParams(next, { replace: true });
    };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateParams({ search: searchTerm || undefined });
    const next = new URLSearchParams(location.search);
    if (searchTerm) {
      next.set("search", searchTerm);
    } else {
      next.delete("search");
    }
    setSearchParams(next, { replace: true });
  };

  const handleClearFilters = () => {
    updateParams({
      dataset: undefined,
      brand: undefined,
      model: undefined,
      sentiment: undefined,
      feature: undefined,
      source: undefined,
      country: undefined,
      search: undefined,
    });
    setSearchTerm("");
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const handlePageChange = (direction: "prev" | "next") => {
    if (!data) return;
    if (direction === "prev" && (params.page ?? 1) > 1) {
      updateParams({ page: (params.page ?? 1) - 1 });
    }
    if (direction === "next" && data.page < data.total_pages) {
      updateParams({ page: (params.page ?? 1) + 1 });
    }
  };

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="text-3xl font-semibold text-slate-900">Review Explorer</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Investigate verbatim feedback across every stream. Filter by dataset, sentiment, or feature to hear the story behind each score.
        </p>
      </header>

      <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-glass">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
          </div>
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Clear All
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="mb-6">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search reviews..."
              className="w-full rounded-lg border border-slate-200 bg-white/90 pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700 mb-2" htmlFor="sentiment">
              Sentiment
            </label>
            <select
              id="sentiment"
              value={params.sentiment ?? ""}
              onChange={handleSelectChange("sentiment")}
              className="rounded-lg border border-slate-200 bg-white/90 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">All Sentiments</option>
              {(filterData?.sentiments ?? []).map((sentiment) => (
                <option key={sentiment} value={sentiment}>
                  {sentiment}
                </option>
              ))}
            </select>
          </div>

          <FilterSelect
            label="Brand"
            value={params.brand ?? ""}
            options={activeFilterOptions?.brands ?? []}
            onChange={handleSelectChange("brand")}
            placeholder="All Brands"
          />

          <FilterSelect
            label="Source"
            value={params.source ?? ""}
            options={activeFilterOptions?.sources ?? []}
            onChange={handleSelectChange("source")}
            placeholder="All Sources"
          />

          <FilterSelect
            label="Country"
            value={params.country ?? ""}
            options={activeFilterOptions?.countries ?? []}
            onChange={handleSelectChange("country")}
            placeholder="All Countries"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-glass">
        {status === "loading" && <p className="text-sm text-slate-500">Loading reviews…</p>}
        {status === "error" && <p className="text-sm text-rose-500">{error ?? "Unable to load reviews."}</p>}
        {status === "success" && data && (
          <div className="space-y-6">
            {filterStatus === "loading" && <p className="text-xs text-slate-400">Loading filter options…</p>}
            <div className="flex items-center justify-between text-xs text-slate-500">
              {(() => {
                const page = params.page ?? 1;
                const pageSize = params.page_size ?? 20;
                const start = data.reviews.length ? (page - 1) * pageSize + 1 : 0;
                const end = (page - 1) * pageSize + data.reviews.length;
                return (
                  <span>
                    Showing {start.toLocaleString()}-{end.toLocaleString()} of {data.total.toLocaleString()} reviews
                  </span>
                );
              })()}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange("prev")}
                  className="rounded-full border border-white/60 px-4 py-2 text-xs font-semibold disabled:opacity-50"
                  disabled={(params.page ?? 1) <= 1}
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange("next")}
                  className="rounded-full border border-white/60 px-4 py-2 text-xs font-semibold disabled:opacity-50"
                  disabled={data.page >= data.total_pages}
                >
                  Next
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {data.reviews.map((review: ReviewRecord) => (
                <article key={review.review_id} className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {review.brand} {review.model}
                      </p>
                      <p className="text-xs text-slate-500">
                        {review.source} · {review.dataset?.toUpperCase()} · {review.date ?? review.created_at?.slice(0, 10)}
                      </p>
                    </div>
                    <SentimentBadge sentiment={review.sentiment} />
                  </div>
                  <p className="mt-4 text-sm text-slate-700 leading-6">{review.text}</p>
                  {review.feature_sentiments && Object.keys(review.feature_sentiments).length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {Object.entries(review.feature_sentiments).map(([feature, sentiment]) => (
                        <SentimentBadge key={feature} sentiment={sentiment} label={`${feature} · ${sentiment}`} />
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
}

function FilterSelect({ label, value, options, onChange, placeholder = "Any" }: FilterSelectProps) {
  const id = `filter-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium text-slate-700 mb-2" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        className="rounded-lg border border-slate-200 bg-white/90 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export default ReviewExplorer;
