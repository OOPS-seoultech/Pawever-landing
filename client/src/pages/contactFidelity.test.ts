import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 문의가 피그마와 같은지 본다.
 *
 * 기준 프레임은 피그마 8. Website 의
 * `Identify and Connect Home Component` > `Component` (5210:2130) 이다.
 *
 * 서비스 소개·앱 서비스·향후 방향에 이어 여기도 카드로 만들어져 있었다.
 * 네 화면 모두 피그마는 줄이었다. 카드가 기본값이 아니라는 것을 붙들어 둔다.
 */
const page = readFileSync(join(__dirname, "Contact.tsx"), "utf-8");
const flat = page.replace(/\s+/g, " ");

describe("문의 구조", () => {
  it("카드 격자가 아니라 가로 줄 다섯 개다", () => {
    // 격자로 두면 유형을 훑어 내려가는 눈길이 줄마다 끊긴다.
    expect(flat).toContain("md:grid-cols-[288px_minmax(0,1fr)_288px]");
    expect(flat).not.toContain("md:grid-cols-2 lg:grid-cols-3");
  });

  it("줄 사이를 선으로 나누고 마지막 줄에는 선이 없다", () => {
    expect(flat).toContain("border-b-[3px] border-border py-7 last:border-b-0");
  });

  it("이메일 링크는 버튼이 아니라 주황 밑줄 글자다", () => {
    // 줄마다 버튼을 두면 다섯 줄이 다섯 번 눌러 달라고 조르는 화면이 된다.
    expect(flat).toContain("text-primary underline");
    expect(flat).not.toContain("bg-primary px-3 text-sm");
  });

  it("계정과 데이터, 운영 정보를 각각 다른 구역으로 둔다", () => {
    // 예전에는 둘을 한 구역 안에 두 칸으로 나란히 두었다. 피그마는 배경색이
    // 다른 별도 구역이다.
    expect(flat).toContain("{/* 계정과 데이터 */}");
    expect(flat).toContain("{/* 운영 정보 */}");
    expect(flat).not.toContain("gap-8 px-8 md:grid-cols-2");
  });

  it("소셜 채널 자리를 비우지 않는다", () => {
    // 주소가 없다고 지우면 피그마와 화면이 달라진다. 스토어 버튼과 같게
    // 누를 수 없는 상태로 둔다.
    expect(flat).toContain('aria-disabled="true"');
    expect(flat).not.toContain("availableSocials");
  });

  it("화살표는 글자에 붙어 있다", () => {
    // 아이콘 컴포넌트가 아니라 텍스트다. 밑줄은 이름에만 걸린다.
    expect(flat).toContain("이메일 작성 ↗");
    expect(flat).toContain("데이터 삭제 요청 안내 ↗");
    expect(flat).toContain('<span className="underline">{social.label}</span> ↗');
  });
});

describe("문의 문구", () => {
  it("제목이 기준 프레임 문구다", () => {
    // "궁금한 유형을 선택하면" 으로 두었던 적이 있다.
    expect(flat).toContain("질문할 유형을 선택하면 이메일 양식이 열려요");
    expect(flat).not.toContain("궁금한 유형을 선택하면");
  });

  it("회신 안내에 '기준' 이 들어간다", () => {
    expect(flat).toContain("24시간 문의 가능 · 평일 09:00~18:00 기준 순차 회신");
  });

  it("문의 유형 다섯 개를 피그마 순서로 둔다", () => {
    const order = ["일반 문의", "앱 문의", "굿즈 문의", "제휴 문의", "기타 문의"];
    let at = -1;
    order.forEach(label => {
      const found = page.indexOf(`title: "${label}"`);
      expect(found, `${label} 가 없다`).toBeGreaterThan(at);
      at = found;
    });
  });

  it("운영 정보 네 줄을 그대로 둔다", () => {
    ["습관적 마케팅", "이종무", "pawever01@gmail.com", "0507-1314-6802"].forEach(
      value => expect(flat).toContain(value)
    );
  });
});
