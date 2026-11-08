import { prepareImageUpload } from "./prepareImageUpload";
import { adminRequest, readAdminToken } from "./adminApi";
import { workflowCommand } from "./adminContracts";
import type { PrintBatch } from "./printBatchContracts";
import { validateLocalFile, type LocalKind } from "./localFiles";
export type FileTarget = {
  orderNumber: string;
  petIndex: number;
  petName: string;
  guardianName?: string | null;
  taskId: number;
  version: number;
  kinds: LocalKind[];
  artifacts: { id: string; fileName: string; size: number; kind: string }[];
};
export type FileTargets = { orders: FileTarget[]; plates: PrintBatch[] };
export const getFileTargets = () =>
  adminRequest<FileTargets>("/api/production/file-targets");
export const targetKey = (target: FileTarget) =>
  `order:${target.orderNumber}:${target.petIndex}`;
export const plateKey = (plate: PrintBatch) => `plate:${plate.id}`;
export async function registerLocalFile(
  file: File,
  target: FileTarget | PrintBatch,
  kind: LocalKind | "PLATE",
  key: string,
  options: { replacesArtifactId?: string; stageMultiview?: boolean } = {}
) {
  const login = readAdminToken();
  if (kind === "MULTIVIEW") file = await prepareImageUpload(file);
  await validateLocalFile(file, kind);
  if (readAdminToken() !== login)
    throw new Error("로그인 계정이 변경되어 등록을 중단했습니다.");
  const plate = "layoutRevision" in target;
  if (plate !== (kind === "PLATE"))
    throw new Error(
      "개별 아이 자료와 플레이트 자료의 등록 대상을 확인해 주세요."
    );
  const path = plate
    ? `/api/production/print-batches/${target.id}`
    : `/api/production/tasks/${target.taskId}`;
  const request = await workflowCommand<{
    artifactId: string;
    version: number;
    url: string;
    headers: Record<string, string>;
  }>(
    `${path}/artifacts/upload-requests`,
    {
      version: target.version,
      fileName: file.name,
      size: file.size,
      ...options,
      ...(!plate
        ? { kind, contentType: file.type || "application/octet-stream" }
        : {}),
    },
    `${key}-request`
  );
  const uploaded = await fetch(request.url, {
    method: "PUT",
    headers: request.headers,
    body: file,
  });
  if (!uploaded.ok)
    throw new Error(
      "파일 전송에 실패했습니다. 원본을 다시 확인한 뒤 재시도해 주세요."
    );
  if (readAdminToken() !== login)
    throw new Error("로그인 계정이 변경되어 등록을 중단했습니다.");
  await workflowCommand(
    plate
      ? `${path}/artifacts/${request.artifactId}/confirm`
      : `/api/production/artifacts/${request.artifactId}/confirm`,
    { version: request.version },
    `${key}-confirm`
  );
  return request.artifactId;
}
