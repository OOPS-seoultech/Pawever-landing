import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminError, AdminShell, useAdminGuard } from "@/components/AdminShell";
import {
  AdminApiError,
  changeAdminOrderStatus,
  getAdminOrder,
  registerAdminTracking,
  requestPhotoLinks,
  type AdminOrderDetail as OrderDetail,
  type AdminPhotoDownload,
  type GoodsOrderStatus,
} from "@/lib/adminApi";
import { formatDateTime, formatKrw } from "@/lib/adminFormat";
import {
  canRegisterTracking,
  settableStatusesFor,
  STATUS_LABELS,
} from "./adminOrderStatus";

export default function AdminOrderDetail() {
  const role = useAdminGuard();
  const [, setLocation] = useLocation();
  const { orderNumber = "" } = useParams<{ orderNumber: string }>();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [links, setLinks] = useState<AdminPhotoDownload | null>(null);
  const [pending, setPending] = useState(false);

  const [nextStatus, setNextStatus] = useState<GoodsOrderStatus | "">("");
  const [memo, setMemo] = useState("");
  const [company, setCompany] = useState("");
  const [invoice, setInvoice] = useState("");

  const handle = useCallback(
    (caught: unknown) => {
      const failure = caught as AdminApiError;
      if (failure.needsSignIn) {
        setLocation("/admin", { replace: true });
        return;
      }
      setError(failure.message);
    },
    [setLocation]
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const detail = await getAdminOrder(orderNumber);
      setOrder(detail);
      setCompany(detail.shipping?.trackingCompany ?? "");
      setInvoice(detail.shipping?.trackingNumber ?? "");
    } catch (caught) {
      handle(caught);
    }
  }, [orderNumber, handle]);

  useEffect(() => {
    if (role) void load();
  }, [role, load]);

  const run = async (action: () => Promise<void>, done: string) => {
    if (pending) return;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(done);
      await load();
    } catch (caught) {
      handle(caught);
    } finally {
      setPending(false);
    }
  };

  if (!order) {
    return (
      <AdminShell title="주문 상세" role={role} backTo="/admin/orders">
        {error ? <AdminError message={error} /> : <p className="text-sm text-muted-foreground">불러오는 중...</p>}
      </AdminShell>
    );
  }

  const options = settableStatusesFor(role ?? "PRODUCTION", order.status);

  return (
    <AdminShell
      title={`주문 ${order.orderNumber}`}
      role={role}
      backTo="/admin/orders"
    >
      {error ? <AdminError message={error} /> : null}
      {notice ? (
        <p className="mb-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="주문">
          <Row label="상태" value={order.statusLabel ?? STATUS_LABELS[order.status]} />
          <Row label="신청일" value={formatDateTime(order.submittedAt)} />
          <Row label="굿즈" value={order.goodsType} />
          <Row label="반려동물" value={order.petName} />
          {order.pricing ? (
            <>
              <Row label="정가" value={formatKrw(order.pricing.listPriceKrw)} />
              <Row
                label="할인"
                value={
                  order.pricing.discountAmountKrw > 0
                    ? `-${formatKrw(order.pricing.discountAmountKrw)}${
                        order.pricing.promotionName
                          ? ` (${order.pricing.promotionName})`
                          : ""
                      }`
                    : "-"
                }
              />
              <Row
                label="결제 금액"
                value={formatKrw(order.pricing.paymentAmountKrw)}
              />
            </>
          ) : null}
        </Section>

        {order.payment ? (
          <Section title="결제">
            <Row label="수단" value={order.payment.method ?? "-"} />
            <Row label="결제 시각" value={formatDateTime(order.payment.paidAt)} />
            <Row
              label="만료 시각"
              value={formatDateTime(order.payment.paymentExpiresAt)}
            />
            {order.payment.cancelReason ? (
              <Row label="취소 사유" value={order.payment.cancelReason} />
            ) : null}
          </Section>
        ) : null}

        {order.shipping ? (
          <Section title="배송">
            <Row label="보호자" value={order.shipping.guardianName} />
            <Row label="연락처" value={order.shipping.phone} />
            <Row
              label="주소"
              value={[
                order.shipping.postalCode ? `(${order.shipping.postalCode})` : "",
                order.shipping.address ?? "",
                order.shipping.addressDetail ?? "",
              ]
                .filter(Boolean)
                .join(" ") || "-"}
            />
            <Row
              label="송장"
              value={
                order.shipping.trackingNumber
                  ? `${order.shipping.trackingCompany ?? ""} ${order.shipping.trackingNumber}`
                  : "-"
              }
            />
          </Section>
        ) : (
          <Section title="배송">
            {/* 제작팀에게는 서버가 비워서 내려준다. */}
            <p className="text-sm text-muted-foreground">
              보호자 정보는 관리자만 볼 수 있습니다.
            </p>
          </Section>
        )}

        <Section title="사진">
          <p className="mb-3 text-sm text-muted-foreground">
            올린 사진 {order.photos.filter((photo) => photo.filled).length}/5장.
            받은 링크는 5분 뒤 닫히고, 누가 받았는지 이력에 남습니다.
          </p>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() =>
              run(async () => {
                setLinks(await requestPhotoLinks(order.orderNumber));
              }, "다운로드 링크를 받았습니다.")
            }
          >
            다운로드 링크 받기
          </Button>

          {links ? (
            <ul className="mt-3 space-y-1 text-sm">
              {links.photos.map((photo) => (
                <li key={photo.slot} className="flex items-center gap-2">
                  <a
                    href={photo.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-primary underline"
                  >
                    사진 {photo.slot}
                  </a>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(photo.expiresAt)}까지
                  </span>
                </li>
              ))}
              {links.photos.length === 0 ? (
                <li className="text-muted-foreground">받을 사진이 없습니다.</li>
              ) : null}
            </ul>
          ) : null}
        </Section>

        <Section title="상태 변경">
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              지금 상태에서 바꿀 수 있는 값이 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {options.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setNextStatus(status)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      nextStatus === status
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
              <Textarea
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                placeholder="메모 (선택). 왜 바꾸는지 남겨 두면 나중에 찾을 수 있습니다."
                maxLength={300}
                rows={2}
              />
              <Button
                size="sm"
                disabled={!nextStatus || pending}
                onClick={() =>
                  run(async () => {
                    await changeAdminOrderStatus(
                      order.orderNumber,
                      nextStatus as GoodsOrderStatus,
                      memo
                    );
                    setNextStatus("");
                    setMemo("");
                  }, "상태를 바꿨습니다.")
                }
              >
                상태 바꾸기
              </Button>
            </div>
          )}
        </Section>

        {canRegisterTracking(role ?? "PRODUCTION", order.status) ? (
          <Section title="송장 등록">
            <p className="mb-3 text-sm text-muted-foreground">
              등록하면 발송 완료로 넘어갑니다.
            </p>
            <div className="space-y-2">
              <Input
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                placeholder="택배사"
                maxLength={50}
              />
              <Input
                value={invoice}
                onChange={(event) => setInvoice(event.target.value)}
                placeholder="송장번호"
                maxLength={50}
              />
              <Button
                size="sm"
                disabled={!company.trim() || !invoice.trim() || pending}
                onClick={() =>
                  run(
                    () =>
                      registerAdminTracking(
                        order.orderNumber,
                        company.trim(),
                        invoice.trim()
                      ),
                    "송장을 등록했습니다."
                  )
                }
              >
                송장 등록
              </Button>
            </div>
          </Section>
        ) : null}

        <Section title="상태 이력">
          {order.statusHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">기록이 없습니다.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {order.statusHistory.map((change, index) => (
                <li key={index} className="border-b pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {change.fromStatus
                        ? STATUS_LABELS[change.fromStatus as GoodsOrderStatus] ??
                          change.fromStatus
                        : "신규"}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span>
                      {STATUS_LABELS[change.toStatus as GoodsOrderStatus] ??
                        change.toStatus}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDateTime(change.changedAt)}
                    </span>
                  </div>
                  {change.memo ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {change.memo}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {order.accessLogs.length > 0 ? (
          <Section title="열람 이력">
            <ul className="space-y-1 text-sm">
              {order.accessLogs.map((log, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span>{log.action}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    담당자 #{log.adminAccountId} · {formatDateTime(log.accessedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>
    </AdminShell>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border bg-background p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b py-1.5 text-sm last:border-0">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="break-all">{value}</span>
    </div>
  );
}
