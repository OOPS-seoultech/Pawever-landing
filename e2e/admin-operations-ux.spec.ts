import { test, expect, type Page } from "./adminFixtures";

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

test("계정 삭제는 확인을 취소하면 요청하지 않는다", async ({ page }) => {
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
  await page.goto("/admin/accounts");
  await page
    .getByRole("button", { name: "직원 계정 삭제", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "취소", exact: true }).click();
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

test("초대 역할을 선택하면 링크 노출 없이 이메일 발송을 안내한다", async ({
  page,
}) => {
  await ownerSession(page);
  let invited = false;
  await page.route("**/api/admin/accounts", route => {
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON()).toEqual({
        email: "worker@example.test",
        name: "직원",
        role: "PRODUCTION",
        workRoles: ["MODELING"],
      });
      invited = true;
      return route.fulfill({ json: { success: true } });
    }
    return route.fulfill({ json: { success: true, data: [] } });
  });
  await page.goto("/admin/accounts");
  await page
    .getByPlaceholder("이메일", { exact: true })
    .fill("worker@example.test");
  await page.getByPlaceholder("이름", { exact: true }).fill("직원");
  await expect(
    page.getByRole("button", { name: "초대", exact: true })
  ).toBeDisabled();
  await page
    .getByRole("group", { name: "초대할 담당자의 작업 역할" })
    .getByLabel("모델링 결과물 등록", { exact: true })
    .check();
  await page.getByRole("button", { name: "초대", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "초대 메일을 발송했습니다"
  );
  expect(invited).toBe(true);
  await expect(page.locator("code")).toHaveCount(0);
});

test("초대된 이메일은 수정할 수 없고 숫자 다섯자로 비밀번호를 설정한다", async ({
  page,
}) => {
  await page.route("**/api/admin/auth/invitation-info", route =>
    route.fulfill({
      json: {
        success: true,
        data: { email: "worker@example.test", name: "직원" },
      },
    })
  );
  let accepted = false;
  await page.route("**/api/admin/auth/accept-invite", route => {
    expect(route.request().postDataJSON()).toEqual({
      inviteToken: "test-once-token",
      password: "12345",
    });
    accepted = true;
    return route.fulfill({ json: { success: true } });
  });
  await page.goto("/admin/accept-invite?token=test-once-token");
  await expect(page.getByLabel("로그인 이메일")).toHaveValue(
    "worker@example.test"
  );
  await expect(page.getByLabel("로그인 이메일")).toHaveAttribute(
    "readonly",
    ""
  );
  await expect(page).toHaveURL(/\/admin\/accept-invite$/);
  await page.getByLabel("비밀번호", { exact: true }).fill("1234");
  await page.getByLabel("비밀번호 확인", { exact: true }).fill("1234");
  await page
    .getByRole("button", { name: "비밀번호 저장", exact: true })
    .click();
  expect(accepted).toBe(false);
  await page.getByLabel("비밀번호", { exact: true }).fill("12345");
  await page.getByLabel("비밀번호 확인", { exact: true }).fill("12345");
  await page
    .getByRole("button", { name: "비밀번호 저장", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "비밀번호를 정했습니다" })
  ).toBeVisible();
  expect(accepted).toBe(true);
});

test("담당자 행 오른쪽 X 삭제 후 목록에서 사라지고 대표 삭제는 제공하지 않는다", async ({
  page,
}) => {
  await ownerSession(page);
  let deleted = false;
  const worker = {
    id: 8,
    email: "worker@example.test",
    name: "직원",
    role: "PRODUCTION",
    status: "ACTIVE",
    workRoles: ["MODELING"],
    lastLoginAt: null,
  };
  await page.route("**/api/admin/accounts", route =>
    route.fulfill({
      json: {
        success: true,
        data: [
          { ...worker, id: 1, name: "대표", role: "OWNER" },
          ...(deleted ? [] : [worker]),
        ],
      },
    })
  );
  await page.route("**/api/admin/accounts/8", route => {
    expect(route.request().method()).toBe("DELETE");
    deleted = true;
    return route.fulfill({ json: { success: true } });
  });
  await page.goto("/admin/accounts");
  await expect(
    page.getByRole("button", { name: "대표 계정 삭제", exact: true })
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "직원 계정 삭제", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "계정 삭제", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "직원 계정 삭제", exact: true })
  ).toHaveCount(0);
  expect(deleted).toBe(true);
});
