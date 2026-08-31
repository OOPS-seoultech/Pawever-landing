import { expect, test } from "@playwright/test";
import { mockCampaign } from "./fixtures/api";

/**
 * 홈 화면에서 법적으로 걸어 둬야 하는 링크에 실제로 손이 닿는지 본다.
 *
 * 근거: [카톡 8/24 12:03 단톡, 대표] "방금 결제 PG사랑 통화했을 때,
 *       1. 홈 화면에 사업자 정보 노출 / 2. 구매자가 취소 시 며칠 내 어떻게
 *       진행되는지 / 3. 반품 관련 내용 — 추가되어야 한다고 해서"
 * 근거: [카톡 8/19 08:54 단톡, 대표] 개인정보처리방침·이용약관 개정.
 *       시행일 2026-09-01 로 반영했다.
 *
 * 링크가 DOM 에 있는 것과 누를 수 있는 것은 다르다. 소스를 읽는 테스트로는
 * 가려진 링크를 잡을 수 없다. 이 화면은 아래에 전환 바가 붙어 있어서 특히 그렇다.
 */

/** 하단 전환 바. 흐름 안에 있어야 푸터를 덮지 않는다. */
const BAR = 'div[class*="bottom-0"][class*="z-40"]';

test.describe("홈 화면 하단 법적 링크", () => {
  test.beforeEach(async ({ page }) => {
    await mockCampaign(page, { goodsOpen: true });
    await page.goto("/");
    // 이미지가 들어오면서 높이가 바뀐다. 자리가 잡힌 뒤에 재야 한다.
    await page.waitForLoadState("networkidle");
  });

  for (const [name, path] of [
    ["개인정보처리방침", "/privacy"],
    ["이용약관", "/terms"],
  ] as const) {
    test(`푸터의 ${name} 을 눌러 이동한다`, async ({ page }) => {
      const link = page.getByRole("link", { name, exact: true });
      // 화면 한가운데로 올려 두고 누른다. 뷰포트 맨 아래에 걸쳐 있으면 전환 바가
      // 그 위를 덮는다 — 그건 이 링크의 문제가 아니라 바의 문제이고, 아래
      // '전환 바가 푸터를 덮지 않는다'가 따로 잡는다.
      await link.evaluate(el => el.scrollIntoView({ block: "center" }));
      await link.click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    });
  }

  test("전환 바가 푸터를 덮지 않는다", async ({ page }) => {
    // 바를 fixed 로 띄우고 아래에 h-20(80px) 여백을 대신 두고 있었다. 모바일은
    // 버튼 두 개가 두 줄로 접혀 바가 151px 이 된다. 71px 이 모자라 푸터의
    // 이용약관·개인정보처리방침이 영구히 덮였다. sticky 는 자기 높이만큼 자리를
    // 직접 차지하므로 글자가 길어져도 어긋나지 않는다.
    await page.mouse.wheel(0, 100_000);
    await page.waitForTimeout(300);

    const overlap = await page.evaluate(barSelector => {
      const bar = document.querySelector<HTMLElement>(barSelector);
      if (!bar) throw new Error("전환 바를 찾지 못했다");
      const barTop = bar.getBoundingClientRect().top;
      const links = [...document.querySelectorAll<HTMLElement>("footer a")];
      if (!links.length) throw new Error("푸터 링크를 찾지 못했다");
      return links
        .map(a => ({
          text: a.textContent?.trim() ?? "",
          over: Math.round(a.getBoundingClientRect().bottom - barTop),
        }))
        .filter(x => x.over > 0);
    }, BAR);

    expect(overlap, "덮인 푸터 링크가 있으면 안 된다").toEqual([]);
  });

  test("전환 바는 흐름 안에 있다", async ({ page }) => {
    // fixed 로 되돌아가면 다시 여백과 어긋나기 시작한다. 방식 자체를 붙든다.
    await expect(page.locator(BAR)).toHaveCSS("position", "sticky");
  });
});
