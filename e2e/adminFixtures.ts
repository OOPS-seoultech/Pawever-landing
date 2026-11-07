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
    await use(page);
  },
});
