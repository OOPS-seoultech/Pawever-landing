import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getFilaments,
  type Filament,
  type FilamentSelection,
  type WorkflowOrder,
} from "@/lib/adminContracts";

export function AdminFilamentMapping({
  row,
  pending,
  onSave,
}: {
  row: WorkflowOrder;
  pending: boolean;
  onSave: (mappings: FilamentSelection[], complete: boolean) => void;
}) {
  const editable = row.allowedActions.includes("MAP_FILAMENT");
  const records = row.filamentMappings ?? [];
  const [entries, setEntries] = useState<FilamentSelection[]>(() => {
    const saved = records.filter(
      m => m.taskId === row.taskId && !m.completedAt
    );
    return saved.length
      ? saved.map(m => ({ partName: m.partName, filamentId: m.filamentId }))
      : [{ partName: "", filamentId: 0 }];
  });
  const [catalog, setCatalog] = useState<Filament[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(editable);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!editable) return;
    let live = true;
    setLoading(true);
    setError("");
    getFilaments()
      .then(items => {
        if (live) setCatalog(items);
      })
      .catch(e => {
        if (live)
          setError(
            e instanceof Error
              ? e.message
              : "필라멘트 목록을 불러오지 못했습니다."
          );
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [editable, reload]);
  const normalize = (part: string) =>
    part.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  const valid =
    !loading &&
    !error &&
    entries.length > 0 &&
    entries.every(
      e =>
        normalize(e.partName) &&
        catalog.some(f => f.id === e.filamentId && f.active)
    ) &&
    new Set(entries.map(e => normalize(e.partName))).size === entries.length;
  const change = (index: number, value: Partial<FilamentSelection>) =>
    setEntries(old =>
      old.map((e, i) => (i === index ? { ...e, ...value } : e))
    );
  if (!editable && !records.length) return null;
  return (
    <section className="space-y-3 border-t pt-4" aria-label="부위별 필라멘트">
      <h3 className="font-medium">부위별 필라멘트</h3>
      {editable ? (
        <>
          <p className="text-sm text-muted-foreground">
            색상을 나눠 출력할 모든 부위의 이름을 입력하고, 사용할 실제 스풀을
            선택하세요.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <a
              href="/admin/filaments"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              필라멘트 목록 열기
            </a>
            <Button
              size="sm"
              variant="outline"
              disabled={pending || loading}
              onClick={() => setReload(n => n + 1)}
            >
              필라멘트 새로고침
            </Button>
          </div>
          {loading && <p className="text-sm">필라멘트를 불러오는 중...</p>}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {!loading && !error && !catalog.some(f => f.active) && (
            <p className="text-sm">
              사용 가능한 필라멘트가 없습니다. 관리자에게 실제 스풀 등록을
              요청하세요.
            </p>
          )}
          {entries.map((entry, index) => (
            <div key={index} className="space-y-2 rounded border p-3">
              <label className="block text-sm">
                부위 {index + 1}
                <Input
                  maxLength={60}
                  placeholder="예: 몸통, 귀, 코"
                  disabled={pending}
                  value={entry.partName}
                  onChange={e => change(index, { partName: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                필라멘트 {index + 1}
                <select
                  className="mt-1 block w-full min-w-0 rounded border bg-background p-2"
                  value={entry.filamentId || ""}
                  disabled={pending || loading}
                  onChange={e =>
                    change(index, { filamentId: Number(e.target.value) })
                  }
                >
                  <option value="">실제 스풀 선택</option>
                  {entry.filamentId !== 0 &&
                    !catalog.some(
                      f => f.id === entry.filamentId && f.active
                    ) && (
                      <option value={entry.filamentId} disabled>
                        기존 스풀을 사용할 수 없습니다. 다시 선택하세요.
                      </option>
                    )}
                  {catalog
                    .filter(f => f.active)
                    .map(f => (
                      <option key={f.id} value={f.id}>
                        {f.spoolId} · {f.colorName} · {f.material} · {f.finish}{" "}
                        · {f.remainingGrams}g
                      </option>
                    ))}
                </select>
              </label>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`부위 ${index + 1} 삭제`}
                disabled={pending || entries.length === 1}
                onClick={() =>
                  setEntries(old => old.filter((_, i) => i !== index))
                }
              >
                삭제
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            disabled={pending || entries.length >= 64}
            onClick={() =>
              setEntries(old => [...old, { partName: "", filamentId: 0 }])
            }
          >
            부위 추가
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={pending || !valid}
              onClick={() => onSave(entries, false)}
            >
              색상 지정 저장
            </Button>
            <Button
              disabled={pending || !valid}
              onClick={() => onSave(entries, true)}
            >
              색상 지정 완료
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            완료하면 선택한 내용을 확정하고 플레이트 준비로 넘어갑니다.
          </p>
        </>
      ) : (
        <ul className="space-y-2 text-sm">
          {records.map((m, i) => (
            <li key={m.id ?? i} className="break-words rounded bg-muted p-3">
              <span className="font-medium">{m.partName}</span> → {m.spoolId} ·{" "}
              {m.colorName} · {m.material} · {m.finish}
              <span className="ml-2 text-xs text-muted-foreground">
                {m.completedAt ? "지정 완료" : "저장됨"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
