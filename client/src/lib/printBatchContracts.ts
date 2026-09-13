import { adminRequest } from "./adminApi";
import type { WorkflowOrder } from "./adminContracts";

export type PrintBatch = {
  id: number;
  version: number;
  status: "DRAFT" | "CONFIRMED" | "CANCELED";
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
  CANCELED: "취소됨",
};
