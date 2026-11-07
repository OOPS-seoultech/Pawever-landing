import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getFileTargets, type FileTargets } from "@/lib/localFileApi";
import {
  chromeDesktop,
  createFolders,
  listLocalFiles,
  loadFolder,
  saveFolder,
  orderFolder,
  localKinds,
  type FolderState,
  type LocalFile,
  type UploadReceipt,
  type WorkDirectory,
} from "@/lib/localFiles";

type FolderContext = {
  supported: boolean;
  folder: FolderState | undefined;
  files: LocalFile[];
  targets: FileTargets;
  permission: PermissionState;
  loading: boolean;
  error: string;
  connect: () => Promise<void>;
  allow: () => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
  record: (receipt: UploadReceipt) => Promise<void>;
};
const Context = createContext<FolderContext | null>(null);
export const useLocalFolder = () => {
  const value = useContext(Context);
  if (!value) throw new Error("폴더 연결 상태가 없습니다.");
  return value;
};
export function AdminLocalFolderProvider({
  accountId,
  children,
}: {
  accountId: number | null;
  children: ReactNode;
}) {
  const picker = (
    window as Window & {
      showDirectoryPicker?: (options: {
        mode: "readwrite";
        id: string;
      }) => Promise<WorkDirectory>;
    }
  ).showDirectoryPicker;
  const supported = chromeDesktop() && !!picker;
  const [data, setData] = useState<
    { account: number; state: FolderState } | undefined
  >();
  const folder = data?.account === accountId ? data.state : undefined;
  const folderRef = useRef(folder);
  folderRef.current = folder;
  const accountRef = useRef(accountId);
  accountRef.current = accountId;
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [targets, setTargets] = useState<FileTargets>({
    orders: [],
    plates: [],
  });
  const [permission, setPermission] = useState<PermissionState>("prompt");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const refresh = useCallback(async () => {
    if (accountId == null || busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const next = await getFileTargets();
      if (!Array.isArray(next.orders) || !Array.isArray(next.plates))
        throw new Error(
          "업로드 대상을 불러오지 못했습니다. 목록을 새로고침해 주세요."
        );
      if (accountRef.current !== accountId) return;
      setTargets(next);
      const current = folderRef.current;
      if (!current || !supported) {
        setFiles([]);
        return;
      }
      const granted = await current.handle.queryPermission({
        mode: "readwrite",
      });
      if (accountRef.current !== accountId) return;
      setPermission(granted);
      if (granted !== "granted") {
        setFiles([]);
        return;
      }
      const paths: string[][] = [["주문"], ["플레이트"]];
      for (const order of next.orders)
        for (const kind of Object.values(localKinds))
          paths.push([...orderFolder(order), kind.folder]);
      for (const plate of next.plates)
        paths.push(["플레이트", `PB-${plate.id}`, "05_슬라이서_3MF_Gcode"]);
      if (folderRef.current?.handle !== current.handle) return;
      await createFolders(current.handle, paths);
      if (accountRef.current !== accountId) return;
      const entries = await listLocalFiles(current.handle);
      if (
        accountRef.current === accountId &&
        folderRef.current?.handle === current.handle
      ) {
        setFiles(entries);
        setError("");
      }
    } catch (e) {
      if (accountRef.current === accountId)
        setError(
          e instanceof Error
            ? e.message
            : "폴더를 읽지 못했습니다. 다시 연결해 주세요."
        );
    } finally {
      busy.current = false;
      if (accountRef.current === accountId) setLoading(false);
    }
  }, [accountId, supported]);
  useEffect(() => {
    let live = true;
    setData(undefined);
    setFiles([]);
    setTargets({ orders: [], plates: [] });
    setError("");
    setPermission("prompt");
    if (accountId == null) return;
    const load = async () => {
      try {
        if (supported) {
          const saved = await loadFolder(accountId);
          if (live && saved) {
            folderRef.current = saved;
            setData({ account: accountId, state: saved });
          }
        }
      } catch {
        if (live)
          setError(
            "크롬의 폴더 연결 기록을 읽지 못했습니다. 작업 폴더를 다시 연결해 주세요."
          );
      }
      if (live) void refresh();
    };
    void load();
    const visibleRefresh = () => {
      if (!document.hidden) void refresh();
    };
    const timer = window.setInterval(visibleRefresh, 30_000);
    window.addEventListener("focus", visibleRefresh);
    document.addEventListener("visibilitychange", visibleRefresh);
    return () => {
      live = false;
      accountRef.current = null;
      window.clearInterval(timer);
      window.removeEventListener("focus", visibleRefresh);
      document.removeEventListener("visibilitychange", visibleRefresh);
    };
  }, [accountId, supported, refresh]);
  const connect = async () => {
    if (!supported || !picker || accountId == null) {
      setError("데스크톱 Google Chrome에서 작업 폴더를 연결해 주세요.");
      return;
    }
    const account = accountId;
    try {
      const parent = await picker.call(window, {
        mode: "readwrite",
        id: "pawever-workspace",
      });
      if (accountRef.current !== account) return;
      const handle = (await parent.getDirectoryHandle("PAW-EVER", {
        create: true,
      })) as WorkDirectory;
      const state: FolderState = { handle, receipts: [] };
      await saveFolder(account, state);
      if (accountRef.current !== account) return;
      folderRef.current = state;
      setData({ account, state });
      setPermission("granted");
      setError("");
      await refresh();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(
        e instanceof Error ? e.message : "전용 작업 폴더를 선택해 주세요."
      );
    }
  };
  const allow = async () => {
    try {
      if (
        folder &&
        (await folder.handle.requestPermission({ mode: "readwrite" })) ===
          "granted"
      )
        await refresh();
      else
        setError(
          "폴더 생성·파일 읽기 권한이 필요합니다. 연결할 폴더를 다시 선택할 수 있습니다."
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "폴더 권한을 확인해 주세요.");
    }
  };
  const disconnect = async () => {
    if (accountId == null) return;
    await saveFolder(accountId);
    folderRef.current = undefined;
    setData(undefined);
    setFiles([]);
    setPermission("prompt");
    setError("");
  };
  const record = async (receipt: UploadReceipt) => {
    const state = folderRef.current;
    if (!state || accountId == null) return;
    const next = {
      ...state,
      receipts: [
        ...state.receipts.filter(
          r => r.signature !== receipt.signature || r.target !== receipt.target
        ),
        receipt,
      ],
    };
    await saveFolder(accountId, next);
    if (accountRef.current === accountId) {
      folderRef.current = next;
      setData({ account: accountId, state: next });
    }
  };
  return (
    <Context.Provider
      value={{
        supported,
        folder,
        files,
        targets,
        permission,
        loading,
        error,
        connect,
        allow,
        disconnect,
        refresh,
        record,
      }}
    >
      {children}
    </Context.Provider>
  );
}
