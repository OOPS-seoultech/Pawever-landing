import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
it("판매 페이지에 설문 제안이나 설문 모달을 남기지 않는다", () => {
  const source = readFileSync(
    new URL("./GoodsSurvey.tsx", import.meta.url),
    "utf8"
  );
  expect(source).not.toMatch(/설문|PRICE\.member|gs-modal|openCta/);
});
