import { useApiData } from "./useApiData";
import type { FiltersResponse } from "../types/analytics";

export function useFilters() {
  return useApiData<FiltersResponse>("/filters");
}
