import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const source = readFileSync(
  new URL("./GoodsSurvey.tsx", import.meta.url),
  "utf8"
);
describe("판매 이미지", () => {
  it("플리마켓 제작 이미지와 익명 후기 네 장이 실제 파일이다", () => {
    const assets = [...source.matchAll(/src: "([^"]+)"/g)].map(
      match => match[1]
    );
    expect(assets.length).toBeGreaterThan(5);
    for (const file of [
      ...assets,
      ...[1, 2, 3, 4].map(n => `customer-review-${n}.jpg`),
    ])
      expect(
        existsSync(
          new URL(`../../public/goods-survey/${file}`, import.meta.url)
        ),
        file
      ).toBe(true);
  });
});
