import { adminRequest } from "./adminApi";
export type AdminNotice = {
  id: number;
  version: number;
  title: string;
  body?: string;
  guideKey: string | null;
  authorName: string;
  createdAt: string;
  updatedAt: string;
};
export const getNotices = () =>
  adminRequest<AdminNotice[]>("/api/admin/notices");
export const getNotice = (id: number) =>
  adminRequest<AdminNotice>(`/api/admin/notices/${id}`);
export function externalNoticeUrl(
  value: string | undefined
): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
