import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { AdminImageGallery, type AdminImage } from "./AdminImageGallery";
import { AdminCustomerPhotos } from "./AdminCustomerPhotos";
import AdminThreeMfViewer from "./AdminThreeMfViewer";
import type { WorkflowOrder } from "@/lib/adminContracts";
export default function AdminModelComparisonDialog({
  row,
  files,
  loadFourViews,
  canPhotos,
  onClose,
}: {
  row: WorkflowOrder;
  files: WorkflowOrder["artifacts"];
  loadFourViews: () => Promise<AdminImage[]>;
  canPhotos: boolean;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(files.at(-1)!.id);
  const file = files.find(item => item.id === selected) ?? files.at(-1)!;
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex h-[90dvh] max-h-[90dvh] flex-col sm:max-w-[94vw]">
        <DialogHeader className="shrink-0">
          <DialogTitle>사진 · 4면도 · 3D 비교 — {row.petName}</DialogTitle>
          <DialogDescription>
            {row.orderNumber} · {row.guardianName ?? ""}. 형상과 무늬를 비교해
            주세요. 슬라이서 전용 채색·출력 설정은 Bambu Studio에서 최종
            확인합니다.
          </DialogDescription>
        </DialogHeader>
        <div
          className={`grid min-h-0 flex-1 gap-3 overflow-y-auto ${canPhotos ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"}`}
        >
          {canPhotos && (
            <section
              className="min-w-0 space-y-2 overflow-y-auto rounded-[15px] border bg-muted p-3"
              aria-label="3D 비교 고객 사진"
            >
              <h3 className="font-medium">고객 사진</h3>
              <AdminCustomerPhotos
                orderNumber={row.orderNumber}
                petIndex={row.petIndex}
                petName={row.petName}
                guardianName={row.guardianName}
              />
            </section>
          )}
          <section
            className="min-w-0 space-y-2 overflow-y-auto rounded-[15px] border bg-muted p-3"
            aria-label="3D 비교 4면도"
          >
            <h3 className="font-medium">현재 4면도</h3>
            <AdminImageGallery
              loadImages={loadFourViews}
              emptyText="등록된 4면도가 없습니다."
            />
          </section>
          <section
            className="flex min-h-[440px] min-w-0 flex-col gap-2 rounded-[15px] border bg-background p-3 lg:min-h-0"
            aria-label="3D 비교 모델 원본"
          >
            <label className="flex flex-col gap-1 text-sm font-medium">
              3D 모델
              <select
                aria-label="3D 모델"
                className="w-full min-w-0 rounded border bg-background p-2 text-sm"
                value={file.id}
                onChange={e => setSelected(e.target.value)}
              >
                {files.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.kind === "COLORED_MODEL" ? "채색" : "모델 원본"} ·{" "}
                    {item.fileName}
                  </option>
                ))}
              </select>
            </label>
            <AdminThreeMfViewer
              key={file.id}
              artifactId={file.id}
              size={file.size}
            />
          </section>
        </div>
        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
