import { fileExtension, maxFileSize } from "./localFiles";

/** Rasterize SVG in image context; never insert uploaded SVG into the document. */
export async function prepareImageUpload(file: File): Promise<File> {
  if (!file.size || file.size > maxFileSize)
    throw new Error("이미지는 0바이트보다 크고 100MB 이하여야 합니다.");
  const ext = fileExtension(file.name);
  const types: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    svg: "image/svg+xml",
  };
  const type = types[ext];
  if (typeof type !== "string")
    throw new Error("SVG, PNG, JPG, JPEG, WebP 이미지를 선택해 주세요.");
  if (ext !== "svg")
    return file.type === type
      ? file
      : new File([file], file.name, { type, lastModified: file.lastModified });
  const url = URL.createObjectURL(new Blob([file], { type }));
  const image = new Image();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error(
              "SVG를 읽는 시간이 초과됐습니다. PNG 또는 JPG로 다시 선택해 주세요."
            )
          ),
        12_000
      );
      image.onload = () => resolve();
      image.onerror = () =>
        reject(
          new Error("SVG 이미지를 읽지 못했습니다. 파일을 확인해 주세요.")
        );
      image.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight)
      throw new Error("SVG의 이미지 크기를 확인해 주세요.");
    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = Math.min(4096, Math.max(1024, longest)) / longest;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("이미지 변환을 시작하지 못했습니다.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        value =>
          value
            ? resolve(value)
            : reject(new Error("SVG를 PNG로 변환하지 못했습니다.")),
        "image/png"
      )
    );
    return new File([blob], file.name.replace(/\.svg$/i, ".png"), {
      type: "image/png",
      lastModified: file.lastModified,
    });
  } finally {
    clearTimeout(timer);
    image.onload = null;
    image.onerror = null;
    image.src = "";
    URL.revokeObjectURL(url);
  }
}
