import { test, expect, type Page } from "./adminFixtures";

const order = (
  orderNumber: string,
  productionStage: string,
  paymentStatus = "CONFIRMED"
) => ({
  orderNumber,
  petIndex: 0,
  petCount: 1,
  pets: [],
  petName: `아이${orderNumber}`,
  guardianName: `보호자${orderNumber}`,
  goodsType: "figure",
  keyringAdded: false,
  orderStatus: "ACTIVE",
  paymentStatus,
  productionStage,
  shipmentStatus: "NOT_READY",
  requiresMigrationReview: false,
  version: 0,
  taskId: 1,
  taskStatus: "WAITING",
  taskAttempt: 1,
  modelingTaskId: 1,
  assignee: { id: 2, name: "제작 담당" },
  blockingIssues: [],
  allowedActions: [],
  artifacts: [],
  reviews: [],
  expectedAmount: 14900,
});

async function session(
  page: Page,
  permissions = [
    "VIEW_ORDER_BASIC",
    "VIEW_ALL_ORDERS",
    "VIEW_CUSTOMER_IDENTITY",
  ]
) {
  await page.addInitScript(() =>
    sessionStorage.setItem("pawever.admin.accessToken", "test-token")
  );
  await page.route("**/api/admin/me", route =>
    route.fulfill({
      json: {
        success: true,
        data: {
          id: 2,
          name: "담당자",
          role: permissions.includes("VIEW_ALL_ORDERS")
            ? "OWNER"
            : "PRODUCTION",
          workRoles: [],
          permissions,
        },
      },
    })
  );
}

test("단계마다 현재 주문만 표시하고 기존 화면을 보존한다", async ({ page }) => {
  await session(page);
  await page.route("**/api/admin/workflow/orders", route =>
    route.fulfill({
      json: {
        success: true,
        data: [
          order("1", "BLOCKED", "PENDING"),
          order("2", "MODELING_QUEUE"),
          order("3", "COLOR_MAPPING"),
        ],
      },
    })
  );
  await page.goto("/admin/operations");
  const list = page.getByRole("region", { name: "단계별 주문 목록" });
  const stages = page.getByRole("navigation", { name: "작업 단계" });
  await expect(list.getByRole("button")).toHaveCount(3);
  await stages
    .getByRole("button", { name: "입금 확인 1", exact: true })
    .click();
  await expect(list.getByRole("button")).toHaveCount(1);
  await expect(list).toContainText("아이1 · 보호자1");
  await expect(list).not.toContainText("아이2");
  await stages
    .getByRole("button", { name: "색상 매핑 1", exact: true })
    .click();
  await expect(list.getByRole("button")).toHaveCount(1);
  await expect(list).toContainText("아이3 · 보호자3");
  await page.getByLabel("운영 주문 검색").fill("보호자3");
  await expect(list.getByRole("button")).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "기존 전체 주문", exact: true })
  ).toHaveAttribute("href", "/admin/orders");
  await expect(
    page.getByRole("link", { name: "기존 작업 화면", exact: true })
  ).toHaveAttribute("href", "/admin/workflow");
});

test("새 주문을 자동 조회하고 신청·문자·Telegram 요청은 만들지 않는다", async ({
  page,
}) => {
  await session(page);
  await page.clock.install();
  const rows = [order("1", "BLOCKED", "PENDING")];
  const mutations: string[] = [];
  await page.route("**/api/**", route => {
    if (route.request().method() !== "GET")
      mutations.push(route.request().url());
    return route.fallback();
  });
  await page.route("**/api/admin/workflow/orders", route =>
    route.fulfill({ json: { success: true, data: rows } })
  );
  await page.goto("/admin/operations");
  await expect(page.getByText("진행 1건", { exact: false })).toBeVisible();
  rows.unshift(order("NEW", "BLOCKED", "PENDING"));
  await page.clock.fastForward(30_100);
  await expect(
    page.getByRole("region", { name: "단계별 주문 목록" })
  ).toContainText("아이NEW · 보호자NEW");
  expect(mutations).toEqual([]);
});

test("제작 담당자는 내 작업만 조회하고 권한 없는 보호자명을 표시하지 않는다", async ({
  page,
}) => {
  await session(page, ["VIEW_ORDER_BASIC"]);
  let allRequests = 0;
  await page.route("**/api/admin/workflow/orders", route => {
    allRequests++;
    return route.fulfill({ json: { success: true, data: [] } });
  });
  await page.route("**/api/production/my-tasks", route =>
    route.fulfill({ json: { success: true, data: [order("2", "MODELING")] } })
  );
  await page.goto("/admin/operations");
  const list = page.getByRole("region", { name: "단계별 주문 목록" });
  await expect(list).toContainText("아이2");
  await expect(list).not.toContainText("보호자2");
  await expect(
    page.getByRole("link", { name: "기존 전체 주문", exact: true })
  ).toHaveCount(0);
  expect(allRequests).toBe(0);
});

test("조회 권한이 회수되면 이전 목록과 선택 상세를 지운다", async ({
  page,
}) => {
  await session(page);
  let revoked = false;
  await page.route("**/api/admin/workflow/orders", route =>
    revoked
      ? route.fulfill({
          status: 403,
          json: {
            success: false,
            message: "조회 권한이 없습니다.",
            code: "FORBIDDEN",
          },
        })
      : route.fulfill({
          json: { success: true, data: [order("2", "MODELING")] },
        })
  );
  await page.goto("/admin/operations");
  await expect(
    page.getByRole("region", { name: "단계별 주문 목록" })
  ).toContainText("아이2");
  revoked = true;
  await page
    .getByRole("button", { name: "목록 새로고침", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "단계별 주문 목록" })
  ).not.toContainText("아이2");
});

test("로그인 진입은 운영 작업 공간으로 연결한다", async ({ page }) => {
  await session(page);
  await page.route("**/api/admin/workflow/orders", route =>
    route.fulfill({ json: { success: true, data: [] } })
  );
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/operations$/);
});

test("데스크톱에서 사진과 현재 회차 4면도를 비교하고 모델 원본은 기존 열기로 제공한다", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await session(page, [
    "VIEW_ORDER_BASIC",
    "VIEW_ALL_ORDERS",
    "VIEW_CUSTOMER_IDENTITY",
    "VIEW_CUSTOMER_PHOTOS",
    "VIEW_PRODUCTION_FILES",
    "DOWNLOAD_PRODUCTION_FILES",
  ]);
  const row = {
    ...order("2", "MODELING"),
    artifacts: [
      {
        id: "old",
        kind: "MULTIVIEW",
        taskId: 0,
        modelingAttempt: 0,
        fileName: "previous.png",
        size: 100,
      },
      {
        id: "current",
        kind: "MULTIVIEW",
        taskId: 1,
        modelingAttempt: 1,
        fileName: "current.png",
        size: 100,
      },
    ],
  };
  const links: string[] = [];
  const image =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+c3ioAAAAASUVORK5CYII=";
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/me") || path === "/api/admin/notices/onboarding" || path === "/api/production/file-targets") return route.fallback();
    if (path.endsWith("/workflow/orders")) data = [row];
    if (path.endsWith("/workflow")) data = row;
    if (path.endsWith("/photo-links"))
      data = { photos: [{ slot: 1, url: image, expiresAt: "2030-01-01" }] };
    if (path.endsWith("/download-link")) {
      links.push(path);
      data = { url: image };
    }
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/admin/operations");
  await page
    .getByRole("region", { name: "단계별 주문 목록" })
    .getByRole("button", { name: /아이2/ })
    .click();
  const comparison = page.getByRole("region", { name: "고객 사진·4면도 비교" });
  await expect(
    comparison.getByRole("img", { name: "고객 사진 1", exact: true })
  ).toBeVisible();
  await expect(
    comparison.getByRole("img", { name: "현재 모델링 회차 4면도", exact: true })
  ).toBeVisible();
  expect(links).toEqual(["/api/production/artifacts/current/download-link"]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
  await expect(
    page.getByRole("region", { name: "운영 주문 상세" })
  ).toBeInViewport();
});
