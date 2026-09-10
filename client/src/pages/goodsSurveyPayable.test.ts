import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { GOODS_PRICE, payableKrw } from "./goodsSurveyContent";

/**
 * 동의 문구에 적는 금액.
 *
 * 화면이 적은 금액과 서버가 청구하는 금액이 어긋나면, 사람은 동의한 적 없는
 * 돈을 청구받는다. 서버의 GoodsOrderPricing 과 같은 순서로 센다 — 정가에서
 * 깎고, 부자재를 더하고, 배송비를 더한다.
 */
describe("낼 금액", () => {
  const flea = { directPurchase: true, channel: "flea" } as const;

  it("현장 수령에 키링을 안 붙이면 제작비 그대로다", () => {
    expect(
      payableKrw({ ...flea, deliveryMethod: "pickup", keyringAdded: false })
    ).toBe(14_900);
  });

  it("키링을 붙이면 부자재값이 더해진다", () => {
    expect(
      payableKrw({ ...flea, deliveryMethod: "pickup", keyringAdded: true })
    ).toBe(16_900);
  });

  it("택배면 배송비가 따로 더해진다", () => {
    expect(
      payableKrw({ ...flea, deliveryMethod: "shipping", keyringAdded: false })
    ).toBe(17_900);
    expect(
      payableKrw({ ...flea, deliveryMethod: "shipping", keyringAdded: true })
    ).toBe(19_900);
  });

  it("부자재값이 서버가 붙이는 값과 같다", () => {
    // 서버는 keyring-fee-krw 를 붙인다. 여기가 어긋나면 화면은 16,900원이라
    // 적어 두고 서버는 다른 값을 청구한다.
    expect(GOODS_PRICE.keyring).toBe(2_000);
  });

  it("상시 판매에는 키링을 받지 않는다", () => {
    // 현장에서 그 자리에 고리를 달아 주기로 한 것이다. 부치는 주문에 열어
    // 두면 달아 줄 사람이 없는 채로 돈만 더 받는다.
    const form = readFileSync(
      new URL("./GoodsSurveyForm.tsx", import.meta.url),
      "utf8"
    );
    const block = form.slice(form.indexOf("<legend>키링</legend>") - 400);

    expect(form).toContain("<legend>키링</legend>");
    expect(block.slice(0, 400)).toContain('channel === "flea"');
  });

  it("화면이 금액을 따로 더하지 않는다", () => {
    // 제작비·부자재·배송비를 화면에서 다시 더하면 한 곳만 고치는 날이 온다.
    const form = readFileSync(
      new URL("./GoodsSurveyForm.tsx", import.meta.url),
      "utf8"
    );

    expect(form).toContain("payableKrw({");
    expect(form).not.toContain(
      "applicablePriceKrw(directPurchase, channel) +"
    );
  });
});
