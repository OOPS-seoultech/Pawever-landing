import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 관리자 화면이 부칠 건과 넘겨줄 건을 갈라 보여주는지.
 *
 * 현장 수령 주문은 주소가 비어 있다. 서버가 일부러 받지 않기 때문이다 —
 * 받는 사람이 그 자리에 오므로 쓰지 않을 주소를 보관할 이유가 없다.
 *
 * 그래서 화면이 방법을 함께 보여 주지 않으면, 운영자는 빈 주소를 보고
 * "신청자가 주소를 빠뜨렸다"고 읽는다. 스무 건을 포장하는 자리에서 그
 * 오해는 한 건을 엉뚱한 곳으로 부치거나, 현장에 온 사람을 빈손으로
 * 돌려보내는 것으로 끝난다.
 *
 * 이 화면들은 로그인이 필요해 E2E 가 닿지 않는다. 눌러 보는 대신 화면이
 * 무엇을 그리기로 되어 있는지를 소스에서 확인한다.
 */

const list = readFileSync(
  new URL("./AdminOrders.tsx", import.meta.url),
  "utf8"
).replace(/\s+/g, " ");

// 상세 본문은 패널에 있다. 목록의 드로어와 /admin/orders/:orderNumber 가
// 같은 것을 그려야 해서 한 곳에 둔다.
const detail = readFileSync(
  new URL("./AdminOrderPanel.tsx", import.meta.url),
  "utf8"
).replace(/\s+/g, " ");

describe("관리자 화면의 수령 방법", () => {
  it("목록에 수령 열이 있다", () => {
    // 상세를 하나씩 열어 확인하게 두면 반드시 한 건이 섞인다.
    expect(list).toContain(">수령</th>");
    expect(list).toContain('order.deliveryMethod === "PICKUP"');
    expect(list).toContain("현장 수령");
    expect(list).toContain("택배");
  });

  it("목록에서 상세로 화면을 옮기지 않는다", () => {
    // 상세로 갔다 돌아오면 필터도 페이지도 풀린다. 70건을 그렇게 처리하면
    // 같은 자리를 몇 번씩 찾아 들어간다.
    expect(list).toContain("setOpened(order.orderNumber)");
    expect(list).not.toContain("setLocation(`/admin/orders/${order.orderNumber}`)");
    expect(list).toContain("<AdminOrderPanel");
  });

  it("줄마다 다음에 할 일이 하나 붙는다", () => {
    expect(list).toContain("primaryRowAction(");
    expect(list).toContain(">처리</th>");
    // 줄을 누르면 드로어가 열린다. 버튼은 그 자리에서 끝내는 것이라
    // 눌림이 줄까지 올라가면 안 된다.
    expect(list).toContain("event.stopPropagation()");
  });

  it("상세 주소는 북마크용으로 남는다", () => {
    // 지금까지 나눈 링크가 깨지면 안 된다.
    const page = readFileSync(
      new URL("./AdminOrderDetail.tsx", import.meta.url),
      "utf8"
    ).replace(/\s+/g, " ");
    expect(page).toContain("<AdminOrderPanel");
    expect(page).toContain("useParams");
  });

  it("상세는 방법을 주소보다 먼저 말한다", () => {
    // 주소가 빈 이유를 알고 나서 봐야 빠뜨린 것과 구분된다.
    const methodAt = detail.indexOf('label="수령 방법"');
    const addressAt = detail.indexOf('label="주소"');
    expect(methodAt).toBeGreaterThan(-1);
    expect(addressAt).toBeGreaterThan(-1);
    expect(methodAt).toBeLessThan(addressAt);
  });

  it("현장 수령 주문은 송장 대신 수령 완료로 끝낸다", () => {
    // 발송 완료는 송장을 넣어야 넘어간다. 현장 수령에는 넣을 송장이 없어서,
    // 따로 끝낼 길이 없으면 제작 중에 영원히 남거나 가짜 송장을 넣게 된다.
    expect(detail).toContain("canCompletePickup(");
    expect(detail).toContain("completeAdminPickup(");
    expect(detail).toContain("수령 완료");
    // 송장 등록은 수령 방법을 보고 연다. 두 길이 함께 열리면 안 된다.
    expect(detail).toMatch(/canRegisterTracking\([^)]*deliveryMethod/);
  });

  it("취소 안내는 결제 대행사에 묶인 주문인지에 따라 갈린다", () => {
    // 계좌이체 주문에 "결제도 함께 취소됐다"고 말하면 환불 안 된 취소가 생긴다.
    expect(detail).toContain("cancelGuide(");
    expect(detail).toContain("pgLinked");
  });

  it("현장 수령이면 주소 자리에 이유를 적는다", () => {
    // 빈칸이나 "-" 로 두면 빠뜨린 주소와 구분되지 않는다.
    expect(detail).toContain("현장에서 직접 전달 — 주소를 받지 않음");
    expect(detail).toContain("현장 수령 (배송비 없음)");
  });
});
