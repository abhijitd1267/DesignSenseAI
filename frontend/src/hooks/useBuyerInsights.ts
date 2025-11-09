import { useApiData } from "./useApiData";
import type { BuyerInsightsResponse } from "../types/analytics";

export function useBuyerInsights() {
  return useApiData<BuyerInsightsResponse>("/buyer-insights");
}
