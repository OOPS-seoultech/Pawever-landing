import { expect, test } from "@playwright/test";
import { mockFleaCampaign } from "./fixtures/api";

test("사진 후기·안내·이름별 텍스트 후기·티켓·마지막 문구 순서로 표시한다", async ({
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
    "*실제 주문자분들께서 보내주신 후기입니다."
  );
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const layout = await gallery.evaluate(element => {
      const voices = element.nextElementSibling!;
      const ticket = voices.nextElementSibling!;
      const punch = ticket.nextElementSibling!;
      return {
        voices: voices.className,
        names: [...voices.querySelectorAll("header strong")].map(
          name => name.textContent
        ),
        voicesTop: voices.getBoundingClientRect().top,
        voicesBottom: voices.getBoundingClientRect().bottom,
        ticket: ticket.className,
        ticketTop: ticket.getBoundingClientRect().top,
        ticketBottom: ticket.getBoundingClientRect().bottom,
        punch: punch.textContent,
        punchTop: punch.getBoundingClientRect().top,
        galleryBottom: element.getBoundingClientRect().bottom,
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
    expect(layout.voices).toContain("flea-voices");
    expect(layout.names).toEqual(["이성*님", "김예*님"]);
    expect(layout.voicesTop).toBeGreaterThan(layout.galleryBottom);
    expect(layout.ticketTop).toBeGreaterThan(layout.voicesBottom);
    expect(layout.punchTop - layout.ticketBottom).toBeGreaterThanOrEqual(20);
    expect(layout.punch).toContain("영화 티켓보다 저렴한 가격으로,");
    expect(layout.punch).toContain(
      "세상에 하나뿐인 우리 아이의 모습을 만듭니다."
    );
    expect(layout.photos[0].y).toBeCloseTo(layout.photos[1].y, 0);
    expect(layout.photos[2].y).toBeCloseTo(layout.photos[3].y, 0);
    expect(layout.photos[1].x).toBeGreaterThan(layout.photos[0].x);
    expect(layout.photos[2].y).toBeGreaterThan(layout.photos[0].bottom);
    expect(layout.captionTop).toBeGreaterThan(layout.photos[3].bottom);
    expect(layout.captionFont).toBe("12px");
    expect(layout.captionColor).toBe("rgb(95, 90, 85)");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
  }
});
