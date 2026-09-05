import { describe, expect, it } from "vitest";
import {
  canCancel,
  CANCEL_REASONS,
  cancelGuide,
  canCompletePickup,
  canRegisterTracking,
  filterableStatusesFor,
  photoSlotRows,
  statusChangeHint,
  statusTone,
  settableStatusesFor,
  STATUS_LABELS,
} from "./adminOrderStatus";
import type { GoodsOrderStatus } from "@/lib/adminApi";

describe("관리자 주문 상태 규칙", () => {
  it("발송 완료는 손으로 고르지 못한다", () => {
    // 송장을 등록해야 넘어간다. 여기에 두면 고객이 조회할 번호 없이
    // 발송된 주문이 생긴다.
    expect(settableStatusesFor("ADMIN", "IN_PRODUCTION")).not.toContain(
      "SHIPPED"
    );
  });

  it("취소는 손으로 고르지 못한다", () => {
    // 결제 취소 API 가 성공해야 넘어간다. 상태만 바꾸면 돈은 그대로 두고
    // 취소된 것으로 보인다. 서버도 같은 것을 막는다.
    const settable = settableStatusesFor("ADMIN", "PAYMENT_COMPLETED");
    expect(settable).not.toContain("CANCELED");
    expect(settable).not.toContain("CANCEL_FAILED");
  });

  it("제작팀은 제작 중으로만 바꿀 수 있다", () => {
    // 서버의 PRODUCTION_SETTABLE 과 같아야 한다. 여기서 더 보여 주면
    // 눌러도 403 만 돌아온다.
    expect(settableStatusesFor("PRODUCTION", "PAYMENT_COMPLETED")).toEqual([
      "IN_PRODUCTION",
    ]);
  });

  it("지금 상태는 다시 고를 수 없다", () => {
    expect(settableStatusesFor("ADMIN", "IN_PRODUCTION")).not.toContain(
      "IN_PRODUCTION"
    );
    expect(settableStatusesFor("PRODUCTION", "IN_PRODUCTION")).toEqual([]);
  });

  it("결제 대기에서는 입금 확인과 만료·실패만 고를 수 있다", () => {
    // "결제 완료" 옆의 "제작 중"을 누르는 것만으로 돈 안 받은 피규어가
    // 제작 대기열에 들어갔다. 서버도 같은 표를 쓴다.
    expect(settableStatusesFor("ADMIN", "PAYMENT_PENDING")).toEqual([
      "PAYMENT_COMPLETED",
      "PAYMENT_EXPIRED",
      "PAYMENT_FAILED",
    ]);
  });

  it("결제 완료에서는 제작 중으로만 간다", () => {
    // 만료·실패는 자리를 놓는 상태다. 돈은 받아 둔 채 자리를 다른 사람에게
    // 팔게 된다.
    expect(settableStatusesFor("ADMIN", "PAYMENT_COMPLETED")).toEqual([
      "IN_PRODUCTION",
    ]);
  });

  it("제작 중에서는 결제 완료로 한 단계만 되돌릴 수 있다", () => {
    expect(settableStatusesFor("ADMIN", "IN_PRODUCTION")).toEqual([
      "PAYMENT_COMPLETED",
    ]);
  });

  it("끝난 주문은 손으로 바꿀 수 없다", () => {
    // 발송·수령이 끝난 주문이 다시 제작 대기열에 들어가면 안 되고, 만료된
    // 주문은 사진이 이미 파기돼 되살려도 만들 수 없다.
    for (const done of [
      "SHIPPED",
      "PICKED_UP",
      "PAYMENT_EXPIRED",
      "PAYMENT_FAILED",
      "CANCELED",
      "CANCEL_FAILED",
    ] as GoodsOrderStatus[]) {
      expect(settableStatusesFor("ADMIN", done), done).toEqual([]);
    }
  });

  it("만료된 주문에는 새로 신청받으라고 적는다", () => {
    // 늦게 입금한 손님을 되살리려다 빈 화면을 만나면 어디로 가야 하는지 모른다.
    expect(statusChangeHint("PAYMENT_EXPIRED")).toContain("새로");
    expect(statusChangeHint("IN_PRODUCTION")).toBeNull();
  });

  it("제작팀 필터에는 결제 전 주문이 없다", () => {
    // 돈을 받지 않은 주문이 제작 대기열에 섞이면 만들지 않아도 될 것을 만든다.
    // 1차 체험단은 예외다. 결제는 없었지만 실제로 만들어 보내야 하는
    // 물건이라 제작 화면에 있어야 한다. 아래 "1차 체험단" 묶음에서 따로 본다.
    const production = filterableStatusesFor("PRODUCTION");
    expect(production).not.toContain("PAYMENT_PENDING");
    expect(production).not.toContain("PAYMENT_EXPIRED");
    expect(production).not.toContain("PAYMENT_FAILED");
  });

  it("송장 등록은 관리자만, 결제가 끝난 뒤에만 열린다", () => {
    expect(canRegisterTracking("ADMIN", "PAYMENT_COMPLETED")).toBe(true);
    expect(canRegisterTracking("ADMIN", "SHIPPED")).toBe(true);
    expect(canRegisterTracking("ADMIN", "PAYMENT_PENDING")).toBe(false);
    expect(canRegisterTracking("PRODUCTION", "IN_PRODUCTION")).toBe(false);
  });

  it("모든 상태에 한국어 이름이 있다", () => {
    // 이름이 빠지면 화면에 영문 상수가 그대로 나온다.
    const statuses: GoodsOrderStatus[] = [
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
    statuses.forEach((status) => {
      expect(STATUS_LABELS[status]).toBeTruthy();
    });
  });
});

describe("1차 체험단", () => {
  it("결제 관련 상태로는 바꿀 수 없다", () => {
    // 결제라는 것이 없던 주문이다. 결제 완료로 바꾸면 받지도 않은 돈이
    // 매출로 잡힌다. 서버도 같은 것을 막는다.
    const settable = settableStatusesFor("ADMIN", "LEGACY_FREE");

    expect(settable).toEqual(["IN_PRODUCTION"]);
    expect(settable).not.toContain("PAYMENT_COMPLETED");
    expect(settable).not.toContain("PAYMENT_EXPIRED");
    expect(settable).not.toContain("PAYMENT_FAILED");
  });

  it("제작팀에게 보인다", () => {
    // 결제는 없었지만 실제로 만들어 보내야 하는 물건이다.
    expect(filterableStatusesFor("PRODUCTION")).toContain("LEGACY_FREE");
  });

  it("송장을 등록할 수 있다", () => {
    // 무료로 드린 것도 보내야 한다. 막아 두면 발송 완료로 못 넘어간다.
    expect(canRegisterTracking("ADMIN", "LEGACY_FREE")).toBe(true);
  });

  it("끝난 것으로 보이지 않는다", () => {
    expect(statusTone("LEGACY_FREE")).toBe("active");
  });
});

describe("현장 수령", () => {
  // 발송 완료는 송장을 넣어야 넘어간다. 현장 수령에는 택배사도 송장번호도
  // 없어서, 따로 끝낼 길이 없으면 플리마켓 70건이 제작 중에 영원히 남거나
  // 가짜 송장을 넣게 된다.
  it("현장 수령 주문은 결제가 확인된 뒤 관리자가 수령 완료로 끝낸다", () => {
    expect(canCompletePickup("ADMIN", "PAYMENT_COMPLETED", "PICKUP")).toBe(true);
    expect(canCompletePickup("ADMIN", "IN_PRODUCTION", "PICKUP")).toBe(true);
  });

  it("결제 전이거나 이미 끝난 주문에는 열리지 않는다", () => {
    expect(canCompletePickup("ADMIN", "PAYMENT_PENDING", "PICKUP")).toBe(false);
    expect(canCompletePickup("ADMIN", "PICKED_UP", "PICKUP")).toBe(false);
    expect(canCompletePickup("ADMIN", "CANCELED", "PICKUP")).toBe(false);
  });

  it("택배 주문에는 열리지 않는다", () => {
    // 부쳐야 하는 물건이다. 송장 없이 끝내면 고객이 조회할 번호가 없다.
    expect(canCompletePickup("ADMIN", "IN_PRODUCTION", "SHIPPING")).toBe(false);
    expect(canCompletePickup("ADMIN", "IN_PRODUCTION", undefined)).toBe(false);
  });

  it("제작팀은 수령 완료를 찍을 수 없다", () => {
    expect(canCompletePickup("PRODUCTION", "IN_PRODUCTION", "PICKUP")).toBe(false);
  });

  it("현장 수령 주문에는 송장 등록이 열리지 않는다", () => {
    // 두 길이 함께 열려 있으면 송장 칸에 "현장수령" 같은 값을 넣어 끝내는
    // 사람이 생기고, 이력에 가짜 송장이 남는다.
    expect(canRegisterTracking("ADMIN", "IN_PRODUCTION", "PICKUP")).toBe(false);
    expect(canRegisterTracking("ADMIN", "IN_PRODUCTION", "SHIPPING")).toBe(true);
    // 방법을 모르면 지금까지처럼 택배로 본다. 옛 주문은 전부 택배 건이다.
    expect(canRegisterTracking("ADMIN", "IN_PRODUCTION")).toBe(true);
  });

  it("수령 완료는 끝난 것으로 보이고 제작팀 필터에도 있다", () => {
    expect(statusTone("PICKED_UP")).toBe("done");
    expect(filterableStatusesFor("PRODUCTION")).toContain("PICKED_UP");
    expect(filterableStatusesFor("ADMIN")).toContain("PICKED_UP");
  });

  it("수령 완료는 손으로 고르지 못한다", () => {
    // 발송 완료와 같다. 현장 수령 버튼을 거쳐야 파기 시계가 함께 켜진다.
    expect(settableStatusesFor("ADMIN", "IN_PRODUCTION")).not.toContain("PICKED_UP");
  });
});

describe("사진 자리", () => {
  it("올리지 않은 자리를 미기입으로 남긴다", () => {
    // 요구서: 선택 사진이 없으면 관리자 화면에 반드시 "미기입"으로 표시한다.
    const rows = photoSlotRows([
      { slot: 1, filled: true },
      { slot: 2, filled: false },
      { slot: 3, filled: false },
      { slot: 4, filled: false },
      { slot: 5, filled: false },
    ]);

    expect(rows).toHaveLength(5);
    expect(rows[0].label).toBe("사진 1");
    expect(rows.slice(1).map((row) => row.label)).toEqual([
      "미기입",
      "미기입",
      "미기입",
      "미기입",
    ]);
  });

  it("서버가 자리를 덜 내려줘도 다섯 자리를 채운다", () => {
    // 자리를 빼 버리면 안 올린 것인지 화면이 못 그린 것인지 구분이 안 된다.
    const rows = photoSlotRows([{ slot: 1, filled: true }]);

    expect(rows).toHaveLength(5);
    expect(rows.filter((row) => row.filled)).toHaveLength(1);
    expect(rows[4].label).toBe("미기입");
  });

  it("값이 아예 없어도 화면을 깨지 않는다", () => {
    expect(photoSlotRows(undefined)).toHaveLength(5);
    expect(photoSlotRows(undefined).every((row) => !row.filled)).toBe(true);
  });
});

describe("주문 취소", () => {
  it("결제 완료와 제작 중에서만 취소할 수 있다", () => {
    // 제작에 손을 대 봐야 드러나는 사유가 있어 착수 뒤에도 막지 않는다.
    expect(canCancel("ADMIN", "PAYMENT_COMPLETED", true)).toBe(true);
    expect(canCancel("ADMIN", "IN_PRODUCTION", true)).toBe(true);
  });

  it("발송한 주문은 취소하지 않는다", () => {
    // 이미 나간 물건은 되돌릴 수 없다.
    expect(canCancel("ADMIN", "SHIPPED", true)).toBe(false);
  });

  it("결제하지 않은 주문은 취소하지 않는다", () => {
    // 1차 체험단처럼 돌려줄 돈이 없는 건이다.
    expect(canCancel("ADMIN", "IN_PRODUCTION", false)).toBe(false);
    expect(canCancel("ADMIN", "LEGACY_FREE", false)).toBe(false);
  });

  it("제작팀은 취소할 수 없다", () => {
    expect(canCancel("PRODUCTION", "IN_PRODUCTION", true)).toBe(false);
  });

  it("계좌이체 주문에는 환불을 먼저 하라고 말한다", () => {
    // 지금 받는 돈은 전부 계좌이체다. 서버는 결제 키가 없는 주문을 대행사
    // 없이 취소로 옮기므로, 환불은 사람이 먼저 해야 한다. 화면이 "결제도
    // 함께 취소됐다"고 말하면 환불 안 된 취소가 생긴다.
    const guide = cancelGuide(false);
    expect(guide.description).toContain("환불");
    expect(guide.description).toContain("시스템이 하지 않습니다");
    expect(guide.confirm("PE-2026-000201")).toContain("PE-2026-000201");
    expect(guide.confirm("PE-2026-000201")).toContain("환불");
    expect(guide.done).not.toContain("결제도 함께 취소");
  });

  it("결제 대행사 주문에는 결제 취소가 함께 간다고 말한다", () => {
    const guide = cancelGuide(true);
    expect(guide.description).toContain("결제 취소");
    expect(guide.done).toContain("결제도 함께 취소");
  });

  it("요구서가 정한 취소 사유를 그대로 둔다", () => {
    expect(CANCEL_REASONS).toEqual([
      "고객 요청",
      "사진 품질 미달",
      "제작 불가 상품",
      "재고·운영상 사유",
      "주소·연락처 확인 불가",
    ]);
  });
});
