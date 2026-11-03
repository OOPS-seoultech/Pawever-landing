import type { WorkflowOrder } from "./adminContracts";

export const operationQueues = [
  {
    id: "payment",
    label: "입금 확인",
    help: "은행 입금 내역을 확인한 뒤 기존 입금 확인 기능으로 처리합니다.",
  },
  {
    id: "preparation",
    label: "작업 준비",
    help: "입금 확인 후 제작 작업 생성과 담당자 배정을 확인합니다.",
  },
  {
    id: "modeling",
    label: "이미지·모델링",
    help: "고객 사진과 4면도를 비교하고, 수동 제작한 모델 원본·출력 파일을 등록합니다.",
  },
  {
    id: "review",
    label: "모델 검수",
    help: "현재 회차 결과물의 닮음과 출력 가능성을 확인합니다.",
  },
  {
    id: "color",
    label: "색상 매핑",
    help: "GPT/Codex에서 채색 작업 후 실제 보유 필라멘트를 부위별로 지정합니다.",
  },
  {
    id: "plate",
    label: "플레이트 구성",
    help: "별도 표시된 필라멘트 조합을 비교해 같은 플레이트로 묶습니다.",
  },
  {
    id: "printing",
    label: "출력·중간 확인",
    help: "저장된 플레이트에서 출력 시작·중간 확인·출력 결과를 기록합니다.",
  },
  {
    id: "finishing",
    label: "후가공·검수",
    help: "서포트 제거와 후가공, 출력물 검수를 완료합니다.",
  },
  {
    id: "packing",
    label: "포장",
    help: "포장·준등기에서 선택한 주문의 포장을 완료하고 우체국 엑셀을 받습니다.",
  },
  {
    id: "delivery",
    label: "발송·직접 수령",
    help: "준등기 영수증 대조와 발송, 직접 수령을 처리합니다.",
  },
  {
    id: "closed",
    label: "완료·종료",
    help: "완료·수령·취소·만료 주문을 확인합니다.",
  },
  {
    id: "attention",
    label: "분류 확인",
    help: "환불 확인 또는 현재 단계 확인이 필요한 주문입니다. 기존 전체 주문에서도 확인할 수 있습니다.",
  },
] as const;

export type OperationQueue = (typeof operationQueues)[number]["id"];

export function operationQueue(row: WorkflowOrder): OperationQueue {
  if (
    ["COMPLETED", "CANCELED", "EXPIRED", "DELETED"].includes(row.orderStatus) ||
    ["PICKED_UP", "DELIVERED"].includes(row.shipmentStatus)
  )
    return "closed";
  if (row.orderStatus !== "ACTIVE" || row.paymentStatus === "REFUND_PENDING")
    return "attention";
  if (row.paymentStatus === "PENDING") return "payment";
  if (!["CONFIRMED", "NOT_REQUIRED"].includes(row.paymentStatus))
    return "attention";
  if (
    ["AWAITING_POST_OFFICE_RESULT", "READY_FOR_PICKUP", "ACCEPTED"].includes(
      row.shipmentStatus
    )
  )
    return "delivery";
  switch (row.productionStage) {
    case "BLOCKED":
      return "preparation";
    case "MODELING_QUEUE":
    case "MODELING":
      return "modeling";
    case "MODEL_REVIEW":
      return "review";
    case "COLOR_MAPPING":
      return "color";
    case "PLATE_PREPARATION":
      return "plate";
    case "PRINT_QUEUE":
    case "PRINTING":
      return "printing";
    case "POST_PROCESSING":
    case "QC":
      return "finishing";
    case "PACKING":
    case "COMPLETE":
      return "packing";
    default:
      return "attention";
  }
}

export function currentFilaments(row: WorkflowOrder) {
  const mappings = (row.filamentMappings ?? []).filter(
    mapping => mapping.modelingAttempt === row.taskAttempt
  );
  return Array.from(
    new Map(mappings.map(mapping => [mapping.spoolId, mapping])).values()
  ).sort((a, b) => a.spoolId.localeCompare(b.spoolId));
}
