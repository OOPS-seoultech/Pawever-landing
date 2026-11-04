import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { formatKrw } from "@/lib/adminFormat";
import type { WorkflowOrder } from "@/lib/adminContracts";

export function AdminSalePrice({
  row,
  editable,
  pending,
  onSave,
}: {
  row: WorkflowOrder;
  editable: boolean;
  pending: boolean;
  onSave: (custom: boolean, price: number) => void;
}) {
  const [custom, setCustom] = useState(Boolean(row.salePriceCustom));
  const [value, setValue] = useState(String(row.salePriceKrw ?? 18900));
  const price = custom ? Number(value) : 18900;
  const valid =
    (!custom || value.trim() !== "") &&
    Number.isSafeInteger(price) &&
    price >= 0 &&
    price <= 100000000;
  const changed =
    custom !== Boolean(row.salePriceCustom) ||
    (custom && price !== row.salePriceKrw);
  return (
    <section
      aria-label="주문 판매가"
      className="flex flex-col gap-3 rounded border p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">판매가</h3>
        <p>{formatKrw(row.salePriceKrw)}</p>
      </div>
      {editable && (
        <FieldGroup className="gap-3">
          <Field orientation="horizontal">
            <FieldLabel htmlFor="custom-sale-price">직접 입력</FieldLabel>
            <Switch
              id="custom-sale-price"
              checked={custom}
              onCheckedChange={setCustom}
              disabled={pending}
            />
          </Field>
          <Field data-invalid={!valid}>
            <FieldLabel htmlFor="sale-price-value">
              {custom ? "주문 판매가 (원)" : "기본 판매가 (원)"}
            </FieldLabel>
            <Input
              id="sale-price-value"
              type="number"
              inputMode="numeric"
              min={0}
              max={100000000}
              step={1}
              value={custom ? value : "18900"}
              disabled={pending || !custom}
              onChange={event => setValue(event.target.value)}
              aria-invalid={!valid}
            />
            <FieldDescription>
              배송비 제외 · 고객 청구액과 입금 기록은 바뀌지 않습니다.
            </FieldDescription>
          </Field>
          {!valid && (
            <p role="alert" className="text-sm text-destructive">
              0~100,000,000원 사이의 정수를 입력해 주세요.
            </p>
          )}
          <Button
            className="self-start"
            disabled={pending || !valid || !changed}
            onClick={() => onSave(custom, price)}
          >
            판매가 저장
          </Button>
        </FieldGroup>
      )}
    </section>
  );
}
