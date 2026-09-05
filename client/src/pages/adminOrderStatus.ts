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
  PICKED_UP: "수령 완료",
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
  "PICKED_UP",
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
  "PICKED_UP",
  "LEGACY_FREE",
];

export const filterableStatusesFor = (role: AdminRole): GoodsOrderStatus[] =>
  role === "ADMIN" ? FILTERABLE_STATUSES : PRODUCTION_VISIBLE_STATUSES;

/**
 * 사람이 손으로 옮길 수 있는 길. 서버의 GoodsOrderStatus.MANUAL_TRANSITIONS
 * 와 같아야 한다 — 여기만 넓히면 눌러도 오류가 나고, 여기만 좁히면 할 수
 * 있는 일을 못 하게 된다.
 *
 * 여기 없는 길은 버튼이 아니라 사건으로만 간다. 발송 완료는 송장 등록,
 * 수령 완료는 현장 수령 버튼, 취소는 취소 절차. 그 사건이 함께 남겨야 하는
 * 것(송장, 파기 기준일, 환불 확인)을 건너뛰지 못하게 하기 위해서다.
 *
 * 결제 대기에서 제작 중으로는 못 간다. "결제 완료" 옆의 "제작 중"을 누르는
 * 것만으로 돈 안 받은 피규어가 제작 대기열에 들어갔다. 결제 완료·제작
 * 중에서 만료·실패로도 못 간다. 둘은 자리를 놓는 상태라, 돈은 받아 둔 채
 * 같은 자리를 다른 사람에게 팔게 된다. 제작 중에서 결제 완료로는 한 단계
 * 되돌릴 수 있다 — 잘못 누른 것을 고치는 길이다.
 *
 * 끝난 상태에서는 어디로도 못 간다. 만료는 사진이 이미 파기된 뒤라 되살려도
 * 만들 수 없다.
 *
 * 1차 체험단은 결제가 없던 주문이라 제작 중으로만 간다.
 */
const MANUAL_TRANSITIONS: Partial<Record<GoodsOrderStatus, GoodsOrderStatus[]>> =
  {
    PAYMENT_PENDING: ["PAYMENT_COMPLETED", "PAYMENT_EXPIRED", "PAYMENT_FAILED"],
    PAYMENT_COMPLETED: ["IN_PRODUCTION"],
    IN_PRODUCTION: ["PAYMENT_COMPLETED"],
    LEGACY_FREE: ["IN_PRODUCTION"],
  };

/** 제작팀이 스스로 바꿀 수 있는 상태. 발송과 취소는 관리자만 한다. */
const PRODUCTION_SETTABLE: GoodsOrderStatus[] = ["IN_PRODUCTION"];

export const settableStatusesFor = (
  role: AdminRole,
  current: GoodsOrderStatus
): GoodsOrderStatus[] =>
  (MANUAL_TRANSITIONS[current] ?? []).filter(
    (status) => role === "ADMIN" || PRODUCTION_SETTABLE.includes(status)
  );

/**
 * 손으로 바꿀 곳이 없는 상태에서 화면이 덧붙일 말.
 *
 * 만료된 주문을 되살리려던 사람이 빈 화면을 만나면 어디로 가야 하는지
 * 모른다. 사진은 만료 시점에 이미 파기됐으므로 되살릴 것이 없고, 늦게 입금한
 * 손님은 새 주문으로 다시 신청해야 한다.
 */
export const statusChangeHint = (current: GoodsOrderStatus): string | null => {
  if (current === "PAYMENT_EXPIRED") {
    return "만료된 주문은 사진이 이미 파기되어 되살릴 수 없습니다. 입금이 늦게 들어왔다면 환불하고 새로 신청을 받아 주세요.";
  }
  return null;
};

/**
 * 송장 등록은 관리자만 한다. 이미 보냈으면 다시 등록해 고칠 수 있다.
 *
 * 현장 수령 주문에는 열지 않는다. 넣을 송장이 없는데 칸이 열려 있으면
 * "현장수령" 같은 값을 넣어 끝내는 사람이 생기고, 이력에 가짜 송장이 남는다.
 * 방법을 모르면 택배로 본다 — 옛 주문은 전부 택배 건이다.
 */
export const canRegisterTracking = (
  role: AdminRole,
  current: GoodsOrderStatus,
  deliveryMethod: string | undefined = "SHIPPING"
): boolean =>
  role === "ADMIN" &&
  deliveryMethod !== "PICKUP" &&
  (current === "PAYMENT_COMPLETED" ||
    current === "IN_PRODUCTION" ||
    current === "SHIPPED" ||
    // 무료로 드린 것도 보내야 한다. 막아 두면 100건이 발송 완료로 못 넘어간다.
    current === "LEGACY_FREE");

/**
 * 현장에서 건넨 것으로 끝낼 수 있는지.
 *
 * 발송 완료는 송장을 넣어야 넘어가는데, 현장 수령에는 택배사도 송장번호도
 * 없다. 이 길이 없으면 플리마켓 주문은 제작 중에 영원히 남는다.
 *
 * 결제가 확인된 뒤라야 한다. 돈을 받지 않은 물건을 건넨 것으로 적을 수 없다.
 * 제작 중을 거치지 않고 바로 건네는 일도 있어서 결제 완료에서도 연다.
 * 관리자만 한다 — 발송과 같은 무게다. 서버도 같은 것을 막는다.
 */
export const canCompletePickup = (
  role: AdminRole,
  current: GoodsOrderStatus,
  deliveryMethod: string | undefined
): boolean =>
  role === "ADMIN" &&
  deliveryMethod === "PICKUP" &&
  (current === "PAYMENT_COMPLETED" || current === "IN_PRODUCTION");

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
    case "PICKED_UP":
      return "done";
    case "LEGACY_FREE":
      // 아직 만들어 보내야 하는 물건이다. 끝난 것으로 보이면 안 된다.
      return "active";
    default:
      return "dead";
  }
};

/**
 * 취소 사유 후보.
 *
 * 요구서 5-3 이 정한 목록이다. 직접 입력도 받는다 — 고르게만 두면 맞지 않는
 * 사유를 아무거나 고르고, 나중에 왜 취소했는지 알 수 없어진다.
 */
export const CANCEL_REASONS = [
  "고객 요청",
  "사진 품질 미달",
  "제작 불가 상품",
  "재고·운영상 사유",
  "주소·연락처 확인 불가",
];

/**
 * 취소 영역이 하는 말.
 *
 * 결제 대행사에 묶인 주문은 서버가 대행사 취소를 성공시킨 뒤에만 취소로
 * 옮긴다. 계좌이체 주문은 대행사가 없어서 서버가 환불을 하지 않는다 —
 * 사람이 은행에서 먼저 돌려주고, 여기서는 그 사실을 적는다.
 *
 * 두 경우에 같은 말을 하면 안 된다. 계좌이체 주문에 "결제도 함께 취소됐다"고
 * 말하면 환불 안 된 취소가 생긴다.
 */
export const cancelGuide = (pgLinked: boolean) =>
  pgLinked
    ? {
        description:
          "결제 취소가 성공해야 취소로 넘어갑니다. 실패하면 취소 처리 실패로 남고 직접 확인해야 합니다. 되돌릴 수 없습니다.",
        confirm: (orderNumber: string) =>
          `${orderNumber}을(를) 취소합니다. 되돌릴 수 없습니다.`,
        done: "주문을 취소했습니다. 결제도 함께 취소됐습니다.",
      }
    : {
        description:
          "계좌로 환불을 마친 뒤 눌러 주세요. 환불은 시스템이 하지 않습니다. 취소하면 자리가 다른 분께 돌아가고, 되돌릴 수 없습니다.",
        confirm: (orderNumber: string) =>
          `${orderNumber}을(를) 취소합니다. 계좌 환불을 마치셨나요? 되돌릴 수 없습니다.`,
        done: "주문을 취소했습니다. 환불은 직접 하신 것으로 기록됩니다.",
      };

/**
 * 취소할 수 있는 주문인지.
 *
 * 결제 완료와 제작 중만이다. 제작에 손을 대 봐야 드러나는 사유가 있어서
 * 착수 뒤에도 막지 않는다. 발송한 것은 되돌릴 수 없고, 결제하지 않은 것은
 * 돌려줄 돈이 없다. 서버도 같은 것을 막는다.
 */
export const canCancel = (
  role: AdminRole,
  current: GoodsOrderStatus,
  paid: boolean
): boolean =>
  role === "ADMIN" &&
  paid &&
  (current === "PAYMENT_COMPLETED" || current === "IN_PRODUCTION");
