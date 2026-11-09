import { mockOrderDetail } from "./adminFixtures";
import { expect, test } from "./adminFixtures";

const row = (number: string, pending = false) => ({
  orderNumber: number,
  petIndex: 0,
  petCount: 1,
  pets: [],
  petName: "테스트",
  guardianName: "테스트 보호자",
  goodsType: "figure",
  keyringAdded: false,
  orderStatus: "ACTIVE",
  paymentStatus: pending ? "PENDING" : "CONFIRMED",
  shipmentStatus: "NOT_READY",
  productionStage: "MODELING_QUEUE",
  version: 4,
  taskId: 1,
  taskStatus: "WAITING",
  taskAttempt: 1,
  assignee: null,
  blockingIssues: [],
  requiresMigrationReview: false,
  allowedActions: [],
  artifacts: [],
  expectedAmount: 18900,
});

test("명시한 기존 주문만 관리자 완료하고 새 주문과 알림은 건드리지 않는다", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("pawever.admin.accessToken", "test-token")
  );
  let orders = [row("PE-OLD-1"), row("PE-OLD-2"), row("PE-NEW-1", true)];
  const mutations: string[] = [];
  let called = 0;
  await page.route("**/api/**", async route => {
    const detail = mockOrderDetail(new URL(route.request().url()).pathname);
    if (detail && route.request().method() === "GET")
      return route.fulfill({ json: { success: true, data: detail } });
    const request = route.request(),
      path = new URL(request.url()).pathname;
    let data: unknown = [];
    if (request.method() !== "GET") mutations.push(path);
    if (path.endsWith("/me"))
      data = {
        id: 1,
        name: "소유자",
        role: "OWNER",
        workRoles: [],
        permissions: [
          "VIEW_ORDER_BASIC",
          "VIEW_ALL_ORDERS",
          "OVERRIDE_WORKFLOW",
        ],
      };
    if (path.endsWith("/workflow/orders")) data = orders;
    if (path.endsWith("/administrative-completions")) {
      called++;
      expect(request.headers()["idempotency-key"]).toBeTruthy();
      expect(request.postDataJSON()).toEqual({
        orders: [{ orderNumber: "PE-OLD-1", version: 4 }],
        reason: "과거 주문 정리",
      });
      orders = orders.filter(order => order.orderNumber !== "PE-OLD-1");
      data = {
        operationId: "test-operation",
        completed: 1,
        orders: [
          { orderNumber: "PE-OLD-1", before: { status: "PAYMENT_COMPLETED" } },
        ],
      };
    }
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/admin/operations");
  await page
    .getByRole("button", { name: "관리자 완료 처리", exact: true })
    .click();
  await expect(page.getByLabel("완료 대상 주문번호")).toHaveValue(
    "PE-OLD-1\nPE-OLD-2"
  );
  await page.getByLabel("완료 대상 주문번호").fill("PE-OLD-1\nPE-OLD-1");
  await expect(
    page.getByRole("button", { name: /관리자 완료 확정/ })
  ).toBeDisabled();
  await page.getByLabel("완료 대상 주문번호").fill("PE-OLD-1");
  await page.getByLabel("관리자 완료 사유").fill("과거 주문 정리");
  await page
    .getByRole("button", { name: "1건 관리자 완료 확정", exact: true })
    .click();
  await expect(
    page.getByText("1건 관리자 완료 · 고객 알림 없음", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "단계별 주문 목록" })
  ).toContainText("PE-NEW-1");
  expect(called).toBe(1);
  expect(mutations).toEqual(["/api/admin/orders/administrative-completions"]);
  await expect(
    page.getByRole("button", { name: "변경 전·후 기록 다운로드", exact: true })
  ).toBeVisible();
});

test("제작 담당자에게 관리자 완료를 노출하지 않는다", async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("pawever.admin.accessToken", "test-token")
  );
  await page.route("**/api/**", route => {
    const detail = mockOrderDetail(new URL(route.request().url()).pathname);
    if (detail && route.request().method() === "GET")
      return route.fulfill({ json: { success: true, data: detail } });
    const me = new URL(route.request().url()).pathname.endsWith("/me");
    return route.fulfill({
      json: {
        success: true,
        data: me
          ? {
              id: 2,
              role: "PRODUCTION",
              name: "제작",
              workRoles: [],
              permissions: ["VIEW_ORDER_BASIC"],
            }
          : [row("PE-OLD-1")],
      },
    });
  });
  await page.goto("/admin/operations");
  await expect(
    page.getByRole("region", { name: "단계별 주문 목록" })
  ).toContainText("PE-OLD-1");
  await expect(
    page.getByRole("button", { name: "관리자 완료 처리", exact: true })
  ).toHaveCount(0);
});
