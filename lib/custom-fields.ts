/**
 * Project-defined custom fields on issues (#custom-fields). A project's admins
 * define the fields (name, type, options); each issue stores a value per field.
 * Values are stored as strings and parsed per type so the schema stays simple.
 */

export const CUSTOM_FIELD_TYPES = ["text", "number", "select", "date", "checkbox"] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Text",
  number: "Number",
  select: "Select",
  date: "Date",
  checkbox: "Checkbox",
};

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: CustomFieldType;
  options: string[];
  required: boolean;
  position: number;
  archivedAt: string | null;
}

export interface CustomFieldValue {
  fieldId: string;
  value: string;
}

export function isCustomFieldType(value: unknown): value is CustomFieldType {
  return typeof value === "string" && (CUSTOM_FIELD_TYPES as readonly string[]).includes(value);
}

/** Validate a field definition coming from the admin form. */
export function validateCustomFieldDefinition(input: {
  name: unknown;
  type: unknown;
  options: unknown;
  required: unknown;
}): { ok: true; name: string; type: CustomFieldType; options: string[]; required: boolean } | { ok: false; error: string } {
  if (typeof input.name !== "string" || input.name.trim().length < 1 || input.name.trim().length > 60) {
    return { ok: false, error: "Field name must be 1 to 60 characters." };
  }
  if (!isCustomFieldType(input.type)) {
    return { ok: false, error: "Choose a valid field type." };
  }
  const required = input.required === true || input.required === "true" || input.required === "on";
  let options: string[] = [];
  if (input.type === "select") {
    if (!Array.isArray(input.options)) return { ok: false, error: "Select fields need at least one option." };
    options = input.options.map((o) => String(o).trim()).filter(Boolean);
    if (options.length < 1 || options.length > 50) {
      return { ok: false, error: "Select fields need 1 to 50 options." };
    }
    if (new Set(options).size !== options.length) {
      return { ok: false, error: "Select options must be unique." };
    }
  }
  return { ok: true, name: input.name.trim(), type: input.type, options, required };
}

/** Validate and normalise a value for a field. Returns the stored string. */
export function validateCustomFieldValue(
  field: { type: CustomFieldType; options: string[]; required: boolean },
  raw: unknown,
): { ok: true; value: string } | { ok: false; error: string } {
  const text = raw === null || raw === undefined ? "" : String(raw).trim();
  if (field.required && text === "") {
    return { ok: false, error: "This field is required." };
  }
  if (text === "") return { ok: true, value: "" };
  switch (field.type) {
    case "text":
      if (text.length > 500) return { ok: false, error: "Keep text under 500 characters." };
      return { ok: true, value: text };
    case "number": {
      if (!/^-?\d+(\.\d+)?$/.test(text)) return { ok: false, error: "Enter a valid number." };
      return { ok: true, value: text };
    }
    case "select":
      if (!field.options.includes(text)) return { ok: false, error: "Choose one of the listed options." };
      return { ok: true, value: text };
    case "date":
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return { ok: false, error: "Use YYYY-MM-DD." };
      return { ok: true, value: text };
    case "checkbox":
      return { ok: true, value: text === "true" || text === "on" || text === "1" ? "true" : "false" };
  }
}

/** Human-readable value for display. */
export function formatCustomFieldValue(field: { type: CustomFieldType }, value: string): string {
  if (value === "") return "—";
  if (field.type === "checkbox") return value === "true" ? "Yes" : "No";
  return value;
}
