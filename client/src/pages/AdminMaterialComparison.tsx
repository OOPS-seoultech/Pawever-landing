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
import { getWorkflow, type WorkflowOrder } from "@/lib/adminContracts";
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentPreview, setCurrentPreview] = useState("");
  const [nextPreview, setNextPreview] = useState("");
  const [preparing, setPreparing] = useState(false);
  const selectionSequence = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const addInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
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
  const upload = async (file: File, replacesId?: string) => {
    if (pending) return;
    setPending(true);
    setError("");
    const fingerprint = JSON.stringify([
      replacesId ?? "new",
      file.name,
      file.size,
      file.lastModified,
    ]);
    try {
      const fresh = await getWorkflow(row.orderNumber, row.petIndex);
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
      const job = previousJob ?? {
        key: crypto.randomUUID(),
        row: fresh,
      };
      jobs.current.set(fingerprint, job);
      await registerLocalFile(
        file,
        { ...job.row, taskId: job.row.taskId!, kinds: ["MULTIVIEW"] },
        "MULTIVIEW",
        job.key,
        replacesId
      );
      jobs.current.delete(fingerprint);
      onChanged?.(await getWorkflow(row.orderNumber, row.petIndex));
      setReplacement(null);
    } catch (e) {
      if (e instanceof AdminApiError && e.status >= 400 && e.status < 500)
        jobs.current.delete(fingerprint);
      setError(
        e instanceof Error
          ? e.message
          : "교체하지 못했습니다. 기존 이미지는 유지됩니다."
      );
    } finally {
      setPending(false);
    }
  };
  if (!canPhotos && !canFiles) return null;
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
                        4면도 추가
                      </Button>
                      <input
                        ref={addInput}
                        type="file"
                        accept=".svg,.png,.jpg,.jpeg,.webp"
                        className="hidden"
                        aria-label="4면도 파일 선택"
                        disabled={pending}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) void upload(file);
                        }}
                      />
                    </>
                  )}
              </div>
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
              />
              {error && !replacement && (
                <p role="alert" className="text-sm text-destructive">
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
                <p role="alert" className="text-sm text-destructive">
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
                  if (selectedFile) void upload(selectedFile, replacement?.id);
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
