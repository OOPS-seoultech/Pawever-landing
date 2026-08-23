import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 헤더가 피그마와 같은지 본다.
 *
 * 기준은 피그마 8. Website / PawEverHome > Header (5200:1449) 이다.
 *
 * 이 파일이 생긴 이유가 있다. 홈 본문만 피그마에 맞추고 헤더는 "공유
 * 컴포넌트니까 이미 맞겠지"로 넘겼다. 실제로는 로고가 워드마크만 16px 로
 * 들어가 있었고 지금 보는 메뉴가 검정이었다.
 *
 * 화면 단위 검사가 파일 단위 검사보다 중요하다는 뜻이다. homeFidelity 는
 * Home.tsx 만 읽어서 헤더를 아예 보지 못했다.
 */
const header = readFileSync(
  join(__dirname, "SiteHeader.tsx"),
  "utf-8"
).replace(/\s+/g, " ");

describe("헤더 기준", () => {
  it("로고는 발바닥과 워드마크가 함께 있는 것을 쓴다", () => {
    // logo.png 는 주황 배경에 흰 글씨라 흰 헤더에서 못 쓴다.
    // paw-ever-logo.svg 는 워드마크만 있다.
    expect(header).toContain('src="/logo-mark.png"');
    expect(header).not.toContain("paw-ever-logo.svg");
  });

  it("로고 높이를 피그마 크기로 둔다", () => {
    // 피그마 5200:1450 이 65x55 다. 16px 워드마크와는 다른 물건이다.
    // 61x52 로 두었던 적이 있는데, 축소 렌더를 눈으로 재서 나온 값이었다.
    expect(header).toContain('className="h-[55px] w-auto"');
  });

  it("지금 보는 메뉴는 주황이고 밑줄이 깔린다", () => {
    // 피그마는 글자 아래에 2px 선을 둔다. 색만으로는 어디에 있는지
    // 눈에 잘 들어오지 않는다.
    expect(header).toContain("text-primary underline decoration-2 underline-offset-[6px]");
  });

  it("헤더 배경은 흰색이다", () => {
    // 본문 배경(#FAFAF8)과 같은 색이면 헤더와 본문의 경계가 사라진다.
    expect(header).toContain("bg-white/95");
  });

  it("메뉴 일곱 개를 피그마 순서로 둔다", () => {
    const order = [
      "홈",
      "서비스 소개",
      "앱 서비스",
      "향후 방향",
      "문의",
      "맞춤 굿즈",
      "설문 참여",
    ];
    let at = -1;
    order.forEach(label => {
      const found = header.indexOf(`"${label}"`);
      expect(found, `${label} 가 없다`).toBeGreaterThan(at);
      at = found;
    });
  });
});
