"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { createCustomFieldAction, archiveCustomFieldAction } from "@/app/actions/custom-fields";
import { CUSTOM_FIELD_TYPES, CUSTOM_FIELD_TYPE_LABELS } from "@/lib/custom-fields";

export type CustomFieldManagerView = {
  id: string;
  name: string;
  type: string;
  options: string[];
  required: boolean;
  archivedAt: string | null;
};

type Props = {
  projectId: string;
  fields: CustomFieldManagerView[];
};

export function CustomFieldsManager({ projectId, fields }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("text");
  const [options, setOptions] = useState("");
  const [required, setRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const active = fields.filter((field) => !field.archivedAt);
  const archived = fields.filter((field) => field.archivedAt);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const optionList = options.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    startTransition(async () => {
      const result = await createCustomFieldAction(projectId, {
        name,
        type,
        options: optionList,
        required,
      });
      if (result.error) { setError(result.error); return; }
      setName("");
      setOptions("");
      setRequired(false);
      setType("text");
      router.refresh();
    });
  };

  const archive = (fieldId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await archiveCustomFieldAction(fieldId);
      if (result.error) { setError(result.error); return; }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submit} className="flex flex-col gap-3 rounded-[14px] border border-zk-border bg-zk-bg p-4">
        <div className="flex flex-wrap gap-3">
          <label className="min-w-[12rem] flex-1 text-xs font-medium text-zk-muted">
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              placeholder="Severity"
              className="mt-1 block w-full rounded-lg border border-zk-border bg-zk-surface px-3 py-2 text-sm text-zk-text placeholder:text-zk-muted focus:outline-none focus:ring-2 focus:ring-zk-accent"
            />
          </label>
          <label className="w-40 text-xs font-medium text-zk-muted">
            Type
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-zk-border bg-zk-surface px-3 py-2 text-sm text-zk-text focus:outline-none focus:ring-2 focus:ring-zk-accent"
            >
              {CUSTOM_FIELD_TYPES.map((t) => (
                <option key={t} value={t}>{CUSTOM_FIELD_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-xs font-medium text-zk-muted">
            <input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} />
            Required
          </label>
        </div>
        {type === "select" ? (
          <label className="text-xs font-medium text-zk-muted">
            Options (one per line)
            <textarea
              value={options}
              onChange={(event) => setOptions(event.target.value)}
              rows={4}
              placeholder={"Low\nMedium\nHigh"}
              className="mt-1 block w-full rounded-lg border border-zk-border bg-zk-surface px-3 py-2 text-sm text-zk-text placeholder:text-zk-muted focus:outline-none focus:ring-2 focus:ring-zk-accent"
            />
          </label>
        ) : null}
        <button type="submit" disabled={pending || !name.trim()} className="self-start rounded-lg border border-zk-border px-3 py-2 text-sm font-semibold text-zk-text disabled:opacity-50">
          {pending ? "Adding…" : "Add field"}
        </button>
      </form>

      {error ? <p role="alert" className="m-0 text-sm text-zk-bad-fg">{error}</p> : null}

      {active.length ? (
        <ul className="flex flex-col gap-2">
          {active.map((field) => (
            <li key={field.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-zk-border bg-zk-bg px-3 py-2 text-sm">
              <div className="flex flex-col">
                <span className="font-semibold text-zk-text">{field.name}</span>
                <span className="text-xs text-zk-muted">
                  {CUSTOM_FIELD_TYPE_LABELS[field.type as (typeof CUSTOM_FIELD_TYPES)[number]] ?? field.type}
                  {field.required ? " · required" : ""}
                  {field.type === "select" ? ` · ${field.options.join(", ")}` : ""}
                </span>
              </div>
              <button type="button" disabled={pending} onClick={() => archive(field.id)} className="text-xs text-zk-muted underline hover:text-zk-text disabled:opacity-50">
                Archive
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-sm text-zk-muted">No custom fields yet.</p>
      )}

      {archived.length ? (
        <details className="text-sm text-zk-muted">
          <summary className="cursor-pointer font-semibold">Archived ({archived.length})</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {archived.map((field) => (
              <li key={field.id} className="text-xs">{field.name}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
