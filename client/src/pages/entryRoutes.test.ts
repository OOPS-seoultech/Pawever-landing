import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
it("홈의 옛 설문 진입 링크를 제거한다", () => {
  const home = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");
  expect(home).not.toContain('href="/goods-survey/survey"');
  expect(home).not.toContain("15분 설문");
  expect(home).toContain(
    'const DIRECT_PURCHASE = "/goods-survey/survey?direct=1"'
  );
});
