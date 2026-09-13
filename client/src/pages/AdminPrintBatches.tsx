import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { AdminShell, useAdminGuard } from "@/components/AdminShell";
import { useStaffSession } from "@/components/AdminSession";
import { Button } from "@/components/ui/button";
import { AdminApiError, adminRequest } from "@/lib/adminApi";
import {
  stageLabels,
  workflowCommand,
  type WorkflowOrder,
} from "@/lib/adminContracts";
import {
  batchPath,
  batchStatus,
  getBatch,
  getBatches,
  getPlateCandidates,
  getPrintStaff,
  type PrintBatch,
  type PrintStaff,
} from "@/lib/printBatchContracts";
import { AdminPlateEditor } from "./AdminPlateEditor";

export default function AdminPrintBatches() {
  const role = useAdminGuard();
  const { staff } = useStaffSession();
  const [, navigate] = useLocation();
  const allowed = !!staff?.permissions.includes("MANAGE_PRINT_BATCH");
  const designer = allowed && !!staff?.workRoles.includes("DESIGN_QC");
  const [rows, setRows] = useState<PrintBatch[]>([]);
  const [selected, setSelected] = useState<PrintBatch | null>(null);
  const [editing, setEditing] = useState(false);
  const [candidates, setCandidates] = useState<WorkflowOrder[]>([]);
  const [workers, setWorkers] = useState<PrintStaff>({
    defaultPrinting: null,
    staff: [],
  });
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("ACTIVE");
  const [checked, setChecked] = useState(false);
  const [assignee, setAssignee] = useState("");
  const busy = useRef(false);
  const keys = useRef(new Map<string, string>());
  const fail = useCallback(
    (e: unknown) => {
      setError(
        e instanceof Error ? e.message : "플레이트를 처리하지 못했습니다."
      );
      if (e instanceof AdminApiError && e.needsSignIn)
        navigate("/admin", { replace: true });
    },
    [navigate]
  );
  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    try {
      setRows(await getBatches());
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }, [allowed, fail]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!allowed) return;
    const id = new URLSearchParams(window.location.search).get("batch");
    if (!id || !/^[1-9][0-9]*$/.test(id)) return;
    let live = true;
    getBatch(Number(id))
      .then(async b => {
        if (!live) return;
        setSelected(b);
        if (b.allowedActions.includes("ASSIGN_PRINT_BATCH")) {
          const people = await getPrintStaff();
          if (live) setWorkers(people);
        }
      })
      .catch(e => {
        if (live) fail(e);
      });
    return () => {
      live = false;
    };
  }, [allowed, fail]);
  const command = async <T = PrintBatch,>(
    path: string,
    body: object
  ): Promise<T> => {
    const fingerprint = path + JSON.stringify(body),
      key = keys.current.get(fingerprint) ?? crypto.randomUUID();
    keys.current.set(fingerprint, key);
    try {
      const result = await workflowCommand<T>(path, body, key);
      keys.current.delete(fingerprint);
      return result;
    } catch (e) {
      if (e instanceof AdminApiError && e.status >= 400 && e.status < 500)
        keys.current.delete(fingerprint);
      throw e;
    }
  };
  const run = async (action: () => Promise<PrintBatch>, message: string) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const next = await action();
      setSelected(next);
      setChecked(false);
      setEditing(false);
      setNotice(message);
      await load();
    } catch (e) {
      fail(e);
      if (e instanceof AdminApiError && e.status === 409) {
        try {
          if (selected) setSelected(await getBatch(selected.id));
          setEditing(false);
          setChecked(false);
          await load();
        } catch (reloadError) {
          fail(reloadError);
        }
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const open = async (batch: PrintBatch | null, edit = false) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const current = batch ? await getBatch(batch.id) : null;
      if (edit) {
        const [options, people] = await Promise.all([
          getPlateCandidates(),
          getPrintStaff(),
        ]);
        setCandidates(options);
        setWorkers(people);
      } else if (current?.allowedActions.includes("ASSIGN_PRINT_BATCH"))
        setWorkers(await getPrintStaff());
      setSelected(current);
      setEditing(edit);
      setChecked(false);
      setAssignee("");
    } catch (e) {
      fail(e);
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const upload = async (file: File) => {
    if (!selected) return;
    if (
      !/\.(3mf|gcode)$/i.test(file.name) ||
      file.size < 1 ||
      file.size > 100 * 1024 * 1024
    ) {
      setError("3MF 또는 G-code 파일을 100MB 이하로 선택해 주세요.");
      return;
    }
    await run(async () => {
      const path = `${batchPath}/${selected.id}/artifacts`;
      const request = await command<{
        artifactId: string;
        version: number;
        url: string;
        headers: Record<string, string>;
      }>(`${path}/upload-requests`, {
        version: selected.version,
        fileName: file.name,
        size: file.size,
      });
      setSelected({ ...selected, version: request.version });
      const result = await fetch(request.url, {
        method: "PUT",
        headers: request.headers,
        body: file,
      });
      if (!result.ok)
        throw new Error("파일 전송에 실패했습니다. 파일을 다시 선택해 주세요.");
      return command(`${path}/${request.artifactId}/confirm`, {
        version: request.version,
      });
    }, "현재 구성의 출력 파일을 등록했습니다.");
  };
  const can = (action: string) =>
    selected?.allowedActions.includes(action) ?? false;
  const orderVersions =
    selected?.orders.map(o => ({
      orderNumber: o.orderNumber,
      version: o.version,
    })) ?? [];
  const visible = rows.filter(
    b =>
      filter === "ALL" ||
      (filter === "ACTIVE" ? b.status !== "CANCELED" : b.status === filter)
  );
  return (
    <AdminShell title="플레이트·출력 대기" role={role}>
      {!allowed ? (
        <p>{staff ? "플레이트 조회 권한이 없습니다." : "계정 확인 중..."}</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            색상 지정이 끝난 주문을 묶고, 출력에 사용할 파일과 필라멘트 슬롯을
            확인합니다.
          </p>
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="플레이트 상태 필터"
              className="rounded border bg-background p-2 text-sm"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              <option value="ACTIVE">진행 중</option>
              <option value="DRAFT">임시 구성</option>
              <option value="CONFIRMED">출력 대기</option>
              <option value="ALL">취소 포함 전체</option>
            </select>
            <Button
              variant="outline"
              disabled={pending || loading}
              onClick={() => {
                setError("");
                void load();
              }}
            >
              목록 새로고침
            </Button>
            {designer && (
              <Button disabled={pending} onClick={() => void open(null, true)}>
                새 플레이트
              </Button>
            )}
          </div>
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
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(220px,1fr)_minmax(0,2fr)]">
            <div className="min-w-0 space-y-2">
              {loading ? (
                <p className="text-sm">불러오는 중...</p>
              ) : (
                !visible.length && (
                  <p className="rounded border bg-background p-4 text-sm">
                    표시할 플레이트가 없습니다.
                  </p>
                )
              )}
              {visible.map(b => (
                <button
                  key={b.id}
                  type="button"
                  disabled={pending}
                  aria-pressed={selected?.id === b.id}
                  onClick={() => void open(b)}
                  className={`w-full min-w-0 rounded border bg-background p-4 text-left ${selected?.id === b.id ? "border-primary ring-1 ring-primary" : ""}`}
                >
                  <span className="block font-semibold">
                    PB-{b.id} · {batchStatus[b.status]}
                  </span>
                  <span className="block break-words text-sm">
                    {b.printerName || "프린터 미지정"} · {b.orders.length}건
                  </span>
                </button>
              ))}
            </div>
            <div className="min-w-0">
              {editing ? (
                <AdminPlateEditor
                  key={`${selected?.id ?? "new"}:${selected?.version ?? 0}`}
                  batch={selected}
                  candidates={candidates}
                  workers={workers}
                  pending={pending}
                  onCancel={() => setEditing(false)}
                  onSave={config =>
                    void run(
                      () =>
                        command(
                          `${batchPath}${selected ? `/${selected.id}` : ""}`,
                          selected
                            ? { ...config, version: selected.version }
                            : config
                        ),
                      "플레이트 구성을 저장했습니다."
                    )
                  }
                />
              ) : selected ? (
                <section
                  className="space-y-4 rounded-lg border bg-background p-4"
                  aria-label="플레이트 상세"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold">
                      PB-{selected.id} · {batchStatus[selected.status]}
                    </h2>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => void open(selected)}
                    >
                      상세 새로고침
                    </Button>
                  </div>
                  <p className="break-words text-sm">
                    프린터: {selected.printerName || "미지정"}
                    <br />
                    출력 담당: {selected.printingAssigneeName || "미지정"}
                  </p>
                  {selected.blockingIssues.map((issue, i) => (
                    <p key={i} className="text-sm text-amber-900">
                      {issue}
                    </p>
                  ))}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">포함 주문</h3>
                    {selected.orders.map(o => (
                      <div
                        key={o.orderNumber}
                        className="min-w-0 rounded bg-muted p-3 text-sm"
                      >
                        <a
                          className="break-words underline"
                          href={`/admin/orders/${encodeURIComponent(o.orderNumber)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {o.orderNumber} · {o.petName}
                        </a>
                        <p>
                          {stageLabels[o.productionStage] ?? o.productionStage}{" "}
                          · {o.assignee?.name ?? "미배정"}
                        </p>
                        <p className="break-words text-xs text-muted-foreground">
                          {o.filamentMappings
                            ?.map(
                              m => `${m.partName}: ${m.spoolId} ${m.colorName}`
                            )
                            .join(" / ")}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium">필라멘트 슬롯</h3>
                    {selected.slots.map(s => (
                      <p key={s.filamentId} className="break-words text-sm">
                        {s.slotLabel} →{" "}
                        {s.spoolId ?? `필라멘트 ${s.filamentId}`} ·{" "}
                        {s.colorName} {s.material} {s.finish}
                      </p>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">출력 파일</h3>
                    {selected.artifacts.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        현재 구성의 3MF 또는 G-code 파일을 등록하세요.
                      </p>
                    )}
                    {selected.artifacts.map(f => (
                      <div
                        key={f.id}
                        className="flex min-w-0 flex-wrap items-center gap-2 text-sm"
                      >
                        <span className="break-all">{f.fileName}</span>
                        {f.currentLayout ? (
                          <>
                            {staff?.permissions.includes(
                              "DOWNLOAD_PRODUCTION_FILES"
                            ) && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={pending}
                                onClick={() => {
                                  void adminRequest<{ url: string }>(
                                    `${batchPath}/${selected.id}/artifacts/${f.id}/download-link`,
                                    { method: "POST" }
                                  )
                                    .then(link => {
                                      const a = document.createElement("a");
                                      a.href = link.url;
                                      a.target = "_blank";
                                      a.rel = "noreferrer";
                                      a.click();
                                    })
                                    .catch(fail);
                                }}
                              >
                                파일 열기
                              </Button>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            이전 파일 · 현재 구성에 사용할 수 없음
                          </span>
                        )}
                      </div>
                    ))}
                    {can("UPLOAD_BATCH_FILE") && (
                      <label className="block text-sm">
                        플레이트 파일 등록
                        <input
                          className="mt-1 block w-full min-w-0 text-sm"
                          type="file"
                          accept=".3mf,.gcode"
                          disabled={pending}
                          onChange={e => {
                            const file = e.currentTarget.files?.[0];
                            e.currentTarget.value = "";
                            if (file) void upload(file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                  {can("EDIT_BATCH") && (
                    <Button
                      variant="outline"
                      disabled={pending}
                      onClick={() => void open(selected, true)}
                    >
                      구성 수정
                    </Button>
                  )}
                  {can("CONFIRM_BATCH") && (
                    <div className="space-y-3 border-t pt-3">
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={pending}
                          onChange={e => setChecked(e.target.checked)}
                        />
                        출력 파일의 주문 배치와 필라멘트 슬롯이 위 구성과
                        일치합니다.
                      </label>
                      <Button
                        disabled={
                          pending ||
                          !checked ||
                          !selected.artifacts.some(a => a.currentLayout) ||
                          !selected.printingAssigneeId ||
                          !selected.printerName ||
                          selected.blockingIssues.length > 0
                        }
                        onClick={() =>
                          void run(
                            () =>
                              command(`${batchPath}/${selected.id}/confirm`, {
                                version: selected.version,
                                orders: orderVersions,
                                layoutChecked: true,
                              }),
                            "플레이트를 확정했습니다. 모든 포함 주문이 출력 대기로 넘어갔습니다."
                          )
                        }
                      >
                        플레이트 확정
                      </Button>
                    </div>
                  )}
                  {can("ASSIGN_PRINT_BATCH") && (
                    <div className="space-y-2 border-t pt-3">
                      <label className="block text-sm">
                        출력 담당자 변경
                        <select
                          aria-label="출력 담당자 변경"
                          disabled={pending}
                          className="mt-1 block w-full rounded border bg-background p-2"
                          value={assignee}
                          onChange={e => setAssignee(e.target.value)}
                        >
                          <option value="">담당자 선택</option>
                          {workers.staff.map(w => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button
                        disabled={pending || !assignee}
                        onClick={() =>
                          void run(
                            () =>
                              command(`${batchPath}/${selected.id}/assign`, {
                                version: selected.version,
                                orders: orderVersions,
                                printingAssigneeId: Number(assignee),
                              }),
                            "포함 주문의 출력 담당자를 변경했습니다."
                          )
                        }
                      >
                        출력 담당자 변경 저장
                      </Button>
                    </div>
                  )}
                  {can("CANCEL_BATCH") && (
                    <div className="space-y-2 border-t pt-3">
                      <p className="text-xs text-muted-foreground">
                        임시 구성을 취소하면 포함 주문을 새 플레이트에서 다시
                        선택할 수 있습니다.
                      </p>
                      <Button
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          void run(
                            () =>
                              command(`${batchPath}/${selected.id}/cancel`, {
                                version: selected.version,
                              }),
                            "임시 플레이트를 취소했습니다. 주문을 다시 선택할 수 있습니다."
                          )
                        }
                      >
                        임시 플레이트 취소
                      </Button>
                    </div>
                  )}
                </section>
              ) : (
                <p className="rounded border bg-background p-4 text-sm text-muted-foreground">
                  플레이트를 선택하거나 새로 구성하세요.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
