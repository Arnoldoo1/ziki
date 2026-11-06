/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { RecentlyViewed } from "./recently-viewed";

beforeEach(() => {
  window.localStorage.clear();
  // Force pathname to include /issues
  Object.defineProperty(window, "location", {
    value: { ...window.location, pathname: "/org/proj/issues/42" },
    writable: true,
  });
});
afterEach(() => cleanup());

describe("RecentlyViewed", () => {
  it("renders the Recent button", () => {
    render(<RecentlyViewed />);
    expect(screen.getByLabelText("Recently viewed issues")).toBeInTheDocument();
  });

  it("opens the dropdown and shows recent issues", () => {
    render(<RecentlyViewed />);
    fireEvent.click(screen.getByLabelText("Recently viewed issues"));
    expect(screen.getByText("Recently viewed")).toBeInTheDocument();
    expect(screen.getByText("No recently viewed issues.")).toBeInTheDocument();
  });

  it("does not render on non-issues pages", () => {
    Object.defineProperty(window, "location", {
      value: { ...window.location, pathname: "/settings" },
      writable: true,
    });
    render(<RecentlyViewed />);
    expect(screen.queryByLabelText("Recently viewed issues")).not.toBeInTheDocument();
  });
});