import { describe, expect, it } from "vitest";
import {
  canRegisterTracking,
  filterableStatusesFor,
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
    const production = filterableStatusesFor("PRODUCTION");
    expect(production).not.toContain("PAYMENT_PENDING");
    expect(production).not.toContain("PAYMENT_EXPIRED");
    expect(production).not.toContain("LEGACY_FREE");
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
