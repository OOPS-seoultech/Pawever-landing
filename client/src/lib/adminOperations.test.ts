import { describe, expect, it } from "vitest";
import {
  operationQueue,
  operationQueues,
  currentFilaments,
} from "./adminOperations";
import type { WorkflowOrder } from "./adminContracts";

const order = (changes: Partial<WorkflowOrder> = {}): WorkflowOrder => ({
  orderNumber: "TEST-1",
  petName: "나비",
  guardianName: "보호자",
  goodsType: "figure",
  keyringAdded: false,
  orderStatus: "ACTIVE",
  paymentStatus: "CONFIRMED",
  productionStage: "MODELING_QUEUE",
  shipmentStatus: "NOT_READY",
  requiresMigrationReview: false,
  version: 0,
  taskId: 1,
  taskStatus: "WAITING",
  modelingTaskId: 1,
  taskAttempt: 1,
  assignee: null,
  blockingIssues: [],
  allowedActions: [],
  artifacts: [],
  expectedAmount: 14900,
  ...changes,
});

describe("운영 목록은 주문을 현재 단계 한 곳에만 넣는다", () => {
  it.each([
    [
      { paymentStatus: "PENDING", productionStage: "BLOCKED", taskId: null },
      "payment",
    ],
    [{ productionStage: "BLOCKED", taskId: null }, "preparation"],
    [{ productionStage: "MODELING_QUEUE" }, "modeling"],
    [{ productionStage: "MODELING" }, "modeling"],
    [{ productionStage: "MODEL_REVIEW" }, "review"],
    [{ productionStage: "COLOR_MAPPING" }, "color"],
    [{ productionStage: "PLATE_PREPARATION" }, "plate"],
    [{ productionStage: "PRINT_QUEUE" }, "printing"],
    [{ productionStage: "PRINTING" }, "printing"],
    [{ productionStage: "POST_PROCESSING" }, "finishing"],
    [{ productionStage: "QC" }, "finishing"],
    [{ productionStage: "PACKING" }, "packing"],
    [{ productionStage: "COMPLETE" }, "packing"],
    [{ shipmentStatus: "AWAITING_POST_OFFICE_RESULT" }, "delivery"],
    [{ shipmentStatus: "READY_FOR_PICKUP" }, "delivery"],
    [{ shipmentStatus: "ACCEPTED" }, "delivery"],
    [{ orderStatus: "CANCELED", paymentStatus: "PENDING" }, "closed"],
    [{ shipmentStatus: "PICKED_UP" }, "closed"],
    [{ shipmentStatus: "DELIVERED" }, "closed"],
    [{ paymentStatus: "REFUND_PENDING" }, "attention"],
    [{ productionStage: "FUTURE_STAGE" }, "attention"],
    [{ orderStatus: "FUTURE_STATUS" }, "attention"],
  ] as [Partial<WorkflowOrder>, string][])("%j → %s", (changes, expected) => {
    const result = operationQueue(order(changes));
    expect(result).toBe(expected);
    expect(operationQueues.filter(queue => queue.id === result)).toHaveLength(
      1
    );
  });

  it("미배정 경고가 있어도 실제 제작 단계는 유지한다", () => {
    expect(operationQueue(order({ blockingIssues: ["UNASSIGNED"] }))).toBe(
      "modeling"
    );
  });
});

it("현재 모델링 회차의 색상만 모으고 같은 스풀은 합친다", () => {
  const mapping = {
    id: 1,
    taskId: 8,
    modelingAttempt: 1,
    partName: "몸",
    filamentId: 3,
    spoolId: "WHITE-1",
    colorName: "흰색",
    material: "PLA",
    finish: "무광",
    savedAt: "",
    completedAt: "now",
  };
  expect(
    currentFilaments(
      order({
        taskAttempt: 2,
        filamentMappings: [
          mapping,
          { ...mapping, id: 2, modelingAttempt: 2 },
          { ...mapping, id: 3, modelingAttempt: 2, partName: "꼬리" },
          {
            ...mapping,
            id: 4,
            modelingAttempt: 2,
            filamentId: 4,
            spoolId: "BLACK-1",
            colorName: "검정",
          },
        ],
      })
    ).map(f => f.spoolId)
  ).toEqual(["BLACK-1", "WHITE-1"]);
});
