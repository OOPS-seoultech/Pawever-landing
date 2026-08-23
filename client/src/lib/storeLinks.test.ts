import { describe, expect, it } from "vitest";
import { STORE_LINKS } from "./storeLinks";

/**
 * 스토어 주소가 우리 앱을 가리키는지 본다.
 *
 * 스토어에 "pawever" 이름을 쓰는 앱이 여럿 있다 — com.estsoft.pawever,
 * shop.pawever.app 등. 이름만 보고 고르면 사용자를 남의 앱으로 보낸다.
 * 실제로 한 번 그렇게 짚을 뻔했다.
 *
 * 우리 앱은 com.pawever.mobile / id6761372939 이고, 애플 판매자는
 * jongmu Lee(이종무) — 문의 화면의 담당자와 같다.
 */
describe("앱스토어 주소", () => {
  it("우리 앱을 가리킨다", () => {
    expect(STORE_LINKS[0]?.href).toContain("id=com.pawever.mobile");
    expect(STORE_LINKS[1]?.href).toContain("id6761372939");
  });

  it("이름이 비슷한 남의 앱이 아니다", () => {
    const all = STORE_LINKS.map(store => store.href).join(" ");
    ["com.estsoft.pawever", "shop.pawever.app", "com.paw.customer"].forEach(
      other => expect(all).not.toContain(other)
    );
  });

  it("두 주소 모두 채워져 있다", () => {
    // 비면 버튼이 누를 수 없는 상태로 그려진다. 주소를 받은 뒤에는 비면 안 된다.
    expect(STORE_LINKS).toHaveLength(2);
    STORE_LINKS.forEach(store => {
      expect(store.href, `${store.label} 주소가 비었다`).not.toBe("");
      expect(store.href).toMatch(/^https:\/\//);
    });
  });

  it("Google Play 만 주된 버튼이다", () => {
    // 피그마는 구글플레이가 주황, App Store 가 검정이다.
    expect(STORE_LINKS.filter(store => store.primary)).toHaveLength(1);
  });
});
