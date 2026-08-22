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

/**
 * 제작팀에게 보이는 상태.
 *
 * 결제를 기다리다 말았거나 실패한 주문은 넣지 않는다. 제작 대기열에 섞이면
 * 만들지 않아도 될 것을 만든다.
 *
 * 1차 체험단은 예외다. 결제는 없었지만 실제로 만들어 보내야 하는 물건이다.
 */
export const PRODUCTION_VISIBLE_STATUSES: GoodsOrderStatus[] = [
  "PAYMENT_COMPLETED",
  "IN_PRODUCTION",
  "SHIPPED",
  "LEGACY_FREE",
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

/**
 * 1차 체험단에서 갈 수 있는 상태.
 *
 * 결제가 없던 주문이라 결제 관련 상태로는 가지 않는다. 결제 완료로 바꾸면
 * 받지도 않은 돈이 매출로 잡히고, 만료·실패로 바꾸면 없던 결제가 실패한
 * 것이 된다. 서버도 같은 것을 막는다.
 */
const LEGACY_FREE_SETTABLE: GoodsOrderStatus[] = ["IN_PRODUCTION"];

export const settableStatusesFor = (
  role: AdminRole,
  current: GoodsOrderStatus
): GoodsOrderStatus[] => {
  if (current === "LEGACY_FREE") {
    return LEGACY_FREE_SETTABLE;
  }
  return (role === "ADMIN" ? ADMIN_SETTABLE : PRODUCTION_SETTABLE).filter(
    (status) => status !== current
  );
};

/** 송장 등록은 관리자만 한다. 이미 보냈으면 다시 등록해 고칠 수 있다. */
export const canRegisterTracking = (
  role: AdminRole,
  current: GoodsOrderStatus
): boolean =>
  role === "ADMIN" &&
  (current === "PAYMENT_COMPLETED" ||
    current === "IN_PRODUCTION" ||
    current === "SHIPPED" ||
    // 무료로 드린 것도 보내야 한다. 막아 두면 100건이 발송 완료로 못 넘어간다.
    current === "LEGACY_FREE");

/** 사진 자리 하나. 비어 있으면 "미기입"으로 보여 준다. */
export type PhotoSlotRow = {
  slot: number;
  filled: boolean;
  label: string;
};

export const PHOTO_SLOT_COUNT = 5;
export const EMPTY_PHOTO_LABEL = "미기입";

/**
 * 사진 1~5 자리를 만든다.
 *
 * 사진 1은 필수이고 2~5는 선택이다. 올리지 않은 자리를 그냥 빼면, 화면만
 * 봐서는 안 올린 것인지 화면이 못 그린 것인지 알 수 없다. 그래서 빈 자리도
 * 자리로 남기고 "미기입"이라고 적는다.
 *
 * 서버가 자리를 덜 내려줘도 다섯 자리를 채운다.
 */
export const photoSlotRows = (
  photos: { slot: number; filled: boolean }[] | undefined
): PhotoSlotRow[] => {
  const filled = new Set(
    (photos ?? []).filter((photo) => photo.filled).map((photo) => photo.slot)
  );

  return Array.from({ length: PHOTO_SLOT_COUNT }, (_, index) => {
    const slot = index + 1;
    const has = filled.has(slot);
    return {
      slot,
      filled: has,
      label: has ? `사진 ${slot}` : EMPTY_PHOTO_LABEL,
    };
  });
};

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
    case "LEGACY_FREE":
      // 아직 만들어 보내야 하는 물건이다. 끝난 것으로 보이면 안 된다.
      return "active";
    default:
      return "dead";
  }
};
