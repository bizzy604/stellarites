import api from "./api";
import type { ReviewData } from "../types";

/** Fetch all review NFTs for a given worker code / ID. */
export function getWorkerReviews(workerCode: string) {
  return api.get<ReviewData[]>(`/api/v1/reviews/worker/${workerCode}`);
}
