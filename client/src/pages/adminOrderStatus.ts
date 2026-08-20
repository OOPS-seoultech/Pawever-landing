import type { AdminRole, GoodsOrderStatus } from "@/lib/adminApi";

/**
 * 화면이 무엇을 눌러도 되는지 정하는 자리.
 *
 * 서버도 같은 것을 막는다. 여기서 거르는 이유는 권한이 아니라 안내다. 누를 수
 * 없는 것을 눌러 보고 오류를 받는 것보다, 애초에 보이지 않는 편이 낫다.
 * 서버 규칙이 바뀌면 이 파일도 같이 바꿔야 한다 — 여기만 넓히면 오류가 나고,
 * 여기만 좁히면 할 수 있는 일을 못 하게 된다.
 */

export const STATUS_LABELS: Record<GoodsOrderStatus, string> = {
  PAYMENT_PENDING: "결제 대기",
  PAYMENT_COMPLETED: "결제 완료",
  IN_PRODUCTION: "제작 중",
  SHIPPED: "발송 완료",
  PAYMENT_EXPIRED: "결제 만료",
  PAYMENT_FAILED: "결제 실패",
  CANCELED: "주문 취소",
  CANCEL_FAILED: "취소 처리 실패",
  LEGACY_FREE: "1차 체험단",
};

/** 목록 필터에 세워 두는 순서. 흐름대로 둔다. */
export const FILTERABLE_STATUSES: GoodsOrderStatus[] = [
  "PAYMENT_PENDING",
  "PAYMENT_COMPLETED",
  "IN_PRODUCTION",
  "SHIPPED",
  "PAYMENT_EXPIRED",
  "PAYMENT_FAILED",
  "CANCELED",
  "CANCEL_FAILED",
  "LEGACY_FREE",
];

/** 제작팀에게 보이는 상태. 돈을 받지 않은 주문은 제작 대기열에 넣지 않는다. */
export const PRODUCTION_VISIBLE_STATUSES: GoodsOrderStatus[] = [
  "PAYMENT_COMPLETED",
  "IN_PRODUCTION",
  "SHIPPED",
];

export const filterableStatusesFor = (role: AdminRole): GoodsOrderStatus[] =>
  role === "ADMIN" ? FILTERABLE_STATUSES : PRODUCTION_VISIBLE_STATUSES;

/**
 * 손으로 바꿀 수 있는 상태.
 *
 * 발송 완료는 없다. 송장을 등록해야 넘어간다. 목록에 두면 송장 없이 발송된
 * 주문이 생기고, 고객은 조회할 번호가 없다.
 *
 * 취소도 없다. 결제 취소 API 가 성공해야 넘어간다. 상태만 바꾸면 돈은 그대로
 * 두고 취소된 것으로 보인다.
 */
const ADMIN_SETTABLE: GoodsOrderStatus[] = [
  "PAYMENT_COMPLETED",
  "IN_PRODUCTION",
  "PAYMENT_EXPIRED",
  "PAYMENT_FAILED",
];

const PRODUCTION_SETTABLE: GoodsOrderStatus[] = ["IN_PRODUCTION"];

export const settableStatusesFor = (
  role: AdminRole,
  current: GoodsOrderStatus
): GoodsOrderStatus[] =>
  (role === "ADMIN" ? ADMIN_SETTABLE : PRODUCTION_SETTABLE).filter(
    (status) => status !== current
  );

/** 송장 등록은 관리자만 한다. 이미 보냈으면 다시 등록해 고칠 수 있다. */
export const canRegisterTracking = (
  role: AdminRole,
  current: GoodsOrderStatus
): boolean =>
  role === "ADMIN" &&
  (current === "PAYMENT_COMPLETED" ||
    current === "IN_PRODUCTION" ||
    current === "SHIPPED");

/** 화면에서 상태에 붙일 색. 손이 가야 하는 것과 끝난 것을 나눈다. */
export const statusTone = (
  status: GoodsOrderStatus
): "waiting" | "active" | "done" | "dead" => {
  switch (status) {
    case "PAYMENT_PENDING":
      return "waiting";
    case "PAYMENT_COMPLETED":
    case "IN_PRODUCTION":
      return "active";
    case "SHIPPED":
      return "done";
    default:
      return "dead";
  }
};
