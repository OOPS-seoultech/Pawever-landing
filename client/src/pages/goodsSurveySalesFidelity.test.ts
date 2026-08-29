import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 2차 랜딩을 판매 우선으로 다시 세운 근거는 피그마 코멘트 #8이다.
 *
 *   "그래서 굿즈 사라는 거야 말라는 거야"라는 생각이 들어요.
 *   이 랜딩페이지의 목적이 ① 굿즈 사라 ② 설문하고 좀 더 싸게 살 수도 있다
 *   이렇게 두 가지 정도인 거 같은데, 1번 내용을 더 강조해야 할 거 같습니다.
 *
 * 화면 문구와 순서는 나혜님이 그 지시를 반영해 그린 Body 프레임
 * (Figma 0uW99BqaTJKUVlowzQswli / 5423:1415)을 기준으로 한다.
 * 여기 적힌 문장은 전부 그 프레임에서 그대로 가져온 것이고,
 * 임의로 고쳐 쓰지 않는다.
 */
const landing = readFileSync(
  new URL("./GoodsSurvey.tsx", import.meta.url),
  "utf8"
).replace(/\s+/g, " ");

const orderOf = (needle: string) => {
  const at = landing.indexOf(needle);
  expect(at, `화면에 없는 문구: ${needle}`).toBeGreaterThan(-1);
  return at;
};

describe("2차 랜딩은 사는 이야기를 먼저 한다", () => {
  it("첫 화면이 설문이 아니라 상품과 가격을 말한다", () => {
    // 예전 히어로는 "지금 설문에 참여하면 ... 얼리버드 전용가로"였다.
    // 설문을 팔면 굿즈를 사러 온 사람이 무엇을 사는지 모른 채 지나간다.
    expect(landing).toContain("오늘의 모습은");
    expect(landing).toContain("지금만 남길 수 있으니까.");
    expect(landing).toContain("우리 아이 사진으로 만드는");
    expect(landing).toContain("세상에 하나뿐인 3D 전신 피규어");
    expect(landing).toContain("PAWEVER 커스텀 3D 전신 피규어");
    expect(landing).not.toContain(
      "지금 설문에 참여하면 커스텀 3D 피규어 v.2를"
    );
  });

  it("히어로 CTA가 설문이 아니라 구매로 간다", () => {
    expect(landing).toContain("에 우리 아이 피규어 구매하기");
    // 설문은 같은 자리에서 '더 싼 길'로만 안내한다(코멘트 #15의 위계).
    expect(landing).toContain("설문으로 할인은 처음이죠");
    expect(landing).toContain("설문하지 않아도 바로 구매할 수 있어요");
  });

  it("섹션이 구매 → 근거 → 두 갈래 → 설문 이유 순서로 선다", () => {
    const hero = orderOf("지금만 남길 수 있으니까.");
    const why = orderOf("300장도 넘는 사진");
    const figure = orderOf("가족끼리만 알아보는");
    const proof = orderOf("하루 만에 마감됐습니다.");
    const purchase = orderOf("설문은 구매 조건이 아닙니다.");
    const wait = orderOf("그런데 왜");
    const faq = orderOf("자주 묻는 질문");

    expect(hero).toBeLessThan(why);
    expect(why).toBeLessThan(figure);
    expect(figure).toBeLessThan(proof);
    expect(proof).toBeLessThan(purchase);
    // 설문 설득(잠깐!)은 구매 갈림길 뒤에 온다. 먼저 오면 다시 설문 랜딩이 된다.
    expect(purchase).toBeLessThan(wait);
    // 코멘트 #13: 자주 묻는 질문 최하단 이동.
    expect(wait).toBeLessThan(faq);
  });

  it("두 갈래에서 바로 주문이 설문 주문보다 위에 있다", () => {
    // 코멘트 #15: "바로 굿즈 구매 / 설문 후 굿즈 구매 이 순서대로 위계를 세우는 게
    // 좋을 거 같아요 (우리도 더 비싸게 사는 사람 있으면 좋음)".
    expect(orderOf("바로 주문하기")).toBeLessThan(
      orderOf("설문과 함께 주문하기")
    );
    expect(landing).toContain("설문 없이 바로 구매");
    // 디자인은 "약 10~15분 설문 참여 · 6,000원 할인"이라고 적혀 있지만,
    // 금액은 goodsSurveyContent.ts 한 곳에서만 관리하므로 손으로 적지 않는다.
    //
    // 줄이 길어지면 프리티어가 사이에 {" "}를 끼워 넣는다. 붙어 있는지가
    // 아니라 무엇을 끼워 읽는지가 중요하므로 그 자리를 비워 둔다.
    expect(landing).toContain('duration: "약 10~15분"');
    expect(landing).toMatch(
      /\{CAMPAIGN\.duration\} 설문 참여 · \{won\(GOODS_SURVEY_DISCOUNT\)\}\s*(\{" "\})?\s*할인/
    );
  });

  it("설문으로 얼마가 깎이는지 두 금액을 나란히 보여준다", () => {
    // 코멘트 #10: 29,900원에서 23,900원 가격 깎이는 거 더 직관적으로 크게.
    expect(landing).toContain("gs-wait-drop");
    expect(landing).toContain("구매할 수 있나요?");
    expect(landing).toContain("구매 의무 없음 · 광고성 정보 수신 선택");
  });

  it("제목이 값이 아니라 깎이는 액수를 말한다", () => {
    // 8/30 디자인 수정. "그런데 왜 23,900원에 구매할 수 있나요?" 였다.
    // 파는 값이 아니라 깎아 주는 액수를 물어야 다음 문단의 답(설문 참여)과 이어진다.
    expect(landing).toContain(
      "그런데 왜 {won(GOODS_SURVEY_DISCOUNT)}이나 저렴하게"
    );
    expect(landing).not.toContain("그런데 왜 {won(PRICE.member)}에");
  });

  it("노란 손 표시로 설문 설득 구간을 끊어 준다", () => {
    // 코멘트 #24: 여기 위에 노란색 손모양으로 직관적이고 강렬하게 '잠깐!' 표시.
    expect(landing).toContain("gs-wait");
    expect(landing).toContain("잠깐!");
    expect(landing).toContain("✋");
  });

  it("잠깐! 과 제목과 이유를 한 장의 카드에 담는다", () => {
    // 디자인은 이 셋을 주황 테두리 흰 카드로 묶는다(5423:1750). 처음 옮길 때
    // 카드를 빼먹어 세 덩어리가 배경 위에 흩어져 있었다.
    expect(landing).toContain("gs-wait-card");
    expect(landing).toMatch(
      /gs-wait-card[\s\S]{0,120}?잠깐![\s\S]{0,400}?제작비 일부를 지원합니다/
    );
  });

  it("남은 자리를 유료 판매 문구로 말한다", () => {
    // 디자인에는 1차 무료 체험단 때 문구가 '무료 선착순 100명 한정'으로 남아 있다.
    // 2차는 29,900원을 받는 판매라 그대로 옮기면 화면이 거짓말을 한다.
    expect(landing).toContain("선착순 {capacity}명 한정");
    expect(landing).not.toContain("무료 선착순");
  });

  it("구매 버튼에서 설문 안내로 내려가는 화살표를 둔다", () => {
    // 디자인 5423:1457. 구매 버튼과 '더 싼 길' 카드를 잇는 표시다.
    expect(landing).toContain("down-arrow.png");
  });

  it("설문 할인가를 주황 밑줄로 눈에 띄게 적는다", () => {
    // 디자인은 이 한 줄만 #ed7d1a 22px 밑줄이다. 구매가 옆에서 유일하게
    // 눈에 걸리는 자리라, 평범한 글씨로 두면 '더 싼 길'이 보이지 않는다.
    expect(landing).toContain("gs-hero-sub-price");
  });

  it("후기마다 작성자 자리를 둔다", () => {
    // 디자인 5423:1660. 이름과 별점만 있으면 후기 카드로 읽히지 않는다.
    expect(landing).toContain("gs-voice-avatar");
  });

  it("자주 묻는 질문은 모두 닫힌 채로 연다", () => {
    // 디자인은 일곱 개가 전부 닫혀 있다. 하나를 열어 두면 그 답만 읽힌다.
    expect(landing).not.toContain("open={index === 0}");
    expect(landing).toContain("gs-faq-toggle");
  });

  it("자주 묻는 질문 일곱 개를 디자인대로 싣는다", () => {
    [
      "설문을 하지 않아도 구매할 수 있나요?",
      "설문하면 무엇이 달라지나요?",
      "사진은 어떤 걸 보내야 하나요?",
      "실제 반려견과 얼마나 비슷하게 나오나요?",
      "2차는 몇 개만 판매하나요?",
      "배송비와 제작 기간은 어떻게 되나요?",
      "광고 수신에 동의해야 할인받을 수 있나요?",
    ].forEach(question => expect(landing).toContain(question));
    // 1차 무료 체험단을 전제로 쓴 문답은 더 이상 맞지 않는다.
    expect(landing).not.toContain("1차랑 2차랑 무엇이 다른가요?");
  });
});

describe("아직 오지 않은 것은 오지 않았다고 그린다", () => {
  it("디자인에 사진이 들어 있는 자리는 그 사진을 쓴다", () => {
    // 나혜님은 "플레이스홀더로 남겨 놓은 부분도 있다"고 했는데 전부로 읽고
    // 열두 칸을 모두 비워 놨었다. 실제로는 아홉 칸에 사진이 들어 있었다.
    const ready = landing.match(/ready: true/g) ?? [];
    expect(ready).toHaveLength(9);
    [
      "sales-hero-figure.png",
      "sales-why-now.png",
      "sales-step-trait.png",
    ].forEach(asset => expect(landing).toContain(asset));
  });

  it("아직 빈 세 칸만 무엇이 들어올 자리인지로 남긴다", () => {
    // 04 책상 위 · 05 3D 제작 · 05 수작업 검수. 디자인에도 체커보드다.
    const pending = landing.match(/ready: false/g) ?? [];
    expect(pending).toHaveLength(3);
    expect(landing).toContain("gs-figure--pending");
    expect(landing).toContain('role="img"');
    expect(landing).toContain("모니터의 3D 모델과 출력기");
  });

  it("사진은 디자인이 정한 크기를 두 축 모두 들고 있다", () => {
    // 늦게 불러오는 동안 높이가 0이면 자리가 밀린다. 도장에서 이미 겪었다.
    expect(landing).toContain("width={slot.w}");
    expect(landing).toContain("height={slot.h}");
  });

  it("1차 마감 도장은 실제 그래픽을 쓴다", () => {
    // 디자인의 Image (CLOSED) 는 자리표시가 아니라 실물 도장 이미지다
    // (8/30 수정에서 더 크게, 카드를 가로지르도록 바뀌었다).
    expect(landing).toContain("closed-stamp.png");
    expect(landing).toContain('alt=""');
  });

  it("후기가 확보되지 않았음을 후기 옆에 밝힌다", () => {
    // 코멘트 #18은 "좀 더 실제 리뷰 작성된 것처럼"이지만, 확보 전까지
    // 예시 문장을 진짜 후기처럼 두면 그건 없는 후기를 지어내는 것이다.
    expect(landing).toContain(
      "실제 후기 확보 후 검증된 문장과 참여자 정보로 교체"
    );
  });

  it("굿즈가 닫혀 있으면 구매 버튼을 그리지 않는다", () => {
    // 판매 우선으로 바꾸면서 화면 곳곳이 구매 버튼이 됐다. 굿즈 스위치가
    // 꺼져 있을 때 이 버튼들이 그대로 살아 있으면, 누를 때마다 서버가
    // 거절하는 자리로 사람을 보낸다.
    expect(landing).toContain("campaign?.goodsOpen ?? false");
    expect(landing).toContain("2차 오픈 시 신청할 수 있어요");
    expect(landing).toMatch(
      /goodsAvailable \? \([\s\S]{0,400}?startDirectPurchase/
    );
  });
});
