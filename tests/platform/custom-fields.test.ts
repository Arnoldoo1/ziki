import { describe, expect, it } from "vitest";
import {
  formatCustomFieldValue,
  isCustomFieldType,
  validateCustomFieldDefinition,
  validateCustomFieldValue,
} from "@/lib/custom-fields";

describe("custom fields", () => {
  it("recognises the supported field types", () => {
    expect(isCustomFieldType("text")).toBe(true);
    expect(isCustomFieldType("checkbox")).toBe(true);
    expect(isCustomFieldType("foo")).toBe(false);
  });

  it("validates field definitions", () => {
    expect(validateCustomFieldDefinition({ name: "Severity", type: "select", options: ["Low", "High"], required: true }).ok).toBe(true);
    expect(validateCustomFieldDefinition({ name: "", type: "text", options: [], required: false }).ok).toBe(false);
    expect(validateCustomFieldDefinition({ name: "X", type: "select", options: ["a", "a"], required: false }).ok).toBe(false);
    expect(validateCustomFieldDefinition({ name: "X", type: "select", options: [], required: false }).ok).toBe(false);
    expect(validateCustomFieldDefinition({ name: "X", type: "nope", options: [], required: false }).ok).toBe(false);
  });

  it("validates values per type", () => {
    expect(validateCustomFieldValue({ type: "number", options: [], required: false }, "42").ok).toBe(true);
    expect(validateCustomFieldValue({ type: "number", options: [], required: false }, "abc").ok).toBe(false);
    expect(validateCustomFieldValue({ type: "select", options: ["a", "b"], required: true }, "").ok).toBe(false);
    expect(validateCustomFieldValue({ type: "select", options: ["a", "b"], required: false }, "c").ok).toBe(false);
    expect(validateCustomFieldValue({ type: "date", options: [], required: false }, "2024-01-02").ok).toBe(true);
    expect(validateCustomFieldValue({ type: "date", options: [], required: false }, "02-01-2024").ok).toBe(false);
    const checkboxResult = validateCustomFieldValue({ type: "checkbox", options: [], required: false }, "on");
    expect(checkboxResult.ok).toBe(true);
    if (checkboxResult.ok) expect(checkboxResult.value).toBe("true");
  });

  it("formats values for display", () => {
    expect(formatCustomFieldValue({ type: "checkbox" }, "true")).toBe("Yes");
    expect(formatCustomFieldValue({ type: "checkbox" }, "false")).toBe("No");
    expect(formatCustomFieldValue({ type: "text" }, "")).toBe("—");
    expect(formatCustomFieldValue({ type: "text" }, "hello")).toBe("hello");
  });
});
