import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { GOODS_PRICE, fleaDiscountPercentText } from "./goodsSurveyContent";

describe("현장 한정가", () => {
  it("서버가 깎아 주는 값과 같은 값을 적는다", () => {
    // 서버는 정가에서 flea-discount-krw 를 뺀다(29,900 - 15,000). 여기가
    // 어긋나면 동의 문구에 적은 금액과 청구되는 금액이 달라진다.
    expect(GOODS_PRICE.presale - 15_000).toBe(GOODS_PRICE.flea);
    expect(GOODS_PRICE.flea).toBe(14_900);
  });

  it("할인율은 값에서 끌어낸다", () => {
    // 손으로 적으면 값을 올린 날 할인율만 옛 수로 남는다. 29,900원짜리를
    // 14,900원에 팔면서 "60.2% 할인"이라고 적으면 거짓 표시다.
    expect(fleaDiscountPercentText()).toBe("50.2");
  });

  it("랜딩이 할인율을 손으로 적지 않는다", () => {
    const landing = readFileSync(
      new URL("./FleaLanding.tsx", import.meta.url),
      "utf8"
    );

    expect(landing).not.toContain("60.2");
    // 값도 마찬가지다. 랜딩이 따로 들고 있으면 한쪽만 고치게 된다.
    expect(landing).not.toContain("11_900");
    expect(landing).not.toContain("13_900");
    expect(landing).not.toContain("14_900");
  });
});
