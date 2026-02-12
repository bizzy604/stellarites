import api from "./api";
import type {
  ReviewData,
  EligibleReviewee,
  SubmitReviewRequest,
  UserReview,
  UserRating,
} from "../types";

// ─── Legacy NFT reviews ──────────────────────────────────────────────

/** Fetch all review NFTs for a given worker code / ID. */
export function getWorkerReviews(workerCode: string) {
  return api.get<ReviewData[]>(`/api/v1/reviews/worker/${workerCode}`);
}

// ─── App-based reviews ───────────────────────────────────────────────

/** List people this user can review (3-month+ relationships). */
export function getEligibleReviewees(userId: string) {
  return api.get<EligibleReviewee[]>(`/api/v1/reviews/eligible/${userId}`);
}

/** Submit a review. */
export function submitReview(data: SubmitReviewRequest) {
  return api.post<UserReview>("/api/v1/reviews/submit", data);
}

/** Get all reviews written about a user (received). */
export function getReviewsFor(userId: string) {
  return api.get<UserReview[]>(`/api/v1/reviews/for/${userId}`);
}

/** Get all reviews written by a user. */
export function getReviewsBy(userId: string) {
  return api.get<UserReview[]>(`/api/v1/reviews/by/${userId}`);
}

/** Get average rating and review count for a user. */
export function getUserRating(userId: string) {
  return api.get<UserRating>(`/api/v1/reviews/rating/${userId}`);
}
