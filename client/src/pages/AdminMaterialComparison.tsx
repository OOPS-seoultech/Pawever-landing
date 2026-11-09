import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useStaffSession } from "@/components/AdminSession";
import { AdminCustomerPhotos } from "@/components/AdminCustomerPhotos";
import {
  AdminImageGallery,
  type AdminImage,
} from "@/components/AdminImageGallery";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { prepareImageUpload } from "@/lib/prepareImageUpload";
import { Button } from "@/components/ui/button";
import { AdminApiError, adminRequest } from "@/lib/adminApi";
import {
  getWorkflow,
  workflowCommand,
  type WorkflowOrder,
} from "@/lib/adminContracts";
import { currentMultiviews } from "@/lib/adminImages";
import { adminDownloadName } from "@/lib/adminDownloads";
import { registerLocalFile } from "@/lib/localFileApi";
const AdminModelComparisonDialog = lazy(
  () => import("@/components/AdminModelComparisonDialog")
);
export function AdminMaterialComparison({
  row,
  onChanged,
}: {
  row: WorkflowOrder;
  onChanged?: (row: WorkflowOrder) => void;
}) {
  const { staff } = useStaffSession();
  const canPhotos = Boolean(
    staff?.permissions.includes("VIEW_CUSTOMER_PHOTOS")
  );
  const canFiles = Boolean(
    staff?.permissions.includes("VIEW_PRODUCTION_FILES") &&
      staff.permissions.includes("DOWNLOAD_PRODUCTION_FILES")
  );
  const [comparing, setComparing] = useState(false);
  const modelingTask = row.modelingTaskId ?? row.taskId;
  const models = row.artifacts.filter(
    file =>
      /\.3mf$/i.test(file.fileName) &&
      !/\.gcode\.3mf$/i.test(file.fileName) &&
      ((file.kind === "MODEL_SOURCE" && file.taskId === modelingTask) ||
        (file.kind === "COLORED_MODEL" &&
          file.taskId != null &&
          modelingTask != null &&
          file.taskId >= modelingTask))
  );
  const artifacts = currentMultiviews(row);
  const artifactKey = JSON.stringify(artifacts.map(a => [a.id, a.fileName]));
  const sources = useMemo(() => artifacts, [artifactKey]);
  const loadFourViews = useCallback(
    async () =>
      Promise.all(
        sources.map(async file => {
          const value = await adminRequest<{ url: string; expiresAt: string }>(
            `/api/production/artifacts/${encodeURIComponent(file.id)}/download-link`,
            { method: "POST" }
          );
          return {
            id: file.id,
            url: value.url,
            label: file.fileName,
            fileName: adminDownloadName(row, file.fileName),
            expiresAt: value.expiresAt,
          };
        })
      ),
    [sources, row.petName, row.guardianName]
  );
  const [replacement, setReplacement] = useState<AdminImage | null>(null);
  const [removal, setRemoval] = useState<AdminImage | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentPreview, setCurrentPreview] = useState("");
  const [nextPreview, setNextPreview] = useState("");
  const [preparing, setPreparing] = useState(false);
  const selectionSequence = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const addInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const uploading = useRef(false);
  const mounted = useRef(true);
  const pendingSet = useRef<{
    files: File[];
    ids: string[];
    key: string;
    body?: { version: number; artifactIds: string[] };
  } | null>(null);
  const [uploadStatus, setUploadStatus] = useState("");
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [error, setError] = useState("");
  const jobs = useRef(new Map<string, { key: string; row: WorkflowOrder }>());
  useEffect(() => {
    let live = true;
    selectionSequence.current++;
    setSelectedFile(null);
    setCurrentPreview("");
    setPreparing(false);
    setError("");
    if (replacement)
      void adminRequest<{ url: string }>(
        `/api/production/artifacts/${encodeURIComponent(replacement.id)}/download-link`,
        { method: "POST" }
      )
        .then(result => {
          if (live) setCurrentPreview(result.url);
        })
        .catch(e => {
          if (live)
            setError(
              e instanceof Error
                ? e.message
                : "기존 이미지를 불러오지 못했습니다."
            );
        });
    return () => {
      live = false;
      selectionSequence.current++;
    };
  }, [replacement?.id]);
  useEffect(() => {
    if (!selectedFile) {
      setNextPreview("");
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setNextPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);
  const chooseFile = async (file: File) => {
    const token = ++selectionSequence.current;
    setSelectedFile(null);
    setPreparing(true);
    setError("");
    try {
      const prepared = await prepareImageUpload(file);
      if (selectionSequence.current === token) setSelectedFile(prepared);
    } catch (e) {
      if (selectionSequence.current === token)
        setError(e instanceof Error ? e.message : "이미지를 읽지 못했습니다.");
    } finally {
      if (selectionSequence.current === token) setPreparing(false);
    }
  };
  const upload = async (files: File[], replacesId?: string, retry = false) => {
    if (uploading.current || !files.length) return;
    if (!replacesId && files.length !== 4) {
      setError("정면·좌측·우측·뒷면 이미지를 정확히 4장 선택해 주세요.");
      return;
    }
    if (!replacesId && !retry)
      pendingSet.current = { files, ids: [], key: crypto.randomUUID() };
    const batch = replacesId ? null : pendingSet.current;
    if (!replacesId && !batch) return;
    uploading.current = true;
    setPending(true);
    setError("");
    let completed = batch?.ids.length ?? 0;
    let fingerprint = "";
    try {
      for (const file of files.slice(completed)) {
        if (!mounted.current) return;
        if (!replacesId)
          setUploadStatus(`4면도 등록 중 ${completed + 1}/${files.length}장`);
        fingerprint = JSON.stringify([
          replacesId ?? batch!.key,
          file.name,
          file.size,
          file.lastModified,
        ]);
        const fresh = await getWorkflow(row.orderNumber, row.petIndex);
        if (!mounted.current) return;
        const previousJob = jobs.current.get(fingerprint);
        if (
          !previousJob &&
          (!fresh.allowedActions.includes("UPLOAD_ARTIFACT") ||
            (replacesId &&
              !currentMultiviews(fresh).some(a => a.id === replacesId)))
        )
          throw new Error(
            "파일 또는 제작 단계가 변경됐습니다. 현재 자료를 다시 확인해 주세요."
          );
        const job = previousJob ?? { key: crypto.randomUUID(), row: fresh };
        jobs.current.set(fingerprint, job);
        const id = await registerLocalFile(
          file,
          { ...job.row, taskId: job.row.taskId!, kinds: ["MULTIVIEW"] },
          "MULTIVIEW",
          job.key,
          replacesId
            ? { replacesArtifactId: replacesId }
            : { stageMultiview: true }
        );
        batch?.ids.push(id);
        jobs.current.delete(fingerprint);
        completed++;
        const updated = await getWorkflow(row.orderNumber, row.petIndex);
        if (!mounted.current) return;
        onChanged?.(updated);
      }
      if (batch) {
        setUploadStatus("새 4면도 4장으로 교체 중…");
        const fresh = await getWorkflow(row.orderNumber, row.petIndex);
        if (!mounted.current) return;
        batch.body ??= { version: fresh.version, artifactIds: [...batch.ids] };
        const published = await workflowCommand<WorkflowOrder>(
          `/api/production/tasks/${fresh.taskId}/artifacts/multiview-set`,
          batch.body,
          batch.key
        );
        pendingSet.current = null;
        if (!mounted.current) return;
        onChanged?.(published);
        setUploadStatus("4면도 4장 등록 완료");
      }
      setReplacement(null);
    } catch (e) {
      if (!mounted.current) return;
      if (e instanceof AdminApiError && e.status >= 400 && e.status < 500)
        jobs.current.delete(fingerprint);
      if (!replacesId) {
        setUploadStatus(
          completed === 4
            ? "4/4장 전송 완료 · 교체 확정 확인 필요"
            : `4면도 ${completed}/4장 전송 완료 · 기존 4면도 유지`
        );
        if (
          e instanceof AdminApiError &&
          e.status >= 400 &&
          e.status < 500 &&
          batch
        )
          batch.body = undefined;
      }
      setError(
        `${files[completed]?.name ?? "교체 확정"}: ${
          e instanceof Error
            ? e.message
            : "등록하지 못했습니다. 기존 이미지는 유지됩니다."
        }`
      );
    } finally {
      uploading.current = false;
      if (mounted.current) setPending(false);
    }
  };
  if (!canPhotos && !canFiles) return null;
  const removeImage = async () => {
    if (!removal || uploading.current) return;
    const fingerprint = `remove:${removal.id}`;
    uploading.current = true;
    setPending(true);
    setError("");
    try {
      const fresh = await getWorkflow(row.orderNumber, row.petIndex);
      const job = jobs.current.get(fingerprint) ?? {
        key: crypto.randomUUID(),
        row: fresh,
      };
      jobs.current.set(fingerprint, job);
      const updated = await workflowCommand<WorkflowOrder>(
        `/api/production/artifacts/${encodeURIComponent(removal.id)}/retire`,
        { version: job.row.version },
        job.key
      );
      jobs.current.delete(fingerprint);
      if (mounted.current) {
        onChanged?.(updated);
        setRemoval(null);
      }
    } catch (e) {
      if (e instanceof AdminApiError && e.status >= 400 && e.status < 500)
        jobs.current.delete(fingerprint);
      if (mounted.current)
        setError(
          e instanceof Error ? e.message : "이미지를 삭제하지 못했습니다."
        );
    } finally {
      uploading.current = false;
      if (mounted.current) setPending(false);
    }
  };
  return (
    <>
      <section
        aria-label="고객 사진·4면도 비교"
        className="flex shrink-0 flex-col gap-3 rounded-[15px] border bg-muted p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">고객 사진 · 현재 4면도</h2>
        </div>
        {comparing && models.length > 0 && (
          <Suspense
            fallback={
              <p role="status" className="text-sm">
                3D 비교 화면을 준비하는 중…
              </p>
            }
          >
            <AdminModelComparisonDialog
              row={row}
              files={models}
              loadFourViews={loadFourViews}
              canPhotos={canPhotos}
              onClose={() => setComparing(false)}
            />
          </Suspense>
        )}
        <p className="text-xs text-muted-foreground">
          클릭하면 확대됩니다. ⌘/Ctrl+클릭하면 새 탭에서 열립니다.
        </p>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          {canPhotos && (
            <div className="flex min-w-0 flex-col gap-2 rounded-[15px] border bg-background p-3">
              <h3 className="text-sm font-medium">신청 사진 · {row.petName}</h3>
              <AdminCustomerPhotos
                orderNumber={row.orderNumber}
                petIndex={row.petIndex}
                petName={row.petName}
                guardianName={row.guardianName}
              />
            </div>
          )}
          {canFiles && (
            <div className="flex min-w-0 flex-col gap-2 rounded-[15px] border bg-background p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium">현재 회차 4면도</h3>
                {onChanged &&
                  row.allowedActions.includes("UPLOAD_ARTIFACT") && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => addInput.current?.click()}
                      >
                        4면도 등록·교체
                      </Button>
                      <input
                        ref={addInput}
                        type="file"
                        accept=".svg,.png,.jpg,.jpeg,.webp"
                        className="hidden"
                        aria-label="4면도 파일 선택"
                        multiple
                        disabled={pending}
                        onChange={e => {
                          const files = Array.from(e.target.files ?? []);
                          e.target.value = "";
                          if (files.length) void upload(files);
                        }}
                      />
                    </>
                  )}
              </div>
              <p className="text-xs text-muted-foreground">
                정면·좌측·우측·뒷면 4장을 함께 선택해 주세요. 모두 등록되면 기존
                4면도를 교체합니다.
              </p>
              {artifacts.length > 4 && (
                <p className="text-sm text-amber-800">
                  이전 등록 사진이 {artifacts.length}장 남아 있습니다. 불필요한
                  사진은 왼쪽 위 X로 삭제해 최대 4장으로 정리해 주세요.
                </p>
              )}
              {uploadStatus && (
                <p role="status" className="text-sm">
                  {uploadStatus}
                </p>
              )}
              {!pending && pendingSet.current && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void upload(pendingSet.current!.files, undefined, true)
                  }
                >
                  {pendingSet.current.ids.length === 4
                    ? "4면도 교체 확정 다시 시도"
                    : `남은 ${4 - pendingSet.current.ids.length}장 다시 등록`}
                </Button>
              )}
              <AdminImageGallery
                key={`${row.orderNumber}:${row.petIndex}:${artifactKey}`}
                loadImages={loadFourViews}
                emptyText="현재 회차에 등록된 4면도가 없습니다."
                onReplace={
                  onChanged && row.allowedActions.includes("UPLOAD_ARTIFACT")
                    ? setReplacement
                    : undefined
                }
                replacementDisabled={pending}
                onRemove={
                  onChanged && row.allowedActions.includes("UPLOAD_ARTIFACT")
                    ? image => {
                        setError("");
                        setRemoval(image);
                      }
                    : undefined
                }
              />
              {error && !replacement && (
                <p
                  role="alert"
                  className="break-words text-sm text-destructive"
                >
                  {error}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                모델 원본 .3mf를 등록하면 사진·4면도·3D 비교를 열 수 있습니다.
                출력용 .gcode.3mf는 3D 비교 대상에서 제외합니다.
              </p>
            </div>
          )}
        </div>
        <Dialog
          open={removal !== null}
          onOpenChange={open => {
            if (!open && !pending) setRemoval(null);
          }}
        >
          <DialogContent showCloseButton={!pending}>
            <DialogHeader>
              <DialogTitle>4면도 이미지 삭제</DialogTitle>
              <DialogDescription>
                {row.petName} · {removal?.label}. 현재 4면도와 ZIP에서
                제외합니다. 원본 파일과 작업 기록은 보존됩니다.
              </DialogDescription>
            </DialogHeader>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => setRemoval(null)}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() => void removeImage()}
              >
                {pending ? "삭제 중…" : "삭제하기"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={replacement !== null}
          onOpenChange={open => {
            if (!open && !pending) setReplacement(null);
          }}
        >
          <DialogContent
            showCloseButton={!pending}
            className="flex max-h-[85dvh] flex-col sm:max-w-3xl"
          >
            <DialogHeader className="shrink-0">
              <DialogTitle>4면도 이미지 교체</DialogTitle>
              <DialogDescription>
                {row.petName} · {replacement?.label}. 교체 전후를 확인해 주세요.
                이전 파일은 기록에 보존됩니다.
              </DialogDescription>
            </DialogHeader>
            <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex min-w-0 flex-col gap-2 rounded-[15px] border bg-background p-3">
                  <h3 className="text-sm font-medium">현재 이미지</h3>
                  {currentPreview ? (
                    <img
                      src={currentPreview}
                      alt="교체 전 이미지"
                      className="aspect-square max-h-[35dvh] w-full rounded border object-contain"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      현재 이미지 확인 중…
                    </p>
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-2 rounded-[15px] border bg-background p-3">
                  <h3 className="text-sm font-medium">새 이미지</h3>
                  <Button
                    type="button"
                    variant="outline"
                    className="aspect-square h-auto max-h-[35dvh] w-full whitespace-normal p-0"
                    aria-label="새 이미지 파일 선택"
                    data-image-picker
                    aria-describedby="replacement-format-help"
                    title={
                      nextPreview
                        ? "클릭해서 다른 이미지 선택"
                        : "클릭해서 새 이미지 선택"
                    }
                    disabled={pending || preparing}
                    onClick={() => fileInput.current?.click()}
                  >
                    {nextPreview ? (
                      <img
                        src={nextPreview}
                        alt="교체할 새 이미지"
                        className="size-full rounded object-contain"
                      />
                    ) : (
                      <span className="px-3 text-sm text-muted-foreground">
                        {preparing
                          ? "이미지 준비 중…"
                          : "새 파일을 선택해 주세요."}
                      </span>
                    )}
                  </Button>
                </div>
              </div>
              <input
                ref={fileInput}
                key={replacement?.id}
                aria-label="교체할 이미지 파일"
                type="file"
                accept=".svg,.png,.jpg,.jpeg,.webp"
                className="hidden"
                disabled={pending || preparing}
                onChange={e => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void chooseFile(file);
                }}
              />
              <p
                id="replacement-format-help"
                className="text-sm text-muted-foreground"
              >
                SVG · PNG · JPG · JPEG · WebP, 최대 100MB. SVG는 PNG로 변환해
                저장합니다. PC 원본은 변경하지 않습니다.
              </p>
              {selectedFile && (
                <p className="break-all text-sm text-muted-foreground">
                  저장할 파일: {selectedFile.name}
                </p>
              )}
              {error && (
                <p
                  role="alert"
                  className="break-words text-sm text-destructive"
                >
                  {error}
                </p>
              )}
            </div>
            <DialogFooter className="shrink-0">
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => setReplacement(null)}
              >
                취소
              </Button>
              <Button
                disabled={!selectedFile || !nextPreview || pending || preparing}
                onClick={() => {
                  if (selectedFile)
                    void upload([selectedFile], replacement?.id);
                }}
              >
                {pending ? "교체 중…" : "교체하기"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
      <Button
        className="w-full disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
        disabled={!canFiles || models.length === 0}
        onClick={() => setComparing(true)}
      >
        4면도와 3D 비교하기
      </Button>
    </>
  );
}
