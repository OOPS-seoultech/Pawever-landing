import { test, expect, type Page } from "@playwright/test";

test("완료 주문이 없으면 AS 입력 대신 다음 단계를 안내한다", async ({
  page,
}) => {
  await ownerSession(page);
  await page.goto("/admin/completed-orders");
  await expect(page.getByLabel("새 AS 사유")).toHaveCount(0);
  await expect(page.getByText("등록된 AS가 없습니다.")).toBeVisible();
  await expect(
    page.getByText(/완료 주문이 생기면 해당 주문에서 AS를 접수/)
  ).toBeVisible();
});

async function ownerSession(page: Page) {
  await page.addInitScript(() =>
    sessionStorage.setItem("pawever.admin.accessToken", "test-token")
  );
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/me"))
      data = {
        id: 1,
        role: "OWNER",
        name: "대표",
        permissions: [
          "MANAGE_ACCOUNTS",
          "MANAGE_OPERATION_SETTINGS",
          "VIEW_ORDER_BASIC",
          "VIEW_ALL_ORDERS",
        ],
        workRoles: [],
      };
    if (path.endsWith("/default-assignees"))
      data = { modeling: null, review: null, printing: null, version: 0 };
    return route.fulfill({ json: { success: true, data } });
  });
}

test("가입 승인과 포장 역할을 함께 지정하고 불가능한 초대 선택지를 숨긴다", async ({
  page,
}) => {
  await ownerSession(page);
  let approved = false;
  const account = {
    id: 8,
    email: "packing@example.test",
    name: "포장 담당",
    role: "PRODUCTION",
    status: "PENDING_APPROVAL",
    workRoles: [],
    version: 0,
    lastLoginAt: null,
  };
  await page.route("**/api/admin/accounts", route =>
    route.fulfill({
      json: {
        success: true,
        data: [
          {
            ...account,
            status: approved ? "ACTIVE" : "PENDING_APPROVAL",
            workRoles: approved ? ["PACKING_SHIPPING"] : [],
          },
        ],
      },
    })
  );
  await page.route("**/api/admin/accounts/8/approve", route => {
    expect(route.request().postDataJSON()).toEqual({
      workRoles: ["PACKING_SHIPPING"],
    });
    approved = true;
    return route.fulfill({ json: { success: true } });
  });
  await page.goto("/admin/accounts");
  await expect(
    page.getByRole("button", { name: "관리자", exact: true })
  ).toHaveCount(0);
  const row = page.getByRole("row").filter({ hasText: "packing@example.test" });
  await expect(
    row.getByRole("button", { name: "역할 지정 후 승인" })
  ).toBeDisabled();
  await row.getByLabel("포장·배송", { exact: true }).check();
  await row.getByRole("button", { name: "역할 지정 후 승인" }).click();
  await expect(row).toContainText("사용 중");
  expect(approved).toBe(true);
});

test("계정 사용 정지는 확인을 취소하면 요청하지 않는다", async ({ page }) => {
  await ownerSession(page);
  await page.route("**/api/admin/accounts", route =>
    route.fulfill({
      json: {
        success: true,
        data: [
          {
            id: 8,
            email: "worker@example.test",
            name: "직원",
            role: "PRODUCTION",
            status: "ACTIVE",
            workRoles: ["MODELING"],
            lastLoginAt: null,
          },
        ],
      },
    })
  );
  let deletes = 0;
  await page.route("**/api/admin/accounts/8", route => {
    deletes++;
    return route.fulfill({ json: { success: true } });
  });
  page.on("dialog", dialog => dialog.dismiss());
  await page.goto("/admin/accounts");
  await page.getByRole("button", { name: "사용 정지", exact: true }).click();
  await page.getByRole("button", { name: "초대", exact: true }).focus();
  expect(deletes).toBe(0);
});

test("소유자의 정산은 작업자 이름과 필터별 합계를 표시한다", async ({
  page,
}) => {
  await ownerSession(page);
  await page.route("**/api/admin/compensation/summary", route =>
    route.fulfill({
      json: {
        success: true,
        data: {
          isOwner: true,
          totalsKrw: { UNPAID: 3000 },
          settlements: [
            {
              id: 1,
              orderNumber: "TEST-1",
              workerName: "작업자 A",
              workerId: 3,
              amountKrw: 1000,
              paymentStatus: "UNPAID",
              createdAt: "2026-09-30T00:00:00Z",
            },
            {
              id: 2,
              orderNumber: "TEST-2",
              workerName: "작업자 B",
              workerId: 4,
              amountKrw: 2000,
              paymentStatus: "UNPAID",
              createdAt: "2026-09-30T00:00:00Z",
            },
          ],
        },
      },
    })
  );
  await page.goto("/admin/compensation");
  await expect(
    page.getByRole("heading", { name: "작업자 정산", exact: true })
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "관리 메뉴" })
      .getByRole("link", { name: "작업자 정산", exact: true })
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("combobox", { name: "정산 작업자" }).selectOption("3");
  await expect(page.getByText(/TEST-1/)).toContainText("작업자 A");
  await expect(page.getByText(/TEST-2/)).toHaveCount(0);
  await expect(page.getByText(/미지급 1,000원/)).toBeVisible();
});
