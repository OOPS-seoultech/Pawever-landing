import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 향후 방향이 피그마와 같은지 본다.
 *
 * 기준 프레임은 피그마 8. Website 의
 * `Identify and Connect Home Component` > `Component` (5210:2024) 이다.
 *
 * 여기서 잡으려는 것은 "카드로 만들어 두는 버릇"이다. 서비스 소개도, 앱
 * 서비스도, 이 화면도 피그마는 선으로 나눈 줄인데 셋 다 카드로 만들어져
 * 있었다. 문구만 맞춰 보면 세 번 다 통과했다.
 */
const page = readFileSync(join(__dirname, "Roadmap.tsx"), "utf-8");
const flat = page.replace(/\s+/g, " ");

describe("향후 방향 구조", () => {
  it("카드가 아니라 선 위의 연표다", () => {
    // 카드로 두면 세 해가 나란한 항목처럼 보이고, 시간의 방향이 사라진다.
    expect(flat).toContain("bg-gradient-to-r from-[#FFDFBE] to-[#6A2C03]");
    expect(flat).not.toContain("rounded-[24px] border border-border bg-card p-7");
  });

  it("해마다 점이 하나씩 찍힌다", () => {
    expect(flat).toContain('className="relative block h-2 w-2 rounded-[4px]"');
  });

  it("연도 색이 세 개로 갈린다", () => {
    // 셋 다 주황으로 두면 위를 지나는 그라데이션과 연결이 끊긴다.
    ['tone: "#FF9F43"', 'tone: "#BF6021"', 'tone: "#6A2C03"'].forEach(tone =>
      expect(flat).toContain(tone)
    );
  });

  it("2027·2028 만 왼쪽에 선이 선다", () => {
    // 2026 에는 없다. 셋 다 두면 첫 칸 왼쪽에 근거 없는 선이 생긴다.
    expect(flat).toContain("index > 0 ? \"md:border-l-[3px] md:border-border md:pl-8\"");
  });

  it("연도는 40px Black 이다", () => {
    // Bold(700)가 아니라 Black(900) 이다.
    expect(flat).toContain("text-[40px] font-black");
  });
});

describe("향후 방향 문구", () => {
  it("맺음말이 기준 프레임 문구다", () => {
    // "사용자의 경험부터 반영합니다" 로 두었던 적이 있다. 주어가 다르다.
    expect(flat).toContain("여러분의 경험으로부터 시작됩니다");
    expect(flat).not.toContain("사용자의 경험부터 반영합니다");
  });

  it("세 해의 제목을 그대로 둔다", () => {
    [
      "기록 기반 서비스 정비",
      "선제적 케어 기능 확장",
      "생애주기 케어 연결",
    ].forEach(title => expect(flat).toContain(title));
  });

  it("해마다 제품 방향과 연결 방향을 나눈다", () => {
    expect(page.match(/label="제품 방향"/g) ?? []).toHaveLength(1);
    expect(page.match(/label="연결 방향"/g) ?? []).toHaveLength(1);
    expect(flat).toContain("MILESTONES.map");
  });

  it("제휴 문의하기만 굵다", () => {
    // 피그마는 설문 버튼이 Medium, 제휴 버튼이 Bold 다.
    expect(flat).toContain("text-sm font-bold");
  });
});
