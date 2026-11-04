import { expect, test } from "@playwright/test";
import { mockFleaCampaign } from "./fixtures/api";

test("티켓 바로 아래 익명 후기 네 장을 2×2로 표시하고 안내 문구를 붙인다", async ({
  page,
}) => {
  await mockFleaCampaign(page);
  await page.goto("/flea");
  const gallery = page.locator(".flea-instagram-reviews");
  const photos = gallery.locator("img");
  await expect(photos).toHaveCount(4);
  await gallery.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      photos.evaluateAll(elements =>
        elements.every(element => {
          const photo = element as HTMLImageElement;
          return photo.complete && photo.naturalWidth > 0;
        })
      )
    )
    .toBe(true);
  await expect(gallery.locator("figcaption")).toHaveText(
    "실제 주문자분들께서 작성하신 후기입니다."
  );
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const layout = await gallery.evaluate(element => {
      const ticket = element.previousElementSibling!;
      return {
        ticket: ticket.className,
        ticketBottom: ticket.getBoundingClientRect().bottom,
        galleryTop: element.getBoundingClientRect().top,
        photos: [...element.querySelectorAll("img")].map(image =>
          image.getBoundingClientRect().toJSON()
        ),
        captionTop: element.querySelector("figcaption")!.getBoundingClientRect()
          .top,
        captionFont: getComputedStyle(element.querySelector("figcaption")!)
          .fontSize,
        captionColor: getComputedStyle(element.querySelector("figcaption")!)
          .color,
      };
    });
    expect(layout.ticket).toBe("flea-ticket");
    expect(layout.galleryTop - layout.ticketBottom).toBeGreaterThanOrEqual(20);
    expect(layout.photos[0].y).toBeCloseTo(layout.photos[1].y, 0);
    expect(layout.photos[2].y).toBeCloseTo(layout.photos[3].y, 0);
    expect(layout.photos[1].x).toBeGreaterThan(layout.photos[0].x);
    expect(layout.photos[2].y).toBeGreaterThan(layout.photos[0].bottom);
    expect(layout.captionTop).toBeGreaterThan(layout.photos[3].bottom);
    expect(layout.captionFont).toBe("12px");
    expect(layout.captionColor).toBe("rgb(140, 133, 128)");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
  }
});
