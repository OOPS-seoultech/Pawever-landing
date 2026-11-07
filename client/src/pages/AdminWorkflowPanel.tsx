import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStaffSession } from "@/components/AdminSession";
import {
  AdminApiError,
  adminRequest,
  requestPhotoLinks,
  type AdminPhotoDownload,
} from "@/lib/adminApi";
import {
  artifactKinds,
  getWorkflow,
  getStaffAccounts,
  issueLabels,
  paymentLabels,
  stageLabels,
  workflowCommand,
  type StaffAccount,
  type WorkflowOrder,
} from "@/lib/adminContracts";
import { formatDateTime, formatKrw } from "@/lib/adminFormat";
import { AdminModelReview, ModelReviewHistory } from "./AdminModelReview";
import { AdminFinishing } from "./AdminFinishing";
import { AdminSalePrice } from "./AdminSalePrice";
import { AdminFilamentMapping } from "./AdminFilamentMapping";

export function AdminWorkflowPanel({
  orderNumber,
  petIndex: initialPetIndex = 0,
  onSelectPet,
  onChanged,
  showPhotos = true,
}: {
  orderNumber: string;
  petIndex?: number;
  onSelectPet?: (index: number) => void;
  onChanged?: (row: WorkflowOrder) => void;
  showPhotos?: boolean;
}) {
  const [petIndex, setPetIndex] = useState(initialPetIndex);
  const [newPetName, setNewPetName] = useState("");
  const [sourcePhotos, setSourcePhotos] = useState<
    AdminPhotoDownload["photos"]
  >([]);
  const [newPetPhotoIds, setNewPetPhotoIds] = useState<string[]>([]);
  const { staff } = useStaffSession();
  const [, navigate] = useLocation();
  const [row, setRow] = useState<WorkflowOrder | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const keys = useRef(new Map<string, string>());
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [target, setTarget] = useState("");
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [photos, setPhotos] = useState<AdminPhotoDownload["photos"]>([]);
  const [events, setEvents] = useState<
    { action: string; createdAt: string; actorId: number | null }[]
  >([]);
  const permissions = staff?.permissions ?? [];
  const has = (permission: string) => permissions.includes(permission);
  const canPhotos = has("VIEW_CUSTOMER_PHOTOS") && showPhotos;
  const canAssign = has("ASSIGN_WORK");

  const fail = useCallback(
    (e: unknown) => {
      setError(
        e instanceof Error
          ? e.message
          : "저장하지 못했습니다. 다시 시도해 주세요."
      );
      if (e instanceof AdminApiError && e.needsSignIn)
        navigate("/admin", { replace: true });
    },
    [navigate]
  );
  const load = useCallback(async () => {
    const value = await getWorkflow(orderNumber, petIndex);
    setRow(value);
    return value;
  }, [orderNumber, petIndex]);
  const loadTimeline = useCallback(async () => {
    setEvents(
      await adminRequest(
        `/api/admin/orders/${encodeURIComponent(orderNumber)}/workflow/timeline`
      )
    );
  }, [orderNumber, petIndex]);
  useEffect(() => {
    let live = true;
    setRow(null);
    setPhotos([]);
    setError("");
    setNotice("");
    setAmount("");
    setMemo("");
    getWorkflow(orderNumber, petIndex)
      .then(value => {
        if (live) setRow(value);
      })
      .catch(e => {
        if (live) fail(e);
      });
    return () => {
      live = false;
    };
  }, [orderNumber, petIndex, fail]);
  useEffect(() => {
    let live = true;
    setPhotos([]);
    if (canPhotos)
      requestPhotoLinks(orderNumber, petIndex)
        .then(value => {
          if (live) setPhotos(value.photos);
        })
        .catch(e => {
          if (live) fail(e);
        });
    return () => {
      live = false;
    };
  }, [orderNumber, petIndex, canPhotos, fail]);
  useEffect(() => {
    if (canAssign) getStaffAccounts().then(setAccounts).catch(fail);
    else setAccounts([]);
  }, [canAssign, fail]);
  useEffect(() => {
    void loadTimeline().catch(fail);
  }, [loadTimeline, fail]);

  // Keep the same key for an identical retry after a lost network response.
  const command = async <T = WorkflowOrder,>(
    path: string,
    body: object
  ): Promise<T> => {
    const payload = { ...body, petIndex };
    const fingerprint = path + JSON.stringify(payload);
    const key = keys.current.get(fingerprint) ?? crypto.randomUUID();
    keys.current.set(fingerprint, key);
    try {
      const value = await workflowCommand<T>(path, payload, key);
      keys.current.delete(fingerprint);
      return value;
    } catch (e) {
      if (e instanceof AdminApiError && e.status >= 400 && e.status < 500)
        keys.current.delete(fingerprint);
      throw e;
    }
  };
  const run = async (action: () => Promise<WorkflowOrder>, message: string) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const next = await action();
      setRow(next);
      setPetIndex(next.petIndex);
      setNotice(
        next.blockingIssues.includes("PAYMENT_MISMATCH") ? "" : message
      );
      onChanged?.(next);
      await loadTimeline();
    } catch (e) {
      fail(e);
      if (e instanceof AdminApiError && e.status === 409) {
        try {
          const current = await load();
          onChanged?.(current);
        } catch (refreshError) {
          fail(refreshError);
        }
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const upload = async (kind: string, file: File) => {
    if (!row) return;
    if (file.size < 1 || file.size > 100 * 1024 * 1024) {
      setError("파일은 1바이트 이상, 100MB 이하로 선택해 주세요.");
      return;
    }
    await run(async () => {
      const request = await command<{
        artifactId: string;
        version: number;
        url: string;
        headers: Record<string, string>;
      }>(`/api/production/tasks/${row.taskId}/artifacts/upload-requests`, {
        version: row.version,
        kind,
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
      });
      setRow({ ...row, version: request.version });
      const uploaded = await fetch(request.url, {
        method: "PUT",
        headers: request.headers,
        body: file,
      });
      if (!uploaded.ok)
        throw new Error("파일 전송에 실패했습니다. 파일을 다시 선택해 주세요.");
      return command(
        `/api/production/artifacts/${request.artifactId}/confirm`,
        { version: request.version }
      );
    }, "파일을 등록했습니다.");
  };
  if (!row)
    return (
      <div className="rounded-lg border bg-background p-4">
        {error ? <p role="alert">{error}</p> : "작업을 불러오는 중..."}
      </div>
    );
  const can = (action: string) => row.allowedActions.includes(action);
  const currentArtifacts = row.artifacts.filter(a =>
    a.taskId == null
      ? (row.taskAttempt ?? 1) === 1
      : a.taskId === (row.modelingTaskId ?? row.taskId)
  );
  const previousArtifacts = row.artifacts.filter(
    a => !currentArtifacts.includes(a)
  );
  const missing = artifactKinds.filter(
    item => !currentArtifacts.some(a => a.kind === item.kind)
  );
  const prefix = `/api/admin/orders/${encodeURIComponent(orderNumber)}`;
  const eligible = accounts.filter(
    a =>
      a.status === "ACTIVE" &&
      a.workRoles.includes(
        ["MODEL_REVIEW", "COLOR_MAPPING", "PLATE_PREPARATION"].includes(
          row.productionStage
        )
          ? "DESIGN_QC"
          : ["PRINT_QUEUE", "PRINTING", "POST_PROCESSING", "QC"].includes(
                row.productionStage
              )
            ? "PRINT_FINISHING"
            : "MODELING"
      )
  );
  const fileRow = (a: WorkflowOrder["artifacts"][number]) => (
    <div
      className="flex min-w-0 flex-wrap items-center gap-2 text-sm"
      key={a.id}
    >
      <span className="break-all">{a.fileName}</span>
      {has("DOWNLOAD_PRODUCTION_FILES") && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            void adminRequest<{ url: string }>(
              `/api/production/artifacts/${a.id}/download-link`,
              { method: "POST" }
            )
              .then(link => {
                const anchor = document.createElement("a");
                anchor.href = link.url;
                anchor.target = "_blank";
                anchor.rel = "noreferrer";
                anchor.click();
              })
              .catch(fail);
          }}
        >
          열기
        </Button>
      )}
    </div>
  );
  return (
    <section
      className="min-w-0 space-y-5 rounded-lg border bg-background p-4"
      aria-label="작업 상세"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="break-all text-lg font-semibold">
            {orderNumber} · {row.petName}
          </h2>
          <p className="text-sm text-muted-foreground">
            {row.goodsType === "figure" ? "3D 피규어" : row.goodsType}
            {row.keyringAdded ? " · 키링 추가" : ""}
          </p>
          {row.customGoods && (
            <p className="mt-1 break-words text-sm">
              요청 내용: {row.customGoods}
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            void load()
              .then(() => {
                setError("");
              })
              .catch(fail)
          }
        >
          새로고침
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        {has("VIEW_PAYMENT") && (
          <span className="rounded-full bg-muted px-3 py-1">
            {paymentLabels[row.paymentStatus] ?? row.paymentStatus}
          </span>
        )}
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-900">
          {stageLabels[row.productionStage] ?? row.productionStage}
        </span>
        {has("VIEW_SHIPMENT") &&
          row.shipmentStatus === "AWAITING_POST_OFFICE_RESULT" && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-900">
              우체국 결과 대기
            </span>
          )}
        <span className="rounded-full bg-muted px-3 py-1">
          담당: {row.assignee?.name ?? "미배정"}
        </span>
      </div>
      <section
        aria-label="반려동물별 제작"
        className="space-y-3 rounded border p-3"
      >
        <h3 className="font-medium">한 주문 · {row.petCount}마리 개별 제작</h3>
        <div className="flex flex-wrap gap-2">
          {(row.pets?.length
            ? row.pets
            : [
                {
                  petIndex: row.petIndex,
                  petName: row.petName,
                  productionStage: row.productionStage,
                },
              ]
          ).map(pet => (
            <Button
              key={pet.petIndex}
              variant={pet.petIndex === petIndex ? "default" : "outline"}
              aria-pressed={pet.petIndex === petIndex}
              disabled={pending}
              onClick={() =>
                onSelectPet
                  ? onSelectPet(pet.petIndex)
                  : setPetIndex(pet.petIndex)
              }
            >
              {pet.petName} ·{" "}
              {stageLabels[pet.productionStage] ?? pet.productionStage}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          사진·모델·검수·출력은 아이별로 관리합니다. 모두 검수 통과 후 한
          주문으로 포장합니다.
        </p>
        {has("MANAGE_OPERATION_SETTINGS") &&
          has("VIEW_ALL_ORDERS") &&
          row.orderStatus === "ACTIVE" &&
          row.shipmentStatus === "NOT_READY" &&
          ["MODELING_QUEUE", "BLOCKED"].includes(row.productionStage) &&
          has("VIEW_CUSTOMER_PHOTOS") && (
            <details
              onToggle={event => {
                if (event.currentTarget.open) {
                  setNewPetPhotoIds([]);
                  requestPhotoLinks(orderNumber)
                    .then(result => setSourcePhotos(result.photos))
                    .catch(fail);
                }
              }}
            >
              <summary className="cursor-pointer text-sm">
                반려동물 추가
              </summary>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="text-sm">
                  추가할 아이 이름
                  <Input
                    value={newPetName}
                    maxLength={80}
                    disabled={pending}
                    onChange={e => setNewPetName(e.target.value)}
                  />
                </label>
                <Button
                  variant="outline"
                  disabled={
                    pending ||
                    !newPetName.trim() ||
                    row.petCount >= 10 ||
                    newPetPhotoIds.length < 3 ||
                    newPetPhotoIds.length > 5
                  }
                  onClick={() =>
                    void run(
                      () =>
                        command(`${prefix}/workflow/pets`, {
                          version: row.version,
                          petName: newPetName.trim(),
                          photoIds: newPetPhotoIds,
                        }),
                      "아이와 사진을 추가했습니다. 목록에서 개별 제작을 진행해 주세요."
                    )
                  }
                >
                  아이 추가
                </Button>
              </div>
              <fieldset className="mt-3 space-y-2">
                <legend className="text-sm">
                  추가할 아이 사진 3~5장 선택 · 기존 아이 사진도 3장 이상 남겨
                  주세요
                </legend>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {sourcePhotos.map(photo => (
                    <label
                      key={photo.photoId ?? photo.slot}
                      className="flex flex-col gap-1 rounded border p-2 text-xs"
                    >
                      <img
                        src={photo.url}
                        alt={`등록 사진 ${photo.slot}`}
                        loading="lazy"
                        decoding="async"
                        className="aspect-square w-full object-cover"
                      />
                      <span>
                        <input
                          type="checkbox"
                          disabled={pending || !photo.photoId}
                          checked={
                            !!photo.photoId &&
                            newPetPhotoIds.includes(photo.photoId)
                          }
                          onChange={event => {
                            const id = photo.photoId;
                            if (id)
                              setNewPetPhotoIds(old =>
                                event.target.checked
                                  ? [...old, id]
                                  : old.filter(value => value !== id)
                              );
                          }}
                        />{" "}
                        사진 {photo.slot}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <p className="mt-2 text-xs text-muted-foreground">
                제작 시작 전에만 추가할 수 있습니다. 기본 판매가는 마릿수에 따라
                계산됩니다. 직접 입력한 주문 총액과 고객 청구액은 유지됩니다.
              </p>
            </details>
          )}
      </section>
      {(can("UPLOAD_ARTIFACT") || can("UPLOAD_COLORED_MODEL")) && (
        <Button
          variant="outline"
          onClick={() =>
            navigate(
              `/admin/local-files?order=${encodeURIComponent(orderNumber)}&pet=${row.petIndex}`
            )
          }
        >
          로컬 파일에서 자료 등록
        </Button>
      )}
      {row.artifacts.some(file => file.kind === "COLORED_MODEL") && (
        <section
          className="flex flex-col gap-2 rounded border p-3"
          aria-label="등록된 채색 3MF"
        >
          <h3 className="font-medium">채색 3MF</h3>
          {row.artifacts
            .filter(file => file.kind === "COLORED_MODEL")
            .map(fileRow)}
        </section>
      )}
      {has("VIEW_PAYMENT") && row.salePriceKrw != null && (
        <AdminSalePrice
          key={`${row.orderNumber}:${row.version}`}
          row={row}
          editable={has("MANAGE_OPERATION_SETTINGS") && has("VIEW_ALL_ORDERS")}
          pending={pending}
          onSave={(custom, price) =>
            void run(
              () =>
                command(`${prefix}/sale-price`, {
                  version: row.version,
                  custom,
                  ...(custom ? { salePriceKrw: price } : {}),
                }),
              "판매가를 저장했습니다. 고객 알림은 발송하지 않았습니다."
            )
          }
        />
      )}
      {row.requiresMigrationReview && (
        <p className="text-sm text-amber-900">
          기존 제작 중 주문입니다. 실제 제작 단계를 확인한 후 전환해야 합니다.
        </p>
      )}
      {row.administrativelyCompleted && (
        <div className="space-y-2 rounded border p-3 text-sm">
          <p>
            관리자 완료로 종료한 주문입니다. 표시된 제작·입금·배송 기록은 종료
            당시 상태이며, 실제 배송 완료를 새로 기록한 것은 아닙니다.
          </p>
          {staff?.role === "OWNER" && has("OVERRIDE_WORKFLOW") && (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                const reason = window.prompt(
                  "관리자 완료를 취소하고 이전 상태로 복구할 사유를 입력해 주세요."
                );
                if (reason?.trim())
                  void run(
                    () =>
                      command(`${prefix}/restore-administrative-completion`, {
                        version: row.version,
                        reason: reason.trim(),
                      }),
                    "관리자 완료 이전 상태로 복구했습니다. 고객 알림은 발송하지 않았습니다."
                  );
              }}
            >
              관리자 완료 이전 상태로 복구
            </Button>
          )}
        </div>
      )}
      {row.blockingIssues.length > 0 && (
        <ul className="space-y-1 rounded border border-amber-200 bg-amber-50 p-3 text-sm">
          {row.blockingIssues.map(issue => (
            <li key={issue}>{issueLabels[issue] ?? issue}</li>
          ))}
        </ul>
      )}
      {has("PACK_AND_EXPORT_SHIPMENTS") &&
        ["PACKING", "COMPLETE"].includes(row.productionStage) && (
          <Button
            variant="outline"
            onClick={() => navigate("/admin/shipments")}
          >
            포장·준등기 관리 열기
          </Button>
        )}
      {error && (
        <p
          role="alert"
          className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-emerald-800">
          {notice}
        </p>
      )}
      {can("CONFIRM_PAYMENT") && (
        <form
          className="space-y-3 border-t pt-4"
          onSubmit={event => {
            event.preventDefault();
            void run(
              () =>
                command(`${prefix}/payments/confirm`, {
                  version: row.version,
                  amount: Number(amount),
                  memo,
                }),
              "입금 대조 결과를 반영했습니다. 아래 결제 상태와 확인 사항을 확인해 주세요."
            );
          }}
        >
          <p className="font-medium">
            주문 금액 {formatKrw(row.expectedAmount ?? 0)}
          </p>
          {has("VIEW_CUSTOMER_IDENTITY") && row.guardianName && (
            <p className="text-sm">신청 보호자: {row.guardianName}</p>
          )}
          <label className="block text-sm">
            실제 입금액 (필수)
            <Input
              type="number"
              min="0"
              step="1"
              required
              placeholder="은행 내역에서 확인한 금액"
              value={amount}
              disabled={pending}
              onChange={e => setAmount(e.target.value)}
            />
          </label>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {amount === ""
              ? "실제 입금액을 입력하면 확인 버튼이 활성화됩니다."
              : row.expectedAmount == null
                ? "주문 금액을 확인할 수 없습니다. 새로고침 후 확인해 주세요."
                : Number(amount) === row.expectedAmount
                  ? "주문 금액과 일치합니다. 입금자도 대조한 뒤 확인해 주세요."
                  : "주문 금액과 다릅니다. 확인하면 불일치를 기록하며, 입금 완료로 처리하지 않습니다."}
          </p>
          <label className="block text-sm">
            확인 메모 (선택)
            <Input
              maxLength={300}
              value={memo}
              disabled={pending}
              onChange={e => setMemo(e.target.value)}
              placeholder="입금자명 등 대조한 내용"
            />
          </label>
          <Button
            disabled={pending || amount === "" || row.expectedAmount == null}
            type="submit"
          >
            {amount !== "" &&
            row.expectedAmount != null &&
            Number(amount) !== row.expectedAmount
              ? "입금 불일치 기록"
              : "입금 확인"}
          </Button>
        </form>
      )}
      {can("ENROLL") && (
        <Button
          disabled={pending}
          onClick={() =>
            void run(
              () =>
                command(`${prefix}/workflow/enroll`, { version: row.version }),
              "결과물 등록 작업을 생성했습니다. 기본 담당자가 설정돼 있으면 자동 배정되며, 미배정이면 아래에서 기본 담당자 설정을 확인해 주세요."
            )
          }
        >
          결과물 등록 작업 생성
        </Button>
      )}
      {can("ASSIGN_TASK") && (
        <div className="flex flex-wrap gap-2 border-t pt-4">
          {!row.assignee && (
            <Button
              disabled={pending}
              onClick={() =>
                void run(
                  () =>
                    command(`${prefix}/workflow/assign`, {
                      version: row.version,
                      useDefault: true,
                      reason: "기본 담당자 적용",
                    }),
                  "기본 담당자에게 배정했습니다."
                )
              }
            >
              기본 담당자에게 배정
            </Button>
          )}
          {has("MANAGE_ACCOUNTS") && has("MANAGE_OPERATION_SETTINGS") && (
            <Button
              variant="outline"
              onClick={() => navigate("/admin/accounts#work-defaults")}
            >
              기본 담당자 설정
            </Button>
          )}
          <label className="w-full text-sm">
            {row.assignee
              ? "예외 처리: 담당자 변경"
              : "예외 처리: 담당자 직접 지정"}
            <select
              className="mt-1 block w-full rounded border bg-background p-2"
              value={target}
              disabled={pending}
              onChange={e => setTarget(e.target.value)}
            >
              <option value="">담당자 선택</option>
              {eligible.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            size="sm"
            disabled={pending || !target}
            onClick={() =>
              void run(
                () =>
                  command(`${prefix}/workflow/assign`, {
                    version: row.version,
                    assigneeId: Number(target),
                    reason: "담당자 배정",
                  }),
                "담당자를 배정했습니다."
              )
            }
          >
            담당자 배정
          </Button>
          {eligible.length === 0 && (
            <p className="text-sm text-muted-foreground">
              담당자 관리에서 활성 계정의 작업 역할을 설정해 주세요.
            </p>
          )}
        </div>
      )}
      {canPhotos && (
        <div className="space-y-2 border-t pt-4">
          <h3 className="font-medium">고객 사진</h3>
          <div className="grid grid-cols-2 gap-2">
            {photos.map(photo => (
              <a
                key={photo.slot}
                href={photo.url}
                target="_blank"
                rel="noreferrer"
              >
                <img
                  className="aspect-square h-auto w-full rounded object-cover"
                  src={photo.url}
                  loading="lazy"
                  decoding="async"
                  width={640}
                  height={640}
                  alt={`고객 사진 ${photo.slot}`}
                />
              </a>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              requestPhotoLinks(orderNumber, petIndex)
                .then(v => setPhotos(v.photos))
                .catch(fail)
            }
          >
            사진 링크 갱신
          </Button>
        </div>
      )}
      {can("START_TASK") && (
        <Button
          disabled={pending}
          onClick={() =>
            void run(
              () =>
                command(`/api/production/tasks/${row.taskId}/start`, {
                  version: row.version,
                }),
              "모델링 작업을 시작했습니다."
            )
          }
        >
          작업 시작
        </Button>
      )}
      {has("VIEW_PRODUCTION_FILES") && (
        <div className="space-y-3 border-t pt-4">
          <ModelReviewHistory row={row} />
          <h3 className="font-medium">모델링 자료</h3>
          {row.taskAttempt != null && (
            <p className="text-sm">
              {row.productionStage === "COLOR_MAPPING"
                ? "승인된 모델링 자료"
                : `${row.taskAttempt}차 모델링`}
            </p>
          )}
          {artifactKinds.map(item => (
            <div
              key={item.kind}
              className="min-w-0 space-y-2 rounded border p-3"
            >
              <h4 className="text-sm font-medium">{item.label}</h4>
              {currentArtifacts.filter(a => a.kind === item.kind).map(fileRow)}
              {can("UPLOAD_ARTIFACT") && (
                <label className="block text-xs text-muted-foreground">
                  {item.label} 파일 선택
                  <input
                    className="mt-2 block w-full min-w-0 max-w-full text-sm"
                    type="file"
                    accept={item.accept}
                    disabled={pending}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void upload(item.kind, file);
                    }}
                  />
                </label>
              )}
            </div>
          ))}
          {previousArtifacts.length > 0 && (
            <details className="space-y-2 rounded border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                이전 제출 자료
              </summary>
              <p className="text-xs text-muted-foreground">
                참고용 자료입니다. 수정 작업에는 새 파일을 등록해 주세요.
              </p>
              {previousArtifacts.map(a => (
                <div key={a.id} className="space-y-1 border-t pt-2">
                  <p className="text-xs text-muted-foreground">
                    {a.modelingAttempt ?? 1}차 제출 ·{" "}
                    {artifactKinds.find(kind => kind.kind === a.kind)?.label ??
                      a.kind}
                  </p>
                  {fileRow(a)}
                </div>
              ))}
            </details>
          )}
          {can("UPLOAD_ARTIFACT") && (
            <p className="text-xs text-muted-foreground">
              파일당 최대 100MB. 출력 파일은 STL 또는 3MF로 등록해 주세요.
            </p>
          )}
        </div>
      )}
      {can("COMPLETE_MODELING") && (
        <div className="space-y-2">
          <Button
            disabled={pending || missing.length > 0}
            onClick={() =>
              void run(
                () =>
                  command(`/api/production/tasks/${row.taskId}/complete`, {
                    version: row.version,
                  }),
                "검수 담당자에게 인계했습니다."
              )
            }
          >
            모델링 완료
          </Button>
          {missing.length > 0 && (
            <p className="text-sm text-muted-foreground">
              필요한 자료: {missing.map(x => x.label).join(", ")}
            </p>
          )}
        </div>
      )}
      <AdminFinishing
        key={`finishing:${row.taskId}:${row.version}`}
        row={row}
        pending={pending}
        onCommand={(action, body, message) =>
          void run(
            () =>
              command(`/api/production/tasks/${row.taskId}/${action}`, body),
            message
          )
        }
      />
      <AdminModelReview
        key={`review:${row.taskId}:${row.version}`}
        row={row}
        pending={pending}
        onReview={decision =>
          void run(
            () =>
              command(`/api/production/tasks/${row.taskId}/review`, {
                version: row.version,
                ...decision,
              }),
            decision.decision === "APPROVED"
              ? "검수를 승인했습니다. 색상 작업 대기로 넘어갔습니다."
              : "수정 작업을 생성했습니다."
          )
        }
      />
      {has("VIEW_FILAMENT") && (
        <AdminFilamentMapping
          key={`mapping:${row.taskId}:${row.version}`}
          row={row}
          pending={pending}
          onSave={(mappings, complete) =>
            void run(
              () =>
                command(
                  `/api/production/tasks/${row.taskId}/filament-mappings`,
                  { version: row.version, mappings, complete }
                ),
              complete
                ? "색상 지정을 완료했습니다. 플레이트 준비로 넘어갔습니다."
                : "색상 지정을 저장했습니다."
            )
          }
        />
      )}
      {row.productionStage === "PLATE_PREPARATION" && (
        <p className="text-sm text-muted-foreground">
          부위별 필라멘트 지정이 완료됐습니다. 다음 작업은 출력할 주문을 묶어
          플레이트를 구성하는 것입니다.
        </p>
      )}
      {has("MANAGE_PRINT_BATCH") &&
        (row.printBatch || row.productionStage === "PLATE_PREPARATION") && (
          <a
            className="inline-block text-sm underline"
            href={
              row.printBatch
                ? `/admin/print-batches?batch=${row.printBatch.id}`
                : "/admin/print-batches"
            }
          >
            {row.printBatch
              ? `플레이트 PB-${row.printBatch.id} 열기`
              : "플레이트 구성하기"}
          </a>
        )}
      <details className="border-t pt-3">
        <summary className="cursor-pointer text-sm font-medium">
          작업 이력 ({events.length})
        </summary>
        <ol className="mt-2 space-y-2 text-xs text-muted-foreground">
          {events.map((e, i) => (
            <li key={i}>
              {formatDateTime(e.createdAt)} ·{" "}
              {(
                {
                  CONFIRM_PAYMENT: "입금 확인",
                  SALE_PRICE_CHANGE: "관리용 판매가 변경",
                  ADMIN_COMPLETE: "관리자 완료 · 고객 알림 없음",
                  RESTORE_ADMIN_COMPLETE: "관리자 완료 이전 상태 복구",
                  START_PRINT_BATCH: "플레이트 출력 시작",
                  FINISH_PRINT_BATCH: "주문별 출력 결과 기록",
                  COMPLETE_POST_PROCESSING: "후가공 완료",
                  PASS_QUALITY_CHECK: "품질 검수 통과",
                  FAIL_QUALITY_CHECK: "품질 검수 불합격·재작업",
                  START_TASK: "모델링 시작",
                  COMPLETE_MODELING: "검수 인계",
                  APPROVE_MODEL: "모델 검수 승인",
                  REQUEST_MODEL_CHANGES: "모델 수정 요청",
                  SAVE_FILAMENT_MAPPING: "부위별 필라멘트 저장",
                  COMPLETE_FILAMENT_MAPPING: "색상 지정 완료 · 플레이트 준비",
                  SAVE_PRINT_PLATE: "플레이트 구성 저장",
                  CONFIRM_PRINT_PLATE: "플레이트 확정 · 출력 대기",
                  CANCEL_PRINT_PLATE: "임시 플레이트 취소",
                  ASSIGN_PRINT_BATCH: "플레이트 출력 담당자 변경",
                  ASSIGN_TASK: "담당자 배정",
                  CONFIRM_ARTIFACT: "파일 등록",
                  REQUEST_ARTIFACT: "파일 등록 요청",
                  ENROLL: "모델링 작업 생성",
                  DOWNLOAD_ARTIFACT: "파일 열람",
                  PAYMENT_MISMATCH: "입금액 불일치",
                } as Record<string, string>
              )[e.action] ?? e.action}
              {" · "}
              {e.actorId == null ? "담당자 정보 없음" : `담당자 #${e.actorId}`}
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
