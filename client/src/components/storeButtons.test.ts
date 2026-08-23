import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 앱스토어 버튼이 피그마와 같은지 본다.
 *
 * 기준은 피그마 8. Website / AppServicePage > Container (5243:1495) 이다.
 *
 * 서비스 소개와 앱 서비스가 이 하나를 함께 쓴다. 예전에는 화면마다 버튼을
 * 따로 그려 두었고, 그러면 주소가 들어올 때 한쪽만 고치게 된다.
 */
const store = readFileSync(join(__dirname, "StoreButtons.tsx"), "utf-8").replace(
  /\s+/g,
  " "
);

describe("앱스토어 버튼", () => {
  it("주소가 없으면 링크로 걸지 않는다", () => {
    // 빈 링크를 걸면 눌렀을 때 아무 데도 가지 않는다. 자리는 피그마대로 둔다.
    expect(store).toContain('aria-disabled="true"');
  });

  it("App Store 는 순검정이다", () => {
    // --foreground 는 #2C2C2C 라 피그마의 검정과 다르다.
    expect(store).toContain("bg-black");
  });

  it("Google Play 는 주황이다", () => {
    expect(store).toContain("bg-primary text-primary-foreground");
  });

  it("글자 굵기는 Medium 이다", () => {
    // Semi Bold 로 두었던 적이 있다. 피그마는 Pretendard Medium 이다.
    expect(store).toContain("font-medium");
    expect(store).not.toContain("font-semibold");
  });

  it("아이콘은 20px 이다", () => {
    expect(store).toContain('className="h-5 w-5"');
  });
});
