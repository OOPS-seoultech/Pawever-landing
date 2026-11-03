import { describe, expect, it } from "vitest";
import {
  GOODS_PRICE,
  applicablePriceKrw,
  payableKrw,
} from "./goodsSurveyContent";
describe("판매 금액", () => {
  it("기존 판매가 29900원에서 할인한 25900원이며 플리마켓 가격은 유지한다", () => {
    expect(GOODS_PRICE.list).toBe(29900);
    expect(applicablePriceKrw("online")).toBe(25900);
    expect(applicablePriceKrw("flea")).toBe(18900);
  });
  it("온라인 방문 수령은 25900원이고 택배는 28900원이다", () => {
    expect(
      payableKrw({
        channel: "online",
        deliveryMethod: "pickup",
        keyringAdded: false,
      })
    ).toBe(25900);
    expect(
      payableKrw({
        channel: "online",
        deliveryMethod: "shipping",
        keyringAdded: false,
      })
    ).toBe(28900);
  });
  it("아이 수와 키링은 개별 계산하고 배송비는 한번만 붙인다", () => {
    expect(
      payableKrw({
        channel: "online",
        deliveryMethod: "shipping",
        petCount: 2,
        keyringAdded: 1,
      })
    ).toBe(25900 * 2 + 2000 + 3000);
  });
});
