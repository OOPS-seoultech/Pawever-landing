import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useLocation } from "wouter";
import { AdminShell, useAdminGuard } from "@/components/AdminShell";
import { useStaffSession } from "@/components/AdminSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminApiError } from "@/lib/adminApi";
import {
  getFilaments,
  workflowCommand,
  type Filament,
} from "@/lib/adminContracts";
import { formatKrw } from "@/lib/adminFormat";

const empty: Filament = {
  id: 0,
  spoolId: "",
  version: 0,
  colorName: "",
  material: "",
  finish: "",
  manufacturer: "",
  source: "",
  priceKrw: null,
  remainingGrams: 0,
  active: true,
};

export default function AdminFilaments() {
  const role = useAdminGuard();
  const { staff } = useStaffSession();
  const [, navigate] = useLocation();
  const view = !!staff?.permissions.includes("VIEW_FILAMENT");
  const manage = !!staff?.permissions.includes("MANAGE_FILAMENT");
  const [rows, setRows] = useState<Filament[]>([]);
  const [editing, setEditing] = useState<Filament | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const busy = useRef(false);
  const keys = useRef(new Map<string, string>());
  const fail = useCallback(
    (e: unknown) => {
      setError(
        e instanceof Error ? e.message : "필라멘트 정보를 불러오지 못했습니다."
      );
      if (e instanceof AdminApiError && e.needsSignIn)
        navigate("/admin", { replace: true });
    },
    [navigate]
  );
  const load = useCallback(async () => {
    if (!view) return;
    setLoading(true);
    try {
      setRows(await getFilaments());
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }, [view, fail]);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing || busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "").trim();
    const body = {
      spoolId: editing.id ? editing.spoolId : value("spoolId"),
      colorName: value("colorName"),
      material: value("material"),
      finish: value("finish"),
      manufacturer: value("manufacturer"),
      source: value("source"),
      priceKrw: value("priceKrw") ? Number(value("priceKrw")) : null,
      remainingGrams: Number(value("remainingGrams")),
      active: data.has("active"),
      version: editing.version,
    };
    const path = "/api/admin/filaments" + (editing.id ? `/${editing.id}` : "");
    const fingerprint = path + JSON.stringify(body);
    const key = keys.current.get(fingerprint) ?? crypto.randomUUID();
    keys.current.set(fingerprint, key);
    try {
      const saved = await workflowCommand<Filament>(path, body, key);
      keys.current.delete(fingerprint);
      setRows(current =>
        [...current.filter(f => f.id !== saved.id), saved].sort((a, b) =>
          a.spoolId.localeCompare(b.spoolId)
        )
      );
      setEditing(null);
      setNotice("필라멘트를 저장했습니다.");
    } catch (e) {
      fail(e);
      if (e instanceof AdminApiError && e.status >= 400 && e.status < 500)
        keys.current.delete(fingerprint);
      if (e instanceof AdminApiError && e.status === 409 && editing.id) {
        setEditing(null);
        await load();
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const fields = [
    ["spoolId", "실제 스풀 ID", 64, true],
    ["colorName", "색상명", 80, true],
    ["material", "재질", 40, true],
    ["finish", "마감", 40, true],
    ["manufacturer", "제조사", 100, false],
    ["source", "구입처", 300, false],
  ] as const;
  const visible = rows.filter(f =>
    `${f.spoolId} ${f.colorName} ${f.material} ${f.finish} ${f.manufacturer}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );
  return (
    <AdminShell title="필라멘트" role={role}>
      {!view ? (
        <p>{staff ? "필라멘트 조회 권한이 없습니다." : "계정 확인 중..."}</p>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            실물 스풀마다 고유 ID를 등록하세요. 같은 색상이라도 다른 스풀이면
            별도로 등록합니다.
          </p>
          <div className="flex flex-wrap gap-2">
            <Input
              className="sm:max-w-sm"
              aria-label="필라멘트 검색"
              placeholder="스풀 ID, 색상, 재질 검색"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <Button
              variant="outline"
              disabled={pending || loading}
              onClick={() => {
                setError("");
                void load();
              }}
            >
              목록 새로고침
            </Button>
            {manage && (
              <Button
                disabled={pending}
                onClick={() => {
                  setEditing({ ...empty });
                  setNotice("");
                }}
              >
                필라멘트 등록
              </Button>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm text-emerald-800">
              {notice}
            </p>
          )}
          {manage && editing && (
            <form
              key={`${editing.id}:${editing.version}`}
              onSubmit={save}
              className="space-y-4 rounded-lg border bg-background p-4"
              aria-label="필라멘트 편집"
            >
              <h2 className="font-semibold">
                {editing.id ? "필라멘트 수정" : "새 필라멘트"}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map(([name, label, max, required]) => (
                  <label className="text-sm" key={name}>
                    {label}
                    <Input
                      name={name}
                      defaultValue={editing[name]}
                      maxLength={max}
                      required={required}
                      disabled={pending || (name === "spoolId" && !!editing.id)}
                      pattern={
                        name === "spoolId"
                          ? "[A-Za-z0-9][A-Za-z0-9._\\-]{0,63}"
                          : undefined
                      }
                    />
                  </label>
                ))}
                <label className="text-sm">
                  잔량(g)
                  <Input
                    name="remainingGrams"
                    type="number"
                    min={0}
                    max={1000000}
                    step={1}
                    required
                    defaultValue={editing.remainingGrams}
                    disabled={pending}
                  />
                </label>
                <label className="text-sm">
                  구입 가격(원)
                  <Input
                    name="priceKrw"
                    type="number"
                    min={0}
                    max={100000000}
                    step={1}
                    defaultValue={editing.priceKrw ?? ""}
                    disabled={pending}
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                ID는 영문·숫자·점·밑줄·하이픈을 사용할 수 있습니다. 등록 후 ID는
                유지됩니다.
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={editing.active}
                  disabled={pending}
                />
                사용 가능
              </label>
              <div className="flex gap-2">
                <Button type="submit" disabled={pending}>
                  저장
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setEditing(null)}
                >
                  취소
                </Button>
              </div>
            </form>
          )}
          {loading ? (
            <p>불러오는 중...</p>
          ) : rows.length === 0 ? (
            <p>등록된 필라멘트가 없습니다.</p>
          ) : visible.length === 0 ? (
            <p>검색 결과가 없습니다.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {visible.map(f => (
                <article
                  key={f.id}
                  className="min-w-0 space-y-2 rounded-lg border bg-background p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="break-all font-semibold">{f.spoolId}</h2>
                    <span className="text-xs text-muted-foreground">
                      {f.active ? "사용 가능" : "사용 중지"}
                    </span>
                  </div>
                  <p className="break-words">
                    {f.colorName} · {f.material} · {f.finish}
                  </p>
                  <p className="text-sm">
                    잔량 {f.remainingGrams.toLocaleString()}g
                    {f.priceKrw != null ? ` · ${formatKrw(f.priceKrw)}` : ""}
                  </p>
                  {(f.manufacturer || f.source) && (
                    <p className="break-words text-sm text-muted-foreground">
                      {[f.manufacturer, f.source].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {manage && (
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`${f.spoolId} 수정`}
                      disabled={pending}
                      onClick={() => {
                        setEditing(f);
                        setNotice("");
                      }}
                    >
                      수정
                    </Button>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}
