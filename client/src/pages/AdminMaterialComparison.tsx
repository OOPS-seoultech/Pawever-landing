import { useEffect, useState } from "react";
import { useStaffSession } from "@/components/AdminSession";
import { Button } from "@/components/ui/button";
import {
  adminRequest,
  requestPhotoLinks,
  type AdminPhotoDownload,
} from "@/lib/adminApi";
import type { WorkflowOrder } from "@/lib/adminContracts";

export function AdminMaterialComparison({ row }: { row: WorkflowOrder }) {
  const { staff } = useStaffSession();
  const canPhotos = Boolean(
    staff?.permissions.includes("VIEW_CUSTOMER_PHOTOS")
  );
  const canFiles = Boolean(
    staff?.permissions.includes("VIEW_PRODUCTION_FILES") &&
      staff.permissions.includes("DOWNLOAD_PRODUCTION_FILES")
  );
  const [photos, setPhotos] = useState<AdminPhotoDownload["photos"]>([]);
  const [fourView, setFourView] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const artifact = [...row.artifacts]
    .reverse()
    .find(
      file =>
        file.kind === "MULTIVIEW" &&
        (row.modelingTaskId != null
          ? file.taskId === row.modelingTaskId
          : file.modelingAttempt === row.taskAttempt)
    );
  const artifactId = canFiles ? artifact?.id : undefined;
  useEffect(() => {
    let live = true;
    setPhotos([]);
    setFourView("");
    setError("");
    setLoading(true);
    const load = async () => {
      const results = await Promise.allSettled([
        canPhotos
          ? requestPhotoLinks(row.orderNumber, row.petIndex).then(result => {
              if (live) setPhotos(result.photos);
            })
          : Promise.resolve(),
        artifactId
          ? adminRequest<{ url: string }>(
              `/api/production/artifacts/${encodeURIComponent(artifactId)}/download-link`,
              { method: "POST" }
            ).then(result => {
              if (live) setFourView(result.url);
            })
          : Promise.resolve(),
      ]);
      if (!live) return;
      setError(
        results
          .filter(result => result.status === "rejected")
          .map(result =>
            result.reason instanceof Error
              ? result.reason.message
              : "비교 자료를 불러오지 못했습니다."
          )
          .join(" / ")
      );
      setLoading(false);
    };
    void load();
    return () => {
      live = false;
    };
  }, [row.orderNumber, row.petIndex, artifactId, canPhotos, revision]);
  if (!canPhotos && !canFiles) return null;
  return (
    <section
      aria-label="고객 사진·4면도 비교"
      className="flex shrink-0 flex-col gap-3 rounded-lg border bg-background p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">고객 사진 · 현재 4면도</h2>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => setRevision(value => value + 1)}
        >
          비교 자료 새로고침
        </Button>
      </div>
      {loading && (
        <p role="status" className="text-xs">
          비교 자료 확인 중…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        {canPhotos && (
          <div className="flex min-w-0 flex-col gap-2">
            <h3 className="text-sm font-medium">신청 사진</h3>
            <div className="grid grid-cols-2 gap-2 2xl:grid-cols-3">
              {photos.map(photo => (
                <a
                  key={photo.slot}
                  href={photo.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src={photo.url}
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={640}
                    alt={`고객 사진 ${photo.slot}`}
                    className="aspect-square h-auto w-full rounded object-contain"
                    onError={() =>
                      setError(
                        "사진 링크가 만료되었거나 열리지 않습니다. 비교 자료를 새로고침해 주세요."
                      )
                    }
                  />
                </a>
              ))}
            </div>
            {!loading && !photos.length && (
              <p className="text-xs text-muted-foreground">
                확인할 신청 사진이 없습니다.
              </p>
            )}
          </div>
        )}
        {canFiles && (
          <div className="flex min-w-0 flex-col gap-2">
            <h3 className="text-sm font-medium">현재 회차 4면도</h3>
            {fourView ? (
              <a href={fourView} target="_blank" rel="noreferrer">
                <img
                  src={fourView}
                  loading="lazy"
                  decoding="async"
                  width={1024}
                  height={1024}
                  alt="현재 모델링 회차 4면도"
                  className="h-auto max-h-96 w-full rounded object-contain"
                  onError={() =>
                    setError(
                      "4면도 링크가 만료되었거나 열리지 않습니다. 비교 자료를 새로고침해 주세요."
                    )
                  }
                />
              </a>
            ) : (
              !loading && (
                <p className="text-xs text-muted-foreground">
                  현재 회차에 등록된 4면도가 없습니다.
                </p>
              )
            )}
            <p className="text-xs text-muted-foreground">
              3D 모델은 아래 모델링 자료의 열기에서 확인합니다. Tripo 제작과
              모델 검수는 담당자가 직접 진행합니다.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
