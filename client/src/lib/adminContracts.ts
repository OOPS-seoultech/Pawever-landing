import { adminRequest, type AdminRole } from "./adminApi";

export type Staff = {
  id: number;
  name: string;
  role: AdminRole;
  workRoles: string[];
  permissions: string[];
};
export type StaffAccount = Omit<Staff, "permissions"> & {
  status: string;
  version: number;
};
export type WorkflowOrder = {
  orderNumber: string;
  petName: string;
  guardianName?: string | null;
  customGoods?: string | null;
  goodsType: string;
  keyringAdded: boolean;
  orderStatus: string;
  paymentStatus: string;
  productionStage: string;
  shipmentStatus: string;
  requiresMigrationReview: boolean;
  version: number;
  taskId: number | null;
  taskStatus: string | null;
  taskAttempt?: number | null;
  modelingTaskId?: number | null;
  reviews?: ModelReview[];
  assignee: { id: number; name: string } | null;
  blockingIssues: string[];
  allowedActions: string[];
  artifacts: {
    id: string;
    kind: string;
    fileName: string;
    size: number;
    taskId?: number;
    modelingAttempt?: number;
  }[];
  expectedAmount: number | null;
};
export type ModelReview = {
  id: number;
  reviewTaskId?: number;
  modelingTaskId?: number;
  modelingAttempt: number;
  decision: "APPROVED" | "CHANGES_REQUESTED";
  reasonCode: string | null;
  note: string;
  reviewerName: string;
  reviewedAt: string;
  checks?: string[];
};
export type ModelReviewDecision = {
  decision: "APPROVED" | "CHANGES_REQUESTED";
  reasonCode: string | null;
  note: string;
  checks: string[];
};
export const reviewReasons: Record<string, string> = {
  SHAPE: "얼굴 형태",
  EARS: "귀",
  TAIL: "꼬리",
  POSE: "자세",
  BASE_CUT: "하단 커팅",
  PRINTABILITY: "출력 가능성",
  COLOR_SEPARATION: "색상 분리",
};
export const reviewChecks: Record<string, string> = {
  LIKENESS: "닮음",
  FEATURES: "주요 특징",
  BASE_CUT: "하단 커팅",
  PRINTABILITY: "출력 가능성",
};
export const stageLabels: Record<string, string> = {
  BLOCKED: "작업 배정 전",
  MODELING_QUEUE: "모델링 대기",
  MODELING: "모델링 중",
  MODEL_REVIEW: "모델 검수 대기",
  COLOR_MAPPING: "색상 작업 대기",
  COMPLETE: "제작 완료",
};
export const paymentLabels: Record<string, string> = {
  PENDING: "입금 대기",
  CONFIRMED: "입금 확인",
  NOT_REQUIRED: "결제 불필요",
  FAILED: "결제 실패",
  EXPIRED: "입금 기한 만료",
  REFUND_PENDING: "환불 확인 필요",
  REFUNDED: "환불 완료",
};
export const issueLabels: Record<string, string> = {
  QC_FAILED: "모델 수정 요청이 있습니다. 검수 메모를 확인하고 수정해 주세요.",
  UNASSIGNED: "활성 담당자를 배정해 주세요.",
  PHOTO_INSUFFICIENT: "고객 사진이 3장 이상 필요합니다.",
  PAYMENT_MISMATCH: "입금액이 주문 금액과 다릅니다.",
};
export const artifactKinds = [
  { kind: "MULTIVIEW", label: "4면도", accept: ".png,.jpg,.jpeg,.webp" },
  {
    kind: "MODEL_SOURCE",
    label: "모델 원본",
    accept: ".blend,.obj,.stl,.3mf,.fbx,.glb,.gltf",
  },
  { kind: "PRINT_MODEL", label: "출력 파일", accept: ".stl,.3mf" },
];
export const getStaff = () => adminRequest<Staff>("/api/admin/me");
export const getWorkflow = (number: string) =>
  adminRequest<WorkflowOrder>(
    `/api/admin/orders/${encodeURIComponent(number)}/workflow`
  );
export const getStaffAccounts = () =>
  adminRequest<StaffAccount[]>("/api/admin/workflow/staff");
export type Defaults = {
  modeling: number | null;
  review: number | null;
  version: number;
};
export const getDefaults = () =>
  adminRequest<Defaults>("/api/admin/workflow/default-assignees");
export const workflowCommand = <T = WorkflowOrder>(
  path: string,
  body: object,
  key: string,
  method = "POST"
) =>
  adminRequest<T>(path, {
    method,
    headers: { "Idempotency-Key": key },
    body: JSON.stringify(body),
  });
