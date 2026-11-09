import { saveAdminFile } from "@/lib/adminDownloads";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { ChevronLeft, ChevronRight, RefreshCw, X } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";

export type AdminImage = {
  id: string;
  url: string;
  label: string;
  fileName: string;
  expiresAt?: string;
};
export function AdminImageGallery({
  loadImages,
  emptyText,
  gridClassName = "grid grid-cols-2 gap-2",
  canSave = true,
  onReplace,
  onRemove,
  replacementDisabled = false,
}: {
  loadImages: () => Promise<AdminImage[]>;
  emptyText: string;
  gridClassName?: string;
  canSave?: boolean;
  onReplace?: (image: AdminImage) => void;
  onRemove?: (image: AdminImage) => void;
  replacementDisabled?: boolean;
}) {
  const [images, setImages] = useState<AdminImage[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [image, setImage] = useState<AdminImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState<string[]>([]);
  const retried = useRef(new Set<string>());
  const alive = useRef(true);
  const sequence = useRef(0);
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const fail = (e: unknown) =>
    e instanceof Error ? e.message : "이미지를 불러오지 못했습니다.";
  const refresh = useCallback(async () => {
    const next = await loadImages();
    if (alive.current) {
      setImages(next);
      setLoading(false);
    }
    return next;
  }, [loadImages]);
  useEffect(() => {
    alive.current = true;
    void refresh().catch(e => {
      if (alive.current) {
        setError(fail(e));
        setLoading(false);
      }
    });
    const resume = () => {
      if (
        !document.hidden &&
        imagesRef.current.some(
          i => i.expiresAt && Date.parse(i.expiresAt) < Date.now() + 15_000
        )
      )
        void refresh().catch(e => {
          if (alive.current) setError(fail(e));
        });
    };
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      alive.current = false;
      sequence.current++;
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [refresh]);
  const show = async (id: string) => {
    const token = ++sequence.current;
    setActive(id);
    setImage(null);
    setError("");
    try {
      const next = await refresh();
      if (!alive.current || token !== sequence.current) return;
      const found = next.find(item => item.id === id);
      if (!found)
        throw new Error(
          "사진이 변경되었거나 열람 권한이 없습니다. 닫고 목록을 다시 확인해 주세요."
        );
      setImage(found);
      setFailed(value => value.filter(id => id !== found.id));
    } catch (e) {
      if (alive.current && token === sequence.current) setError(fail(e));
    }
  };
  const close = () => {
    sequence.current++;
    setActive(null);
    setImage(null);
    setError("");
  };
  const index = images.findIndex(i => i.id === active);
  const move = (delta: number) => {
    const next = images[index + delta];
    if (next) void show(next.id);
  };
  const click = (e: MouseEvent<HTMLAnchorElement>, item: AdminImage) => {
    if (e.button !== 0 && e.button !== 1) return;
    e.preventDefault();
    if (e.metaKey || e.ctrlKey || e.button === 1) {
      const tab = window.open("about:blank", "_blank");
      if (!tab) {
        setError("팝업을 허용한 뒤 다시 눌러 주세요.");
        return;
      }
      tab.opener = null;
      void refresh()
        .then(next => {
          const fresh = next.find(i => i.id === item.id);
          if (!fresh || !alive.current)
            throw new Error(
              "사진을 열 수 없습니다. 권한과 로그인 상태를 확인해 주세요."
            );
          tab.location.href = fresh.url;
        })
        .catch(e => {
          tab.close();
          if (alive.current) setError(fail(e));
        });
    } else void show(item.id);
  };
  const thumbnailError = (id: string) => {
    if (retried.current.has(id)) {
      setFailed(value => [...value, id]);
      return;
    }
    retried.current.add(id);
    void refresh().catch(e => {
      if (alive.current) setError(fail(e));
    });
  };
  const save = async () => {
    if (!active || saving || !canSave) return;
    setSaving(true);
    setError("");
    try {
      const fresh = (await refresh()).find(i => i.id === active);
      if (!fresh) throw new Error("저장할 사진이 없습니다.");
      const response = await fetch(fresh.url);
      if (!response.ok)
        throw new Error("이미지를 저장하지 못했습니다. 다시 시도해 주세요.");
      const blob = await response.blob();
      if (!blob.type.startsWith("image/"))
        throw new Error("이미지 응답이 아닙니다. 다시 시도해 주세요.");
      if (!alive.current) return;
      saveAdminFile(blob, fresh.fileName);
    } catch (e) {
      if (alive.current) setError(fail(e));
    } finally {
      if (alive.current) setSaving(false);
    }
  };
  return (
    <>
      {error && !active && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {loading && (
        <p role="status" className="text-xs text-muted-foreground">
          사진을 불러오는 중…
        </p>
      )}
      <div className={gridClassName}>
        {images.map(item => (
          <div key={item.id} className="relative min-w-0">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => click(e, item)}
              onAuxClick={e => click(e, item)}
              className="flex min-w-0 flex-col gap-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {failed.includes(item.id) ? (
                <span className="flex aspect-square items-center justify-center rounded border text-sm">
                  클릭해서 다시 불러오기
                </span>
              ) : (
                <img
                  src={item.url}
                  alt={item.label}
                  width={640}
                  height={640}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square h-auto w-full rounded border bg-muted/20 object-contain"
                  onError={() => thumbnailError(item.id)}
                />
              )}
              <span className="break-all text-xs text-muted-foreground">
                {item.label}
              </span>
            </a>
            {onRemove && (
              <Button
                variant="secondary"
                size="icon-sm"
                className="absolute left-2 top-2 rounded-full"
                aria-label={`${item.label} 삭제`}
                title="4면도 이미지 삭제"
                disabled={replacementDisabled}
                onClick={() => onRemove(item)}
              >
                <X aria-hidden="true" />
              </Button>
            )}
            {onReplace && (
              <Button
                variant="secondary"
                size="icon-sm"
                className="absolute right-2 top-2 rounded-full"
                aria-label={`${item.label} 교체`}
                title="이미지 교체"
                disabled={replacementDisabled}
                onClick={() => onReplace(item)}
              >
                <RefreshCw aria-hidden="true" />
              </Button>
            )}
          </div>
        ))}
      </div>
      {!loading && !images.length && (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      )}
      <Dialog
        open={active !== null}
        onOpenChange={open => {
          if (!open) close();
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex h-[70dvh] w-[92vw] max-w-none flex-col sm:max-w-none lg:w-[70vw]"
          onKeyDown={e => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              move(e.key === "ArrowLeft" ? -1 : 1);
            }
          }}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {images[index]?.label ?? "이미지 확대"} · {index + 1} /{" "}
              {images.length}
            </DialogTitle>
            <DialogDescription>
              양쪽 세로 영역이나 이미지 좌우, 방향키로 이동합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid min-h-0 flex-1 grid-cols-[12%_minmax(0,1fr)_12%] items-stretch gap-2">
            <Button
              variant="ghost"
              className="h-full w-full px-0"
              aria-label="이전 이미지"
              disabled={index <= 0}
              onClick={() => move(-1)}
            >
              <span className="flex size-9 items-center justify-center rounded-full border bg-background">
                <ChevronLeft aria-hidden="true" />
              </span>
            </Button>
            <div className="flex h-full min-h-0 items-center justify-center overflow-hidden">
              {image ? (
                <img
                  src={image.url}
                  alt={`${image.label} 확대`}
                  className="h-full w-full object-contain"
                  onClick={e =>
                    move(
                      e.clientX <
                        e.currentTarget.getBoundingClientRect().left +
                          e.currentTarget.getBoundingClientRect().width / 2
                        ? -1
                        : 1
                    )
                  }
                  onError={() => {
                    const key = `modal:${image.id}`;
                    if (!retried.current.has(key)) {
                      retried.current.add(key);
                      void show(image.id);
                    } else {
                      setImage(null);
                      setError("이미지를 열지 못했습니다. 다시 시도해 주세요.");
                    }
                  }}
                />
              ) : (
                <p role="status" className="text-sm text-muted-foreground">
                  {error
                    ? "이미지 확인이 필요합니다."
                    : "원본 이미지를 불러오는 중…"}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              className="h-full w-full px-0"
              aria-label="다음 이미지"
              disabled={index < 0 || index >= images.length - 1}
              onClick={() => move(1)}
            >
              <span className="flex size-9 items-center justify-center rounded-full border bg-background">
                <ChevronRight aria-hidden="true" />
              </span>
            </Button>
          </div>
          {error && (
            <div
              role="alert"
              className="flex shrink-0 items-center gap-2 text-sm text-destructive"
            >
              {error}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (active) void show(active);
                }}
              >
                다시 시도
              </Button>
            </div>
          )}
          <DialogFooter className="shrink-0">
            <Button
              disabled={!image || saving || !canSave}
              title={canSave ? undefined : "이미지 저장 권한이 없습니다."}
              onClick={() => void save()}
            >
              {saving ? "저장 중…" : "저장하기"}
            </Button>
            <Button variant="outline" onClick={close}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
