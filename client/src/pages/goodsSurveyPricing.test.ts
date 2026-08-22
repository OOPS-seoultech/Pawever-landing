import { describe, expect, it } from "vitest";
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
