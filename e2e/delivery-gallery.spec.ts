import { expect, test } from "@playwright/test";
import { mockCampaign, mockFleaCampaign } from "./fixtures/api";

for (const path of ["/flea", "/goods-survey"]) {
  test(`${path} 수량 사진 아래 배송·수령 사진 두 장이 모바일 한 줄에 보인다`, async ({
    page,
  }) => {
    await mockCampaign(page, { goodsOpen: true });
    await mockFleaCampaign(page);
    await page.goto(path);
    const gallery = page.locator(".gs-delivery-gallery");
    await gallery.scrollIntoViewIfNeeded();
    await expect(gallery.locator("figcaption")).toHaveText(
      "실제 상품 배송 및 수령 이미지"
    );
    const images = gallery.locator("img");
    await expect(images).toHaveCount(2);
    await expect
      .poll(() =>
        images.evaluateAll(elements =>
          elements.every(element => {
            const image = element as HTMLImageElement;
            return image.complete && image.naturalWidth > 0;
          })
        )
      )
      .toBe(true);
    const layout = await gallery.evaluate(element => {
      const [first, second] = [...element.querySelectorAll("img")].map(image =>
        image.getBoundingClientRect()
      );
      const previous = element.previousElementSibling!.getBoundingClientRect();
      return {
        first,
        second,
        previousBottom: previous.bottom,
        height: element.getBoundingClientRect().height,
      };
    });
    expect(layout.second.top).toBeCloseTo(layout.first.top, 0);
    expect(layout.second.left).toBeGreaterThan(layout.first.right);
    expect(layout.first.top).toBeGreaterThanOrEqual(layout.previousBottom);
    expect(layout.height).toBeLessThan(320);
    expect(layout.second.right).toBeLessThanOrEqual(page.viewportSize()!.width);
  });
}

test("상시 판매의 후기·제작 과정·실물 이미지가 모두 로드된다", async ({
  page,
}) => {
  await mockCampaign(page, { goodsOpen: true });
  await page.goto("/goods-survey");
  for (const section of [
    ".gs-why-now",
    ".gs-the-figure",
    ".gs-proof",
    ".gs-process",
    ".gs-limited",
  ]) {
    await page.locator(section).scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        page.locator(`${section} img`).evaluateAll(elements =>
          elements.every(element => {
            const image = element as HTMLImageElement;
            return (
              image.complete &&
              image.naturalWidth > 0 &&
              image.getBoundingClientRect().height > 20
            );
          })
        )
      )
      .toBe(true);
  }
  await expect(page.locator(".gs-figure--pending")).toHaveCount(0);
  for (const file of [
    "flea-figure-real.webp",
    "flea-hand.webp",
    "flea-proof-overlay.webp",
    "flea-modeling.webp",
    "flea-printing.webp",
  ]) {
    await expect(page.locator(`img[src$="/${file}"]`)).toHaveCount(1);
  }
});
