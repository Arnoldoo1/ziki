"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { setIssueCustomFieldsAction } from "@/app/actions/custom-fields";
import { CUSTOM_FIELD_TYPE_LABELS, formatCustomFieldValue, type CustomFieldType } from "@/lib/custom-fields";

export type CustomFieldPanelField = {
  id: string;
  name: string;
  type: string;
  options: string[];
  required: boolean;
  value: string;
};

type Props = {
  bugId: string;
  canEdit: boolean;
  fields: CustomFieldPanelField[];
};

export function CustomFieldsPanel({ bugId, canEdit, fields }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of fields) initial[field.id] = field.value;
    return initial;
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (fields.length === 0) return null;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await setIssueCustomFieldsAction(bugId, values);
      if (result.error) { setError(result.error); return; }
      router.refresh();
    });
  };

  const update = (id: string, value: string) => setValues((prev) => ({ ...prev, [id]: value }));

  return (
    <section aria-label="Custom fields" data-testid="custom-fields-panel" className="rounded-[20px] border border-zk-border bg-zk-surface px-4 py-3.5">
      <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-zk-muted">Custom fields</h2>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-3">
        {fields.map((field) => {
          const typeLabel = CUSTOM_FIELD_TYPE_LABELS[field.type as keyof typeof CUSTOM_FIELD_TYPE_LABELS] ?? field.type;
          return (
            <div key={field.id} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zk-muted">
                {field.name}
                {field.required ? " *" : ""}
                <span className="ml-1 text-[10px] uppercase tracking-wide text-zk-muted/70">{typeLabel}</span>
              </label>
              {field.type === "text" ? (
                <input
                  value={values[field.id] ?? ""}
                  onChange={(event) => update(field.id, event.target.value)}
                  disabled={!canEdit}
                  maxLength={500}
                  className="rounded-lg border border-zk-border bg-zk-bg px-3 py-2 text-sm text-zk-text disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-zk-accent"
                />
              ) : null}
              {field.type === "number" ? (
                <input
                  type="text"
                  inputMode="decimal"
                  value={values[field.id] ?? ""}
                  onChange={(event) => update(field.id, event.target.value)}
                  disabled={!canEdit}
                  className="rounded-lg border border-zk-border bg-zk-bg px-3 py-2 text-sm text-zk-text disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-zk-accent"
                />
              ) : null}
              {field.type === "select" ? (
                <select
                  value={values[field.id] ?? ""}
                  onChange={(event) => update(field.id, event.target.value)}
                  disabled={!canEdit}
                  className="rounded-lg border border-zk-border bg-zk-bg px-3 py-2 text-sm text-zk-text disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-zk-accent"
                >
                  <option value="">—</option>
                  {field.options.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : null}
              {field.type === "date" ? (
                <input
                  type="date"
                  value={values[field.id] ?? ""}
                  onChange={(event) => update(field.id, event.target.value)}
                  disabled={!canEdit}
                  className="rounded-lg border border-zk-border bg-zk-bg px-3 py-2 text-sm text-zk-text disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-zk-accent"
                />
              ) : null}
              {field.type === "checkbox" ? (
                <label className="flex items-center gap-2 text-sm text-zk-text">
                  <input
                    type="checkbox"
                    checked={values[field.id] === "true"}
                    onChange={(event) => update(field.id, event.target.checked ? "true" : "false")}
                    disabled={!canEdit}
                  />
                  {formatCustomFieldValue({ type: "checkbox" }, values[field.id] ?? "")}
                </label>
              ) : null}
              {!canEdit ? (
                <span className="text-xs text-zk-muted">Value: {formatCustomFieldValue({ type: field.type as CustomFieldType }, field.value)}</span>
              ) : null}
            </div>
          );
        })}
        {canEdit ? (
          <button type="submit" disabled={pending} className="self-start rounded-lg border border-zk-border px-3 py-2 text-sm font-semibold text-zk-text disabled:opacity-50">
            {pending ? "Saving…" : "Save fields"}
          </button>
        ) : null}
        {error ? <p role="alert" className="m-0 text-sm text-zk-bad-fg">{error}</p> : null}
      </form>
    </section>
  );
}
