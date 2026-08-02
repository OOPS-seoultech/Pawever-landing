import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const policySource = readFileSync(
  new URL("./PrivacyPolicy.tsx", import.meta.url),
  "utf8"
);

describe("개인정보 처리방침", () => {
  it("국외로 데이터를 보내는 분석·광고 도구를 모두 밝힌다", () => {
    // 광고 목적 태그를 켜 두고 고지가 없으면 그 자체가 위험이다.
    // 도구를 빼기 전에는 이 문구도 지우면 안 된다.
    expect(policySource).toContain("Google Analytics 4");
    expect(policySource).toContain("Meta Pixel");
  });

  it("국외 이전 조항에 이전받는 자·항목·목적·보유기간·거부 방법을 담는다", () => {
    // 개인정보보호법 제28조의8이 요구하는 고지 항목이다.
    expect(policySource).toContain("제7조 (개인정보의 국외 이전)");
    expect(policySource).toContain("Google LLC (미국)");
    expect(policySource).toContain("Meta Platforms, Inc. (미국)");
    expect(policySource).toContain("이전 항목:");
    expect(policySource).toContain("이용 목적:");
    expect(policySource).toContain("보유 기간:");
    expect(policySource).toContain("이전 거부 방법");
  });

  it("설문 답변과 개인정보는 국외로 보내지 않는다고 못 박는다", () => {
    // 코드에서도 sanitizeAnalyticsProperties가 이 항목들을 막고 있다.
    // 둘 중 하나만 바뀌면 문서와 구현이 어긋난다.
    expect(policySource).toContain(
      "설문 답변, 이름, 연락처, 배송지와 반려견 사진은 국외로 이전되지"
    );
  });

  it("조항 번호가 1조부터 빠짐없이 이어진다", () => {
    const numbers = [...policySource.matchAll(/제(\d+)조 \(/g)].map(match =>
      Number(match[1])
    );
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
