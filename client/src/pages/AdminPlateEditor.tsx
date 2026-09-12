import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FilamentMapping, WorkflowOrder } from "@/lib/adminContracts";
import type {
  PlateConfig,
  PrintBatch,
  PrintStaff,
} from "@/lib/printBatchContracts";

export function AdminPlateEditor({
  batch,
  candidates,
  workers,
  pending,
  onSave,
  onCancel,
}: {
  batch: PrintBatch | null;
  candidates: WorkflowOrder[];
  workers: PrintStaff;
  pending: boolean;
  onSave: (value: PlateConfig) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(
    batch?.orders.map(o => o.orderNumber) ?? []
  );
  const [printer, setPrinter] = useState(batch?.printerName ?? "");
  const [worker, setWorker] = useState<number | null>(
    batch?.printingAssigneeId ?? workers.defaultPrinting
  );
  const [slotLabels, setSlotLabels] = useState<Record<number, string>>(() =>
    Object.fromEntries(batch?.slots.map(s => [s.filamentId, s.slotLabel]) ?? [])
  );
  const [query, setQuery] = useState("");
  const all = [
    ...(batch?.orders ?? []),
    ...candidates.filter(
      c => !batch?.orders.some(o => o.orderNumber === c.orderNumber)
    ),
  ];
  const included = all.filter(o => selected.includes(o.orderNumber));
  const used = new Map<number, FilamentMapping>();
  for (const order of included)
    for (const mapping of order.filamentMappings ?? [])
      if (mapping.completedAt) used.set(mapping.filamentId, mapping);
  const labels = Array.from(used.keys())
    .map(id =>
      (slotLabels[id] ?? "")
        .normalize("NFKC")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase()
    )
    .filter(Boolean);
  const valid =
    included.length > 0 &&
    included.length <= 50 &&
    used.size <= 64 &&
    new Set(labels).size === labels.length;
  return (
    <form
      className="space-y-4 rounded-lg border bg-background p-4"
      aria-label="플레이트 구성"
      onSubmit={e => {
        e.preventDefault();
        if (!valid) return;
        onSave({
          printerName: printer.trim(),
          printingAssigneeId: worker,
          orders: included.map(o => ({
            orderNumber: o.orderNumber,
            version: o.version,
          })),
          slots: Array.from(used.keys())
            .filter(id => slotLabels[id]?.trim())
            .map(id => ({ filamentId: id, slotLabel: slotLabels[id].trim() })),
        });
      }}
    >
      <h2 className="font-semibold">
        {batch ? `PB-${batch.id} 구성 수정` : "새 플레이트 구성"}
      </h2>
      <p className="text-sm text-muted-foreground">
        한 번에 출력할 주문을 선택하세요. 같은 재질·마감과 필라멘트 조합인지
        확인하고 묶습니다.
      </p>
      {batch?.artifacts.some(a => a.currentLayout) && (
        <p className="text-sm text-amber-900">
          주문·프린터·슬롯을 바꾸면 현재 출력 파일을 다시 등록해야 합니다.
        </p>
      )}
      <Input
        aria-label="플레이트 후보 검색"
        placeholder="주문번호 또는 반려동물 이름"
        value={query}
        onChange={e => setQuery(e.target.value)}
        disabled={pending}
      />
      <fieldset
        disabled={pending}
        className="max-h-80 space-y-2 overflow-y-auto"
      >
        <legend className="mb-2 text-sm font-medium">
          포함 주문 ({selected.length}/50)
        </legend>
        {all
          .filter(o =>
            `${o.orderNumber} ${o.petName}`
              .toLowerCase()
              .includes(query.toLowerCase())
          )
          .map(o => (
            <label
              key={o.orderNumber}
              className="flex items-start gap-2 rounded border p-3 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(o.orderNumber)}
                onChange={e =>
                  setSelected(old =>
                    e.target.checked
                      ? [...old, o.orderNumber]
                      : old.filter(n => n !== o.orderNumber)
                  )
                }
              />
              <span className="min-w-0 break-words">
                {o.orderNumber} · {o.petName}
                <span className="mt-1 block text-xs text-muted-foreground">
                  {o.filamentMappings
                    ?.filter(m => m.completedAt)
                    .map(
                      m =>
                        `${m.partName}: ${m.spoolId} ${m.colorName} ${m.material} ${m.finish}`
                    )
                    .join(" / ")}
                </span>
              </span>
            </label>
          ))}
        {all.length === 0 && (
          <p className="text-sm">배정된 플레이트 준비 주문이 없습니다.</p>
        )}
      </fieldset>
      <label className="block text-sm">
        프린터 이름
        <Input
          value={printer}
          maxLength={80}
          disabled={pending}
          placeholder="실제 사용할 프린터"
          onChange={e => setPrinter(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        출력 담당자
        <select
          aria-label="출력 담당자"
          className="mt-1 block w-full rounded border bg-background p-2"
          disabled={pending}
          value={worker ?? ""}
          onChange={e =>
            setWorker(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">확정 전에 담당자를 선택하세요</option>
          {worker != null && !workers.staff.some(w => w.id === worker) && (
            <option value={worker} disabled>
              기존 담당자를 사용할 수 없습니다
            </option>
          )}
          {workers.staff.map(w => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </label>
      <div className="space-y-2">
        <h3 className="text-sm font-medium">실제 필라멘트 슬롯</h3>
        {Array.from(used.values()).map(f => (
          <label
            className="block rounded border p-3 text-sm"
            key={f.filamentId}
          >
            {f.spoolId} · {f.colorName} · {f.material} · {f.finish}
            <Input
              aria-label={`${f.spoolId} 슬롯`}
              value={slotLabels[f.filamentId] ?? ""}
              maxLength={30}
              placeholder="예: AMS 1, 외부 스풀"
              disabled={pending}
              onChange={e =>
                setSlotLabels(old => ({
                  ...old,
                  [f.filamentId]: e.target.value,
                }))
              }
            />
          </label>
        ))}
      </div>
      {labels.length !== new Set(labels).size && (
        <p className="text-sm text-destructive">슬롯 이름이 중복됐습니다.</p>
      )}
      <p className="text-xs text-muted-foreground">
        임시 저장 후 3MF 또는 G-code 파일을 등록하고, 주문 배치와 슬롯을 확인해
        확정합니다.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || !valid}>
          구성 저장
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onCancel}
        >
          편집 닫기
        </Button>
      </div>
    </form>
  );
}
