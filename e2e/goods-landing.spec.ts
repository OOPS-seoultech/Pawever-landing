import { expect, test } from "@playwright/test";
import { mockCampaign, mockDraft, failCampaign } from "./fixtures/api";
test("모든 판매 CTA는 25900원 주문으로 바로 연결된다", async ({ page }) => {
  await mockCampaign(page);
  await mockDraft(page);
  for (const id of ["btn_A1", "btn_A2", "btn_B"]) {
    await page.goto("/goods-survey");
    await page.locator(`[data-cta-id="${id}"]`).click();
    await expect(page).toHaveURL(/\/goods-survey\/order$/);
    await expect(page.getByText("마지막 단계")).toBeVisible();
    await expect(
      page.locator('label:has-text("결제하는 데 동의합니다")')
    ).toContainText("28,900원");
  }
});
test("원래 가격과 할인 가격, 월 제작량, 실제 후기 2x2가 표시된다", async ({
  page,
}) => {
  await mockCampaign(page);
  await page.goto("/goods-survey");
  await expect(page.locator(".gs-product-card s")).toHaveText(
    "기존 판매가 29,900원"
  );
  await expect(page.locator(".gs-product-card strong")).toHaveText("25,900원");
  await expect(
    page.getByRole("heading", { name: "한 달에 100건씩 제작 중" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "실제 고객 후기" })
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/설문|1차 모집 선착순/);
  const reviews = page.locator(".gs-customer-reviews img");
  await expect(reviews).toHaveCount(4);
  for (const width of [320, 430]) {
    await page.setViewportSize({ width, height: 900 });
    const positions = await reviews.evaluateAll(images =>
      images.map(image => {
        const r = image.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width };
      })
    );
    expect(positions[0].y).toBeCloseTo(positions[1].y, 0);
    expect(positions[2].y).toBeCloseTo(positions[3].y, 0);
    expect(positions[1].x).toBeGreaterThan(positions[0].x);
    expect(positions[2].y).toBeGreaterThan(positions[0].y);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
  }
});
for (const mode of ["closed", "failed"]) {
  test(`주문을 받을 수 없으면 구매와 사진 등록을 막는다: ${mode}`, async ({
    page,
  }) => {
    if (mode === "closed") await mockCampaign(page, { goodsOpen: false });
    else await failCampaign(page);
    await page.goto("/goods-survey");
    await expect(
      page.getByText("지금은 주문을 받지 않아요").first()
    ).toBeVisible();
    await expect(
      page.locator(
        '[data-cta-id="btn_A1"], [data-cta-id="btn_A2"], [data-cta-id="btn_A5"]'
      )
    ).toHaveCount(0);
    await expect(page.locator(".gs-stickybar button")).toBeDisabled();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}
