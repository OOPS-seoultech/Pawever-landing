import { expect, test } from "@playwright/test";
import { mockCampaign } from "./fixtures/api";

/**
 * 모든 페이지가 공유하는 상단 헤더.
 *
 * 피그마에는 데스크톱 헤더 하나뿐이다(8. Website / Header, 5200:1449 — 폭
 * 1440px). 그 값을 모든 폭에 그대로 적용하고 있어서 좁은 화면에서 무너졌다 —
 * 로고 img 가 flex 아이템이라 shrink 1, min-width 0 이었고, 메뉴 일곱 개가
 * 374px 를 요구하면 로고가 0까지 밀렸다.
 *
 * 2026-08-31 측정 (운영·프리뷰 동일):
 *   1440·1024·768px  로고 65×55  ← 피그마 값 그대로
 *   430px            로고  8×55
 *   390·360px        로고  0×55  ← 휴대폰에서는 아예 안 보인다
 *
 * 헤더를 쓰는 다섯 페이지(/ · /service · /app · /roadmap · /contact) 전부
 * 그랬고, 가로로 8px 넘쳐 페이지가 좌우로 흔들렸다. 굿즈 랜딩은 자체 헤더라
 * (390px 모바일 디자인이 따로 있다) 해당 없다.
 *
 * 모바일 헤더 디자인이 나오기 전까지의 응급 조치다. 새 모양을 지어내지 않고
 * 디자인 값(65×55)을 지키는 데까지만 한다.
 */

const HEADER_PAGES = ["/", "/service", "/app", "/roadmap", "/contact"];

/** 피그마 5200:1450 — Image (포에버(PAW-EVER) 홈). */
const LOGO = { width: 65, height: 55 };

test.describe("좁은 화면 헤더", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await mockCampaign(page, { goodsOpen: false });
  });

  for (const path of HEADER_PAGES) {
    test(`${path} — 로고가 디자인 크기를 지킨다`, async ({ page }) => {
      await page.goto(path);
      const box = await page.locator("header img").boundingBox();
      expect(box, "헤더 로고를 찾지 못했다").not.toBeNull();
      expect(Math.round(box!.width)).toBe(LOGO.width);
      expect(Math.round(box!.height)).toBe(LOGO.height);
    });
  }

  test("페이지가 가로로 넘치지 않는다", async ({ page }) => {
    // 넘치면 본문 전체가 좌우로 흔들린다. 원인은 헤더인데 증상은 화면 전체에
    // 나타나서, 헤더를 의심하기까지 오래 걸린다.
    await page.goto("/");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    );
    expect(overflow).toBe(0);
  });

  test("메뉴 일곱 개가 모두 한 줄로 남는다", async ({ page }) => {
    // 폭이 모자라면 글자가 "서비스 / 소개"처럼 접힌다. 메뉴가 두 줄이 되면
    // 헤더 높이가 늘고 글자도 읽기 어려워진다. 좁으면 옆으로 밀어서 본다.
    await page.goto("/");
    const links = page.locator("header nav a");
    await expect(links).toHaveCount(7);

    const heights = await links.evaluateAll(nodes =>
      nodes.map(n => Math.round(n.getBoundingClientRect().height))
    );
    const oneLine = Math.min(...heights);
    expect(heights, "줄바꿈된 메뉴가 있다").toEqual(heights.map(() => oneLine));
  });

  test("옆으로 밀면 마지막 메뉴까지 닿는다", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("header nav");
    await nav.evaluate(el => el.scrollTo(el.scrollWidth, 0));
    await expect(
      page.locator("header nav a", { hasText: "설문 참여" })
    ).toBeInViewport();
  });
});

test.describe("넓은 화면 헤더", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("피그마 그대로다 — 로고 65×55, 메뉴는 밀 필요가 없다", async ({
    page,
  }) => {
    // 응급 조치가 넓은 화면 모양을 건드리면 안 된다.
    await mockCampaign(page, { goodsOpen: false });
    await page.goto("/");

    const box = await page.locator("header img").boundingBox();
    expect(Math.round(box!.width)).toBe(LOGO.width);
    expect(Math.round(box!.height)).toBe(LOGO.height);

    const scrollable = await page
      .locator("header nav")
      .evaluate(el => el.scrollWidth > el.clientWidth);
    expect(scrollable, "넓은 화면에서는 메뉴가 다 들어가야 한다").toBe(false);
  });
});
