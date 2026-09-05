import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AdminError,
  AdminShell,
  CopyButton,
  useAdminGuard,
} from "@/components/AdminShell";
import {
  AdminApiError,
  cancelAdminOrder,
  changeAdminOrderStatus,
  completeAdminPickup,
  downloadAdminPhotoArchive,
  getAdminOrder,
  registerAdminTracking,
  requestPhotoLinks,
  type AdminOrderDetail as OrderDetail,
  type AdminPhotoDownload,
  type GoodsOrderStatus,
} from "@/lib/adminApi";
import { formatDateTime, formatKrw } from "@/lib/adminFormat";
import {
  canCancel,
  CANCEL_REASONS,
  cancelGuide,
  canCompletePickup,
  canRegisterTracking,
  photoSlotRows,
  settableStatusesFor,
  statusChangeHint,
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
  const [cancelReason, setCancelReason] = useState("");
  const [cancelDetail, setCancelDetail] = useState("");
  // 취소는 되돌릴 수 없다. 한 번 더 묻는다.
  const [cancelArmed, setCancelArmed] = useState(false);

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
  // 계좌이체 주문은 환불을 사람이 먼저 한다. 결제 대행사 주문과 같은 말을
  // 하면 환불 안 된 취소가 생긴다.
  const cancelWords = cancelGuide(order.payment?.pgLinked ?? false);

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
          <Row label="굿즈" value={order.goodsTypeLabel || order.goodsType} />
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
            <Row
              label="연락처"
              value={order.shipping.phone}
              copyAs="연락처"
            />
            {/* 방법을 주소보다 먼저 둔다. 주소가 빈 이유를 알고 나서 봐야
                빠뜨린 것과 구분된다. */}
            <Row
              label="수령 방법"
              value={
                order.shipping.deliveryMethod === "PICKUP"
                  ? "현장 수령 (배송비 없음)"
                  : "택배"
              }
            />
            {order.shipping.deliveryMethod === "PICKUP" ? (
              <Row label="주소" value="현장에서 직접 전달 — 주소를 받지 않음" />
            ) : (
              <Row
                label="주소"
                value={[
                  order.shipping.postalCode
                    ? `(${order.shipping.postalCode})`
                    : "",
                  order.shipping.address ?? "",
                  order.shipping.addressDetail ?? "",
                ]
                  .filter(Boolean)
                  .join(" ") || "-"}
                copyAs="주소"
              />
            )}
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
            사진 1은 필수, 2~5는 선택입니다. 받은 링크는 5분 뒤 닫히고, 누가
            받았는지 이력에 남습니다.
          </p>

          {/* 올리지 않은 자리도 자리로 남긴다. 빼 버리면 안 올린 것인지
              화면이 못 그린 것인지 구분이 안 된다. */}
          {/* 미리보기는 원본 링크를 그대로 쓴다. 썸네일을 따로 저장하면
              고객 사진의 사본이 하나 더 생기고, 파기할 때 그것도 같이
              지워야 한다 — 빠뜨리기 쉬운 자리가 하나 늘어난다. */}
          <ul className="mb-3 grid grid-cols-5 gap-2">
            {photoSlotRows(order.photos).map((row) => {
              const link = links?.photos.find((photo) => photo.slot === row.slot);
              return (
                <li key={row.slot} className="text-center">
                  {row.filled && link ? (
                    <a href={link.url} target="_blank" rel="noreferrer noopener">
                      <img
                        src={link.url}
                        alt={`사진 ${row.slot}`}
                        loading="lazy"
                        className="aspect-square w-full rounded border object-cover transition hover:opacity-80"
                      />
                    </a>
                  ) : (
                    <div
                      className={`flex aspect-square w-full items-center justify-center rounded border text-[11px] ${
                        row.filled
                          ? "border-dashed text-muted-foreground"
                          : "bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      {row.filled ? "링크 받기" : "미기입"}
                    </div>
                  )}
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {row.slot}번
                  </span>
                </li>
              );
            })}
          </ul>

          {links ? (
            <p className="mb-2 text-xs text-muted-foreground">
              링크가 {formatDateTime(links.photos[0]?.expiresAt)}까지 열립니다.
              지나면 다시 받으면 됩니다.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  setLinks(await requestPhotoLinks(order.orderNumber));
                }, "미리보기를 열었습니다.")
              }
            >
              미리보기 열기
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pending || !order.photos.some((photo) => photo.filled)}
              onClick={() =>
                run(async () => {
                  const archive = await downloadAdminPhotoArchive(
                    order.orderNumber
                  );
                  // 브라우저가 파일로 저장하게 한다. 링크를 걸면 로그인
                  // 토큰을 실을 수 없어서 401 이 돌아온다.
                  const url = URL.createObjectURL(archive.blob);
                  const anchor = document.createElement("a");
                  anchor.href = url;
                  anchor.download = archive.fileName;
                  anchor.click();
                  URL.revokeObjectURL(url);
                }, "사진을 모두 내려받았습니다.")
              }
            >
              전체 내려받기 (ZIP)
            </Button>
          </div>

        </Section>

        <Section title="상태 변경">
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {statusChangeHint(order.status) ??
                "지금 상태에서 바꿀 수 있는 값이 없습니다."}
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

        {canCompletePickup(
          role ?? "PRODUCTION",
          order.status,
          order.shipping?.deliveryMethod
        ) ? (
          <Section title="현장 수령">
            <p className="mb-3 text-sm text-muted-foreground">
              현장에서 직접 건넸으면 눌러 주세요. 송장 없이 수령 완료로
              넘어가고, 이때부터 사진 보유 기간 90일을 셉니다.
            </p>
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                run(
                  () => completeAdminPickup(order.orderNumber),
                  "수령 완료로 바꿨습니다."
                )
              }
            >
              수령 완료
            </Button>
          </Section>
        ) : null}

        {canRegisterTracking(
          role ?? "PRODUCTION",
          order.status,
          order.shipping?.deliveryMethod
        ) ? (
          <Section title="송장 등록">
            <p className="mb-3 text-sm text-muted-foreground">
              등록하면 발송 완료로 넘어가고, 이때부터 사진 보유 기간 90일을
              셉니다. 송장을 고쳐 다시 등록해도 그 날짜는 밀리지 않습니다.
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

        {canCancel(
          role ?? "PRODUCTION",
          order.status,
          Boolean(order.payment?.paidAt)
        ) ? (
          <Section title="주문 취소">
            <p className="mb-3 text-sm text-muted-foreground">
              {cancelWords.description}
            </p>

            <div className="mb-3 flex flex-wrap gap-2">
              {CANCEL_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => {
                    setCancelReason(reason);
                    setCancelArmed(false);
                  }}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    cancelReason === reason
                      ? "border-destructive bg-destructive text-destructive-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <Input
              value={cancelDetail}
              onChange={(event) => {
                setCancelDetail(event.target.value);
                setCancelArmed(false);
              }}
              placeholder="직접 입력 (선택). 목록에 없는 사유면 여기에 적으세요."
              maxLength={300}
              className="mb-3"
            />

            {cancelArmed ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-destructive">
                  {cancelWords.confirm(order.orderNumber)}
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      await cancelAdminOrder(
                        order.orderNumber,
                        cancelDetail.trim() || cancelReason
                      );
                      setCancelReason("");
                      setCancelDetail("");
                      setCancelArmed(false);
                    }, cancelWords.done)
                  }
                >
                  취소 진행
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCancelArmed(false)}
                >
                  그만두기
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={pending || (!cancelReason && !cancelDetail.trim())}
                onClick={() => setCancelArmed(true)}
              >
                주문 취소하기
              </Button>
            )}
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

function Row({
  label,
  value,
  copyAs,
}: {
  label: string;
  value: string;
  /** 값을 그대로 복사할 수 있게 한다. 송장에 붙여 넣는 값에만 붙인다. */
  copyAs?: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b py-1.5 text-sm last:border-0">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="break-all">{value}</span>
      {copyAs && value !== "-" ? (
        <span className="ml-auto">
          <CopyButton value={value} label={copyAs} />
        </span>
      ) : null}
    </div>
  );
}
