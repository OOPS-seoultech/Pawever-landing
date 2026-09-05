import { useCallback, useState } from "react";
import { useParams } from "wouter";
import { AdminShell, useAdminGuard } from "@/components/AdminShell";
import { AdminOrderPanel } from "./AdminOrderPanel";

/**
 * 주문 하나만 보는 주소.
 *
 * 평소에는 목록에서 드로어로 연다. 이 주소는 북마크와 공유 링크가 닿는
 * 자리로 남겨 둔다 — 목록으로 바꾸면 지금까지 나눈 링크가 전부 깨진다.
 */
export default function AdminOrderDetail() {
  const role = useAdminGuard();
  const { orderNumber = "" } = useParams<{ orderNumber: string }>();
  const [, setReloadKey] = useState(0);
  const noteChange = useCallback(() => setReloadKey((key) => key + 1), []);

  return (
    <AdminShell
      title={`주문 ${orderNumber}`}
      role={role}
      backTo="/admin/orders"
    >
      <AdminOrderPanel
        orderNumber={orderNumber}
        role={role}
        onChanged={noteChange}
      />
    </AdminShell>
  );
}
