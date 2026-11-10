import { adminRequest } from "./adminApi";
import type { AdminImage } from "@/components/AdminImageGallery";
export type ImageJob = {
  id: string;
  orderNumber: string;
  petIndex: number;
  petName: string;
  status: string;
  promptVersion: string;
  feedback: string | null;
  errorCode: string | null;
  createdAt: string;
  current: boolean;
  requestedBy: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  telegramStatus: string;
  canReview: boolean;
  canRegenerate: boolean;
  canRetrySave: boolean;
  images: AdminImage[];
};
export const imageStatus: Record<string, string> = {
  QUEUED: "생성 대기",
  RUNNING: "4면도 생성 중",
  REVIEW: "이미지 검수 대기",
  APPROVED: "이미지 검수 완료",
  FAILED: "생성·저장 실패",
  UNKNOWN: "API 결과 확인 필요",
  SUPERSEDED: "이전 후보",
};
export const getImageJob = (id: string) =>
  adminRequest<ImageJob>(
    `/api/production/image-jobs/${encodeURIComponent(id)}`
  );
export const getImageJobs = (number: string, pet: number) =>
  adminRequest<ImageJob[]>(
    `/api/admin/orders/${encodeURIComponent(number)}/image-generation?petIndex=${pet}`
  );
export const imageCommand = (
  id: string,
  action: string,
  body: object,
  key: string
) =>
  adminRequest<ImageJob>(
    `/api/production/image-jobs/${encodeURIComponent(id)}/${action}`,
    {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: JSON.stringify(body),
    }
  );
// Only these authenticated deep links survive sign-in; external destinations never do.
export function adminLoginPath(path = window.location.pathname) {
  return /^\/admin\/(image-review\/[^/?#]+|telegram)$/.test(path)
    ? `/admin?next=${encodeURIComponent(path)}`
    : "/admin";
}
export function adminReturnPath(search = window.location.search) {
  const next = new URLSearchParams(search).get("next") ?? "";
  return /^\/admin\/(image-review\/[^/?#]+|telegram)$/.test(next) ? next : null;
}
