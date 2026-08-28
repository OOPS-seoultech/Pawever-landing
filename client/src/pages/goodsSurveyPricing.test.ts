import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applicablePriceKrw, GOODS_PRICE } from "./goodsSurveyContent";

/**
 * 화면에 적힌 금액과 서버가 청구하는 금액을 붙들어 둔다.
 *
 * 한쪽만 고치면 동의하고 누른 금액과 빠져나가는 금액이 달라진다.
 *
 * 아래 값은 11차 회의록에서 정한 2차 가격이고, Pawever-back 의
 * application.yaml 과 같아야 한다.
 *   survey.goods.list-price-krw      = 29900
 *   survey.goods.survey-discount-krw = 6000   (29,900 - 23,900)
 *   survey.goods.shipping-fee-krw    = 3000
 *
 * 값을 바꿔야 하면 서버부터 바꾸고 여기를 맞춘다. 여기만 고치면 화면만
 * 바뀌고 청구는 그대로다.
 */
describe("굿즈 가격", () => {
  it("정가와 설문 참여자 가격이 회의록·서버와 같다", () => {
    expect(GOODS_PRICE.list).toBe(34_900);
    expect(GOODS_PRICE.presale).toBe(29_900);
    expect(GOODS_PRICE.member).toBe(23_900);
    expect(GOODS_PRICE.shipping).toBe(3_000);
  });

  it("설문을 거치지 않고 바로 신청하면 사전판매가를 낸다", () => {
    // 동의 문구가 이 값을 적는다. 설문 참여자 가격을 고정으로 적어 두면
    // 바로 신청한 사람은 23,900에 동의하고 29,900을 결제하게 된다.
    expect(applicablePriceKrw(true)).toBe(GOODS_PRICE.presale);
    expect(applicablePriceKrw(false)).toBe(GOODS_PRICE.member);
  });

  it("서버가 매기는 할인액과 같은 차이를 보여 준다", () => {
    // 서버의 survey-discount-krw = 6000
    expect(GOODS_PRICE.presale - GOODS_PRICE.member).toBe(6_000);
  });
});

/**
 * 랜딩이 화면에 적는 금액이 서버가 청구하는 금액과 같은지 본다.
 *
 * 위 묶음은 goodsSurveyContent.ts 의 상수만 봤다. 상수가 맞아도 화면이 어느
 * 상수를 고르는지가 틀리면 소용이 없다. 실제로 틀어져 있었다.
 *
 *   - '일반 구매자' 카드가 정가 34,900원을 적고 있었다. 그 사람이 실제로
 *     내는 값은 서버의 list-price-krw = 29,900원이다.
 *   - 마지막 CTA 가 '설문하고 -11,000원 혜택 받기' 였다. 34,900 - 23,900 이다.
 *     서버가 깎아 주는 값은 survey-discount-krw = 6,000원이다.
 *
 * 34,900원은 정가다. 취소선으로 보여 주는 자리에는 그대로 둔다. 실구매가와
 * 할인폭을 말하는 자리에서만 쓰면 안 된다.
 */
const landing = readFileSync(
  join(__dirname, "GoodsSurvey.tsx"),
  "utf-8"
).replace(/\s+/g, " ");

describe("랜딩이 말하는 금액", () => {
  it("설문 없이 사는 사람에게 실제로 낼 값을 보여 준다", () => {
    // 판매 우선 화면이 되면서 구매가를 말하는 자리가 여럿으로 늘었다 —
    // 히어로 상품 카드, 08 PURCHASE 의 '바로 주문하기', 09 FINAL, 하단 고정
    // 버튼, 그리고 '잠깐!' 의 취소선. 자리마다 확인하는 대신, 아무도 그 값에
    // 사지 않는 정가를 화면이 아예 입에 담지 않는지로 본다.
    expect(landing).not.toContain("PRICE.list");
    expect(landing).not.toMatch(/34,900/);
    expect(landing).toContain("{won(PRICE.presale)}");
  });

  it("할인폭을 서버가 깎아 주는 액수로 말한다", () => {
    // 정가에서 빼면 안 된다. 정가는 아무도 그 값에 사지 않는다.
    expect(landing).toContain("won(GOODS_SURVEY_DISCOUNT)");
    expect(landing).not.toContain("PRICE.list - PRICE.member");
  });
});
