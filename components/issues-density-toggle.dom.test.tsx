/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { IssuesDensityToggle } from "./issues-density-toggle";

beforeEach(() => {
  window.localStorage.clear();
  const el = document.getElementById("issues-table");
  if (el) delete el.dataset.density;
});
afterEach(() => cleanup());

describe("IssuesDensityToggle", () => {
  it("renders comfortable and compact buttons", () => {
    render(<IssuesDensityToggle />);
    expect(screen.getByText("Comfortable")).toBeInTheDocument();
    expect(screen.getByText("Compact")).toBeInTheDocument();
  });

  it("applies compact density to the issues table and persists it", () => {
    render(<IssuesDensityToggle />);
    document.body.insertAdjacentHTML("afterbegin", '<div id="issues-table"></div>');
    const compact = screen.getByText("Compact");
    fireEvent.click(compact);
    const el = document.getElementById("issues-table");
    expect(el?.dataset.density).toBe("compact");
    expect(window.localStorage.getItem("ziki:issues-density")).toBe("compact");
  });

  it("applies comfortable density and persists it", () => {
    render(<IssuesDensityToggle />);
    document.body.insertAdjacentHTML("afterbegin", '<div id="issues-table"></div>');
    // Switch to compact first, then back to comfortable
    fireEvent.click(screen.getByText("Compact"));
    const comfortable = screen.getByText("Comfortable");
    fireEvent.click(comfortable);
    const el = document.getElementById("issues-table");
    expect(el?.dataset.density).toBe("comfortable");
    expect(window.localStorage.getItem("ziki:issues-density")).toBe("comfortable");
  });

  it("reads saved density on mount", () => {
    document.body.insertAdjacentHTML("afterbegin", '<div id="issues-table"></div>');
    window.localStorage.setItem("ziki:issues-density", "compact");
    render(<IssuesDensityToggle />);
    const el = document.getElementById("issues-table");
    expect(el?.dataset.density).toBe("compact");
  });
});