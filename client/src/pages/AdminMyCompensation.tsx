import { useCallback, useEffect, useState } from "react";
import { AdminShell, useAdminGuard } from "@/components/AdminShell";
import { useStaffSession } from "@/components/AdminSession";
import { Button } from "@/components/ui/button";
import { adminRequest } from "@/lib/adminApi";
import { formatDateTime, formatKrw } from "@/lib/adminFormat";

type Settlement = {
  id: number;
  orderNumber: string;
  workerName: string;
  workerId: number;
  amountKrw: number;
  paymentStatus: "UNPAID" | "PREPARED" | "PAID" | "HELD";
  createdAt: string;
};
type Summary = {
  settlements: Settlement[];
  totalsKrw: Partial<Record<Settlement["paymentStatus"], number>>;
};

const label: Record<Settlement["paymentStatus"], string> = {
  UNPAID: "미지급",
  PREPARED: "지급 준비",
  PAID: "지급 완료",
  HELD: "보류",
};

/** 실무자는 자기 적립·지급 상태만 본다. 다른 사람의 주문이나 지급 내역은 없다. */
export default function AdminMyCompensation() {
  const role = useAdminGuard();
  const { staff } = useStaffSession();
  const owner = staff?.role === "OWNER";
  const [workerFilter, setWorkerFilter] = useState("ALL");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const allowed = Boolean(staff?.permissions.includes("VIEW_ORDER_BASIC"));
  const load = useCallback(async () => {
    if (!allowed) return;
    try {
      setSummary(
        await adminRequest<Summary>("/api/admin/compensation/summary")
      );
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "정산 내역을 불러오지 못했습니다."
      );
    }
  }, [allowed]);
  useEffect(() => {
    void load();
  }, [load]);
  if (!allowed) return null;
  const rows =
    summary?.settlements.filter(
      row =>
        !owner ||
        workerFilter === "ALL" ||
        String(row.workerId) === workerFilter
    ) ?? [];
  const totals = rows.reduce<
    Partial<Record<Settlement["paymentStatus"], number>>
  >((result, row) => {
    result[row.paymentStatus] =
      (result[row.paymentStatus] ?? 0) + row.amountKrw;
    return result;
  }, {});
  const workers = Array.from(
    new Map(
      summary?.settlements.map(row => [row.workerId, row.workerName])
    ).entries()
  );
  return (
    <AdminShell title={owner ? "작업자 정산" : "내 제작비 정산"} role={role}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            세전 적립과 실제 은행 이체는 분리됩니다. 지급 준비·완료 처리는
            소유자가 합니다.
          </p>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            새로고침
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {summary && (
          <>
            {owner && (
              <label className="block text-sm">
                정산 작업자
                <select
                  className="ml-3 rounded border bg-background p-2"
                  value={workerFilter}
                  onChange={event => setWorkerFilter(event.target.value)}
                >
                  <option value="ALL">전체 작업자</option>
                  {workers.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <p className="text-sm">
              미지급 {formatKrw(totals.UNPAID ?? 0)} · 지급 준비{" "}
              {formatKrw(totals.PREPARED ?? 0)} · 지급 완료{" "}
              {formatKrw(totals.PAID ?? 0)} · 보류 {formatKrw(totals.HELD ?? 0)}
            </p>
            {rows.length ? (
              rows.map(row => (
                <p key={row.id} className="rounded bg-muted p-3 text-sm">
                  {row.orderNumber} · {owner && `${row.workerName} · `}
                  {formatKrw(row.amountKrw)} · {label[row.paymentStatus]} ·{" "}
                  {formatDateTime(row.createdAt)}
                </p>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                아직 기록된 제작비 정산 항목이 없습니다.
              </p>
            )}
          </>
        )}
      </div>
    </AdminShell>
  );
}
