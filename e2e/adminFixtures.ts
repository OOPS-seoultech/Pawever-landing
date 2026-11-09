import { test as base, expect } from "@playwright/test";
export type { Page } from "@playwright/test";
export { expect };
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route("**/api/admin/notices/onboarding", route =>
      route.fulfill({ json: { success: true, data: { notice: null } } })
    );
    await page.route("**/api/production/file-targets", route =>
      route.fulfill({
        json: { success: true, data: { orders: [], plates: [] } },
      })
    );
    await page.route("**/api/production/artifacts/*/download-link", route =>
      route.fulfill({
        json: {
          success: true,
          data: {
            url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+c3ioAAAAASUVORK5CYII=",
            expiresAt: "2030-01-01T00:00:00Z",
          },
        },
      })
    );
    await use(page);
  },
});

export function mockOrderDetail(path: string) {
  if (!/^\/api\/admin\/orders\/[^/]+$/.test(path)) return;
  return {
    orderNumber: decodeURIComponent(path.split("/").at(-1)!),
    petName: "반려동물",
    status: "IN_PRODUCTION",
    submittedAt: "2026-11-09T00:00:00Z",
    goodsType: "figure",
    goodsTypeLabel: "3D 피규어",
    photos: [],
    shipping: null,
    payment: null,
    pricing: null,
    marketing: null,
    statusHistory: [],
    accessLogs: [],
  };
}
