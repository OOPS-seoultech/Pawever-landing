import { test, expect, type Page } from "@playwright/test";

const spool = {
  id: 41,
  spoolId: "F-001",
  colorName: "크림",
  material: "PLA",
  finish: "무광",
  manufacturer: "제조사",
  source: "구매처",
  priceKrw: 22000,
  remainingGrams: 800,
  active: true,
  version: 0,
};
async function session(page: Page, manage = false) {
  await page.addInitScript(() =>
    sessionStorage.setItem("pawever.admin.accessToken", "test-token")
  );
  await page.route("**/api/admin/me", route =>
    route.fulfill({
      json: {
        success: true,
        data: {
          id: 3,
          name: "담당자",
          role: manage ? "ADMIN" : "PRODUCTION",
          workRoles: ["DESIGN_QC"],
          permissions: [
            "VIEW_ORDER_BASIC",
            "VIEW_FILAMENT",
            "MAP_FILAMENT",
            ...(manage ? ["MANAGE_FILAMENT"] : []),
          ],
        },
      },
    })
  );
}

test("실제 스풀을 등록하고 잔량과 사용 여부를 수정한다", async ({ page }) => {
  await session(page, true);
  let saved = false;
  let item = { ...spool };
  await page.route("**/api/admin/filaments**", async route => {
    if (route.request().method() === "GET")
      return route.fulfill({
        json: { success: true, data: saved ? [item] : [] },
      });
    const body = route.request().postDataJSON();
    expect(route.request().headers()["idempotency-key"]).toBeTruthy();
    expect(body.spoolId).toBe("F-001");
    item = { ...item, ...body, version: saved ? 1 : 0 };
    saved = true;
    return route.fulfill({ json: { success: true, data: item } });
  });
  await page.goto("/admin/filaments");
  await expect(page.getByText("등록된 필라멘트가 없습니다.")).toBeVisible();
  await page
    .getByRole("button", { name: "필라멘트 등록", exact: true })
    .click();
  await page.getByLabel("실제 스풀 ID").fill("F-001");
  await page.getByLabel("색상명", { exact: true }).fill("크림");
  await page.getByLabel("재질", { exact: true }).fill("PLA");
  await page.getByLabel("마감", { exact: true }).fill("무광");
  await page.getByLabel("잔량(g)").fill("800");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("저장했습니다");
  await page.getByRole("button", { name: "F-001 수정" }).click();
  await expect(page.getByLabel("실제 스풀 ID")).toBeDisabled();
  await page.getByLabel("잔량(g)").fill("600");
  await page.getByLabel("사용 가능").uncheck();
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByText("사용 중지", { exact: true })).toBeVisible();
  expect(item.remainingGrams).toBe(600);
});

test("부위별 실제 필라멘트를 저장하고 재시도 후 플레이트 준비로 넘긴다", async ({
  page,
}) => {
  await session(page);
  let row = {
    orderNumber: "PE-COLOR001",
    petName: "콩이",
    goodsType: "figure",
    keyringAdded: false,
    orderStatus: "ACTIVE",
    paymentStatus: "CONFIRMED",
    productionStage: "COLOR_MAPPING",
    shipmentStatus: "NOT_READY",
    version: 9,
    taskId: 13,
    taskStatus: "WAITING",
    taskAttempt: 1,
    requiresMigrationReview: false,
    assignee: { id: 3, name: "담당자" },
    blockingIssues: [],
    allowedActions: ["MAP_FILAMENT"],
    artifacts: [],
    reviews: [],
    expectedAmount: null,
    filamentMappings: [] as object[],
  };
  const keys: string[] = [];
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/me")) return route.fallback();
    if (path.endsWith("/filaments"))
      return route.fulfill({
        json: {
          success: true,
          data: [spool, { ...spool, id: 42, spoolId: "OLD", active: false }],
        },
      });
    if (path.endsWith("/filament-mappings")) {
      const b = route.request().postDataJSON();
      expect(b.mappings).toEqual([{ partName: "몸통", filamentId: 41 }]);
      if (b.complete) {
        keys.push(route.request().headers()["idempotency-key"]);
        if (keys.length === 1) return route.abort("failed");
      }
      row = {
        ...row,
        version: row.version + 1,
        productionStage: b.complete ? "PLATE_PREPARATION" : "COLOR_MAPPING",
        taskId: b.complete ? 14 : 13,
        allowedActions: b.complete ? [] : ["MAP_FILAMENT"],
        filamentMappings: [
          {
            ...spool,
            taskId: 13,
            modelingAttempt: 1,
            partName: "몸통",
            filamentId: 41,
            completedAt: b.complete ? "2026-09-12T12:00:00Z" : null,
          },
        ],
      };
      return route.fulfill({ json: { success: true, data: row } });
    }
    if (path.endsWith("/my-tasks"))
      return route.fulfill({ json: { success: true, data: [row] } });
    if (path.endsWith("/workflow"))
      return route.fulfill({ json: { success: true, data: row } });
    if (path.endsWith("/timeline"))
      return route.fulfill({ json: { success: true, data: [] } });
    return route.fulfill({ status: 404 });
  });
  await page.goto("/admin/my-work");
  await page.getByRole("button", { name: /PE-COLOR001/ }).click();
  const complete = page.getByRole("button", {
    name: "색상 지정 완료",
    exact: true,
  });
  await expect(complete).toBeDisabled();
  await page.getByLabel("부위 1", { exact: true }).fill("몸통");
  await page
    .getByRole("combobox", { name: "필라멘트 1", exact: true })
    .selectOption("41");
  await expect(page.getByRole("option", { name: /OLD/ })).toHaveCount(0);
  await page
    .getByRole("button", { name: "색상 지정 저장", exact: true })
    .click();
  await page.reload();
  await page.getByRole("button", { name: /PE-COLOR001/ }).click();
  await expect(page.getByLabel("부위 1", { exact: true })).toHaveValue("몸통");
  await complete.click();
  await expect(page.getByRole("alert")).toBeVisible();
  await complete.click();
  await expect(page.getByRole("status")).toContainText("플레이트 준비");
  await expect(complete).toHaveCount(0);
  expect(keys[0]).toBeTruthy();
  expect(keys[1]).toBe(keys[0]);
});

test("조회 담당자에게 재고 수정 버튼을 노출하지 않는다", async ({ page }) => {
  await session(page);
  await page.route("**/api/admin/filaments", route =>
    route.fulfill({ json: { success: true, data: [spool] } })
  );
  await page.goto("/admin/filaments");
  await expect(page.getByText("F-001", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "필라멘트 등록", exact: true })
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "F-001 수정" })).toHaveCount(0);
});
