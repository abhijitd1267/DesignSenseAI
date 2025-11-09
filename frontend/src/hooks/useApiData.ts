import type { AxiosError, AxiosResponse } from "axios";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../lib/api";

type Status = "idle" | "loading" | "success" | "error";

interface ApiState<T> {
  status: Status;
  data: T | null;
  error: string | null;
}

export function useApiData<T>(endpoint: string, params?: Record<string, unknown>) {
  const [state, setState] = useState<ApiState<T>>({ status: "idle", data: null, error: null });
  const serializedParams = useMemo(() => JSON.stringify(params ?? {}), [params]);

  useEffect(() => {
    let isMounted = true;
    setState((prev: ApiState<T>) => ({ ...prev, status: "loading", error: null }));

    apiClient
      .get<T>(endpoint, { params })
      .then((response: AxiosResponse<T>) => {
        if (!isMounted) return;
        setState({ status: "success", data: response.data, error: null });
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          const payload = axiosError.response?.data as { error?: string; message?: string } | undefined;
          const details = payload?.error ?? payload?.message;
          setState({ status: "error", data: null, error: details ?? axiosError.message ?? "Unknown error" });
          return;
        }
        const genericError = error instanceof Error ? error.message : "Unknown error";
        setState({ status: "error", data: null, error: genericError });
      });

    return () => {
      isMounted = false;
    };
  }, [endpoint, serializedParams]);

  return state;
}
