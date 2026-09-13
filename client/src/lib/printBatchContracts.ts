import { adminRequest } from "./adminApi";
import type { WorkflowOrder } from "./adminContracts";

export type PrintBatch = {
  id: number;
  version: number;
  status: "DRAFT" | "CONFIRMED" | "PRINTING" | "FINISHED" | "CANCELED";
  startedAt?: string | null;
  finishedAt?: string | null;
  results?: {
    id: number;
    orderNumber: string;
    attempt: number;
    result: string;
    note: string;
  }[];
  observations?: {
    id: number;
    note: string;
    purgeGrams: number | null;
    issues: { orderNumber: string; note: string }[];
    actorName: string;
    createdAt: string;
  }[];
  layoutRevision: number;
  printerName: string;
  printingAssigneeId: number | null;
  printingAssigneeName: string | null;
  orders: WorkflowOrder[];
  slots: {
    slotLabel: string;
    filamentId: number;
    spoolId?: string;
    colorName?: string;
    material?: string;
    finish?: string;
  }[];
  artifacts: {
    id: string;
    fileName: string;
    size: number;
    currentLayout: boolean;
  }[];
  allowedActions: string[];
  blockingIssues: string[];
};
export type PrintStaff = {
  defaultPrinting: number | null;
  staff: { id: number; name: string }[];
};
export type PlateConfig = {
  printerName: string;
  printingAssigneeId: number | null;
  slots: { slotLabel: string; filamentId: number }[];
  orders: { orderNumber: string; version: number }[];
};
export const batchPath = "/api/production/print-batches";
export const getBatches = () => adminRequest<PrintBatch[]>(batchPath);
export const getBatch = (id: number) =>
  adminRequest<PrintBatch>(`${batchPath}/${id}`);
export const getPlateCandidates = () =>
  adminRequest<WorkflowOrder[]>(`${batchPath}/candidates`);
export const getPrintStaff = () =>
  adminRequest<PrintStaff>(`${batchPath}/staff`);
export const batchStatus = {
  DRAFT: "임시 구성",
  CONFIRMED: "출력 대기",
  PRINTING: "출력 중",
  FINISHED: "출력 종료",
  CANCELED: "취소됨",
};

export function currentFilamentMappings(order: WorkflowOrder) {
  const completed = (order.filamentMappings ?? []).filter(m => m.completedAt);
  const latest = Math.max(0, ...completed.map(m => m.taskId));
  return completed.filter(m => m.taskId === latest);
}
