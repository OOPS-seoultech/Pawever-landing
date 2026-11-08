import { test, expect, type Page } from "./adminFixtures";
import { zipSync, strToU8 } from "three/addons/libs/fflate.module.js";
const preview3mf = Buffer.from(
  zipSync({
    "_rels/.rels": strToU8(
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'
    ),
    "3D/3dmodel.model": strToU8(
      '<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources><object id="1" type="model"><mesh><vertices><vertex x="0" y="0" z="0"/><vertex x="10" y="0" z="0"/><vertex x="0" y="10" z="0"/><vertex x="0" y="0" z="20"/></vertices><triangles><triangle v1="0" v2="2" v3="1"/><triangle v1="0" v2="1" v3="3"/><triangle v1="1" v2="2" v3="3"/><triangle v1="0" v2="3" v3="2"/></triangles></mesh></object></resources><build><item objectid="1"/></build></model>'
    ),
  })
);
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+c3ioAAAAASUVORK5CYII=",
  "base64"
);
test.use({
  viewport: { width: 1440, height: 1000 },
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36",
  isMobile: false,
  hasTouch: false,
});
async function sample(page: Page) {
  await page.addInitScript(() =>
    sessionStorage.setItem("pawever.admin.accessToken", "review-test")
  );
  const state = {
    canDownloadPhotos: true,
    canViewPhotos: true,
    serial: 0,
    expiredThrough: 0,
    failOnce: false,
    uploads: [] as any[],
    loseConfirmationAt: 0,
    losePublication: false,
    modelRequests: 0,
    invalidModel: false,
    rows: [0, 1].map(petIndex => ({
      orderNumber: "IMAGE-TEST",
      petIndex,
      petName: petIndex ? "나비" : "보리",
      petCount: 2,
      guardianName: "보호자",
      goodsType: "figure",
      orderStatus: "ACTIVE",
      paymentStatus: "CONFIRMED",
      productionStage: "MODELING",
      shipmentStatus: "NOT_READY",
      version: 0,
      taskId: 101 + petIndex,
      taskAttempt: 1,
      modelingTaskId: 101 + petIndex,
      taskStatus: "IN_PROGRESS",
      assignee: { id: 1, name: "제작자" },
      allowedActions: ["UPLOAD_ARTIFACT"],
      blockingIssues: [],
      reviews: [],
      salePriceKrw: 37800,
      salePriceCustom: false,
      expectedAmount: 37800,
      pets: [
        { petIndex: 0, petName: "보리", productionStage: "MODELING" },
        { petIndex: 1, petName: "나비", productionStage: "MODELING" },
      ],
      artifacts: ["front", "left", "right", "back"].map(name => ({
        id: `view-${petIndex}-${name}`,
        kind: "MULTIVIEW",
        fileName: `${name}.png`,
        taskId: 101 + petIndex,
        modelingAttempt: 1,
        size: png.length,
        replacesArtifactId: null as string | null,
      })),
    })),
  };
  const uploadJobs = new Map<string, any>();
  const confirmedUploads = new Set<string>();
  const stagedImages = new Map<string, any>();
  const publications = new Map<string, any>();
  await page.route("**/__model/**", route => {
    state.modelRequests++;
    return route.fulfill({
      contentType: "application/octet-stream",
      body: state.invalidModel ? Buffer.from("not a 3mf") : preview3mf,
    });
  });
  await page.context().route("**/__image/**", route => {
    const url = new URL(route.request().url());
    if (
      Number(url.searchParams.get("v")) <= state.expiredThrough ||
      state.failOnce
    ) {
      state.failOnce = false;
      return route.fulfill({
        status: 403,
        contentType: "application/xml",
        body: "<Error>RequestExpired</Error>",
      });
    }
    return route.fulfill({ contentType: "image/png", body: png });
  });
  await page.route("**/api/**", async route => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname;
    const pet = Number(url.searchParams.get("petIndex") ?? 0),
      row = state.rows[pet];
    const link = (id: string) => ({
      url: `${url.origin}/__image/${id}.png?v=${++state.serial}`,
      expiresAt: "2030-01-01T00:00:00Z",
    });
    let data: any = [];
    if (path.endsWith("/me"))
      data = {
        id: 1,
        name: "대표",
        role: "OWNER",
        workRoles: ["MODELING"],
        permissions: [
          "VIEW_ORDER_BASIC",
          "VIEW_ALL_ORDERS",
          ...(state.canViewPhotos ? ["VIEW_CUSTOMER_PHOTOS"] : []),
          ...(state.canDownloadPhotos ? ["DOWNLOAD_CUSTOMER_PHOTOS"] : []),
          "VIEW_PRODUCTION_FILES",
          "DOWNLOAD_PRODUCTION_FILES",
          "MANAGE_ACCOUNTS",
          "VIEW_FILAMENT",
          "MANAGE_PRINT_BATCH",
          "PACK_AND_EXPORT_SHIPMENTS",
          "MANAGE_OPERATION_SETTINGS",
          "VIEW_PAYMENT",
        ],
      };
    else if (path === "/api/admin/notices/onboarding") data = { notice: null };
    else if (path === "/api/production/file-targets")
      data = { orders: [], plates: [] };
    else if (path.endsWith("/workflow")) data = row;
    else if (path.endsWith("/workflow/orders")) data = state.rows;
    else if (path.endsWith("/sale-price")) {
      const body = request.postDataJSON();
      const target = state.rows[body.petIndex];
      expect(body.version).toBe(target.version);
      expect(request.headers()["idempotency-key"]).toBeTruthy();
      const version = target.version + 1;
      for (const value of state.rows)
        Object.assign(value, {
          salePriceKrw: body.salePriceKrw,
          salePriceCustom: body.custom,
          version,
        });
      data = target;
    } else if (path.endsWith("/photo-links"))
      data = {
        photos: [1, 2, 3].map(slot => ({
          slot,
          photoId: `photo-${pet}-${slot}`,
          petIndex: pet,
          ...link(`photo-${pet}-${slot}`),
        })),
      };
    else if (path.endsWith("/download-link"))
      data = path.includes("model-preview")
        ? { url: `${url.origin}/__model/file.3mf`, expiresAt: "2030-01-01" }
        : link(path.split("/").at(-2)!);
    else if (path.endsWith("/artifacts/multiview.zip"))
      return route.fulfill({
        contentType: "application/zip",
        body: Buffer.from("UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==", "base64"),
      });
    else if (path.endsWith("/upload-requests")) {
      const key = request.headers()["idempotency-key"];
      let job = uploadJobs.get(key);
      if (!job) {
        const body = request.postDataJSON();
        const target = state.rows.find(
          r => r.taskId === Number(path.split("/")[4])
        )!;
        expect(body.version).toBe(target.version);
        state.uploads.push(body);
        job = {
          body,
          target,
          response: {
            artifactId: `upload-${state.uploads.length}`,
            version: ++target.version,
            url: `${url.origin}/__upload`,
            headers: { "Content-Type": body.contentType },
          },
        };
        uploadJobs.set(key, job);
      }
      data = job.response;
    } else if (/\/artifacts\/upload-\d+\/confirm$/.test(path)) {
      const id = path.split("/").at(-2)!;
      const job = [...uploadJobs.values()].find(
        j => j.response.artifactId === id
      )!;
      const { body, target } = job;
      if (!confirmedUploads.has(id)) {
        expect(request.postDataJSON().version).toBe(target.version);
        const file = {
          id,
          kind: "MULTIVIEW",
          fileName: body.fileName,
          taskId: target.taskId,
          modelingAttempt: 1,
          size: body.size,
          replacesArtifactId: body.replacesArtifactId,
        };
        if (body.stageMultiview) stagedImages.set(id, file);
        else target.artifacts.push(file);
        target.version++;
        confirmedUploads.add(id);
      }
      if (id === `upload-${state.loseConfirmationAt}`) {
        state.loseConfirmationAt = 0;
        return route.abort("failed");
      }
      data = target;
    } else if (path.endsWith("/artifacts/multiview-set")) {
      const key = request.headers()["idempotency-key"];
      if (!publications.has(key)) {
        const body = request.postDataJSON();
        const target = state.rows.find(
          r => r.taskId === Number(path.split("/")[4])
        )!;
        expect(body.version).toBe(target.version);
        expect(body.artifactIds).toHaveLength(4);
        target.artifacts = target.artifacts.filter(
          a => a.kind !== "MULTIVIEW" || a.taskId !== target.taskId
        );
        target.artifacts.push(
          ...body.artifactIds.map((id: string) => stagedImages.get(id))
        );
        target.version++;
        publications.set(key, structuredClone(target));
      }
      if (state.losePublication) {
        state.losePublication = false;
        return route.abort("failed");
      }
      data = publications.get(key);
    } else if (path.match(/^\/api\/admin\/orders\/[^/]+$/))
      data = {
        orderNumber: "IMAGE-TEST",
        petName: "보리",
        submittedAt: "2026-11-07T00:00:00Z",
        status: "IN_PRODUCTION",
        goodsType: "figure",
        goodsTypeLabel: "피규어",
        photos: [],
        shipping: null,
        payment: null,
        pricing: null,
        marketing: null,
        statusHistory: [],
        accessLogs: [],
        pets: state.rows.map(r => ({
          index: r.petIndex,
          petName: r.petName,
          photoCount: 3,
          keyringAdded: false,
        })),
      };
    await route.fulfill({ json: { success: true, data } });
  });
  await page.route("**/__upload", route =>
    route.fulfill({ status: 200, body: "" })
  );
  return state;
}
test("우측 상단 공지, 아이별 사진과 4면도 2×2, 70% 확대·좌우·저장을 제공한다", async ({
  page,
}) => {
  await sample(page);
  await page.goto("/admin/orders/IMAGE-TEST?petIndex=1");
  await expect(
    page.getByRole("navigation", { name: "관리 메뉴" }).getByRole("link")
  ).toHaveText([
    "내 작업",
    "전체 주문·배송",
    "플레이트·출력 대기",
    "포장·준등기",
    "완료 주문·AS",
    "필라멘트",
    "입금·제작 관리",
    "담당자 설정",
    "작업자 정산",
    "운영 현황",
    "로컬 파일",
  ]);
  await expect(
    page
      .getByRole("banner")
      .getByRole("link", { name: "공지사항", exact: true })
  ).toHaveCount(1);
  await expect(
    page
      .getByRole("navigation", { name: "관리 메뉴" })
      .getByRole("link", { name: "공지사항", exact: true })
  ).toHaveCount(0);
  const compare = page.getByRole("region", { name: "고객 사진·4면도 비교" });
  await expect(compare.getByRole("img")).toHaveCount(7);
  const boxes = await Promise.all(
    ["front", "left", "right", "back"].map(name =>
      compare
        .getByRole("img", { name: `${name}.png`, exact: true })
        .boundingBox()
    )
  );
  expect(Math.abs(boxes[0]!.y - boxes[1]!.y)).toBeLessThan(2);
  expect(boxes[2]!.y).toBeGreaterThan(boxes[0]!.y);
  expect(Math.abs(boxes[2]!.y - boxes[3]!.y)).toBeLessThan(2);
  await compare.getByRole("img", { name: "고객 사진 1", exact: true }).click();
  const modal = page.getByRole("dialog");
  await expect(
    modal.getByRole("img", { name: "고객 사진 1 확대" })
  ).toBeVisible();
  expect((await modal.boundingBox())!.width / 1440).toBeCloseTo(0.7, 1);
  expect((await modal.boundingBox())!.height / 1000).toBeCloseTo(0.7, 1);
  const nextArea = modal.getByRole("button", { name: "다음 이미지" });
  const nextBox = (await nextArea.boundingBox())!;
  expect(nextBox.height).toBeGreaterThan(300);
  expect(nextBox.width).toBeGreaterThan(60);
  await nextArea.click({ position: { x: nextBox.width / 2, y: 8 } });
  await expect(
    modal.getByRole("img", { name: "고객 사진 2 확대" })
  ).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(
    modal.getByRole("img", { name: "고객 사진 1 확대" })
  ).toBeVisible();
  await nextArea.click({
    position: { x: nextBox.width / 2, y: nextBox.height - 8 },
  });
  await expect(
    modal.getByRole("img", { name: "고객 사진 2 확대" })
  ).toBeVisible();
  const previousArea = modal.getByRole("button", { name: "이전 이미지" });
  const previousBox = (await previousArea.boundingBox())!;
  await previousArea.click({
    position: { x: previousBox.width / 2, y: previousBox.height - 8 },
  });
  await expect(
    modal.getByRole("img", { name: "고객 사진 1 확대" })
  ).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await modal.getByRole("button", { name: "저장하기", exact: true }).click();
  expect((await downloaded).suggestedFilename()).toMatch(
    /^\d{4}_나비_보호자\.png$/
  );
  await modal.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(modal).toHaveCount(0);
  await compare.getByRole("img", { name: "front.png", exact: true }).click();
  await expect(
    modal.getByRole("img", { name: "front.png 확대" })
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^보리 ·/ }).click();
  await expect(
    page.getByRole("heading", { name: "신청 사진 · 보리" })
  ).toBeVisible();
  await expect(
    compare.getByRole("img", { name: "고객 사진 1", exact: true })
  ).toHaveAttribute("src", /photo-0-1/);
});
test("오래된 링크 대신 새 링크를 받고 ⌘클릭은 새 탭으로 연다", async ({
  page,
}) => {
  const state = await sample(page);
  await page.goto("/admin/orders/IMAGE-TEST?petIndex=1");
  const image = page.getByRole("img", { name: "고객 사진 1", exact: true });
  await expect(image).toBeVisible();
  state.expiredThrough = state.serial;
  await image.click();
  const modal = page.getByRole("dialog");
  const full = modal.getByRole("img", { name: "고객 사진 1 확대" });
  await expect(full).toBeVisible();
  expect(
    Number(new URL((await full.getAttribute("src"))!).searchParams.get("v"))
  ).toBeGreaterThan(state.expiredThrough);
  await modal.getByRole("button", { name: "닫기", exact: true }).click();
  state.expiredThrough = state.serial;
  const opened = page.waitForEvent("popup");
  await image.click({ modifiers: ["Meta"] });
  const tab = await opened;
  await tab.waitForURL("**/__image/**");
  expect(Number(new URL(tab.url()).searchParams.get("v"))).toBeGreaterThan(
    state.expiredThrough
  );
  await tab.close();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("4면도 교체 후 현재 4개만 표시하고 이전 파일과 제작 단계는 보존한다", async ({
  page,
}) => {
  const state = await sample(page);
  await page.goto("/admin/orders/IMAGE-TEST?petIndex=1");
  await page
    .getByRole("button", { name: "front.png 교체", exact: true })
    .click();
  const replacementModal = page.getByRole("dialog", {
    name: "4면도 이미지 교체",
  });
  await expect(replacementModal).toBeVisible();
  await expect(replacementModal.getByLabel("교체할 이미지 파일")).toBeHidden();
  const choose = replacementModal.getByRole("button", {
    name: "새 이미지 파일 선택",
    exact: true,
  });
  const firstPicker = page.waitForEvent("filechooser");
  await choose.click();
  await (
    await firstPicker
  ).setFiles({ name: "draft.png", mimeType: "image/png", buffer: png });
  await expect(
    replacementModal.getByRole("img", { name: "교체할 새 이미지" })
  ).toBeVisible();
  const nextPicker = page.waitForEvent("filechooser");
  await choose.press("Enter");
  await (
    await nextPicker
  ).setFiles({ name: "replacement.png", mimeType: "image/png", buffer: png });
  await expect(
    replacementModal.getByRole("img", { name: "교체할 새 이미지" })
  ).toBeVisible();
  expect(state.uploads).toHaveLength(0);
  await replacementModal
    .getByRole("button", { name: "교체하기", exact: true })
    .click();
  await expect(replacementModal).toHaveCount(0);
  const compare = page.getByRole("region", { name: "고객 사진·4면도 비교" });
  await expect(
    compare.getByRole("img", { name: "replacement.png", exact: true })
  ).toBeVisible();
  await expect(compare.getByRole("img")).toHaveCount(7);
  await expect(
    compare.getByRole("img", { name: "front.png", exact: true })
  ).toHaveCount(0);
  expect(state.uploads[0]).toMatchObject({
    kind: "MULTIVIEW",
    replacesArtifactId: "view-1-front",
  });
  expect(state.rows[1].artifacts).toHaveLength(5);
  expect(state.rows[1].productionStage).toBe("MODELING");
  expect(state.rows[0].artifacts).toHaveLength(4);
});

for (const [oldCount, failure] of [
  [0, ""],
  [3, ""],
  [4, ""],
  [6, ""],
  [3, "file"],
  [4, "publish"],
] as const) {
  test(`기존 ${oldCount}장 → 새 4장 전체 교체 (${failure || "정상"})`, async ({
    page,
  }) => {
    const state = await sample(page);
    state.rows[1].artifacts = Array.from({ length: oldCount }, (_, i) => ({
      ...state.rows[1].artifacts[0],
      id: `old-${i}`,
      fileName: `old-${i}.png`,
    }));
    state.loseConfirmationAt = failure === "file" ? 2 : 0;
    state.losePublication = failure === "publish";
    await page.goto("/admin/orders/IMAGE-TEST?petIndex=1");
    if (oldCount > 4)
      await expect(
        page.getByText(`이전 등록 사진이 ${oldCount}장 남아 있습니다.`, {
          exact: false,
        })
      ).toBeVisible();
    const jpeg = Buffer.from(
      await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 3;
        return canvas.toDataURL("image/jpeg").split(",")[1];
      }),
      "base64"
    );
    const picker = page.waitForEvent("filechooser");
    await page
      .getByRole("button", { name: "4면도 등록·교체", exact: true })
      .click();
    const chooser = await picker;
    expect(chooser.isMultiple()).toBe(true);
    await chooser.setFiles([
      { name: "front.png", mimeType: "image/png", buffer: png },
      {
        name: "left.svg",
        mimeType: "image/svg+xml",
        buffer: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="3" height="3"><rect width="3" height="3" fill="blue"/></svg>'
        ),
      },
      { name: "right.JPG", mimeType: "image/jpeg", buffer: jpeg },
      { name: "back.png", mimeType: "image/png", buffer: png },
    ]);
    if (failure === "file") {
      await expect(page.getByRole("alert")).toContainText("left.svg");
      expect(state.rows[1].artifacts).toHaveLength(oldCount);
      await page
        .getByRole("button", { name: "남은 3장 다시 등록", exact: true })
        .click();
    }
    if (failure === "publish") {
      await expect(page.getByRole("alert")).toContainText("교체 확정");
      expect(state.rows[1].artifacts).toHaveLength(4);
      await page
        .getByRole("button", { name: "4면도 교체 확정 다시 시도", exact: true })
        .click();
    }
    await expect(
      page.getByRole("status").filter({ hasText: "4면도 4장 등록 완료" })
    ).toBeVisible();
    expect(state.uploads.map(file => file.fileName)).toEqual([
      "front.png",
      "left.png",
      "right.JPG",
      "back.png",
    ]);
    expect(state.rows[1].artifacts.map(file => file.fileName)).toEqual([
      "front.png",
      "left.png",
      "right.JPG",
      "back.png",
    ]);
    expect(state.rows[1].version).toBe(9);
    await expect(
      page.getByText(/이전 등록 사진이 \d+장 남아 있습니다/)
    ).toHaveCount(0);
    expect(state.rows[1].productionStage).toBe("MODELING");
    expect(state.rows[0].artifacts).toHaveLength(4);
    await expect(
      page.getByRole("button", { name: /남은 \d+장 다시 등록/ })
    ).toHaveCount(0);
    const comparison = page.getByRole("region", {
      name: "고객 사진·4면도 비교",
    });
    await expect(
      comparison.getByRole("img", { name: "left.png", exact: true })
    ).toBeVisible();
    await expect(comparison.getByRole("img")).toHaveCount(7);
  });
}

for (const count of [1, 3, 5]) {
  test(`전체 4면도는 ${count}장 선택을 거부하고 기존 이미지를 유지한다`, async ({
    page,
  }) => {
    const state = await sample(page);
    await page.goto("/admin/orders/IMAGE-TEST?petIndex=1");
    await page.getByLabel("4면도 파일 선택", { exact: true }).setInputFiles(
      Array.from({ length: count }, (_, i) => ({
        name: `view-${i}.png`,
        mimeType: "image/png",
        buffer: png,
      }))
    );
    await expect(page.getByRole("alert")).toContainText("정확히 4장");
    expect(state.uploads).toHaveLength(0);
    expect(state.rows[1].artifacts).toHaveLength(4);
  });
}

test("고객 사진 저장 권한이 없으면 확대는 허용하고 저장은 비활성화한다", async ({
  page,
}) => {
  const state = await sample(page);
  state.canDownloadPhotos = false;
  await page.goto("/admin/orders/IMAGE-TEST?petIndex=1");
  await page.getByRole("img", { name: "고객 사진 1", exact: true }).click();
  const modal = page.getByRole("dialog");
  await expect(
    modal.getByRole("img", { name: "고객 사진 1 확대" })
  ).toBeVisible();
  await expect(
    modal.getByRole("button", { name: "저장하기", exact: true })
  ).toBeDisabled();
});

for (const format of ["SVG", "JPG"]) {
  test(`${format}도 교체 모달에서 미리보고 업로드한다`, async ({ page }) => {
    const state = await sample(page);
    let externalRequests = 0;
    await page.route("https://svg-external.invalid/**", route => {
      externalRequests++;
      return route.abort();
    });
    await page.goto("/admin/orders/IMAGE-TEST?petIndex=1");
    const bytes =
      format === "SVG"
        ? Buffer.from(
            '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60" onload="window.svgRan=true"><script>window.svgRan=true</script><rect width="80" height="60" fill="blue"/><image href="https://svg-external.invalid/image.png" width="1" height="1"/></svg>'
          )
        : Buffer.from(
            await page.evaluate(() => {
              const canvas = document.createElement("canvas");
              canvas.width = 3;
              canvas.height = 3;
              return canvas.toDataURL("image/jpeg").split(",")[1];
            }),
            "base64"
          );
    await page
      .getByRole("button", { name: "front.png 교체", exact: true })
      .click();
    const modal = page.getByRole("dialog", { name: "4면도 이미지 교체" });
    await modal.getByLabel("교체할 이미지 파일").setInputFiles({
      name: format === "SVG" ? "vector.svg" : "photo.JPG",
      mimeType: format === "SVG" ? "image/svg+xml" : "application/octet-stream",
      buffer: bytes,
    });
    await expect(
      modal.getByRole("img", { name: "교체할 새 이미지" })
    ).toBeVisible();
    const preview = await modal
      .getByRole("img", { name: "교체할 새 이미지" })
      .evaluate(image => ({
        width: (image as HTMLImageElement).naturalWidth,
        height: (image as HTMLImageElement).naturalHeight,
      }));
    expect(preview.width).toBeGreaterThan(0);
    expect(state.uploads).toHaveLength(0);
    await modal.getByRole("button", { name: "교체하기", exact: true }).click();
    await expect(modal).toHaveCount(0);
    expect(state.uploads[0]).toMatchObject({
      fileName: format === "SVG" ? "vector.png" : "photo.JPG",
      contentType: format === "SVG" ? "image/png" : "image/jpeg",
      replacesArtifactId: "view-1-front",
    });
    if (format === "SVG") {
      expect(preview).toEqual({ width: 1024, height: 768 });
      expect(await page.evaluate(() => (window as any).svgRan)).toBeUndefined();
      expect(externalRequests).toBe(0);
    }
  });
}
test("교체 모달에서 취소하면 현재 이미지와 파일은 유지된다", async ({
  page,
}) => {
  const state = await sample(page);
  await page.goto("/admin/orders/IMAGE-TEST?petIndex=1");
  const icon = page.getByRole("button", {
    name: "front.png 교체",
    exact: true,
  });
  const iconBox = (await icon.boundingBox())!;
  expect(iconBox.width).toBeLessThanOrEqual(36);
  await icon.click();
  const modal = page.getByRole("dialog", { name: "4면도 이미지 교체" });
  await modal.getByLabel("교체할 이미지 파일").setInputFiles({
    name: "cancelled.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(
    modal.getByRole("img", { name: "교체할 새 이미지" })
  ).toBeVisible();
  await modal.getByRole("button", { name: "취소", exact: true }).click();
  await expect(modal).toHaveCount(0);
  expect(state.uploads).toHaveLength(0);
  expect(state.rows[1].artifacts).toHaveLength(4);
});

test("모델링 자료의 4면도는 ZIP 버튼만 제공하고 정보 배경과 중요 영역을 구분한다", async ({
  page,
}) => {
  await sample(page);
  await page.goto("/admin/orders/IMAGE-TEST?petIndex=1");
  const materials = page.getByRole("region", {
    name: "모델링 자료",
    exact: true,
  });
  await expect(materials.getByText("front.png", { exact: true })).toHaveCount(
    0
  );
  await expect(
    materials.getByLabel("4면도 파일 선택", { exact: true })
  ).toHaveCount(0);
  const zip = materials.getByRole("button", {
    name: "파일 내려받기 (ZIP)",
    exact: true,
  });
  await expect(zip).toBeEnabled();
  await expect(zip).toHaveCSS("background-color", "rgb(255, 225, 189)");
  const comparison = page.getByRole("region", { name: "고객 사진·4면도 비교" });
  await expect(comparison).toHaveCSS("background-color", "rgb(248, 248, 248)");
  expect(
    await comparison
      .getByRole("heading", { name: "신청 사진 · 나비" })
      .evaluate(el => getComputedStyle(el.parentElement!).backgroundColor)
  ).toBe("rgb(255, 255, 255)");
  const download = page.waitForEvent("download");
  await zip.click();
  expect((await download).suggestedFilename()).toMatch(
    /^\d{4}_나비_보호자\.zip$/
  );
  await page.goto("/privacy", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).not.toHaveClass(/admin-theme/);
});

test("상세 주석 반영: 15px 카드·헤더 순서·주문 내 판매가·3MF 자료", async ({
  page,
}) => {
  const state = await sample(page);
  state.rows[1].artifacts.push({
    id: "model-preview",
    kind: "MODEL_SOURCE",
    fileName: "나비_모델원본_샘플.3mf",
    taskId: 102,
    modelingAttempt: 1,
    size: 1200,
    replacesArtifactId: null,
  });
  await page.goto("/admin/orders/IMAGE-TEST?petIndex=1");
  const comparison = page.getByRole("region", { name: "고객 사진·4면도 비교" });
  const card = comparison
    .getByRole("heading", { name: "신청 사진 · 나비" })
    .locator("..");
  await expect(card).toHaveCSS("border-radius", "15px");
  const headerItems = await page
    .locator("header")
    .getByRole("link")
    .allTextContents();
  expect(headerItems.at(-1)).toBe("공지사항");
  const notice = await page
    .locator("header")
    .getByRole("link", { name: "공지사항" })
    .boundingBox();
  const logout = await page
    .getByRole("button", { name: "로그아웃" })
    .boundingBox();
  expect(notice!.x + notice!.width).toBeLessThan(logout!.x);
  const order = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "주문", exact: true }) });
  await expect(
    order.getByRole("region", { name: "주문 판매가", exact: true })
  ).toBeVisible();
  await order.getByRole("switch", { name: "직접 입력", exact: true }).check();
  await order.getByLabel("주문 판매가 (원)", { exact: true }).fill("40000");
  await order.getByRole("button", { name: "판매가 저장", exact: true }).click();
  await expect(
    order.getByRole("region", { name: "주문 판매가", exact: true })
  ).toContainText("40,000원");
  expect(state.rows[1].salePriceKrw).toBe(40000);
  expect(state.rows[1].expectedAmount).toBe(37800);
  expect(state.rows[0].salePriceKrw).toBe(40000);

  await expect(
    page
      .getByRole("region", { name: "작업 상세" })
      .getByRole("region", { name: "주문 판매가" })
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "로컬 파일에서 자료 등록" })
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "사진 파일", exact: true })
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("region", { name: "모델링 자료" })
      .getByText("나비_모델원본_샘플.3mf")
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "모델링 자료" })
      .getByRole("button", { name: "파일 내려받기 (3MF)", exact: true })
  ).toBeEnabled();
  const fileButton = page.getByRole("button", {
    name: "파일 내려받기 (3MF)",
    exact: true,
  });
  await expect(fileButton).toHaveCSS("background-color", "rgb(255, 225, 189)");
  const fileRow = fileButton.locator("..");
  const filename = fileRow.getByText("나비_모델원본_샘플.3mf", { exact: true });
  expect((await fileButton.boundingBox())!.x).toBeLessThan(
    (await filename.boundingBox())!.x
  );
  const fileDownload = page.waitForEvent("download");
  await fileButton.click();
  expect((await fileDownload).suggestedFilename()).toMatch(
    /^\d{4}_나비_보호자\.3mf$/
  );
  const titles = await page
    .locator("main > div.grid > section > h2")
    .allTextContents();
  expect(titles.slice(0, 2)).toEqual(["배송", "주문"]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBeTruthy();
});

test("3MF 원본은 요청할 때만 3D 비교하고 회전·시점 변경·닫기를 제공한다", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).__viewerDraws = 0;
    const prototype = WebGL2RenderingContext.prototype as any;
    for (const method of ["drawElements", "drawArrays"]) {
      const original = prototype[method];
      prototype[method] = function (...args: any[]) {
        (window as any).__viewerDraws++;
        return original.apply(this, args);
      };
    }
  });
  const state = await sample(page);
  state.rows[1].artifacts.push({
    id: "model-preview",
    kind: "MODEL_SOURCE",
    fileName: "나비.3mf",
    taskId: 102,
    modelingAttempt: 1,
    size: preview3mf.length,
    replacesArtifactId: null,
  });
  state.rows[1].artifacts.push({
    id: "sliced-file",
    kind: "PRINT_MODEL",
    fileName: "나비.gcode.3mf",
    taskId: 102,
    modelingAttempt: 1,
    size: 1000,
    replacesArtifactId: null,
  });
  await page.goto("/admin/orders/IMAGE-TEST?petIndex=1");
  const open = page.getByRole("button", {
    name: "4면도와 3D 비교하기",
    exact: true,
  });
  await expect(open).toBeVisible();
  expect(state.modelRequests).toBe(0);
  await expect(page.locator("canvas")).toHaveCount(0);
  await open.click();
  const dialog = page.getByRole("dialog", {
    name: "사진 · 4면도 · 3D 비교 — 나비",
  });
  await expect(
    dialog.getByText("3D 모델 준비 완료", { exact: true })
  ).toBeVisible({ timeout: 30000 });
  expect(state.modelRequests).toBe(1);
  await page.waitForTimeout(200);
  const drawCount = await page.evaluate(() => (window as any).__viewerDraws);
  expect(drawCount).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as any).__viewerDraws)).toBe(
    drawCount
  );
  await expect(
    dialog.getByLabel("3D 모델", { exact: true }).locator("option")
  ).toHaveCount(1);
  await expect(
    dialog.getByRole("region", { name: "3D 비교 고객 사진" }).getByRole("img")
  ).toHaveCount(3);
  await expect(
    dialog.getByRole("region", { name: "3D 비교 4면도" }).getByRole("img")
  ).toHaveCount(4);
  const canvas = dialog.getByRole("img", { name: "드래그로 회전하는 3D 모델" });
  const before = await canvas.screenshot();
  await dialog.getByRole("button", { name: "왼쪽", exact: true }).click();
  expect(await canvas.screenshot()).not.toEqual(before);
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.6, {
    steps: 8,
  });
  await page.mouse.up();
  expect(await canvas.screenshot()).not.toEqual(before);
  const beforeKeyboard = await canvas.screenshot();
  await canvas.press("Shift+ArrowRight");
  expect(await canvas.screenshot()).not.toEqual(beforeKeyboard);
  await dialog.getByRole("button", { name: "3D 확대", exact: true }).click();
  expect(await canvas.screenshot()).not.toEqual(beforeKeyboard);
  await dialog.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(page.locator("canvas")).toHaveCount(0);
  await open.click();
  await expect(
    page.getByText("3D 모델 준비 완료", { exact: true })
  ).toBeVisible();
  expect(state.modelRequests).toBe(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBeTruthy();
});
test("3D 비교 실패는 안내하고 다시 불러올 수 있으며 출력용 파일은 미리보기 대상에서 뺀다", async ({
  page,
}) => {
  const state = await sample(page);
  state.invalidModel = true;
  state.canViewPhotos = false;
  state.rows[1].artifacts.push({
    id: "model-preview",
    kind: "MODEL_SOURCE",
    fileName: "나비.3mf",
    taskId: 102,
    modelingAttempt: 1,
    size: preview3mf.length,
    replacesArtifactId: null,
  });
  await page.goto("/admin/orders/IMAGE-TEST?petIndex=1");
  await page
    .getByRole("button", { name: "4면도와 3D 비교하기", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.getByRole("region", { name: "3D 비교 고객 사진" })
  ).toHaveCount(0);
  await expect(page.locator("canvas")).toHaveCount(0);
  state.invalidModel = false;
  await page
    .getByRole("button", { name: "다시 불러오기", exact: true })
    .click();
  await expect(
    page.getByText("3D 모델 준비 완료", { exact: true })
  ).toBeVisible();
});

test("비교 버튼은 사진 영역 아래 전체 너비이며 모델이 없으면 회색으로 비활성화된다", async ({
  page,
}) => {
  await sample(page);
  await page.goto("/admin/orders/IMAGE-TEST?petIndex=1");
  const comparison = page.getByRole("region", { name: "고객 사진·4면도 비교" });
  const button = page.getByRole("button", {
    name: "4면도와 3D 비교하기",
    exact: true,
  });
  await expect(button).toBeDisabled();
  await expect(button).toHaveCSS("background-color", "rgb(248, 248, 248)");
  const a = (await comparison.boundingBox())!,
    b = (await button.boundingBox())!;
  expect(Math.abs(a.width - b.width)).toBeLessThan(2);
  expect(b.y).toBeGreaterThanOrEqual(a.y + a.height);
  await expect(
    comparison.getByRole("button", { name: "4면도와 3D 비교하기" })
  ).toHaveCount(0);
});
