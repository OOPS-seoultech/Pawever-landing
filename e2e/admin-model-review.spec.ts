import { test, expect, type Page } from "@playwright/test";

const initial = () => ({
  orderNumber: "PE-REVIEW001",
  petName: "콩이",
  goodsType: "figure",
  keyringAdded: false,
  orderStatus: "ACTIVE",
  paymentStatus: "CONFIRMED",
  productionStage: "MODEL_REVIEW",
  shipmentStatus: "NOT_READY",
  requiresMigrationReview: false,
  version: 8,
  taskId: 12,
  taskAttempt: 1,
  modelingTaskId: 11,
  taskStatus: "WAITING",
  assignee: { id: 3, name: "검수 담당자" },
  blockingIssues: [] as string[],
  allowedActions: ["APPROVE_MODEL", "REQUEST_MODEL_CHANGES"],
  expectedAmount: null,
  reviews: [] as object[],
  artifacts: ["MULTIVIEW", "MODEL_SOURCE", "PRINT_MODEL"].map((kind, i) => ({
    id: "file-" + i,
    kind,
    fileName: "first-" + kind + ".stl",
    size: 100,
    taskId: 11,
    modelingAttempt: 1,
  })),
});

async function session(page: Page, modeler = false) {
  await page.addInitScript(() =>
    sessionStorage.setItem("pawever.admin.accessToken", "test-token")
  );
  await page.route("**/api/admin/me", route =>
    route.fulfill({
      json: {
        success: true,
        data: {
          id: modeler ? 2 : 3,
          name: "담당자",
          role: "PRODUCTION",
          workRoles: [modeler ? "MODELING" : "DESIGN_QC"],
          permissions: [
            "VIEW_ORDER_BASIC",
            "VIEW_CUSTOMER_PHOTOS",
            "VIEW_PRODUCTION_FILES",
            "DOWNLOAD_PRODUCTION_FILES",
            modeler ? "COMPLETE_MODELING" : "REVIEW_MODEL",
          ],
        },
      },
    })
  );
}

test("검수 체크 후 승인하면 색상 작업 대기로 넘어간다", async ({ page }) => {
  await session(page);
  let row = initial();
  const keys: string[] = [];
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/me")) return route.fallback();
    if (path.endsWith("/review")) {
      const body = route.request().postDataJSON();
      expect(body.decision).toBe("APPROVED");
      expect(body.version).toBe(8);
      expect(body.checks).toEqual(
        expect.arrayContaining([
          "LIKENESS",
          "FEATURES",
          "BASE_CUT",
          "PRINTABILITY",
        ])
      );
      keys.push(route.request().headers()["idempotency-key"]);
      if (keys.length === 1) return route.abort("failed");
      row = {
        ...row,
        productionStage: "COLOR_MAPPING",
        taskId: 13,
        version: 9,
        allowedActions: [],
        reviews: [
          {
            id: 1,
            decision: "APPROVED",
            modelingAttempt: 1,
            reviewerName: "검수 담당자",
            reviewedAt: "2026-09-12T09:00:00Z",
            note: "",
            reasonCode: null,
          },
        ],
      };
      return route.fulfill({ json: { success: true, data: row } });
    }
    if (path.endsWith("/my-tasks"))
      return route.fulfill({ json: { success: true, data: [row] } });
    if (path.endsWith("/workflow"))
      return route.fulfill({ json: { success: true, data: row } });
    if (path.endsWith("/photo-links"))
      return route.fulfill({ json: { success: true, data: { photos: [] } } });
    if (path.endsWith("/timeline"))
      return route.fulfill({ json: { success: true, data: [] } });
    return route.fulfill({ status: 404 });
  });
  await page.goto("/admin/my-work");
  await page.getByRole("button", { name: /PE-REVIEW001/ }).click();
  const approve = page.getByRole("button", { name: "검수 승인", exact: true });
  await expect(approve).toBeDisabled();
  for (const label of ["닮음", "주요 특징", "하단 커팅", "출력 가능성"])
    await page.getByRole("checkbox", { name: label, exact: true }).check();
  await approve.click();
  await expect(page.getByRole("alert")).toBeVisible();
  await approve.click();
  await expect(page.getByRole("status")).toContainText(
    "검수를 승인했습니다. 색상 작업 대기로 넘어갔습니다."
  );
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBeTruthy();
  expect(keys[1]).toBe(keys[0]);
  await expect(
    page.getByRole("button", { name: "검수 승인", exact: true })
  ).toHaveCount(0);
});

test("수정 사유와 메모를 남기면 모델러에게 수정 작업을 돌려준다", async ({
  page,
}) => {
  await session(page);
  let row = initial();
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/me")) return route.fallback();
    if (path.endsWith("/review")) {
      const body = route.request().postDataJSON();
      expect(body.decision).toBe("CHANGES_REQUESTED");
      expect(body.reasonCode).toBe("EARS");
      expect(body.note).toBe("귀 끝을 둥글게 수정해 주세요.");
      row = {
        ...row,
        productionStage: "MODELING_QUEUE",
        taskId: 13,
        taskAttempt: 2,
        modelingTaskId: 13,
        version: 9,
        assignee: { id: 2, name: "모델러" },
        allowedActions: [],
        blockingIssues: ["QC_FAILED"],
        reviews: [
          {
            id: 1,
            decision: "CHANGES_REQUESTED",
            reasonCode: "EARS",
            note: body.note,
            modelingAttempt: 1,
            reviewerName: "검수 담당자",
            reviewedAt: "2026-09-12T09:00:00Z",
          },
        ],
      };
      return route.fulfill({ json: { success: true, data: row } });
    }
    if (path.endsWith("/my-tasks"))
      return route.fulfill({
        json: {
          success: true,
          data: row.productionStage === "MODEL_REVIEW" ? [row] : [],
        },
      });
    if (path.endsWith("/workflow"))
      return route.fulfill({ json: { success: true, data: row } });
    if (path.endsWith("/photo-links"))
      return route.fulfill({ json: { success: true, data: { photos: [] } } });
    if (path.endsWith("/timeline"))
      return route.fulfill({ json: { success: true, data: [] } });
    return route.fulfill({ status: 404 });
  });
  await page.goto("/admin/my-work");
  await page.getByRole("button", { name: /PE-REVIEW001/ }).click();
  const request = page.getByRole("button", { name: "수정 요청", exact: true });
  await expect(request).toBeDisabled();
  await page
    .getByRole("combobox", { name: "수정 사유", exact: true })
    .selectOption("EARS");
  await expect(request).toBeDisabled();
  await page
    .getByRole("textbox", { name: "검수 메모", exact: true })
    .fill("귀 끝을 둥글게 수정해 주세요.");
  await request.click();
  await expect(page.getByRole("status")).toContainText(
    "수정 작업을 생성했습니다."
  );
  await expect(
    page.getByText("귀 끝을 둥글게 수정해 주세요.", { exact: true })
  ).toBeVisible();
  await expect(page.getByText("이전 제출 자료", { exact: true })).toBeVisible();
});

test("수정 작업은 이전 파일만으로 완료할 수 없고 요청 사유를 보여준다", async ({
  page,
}) => {
  await session(page, true);
  const row = {
    ...initial(),
    productionStage: "MODELING",
    taskStatus: "IN_PROGRESS",
    taskId: 13,
    taskAttempt: 2,
    modelingTaskId: 13,
    assignee: { id: 2, name: "모델러" },
    allowedActions: ["UPLOAD_ARTIFACT", "COMPLETE_MODELING"],
    blockingIssues: ["QC_FAILED"],
    reviews: [
      {
        id: 1,
        decision: "CHANGES_REQUESTED",
        reasonCode: "EARS",
        note: "귀 끝 수정",
        modelingAttempt: 1,
        reviewerName: "검수 담당자",
        reviewedAt: "2026-09-12T09:00:00Z",
      },
    ],
  };
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/me")) return route.fallback();
    if (path.endsWith("/my-tasks"))
      return route.fulfill({ json: { success: true, data: [row] } });
    if (path.endsWith("/workflow"))
      return route.fulfill({ json: { success: true, data: row } });
    if (path.endsWith("/photo-links"))
      return route.fulfill({ json: { success: true, data: { photos: [] } } });
    if (path.endsWith("/timeline"))
      return route.fulfill({ json: { success: true, data: [] } });
    return route.fulfill({ status: 404 });
  });
  await page.goto("/admin/my-work");
  await page.getByRole("button", { name: /PE-REVIEW001/ }).click();
  await expect(
    page.getByRole("button", { name: "모델링 완료", exact: true })
  ).toBeDisabled();
  await expect(page.getByText("귀 끝 수정", { exact: true })).toBeVisible();
  await expect(page.getByText("이전 제출 자료", { exact: true })).toBeVisible();
  await expect(page.getByText("2차 모델링", { exact: true })).toBeVisible();
});
