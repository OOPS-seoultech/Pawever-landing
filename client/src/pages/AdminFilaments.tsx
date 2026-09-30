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
  remainingGrams: null,
  active: true,
};

const colorCategories = {
  WHITE: "흰색",
  BLACK: "검정",
  GRAY: "회색",
  BROWN: "갈색",
  BEIGE: "베이지",
  RED: "빨강",
  YELLOW: "노랑",
  GREEN: "초록",
  BLUE: "파랑",
  OTHER: "기타",
};
const materials = ["PLA", "PETG", "ABS", "ASA", "TPU", "모름"];
const finishes = ["일반", "무광", "실크", "투명", "모름"];

function ChoiceField({
  name,
  label,
  options,
  initial,
  disabled,
}: {
  name: string;
  label: string;
  options: string[];
  initial: string;
  disabled: boolean;
}) {
  const [choice, setChoice] = useState(
    options.includes(initial) ? initial : initial ? "custom" : ""
  );
  return (
    <div className="space-y-2">
      <label className="block text-sm">
        {label} (필수)
        <select
          className="mt-1 h-10 w-full rounded-md border bg-background px-3"
          name={choice === "custom" ? undefined : name}
          value={choice}
          required
          disabled={disabled}
          onChange={e => setChoice(e.target.value)}
        >
          <option value="" disabled>
            선택하세요
          </option>
          {options.map(option => (
            <option key={option}>{option}</option>
          ))}
          <option value="custom">기타 직접 입력</option>
        </select>
      </label>
      {choice === "custom" && (
        <Input
          aria-label={`${label} 직접 입력`}
          name={name}
          defaultValue={options.includes(initial) ? "" : initial}
          maxLength={40}
          required
          disabled={disabled}
        />
      )}
    </div>
  );
}

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
      colorCategory: value("colorCategory") || null,
      material: value("material"),
      finish: value("finish"),
      manufacturer: value("manufacturer"),
      source: value("source"),
      priceKrw: value("priceKrw") ? Number(value("priceKrw")) : null,
      remainingGrams:
        value("remainingGrams") === "" ? null : Number(value("remainingGrams")),
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
      setNotice(
        `필라멘트 ${saved.spoolId}을 저장했습니다. 실물 스풀에도 이 번호를 표시해 주세요.`
      );
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
    ["manufacturer", "제조사", 100, false],
    ["source", "구입처", 300, false],
  ] as const;
  const visible = rows.filter(f =>
    `${f.spoolId} ${f.colorName} ${colorCategories[f.colorCategory as keyof typeof colorCategories] ?? ""} ${f.material} ${f.finish} ${f.manufacturer}`
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
            필라멘트 한 롤(스풀)씩 등록하세요. 관리번호는 저장 시 자동
            발급됩니다. 같은 색상이라도 다른 롤이면 별도로 등록합니다.
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
              <p className="text-sm text-muted-foreground">
                {editing.id
                  ? `관리번호: ${editing.spoolId} · 등록 후 변경할 수 없습니다.`
                  : "관리번호는 자동 발급됩니다. 기존 관리번호가 있으면 추가 정보에서 입력하세요."}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  색상 분류 (선택)
                  <select
                    name="colorCategory"
                    defaultValue={editing.colorCategory ?? ""}
                    disabled={pending}
                    className="mt-1 h-10 w-full rounded-md border bg-background px-3"
                  >
                    <option value="">미분류</option>
                    {Object.entries(colorCategories).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  제품 색상명 (필수)
                  <Input
                    name="colorName"
                    defaultValue={editing.colorName}
                    placeholder="예: 아이보리 화이트"
                    maxLength={80}
                    required
                    disabled={pending}
                  />
                </label>
                <ChoiceField
                  name="material"
                  label="재질"
                  options={materials}
                  initial={editing.material}
                  disabled={pending}
                />
                <ChoiceField
                  name="finish"
                  label="마감"
                  options={finishes}
                  initial={editing.finish}
                  disabled={pending}
                />
                <label className="text-sm">
                  잔량(g)
                  <Input
                    name="remainingGrams"
                    type="number"
                    min={0}
                    max={1000000}
                    step={1}
                    placeholder="미측정이면 비워 두세요"
                    defaultValue={editing.remainingGrams ?? ""}
                    disabled={pending}
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                잔량은 빈 스풀 무게를 제외한 재료 무게입니다. 빈칸은 미측정,
                0g은 소진을 뜻합니다.
              </p>
              <details className="rounded-md border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  추가 정보 (선택) · 제조사, 구매 정보, 기존 관리번호
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {!editing.id && (
                    <label className="text-sm">
                      기존 관리번호
                      <Input
                        name="spoolId"
                        maxLength={64}
                        placeholder="비워 두면 자동 발급"
                        pattern="[A-Za-z0-9][A-Za-z0-9._\-]{0,63}"
                        disabled={pending}
                      />
                    </label>
                  )}
                  {fields.map(([name, label, max]) => (
                    <label className="text-sm" key={name}>
                      {label}
                      <Input
                        name={name}
                        defaultValue={editing[name]}
                        maxLength={max}
                        disabled={pending}
                        list={
                          name === "manufacturer"
                            ? "filament-manufacturers"
                            : undefined
                        }
                      />
                    </label>
                  ))}
                  <datalist id="filament-manufacturers">
                    {Array.from(
                      new Set(rows.map(row => row.manufacturer).filter(Boolean))
                    ).map(name => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
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
                <p className="mt-2 text-xs text-muted-foreground">
                  기존 관리번호에는 영문·숫자·점·밑줄·하이픈을 사용할 수
                  있습니다.
                </p>
              </details>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={editing.active}
                  disabled={pending}
                />
                신규 제작에 선택 가능
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
                    {f.remainingGrams == null
                      ? "잔량 미측정"
                      : `잔량 ${f.remainingGrams.toLocaleString()}g`}
                    {f.priceKrw != null ? ` · ${formatKrw(f.priceKrw)}` : ""}
                  </p>
                  {f.remainingGrams === 0 && f.active && (
                    <p className="text-sm text-amber-800">
                      잔량이 0g입니다. 사용 가능 여부를 확인해 주세요.
                    </p>
                  )}
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
