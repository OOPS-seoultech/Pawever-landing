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

export function AdminWorkflowPanel({
  orderNumber,
  onChanged,
  showPhotos = true,
}: {
  orderNumber: string;
  onChanged?: (row: WorkflowOrder) => void;
  showPhotos?: boolean;
}) {
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
    { action: string; createdAt: string; actorId: number }[]
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
    const value = await getWorkflow(orderNumber);
    setRow(value);
    return value;
  }, [orderNumber]);
  const loadTimeline = useCallback(async () => {
    setEvents(
      await adminRequest(
        `/api/admin/orders/${encodeURIComponent(orderNumber)}/workflow/timeline`
      )
    );
  }, [orderNumber]);
  useEffect(() => {
    let live = true;
    setRow(null);
    setPhotos([]);
    setError("");
    setNotice("");
    setAmount("");
    setMemo("");
    getWorkflow(orderNumber)
      .then(value => {
        if (live) setRow(value);
      })
      .catch(e => {
        if (live) fail(e);
      });
    return () => {
      live = false;
    };
  }, [orderNumber, fail]);
  useEffect(() => {
    let live = true;
    setPhotos([]);
    if (canPhotos)
      requestPhotoLinks(orderNumber)
        .then(value => {
          if (live) setPhotos(value.photos);
        })
        .catch(e => {
          if (live) fail(e);
        });
    return () => {
      live = false;
    };
  }, [orderNumber, canPhotos, fail]);
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
    const fingerprint = path + JSON.stringify(body);
    const key = keys.current.get(fingerprint) ?? crypto.randomUUID();
    keys.current.set(fingerprint, key);
    try {
      const value = await workflowCommand<T>(path, body, key);
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
  const missing = artifactKinds.filter(
    item => !row.artifacts.some(a => a.kind === item.kind)
  );
  const prefix = `/api/admin/orders/${encodeURIComponent(orderNumber)}`;
  const eligible = accounts.filter(
    a =>
      a.status === "ACTIVE" &&
      a.workRoles.includes(
        row.productionStage === "MODEL_REVIEW" ? "DESIGN_QC" : "MODELING"
      )
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
          {row.customGoods && <p className="mt-1 break-words text-sm">요청 내용: {row.customGoods}</p>}
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
        <span className="rounded-full bg-muted px-3 py-1">
          담당: {row.assignee?.name ?? "미배정"}
        </span>
      </div>
      {row.requiresMigrationReview && (
        <p className="text-sm text-amber-900">
          기존 제작 중 주문입니다. 실제 제작 단계를 확인한 후 전환해야 합니다.
        </p>
      )}
      {row.blockingIssues.length > 0 && (
        <ul className="space-y-1 rounded border border-amber-200 bg-amber-50 p-3 text-sm">
          {row.blockingIssues.map(issue => (
            <li key={issue}>{issueLabels[issue] ?? issue}</li>
          ))}
        </ul>
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
              "입금을 확인하고 모델링 작업을 만들었습니다."
            );
          }}
        >
          <p className="font-medium">
            주문 금액 {formatKrw(row.expectedAmount ?? 0)}
          </p>
          {has("VIEW_CUSTOMER_IDENTITY") && row.guardianName && <p className="text-sm">신청 보호자: {row.guardianName}</p>}
          <label className="block text-sm">
            실제 입금액
            <Input
              type="number"
              min="0"
              step="1"
              required
              value={amount}
              disabled={pending}
              onChange={e => setAmount(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            확인 메모
            <Input
              maxLength={300}
              value={memo}
              disabled={pending}
              onChange={e => setMemo(e.target.value)}
              placeholder="입금자명 등 대조한 내용"
            />
          </label>
          <Button disabled={pending || amount === ""} type="submit">
            입금 확인
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
              "모델링 작업을 만들었습니다."
            )
          }
        >
          모델링 작업 배정
        </Button>
      )}
      {can("ASSIGN_TASK") && (
        <div className="flex flex-wrap gap-2 border-t pt-4">
          <label className="w-full text-sm">
            담당자 변경
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
                  className="aspect-square w-full rounded object-cover"
                  src={photo.url}
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
              requestPhotoLinks(orderNumber)
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
          <h3 className="font-medium">모델링 자료</h3>
          {artifactKinds.map(item => (
            <div
              key={item.kind}
              className="min-w-0 space-y-2 rounded border p-3"
            >
              <h4 className="text-sm font-medium">{item.label}</h4>
              {row.artifacts
                .filter(a => a.kind === item.kind)
                .map(a => (
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
                ))}
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
      {row.productionStage === "MODEL_REVIEW" && (
        <p className="text-sm text-muted-foreground">
          검수용 자료를 확인할 수 있습니다. 검수 승인과 수정 요청은 다음 개발
          범위입니다.
        </p>
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
                  START_TASK: "모델링 시작",
                  COMPLETE_MODELING: "검수 인계",
                  ASSIGN_TASK: "담당자 배정",
                  CONFIRM_ARTIFACT: "파일 등록",
                  REQUEST_ARTIFACT: "파일 등록 요청",
                  ENROLL: "모델링 작업 생성",
                  DOWNLOAD_ARTIFACT: "파일 열람",
                  PAYMENT_MISMATCH: "입금액 불일치",
                } as Record<string, string>
              )[e.action] ?? e.action}
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
