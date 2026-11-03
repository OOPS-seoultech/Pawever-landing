/** 랜딩·주문 동의 금액은 서버의 통로별 가격과 같아야 한다. */
export const GOODS_PRICE = {
  list: 29_900,
  presale: 25_900,
  /* 과기대 플리마켓 현장 한정가. 서버의 flea-discount-krw 를 뺀 값과 같다
     (29,900 − 11,000 = 18,900). 어긋나면 동의 문구에 적은 금액과 청구되는
     금액이 달라진다. */
  flea: 18_900,
  competitor: 350_000,
  shipping: 3_000,
  /* 키링 부자재값. 서버의 keyring-fee-krw 와 같아야 한다. 어긋나면 동의
     문구에 적은 금액과 청구되는 금액이 달라진다. */
  keyring: 2_000,
} as const;

/**
 * 현장가가 정가에서 몇 퍼센트 내려온 것인지.
 *
 * 손으로 적으면 값을 올린 날 할인율만 옛 수로 남는다. 값을 올려 놓고
 * 옛 할인율을 그대로 적으면 그냥 틀린 게 아니라 거짓 표시다. 값 하나만
 * 고치면 화면이 따라오게 둔다 — 9/9 하루에 두 번 올렸는데 두 번 다 여기만
 * 고쳤다.
 *
 * 소수 한 자리로 적는다 — 디자인이 "60.2%"처럼 한 자리를 쓴다.
 */
export const fleaDiscountPercentText = () =>
  (((GOODS_PRICE.list - GOODS_PRICE.flea) / GOODS_PRICE.list) * 100).toFixed(1);

/** 판매 통로별 제작비. 서버가 같은 금액을 계산한다. */
export const applicablePriceKrw = (channel: "online" | "flea" = "online") =>
  channel === "flea" ? GOODS_PRICE.flea : GOODS_PRICE.presale;

/**
 * 이 사람이 실제로 낼 금액.
 *
 * 제작비·부자재·배송비가 세 곳에서 따로 계산되고 있었다. 동의 문구가 적는
 * 금액과 서버가 청구하는 금액이 어긋나면, 사람은 동의한 적 없는 돈을
 * 청구받는다. 한 곳에서 세고 화면은 그 값을 읽기만 한다.
 *
 * 서버의 GoodsOrderPricing 과 같은 순서로 센다 — 정가에서 깎고, 부자재를
 * 더하고, 배송비를 더한다.
 */
export const payableKrw = (input: {
  channel: "online" | "flea";
  deliveryMethod: "shipping" | "pickup";
  /**
   * 신청한 아이 수. 적지 않으면 한 마리로 본다.
   *
   * 제작비는 아이마다 붙는다. 한 주문에 두 마리를 신청받고 한 마리 값만
   * 받은 일이 있었다.
   */
  petCount?: number;
  /**
   * 키링을 고른 아이 수.
   *
   * 키링은 아이마다 따로 고르므로 마리 수와 다를 수 있다. 예전처럼 참·거짓을
   * 보내면 한 마리분으로 센다.
   */
  keyringAdded: boolean | number;
}) => {
  const petCount = Math.max(1, input.petCount ?? 1);
  const keyringCount =
    typeof input.keyringAdded === "number"
      ? input.keyringAdded
      : input.keyringAdded
        ? 1
        : 0;
  return (
    applicablePriceKrw(input.channel) * petCount +
    GOODS_PRICE.keyring * keyringCount +
    // 한 상자에 담아 한 번 부친다. 몇 마리든 배송비는 한 번이다.
    shippingFeeKrw(input.deliveryMethod)
  );
};

/**
 * 이 주문에 붙는 배송비.
 *
 * 현장에서 받아가면 부치지 않으니 받을 이유가 없다.
 * 근거: [피그마 5472:1482] "방문수령 외 택배 시 배송비 3,000원 별도"
 */
export const shippingFeeKrw = (deliveryMethod: "shipping" | "pickup") =>
  deliveryMethod === "pickup" ? 0 : GOODS_PRICE.shipping;

/**
 * 연락처를 사람이 읽는 모양으로 맞춘다.
 *
 * "형식에 맞춰 작성해주세요"만 띄우면 하이픈을 넣으라는 건지 빼라는 건지
 * 알 수 없다. 숫자만 받아 하이픈은 화면이 넣는다 — 사람에게 규칙을 지키게
 * 하는 대신 규칙을 없앤다.
 *
 * 010 은 열한 자리(3-4-4), 011·016~019 는 열 자리(3-3-4)다. 다 치기 전에는
 * 앞에서부터 채운 만큼만 보여 준다.
 */
export const formatPhoneNumber = (value: string) => {
  // 연락처 앱에서 붙여넣으면 +82 10-... 로 온다. 그대로 두면 821-0123-4567
  // 이라는 없는 번호가 만들어진다.
  const digits = value
    .replace(/\D/g, "")
    .replace(/^82(?=1)/, "0")
    .slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

export const wonText = (value: number) => `${value.toLocaleString("ko-KR")}원`;

export const goodsSurveyProductionContent = {
  title: "우리 아이 피규어를 주문해 주세요.",
  lead: "수작업 3D 굿즈 특성상 5일에서 최대 3주까지 시간이 소요될 수 있어요. 제공하신 정보는 굿즈 배송 완료일로부터 3개월 뒤 모두 삭제됩니다.",
  phoneFormatError: "휴대폰 번호를 끝까지 입력해 주세요 (예: 010-1234-5678)",
  safety:
    "본 굿즈는 보호자용 키링 또는 전시용입니다. 제품 소재 특성상 반려견이 물거나 삼키지 않도록 각별히 주의해 주세요.",
  // 사진 공개는 사연과 따로 묻는다. 올린 사진을 보면서 답하도록 사진 단계에 둔다.
  photoPublishConsent:
    "올려주신 사진을 PAW-EVER 웹사이트·SNS에 소개해도 괜찮을까요?",
  photoPublishConsentNote:
    "동의하지 않으셔도 굿즈 제작과 배송에는 영향이 없어요. 제작이 끝나면 사진은 삭제됩니다.",
} as const;

export const goodsSurveyPrivacyContent = [
  ["수집 항목", "반려견 사진, 이름/연락처, 배송지"],
  ["이용 목적", "굿즈 제작·발송, 문의 대응"],
  ["보유·파기", "굿즈 배송 완료일로부터 3개월 뒤 삭제"],
  ["동의 거부", "동의를 거부할 수 있으며, 거부 시 제작 및 배송이 어렵습니다."],
] as const;
