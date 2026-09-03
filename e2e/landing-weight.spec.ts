import { expect, test } from "@playwright/test";
import { mockCampaign, mockFleaCampaign } from "./fixtures/api";

/**
 * 판매 랜딩이 얼마나 무거운지 본다.
 *
 * 피그마에서 2배로 내려받은 사진이 무손실 PNG(RGBA, 11~14 bpp)였다. 사진을
 * 무손실로 담으면 이렇게 된다 —
 *
 *   2026-08-31 측정: 총 4.05MB, 그중 이미지 3.86MB(95%)
 *   sales-why-now 657KB · sales-limited-shelf 640KB · sales-figure-compare 603KB
 *
 * 크롬이 콘솔에 "Slow network is detected... Fallback font will be used" 를
 * 남길 만큼이었다. 파는 것이 일인 화면이 4MB 면 느린 망에서는 보기 전에 나간다.
 *
 * WebP 로 다시 담아 0.24MB 가 됐다. 크기도 그림도 그대로다 — 연속 톤 사진은
 * q82~q88(PSNR 38~41dB), 도장·화살표·아바타는 무손실이다.
 *
 * 상한은 실측(약 0.4MB)의 두 배 남짓으로 둔다. 사진 세 칸이 아직 비어 있어
 * 나중에 채워질 자리를 남겨 두되, 무손실 PNG 가 다시 섞이면(한 장에 0.5MB)
 * 바로 걸리는 높이다.
 */
const MB = 1024 * 1024;

test.describe("판매 랜딩 무게", () => {
  // 파는 화면이 둘이다. 플리마켓 랜딩은 12,000px 짜리라 상한을 넘기기 더
  // 쉽고, 넘기면 현장에서 QR 을 찍은 사람이 그림을 기다리게 된다.
  for (const [name, path] of [
    ["상시", "/goods-survey"],
    ["플리마켓", "/flea"],
  ]) {
    test(`${name} — 첫 화면부터 끝까지 받아도 상한 안에 있다`, async ({
      page,
    }) => {
      await mockCampaign(page, { goodsOpen: true });
      await mockFleaCampaign(page);
      await page.goto(path);
      await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);

      const bytes = await page.evaluate(() =>
        performance
          .getEntriesByType("resource")
          .reduce(
            (sum, entry) =>
              sum +
              ((entry as PerformanceResourceTiming).transferSize ||
                (entry as PerformanceResourceTiming).encodedBodySize ||
                0),
            0
          )
      );

      expect(bytes / MB, `${path} 가 상한을 넘었다`).toBeLessThan(1.0);
    });
  }

  test("이미지를 무손실 PNG 로 되돌리지 않았다", async ({ page }) => {
    // 무게만 재면 원인을 못 찾는다. 사진이 다시 PNG 로 들어오는 순간을 잡는다.
    // ready:false 인 세 칸은 파일이 없어 요청 자체가 나가지 않는다.
    await mockCampaign(page, { goodsOpen: true });
    await page.goto("/goods-survey");
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);

    const heavy = await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .filter(e => /\/goods-survey\/.+\.png(\?|$)/i.test(e.name))
        .map(e => e.name.split("/").pop() ?? "")
    );

    expect(heavy, "랜딩 사진은 WebP 여야 한다").toEqual([]);
  });
});
