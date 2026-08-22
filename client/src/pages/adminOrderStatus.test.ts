import { describe, expect, it } from "vitest";
import {
  canRegisterTracking,
  filterableStatusesFor,
  photoSlotRows,
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
