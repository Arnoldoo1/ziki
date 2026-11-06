/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getTrust, setTrust, trustBand } from "./agent-trust";

beforeEach(() => {
  if (typeof window === "undefined") return;
  window.localStorage.clear();
});
afterEach(() => {
  if (typeof window === "undefined") return;
  window.localStorage.clear();
});

describe("agent trust", () => {
  it("returns defaults when nothing stored", () => {
    const r = getTrust("u1", "a1");
    expect(r.score).toBe(50);
    expect(r.autonomy).toBe("ask-always");
    expect(r.guardrails).toContain("merge pull requests");
  });

  it("persists and reads back updates", () => {
    const first = setTrust("u1", "a1", { score: 85, autonomy: "auto-routine" });
    expect(first.score).toBe(85);
    const again = getTrust("u1", "a1");
    expect(again.score).toBe(85);
    expect(again.autonomy).toBe("auto-routine");
    expect(again.guardrails).toContain("merge pull requests");
  });

  it("is scoped per user and per agent", () => {
    setTrust("u1", "a1", { score: 10 });
    setTrust("u2", "a1", { score: 90 });
    expect(getTrust("u1", "a1").score).toBe(10);
    expect(getTrust("u2", "a1").score).toBe(90);
    expect(getTrust("u1", "a2").score).toBe(50);
  });

  it("trustBand labels", () => {
    expect(trustBand(80).label).toBe("Trusted");
    expect(trustBand(50).label).toBe("Watch");
    expect(trustBand(10).label).toBe("New / low trust");
  });
});
