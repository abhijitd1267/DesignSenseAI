import { useApiData } from "./useApiData";
import type { ModelAdvisorResponse } from "../types/analytics";

export function useModelAdvisor() {
  return useApiData<ModelAdvisorResponse>("/model-advisor");
}
