export const localKinds = {
  MULTIVIEW: {
    label: "2D 4면도",
    folder: "01_2D_4면도",
    extensions: ["svg", "png", "jpg", "jpeg", "webp"],
  },
  MODEL_SOURCE: {
    label: "3D 모델 원본",
    folder: "02_3D_모델원본",
    extensions: ["glb", "gltf", "obj", "fbx", "blend", "stl", "3mf"],
  },
  PRINT_MODEL: {
    label: "출력 파일 (G-code 3MF)",
    folder: "03_출력모델",
    extensions: ["3mf"],
  },
  COLORED_MODEL: {
    label: "채색 3MF",
    folder: "04_채색3MF",
    extensions: ["3mf"],
  },
} as const;
export type LocalKind = keyof typeof localKinds;
export type WorkDirectory = FileSystemDirectoryHandle & {
  queryPermission: (options: { mode: "readwrite" }) => Promise<PermissionState>;
  requestPermission: (options: {
    mode: "readwrite";
  }) => Promise<PermissionState>;
  values: () => AsyncIterableIterator<FileSystemHandle>;
};
export type LocalFile = {
  path: string;
  file: File;
  handle?: FileSystemFileHandle;
  suggestedTarget?: string;
  suggestedKind?: LocalKind | "PLATE";
};
export type UploadReceipt = {
  signature: string;
  target: string;
  artifactId: string;
  at: string;
};
export type FolderState = { handle: WorkDirectory; receipts: UploadReceipt[] };
export const maxFileSize = 100 * 1024 * 1024;

export function chromeDesktop(
  nav: Pick<Navigator, "userAgent" | "vendor"> = navigator
) {
  return (
    /Chrome\//.test(nav.userAgent) &&
    !/Edg\/|OPR\/|Android|Mobile/.test(nav.userAgent) &&
    nav.vendor === "Google Inc."
  );
}
export const folderName = (value: string) =>
  value
    .normalize("NFC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/[. ]+$/g, "")
    .slice(0, 80) || "이름없음";
export const orderFolder = (order: {
  orderNumber: string;
  petIndex: number;
  petName: string;
}) => [
  "주문",
  folderName(order.orderNumber),
  `아이${order.petIndex + 1}_${folderName(order.petName)}`,
];
export const fileSignature = (entry: LocalFile) =>
  `${entry.path}:${entry.file.size}:${entry.file.lastModified}`;
export const fileExtension = (name: string) =>
  name.split(".").pop()?.toLowerCase() ?? "";
export function acceptedFile(name: string) {
  return (
    /\.(svg|png|jpe?g|webp|glb|gltf|obj|fbx|blend|stl|3mf|gcode)$/i.test(
      name
    ) && !/\.(crdownload|part|tmp)(\.|$)/i.test(name)
  );
}
export async function validateLocalFile(file: File, kind: LocalKind | "PLATE") {
  if (!file.size || file.size > maxFileSize)
    throw new Error("파일은 0바이트보다 크고 100MB 이하여야 합니다.");
  const sliced = /\.gcode\.3mf$/i.test(file.name);
  if (kind === "PRINT_MODEL" && !sliced)
    throw new Error(
      "출력 파일은 .gcode.3mf로 등록해 주세요. 일반 .3mf는 모델 원본입니다."
    );
  if ((kind === "MODEL_SOURCE" || kind === "COLORED_MODEL") && sliced)
    throw new Error(".gcode.3mf는 출력 파일로 등록해 주세요.");
  const ext = fileExtension(file.name);
  const extensions: readonly string[] =
    kind === "PLATE" ? ["3mf", "gcode"] : localKinds[kind].extensions;
  if (!extensions.includes(ext))
    throw new Error("선택한 자료 종류와 파일 확장자가 맞지 않습니다.");
  if (ext === "3mf") {
    const start = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    const tail = new Uint8Array(await file.slice(-65557).arrayBuffer());
    let complete = false;
    for (let i = Math.max(0, tail.length - 65557); i <= tail.length - 22; i++) {
      if (
        tail[i] === 80 &&
        tail[i + 1] === 75 &&
        tail[i + 2] === 5 &&
        tail[i + 3] === 6
      ) {
        const comment = tail[i + 20] + (tail[i + 21] << 8);
        if (i + 22 + comment === tail.length) complete = true;
      }
    }
    if (
      start[0] !== 80 ||
      start[1] !== 75 ||
      start[2] !== 3 ||
      start[3] !== 4 ||
      !complete
    )
      throw new Error(
        "완전히 저장된 3MF가 아닙니다. ASIDE/슬라이서 저장이 끝난 뒤 다시 확인해 주세요."
      );
  }
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("pawever-work-folders", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("accounts");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        request.error ?? new Error("브라우저 폴더 설정을 읽지 못했습니다.")
      );
  });
}
export async function loadFolder(
  account: number
): Promise<FolderState | undefined> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db
        .transaction("accounts")
        .objectStore("accounts")
        .get(account);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
export async function saveFolder(account: number, state?: FolderState) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("accounts", "readwrite");
      if (state) transaction.objectStore("accounts").put(state, account);
      else transaction.objectStore("accounts").delete(account);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}
export async function createFolders(root: WorkDirectory, paths: string[][]) {
  for (const path of paths) {
    let current: FileSystemDirectoryHandle = root;
    for (const part of path)
      current = await current.getDirectoryHandle(folderName(part), {
        create: true,
      });
  }
}
export async function listLocalFiles(
  root: WorkDirectory
): Promise<LocalFile[]> {
  const result: LocalFile[] = [];
  async function walk(directory: WorkDirectory, path: string[], depth: number) {
    if (depth > 8)
      throw new Error(
        "폴더 깊이가 너무 깊습니다. 완성본을 생성된 작업 폴더에 모아 주세요."
      );
    for await (const item of directory.values()) {
      if (item.name.startsWith(".")) continue;
      if (item.kind === "directory") {
        await walk(item as WorkDirectory, [...path, item.name], depth + 1);
        continue;
      }
      if (!acceptedFile(item.name)) continue;
      const handle = item as FileSystemFileHandle;
      const file = await handle.getFile();
      const kind = (Object.keys(localKinds) as LocalKind[]).find(key =>
        path.includes(localKinds[key].folder)
      );
      const orderNumber = path[0] === "주문" ? path[1] : undefined;
      const petNumber = path[2]?.match(/^아이([1-9][0-9]*)_/);
      const plate =
        path[0] === "플레이트" ? path[1]?.match(/^PB-([0-9]+)$/) : undefined;
      result.push({
        path: [...path, file.name].join("/"),
        file,
        handle,
        suggestedKind: plate ? "PLATE" : kind,
        suggestedTarget: plate
          ? `plate:${plate[1]}`
          : orderNumber && petNumber
            ? `order:${orderNumber}:${Number(petNumber[1]) - 1}`
            : undefined,
      });
    }
  }
  await walk(root, [], 0);
  return result.sort(
    (a, b) =>
      b.file.lastModified - a.file.lastModified || a.path.localeCompare(b.path)
  );
}
