import { unzipSync } from "three/addons/libs/fflate.module.js";

export const previewByteLimit = 20 * 1024 * 1024;
export function inspectThreeMf(data: ArrayBuffer) {
  if (data.byteLength > previewByteLimit)
    throw new Error("20MB를 넘는 모델은 내려받아 확인해 주세요.");
  let expanded = 0,
    count = 0,
    triangles = 0;
  const models = unzipSync(new Uint8Array(data), {
    filter(entry) {
      expanded += entry.originalSize;
      if (++count > 1000 || expanded > 64 * 1024 * 1024)
        throw new Error(
          "압축 해제 용량이 큰 모델입니다. 내려받아 확인해 주세요."
        );
      return /\.model$/i.test(entry.name);
    },
  });
  if (!Object.keys(models).length)
    throw new Error(
      "3MF 안에 3D 형상이 없습니다. .gcode.3mf는 출력 파일에 등록해 주세요."
    );
  for (const bytes of Object.values(models)) {
    const xml = new TextDecoder().decode(bytes);
    if (/<!DOCTYPE|<!ENTITY/i.test(xml))
      throw new Error("지원하지 않는 3MF 문서입니다.");
    const faces = /<(?:[\w]+:)?triangle(?:\s|>)/g;
    while (faces.exec(xml))
      if (++triangles > 350000)
        throw new Error("면이 많은 모델입니다. 내려받아 확인해 주세요.");
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror"))
      throw new Error("3MF 모델 정보를 읽지 못했습니다.");
    if (doc.querySelectorAll("item, component").length > 1000)
      throw new Error("부품이 많은 모델입니다. 내려받아 확인해 주세요.");
    const objects = new Map(
      Array.from(doc.querySelectorAll("resources > object")).map(node => [
        node.getAttribute("id"),
        node,
      ])
    );
    const complete = new Set<string | null>();
    const walk = (id: string | null, path = new Set<string | null>()) => {
      if (complete.has(id)) return;
      if (path.has(id) || path.size > 32)
        throw new Error("3MF 부품 참조가 올바르지 않습니다.");
      const next = new Set(path).add(id);
      objects
        .get(id)
        ?.querySelectorAll("components > component")
        .forEach(node => walk(node.getAttribute("objectid"), next));
      complete.add(id);
    };
    objects.forEach((_, id) => walk(id));
  }
}

export async function readPreviewFile(response: Response) {
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error("모델을 불러오지 못했습니다. 다시 시도해 주세요.");
  }
  if (Number(response.headers.get("content-length")) > previewByteLimit) {
    await response.body?.cancel();
    throw new Error("20MB를 넘는 모델은 내려받아 확인해 주세요.");
  }
  const reader = response.body?.getReader();
  if (!reader) {
    const data = await response.arrayBuffer();
    if (data.byteLength > previewByteLimit)
      throw new Error("모델 용량이 큽니다. 내려받아 확인해 주세요.");
    return data;
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > previewByteLimit)
        throw new Error("20MB를 넘는 모델은 내려받아 확인해 주세요.");
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel();
    throw error;
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result.buffer;
}
