import { beforeEach, describe, expect, it, vi } from "vitest";
import { getVerifiedDomainFromDb } from "../security";
import {
  createHandleAssistToken,
  getPublicRequestOrigin,
  isFedCmRequest,
  isRegisteredFedCmClient,
  normalizeClientOrigin,
  validateFedCmClient,
} from "../fedcm";

vi.mock("../security");

describe("FedCM helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recognizes only browser-mediated webidentity requests", () => {
    expect(isFedCmRequest(new Request("https://atpassport.net", {
      headers: { "sec-fetch-dest": "webidentity" },
    }))).toBe(true);
    expect(isFedCmRequest(new Request("https://atpassport.net"))).toBe(false);
  });

  it("uses the public forwarded host for generated FedCM URLs", () => {
    const request = new Request("http://0.0.0.0:3001/fedcm/config.json", {
      headers: {
        host: "internal:3001",
        "x-forwarded-host": "dev.atpassport.net",
        "x-forwarded-proto": "https",
      },
    });

    expect(getPublicRequestOrigin(request)).toBe("https://dev.atpassport.net");
  });

  it.each([
    "javascript:alert(1)",
    "http://example.com",
    "https://user@example.com",
    "https://example.com/path",
    "https://example.com?query=1",
  ])("rejects an invalid client origin", (origin) => {
    expect(normalizeClientOrigin(origin)).toBeNull();
  });

  it("accepts HTTPS origins and development loopback origins", () => {
    expect(normalizeClientOrigin("https://example.com")).toBe("https://example.com");
    expect(normalizeClientOrigin("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("accepts an OAuth-verified domain and its subdomains", async () => {
    vi.mocked(getVerifiedDomainFromDb).mockImplementation(async (domain) => (
      domain === "example.com"
        ? { domain, verifiedByDid: "did:plc:1", status: "approved", verifiedAt: "now", method: "oauth" }
        : null
    ));

    await expect(isRegisteredFedCmClient("https://app.example.com")).resolves.toBe(true);
  });

  it("does not extend file verification to subdomains", async () => {
    vi.mocked(getVerifiedDomainFromDb).mockImplementation(async (domain) => (
      domain === "example.com"
        ? { domain, verifiedByDid: "did:plc:1", status: "approved", verifiedAt: "now", method: "file" }
        : null
    ));

    await expect(isRegisteredFedCmClient("https://app.example.com")).resolves.toBe(false);
  });

  it("requires client ID, Origin, and registration to agree", async () => {
    vi.mocked(getVerifiedDomainFromDb).mockResolvedValue({
      domain: "example.com",
      verifiedByDid: "did:plc:1",
      status: "approved",
      verifiedAt: "now",
    });

    await expect(validateFedCmClient("https://example.com", "https://other.example")).resolves.toBeNull();
    await expect(validateFedCmClient("https://example.com", "https://example.com")).resolves.toEqual({
      origin: "https://example.com",
      registration: {
        domain: "example.com",
        verifiedByDid: "did:plc:1",
        status: "approved",
        verifiedAt: "now",
      },
    });

    vi.mocked(getVerifiedDomainFromDb).mockResolvedValue(null);
    await expect(
      validateFedCmClient("https://unregistered-rp.example", "https://unregistered-rp.example")
    ).resolves.toEqual({
      origin: "https://unregistered-rp.example",
      registration: null,
    });
    await expect(
      validateFedCmClient("https://unregistered-rp.example", "https://attacker.example")
    ).resolves.toBeNull();
  });

  it("creates a versioned non-authentication token", () => {
    expect(JSON.parse(createHandleAssistToken("did:plc:1", "alice.example"))).toEqual({
      v: 1,
      did: "did:plc:1",
      username: "alice.example",
    });
  });
});
