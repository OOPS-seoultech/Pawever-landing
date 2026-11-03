import { expect, it } from "vitest";
import { landingPathFor } from "./goodsSurveyNavigation";
it("주문을 시작한 랜딩으로 돌아간다", () => {
  expect(landingPathFor("online")).toBe("/goods-survey");
  expect(landingPathFor("flea")).toBe("/flea");
});
