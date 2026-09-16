import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { AdminShell, useAdminGuard } from "@/components/AdminShell";
import { useStaffSession } from "@/components/AdminSession";
import { Button } from "@/components/ui/button";
import {
  AdminApiError,
  adminRequest,
  downloadShipmentExport,
} from "@/lib/adminApi";
import { workflowCommand } from "@/lib/adminContracts";
import AdminPostalImport from "./AdminPostalImport";

type PackingOrder = {
  orderNumber: string;
  version: number;
  petName: string;
  guardianName: string;
  phone: string;
  postalCode: string;
  address: string;
  addressDetail: string | null;
  blockingIssues: string[];
};
type PickupOrder = Pick<
  PackingOrder,
  "orderNumber" | "version" | "petName" | "guardianName" | "blockingIssues"
>;
type ExportBatch = {
  id: number;
  orderCount: number;
  exportedAt: string;
  downloadable: boolean;
  orderNumbers?: string[];
};
const base = "/api/admin/shipments";

export default function AdminShipments() {
  const role = useAdminGuard();
  const { staff } = useStaffSession();
  const [, navigate] = useLocation();
  const canShip = !!staff?.permissions.includes("PACK_AND_EXPORT_SHIPMENTS");
  const canPickup = !!staff?.permissions.includes("COMPLETE_PICKUP");
  const allowed = canShip || canPickup;
  const [orders, setOrders] = useState<PackingOrder[]>([]);
  const [pickupOrders, setPickupOrders] = useState<PickupOrder[]>([]);
  const [batches, setBatches] = useState<ExportBatch[]>([]);
  // 어느 발송 묶음의 결과를 넣는지 고른다. 묶음을 고르지 않으면 찾는 범위를
  // 가둘 수 없고, 범위가 풀리면 엉뚱한 주문에 송장이 붙는다.
  const [importTarget, setImportTarget] = useState<number | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedPickups, setSelectedPickups] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const busy = useRef(false);
  const keys = useRef(new Map<string, string>());
  const fail = useCallback(
    (e: unknown) => {
      let message =
        e instanceof Error ? e.message : "포장 정보를 처리하지 못했습니다.";
      if (e instanceof AdminApiError && Array.isArray(e.latest)) {
        message +=
          " " +
          e.latest
            .map(r => `${r.orderNumber}: ${r.blockingIssues?.join(" ") ?? ""}`)
            .join(" / ");
      }
      setError(message);
      if (e instanceof AdminApiError && e.status === 401) navigate("/admin");
      if (e instanceof AdminApiError && e.status === 403) {
        setOrders([]);
        setPickupOrders([]);
        setBatches([]);
        setSelected([]);
        setSelectedPickups([]);
      }
    },
    [navigate]
  );
  const load = useCallback(async () => {
    const [rows, pickups, files] = await Promise.all([
      canShip
        ? adminRequest<PackingOrder[]>(`${base}/candidates`)
        : Promise.resolve([]),
      canPickup
        ? adminRequest<PickupOrder[]>(`${base}/pickup-candidates`)
        : Promise.resolve([]),
      canShip
        ? adminRequest<ExportBatch[]>(`${base}/export-batches`)
        : Promise.resolve([]),
    ]);
    setOrders(rows);
    setPickupOrders(pickups);
    setBatches(files);
  }, [canPickup, canShip]);
  useEffect(() => {
    if (!allowed) return;
    setLoading(true);
    void load()
      .catch(fail)
      .finally(() => setLoading(false));
  }, [allowed, load, fail]);
  const download = async (id: number) => {
    const file = await downloadShipmentExport(id);
    const url = URL.createObjectURL(file.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const retryDownload = async (id: number) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      await download(id);
    } catch (e) {
      fail(e);
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const pack = async () => {
    if (busy.current || !selected.length) return;
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    const body = {
      orders: orders
        .filter(o => selected.includes(o.orderNumber))
        .map(o => ({ orderNumber: o.orderNumber, version: o.version })),
    };
    const fingerprint = JSON.stringify(body);
    const key = keys.current.get(fingerprint) ?? crypto.randomUUID();
    keys.current.set(fingerprint, key);
    let created = false;
    try {
      const batch = await workflowCommand<ExportBatch>(
        `${base}/export-batches`,
        body,
        key
      );
      created = true;
      keys.current.delete(fingerprint);
      setSelected([]);
      setBatches(current => [batch, ...current.filter(b => b.id !== batch.id)]);
      setOrders(current =>
        current.filter(
          o => !body.orders.some(r => r.orderNumber === o.orderNumber)
        )
      );
      setNotice(
        `${batch.orderCount}건 포장 완료 · 우체국 결과 대기. 배치 ${batch.id}에서 같은 파일을 다시 받을 수 있습니다.`
      );
      await download(batch.id);
    } catch (e) {
      fail(e);
      if (
        !created &&
        e instanceof AdminApiError &&
        e.status >= 400 &&
        e.status < 500
      ) {
        keys.current.delete(fingerprint);
        setSelected([]);
        if (e.status === 409 || e.status === 422) await load().catch(fail);
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const packPickups = async () => {
    if (busy.current || !selectedPickups.length) return;
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    const body = {
      orders: pickupOrders
        .filter(o => selectedPickups.includes(o.orderNumber))
        .map(o => ({ orderNumber: o.orderNumber, version: o.version })),
    };
    const fingerprint = `pickup:${JSON.stringify(body)}`;
    const key = keys.current.get(fingerprint) ?? crypto.randomUUID();
    keys.current.set(fingerprint, key);
    try {
      const result = await workflowCommand<{ completed: number }>(
        `${base}/pickup-completions`,
        body,
        key
      );
      keys.current.delete(fingerprint);
      setSelectedPickups([]);
      setPickupOrders(current =>
        current.filter(
          o => !body.orders.some(r => r.orderNumber === o.orderNumber)
        )
      );
      setNotice(`${result.completed}건 포장 완료 · 실제 수령 대기.`);
    } catch (e) {
      fail(e);
      if (e instanceof AdminApiError && e.status >= 400 && e.status < 500) {
        keys.current.delete(fingerprint);
        setSelectedPickups([]);
        if (e.status === 409 || e.status === 422) await load().catch(fail);
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  return (
    <AdminShell title="포장·준등기" role={role}>
      {!allowed ? (
        <p>
          {staff
            ? "포장·준등기 관리 권한이 없습니다."
            : "권한을 확인하고 있습니다."}
        </p>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            검수를 통과한 주문의 포장을 완료하세요. 배송 주문은 우체국 제출
            파일을 만들고, 직접 수령 주문은 실제 수령 대기로 옮깁니다.
          </p>
          {error && (
            <p
              role="alert"
              className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </p>
          )}
          {notice && (
            <p
              role="status"
              className="rounded bg-green-50 p-3 text-sm text-green-900"
            >
              {notice}
            </p>
          )}
          {canShip && (
            <section className="space-y-3">
              <h2 className="font-semibold">포장 대기 · {orders.length}건</h2>
              {loading ? (
                <p>불러오는 중…</p>
              ) : orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  포장 대기 중인 배송 주문이 없습니다.
                </p>
              ) : (
                orders.map(o => (
                  <article
                    key={o.orderNumber}
                    className="space-y-2 rounded border p-4 text-sm"
                  >
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 size-4"
                        aria-label={`${o.orderNumber} ${o.petName} 선택`}
                        checked={selected.includes(o.orderNumber)}
                        disabled={
                          pending ||
                          o.blockingIssues.length > 0 ||
                          (selected.length >= 100 &&
                            !selected.includes(o.orderNumber))
                        }
                        onChange={e =>
                          setSelected(current =>
                            e.target.checked
                              ? [...current, o.orderNumber]
                              : current.filter(n => n !== o.orderNumber)
                          )
                        }
                      />
                      <span>
                        <strong>
                          {o.guardianName} · {o.petName}
                        </strong>
                        <span className="block text-xs text-muted-foreground">
                          {o.orderNumber}
                        </span>
                      </span>
                    </label>
                    <p>
                      {o.phone} · {o.postalCode}
                    </p>
                    <p>
                      {o.address} {o.addressDetail}
                    </p>
                    {o.blockingIssues.map(p => (
                      <p key={p} className="text-red-700">
                        {p}
                      </p>
                    ))}
                  </article>
                ))
              )}
              <p className="text-xs text-muted-foreground">
                {selected.length}건 선택 · 한 번에 최대 100건
              </p>
              <Button
                className="h-auto whitespace-normal py-3"
                disabled={pending || !selected.length}
                onClick={() => void pack()}
              >
                선택 주문 포장 완료 및 우체국 파일 받기
              </Button>
            </section>
          )}
          {canPickup && (
            <section className="space-y-3">
              <h2 className="font-semibold">
                직접 수령 포장 대기 · {pickupOrders.length}건
              </h2>
              {loading ? (
                <p>불러오는 중…</p>
              ) : pickupOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  포장 대기 중인 직접 수령 주문이 없습니다.
                </p>
              ) : (
                pickupOrders.map(o => (
                  <article
                    key={o.orderNumber}
                    className="space-y-2 rounded border p-4 text-sm"
                  >
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 size-4"
                        aria-label={`${o.orderNumber} ${o.petName} 직접 수령 선택`}
                        checked={selectedPickups.includes(o.orderNumber)}
                        disabled={pending || o.blockingIssues.length > 0}
                        onChange={e =>
                          setSelectedPickups(current =>
                            e.target.checked
                              ? [...current, o.orderNumber]
                              : current.filter(n => n !== o.orderNumber)
                          )
                        }
                      />
                      <span>
                        <strong>
                          {o.guardianName} · {o.petName}
                        </strong>
                        <span className="block text-xs text-muted-foreground">
                          {o.orderNumber}
                        </span>
                      </span>
                    </label>
                    {o.blockingIssues.map(problem => (
                      <p key={problem} className="text-red-700">
                        {problem}
                      </p>
                    ))}
                  </article>
                ))
              )}
              <Button
                className="h-auto whitespace-normal py-3"
                disabled={pending || !selectedPickups.length}
                onClick={() => void packPickups()}
              >
                선택 주문 직접 수령 포장 완료
              </Button>
              <p className="text-xs text-muted-foreground">
                포장 완료 후에도 고객에게 실제로 전달할 때 “수령 완료”를 별도로
                처리합니다.
              </p>
            </section>
          )}
          {canShip && (
            <section className="space-y-3">
              <h2 className="font-semibold">내보낸 배치</h2>
              {!loading && batches.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  아직 내보낸 파일이 없습니다.
                </p>
              )}
              {batches.map(b => (
                <article
                  key={b.id}
                  className="space-y-2 rounded border p-4 text-sm"
                >
                  <p className="font-medium">
                    배치 {b.id} · {b.orderCount}건
                  </p>
                  <p>{new Date(b.exportedAt).toLocaleString("ko-KR")}</p>
                  {b.orderNumbers && (
                    <p className="break-words text-xs text-muted-foreground">
                      {b.orderNumbers.join(", ")}
                    </p>
                  )}
                  {b.downloadable ? (
                    <Button
                      variant="outline"
                      disabled={pending}
                      aria-label={`배치 ${b.id} 파일 다시 받기`}
                      onClick={() => void retryDownload(b.id)}
                    >
                      파일 다시 받기
                    </Button>
                  ) : (
                    <p>
                      취소된 주문이 포함되었거나 파일 보관 기간이 끝났습니다.
                    </p>
                  )}
                </article>
              ))}
            </section>
          )}
          {canShip &&
            (batches.length === 0 ? (
              <section className="rounded border p-4 text-sm">
                <h2 className="mb-2 font-semibold">우체국 결과 가져오기</h2>
                <p>먼저 포장 완료로 우체국 제출 파일을 만들어 주세요.</p>
              </section>
            ) : (
              <section className="space-y-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold">
                    어느 발송 묶음의 결과인가요?
                  </span>
                  <select
                    className="w-full rounded border p-2"
                    value={importTarget ?? ""}
                    onChange={event =>
                      setImportTarget(
                        event.target.value ? Number(event.target.value) : null
                      )
                    }
                  >
                    <option value="">고르지 않음</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>
                        배치 {b.id} · {b.orderCount}건 ·{" "}
                        {new Date(b.exportedAt).toLocaleDateString("ko-KR")}
                      </option>
                    ))}
                  </select>
                </label>
                {importTarget !== null && (
                  <AdminPostalImport
                    key={importTarget}
                    outboundBatchId={importTarget}
                    onApplied={() => void load()}
                  />
                )}
              </section>
            ))}
        </div>
      )}
    </AdminShell>
  );
}
