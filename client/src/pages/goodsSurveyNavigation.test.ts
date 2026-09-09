import { describe, expect, it } from "vitest";
import { backTargetFrom, landingPathFor } from "./goodsSurveyNavigation";

describe("설문 화면에서 뒤로 갈 곳", () => {
  it("플리마켓에서 온 사람은 플리마켓 랜딩으로 돌아간다", () => {
    // 상시 판매 랜딩은 값도 수령 방법도 다르다. 현장에서 QR 을 찍고 온
    // 사람을 그쪽으로 보내면 자기가 보던 화면이 아니다.
    expect(landingPathFor("flea")).toBe("/flea");
    expect(landingPathFor("online")).toBe("/goods-survey");
  });

  it("직행으로 온 사람은 제작 화면에서 설문 화면으로 가지 않는다", () => {
    // 설문을 거치지 않고 들어왔는데 뒤로가기를 누르면 "설문 응답 완료"가
    // 떴다. 하지도 않은 설문을 마쳤다고 하는 화면이다.
    expect(
      backTargetFrom({
        stage: "production",
        directPurchase: true,
        channel: "flea",
        hasStory: false,
      })
    ).toEqual({ kind: "landing", path: "/flea" });
  });

  it("기다리는 화면에서도 온 곳으로 돌아간다", () => {
    expect(
      backTargetFrom({
        stage: "preparing",
        directPurchase: true,
        channel: "flea",
        hasStory: false,
      })
    ).toEqual({ kind: "landing", path: "/flea" });
  });

  it("설문을 거쳐 온 사람의 길은 그대로다", () => {
    // 직행이 아닌 사람에게는 앞 화면이 실제로 있다. 고쳐서 그 길을 끊으면
    // 사연을 쓰다 만 사람이 돌아갈 곳을 잃는다.
    expect(
      backTargetFrom({
        stage: "production",
        directPurchase: false,
        channel: "online",
        hasStory: true,
      })
    ).toEqual({ kind: "stage", stage: "story" });

    expect(
      backTargetFrom({
        stage: "production",
        directPurchase: false,
        channel: "online",
        hasStory: false,
      })
    ).toEqual({ kind: "stage", stage: "closing" });

    expect(
      backTargetFrom({
        stage: "story",
        directPurchase: false,
        channel: "online",
        hasStory: true,
      })
    ).toEqual({ kind: "stage", stage: "closing" });
  });

  it("문항 화면은 앞 문항으로 간다", () => {
    expect(
      backTargetFrom({
        stage: "questions",
        directPurchase: false,
        channel: "online",
        hasStory: false,
      })
    ).toEqual({ kind: "question" });
  });

  it("설문으로 온 사람이 나갈 때도 온 곳으로 간다", () => {
    // 설문은 상시 판매에서만 열리지만, 통로를 하나로 두어야 나중에
    // 현장에서 설문을 열어도 이 자리를 다시 고치지 않는다.
    expect(
      backTargetFrom({
        stage: "closing",
        directPurchase: false,
        channel: "flea",
        hasStory: false,
      })
    ).toEqual({ kind: "landing", path: "/flea" });
  });
});
