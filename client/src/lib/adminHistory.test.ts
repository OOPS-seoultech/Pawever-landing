import { describe, expect, it } from "vitest";
import { accessActionLabel } from "./adminHistory";

describe("열람 이력 표시", () => {
  it("서버의 행동 코드를 한국어로 표시한다", () => {
    expect(accessActionLabel("ADDRESS_VIEW")).toBe("배송 정보 열람");
    expect(accessActionLabel("PHOTO_VIEW")).toBe("고객 사진 열람");
    expect(accessActionLabel("PHOTO_DOWNLOAD")).toBe("고객 사진 다운로드");
    expect(accessActionLabel("ORDER_CANCEL_FAILED")).toBe("주문 취소 실패");
    expect(accessActionLabel("ORDER_CANCEL")).toBe("주문 취소");
  });
  it("새 행동 코드는 숨기거나 잘못 번역하지 않는다", () => {
    expect(accessActionLabel("NEW_ACTION")).toBe("NEW_ACTION");
  });
});
