import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 홈 화면이 피그마와 같은 것을 말하는지 본다.
 *
 * 피그마 8. Website / Home Desktop 프레임에서 읽은 문구다. 실제로 어긋난 적이
 * 있다 — 카드 안에 있어야 할 실적 한 줄이 히어로 아래에만 있었고, 화면만
 * 봐서는 빠진 것인지 원래 없는 것인지 알 수 없었다.
 *
 * 문구를 바꿔야 하면 피그마부터 바꾸고 여기를 맞춘다.
 */
const home = readFileSync(
  join(__dirname, "Home.tsx"),
  "utf-8"
).replace(/\s+/g, " ");

describe("홈 화면 기준 문구", () => {
  it("세 가지 방법 카드에 카테고리·제목·설명이 있다", () => {
    [
      ["기록과 케어", "포에버 앱"],
      ["우리 아이 맞춤 제작", "3D 맞춤 굿즈 얼리버드"],
      ["함께 만드는 다음 서비스", "반려인 설문"],
    ].forEach(([category, title]) => {
      expect(home).toContain(category);
      expect(home).toContain(title);
    });
  });

  it("굿즈·설문 카드에 실적 한 줄이 붙는다", () => {
    // 피그마 CardContent 자리다. 빠지면 카드가 무엇을 이뤘는지 말하지 않는다.
    expect(home).toContain('proof: "우리 아이 완전 맞춤 3D굿즈 100건 제작 중"');
    expect(home).toContain('proof: "반려인 731명 조사 완료"');
  });

  it("앱 카드에는 실적을 지어내지 않는다", () => {
    // 피그마도 이 자리를 비워 둔다. 채우려면 실제 수가 있어야 한다.
    expect(home).toContain('proof: ""');
  });

  it("실적 줄을 화면에 그린다", () => {
    // 값만 넣고 그리지 않으면 시험은 통과하는데 화면은 그대로다.
    expect(home).toContain("{entry.proof}");
  });

  it("히어로 아래 실적 박스도 그대로 둔다", () => {
    // 피그마에 둘 다 있다. 위는 회사가 어디까지 왔는지, 카드는 이 길을
    // 고르면 무엇을 만나는지를 말한다.
    expect(home).toContain("반려견 생애주기에 따른 보호자의 행동 데이터를 모았습니다.");
    expect(home).toContain("보호자의 사진과 이야기를 바탕으로 한 맞춤 제작을 이어가고 있습니다.");
  });
});
