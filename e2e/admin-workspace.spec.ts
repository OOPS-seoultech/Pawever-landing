import { test, expect } from "@playwright/test";

test("목록은 독립 스크롤되고 선택한 미배정 작업만 기본 배정한다", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() =>
    sessionStorage.setItem("pawever.admin.accessToken", "test-token")
  );
  let rows = Array.from({ length: 30 }, (_, index) => ({
    orderNumber: `PE-WORK-${index}`,
    petName: `동물${index}`,
    goodsType: "figure",
    keyringAdded: false,
    orderStatus: "ACTIVE",
    paymentStatus: "CONFIRMED",
    productionStage: "MODELING_QUEUE",
    shipmentStatus: "NOT_READY",
    version: 0,
    taskId: index + 1,
    taskStatus: "WAITING",
    taskAttempt: 1,
    requiresMigrationReview: false,
    assignee: null as { id: number; name: string } | null,
    blockingIssues: ["UNASSIGNED"],
    allowedActions: ["ASSIGN_TASK"],
    artifacts: [],
    reviews: [],
    expectedAmount: 18900,
  }));
  const assigned: string[] = [];
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/me"))
      data = {
        id: 1,
        name: "대표",
        role: "OWNER",
        workRoles: [],
        permissions: ["VIEW_ALL_ORDERS", "VIEW_ORDER_BASIC", "ASSIGN_WORK"],
      };
    else if (path.endsWith("/workflow/orders")) data = rows;
    else if (path.endsWith("/workflow/assign")) {
      const number = path.split("/")[4];
      const body = route.request().postDataJSON();
      expect(body.useDefault).toBe(true);
      expect(body.version).toBe(0);
      expect(route.request().headers()["idempotency-key"]).toBeTruthy();
      assigned.push(number);
      rows = rows.map(row =>
        row.orderNumber === number
          ? { ...row, assignee: { id: 3, name: "등록 담당" }, version: 1 }
          : row
      );
      data = rows.find(row => row.orderNumber === number);
    } else if (path.endsWith("/workflow"))
      data = rows.find(row => path.includes(row.orderNumber + "/"));
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/admin/workflow");
  const list = page.getByRole("region", { name: "주문 목록", exact: true });
  await page.getByRole("button", { name: /PE-WORK-29 ·/ }).click();
  await expect(
    page.getByRole("region", { name: "주문 상세", exact: true })
  ).toBeInViewport();
  expect(await list.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page
    .getByRole("checkbox", {
      name: "PE-WORK-29 기본 담당자 배정 대상으로 선택",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "선택 1건 기본 담당자에게 배정", exact: true })
    .click();
  await expect(list.getByRole("status")).toContainText("PE-WORK-29: 배정 완료");
  expect(assigned).toEqual(["PE-WORK-29"]);
  await expect(
    page.getByRole("checkbox", {
      name: "PE-WORK-29 기본 담당자 배정 대상으로 선택",
      exact: true,
    })
  ).toHaveCount(0);
});
