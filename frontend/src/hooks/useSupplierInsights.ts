import { useApiData } from "./useApiData";
import type { SupplierInsightsResponse } from "../types/analytics";

export function useSupplierInsights() {
  return useApiData<SupplierInsightsResponse>("/supplier-insights");
}
