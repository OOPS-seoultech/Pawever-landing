import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const landingSource = readFileSync(
  new URL("./GoodsSurvey.tsx", import.meta.url),
  "utf8"
);

describe("굿즈 랜딩 피그마 기준본", () => {
  it("피그마의 핵심 문구를 임의로 바꾸지 않는다", () => {
    expect(landingSource).toContain(
      "그런데 표정과 털무늬까지 닮게 만들고, 얼굴을 3D로 세우거나 전신으로 제작하려면 옵션마다 금액이 붙어 생각보다 비싸집니다."
    );
    expect(landingSource).toContain(
      "한쪽만 접히는 귀, 코 옆의 작은 점, 웃을 때 올라가는 입꼬리처럼 우리 가족만 알아보는 우리 아이의 모습이 남았으면 하는 마음."
    );
    expect(landingSource).toContain(
      "사진첩 속에만 있던 그 표정을 매일 손에 잡히는 모습으로 만들어드리고 싶어요."
    );
  });

  it("제공받은 실제 이미지 자산을 사용하고 임시 스프라이트를 사용하지 않는다", () => {
    [
      "hero-original.png",
      "hero-acrylic.png",
      "hero-face-keyring.png",
      "hero-fullbody.png",
      "price-comparison.png",
      "product-acrylic.png",
      "product-keycap.png",
      "product-backplate.png",
      "product-figure.png",
      "process-reference.png",
      "why-free.png",
      "final-banner.png",
    ].forEach(asset => expect(landingSource).toContain(asset));

    expect(landingSource).not.toContain("ProductSprite");
    expect(landingSource).not.toContain("StorySprite");
    expect(landingSource).not.toContain("product-sprite-v1.png");
    expect(landingSource).not.toContain("story-sprite-v1.png");
  });
});
