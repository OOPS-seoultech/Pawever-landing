import { useCallback, useEffect, useState } from "react";
import { AdminShell, useAdminGuard } from "@/components/AdminShell";
import { useStaffSession } from "@/components/AdminSession";
import { Button } from "@/components/ui/button";
import { adminRequest } from "@/lib/adminApi";
import { formatDateTime, formatKrw } from "@/lib/adminFormat";

type CompletedOrder = {
  orderNumber: string;
  goodsType: string;
  deliveryMethod: string;
  shipmentStatus: string;
  trackingCompany: string | null;
  trackingNumber: string | null;
  deliveryCompletedAt: string | null;
  paymentAmountKrw: number;
  paidAt: string | null;
};
type Asset = {
  id: string;
  type: string;
  fileName: string;
  contentType: string;
};
type Grant = {
  id: number;
  recipientId: number;
  activatedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  assets: { id: string; type: string }[];
};
type AsCase = {
  id: number;
  orderNumber: string;
  reason: string;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  closedAt: string | null;
  grants: Grant[];
};
type Worker = {
  id: number;
  name: string;
  role: string;
  status: string;
  workRoles: string[];
};

/** 완료 목록은 고객 정보와 원본 키를 받지 않는다. AS 자료는 열린 사건에서만 따로 고른다. */
export default function AdminCompletedOrders() {
  const role = useAdminGuard();
  const { staff } = useStaffSession();
  const owner = staff?.role === "OWNER";
  const allowed = Boolean(staff?.permissions.includes("VIEW_ALL_ORDERS"));
  const [orders, setOrders] = useState<CompletedOrder[]>([]);
  const [cases, setCases] = useState<AsCase[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedCase, setSelectedCase] = useState<AsCase | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectCase = useCallback(async (value: AsCase) => {
    setSelectedCase(value);
    setSelectedAssetIds([]);
    setAssets(
      await adminRequest<Asset[]>(`/api/admin/as-cases/${value.id}/assets`)
    );
  }, []);
  const load = useCallback(async () => {
    if (!allowed) return;
    const completed = await adminRequest<CompletedOrder[]>(
      "/api/admin/completed-orders"
    );
    setOrders(completed);
    if (owner) {
      const [loadedCases, loadedWorkers] = await Promise.all([
        adminRequest<AsCase[]>("/api/admin/as-cases"),
        adminRequest<Worker[]>("/api/admin/workflow/staff"),
      ]);
      setCases(loadedCases);
      setWorkers(loadedWorkers);
      setSelectedCase(current =>
        current
          ? (loadedCases.find(item => item.id === current.id) ?? null)
          : null
      );
    }
  }, [allowed, owner]);
  useEffect(() => {
    void load().catch(e =>
      setError(
        e instanceof Error ? e.message : "완료 주문을 불러오지 못했습니다."
      )
    );
  }, [load]);

  const run = async (action: () => Promise<void>) => {
    if (pending) return;
    setPending(true);
    setError("");
    setNotice("");
    try {
      await action();
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "AS 정보를 처리하지 못했습니다."
      );
    } finally {
      setPending(false);
    }
  };
  const openCase = (orderNumber: string) =>
    void run(async () => {
      const why = reason.trim();
      if (!why) throw new Error("AS 사유를 입력해 주세요.");
      const created = await adminRequest<AsCase>("/api/admin/as-cases", {
        method: "POST",
        body: JSON.stringify({ orderNumber, reason: why }),
      });
      setReason("");
      setNotice(
        "AS 사건을 열었습니다. 필요한 자료와 담당자만 다음에 선택하세요."
      );
      await selectCase(created);
    });
  const grant = () =>
    void run(async () => {
      if (!selectedCase || !recipientId || !selectedAssetIds.length)
        throw new Error("열린 사건, 담당자, 자료를 모두 선택해 주세요.");
      await adminRequest(
        `/api/admin/as-cases/${selectedCase.id}/access-grants`,
        {
          method: "POST",
          body: JSON.stringify({
            recipientId: Number(recipientId),
            artifactIds: selectedAssetIds,
          }),
        }
      );
      setSelectedAssetIds([]);
      setNotice("선택한 자료만 48시간 동안 열람하도록 권한을 발급했습니다.");
    });
  const revoke = (grantId: number) =>
    void run(async () => {
      if (!selectedCase) return;
      await adminRequest(
        `/api/admin/as-cases/${selectedCase.id}/access-grants/${grantId}/revoke`,
        { method: "POST", body: "{}" }
      );
      setNotice(
        "AS 열람 권한을 회수했습니다. 이미 발급된 짧은 링크는 최대 5분간 남을 수 있습니다."
      );
    });
  const close = () =>
    void run(async () => {
      if (!selectedCase) return;
      await adminRequest(`/api/admin/as-cases/${selectedCase.id}/close`, {
        method: "POST",
        body: "{}",
      });
      setNotice(
        "AS 사건을 종료했습니다. 자료와 완료·정산 기록은 삭제하지 않았습니다."
      );
    });
  if (!allowed) return null;
  const eligibleWorkers = workers.filter(
    worker =>
      worker.role === "PRODUCTION" &&
      worker.status === "ACTIVE" &&
      worker.workRoles.length
  );
  return (
    <AdminShell title="완료 주문·AS" role={role}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            완료 목록은 주문·발송·결제 요약만 표시합니다. 원본 자료는 AS
            사건별로만 엽니다.
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => void load()}
          >
            새로고침
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-emerald-800">
            {notice}
          </p>
        )}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">
            완료 주문 ({orders.length}건)
          </h2>
          {orders.map(order => (
            <div
              key={order.orderNumber}
              className="flex flex-wrap items-center gap-2 rounded border p-3 text-sm"
            >
              <span className="font-medium">{order.orderNumber}</span>
              <span>
                {order.goodsType} ·{" "}
                {order.deliveryMethod === "PICKUP" ? "직접 수령" : "배송"}
              </span>
              <span className="text-muted-foreground">
                {order.trackingNumber
                  ? `${order.trackingCompany ?? "택배"} ${order.trackingNumber}`
                  : order.shipmentStatus}
              </span>
              <span className="text-muted-foreground">
                {formatKrw(order.paymentAmountKrw)} ·{" "}
                {order.deliveryCompletedAt
                  ? formatDateTime(order.deliveryCompletedAt)
                  : "완료 시각 없음"}
              </span>
              {owner && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => openCase(order.orderNumber)}
                >
                  AS 시작
                </Button>
              )}
            </div>
          ))}
          {!orders.length && (
            <p className="text-sm text-muted-foreground">
              아직 완료 주문이 없습니다.
            </p>
          )}
          {owner && (
            <label className="block max-w-xl text-sm">
              새 AS 사유
              <input
                className="ml-2 w-72 rounded border bg-background p-1"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="예: 재출력 상태 확인"
                maxLength={1000}
              />
            </label>
          )}
        </section>
        {owner && (
          <section className="space-y-3 border-t pt-4">
            <h2 className="text-sm font-semibold">AS 사건·48시간 권한</h2>
            <div className="flex flex-wrap gap-2">
              {cases.map(item => (
                <Button
                  key={item.id}
                  variant={selectedCase?.id === item.id ? "default" : "outline"}
                  size="sm"
                  disabled={pending}
                  onClick={() => void selectCase(item)}
                >
                  #{item.id} · {item.orderNumber} ·{" "}
                  {item.status === "OPEN" ? "열림" : "종료"}
                </Button>
              ))}
            </div>
            {selectedCase && (
              <div className="space-y-3 rounded border p-3 text-sm">
                <p>
                  <span className="font-medium">
                    #{selectedCase.id} {selectedCase.orderNumber}
                  </span>{" "}
                  · {selectedCase.reason} ·{" "}
                  {selectedCase.status === "OPEN" ? "열림" : "종료"}
                </p>
                {selectedCase.status === "OPEN" && (
                  <fieldset disabled={pending} className="space-y-2">
                    <legend className="text-sm font-medium">
                      필요한 자료와 담당자만 48시간 열기
                    </legend>
                    {assets.map(asset => (
                      <label
                        key={`${asset.type}:${asset.id}`}
                        className="mr-3 inline-flex items-center gap-1 rounded bg-muted px-2 py-1"
                      >
                        <input
                          type="checkbox"
                          checked={selectedAssetIds.includes(asset.id)}
                          onChange={e =>
                            setSelectedAssetIds(current =>
                              e.target.checked
                                ? [...current, asset.id]
                                : current.filter(id => id !== asset.id)
                            )
                          }
                        />
                        {asset.type === "CUSTOMER_PHOTO"
                          ? "고객 사진"
                          : asset.fileName}
                      </label>
                    ))}
                    {!assets.length && (
                      <p className="text-muted-foreground">
                        정책상 남아 있는 확정 자료가 없습니다.
                      </p>
                    )}
                    <select
                      className="ml-2 rounded border bg-background p-1"
                      value={recipientId}
                      onChange={e => setRecipientId(e.target.value)}
                    >
                      <option value="">담당자 선택</option>
                      {eligibleWorkers.map(worker => (
                        <option key={worker.id} value={worker.id}>
                          {worker.name} · {worker.workRoles.join(", ")}
                        </option>
                      ))}
                    </select>
                    <Button size="sm" disabled={!assets.length} onClick={grant}>
                      48시간 권한 발급
                    </Button>
                    <Button size="sm" variant="outline" onClick={close}>
                      사건 종료
                    </Button>
                  </fieldset>
                )}
                <div className="space-y-1">
                  <p className="font-medium">발급 이력</p>
                  {selectedCase.grants.map(grant => (
                    <div
                      key={grant.id}
                      className="flex flex-wrap items-center gap-2 rounded bg-muted p-2"
                    >
                      <span>
                        담당자 #{grant.recipientId} ·{" "}
                        {grant.revokedAt
                          ? "회수됨"
                          : `${formatDateTime(grant.expiresAt)}까지`}
                      </span>
                      <span>{grant.assets.length}개 자료</span>
                      {!grant.revokedAt && selectedCase.status === "OPEN" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => revoke(grant.id)}
                        >
                          회수
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </AdminShell>
  );
}
