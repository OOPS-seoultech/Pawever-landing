/**
 * 설문·신청 화면에서 뒤로 갈 곳을 정한다.
 *
 * 이 화면은 두 갈래로 들어온다. 상시 판매는 설문을 거쳐 오고, 플리마켓은
 * 랜딩에서 곧장 제작 정보로 온다. 뒤로가기는 이 둘을 갈라 봐야 하는데,
 * 갈라 보지 않으면 직행으로 온 사람이 "설문 응답 완료" 화면을 만난다 —
 * 하지도 않은 설문을 마쳤다고 하는 화면이다.
 *
 * 정하는 일을 화면에서 떼어 낸 이유는 자리가 넷이기 때문이다. 머리말의
 * 뒤로가기, goBack, 완료 화면의 "돌아가기", 사연 화면의 "처음 화면으로".
 * 넷이 저마다 정하면 이번처럼 셋만 고치고 하나를 놓친다.
 */

export type SurveyChannel = "online" | "flea";

export type BackTarget =
  /** 이 화면 안에서 앞 단계로. */
  | { kind: "stage"; stage: "closing" | "story" }
  /** 문항 화면은 앞 문항이 무엇인지 화면이 안다. */
  | { kind: "question" }
  /** 이 화면을 떠나 온 곳으로. */
  | { kind: "landing"; path: string };

/**
 * 어느 랜딩에서 왔는지.
 *
 * 상시 판매 랜딩은 값도 수령 방법도 다르다. 현장에서 QR 을 찍고 온 사람을
 * 그쪽으로 보내면 자기가 보던 화면이 아니다.
 */
export const landingPathFor = (channel: SurveyChannel): string =>
  channel === "flea" ? "/flea" : "/goods-survey";

export const backTargetFrom = (input: {
  stage: string;
  /** 설문을 거치지 않고 곧장 제작 정보로 온 사람인지. */
  directPurchase: boolean;
  channel: SurveyChannel;
  /** 사연을 한 글자라도 썼는지. 안 썼으면 그 화면으로 돌아갈 이유가 없다. */
  hasStory: boolean;
}): BackTarget => {
  const landing = { kind: "landing", path: landingPathFor(input.channel) } as const;

  // 직행으로 온 사람에게는 이 화면 안에 앞 단계가 없다. 기다리는 화면과
  // 제작 정보뿐이라, 뒤로가기는 언제나 온 곳으로 나가는 것이다.
  if (input.directPurchase) {
    return landing;
  }

  if (input.stage === "story") {
    return { kind: "stage", stage: "closing" };
  }
  if (input.stage === "production") {
    return { kind: "stage", stage: input.hasStory ? "story" : "closing" };
  }
  if (input.stage === "questions") {
    return { kind: "question" };
  }
  return landing;
};
