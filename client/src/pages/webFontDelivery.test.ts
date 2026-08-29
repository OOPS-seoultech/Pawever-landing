import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 화면 폰트가 실제로 내려오는지 본다.
 *
 * 페이지는 오랫동안 Pretendard 를 구글 폰트에서 불러오려 했는데, 구글 폰트에는
 * Pretendard 가 없다. 요청이 400 으로 떨어지고 화면은 조용히 대체 폰트로
 * 그려졌다. 만든 사람들 PC 에는 Pretendard 가 깔려 있어 아무도 눈치채지
 * 못했다. 디자인과 다른 글자로 나가고 있던 셈이다.
 */
const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

const rootCss = readFileSync(new URL("../index.css", import.meta.url), "utf8");

describe("본문 폰트", () => {
  it("구글 폰트에서 Pretendard 를 찾지 않는다", () => {
    // 카탈로그에 없다. 여기 적으면 400 을 받고 대체 폰트로 그려진다.
    expect(html).not.toMatch(/fonts\.googleapis\.com[^"']*Pretendard/i);
  });

  it("Pretendard 를 배포처에서 직접 불러온다", () => {
    expect(html).toContain("cdn.jsdelivr.net/gh/orioncactus/pretendard");
    // 버전을 고정한다. 떠 있으면 글자 모양이 어느 날 소리 없이 바뀐다.
    expect(html).toMatch(/pretendard@v\d+\.\d+\.\d+/);
  });

  it("CSS 가 실제로 받은 이름을 먼저 쓴다", () => {
    // 가변 폰트는 'Pretendard Variable' 로 등록된다. 이름이 어긋나면
    // 파일은 받아 놓고도 대체 폰트로 그린다.
    //
    // 따옴표 종류와 줄바꿈은 프리티어가 정한다. 무엇이 어떤 순서로 적혔는지만 본다.
    const flat = rootCss.replace(/["']/g, "'").replace(/\s+/g, " ");
    expect(flat).toContain("font-family: 'Pretendard Variable', Pretendard,");
    // 한글이 없는 Segoe UI 앞에 한글 대체가 있어야 한다.
    const stack = flat.slice(flat.indexOf("'Pretendard Variable'"));
    expect(stack.indexOf("'Noto Sans KR'")).toBeLessThan(
      stack.indexOf("'Segoe UI'")
    );
  });

  it("쓰지 않는 폰트 서버에 미리 연결하지 않는다", () => {
    expect(html).not.toContain("fonts.gstatic.com");
    expect(html).toContain('rel="preconnect" href="https://cdn.jsdelivr.net"');
  });
});
