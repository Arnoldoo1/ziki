import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { isPublicAddress, pageHasTag, proveOwnership, type OwnershipNetwork } from "./ownership";

const TOKEN = "ziki-verify-0123456789abcdef0123456789abcdef";
const site = { organisationId: "org1", kind: "website" as const, value: "settle.ng", ownershipToken: TOKEN };
const server = { organisationId: "org1", kind: "server" as const, value: "8.8.4.4", ownershipToken: TOKEN };
const repo = { organisationId: "org1", kind: "repo" as const, value: "settle/app", ownershipToken: TOKEN };

/** A network that answers from tables; anything not listed isn't there. */
function network(answers: {
  txt?: Record<string, string[][]>;
  addresses?: Record<string, string[]>;
  pages?: Record<string, { status: number; location?: string; body?: string }>;
  appSees?: string[];
  files?: Record<string, string>;
}): OwnershipNetwork & { get: ReturnType<typeof vi.fn> } {
  return {
    txt: async (host) => answers.txt?.[host] ?? [],
    addresses: async (host) => answers.addresses?.[host] ?? [],
    get: vi.fn(async (url: string) => {
      const page = answers.pages?.[url];
      if (!page) throw new Error(`not reachable: ${url}`);
      return { status: page.status, location: page.location ?? null, body: page.body ?? "" };
    }),
    workspaceAppSeesRepo: async (_org, name) => answers.appSees?.includes(name) ?? false,
    repoFile: async (_org, name, path) => answers.files?.[`${name}/${path}`] ?? null,
  };
}

const tag = `<html><head><meta content="${TOKEN}" name='ziki-verification'></head></html>`;

describe("ownership proof (#security-checks part 2)", () => {
  it("never looks at a private or internal address", async () => {
    expect(isPublicAddress("10.0.0.5")).toBe(false);
    expect(isPublicAddress("169.254.169.254")).toBe(false);
    expect(isPublicAddress("::ffff:127.0.0.1")).toBe(false);
    expect(isPublicAddress("fd12::1")).toBe(false);
    expect(isPublicAddress("8.8.8.8")).toBe(true);

    // A public-looking name that points inside a private network is refused before anything is fetched.
    const net = network({ addresses: { "settle.ng": ["10.1.2.3"] }, pages: { "https://settle.ng/": { status: 200, body: tag } } });
    const result = await proveOwnership(site, "html_tag", {}, net);
    expect(result.ok).toBe(false);
    expect(net.get).not.toHaveBeenCalled();
  });

  it("accepts the homepage tag only when it carries the target's own code", async () => {
    expect(pageHasTag(tag, TOKEN)).toBe(true);
    expect(pageHasTag(tag, "ziki-verify-someone-else")).toBe(false);

    const found = network({ addresses: { "settle.ng": ["8.8.8.8"] }, pages: { "https://settle.ng/": { status: 200, body: tag } } });
    expect(await proveOwnership(site, "html_tag", {}, found)).toEqual({ ok: true });

    const missing = network({ addresses: { "settle.ng": ["8.8.8.8"] }, pages: { "https://settle.ng/": { status: 200, body: "<html></html>" } } });
    expect((await proveOwnership(site, "html_tag", {}, missing)).ok).toBe(false);
  });

  it("follows a redirect on the same site but not to another one", async () => {
    const www = network({
      addresses: { "settle.ng": ["8.8.8.8"], "www.settle.ng": ["8.8.8.8"] },
      pages: {
        "https://settle.ng/": { status: 301, location: "https://www.settle.ng/" },
        "https://www.settle.ng/": { status: 200, body: tag },
      },
    });
    expect(await proveOwnership(site, "html_tag", {}, www)).toEqual({ ok: true });

    // Someone else's page can't prove settle.ng is yours.
    const away = network({
      addresses: { "settle.ng": ["8.8.8.8"], "other.example.org": ["8.8.8.8"] },
      pages: {
        "https://settle.ng/": { status: 302, location: "https://other.example.org/" },
        "https://other.example.org/": { status: 200, body: tag },
      },
    });
    expect((await proveOwnership(site, "html_tag", {}, away)).ok).toBe(false);
  });

  it("finds the DNS record, even when DNS splits it into pieces", async () => {
    const split = network({ txt: { "settle.ng": [["v=spf1 -all"], [TOKEN.slice(0, 20), TOKEN.slice(20)]] } });
    expect(await proveOwnership(site, "dns_txt", {}, split)).toEqual({ ok: true });
    expect((await proveOwnership(site, "dns_txt", {}, network({}))).ok).toBe(false);
  });

  it("proves a server by its file, or by a domain that really points to it", async () => {
    const file = network({ pages: { "http://8.8.4.4/.well-known/ziki-verification.txt": { status: 200, body: `\n${TOKEN}\n` } } });
    expect(await proveOwnership(server, "server_file", {}, file)).toEqual({ ok: true });

    const record = { txt: { "settle.ng": [[TOKEN]] } };
    // The record alone isn't enough: the domain must point to this server.
    const elsewhere = network({ ...record, addresses: { "settle.ng": ["1.1.1.1"] } });
    expect((await proveOwnership(server, "server_dns", { domain: "settle.ng" }, elsewhere)).ok).toBe(false);
    const pointing = network({ ...record, addresses: { "settle.ng": ["8.8.4.4"] } });
    expect(await proveOwnership(server, "server_dns", { domain: "settle.ng" }, pointing)).toEqual({ ok: true });
  });

  it("proves a repo through the workspace's own GitHub App or a file in the repo", async () => {
    expect(await proveOwnership(repo, "github", {}, network({ appSees: ["settle/app"] }))).toEqual({ ok: true });
    expect((await proveOwnership(repo, "github", {}, network({}))).ok).toBe(false);
    expect(await proveOwnership(repo, "repo_file", {}, network({ files: { "settle/app/.ziki-verification": `${TOKEN}\n` } }))).toEqual({ ok: true });
    expect((await proveOwnership(repo, "repo_file", {}, network({ files: { "settle/app/.ziki-verification": "wrong" } }))).ok).toBe(false);
  });

  it("says what failed when the network itself is down", async () => {
    const down = { ...network({}), txt: async () => { throw Object.assign(new Error("refused"), { code: "ECONNREFUSED" }); } };
    const result = await proveOwnership(site, "dns_txt", {}, down);
    expect(result).toEqual({ ok: false, reason: expect.stringContaining("DNS") });
  });

  it("refuses a way that doesn't fit the target", async () => {
    expect((await proveOwnership(site, "github", {}, network({ appSees: ["settle.ng"] }))).ok).toBe(false);
  });
});
