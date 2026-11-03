import { describe, expect, it } from "vitest";
import {
  goodsSurveyPrivacyContent,
  goodsSurveyProductionContent,
} from "./goodsSurveyContent";
it("제작 안내와 개인정보 보관·파기 안내를 유지한다", () => {
  expect(goodsSurveyProductionContent.lead).toContain("5일에서 최대 3주");
  expect(goodsSurveyPrivacyContent).toContainEqual([
    "보유·파기",
    "굿즈 배송 완료일로부터 3개월 뒤 삭제",
  ]);
  expect(goodsSurveyProductionContent.photoPublishConsentNote).toContain(
    "동의하지 않으셔도"
  );
});
