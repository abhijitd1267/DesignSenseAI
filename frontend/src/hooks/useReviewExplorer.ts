import type { AxiosError, AxiosResponse } from "axios";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../lib/api";
import type { ReviewQueryResult } from "../types/analytics";

type Status = "idle" | "loading" | "success" | "error";

export interface ReviewQueryParams {
  dataset?: string;
  brand?: string;
  model?: string;
  sentiment?: string;
  feature?: string;
  source?: string;
  country?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  min_rating?: number;
  max_rating?: number;
  page?: number;
  page_size?: number;
}

const DEFAULT_PARAMS: ReviewQueryParams = {
  page: 1,
  page_size: 20,
};

export function useReviewExplorer(initial: ReviewQueryParams = {}) {
  const [params, setParams] = useState<ReviewQueryParams>({ ...DEFAULT_PARAMS, ...initial });
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<ReviewQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sanitizedParams = useMemo(() => {
    const payload: Record<string, string | number> = {};
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      payload[key] = value as string | number;
    });
    return payload;
  }, [params]);
  const serializedParams = useMemo(() => JSON.stringify(sanitizedParams), [sanitizedParams]);

  useEffect(() => {
    let isMounted = true;
    setStatus("loading");
    setError(null);

    apiClient
      .get<ReviewQueryResult>("/reviews", { params: sanitizedParams })
      .then((response: AxiosResponse<ReviewQueryResult>) => {
        if (!isMounted) return;
        setData(response.data);
        setStatus("success");
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          const payload = axiosError.response?.data as { error?: string; message?: string } | undefined;
          const message = payload?.error ?? payload?.message ?? axiosError.message ?? "Unknown error";
          setError(message);
          setStatus("error");
          return;
        }
        const genericError = error instanceof Error ? error.message : "Unknown error";
        setError(genericError);
        setStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, [serializedParams]);

  const updateParams = useCallback((next: Partial<ReviewQueryParams>) => {
    setParams((prev: ReviewQueryParams) => ({ ...prev, ...next, page: next.page ?? 1 }));
  }, []);

  const resetParams = useCallback(() => {
    setParams(DEFAULT_PARAMS);
  }, []);

  return { params, updateParams, resetParams, status, data, error };
}
